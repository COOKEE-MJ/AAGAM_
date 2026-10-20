require('dotenv').config();
const { requireJwtSecret } = require('./auth');
requireJwtSecret();
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());                         // the PWA and dashboard run on other ports in dev
app.use(express.json({ limit: '2mb' })); // photos arrive as small base64 data URLs

app.use('/api/auth', require('./routes/auth'));
app.use('/api/alerts', require('./routes/alerts'));
app.use('/api/shelters', require('./routes/shelters'));
app.use('/api/sos', require('./routes/sos'));
app.use('/api/sync', require('./routes/sync'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/heatmap', require('./routes/heatmap'));
app.use('/api', require('./routes/misc'));

app.get('/', (_req, res) => {
  res.json({
    message: 'AAGAM Backend API is running!',
    status: 'online',
    endpoints: {
      health: '/api/health',
      hazards: '/api/hazards',
      alerts: '/api/alerts',
      shelters: '/api/shelters'
    }
  });
});

app.use((_req, res) => res.status(404).json({ error: 'not found' }));
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  const status = err.status || (err.code === '23503' ? 400 : 500); // 23503 = unknown hazard / FK violation
  if (status >= 500) console.error(err);
  res.status(status).json({ error: status >= 500 ? 'server error' : err.message });
});

const port = process.env.PORT || 3000;
if (require.main === module) {
  app.listen(port, () => console.log(`AAGAM API on :${port} (AI_MODE=${process.env.AI_MODE || 'mock'})`));

  const { runRetentionSweep } = require('./services/retention');
  function runCleanup() {
    runRetentionSweep()
      .then((r) => console.log('daily clean-up done:', r))
      .catch((e) => console.error('daily clean-up FAILED:', e.message)); // never crash the server
  }
  if (process.env.NODE_ENV !== 'test' && process.env.RETENTION_ENABLED !== 'false') {
    setTimeout(runCleanup, 30 * 1000); // once, 30 s after start
    setInterval(runCleanup, 24 * 60 * 60 * 1000).unref(); // then every 24 hours
  }
}
module.exports = app;
