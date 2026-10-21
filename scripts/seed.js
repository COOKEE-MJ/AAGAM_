// Usage: node scripts/seed.js   (safe to re-run; seed rows use ON CONFLICT)
// Creates demo users (hashed passwords) then runs db/seed.sql.
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const { pool } = require('../src/db');

(async () => {
  try {
    await pool.query(fs.readFileSync(path.join(__dirname, '../db/seed.sql'), 'utf8'));
    const hash = await bcrypt.hash('Demo@1234', 10);
    await pool.query(
      `INSERT INTO users (role, name, phone, password_hash, home_district, home_state, district_scope) VALUES
        ('authority','Demo Officer','9000000001',$1,'Demo District','Demo State','Demo District'),
        ('citizen','Demo Citizen','9000000002',$1,'Demo District','Demo State',NULL)
       ON CONFLICT (phone) DO NOTHING`, [hash]);
    console.log('seeded. Demo logins (password Demo@1234): officer 9000000001, citizen 9000000002');
  } catch (e) { console.error('seed failed:', e.message); process.exitCode = 1; }
  finally { await pool.end(); }
})();
