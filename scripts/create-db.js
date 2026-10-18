require('dotenv').config();
const { Client } = require('pg');

(async () => {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('No DATABASE_URL found in .env');
    process.exit(1);
  }
  const parsed = new URL(url);
  const targetDb = parsed.pathname.slice(1) || 'aagam';
  const adminUrl = url.replace(/\/[^/?]+(\?.*)?$/, '/postgres$1');

  console.log(`Connecting to PostgreSQL to check database "${targetDb}"...`);
  const client = new Client({ connectionString: adminUrl });
  try {
    await client.connect();
    console.log('Connected to PostgreSQL successfully!');
    const res = await client.query('SELECT 1 FROM pg_database WHERE datname=$1', [targetDb]);
    if (res.rows.length === 0) {
      await client.query(`CREATE DATABASE "${targetDb}"`);
      console.log(`Database "${targetDb}" created successfully!`);
    } else {
      console.log(`Database "${targetDb}" already exists.`);
    }
  } catch (err) {
    console.error('Database connection error:', err.message);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
})();
