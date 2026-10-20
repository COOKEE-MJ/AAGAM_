// Mock SMS gateway. Nothing is sent. Rows in sms_log are the demo proof ("SMS sent (mocked)").
// Label it as mocked in the README and live pitch presentation.
const { query } = require('../db');

async function sendMockSms({ toPhone, body, sosId = null }) {
  const { rows } = await query(
    `INSERT INTO sms_log (to_phone, body, mode, related_sos) VALUES ($1,$2,'mock',$3) RETURNING *`,
    [toPhone, body, sosId]
  );
  return rows[0];
}

module.exports = { sendMockSms };
