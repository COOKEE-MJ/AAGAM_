require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
pool.on('error', (e) => console.error('pg pool error', e.message));

module.exports = { pool, query: (text, params) => pool.query(text, params) };
