// Initializes database schema (creates tables, indexes, extensions).
// Usage: node db/init.mjs [--reset]
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

(async () => {
  try {
    if (process.argv.includes('--reset')) {
      await pool.query(`DROP TABLE IF EXISTS audit_log, sms_log, radar_snapshots, reports, sos_events, shelters, alerts, users, hazard_types CASCADE`);
    }
    const sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    await pool.query(sql);
    console.log('Schema ready.');
  } catch (err) {
    console.error('db:init failed:', err.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();

