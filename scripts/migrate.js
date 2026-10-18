// Usage: node scripts/migrate.js [--reset]    (--reset drops all tables first; local dev only)
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { pool } = require('../src/db');

(async () => {
  try {
    if (process.argv.includes('--reset')) {
      await pool.query(`DROP TABLE IF EXISTS sms_log, radar_snapshots, reports, sos_events, shelters, alerts, users, hazard_types CASCADE`);
      console.log('dropped tables');
    }
    await pool.query(fs.readFileSync(path.join(__dirname, '../db/schema.sql'), 'utf8'));
    console.log('schema applied');
  } catch (e) { console.error('migrate failed:', e.message); process.exitCode = 1; }
  finally { await pool.end(); }
})();
