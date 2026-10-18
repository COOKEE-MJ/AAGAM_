const router = require('express').Router();
const { query } = require('../db');
const { optionalAuth, requireRole, requireAuth } = require('../auth');
const { httpErr } = require('../services/incidents');
const rules = require('../radar/rules');

const isOfficial = rules.isOfficialUrl;
const SEVERITIES = ['low', 'medium', 'high', 'extreme'];
const COLS = `a.id, a.hazard, h.label AS "hazardLabel", h.default_advice AS advice, a.severity, a.title, a.message,
  a.district, a.state, a.radius_km AS "radiusKm",
  ST_Y(a.center::geometry) AS lat, ST_X(a.center::geometry) AS lng,
  a.valid_from AS "validFrom", a.valid_until AS "validUntil",
  a.source_name AS "sourceName", a.source_url AS "sourceUrl", a.fetched_at AS "fetchedAt",
  a.origin, a.status, a.is_official_source AS "isOfficialSource", a.extraction_status AS "extractionStatus",
  a.source_published_at AS "sourcePublishedAt", a.review_reason AS "reviewReason", a.updated_at AS "updatedAt"`;
const FROM = 'FROM alerts a JOIN hazard_types h ON h.code = a.hazard';
const SEV_ORDER = `CASE a.severity WHEN 'extreme' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END`;

// Writes an entry to audit_log for traceability of officer and radar actions
async function audit(req, action, targetId, detail) {
  try {
    await query(
      'INSERT INTO audit_log (actor_id, actor_role, action, target_type, target_id, detail) VALUES ($1,$2,$3,$4,$5,$6)',
      [req.user?.sub || null, req.isRadar ? 'radar' : (req.user?.role || null), action, 'alert', String(targetId), JSON.stringify(detail || {})]
    );
  } catch (e) {
    console.error('audit log error:', e.message);
  }
}

// Authorizes requests either from TinyFish radar (via X-Radar-Key header) or an officer session
function radarOrOfficer(req, res, next) {
  const key = req.headers['x-radar-key'];
  if (process.env.RADAR_API_KEY && key === process.env.RADAR_API_KEY) {
    req.isRadar = true;
    return next();
  }
  return requireAuth(req, res, () => requireRole('authority')(req, res, next));
}

// GET /api/alerts?lat&lng&radius&hazard&district
// Public returns published, unexpired alerts. Officers may view pending/withdrawn/expired in their district scope.
router.get('/', optionalAuth, async (req, res, next) => {
  try {
    const { lat, lng, radius = 50, hazard, district, status } = req.query;
    const where = [];
    const p = [];
    const add = (v) => { p.push(v); return '$' + p.length; };

    const isOfficer = req.user?.role === 'authority';
    if (status && isOfficer) {
      if (status !== 'all') where.push(`a.status = ${add(status)}`);
      // Enforce officer district scope if assigned
      if (req.user?.district_scope) {
        where.push(`a.district = ${add(req.user.district_scope)}`);
      }
    } else {
      where.push(`a.status = 'published'`, `(a.valid_until IS NULL OR a.valid_until > now())`);
    }

    if (hazard) where.push(`a.hazard = ${add(hazard)}`);

    if (lat !== undefined && lng !== undefined) {
      const la = Number(lat), ln = Number(lng), rad = Number(radius);
      if (![la, ln, rad].every(Number.isFinite)) throw httpErr(400, 'lat, lng, radius must be numbers');
      const pt = `ST_MakePoint(${add(ln)}, ${add(la)})::geography`;
      const dist = add(rad * 1000);
      where.push(`( (a.center IS NOT NULL AND ST_DWithin(a.center, ${pt}, ${dist} + COALESCE(a.radius_km,0)*1000))
                    OR (a.center IS NULL ${district ? `AND a.district = ${add(district)}` : ''}) )`);
    } else if (district) {
      where.push(`a.district = ${add(district)}`);
    }

    const sql = `SELECT ${COLS} ${FROM} ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
                 ORDER BY ${SEV_ORDER}, a.fetched_at DESC LIMIT 100`;
    res.json({ alerts: (await query(sql, p)).rows, serverTime: new Date().toISOString() });
  } catch (e) {
    next(e);
  }
});

