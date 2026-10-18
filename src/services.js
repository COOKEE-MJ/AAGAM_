// Core service logic shared by SOS endpoints, report endpoints, and /api/sync.
// Ensures idempotency on client_id.
const { query, httpErr } = require('./config');
const { decideAiStatus, markClusters, REPORT_TYPES } = require('./rules');
const { verifyImage, sendMockSms } = require('./verify');
const { mapSos, mapReport } = require('./mappers');

function badLatLng(lat, lng) {
  return !(Number.isFinite(lat) && Number.isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180);
}

const sosSelect = `
  SELECT s.id, s.client_id, s.status, s.hazard, s.people_count, s.injured, s.note,
         ST_Y(s.location::geometry) AS lat, ST_X(s.location::geometry) AS lng,
         s.created_on_phone_at, s.received_at, s.dispatch_note,
         u.phone, u.name AS citizen_name
  FROM sos_events s
  LEFT JOIN users u ON u.id = s.user_id
`;

const reportSelect = `
  SELECT r.id, r.client_id, r.type, r.hazard, r.note, r.status,
         r.ai_label, r.ai_confidence, r.ai_mode, r.reject_reason,
         ST_Y(r.location::geometry) AS lat, ST_X(r.location::geometry) AS lng,
         r.created_at, (r.photo_data IS NOT NULL) AS has_photo
  FROM reports r
`;

async function createSos(input, user) {
  const { clientId, lat, lng, timestamp, hazard = null, peopleCount = null, injured = false, note = null } = input;
  if (!clientId || typeof clientId !== 'string') throw httpErr(400, 'clientId required');
  if (badLatLng(Number(lat), Number(lng))) throw httpErr(400, 'valid lat and lng required');
  const when = timestamp ? new Date(timestamp) : new Date();
  if (isNaN(when)) throw httpErr(400, 'timestamp invalid');

  const ins = await query(
    `INSERT INTO sos_events (client_id, user_id, location, hazard, created_on_phone_at, people_count, injured, note)
     VALUES ($1, $2, ST_MakePoint($4, $3)::geography, $5, $6, $7, $8, $9)
     ON CONFLICT (client_id) DO NOTHING
     RETURNING id`,
    [clientId, user?.sub || null, Number(lat), Number(lng), hazard, when, peopleCount, !!injured, note]
  );

  const created = ins.rowCount === 1;
  const row = (await query(`${sosSelect} WHERE s.client_id = $1`, [clientId])).rows[0];
  const mapped = mapSos(row);

  if (created && input.viaSmsFallback) {
    await sendMockSms({ toPhone: 'control-room', body: `SOS ${clientId} @ ${lat},${lng}`, sosId: mapped.id });
  }

  return { created, sos: mapped };
}

async function createReport(input, user) {
  const { clientId, lat, lng, type, hazard = null, note = null, photoData = null } = input;
  if (!clientId) throw httpErr(400, 'clientId required');
  if (badLatLng(Number(lat), Number(lng))) throw httpErr(400, 'valid lat and lng required');
  if (!REPORT_TYPES.includes(type)) throw httpErr(400, `type must be one of ${REPORT_TYPES.join(', ')}`);
  if (photoData && photoData.length > 1_500_000) throw httpErr(413, 'photo too large; shrink it on the phone (~300 KB)');

  const existing = await query(`${reportSelect} WHERE r.client_id = $1`, [clientId]);
  if (existing.rowCount) {
    return { created: false, report: mapReport(existing.rows[0]) };
  }

  const ai = await verifyImage({ photoData, type });
  const status = decideAiStatus({ type, label: ai.label, confidence: ai.confidence });

  const ins = await query(
    `INSERT INTO reports (client_id, user_id, location, type, hazard, photo_data, note, ai_label, ai_confidence, ai_mode, status)
     VALUES ($1, $2, ST_MakePoint($4, $3)::geography, $5, $6, $7, $8, $9, $10, $11, $12)
     ON CONFLICT (client_id) DO NOTHING
     RETURNING id`,
    [clientId, user?.sub || null, Number(lat), Number(lng), type, hazard, photoData, note, ai.label, ai.confidence, ai.mode, status]
  );

  const row = (await query(`${reportSelect} WHERE r.client_id = $1`, [clientId])).rows[0];
  return { created: ins.rowCount === 1, report: mapReport(row) };
}

async function listSos({ status = null, userId = null } = {}) {
  const p = [];
  const where = [];
  if (userId) {
    p.push(userId);
    where.push(`s.user_id = $${p.length}`);
  }
  if (status && status !== 'all') {
    p.push(status);
    where.push(`s.status = $${p.length}`);
  } else if (!userId) {
    where.push(`s.status NOT IN ('duplicate')`);
  }
  const whereSql = where.length ? 'WHERE ' + where.join(' AND ') : '';
  const rows = (await query(`${sosSelect} ${whereSql} ORDER BY (s.status='new') DESC, s.received_at ASC LIMIT 200`, p)).rows;
  const mapped = rows.map(mapSos);
  return markClusters(mapped);
}

module.exports = {
  createSos,
  createReport,
  listSos,
  sosSelect,
  reportSelect,
  REPORT_TYPES,
  httpErr,
};

