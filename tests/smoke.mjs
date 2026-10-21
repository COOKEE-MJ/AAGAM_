// End-to-end smoke test against a running API.
// Usage: node tests/smoke.mjs or npm run smoke
import 'dotenv/config';

const BASE = process.env.SMOKE_BASE_URL || 'http://localhost:3000';
let pass = 0, fail = 0;

async function call(method, path, { token, body } = {}) {
  const r = await fetch(BASE + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: 'Bearer ' + token } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  let json = null;
  try { json = await r.json(); } catch {}
  return { status: r.status, json };
}

function check(name, ok, extra = '') {
  if (ok) { pass++; console.log(`PASS  ${name}`); }
  else { fail++; console.log(`FAIL  ${name}  ${extra}`); }
}

(async () => {
  const run = Date.now().toString(36);

  // 1. Health
  const h = await call('GET', '/api/health');
  check('health ok', h.status === 200 && h.json.ok === true && h.json.db === 'up', JSON.stringify(h.json));

  // 2. Login (both phone & email supported)
  const cit = await call('POST', '/api/auth/login', { body: { phone: '9000000002', password: 'Demo@1234' } });
  const off = await call('POST', '/api/auth/login', { body: { email: 'officer@demo.local', password: 'Demo@1234' } });
  check('citizen login (phone)', cit.status === 200 && cit.json.token);
  check('officer login (email)', off.status === 200 && off.json.token);
  const C = cit.json?.token, O = off.json?.token;

  // 3. Hazards catalogue (11 hazards)
  const hz = await call('GET', '/api/hazards');
  const codes = (hz.json?.hazards || []).map((x) => x.id || x.code);
  check('11 hazard catalogue loaded', codes.length >= 11 && ['cyclone', 'flood', 'rain', 'earthquake', 'landslide', 'tsunami', 'heatwave', 'coldwave', 'lightning', 'forest_fire', 'avalanche'].every((c) => codes.includes(c)));

  // 4. Alerts
  const al = await call('GET', '/api/alerts?lat=28.6139&lng=77.2090&radius=50');
  check('GET /api/alerts returns alerts', al.status === 200 && al.json.alerts.length > 0);
  const kinds = new Set(al.json.alerts.map((a) => a.hazard));
  check('alerts cover multiple hazards', kinds.size >= 4, [...kinds].join(','));

  const eq = await call('GET', '/api/alerts?hazard=earthquake');
  check('hazard filter works (earthquake)', eq.status === 200 && eq.json.alerts.length >= 1 && eq.json.alerts.every((a) => a.hazard === 'earthquake'));

  // 5. Shelters nearest first
  const sh = await call('GET', '/api/shelters?lat=28.6139&lng=77.2090');
  check('GET /api/shelters nearest first', sh.status === 200 && sh.json.shelters.length > 1 && sh.json.shelters[0].distanceKm <= sh.json.shelters[1].distanceKm);

  const shEq = await call('GET', '/api/shelters?hazard=earthquake');
  check('earthquake shelters filter works', shEq.json.shelters.length > 0 && shEq.json.shelters.every((s) => s.suitableFor.includes('earthquake')));

  // 6. SOS idempotency
  const sosBody = { clientId: 'smoke-sos-' + run, lat: 28.614, lng: 77.209, timestamp: new Date().toISOString(), hazard: 'earthquake' };
  const s1 = await call('POST', '/api/sos/trigger', { token: C, body: sosBody });
  const s2 = await call('POST', '/api/sos/trigger', { token: C, body: sosBody });
  check('SOS first send creates (201)', s1.status === 201 && s1.json.duplicate === false, JSON.stringify(s1));
  check('SOS duplicate send returns 200 + duplicate: true', s2.status === 200 && s2.json.duplicate === true && s2.json.sos.id === s1.json.sos.id);

  // 7. Sync idempotency
  const batch = {
    items: [
      { type: 'sos', clientId: 'smoke-sync-sos-' + run, lat: 28.615, lng: 77.21, timestamp: new Date().toISOString(), hazard: 'landslide' },
      { type: 'report', clientId: 'smoke-sync-bad-' + run, lat: 28.615, lng: 77.21, reportType: 'invalid_type', hazard: 'landslide' },
      { type: 'report', clientId: 'smoke-sync-good-' + run, lat: 28.615, lng: 77.21, reportType: 'landslide', hazard: 'landslide', note: 'smoke sync' },
    ],
  };
  const y1 = await call('POST', '/api/sync', { token: C, body: batch });
  const y2 = await call('POST', '/api/sync', { token: C, body: batch });
  const r1 = y1.json?.results || [], r2 = y2.json?.results || [];
  check('sync: first run creates valid items', r1[0]?.result === 'created' && r1[2]?.result === 'created', JSON.stringify(r1));
  check('sync: bad item errors alone', r1[1]?.result === 'error');
  check('sync: replay returns duplicates', r2[0]?.result === 'duplicate' && r2[2]?.result === 'duplicate', JSON.stringify(r2));

  // 8. Photo Reports & AI verification
  const rep = await call('POST', '/api/reports', {
    token: C,
    body: { clientId: 'smoke-rep-' + run, lat: 28.6139, lng: 77.2090, type: 'flooding', hazard: 'flood' },
  });
  check('report created with AI label+confidence', rep.status === 201 && rep.json.report.aiLabel && rep.json.report.aiConfidence >= 0);
  check('mock flood report is ai_verified', rep.json?.report?.status === 'ai_verified');

  // 9. Role permissions
  check('citizen cannot read heatmap (403)', (await call('GET', '/api/heatmap', { token: C })).status === 403);
  check('guest cannot read SOS queue (401)', (await call('GET', '/api/sos')).status === 401);

  // 10. Officer actions & heatmap
  const hm = await call('GET', '/api/heatmap', { token: O });
  check('officer heatmap has cells', hm.status === 200 && hm.json.cells.length > 0);

  const q = await call('GET', '/api/sos?status=new', { token: O });
  check('officer SOS queue lists new SOS', q.status === 200 && q.json.sos.some((x) => x.clientId === sosBody.clientId));

  const ack = await call('PATCH', '/api/sos/' + s1.json.sos.id, { token: O, body: { status: 'acknowledged' } });
  check('officer acknowledges SOS', ack.status === 200 && ack.json.sos.status === 'acknowledged');

  const rv = await call('PATCH', '/api/reports/' + rep.json.report.id, { token: O, body: { status: 'rejected', rejectReason: 'duplicate' } });
  check('officer rejects report with reason', rv.status === 200 && rv.json.report.status === 'rejected');

  const sm = await call('GET', '/api/sms-log', { token: O });
  check('mock SMS log reachable', sm.status === 200);

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();

