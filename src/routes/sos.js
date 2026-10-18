const router = require('express').Router();
const { query } = require('../db');
const { optionalAuth, requireAuth, requireRole } = require('../auth');
const { createSos, listSos, httpErr, sosSelect } = require('../services');

// Allowed officer moves. Citizens may only cancel their own SOS.
const NEXT = {
  new: ['acknowledged', 'dispatched', 'resolved', 'duplicate'],
  acknowledged: ['dispatched', 'resolved', 'duplicate'],
  dispatched: ['resolved'],
  resolved: [], cancelled: [], duplicate: [],
};

// POST /api/sos/trigger  { clientId, lat, lng, timestamp, hazard?, peopleCount?, injured?, note? }
// IDEMPOTENT on clientId: the same SOS sent twice returns the same row (200 duplicate:true), never two rows.
router.post('/trigger', optionalAuth, async (req, res, next) => {
  try {
    const guestOk = String(process.env.ALLOW_GUEST_SOS ?? 'true') === 'true';
    if (!req.user && !guestOk) throw httpErr(401, 'login required to send SOS');
    const { created, sos } = await createSos(req.body || {}, req.user);
    res.status(created ? 201 : 200).json({ duplicate: !created, sos });
  } catch (e) { next(e); }
});

// GET /api/sos?status=new  (officer queue; oldest unacknowledged first, with clusters detected)
router.get('/', requireAuth, requireRole('authority'), async (req, res, next) => {
  try {
    const { status } = req.query;
    const sos = await listSos({ status });
    res.json({ sos });
  } catch (e) { next(e); }
});

// GET /api/sos/mine (citizen's own SOS and their statuses)
router.get('/mine', requireAuth, async (req, res, next) => {
  try {
    const sos = await listSos({ userId: req.user.sub });
    res.json({ sos });
  } catch (e) { next(e); }
});

// PATCH /api/sos/:id  { status, dispatchNote?, peopleCount?, injured?, note? }
router.patch('/:id', requireAuth, async (req, res, next) => {
  try {
    const cur = await query('SELECT id, status, user_id FROM sos_events WHERE id = $1', [req.params.id]);
    if (!cur.rowCount) throw httpErr(404, 'SOS not found');
    const row = cur.rows[0];
    const b = req.body || {};

    if (req.user.role === 'citizen') {
      if (row.user_id !== req.user.sub) throw httpErr(403, 'not your SOS');
      const sets = []; const p = [];
      if (b.status === 'cancelled') { if (['resolved', 'cancelled'].includes(row.status)) throw httpErr(409, 'already closed'); p.push('cancelled'); sets.push(`status=$${p.length}`); }
      else if (b.status) throw httpErr(403, 'citizens can only cancel');
      for (const [k, col] of [['peopleCount', 'people_count'], ['injured', 'injured'], ['note', 'note']]) if (b[k] !== undefined) { p.push(b[k]); sets.push(`${col}=$${p.length}`); }
      if (!sets.length) throw httpErr(400, 'nothing to update');
      p.push(row.id);
      await query(`UPDATE sos_events SET ${sets.join(',')}, updated_at=now() WHERE id=$${p.length}`, p);
    } else {
      if (!b.status) throw httpErr(400, 'status required');
      if (!(NEXT[row.status] || []).includes(b.status)) throw httpErr(409, `cannot go from ${row.status} to ${b.status}`);
      await query(`UPDATE sos_events SET status=$1, handled_by=$2, dispatch_note=COALESCE($3, dispatch_note), updated_at=now() WHERE id=$4`,
        [b.status, req.user.sub, b.dispatchNote ?? null, row.id]);
    }
    res.json({ sos: (await query(`${sosSelect} WHERE s.id = $1`, [row.id])).rows[0] });
  } catch (e) { next(e); }
});

module.exports = router;
