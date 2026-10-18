// End-to-end smoke test against a running API. Usage: npm run smoke
// Checks the contract endpoints, role rules and (most important) idempotency of SOS and /api/sync.
const BASE = process.env.SMOKE_BASE_URL || 'http://localhost:4000';
let pass = 0, fail = 0;

async function call(method, path, { token, body } = {}) {
  const r = await fetch(BASE + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  let json = null; try { json = await r.json(); } catch {}
  return { status: r.status, json };
}
function check(name, ok, extra = '') { (ok ? pass++ : fail++); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : '  ' + extra}`); }

(async () => {
  const run = Date.now().toString(36);
  const h = await call('GET', '/api/health');
  check('health ok', h.status === 200, JSON.stringify(h.json));

  const cit = await call('POST', '/api/auth/login', { body: { phone: '9000000002', password: 'Demo@1234' } });
  const off = await call('POST', '/api/auth/login', { body: { phone: '9000000001', password: 'Demo@1234' } });
  check('citizen login', cit.status === 200 && cit.json.token);
  check('officer login', off.status === 200 && off.json.token);
  const C = cit.json?.token, O = off.json?.token;

  const hz = await call('GET', '/api/hazards');
  const codes = (hz.json?.hazards || []).map((x) => x.code);
  check('hazard catalogue includes earthquake, landslide, heatwave, tsunami', ['earthquake', 'landslide', 'heatwave', 'tsunami'].every((c) => codes.includes(c)));

  const al = await call('GET', '/api/alerts?lat=20.2961&lng=85.8312&radius=50');
  check('GET /api/alerts returns alerts', al.status === 200 && al.json.alerts.length > 0);
  const kinds = new Set(al.json.alerts.map((a) => a.hazard));
  check('alerts cover more than cyclone/flood', kinds.size > 2, [...kinds].join(','));
  const eq = await call('GET', '/api/alerts?hazard=earthquake');
  check('hazard filter works', eq.json.alerts.every((a) => a.hazard === 'earthquake') && eq.json.alerts.length > 0);

  const sh = await call('GET', '/api/shelters?lat=20.2961&lng=85.8312');
  check('GET /api/shelters nearest first', sh.status === 200 && sh.json.shelters.length > 1 && sh.json.shelters[0].distanceKm <= sh.json.shelters[1].distanceKm);
  const shEq = await call('GET', '/api/shelters?hazard=earthquake');
  check('earthquake shelters = assembly points/hospital', shEq.json.shelters.length > 0 && shEq.json.shelters.every((s) => s.suitableFor.includes('earthquake')));

  // --- SOS idempotency ---
  const sosBody = { clientId: 'smoke-sos-' + run, lat: 20.3, lng: 85.83, timestamp: new Date().toISOString(), hazard: 'earthquake' };
  const s1 = await call('POST', '/api/sos/trigger', { token: C, body: sosBody });
  const s2 = await call('POST', '/api/sos/trigger', { token: C, body: sosBody });
  check('SOS first send creates (201)', s1.status === 201 && s1.json.duplicate === false, JSON.stringify(s1));
  check('SOS same clientId again = duplicate, same id', s2.status === 200 && s2.json.duplicate === true && s2.json.sos.id === s1.json.sos.id);

  // --- Sync idempotency ---
  const batch = { items: [
    { type: 'sos', clientId: 'smoke-sync-sos-' + run, lat: 20.31, lng: 85.84, timestamp: new Date().toISOString(), hazard: 'landslide' },
    { type: 'report', clientId: 'smoke-sync-rep-' + run, lat: 20.31, lng: 85.84, reportType: 'x', hazard: 'landslide' },
    { type: 'report', clientId: 'smoke-sync-rep2-' + run, lat: 20.31, lng: 85.84, reportType: 'landslide', hazard: 'landslide', note: 'smoke' },
  ] };
  // second item above has an invalid reportType on purpose: must fail alone without blocking others
  const y1 = await call('POST', '/api/sync', { token: C, body: batch });
  const y2 = await call('POST', '/api/sync', { token: C, body: batch });
  const r1 = y1.json?.results || [], r2 = y2.json?.results || [];
  check('sync: first run creates valid items', r1[0]?.result === 'created' && r1[2]?.result === 'created', JSON.stringify(r1));
  check('sync: bad item errors alone', r1[1]?.result === 'error');
  check('sync: replay = duplicates, nothing new', r2[0]?.result === 'duplicate' && r2[2]?.result === 'duplicate', JSON.stringify(r2));

  // --- Reports + AI rule ---
  const rep = await call('POST', '/api/reports', { token: C, body: { clientId: 'smoke-rep-' + run, lat: 20.29, lng: 85.83, type: 'flooding', hazard: 'flood' } });
  check('report created with AI label+confidence', rep.status === 201 && rep.json.report.aiLabel && rep.json.report.aiConfidence >= 0, JSON.stringify(rep.json));
  check('mock flood report is ai_verified', rep.json?.report?.status === 'ai_verified');

  // --- Role rules ---
  check('citizen cannot read heatmap (403)', (await call('GET', '/api/heatmap', { token: C })).status === 403);
  check('guest cannot read SOS queue (401)', (await call('GET', '/api/sos')).status === 401);
  const hm = await call('GET', '/api/heatmap', { token: O });
  check('officer heatmap has cells', hm.status === 200 && hm.json.cells.length > 0);

  // --- Officer actions ---
  const q = await call('GET', '/api/sos?status=new', { token: O });
  check('officer SOS queue lists new SOS', q.status === 200 && q.json.sos.some((x) => x.clientId === sosBody.clientId));
  const ack = await call('PATCH', '/api/sos/' + s1.json.sos.id, { token: O, body: { status: 'acknowledged' } });
  check('officer acknowledges SOS', ack.status === 200 && ack.json.sos.status === 'acknowledged');
  const bad = await call('PATCH', '/api/sos/' + s1.json.sos.id, { token: O, body: { status: 'new' } });
  check('invalid status jump rejected (409)', bad.status === 409);
  const can = await call('PATCH', '/api/sos/' + s1.json.sos.id, { token: C, body: { status: 'resolved' } });
  check('citizen cannot resolve (403)', can.status === 403);

  const rv = await call('PATCH', '/api/reports/' + rep.json.report.id, { token: O, body: { status: 'rejected' } });
  check('reject needs a reason (400)', rv.status === 400);
  const rv2 = await call('PATCH', '/api/reports/' + rep.json.report.id, { token: O, body: { status: 'rejected', rejectReason: 'duplicate' } });
  check('officer rejects report with reason', rv2.status === 200 && rv2.json.report.status === 'rejected');

  const na = await call('POST', '/api/alerts', { token: O, body: { hazard: 'heatwave', severity: 'high', title: 'Smoke manual alert', district: 'Demo District', sourceName: 'smoke', sourceUrl: 'https://mausam.imd.gov.in/', dedupeKey: 'smoke-' + run } });
  check('officer posts manual alert', na.status === 201 && na.json.status === 'published', JSON.stringify(na.json));
  const bh = await call('POST', '/api/alerts', { token: O, body: { hazard: 'not_a_hazard', severity: 'high', title: 'x', district: 'd', sourceName: 's', sourceUrl: 'https://x' } });
  check('unknown hazard rejected (400)', bh.status === 400, JSON.stringify(bh));

  const sm = await call('GET', '/api/sms-log', { token: O });
  check('mock SMS log reachable', sm.status === 200);

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error('smoke test crashed (is the API running?):', e.message); process.exit(2); });
