// AI photo verification client + mock SMS logging
// In mock mode (default), returns a matching label with 0.85 confidence so every demo works.
// In live mode, posts to VISION_URL (M3's vision service).
const { query } = require('./config');

const MOCK_LABEL = {
  flooding: 'flood',
  building_damage: 'building_damage',
  road_blocked: 'road_blocked',
  landslide: 'landslide',
  fire: 'fire',
  other: 'other',
};

async function verifyImage({ photoData, type }) {
  if ((process.env.AI_MODE || 'mock') !== 'live') {
    return { label: MOCK_LABEL[type] || 'flood', confidence: 0.85, mode: 'mock' };
  }
  try {
    const r = await fetch(process.env.VISION_URL || 'http://localhost:8000/verify-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: photoData, type }),
      signal: AbortSignal.timeout(15000),
    });
    if (!r.ok) throw new Error('vision service HTTP ' + r.status);
    const j = await r.json();
    return { label: j.label, confidence: Number(j.confidence), mode: 'live' };
  } catch (e) {
    console.error('[AI verify] failed:', e.message);
    return { label: null, confidence: null, mode: 'unavailable' };
  }
}

async function sendMockSms({ toPhone, body, sosId = null }) {
  const { rows } = await query(
    `INSERT INTO sms_log (to_phone, body, mode, related_sos) VALUES ($1, $2, 'mock', $3) RETURNING *`,
    [toPhone, body, sosId]
  );
  return rows[0];
}

module.exports = { verifyImage, sendMockSms };

