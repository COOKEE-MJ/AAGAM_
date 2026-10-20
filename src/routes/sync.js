const router = require('express').Router();
const { optionalAuth } = require('../auth');
const { createSos, createReport, updateSosForSync, httpErr } = require('../services');

// POST /api/sync
// Body: { items: [ { type: 'sos' | 'report' | 'sos_update', clientId, ...fields } ] }
// For type 'report' the damage category goes in `reportType` (flooding|building_damage|road_blocked|landslide|fire|other).
// Flushes the phone's offline queue in one call. IDEMPOTENT per item via clientId:
// replaying the same batch (or part of it) never creates duplicates.
// Response: { results: [ { clientId, type, result: 'created' | 'duplicate' | 'error', id?, error? } ] }
// Items are processed independently, so one bad item never blocks the rest of the queue.
router.post('/', optionalAuth, async (req, res, next) => {
  try {
    const guestOk = String(process.env.ALLOW_GUEST_SOS ?? 'true') === 'true';
    if (!req.user && !guestOk) throw httpErr(401, 'login required');
    const items = Array.isArray(req.body?.items) ? req.body.items : null;
    if (!items) throw httpErr(400, 'items array required');
    if (items.length > 100) throw httpErr(413, 'max 100 items per sync');

    const results = [];
    for (const it of items) {
      const base = { clientId: it?.clientId, type: it?.type };
      try {
        if (it.type === 'sos') {
          const { created, sos } = await createSos({ ...it, viaSmsFallback: !!it.viaSmsFallback }, req.user);
          results.push({ ...base, result: created ? 'created' : 'duplicate', id: sos.id, status: sos.status });
        } else if (it.type === 'report') {
          const { created, report } = await createReport({ ...it, type: it.reportType }, req.user);
          results.push({ ...base, result: created ? 'created' : 'duplicate', id: report.id, status: report.status });
        } else if (it.type === 'sos_update') {
          const result = await updateSosForSync(it, req.user);
          results.push({ ...base, result: result.duplicate ? 'duplicate' : 'updated', id: result.id, status: result.status });
        } else {
          results.push({ ...base, result: 'error', error: "type must be 'sos', 'report', or 'sos_update'" });
        }
      } catch (e) {
        results.push({ ...base, result: 'error', error: e.message });
      }
    }
    res.json({ results, serverTime: new Date().toISOString() });
  } catch (e) { next(e); }
});

module.exports = router;
