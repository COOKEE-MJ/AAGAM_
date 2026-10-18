// End-to-end smoke test against a running AAGAM API.
// Run: node scripts/smoke-test.js or npm run smoke
require('dotenv').config();

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
  if (ok) {
    pass++;
    console.log(`PASS  ${name}`);
  } else {
    fail++;
    console.log(`FAIL  ${name}  ${extra}`);
  }
}

(async () => {
  const run = Date.now().toString(36);

  // 1. Health check
  const h = await call('GET', '/api/health');
  check('health ok', h.status === 200, JSON.stringify(h.json));

  // 2. Authentication (Citizen & Officer)
  const cit = await call('POST', '/api/auth/login', { body: { phone: '9000000002', password: 'Demo@1234' } });
  const off = await call('POST', '/api/auth/login', { body: { phone: '9000000001', password: 'Demo@1234' } });
  check('citizen login', cit.status === 200 && cit.json.token);
  check('officer login', off.status === 200 && off.json.token);
  const C = cit.json?.token, O = off.json?.token;

  // 3. Hazard Catalogue
  const hz = await call('GET', '/api/hazards');
  const codes = (hz.json?.hazards || []).map((x) => x.code || x.id);
  check('hazard catalogue includes earthquake, landslide, heatwave, tsunami', ['earthquake', 'landslide', 'heatwave', 'tsunami'].every((c) => codes.includes(c)));

  // 4. Alerts spatial & multi-hazard filtering
  const al = await call('GET', '/api/alerts?lat=28.6139&lng=77.2090&radius=100');
  check('GET /api/alerts returns alerts', al.status === 200 && al.json.alerts.length > 0);
  const kinds = new Set(al.json.alerts.map((a) => a.hazard));
  check('alerts cover multi-hazards', kinds.size >= 2, [...kinds].join(','));

  const eq = await call('GET', '/api/alerts?hazard=earthquake');
  check('hazard filter works', eq.json.alerts.every((a) => a.hazard === 'earthquake') && eq.json.alerts.length > 0);

  // 5. Nearest Shelters
  const sh = await call('GET', '/api/shelters?lat=28.6139&lng=77.2090');
  check('GET /api/shelters nearest first', sh.status === 200 && sh.json.shelters.length > 1 && sh.json.shelters[0].distanceKm <= sh.json.shelters[1].distanceKm);

  const shEq = await call('GET', '/api/shelters?hazard=earthquake');
  check('earthquake shelters filter works', shEq.json.shelters.length > 0 && shEq.json.shelters.every((s) => s.suitableFor.includes('earthquake')));

  // 6. SOS Idempotency (Unique clientId prevents duplicate rows)
  const sosBody = { clientId: 'smoke-sos-' + run, lat: 28.614, lng: 77.209, timestamp: new Date().toISOString(), hazard: 'earthquake' };
  const s1 = await call('POST', '/api/sos/trigger', { token: C, body: sosBody });
  const s2 = await call('POST', '/api/sos/trigger', { token: C, body: sosBody });
  check('SOS first send creates (201)', s1.status === 201 && s1.json.duplicate === false, JSON.stringify(s1));
  check('SOS same clientId again = duplicate, same id', s2.status === 200 && s2.json.duplicate === true && s2.json.sos.id === s1.json.sos.id);

  // 7. Offline Queue Sync Idempotency
  const batch = { items: [
    { type: 'sos', clientId: 'smoke-sync-sos-' + run, lat: 28.615, lng: 77.21, timestamp: new Date().toISOString(), hazard: 'landslide' },
    { type: 'report', clientId: 'smoke-sync-rep-' + run, lat: 28.615, lng: 77.21, reportType: 'invalid_type', hazard: 'landslide' },
    { type: 'report', clientId: 'smoke-sync-rep2-' + run, lat: 28.615, lng: 77.21, reportType: 'landslide', hazard: 'landslide', note: 'smoke' },
  ] };
  const y1 = await call('POST', '/api/sync', { token: C, body: batch });
  const y2 = await call('POST', '/api/sync', { token: C, body: batch });
  const r1 = y1.json?.results || [], r2 = y2.json?.results || [];
  check('sync: first run creates valid items', r1[0]?.result === 'created' && r1[2]?.result === 'created', JSON.stringify(r1));
  check('sync: bad item errors alone', r1[1]?.result === 'error');
  check('sync: replay = duplicates, nothing new', r2[0]?.result === 'duplicate' && r2[2]?.result === 'duplicate', JSON.stringify(r2));

  // 8. Reports + AI verification triage
  const rep = await call('POST', '/api/reports', {
    token: C,
    body: { clientId: 'smoke-rep-' + run, lat: 28.6139, lng: 77.2090, type: 'flooding', hazard: 'flood' }
  });
  check('report created with AI label+confidence', rep.status === 201 && rep.json.report.aiLabel && rep.json.report.aiConfidence >= 0, JSON.stringify(rep.json));
  check('mock flood report is ai_verified', rep.json?.report?.status === 'ai_verified');

  // 9. Role-Based Access Controls
  check('citizen cannot read heatmap (403)', (await call('GET', '/api/heatmap', { token: C })).status === 403);
  check('guest cannot read SOS queue (401)', (await call('GET', '/api/sos')).status === 401);
  const hm = await call('GET', '/api/heatmap', { token: O });
  check('officer heatmap has cells', hm.status === 200 && hm.json.cells.length > 0);

  // 10. Officer actions & transitions
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

  const na = await call('POST', '/api/alerts', {
    token: O,
    body: { hazard: 'heatwave', severity: 'high', title: 'Smoke manual alert', district: 'Demo District', sourceName: 'smoke', sourceUrl: 'https://mausam.imd.gov.in/', dedupeKey: 'smoke-' + run }
  });
  check('officer posts manual alert', na.status === 201 && na.json.status === 'published', JSON.stringify(na.json));
  const bh = await call('POST', '/api/alerts', {
    token: O,
    body: { hazard: 'not_a_hazard', severity: 'high', title: 'x', district: 'd', sourceName: 's', sourceUrl: 'https://x' }
  });
  check('unknown hazard rejected (400)', bh.status === 400, JSON.stringify(bh));

  // 11. Radar auto-publish rule vs pending
  const RK = { 'X-Radar-Key': process.env.RADAR_API_KEY || 'change-me-radar-key' };
  async function radarPost(body) {
    const r = await fetch(BASE + '/api/alerts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...RK },
      body: JSON.stringify(body)
    });
    return { status: r.status, json: await r.json() };
  }

  const gov = await radarPost({
    hazard: 'heavy_rain', severity: 'medium', title: 'Smoke gov alert', district: 'Puri',
    sourceName: 'IMD', sourceUrl: 'https://mausam.imd.gov.in/x', dedupeKey: 'smoke-gov-' + run
  });
  check('radar + .gov.in -> published', gov.status === 201 && gov.json.status === 'published', JSON.stringify(gov.json));

  const news = await radarPost({
    hazard: 'flood', severity: 'high', title: 'Smoke news alert', district: 'Puri',
    sourceName: 'News', sourceUrl: 'https://www.example-news.com/a', dedupeKey: 'smoke-news-' + run
  });
  check('radar + non-government site -> pending', news.status === 201 && news.json.status === 'pending' && /officer/.test(news.json.reviewReason || ''), JSON.stringify(news.json));

  const http = await radarPost({
    hazard: 'flood', severity: 'high', title: 'Smoke http alert', district: 'Puri',
    sourceName: 'IMD', sourceUrl: 'http://mausam.imd.gov.in/x', dedupeKey: 'smoke-http-' + run
  });
  check('radar + http (not https) .gov.in -> pending', http.json.status === 'pending', JSON.stringify(http.json));

  const pubList = await call('GET', '/api/alerts?hazard=flood&district=Puri');
  check('pending alert NOT visible to citizens', !pubList.json.alerts.some((a) => a.id === news.json.id));

  const offList = await call('GET', '/api/alerts?status=pending', { token: O });
  check('officer sees pending alert', offList.json.alerts.some((a) => a.id === news.json.id));

  const apv = await call('PATCH', '/api/alerts/' + news.json.id, { token: O, body: { status: 'published' } });
  check('officer approves pending alert', apv.status === 200 && apv.json.status === 'published', JSON.stringify(apv.json));

  const pubList2 = await call('GET', '/api/alerts?hazard=flood&district=Puri');
  const shown = pubList2.json.alerts.find((a) => a.id === news.json.id);
  check('approved alert now visible, labelled not-official', !!shown && shown.isOfficialSource === false && shown.extractionStatus === 'parsed_by_ai', JSON.stringify(shown));

  const cp = await call('PATCH', '/api/alerts/' + news.json.id, { token: C, body: { status: 'withdrawn' } });
  check('citizen cannot approve/withdraw (403)', cp.status === 403);

  const dup = await radarPost({
    hazard: 'heavy_rain', severity: 'high', title: 'Smoke gov alert (updated)', district: 'Puri',
    sourceName: 'IMD', sourceUrl: 'https://mausam.imd.gov.in/x', dedupeKey: 'smoke-gov-' + run
  });
  check('same dedupeKey updates, does not duplicate', dup.status === 201 && dup.json.id === gov.json.id);

  const noKey = await fetch(BASE + '/api/alerts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ hazard: 'flood', severity: 'high', title: 'x', district: 'Puri', sourceName: 's', sourceUrl: 'https://cwc.gov.in' })
  });
  check('no radar key and no login -> rejected', noKey.status === 401 || noKey.status === 403);

  const sm = await call('GET', '/api/sms-log', { token: O });
  check('mock SMS log reachable', sm.status === 200);

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => {
  console.error('smoke test crashed:', e.message);
  process.exit(2);
});
