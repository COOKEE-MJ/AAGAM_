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
  SELECT r.id, r.client_id, r.user_id, r.type, r.hazard, r.note, r.status,
         r.ai_label, r.ai_confidence, r.ai_mode, r.reject_reason,
         ST_Y(r.location::geometry) AS lat, ST_X(r.location::geometry) AS lng,
         r.created_at, (r.photo_data IS NOT NULL) AS has_photo
  FROM reports r
`;

// Guests (no login) have no home district, and officers only see events in their own district.
// Use the district of the nearest known shelter (within 150 km) so the right officers see the event.
async function districtForPoint(lat, lng) {
  const r = await query(
    `SELECT district FROM shelters
      WHERE ST_DWithin(location, ST_MakePoint($2, $1)::geography, 150000)
      ORDER BY location <-> ST_MakePoint($2, $1)::geography LIMIT 1`,
    [Number(lat), Number(lng)]
  );
  return r.rows[0]?.district || null;
}

async function createSos(input, user) {
  const { clientId, lat, lng, timestamp, hazard = null, peopleCount = null, injured = false, note = null } = input;
  if (!clientId || typeof clientId !== 'string') throw httpErr(400, 'clientId required');
  if (badLatLng(Number(lat), Number(lng))) throw httpErr(400, 'valid lat and lng required');
  const when = timestamp ? new Date(timestamp) : new Date();
  if (isNaN(when)) throw httpErr(400, 'timestamp invalid');
  const district = (user?.role === 'citizen' ? (user.district || user.home_district || null) : null) || await districtForPoint(lat, lng);

  const ins = await query(
    `INSERT INTO sos_events (client_id, user_id, location, hazard, created_on_phone_at, people_count, injured, note, district, retention_expires_at)
     VALUES ($1, $2, ST_MakePoint($4, $3)::geography, $5, $6, $7, $8, $9, $10, now() + interval '90 days')
     ON CONFLICT (client_id) DO NOTHING
     RETURNING id`,
    [clientId, user?.sub || null, Number(lat), Number(lng), hazard, when, peopleCount, !!injured, note, district]
  );

  const created = ins.rowCount === 1;
  const row = (await query(`${sosSelect} WHERE s.client_id = $1`, [clientId])).rows[0];
  if (!created) {
    const owner = (await query('SELECT user_id FROM sos_events WHERE client_id = $1', [clientId])).rows[0]?.user_id || null;
    if (owner !== (user?.sub || null)) throw httpErr(409, 'clientId is already in use');
  }
  const mapped = mapSos(row);
  if (!created && !user?.sub) return { created, sos: { id: mapped.id, clientId: mapped.clientId, status: mapped.status } };

  if (created && input.viaSmsFallback) {
    await sendMockSms({ toPhone: 'control-room', body: `SOS ${clientId} @ ${lat},${lng}`, sosId: mapped.id });
  }

  return { created, sos: mapped };
}

async function createReport(input, user) {
  const { clientId, lat, lng, type, hazard = null, note = null, photoData = null } = input;
  if (!clientId || typeof clientId !== 'string') throw httpErr(400, 'clientId required');
  if (badLatLng(Number(lat), Number(lng))) throw httpErr(400, 'valid lat and lng required');
  if (!REPORT_TYPES.includes(type)) throw httpErr(400, `type must be one of ${REPORT_TYPES.join(', ')}`);
  if (photoData && photoData.length > 1_500_000) throw httpErr(413, 'photo too large; shrink it on the phone (~300 KB)');

  const existing = await query(`${reportSelect} WHERE r.client_id = $1`, [clientId]);
  if (existing.rowCount) {
    const row = existing.rows[0];
    if (row.user_id !== (user?.sub || null)) throw httpErr(409, 'clientId is already in use');
    const mapped = mapReport(row);
    return { created: false, report: user?.sub ? mapped : { id: mapped.id, clientId: mapped.clientId, status: mapped.status } };
  }

  const ai = await verifyImage({ photoData, type });
  const status = decideAiStatus({ type, label: ai.label, confidence: ai.confidence });

  const district = (user?.role === 'citizen' ? (user.district || user.home_district || null) : null) || await districtForPoint(lat, lng);
  const ins = await query(
    `INSERT INTO reports (client_id, user_id, location, type, hazard, photo_data, note, ai_label, ai_confidence, ai_mode, status, district, retention_expires_at, pii_retention_expires_at)
     VALUES ($1, $2, ST_MakePoint($4, $3)::geography, $5, $6, $7, $8, $9, $10, $11, $12, $13, CASE WHEN $7::text IS NOT NULL THEN now() + interval '30 days' ELSE NULL END, now() + interval '90 days')
     ON CONFLICT (client_id) DO NOTHING
     RETURNING id`,
    [clientId, user?.sub || null, Number(lat), Number(lng), type, hazard, photoData, note, ai.label, ai.confidence, ai.mode, status, district]
  );

  const row = (await query(`${reportSelect} WHERE r.client_id = $1`, [clientId])).rows[0];
  if (!ins.rowCount && row.user_id !== (user?.sub || null)) throw httpErr(409, 'clientId is already in use');
  const mapped = mapReport(row);
  return { created: ins.rowCount === 1, report: !ins.rowCount && !user?.sub ? { id: mapped.id, clientId: mapped.clientId, status: mapped.status } : mapped };
}

async function updateSosForSync(input, user) {
  if (!user?.sub || user.role !== 'citizen') throw httpErr(401, 'Login required to sync SOS updates');
  if (!input?.clientId || typeof input.clientId !== 'string') throw httpErr(400, 'clientId required');
  const current = await query('SELECT id, status, user_id, people_count, injured, note FROM sos_events WHERE client_id = $1', [input.clientId]);
  if (!current.rowCount) throw httpErr(404, 'SOS event not found');
  const row = current.rows[0];
  if (row.user_id !== user.sub) throw httpErr(403, 'Not your SOS event');
  const updates = [];
  const values = [];
  const add = (column, value) => { values.push(value); updates.push(`${column} = $${values.length}`); };
  if (input.peopleCount !== undefined) add('people_count', input.peopleCount);
  if (input.injured !== undefined) add('injured', Boolean(input.injured));
  if (input.note !== undefined) add('note', input.note);
  if (input.status !== undefined) {
    if (input.status !== 'cancelled') throw httpErr(400, 'Only SOS cancellation can be synchronized');
    if (row.status === 'cancelled') return { updated: false, duplicate: true, id: row.id, status: row.status };
    if (['resolved', 'duplicate'].includes(row.status)) throw httpErr(409, 'SOS event is already closed');
    add('status', 'cancelled');
  }
  if (!updates.length) throw httpErr(400, 'No supported SOS updates supplied');
  const same = input.status === undefined &&
    (input.peopleCount === undefined || input.peopleCount === row.people_count) &&
    (input.injured === undefined || Boolean(input.injured) === row.injured) &&
    (input.note === undefined || input.note === row.note);
  if (same) return { updated: false, duplicate: true, id: row.id, status: row.status };
  values.push(row.id);
  await query(`UPDATE sos_events SET ${updates.join(', ')}, updated_at = now() WHERE id = $${values.length}`, values);
  await query(
    `INSERT INTO audit_log (actor_id, actor_role, action, target_type, target_id, detail) VALUES ($1, 'citizen', 'sos.offline_update', 'sos', $2, $3)`,
    [user.sub, String(row.id), JSON.stringify({ status: input.status || row.status })]
  );
  return { updated: true, duplicate: false, id: row.id, status: input.status || row.status };
}

async function listSos({ status = null, userId = null, district = null } = {}) {
  const p = [];
  const where = [];
  if (userId) {
    p.push(userId);
    where.push(`s.user_id = $${p.length}`);
  }
  if (district) {
    p.push(district);
    where.push(`s.district = $${p.length}`);
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
  updateSosForSync,
  listSos,
  sosSelect,
  reportSelect,
  REPORT_TYPES,
  httpErr,
};

