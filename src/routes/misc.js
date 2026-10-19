const router = require('express').Router();
const { query, httpErr } = require('../config');
const { requireAuth, requireRole } = require('../auth');
const { verifyImage } = require('../verify');
const { HAZARD_LIST } = require('../hazards');

// GET /api/hazards -> 11 hazards with agency, sourceUrl (https) and whatToDo
router.get('/hazards', async (_req, res, next) => {
  try {
    const hazards = HAZARD_LIST.map((h) => ({
      ...h,
      code: h.id,
      advice: (h.whatToDo || []).join(' '),
    }));
    res.json({ hazards });
  } catch (e) { next(e); }
});

// POST /api/ai/verify-image { photoData, type } -> { label, confidence, mode }
router.post('/ai/verify-image', async (req, res, next) => {
  try {
    const { photoData, type = 'flooding' } = req.body || {};
    if (!photoData) throw httpErr(400, 'photoData required');
    res.json(await verifyImage({ photoData, type }));
  } catch (e) { next(e); }
});

// GET /api/sms-log (officer): lets the demo show "SMS sent (mocked)" entries
router.get('/sms-log', requireAuth, requireRole('authority'), async (_req, res, next) => {
  try {
    const rows = (await query('SELECT id, to_phone AS "toPhone", body, mode, created_at AS "createdAt" FROM sms_log ORDER BY id DESC LIMIT 100')).rows;
    res.json({ sms: rows });
  } catch (e) { next(e); }
});

// GET /api/audit-log (officer): view recent audit trail entries
router.get('/audit-log', requireAuth, requireRole('authority'), async (req, res, next) => {
  try {
    const { targetType, targetId, limit = 100 } = req.query;
    const where = [];
    const p = [];
    if (targetType) { p.push(targetType); where.push(`target_type = $${p.length}`); }
    if (targetId) { p.push(String(targetId)); where.push(`target_id = $${p.length}`); }
    p.push(Number(limit) || 100);
    const sql = `SELECT id, actor_id AS "actorId", actor_role AS "actorRole", action, target_type AS "targetType", target_id AS "targetId", detail, at
                 FROM audit_log ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
                 ORDER BY id DESC LIMIT $${p.length}`;
    const rows = (await query(sql, p)).rows;
    res.json({ audit: rows });
  } catch (e) { next(e); }
});

router.get('/health', async (_req, res) => {
  try {
    await query('SELECT 1');
    res.json({ ok: true, db: 'up', aiMode: process.env.AI_MODE || 'mock', smsMode: 'mock' });
  } catch (e) {
    res.status(503).json({ ok: false, db: 'down', error: e.message });
  }
});

module.exports = router;
