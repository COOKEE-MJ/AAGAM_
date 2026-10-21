const router = require('express').Router();
const { query } = require('../db');
const { requireAuth, requireRole, requireDistrictScope, getDistrictScope } = require('../auth');
const { httpErr } = require('../services/incidents');

const COLS = `s.id, s.name, s.type, s.district, s.address, s.capacity, s.occupancy, s.status, s.facilities,
  s.suitable_for AS "suitableFor", s.contact, s.source_name AS "sourceName", s.source_url AS "sourceUrl",
  ST_Y(s.location::geometry) AS lat, ST_X(s.location::geometry) AS lng, s.updated_at AS "updatedAt"`;

// Open below 80% full, filling from 80%, full at 100%. 'closed' only when an officer sets it.
function autoStatus(capacity, occupancy) {
  if (capacity <= 0) return 'full';
  const f = occupancy / capacity;
  return f >= 1 ? 'full' : f >= 0.8 ? 'filling' : 'open';
}

// GET /api/shelters?lat&lng&hazard&district&limit   (public; nearest first when lat/lng given)
// hazard filter: only shelters whose suitable_for contains that hazard (e.g. earthquake -> open assembly points).
router.get('/', async (req, res, next) => {
  try {
    const { lat, lng, hazard, district, limit = 20, includeClosed } = req.query;
    const p = []; const where = [];
    const add = (v) => { p.push(v); return '$' + p.length; };
    if (includeClosed !== 'true') where.push(`s.status <> 'closed'`);
    if (hazard) where.push(`${add(hazard)} = ANY(s.suitable_for)`);
    if (district) where.push(`s.district = ${add(district)}`);
    const STATUS_ORDER = `CASE s.status WHEN 'open' THEN 0 WHEN 'filling' THEN 1 WHEN 'full' THEN 2 ELSE 3 END`;
    let dist = 'NULL::float8 AS "distanceKm"', order = `${STATUS_ORDER}, s.name`;
    if (lat !== undefined && lng !== undefined) {
      const la = Number(lat), ln = Number(lng);
      if (!Number.isFinite(la) || !Number.isFinite(ln)) throw httpErr(400, 'lat and lng must be numbers');
      const pt = `ST_MakePoint(${add(ln)}, ${add(la)})::geography`;
      dist = `ROUND((ST_Distance(s.location, ${pt}) / 1000)::numeric, 2) AS "distanceKm"`;
      order = `${STATUS_ORDER}, ST_Distance(s.location, ${pt})`;
    }
    const lim = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
    const sql = `SELECT ${COLS}, ${dist} FROM shelters s ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY ${order} LIMIT ${lim}`;
    res.json({ shelters: (await query(sql, p)).rows, serverTime: new Date().toISOString() });
  } catch (e) { next(e); }
});

// POST /api/shelters (officer)  - stretch, but the seed script can also fill the table
router.post('/', requireAuth, requireRole('authority'), requireDistrictScope, async (req, res, next) => {
  try {
    const b = req.body || {};
    for (const f of ['name', 'district', 'lat', 'lng', 'capacity']) if (b[f] === undefined || b[f] === '') throw httpErr(400, `${f} required`);
    if (b.district !== getDistrictScope(req.user)) throw httpErr(403, 'You can only create shelters in your assigned district');
    const cap = Number(b.capacity), occ = Number(b.occupancy || 0);
    const r = await query(
      `INSERT INTO shelters (name,type,district,address,location,capacity,occupancy,status,facilities,suitable_for,contact,source_name,source_url)
       VALUES ($1,$2,$3,$4,ST_MakePoint($6,$5)::geography,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING id`,
      [b.name, b.type || 'community hall', b.district, b.address || null, Number(b.lat), Number(b.lng), cap, occ,
       autoStatus(cap, occ), b.facilities || [], b.suitableFor || [], b.contact || null, b.sourceName || null, b.sourceUrl || null]
    );
    res.status(201).json({ id: r.rows[0].id });
  } catch (e) { next(e); }
});

// PATCH /api/shelters/:id (officer): occupancy, closed/open, contact, capacity
router.patch('/:id', requireAuth, requireRole('authority'), requireDistrictScope, async (req, res, next) => {
  try {
    const cur = await query('SELECT capacity, occupancy, status, district FROM shelters WHERE id = $1', [req.params.id]);
    if (!cur.rowCount) throw httpErr(404, 'shelter not found');
    if (cur.rows[0].district !== getDistrictScope(req.user)) throw httpErr(403, 'You can only manage shelters in your assigned district');
    const b = req.body || {};
    const capacity = b.capacity !== undefined ? Number(b.capacity) : cur.rows[0].capacity;
    let occupancy = b.occupancy !== undefined ? Number(b.occupancy) : cur.rows[0].occupancy;
    if (b.occupancyDelta !== undefined) occupancy += Number(b.occupancyDelta);
    occupancy = Math.max(0, occupancy);
    if (!Number.isFinite(capacity) || !Number.isFinite(occupancy)) throw httpErr(400, 'numbers required');
    const closed = b.closed !== undefined ? !!b.closed : cur.rows[0].status === 'closed';
    const status = closed ? 'closed' : autoStatus(capacity, occupancy);
    const r = await query(
      `UPDATE shelters SET capacity=$1, occupancy=$2, status=$3, contact=COALESCE($4, contact), updated_at=now()
       WHERE id=$5 RETURNING id, capacity, occupancy, status`,
      [capacity, occupancy, status, b.contact ?? null, req.params.id]
    );
    res.json(r.rows[0]);
  } catch (e) { next(e); }
});

module.exports = router;
module.exports.autoStatus = autoStatus;