// POST /api/alerts (Manual officer creation or TinyFish radar ingestion)
router.post('/', radarOrOfficer, async (req, res, next) => {
  try {
    const b = req.body || {};
    for (const f of ['hazard', 'severity', 'title', 'district', 'sourceName', 'sourceUrl']) {
      if (!b[f]) throw httpErr(400, `${f} required`);
    }
    if (!SEVERITIES.includes(b.severity)) throw httpErr(400, 'severity must be low|medium|high|extreme');

    // Enforce district scope for officer manual alerts
    if (!req.isRadar && req.user?.district_scope && b.district !== req.user.district_scope) {
      throw httpErr(403, `Officers can only post alerts for their assigned district: ${req.user.district_scope}`);
    }

    const origin = req.isRadar ? 'radar' : 'manual';
    let status = 'published', reviewReason = null;

    if (origin === 'radar') {
      const d = rules.decide({
        hazard: b.hazard,
        severity: b.severity,
        title: b.title,
        text: b.message,
        district: b.district,
        sourceUrl: b.sourceUrl,
        validUntil: b.validUntil,
        publishedAt: b.sourcePublishedAt
      });
      status = d.status;
      reviewReason = d.reviewReason;
    }

    const official = isOfficial(b.sourceUrl);
    const extraction = origin === 'manual' ? 'manual' : (b.extractionStatus === 'official_feed' ? 'official_feed' : 'parsed_by_ai');

    const la = b.lat === undefined || b.lat === null || b.lat === '' ? null : Number(b.lat);
    const ln = b.lng === undefined || b.lng === null || b.lng === '' ? null : Number(b.lng);
    if ((la === null) !== (ln === null)) throw httpErr(400, 'send both lat and lng, or neither');
    if (la !== null && !(Number.isFinite(la) && Number.isFinite(ln))) throw httpErr(400, 'lat/lng must be numbers');

    const r = await query(
      `INSERT INTO alerts (hazard, severity, title, message, district, state, center, radius_km, valid_until, source_name, source_url, fetched_at, origin, status, dedupe_key, source_published_at, is_official_source, extraction_status, review_reason)
       VALUES ($1, $2, $3, $4, $5, $6,
         CASE WHEN $7::float8 IS NULL THEN NULL ELSE ST_MakePoint($8::float8, $7::float8)::geography END,
         $9, $10, $11, $12, COALESCE($13::timestamptz, now()), $14, $15, $16, $17, $18, $19, $20)
       ON CONFLICT (dedupe_key) DO UPDATE SET severity = EXCLUDED.severity, title = EXCLUDED.title, message = EXCLUDED.message,
         valid_until = EXCLUDED.valid_until, fetched_at = EXCLUDED.fetched_at, updated_at = now()
       RETURNING id`,
      [b.hazard, b.severity, b.title, b.message || '', b.district, b.state || null,
       la, ln, b.radiusKm || null, b.validUntil || null, b.sourceName, b.sourceUrl,
       b.fetchedAt || null, origin, status, b.dedupeKey || null, b.sourcePublishedAt || null, official, extraction, reviewReason]
    );

    await audit(req, 'alert.create', r.rows[0].id, { origin, status, reviewReason, district: b.district });
    res.status(201).json({ id: r.rows[0].id, status, reviewReason });
  } catch (e) {
    next(e);
  }
});

// PATCH /api/alerts/:id (Officer approves pending, edits, or withdraws alert)
router.patch('/:id', requireAuth, requireRole('authority'), async (req, res, next) => {
  try {
    const b = req.body || {};
    const sets = [];
    const p = [];
    const set = (col, v) => { p.push(v); sets.push(`${col} = $${p.length}`); };

    // Enforce officer district scope
    if (req.user?.district_scope) {
      const check = await query('SELECT district FROM alerts WHERE id = $1', [req.params.id]);
      if (!check.rowCount) throw httpErr(404, 'alert not found');
      if (check.rows[0].district !== req.user.district_scope) {
        throw httpErr(403, `You are only authorized to manage alerts in district: ${req.user.district_scope}`);
      }
    }

    if (b.status) {
      if (!['published', 'withdrawn', 'pending', 'expired'].includes(b.status)) throw httpErr(400, 'bad status');
      set('status', b.status);
    }
    if (b.severity) {
      if (!SEVERITIES.includes(b.severity)) throw httpErr(400, 'bad severity');
      set('severity', b.severity);
    }
    if (b.title) set('title', b.title);
    if (b.message !== undefined) set('message', b.message);
    if (b.validUntil !== undefined) set('valid_until', b.validUntil);
    if (!sets.length) throw httpErr(400, 'nothing to update');

    set('reviewed_by', req.user.sub);
    set('reviewed_at', new Date());

    p.push(req.params.id);
    const r = await query(`UPDATE alerts SET ${sets.join(', ')}, updated_at = now() WHERE id = $${p.length} RETURNING id, status, severity`, p);
    if (!r.rowCount) throw httpErr(404, 'alert not found');

    await audit(req, b.status === 'published' ? 'alert.approve' : 'alert.update', req.params.id, b);
    res.json(r.rows[0]);
  } catch (e) {
    next(e);
  }
});

module.exports = router;
module.exports.isOfficial = isOfficial;
