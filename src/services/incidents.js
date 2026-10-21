// Shared create logic for SOS and reports. Used by the direct endpoints AND /api/sync,
// so idempotency lives in exactly one place (UNIQUE client_id + ON CONFLICT DO NOTHING).
const { query } = require('../db');
const { verifyImage, decideStatus } = require('./ai');
const { sendMockSms } = require('./sms');

const REPORT_TYPES = ['flooding', 'building_damage', 'road_blocked', 'landslide', 'fire', 'other'];

function badLatLng(lat, lng) {
  return !(Number.isFinite(lat) && Number.isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180);
}

async function createSos(input, user) {
  const { clientId, lat, lng, timestamp, hazard = null, peopleCount = null, injured = false, note = null } = input;
  if (!clientId || typeof clientId !== 'string') throw httpErr(400, 'clientId required');
  if (badLatLng(Number(lat), Number(lng))) throw httpErr(400, 'valid lat and lng required');
  const when = timestamp ? new Date(timestamp) : new Date();
  if (isNaN(when)) throw httpErr(400, 'timestamp invalid');

  const ins = await query(
    `INSERT INTO sos_events (client_id, user_id, location, hazard, created_on_phone_at, people_count, injured, note)
     VALUES ($1,$2,ST_MakePoint($4,$3)::geography,$5,$6,$7,$8,$9)
     ON CONFLICT (client_id) DO NOTHING
     RETURNING id`,
    [clientId, user?.sub || null, Number(lat), Number(lng), hazard, when, peopleCount, !!injured, note]
  );
  const created = ins.rowCount === 1;
  const row = (await query(sosSelect + ' WHERE s.client_id = $1', [clientId])).rows[0];
  if (created && input.viaSmsFallback) {
    await sendMockSms({ toPhone: 'control-room', body: `SOS ${clientId} @ ${lat},${lng}`, sosId: row.id });
  }
  return { created, sos: row };
}

async function createReport(input, user) {
  const { clientId, lat, lng, type, hazard = null, note = null, photoData = null } = input;
  if (!clientId) throw httpErr(400, 'clientId required');
  if (badLatLng(Number(lat), Number(lng))) throw httpErr(400, 'valid lat and lng required');
  if (!REPORT_TYPES.includes(type)) throw httpErr(400, `type must be one of ${REPORT_TYPES.join(', ')}`);
  if (photoData && photoData.length > 1_500_000) throw httpErr(413, 'photo too large; shrink it on the phone (~300 KB)');

  // Idempotent: if this clientId already exists, return it without calling the AI again.
  const existing = await query(reportSelect + ' WHERE r.client_id = $1', [clientId]);
  if (existing.rowCount) return { created: false, report: existing.rows[0] };

  const ai = await verifyImage({ photoData, type });
  const status = decideStatus({ type, label: ai.label, confidence: ai.confidence });
  const ins = await query(
    `INSERT INTO reports (client_id, user_id, location, type, hazard, photo_data, note, ai_label, ai_confidence, ai_mode, status)
     VALUES ($1,$2,ST_MakePoint($4,$3)::geography,$5,$6,$7,$8,$9,$10,$11,$12)
     ON CONFLICT (client_id) DO NOTHING RETURNING id`,
    [clientId, user?.sub || null, Number(lat), Number(lng), type, hazard, photoData, note, ai.label, ai.confidence, ai.mode, status]
  );
  const row = (await query(reportSelect + ' WHERE r.client_id = $1', [clientId])).rows[0];
  return { created: ins.rowCount === 1, report: row };
}

const sosSelect = `SELECT s.id, s.client_id AS "clientId", s.status, s.hazard, s.people_count AS "peopleCount", s.injured, s.note,
  ST_Y(s.location::geometry) AS lat, ST_X(s.location::geometry) AS lng,
  s.created_on_phone_at AS "createdOnPhoneAt", s.received_at AS "receivedAt", s.dispatch_note AS "dispatchNote",
  u.phone AS phone, u.name AS "citizenName"
  FROM sos_events s LEFT JOIN users u ON u.id = s.user_id`;

const reportSelect = `SELECT r.id, r.client_id AS "clientId", r.type, r.hazard, r.note, r.status,
  r.ai_label AS "aiLabel", r.ai_confidence AS "aiConfidence", r.ai_mode AS "aiMode", r.reject_reason AS "rejectReason",
  ST_Y(r.location::geometry) AS lat, ST_X(r.location::geometry) AS lng, r.created_at AS "createdAt",
  (r.photo_data IS NOT NULL) AS "hasPhoto"
  FROM reports r`;

function httpErr(status, message) { const e = new Error(message); e.status = status; return e; }

module.exports = { createSos, createReport, httpErr, sosSelect, reportSelect, REPORT_TYPES };
