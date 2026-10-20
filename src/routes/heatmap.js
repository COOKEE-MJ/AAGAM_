const router = require('express').Router();
const { query } = require('../db');
const { requireAuth, requireRole, requireDistrictScope, getDistrictScope } = require('../auth');
const { httpErr } = require('../services/incidents');

// GET /api/heatmap?cell=0.05&hours=24&hazard=flood   (OFFICERS ONLY)
// Counts TRUSTED trouble spots per grid cell: unresolved SOS + ai_verified/verified photo reports.
// Rejected, needs_review, cancelled and resolved items are not counted.
// cell is in degrees (0.05 is about 5.5 km). The cell is returned by its south-west corner.
router.get('/', requireAuth, requireRole('authority'), requireDistrictScope, async (req, res, next) => {
  try {
    const cell = Number(req.query.cell ?? 0.05);
    const hours = Number(req.query.hours ?? 24);
    const hazard = req.query.hazard || null;
    const district = getDistrictScope(req.user);
    if (!(cell >= 0.001 && cell <= 2)) throw httpErr(400, 'cell must be between 0.001 and 2 degrees');
    if (!(hours >= 1 && hours <= 24 * 30)) throw httpErr(400, 'hours must be between 1 and 720');

    const r = await query(
      `WITH pts AS (
         SELECT location::geometry AS g, hazard, 'sos' AS kind FROM sos_events
         WHERE location IS NOT NULL AND status IN ('new','acknowledged','dispatched') AND received_at > now() - make_interval(hours => $2::int)
           AND ($3::text IS NULL OR hazard = $3) AND district = $4
         UNION ALL
         SELECT location::geometry, hazard, 'report' FROM reports
         WHERE location IS NOT NULL AND status IN ('ai_verified','verified') AND created_at > now() - make_interval(hours => $2::int)
           AND ($3::text IS NULL OR hazard = $3) AND district = $4
       )
       SELECT floor(ST_X(g) / $1::float8) * $1::float8 AS lng,
              floor(ST_Y(g) / $1::float8) * $1::float8 AS lat,
              count(*)::int AS count,
              count(*) FILTER (WHERE kind='sos')::int AS "sosCount",
              count(*) FILTER (WHERE kind='report')::int AS "reportCount",
              array_remove(array_agg(DISTINCT hazard), NULL) AS hazards
       FROM pts GROUP BY 1, 2 ORDER BY count DESC LIMIT 500`,
      [cell, Math.round(hours), hazard, district]
    );
    res.json({ cellSizeDeg: cell, hours, cells: r.rows, generatedAt: new Date().toISOString() });
  } catch (e) { next(e); }
});

module.exports = router;
