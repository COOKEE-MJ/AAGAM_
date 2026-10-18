// Central config: database connection pool + error helper.
// All other files import { query, httpErr } from here instead of going to db.js directly.
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
pool.on('error', (e) => console.error('[pg] idle client error', e.message));

const query = (text, params) => pool.query(text, params);

/** Creates an HTTP-friendly error that the Express error handler will pick up */
function httpErr(status, message) {
  const e = new Error(message);
  e.status = status;
  return e;
}

module.exports = { pool, query, httpErr };

