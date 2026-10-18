const router = require('express').Router();
const { query } = require('../db');
const { optionalAuth, requireAuth, requireRole } = require('../auth');
const { createReport, httpErr, reportSelect } = require('../services');

// POST /api/reports { clientId, lat, lng, type, hazard?, note?, photoData? (small base64 data URL) }
// Calls the AI check (mock until M3 is live), stores label + confidence, sets ai_verified or needs_review.
router.post('/', optionalAuth, async (req, res, next) => {
  try {
    const guestOk = String(process.env.ALLOW_GUEST_SOS ?? 'true') === 'true';
    if (!req.user && !guestOk) throw httpErr(401, 'login required to send a report');
    const { created, report } = await createReport(req.body || {}, req.user);
    res.status(created ? 201 : 200).json({ duplicate: !created, report });
  } catch (e) { next(e); }
});

// GET /api/reports?status=needs_review|ai_verified|verified|rejected|all   (officer)
router.get('/', requireAuth, requireRole('authority'), async (req, res, next) => {
  try {
    const { status = 'needs_review' } = req.query;
    const p = []; let where = '';
    if (status !== 'all') { p.push(status); where = 'WHERE r.status = $1'; }
    res.json({ reports: (await query(`${reportSelect} ${where} ORDER BY r.created_at DESC LIMIT 200`, p)).rows });
  } catch (e) { next(e); }
});

router.get('/mine', requireAuth, async (req, res, next) => {
  try { res.json({ reports: (await query(`${reportSelect} WHERE r.user_id = $1 ORDER BY r.created_at DESC LIMIT 50`, [req.user.sub])).rows }); }
  catch (e) { next(e); }
});

// Officer views the photo of one report (kept out of list responses to stay light)
router.get('/:id/photo', requireAuth, requireRole('authority'), async (req, res, next) => {
  try {
    const r = await query('SELECT photo_data FROM reports WHERE id = $1', [req.params.id]);
    if (!r.rowCount || !r.rows[0].photo_data) throw httpErr(404, 'no photo');
    res.json({ photoData: r.rows[0].photo_data });
  } catch (e) { next(e); }
});

// PATCH /api/reports/:id  { status: 'verified' | 'rejected', rejectReason? }   (officer; can override ai_verified)
router.patch('/:id', requireAuth, requireRole('authority'), async (req, res, next) => {
  try {
    const { status, rejectReason = null } = req.body || {};
    if (!['verified', 'rejected'].includes(status)) throw httpErr(400, "status must be 'verified' or 'rejected'");
    if (status === 'rejected' && !rejectReason) throw httpErr(400, 'rejectReason required (unrelated, duplicate, unclear)');
    const r = await query(
      `UPDATE reports SET status=$1, reject_reason=$2, reviewed_by=$3, updated_at=now() WHERE id=$4 RETURNING id`,
      [status, status === 'rejected' ? rejectReason : null, req.user.sub, req.params.id]
    );
    if (!r.rowCount) throw httpErr(404, 'report not found');
    res.json({ report: (await query(`${reportSelect} WHERE r.id = $1`, [req.params.id])).rows[0] });
  } catch (e) { next(e); }
});

module.exports = router;
