// AI photo check client. M3 owns the real model; M2 only calls it.
// AI_MODE=mock -> returns the contract's fake reply so nobody is blocked (see Master Plan Part 7).
// AI_MODE=live -> POSTs the image to VISION_URL and expects { label, confidence }.

// Which report types each AI label can confirm. Keep in sync with M3's label list.
const LABEL_MATCHES = {
  flooding: ['flood'],
  building_damage: ['building_damage', 'collapsed_building', 'earthquake_damage'],
  road_blocked: ['road_blocked', 'landslide', 'debris'],
  landslide: ['landslide', 'debris'],
  fire: ['fire', 'smoke'],
  other: [],
};

// Mock label follows the declared type so every hazard can be demoed.
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
    const r = await fetch(process.env.VISION_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: photoData, type }),
      signal: AbortSignal.timeout(15000),
    });
    if (!r.ok) throw new Error('vision service HTTP ' + r.status);
    const j = await r.json();
    return { label: j.label, confidence: Number(j.confidence), mode: 'live' };
  } catch (e) {
    // Fail safe: never block the report; send it to a human.
    console.error('AI verify failed:', e.message);
    return { label: null, confidence: null, mode: 'unavailable' };
  }
}

// ai_verified only when confidence >= threshold AND the label matches what the citizen selected.
function decideStatus({ type, label, confidence }) {
  const threshold = Number(process.env.AI_THRESHOLD || 0.7);
  const ok = label && confidence != null && confidence >= threshold && (LABEL_MATCHES[type] || []).includes(label);
  return ok ? 'ai_verified' : 'needs_review';
}

module.exports = { verifyImage, decideStatus };
