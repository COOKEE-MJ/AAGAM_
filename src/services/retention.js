// =====================================================================
// DATA RETENTION & PRIVACY PURGE SERVICE
// ---------------------------------------------------------------------
// Implements data minimization and storage limitation principles:
//   1. Citizen damage photos are automatically purged after 30 days.
//   2. Personal phone numbers on resolved incidents are masked after 90 days.
//   3. Inactive guest records are anonymized to protect citizen privacy.
// =====================================================================
const { query } = require('../db');

async function purgeExpiredPhotos() {
  const r = await query(
    `UPDATE reports
     SET photo_data = NULL
     WHERE photo_data IS NOT NULL
       AND retention_expires_at IS NOT NULL
       AND retention_expires_at <= now()
     RETURNING id`
  );
  if (r.rowCount > 0) {
    await query(
      `INSERT INTO audit_log (actor_role, action, target_type, detail)
       VALUES ('system', 'privacy.purge_photos', 'report', $1)`,
      [JSON.stringify({ purgedCount: r.rowCount, reportIds: r.rows.map((x) => x.id) })]
    );
  }
  return r.rowCount;
}

async function redactExpiredSos() {
  const r = await query(
    `UPDATE sos_events
     SET location = NULL, note = NULL, people_count = NULL, injured = false,
         user_id = NULL, district = NULL, redacted_at = now()
     WHERE redacted_at IS NULL AND retention_expires_at IS NOT NULL AND retention_expires_at <= now()
     RETURNING id`
  );
  if (r.rowCount) await query(
    `INSERT INTO audit_log (actor_role, action, target_type, detail)
     VALUES ('system', 'privacy.redact_sos', 'sos', $1)`,
    [JSON.stringify({ redactedCount: r.rowCount, ids: r.rows.map((x) => x.id) })]
  );
  return r.rowCount;
}

async function redactExpiredReports() {
  const r = await query(
    `UPDATE reports
     SET location = NULL, note = NULL, user_id = NULL, district = NULL, redacted_at = now()
     WHERE redacted_at IS NULL AND pii_retention_expires_at IS NOT NULL AND pii_retention_expires_at <= now()
     RETURNING id`
  );
  if (r.rowCount) await query(
    `INSERT INTO audit_log (actor_role, action, target_type, detail)
     VALUES ('system', 'privacy.redact_reports', 'report', $1)`,
    [JSON.stringify({ redactedCount: r.rowCount, ids: r.rows.map((x) => x.id) })]
  );
  return r.rowCount;
}

async function maskExpiredPhoneNumbers() {
  const r = await query(
    `UPDATE users
     SET phone = 'retired-' || id::text, name = 'Former citizen', email = NULL,
         password_hash = gen_random_uuid()::text,
         home_district = NULL, home_state = NULL
     WHERE role = 'citizen'
       AND phone NOT LIKE 'retired-%'
       AND retention_expires_at IS NOT NULL
       AND retention_expires_at <= now()
     RETURNING id`
  );
  if (r.rowCount > 0) {
    await query(
      `INSERT INTO audit_log (actor_role, action, target_type, detail)
       VALUES ('system', 'privacy.mask_phones', 'user', $1)`,
      [JSON.stringify({ maskedCount: r.rowCount, userIds: r.rows.map((x) => x.id) })]
    );
  }
  return r.rowCount;
}

async function runRetentionSweep() {
  const photos = await purgeExpiredPhotos();
  const sos = await redactExpiredSos();
  const reports = await redactExpiredReports();
  const phones = await maskExpiredPhoneNumbers();
  return { photosPurged: photos, sosRedacted: sos, reportsRedacted: reports, accountsAnonymized: phones, timestamp: new Date().toISOString() };
}

module.exports = {
  purgeExpiredPhotos,
  redactExpiredSos,
  redactExpiredReports,
  maskExpiredPhoneNumbers,
  runRetentionSweep,
};

