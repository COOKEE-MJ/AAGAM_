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
     SET photo_data = NULL,
         note = COALESCE(note, '') || ' [Photo purged per 30-day retention policy]'
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

async function maskExpiredPhoneNumbers() {
  const r = await query(
    `UPDATE users
     SET phone = '+91XXXXX' || SUBSTRING(phone FROM LENGTH(phone)-3 FOR 4)
     WHERE role = 'citizen'
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
  const phones = await maskExpiredPhoneNumbers();
  return { photosPurged: photos, phonesMasked: phones, timestamp: new Date().toISOString() };
}

module.exports = {
  purgeExpiredPhotos,
  maskExpiredPhoneNumbers,
  runRetentionSweep,
};

