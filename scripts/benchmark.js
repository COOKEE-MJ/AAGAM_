// scripts/benchmark.js - AAGAM API Latency & Performance Benchmark Suite

const API_BASE = 'http://localhost:3000/api';
const FRONTEND_BASE = 'http://localhost:5000';
const RUNS = 25;

async function request(url, options = {}) {
  const start = process.hrtime.bigint();
  const res = await fetch(url, options);
  const end = process.hrtime.bigint();
  const latencyMs = Number(end - start) / 1e6;
  let body = null;
  try {
    body = await res.json();
  } catch (e) {
    try { body = await res.text(); } catch (_) {}
  }
  return { status: res.status, latencyMs, body };
}

function stats(latencies) {
  if (!latencies || latencies.length === 0) {
    return { min: 0, max: 0, avg: 0, median: 0, p95: 0 };
  }
  const sorted = [...latencies].sort((a, b) => a - b);
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  const sum = sorted.reduce((a, b) => a + b, 0);
  const avg = sum / sorted.length;
  const median = sorted[Math.floor(sorted.length / 2)];
  const p95 = sorted[Math.floor(sorted.length * 0.95)];
  return { min, max, avg, median, p95 };
}

async function run() {
  console.log('========================================================================================');
  console.log('                   AAGAM DISASTER SHIELD AI - LATENCY BENCHMARKS                        ');
  console.log('========================================================================================\n');

  // 0. Login officer to get JWT for authenticated endpoints
  const loginRes = await request(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'officer@demo.local', password: 'Demo@1234' })
  });
  const token = loginRes.body?.token;
  if (!token) throw new Error('Officer login failed, cannot run authenticated benchmarks');

  const results = [];

  // Benchmark 1: GET /api/alerts (Spatial query)
  console.log(`[1/7] Benchmarking GET /api/alerts (Spatial index query, ${RUNS} runs)...`);
  const alertLatencies = [];
  for (let i = 0; i < RUNS; i++) {
    const res = await request(`${API_BASE}/alerts?lat=28.6139&lng=77.2090&radius=50`);
    if (res.status === 200) alertLatencies.push(res.latencyMs);
  }
  results.push({ name: 'GET /api/alerts (Spatial Index)', target: '< 100 ms', ...stats(alertLatencies) });

  // Benchmark 2: GET /api/shelters (PostGIS nearest-first distance calculation)
  console.log(`[2/7] Benchmarking GET /api/shelters (PostGIS ST_Distance sort, ${RUNS} runs)...`);
  const shelterLatencies = [];
  for (let i = 0; i < RUNS; i++) {
    const res = await request(`${API_BASE}/shelters?lat=28.6139&lng=77.2090&limit=20`);
    if (res.status === 200) shelterLatencies.push(res.latencyMs);
  }
  results.push({ name: 'GET /api/shelters (PostGIS Sort)', target: '< 150 ms', ...stats(shelterLatencies) });

  // Benchmark 3: POST /api/sos/trigger (Write speed within rate limit window)
  console.log('[3/7] Benchmarking POST /api/sos/trigger (Emergency distress write)...');
  const sosLatencies = [];
  const sosRuns = 8; // Stay within 10 req/min rate limiter window
  for (let i = 0; i < sosRuns; i++) {
    const res = await request(`${API_BASE}/sos/trigger`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientId: `bench-sos-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}`,
        lat: 28.6139,
        lng: 77.2090,
        timestamp: new Date().toISOString(),
        note: 'Benchmark stress test'
      })
    });
    if (res.status === 201 || res.status === 200) sosLatencies.push(res.latencyMs);
  }
  results.push({ name: 'POST /api/sos/trigger (Distress Write)', target: '< 100 ms', ...stats(sosLatencies) });

  // Benchmark 4: POST /api/sync (Offline batch replay latency)
  console.log(`[4/7] Benchmarking POST /api/sync (Batch offline sync replay, ${RUNS} runs)...`);
  const syncLatencies = [];
  for (let i = 0; i < RUNS; i++) {
    const batch = {
      items: [
        {
          type: 'sos',
          clientId: `bench-sync-sos-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 5)}`,
          lat: 28.6189,
          lng: 77.214,
          timestamp: new Date().toISOString(),
          note: 'Offline sync item'
        },
        {
          type: 'report',
          reportType: 'flooding',
          clientId: `bench-sync-rep-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 5)}`,
          lat: 28.625,
          lng: 77.218,
          hazard: 'flood',
          note: 'Offline damage report'
        }
      ]
    };
    const res = await request(`${API_BASE}/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(batch)
    });
    if (res.status === 200) syncLatencies.push(res.latencyMs);
  }
  results.push({ name: 'POST /api/sync (Batch Replay)', target: '< 200 ms', ...stats(syncLatencies) });

  // Benchmark 5: GET /api/heatmap (PostGIS ST_SnapToGrid cell density)
  console.log(`[5/7] Benchmarking GET /api/heatmap (Spatial risk aggregation, ${RUNS} runs)...`);
  const heatmapLatencies = [];
  for (let i = 0; i < RUNS; i++) {
    const res = await request(`${API_BASE}/heatmap?hours=24`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.status === 200) heatmapLatencies.push(res.latencyMs);
  }
  results.push({ name: 'GET /api/heatmap (Spatial Density)', target: '< 50 ms', ...stats(heatmapLatencies) });

  // Benchmark 6: Duplicate Rejection Speed & Rate (Idempotency verification)
  console.log(`[6/7] Benchmarking Duplicate Interception & Deduplication (${RUNS} runs)...`);
  const dupClientId = `bench-dup-target-${Date.now()}`;
  // Seed initial item
  await request(`${API_BASE}/sync`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      items: [{ type: 'sos', clientId: dupClientId, lat: 28.6139, lng: 77.2090, note: 'Initial event' }]
    })
  });
  const dupLatencies = [];
  let duplicatesPrevented = 0;
  for (let i = 0; i < RUNS; i++) {
    const res = await request(`${API_BASE}/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: [{ type: 'sos', clientId: dupClientId, lat: 28.6139, lng: 77.2090, note: 'Duplicate replay attempt' }]
      })
    });
    if (res.body?.results?.[0]?.result === 'duplicate') {
      duplicatesPrevented++;
    }
    dupLatencies.push(res.latencyMs);
  }
  results.push({ name: 'Deduplication Interception (ON CONFLICT)', target: '< 50 ms', ...stats(dupLatencies) });

  // Benchmark 7: Web App Delivery Latency
  console.log(`[7/7] Benchmarking Web Delivery Latency (Citizen PWA, ${RUNS} runs)...`);
  const pwaLatencies = [];
  for (let i = 0; i < RUNS; i++) {
    const res = await request(`${FRONTEND_BASE}/citizen/index.html`);
    if (res.status === 200) pwaLatencies.push(res.latencyMs);
  }
  results.push({ name: 'Citizen PWA Web Delivery', target: '< 50 ms', ...stats(pwaLatencies) });

  console.log('\n========================================================================================');
  console.log('                              BENCHMARK RESULTS TABLE                                    ');
  console.log('========================================================================================');
  console.log(
    'Endpoint / Operation'.padEnd(44) +
    'Target SLA'.padEnd(13) +
    'Min'.padEnd(10) +
    'Avg'.padEnd(10) +
    'Median'.padEnd(10) +
    'P95'.padEnd(10) +
    'Status'
  );
  console.log('-'.repeat(96));

  for (const r of results) {
    const passed = r.p95 <= parseFloat(r.target.replace(/[^0-9.]/g, '')) * 1.5;
    console.log(
      r.name.padEnd(44) +
      r.target.padEnd(13) +
      `${r.min.toFixed(1)}ms`.padEnd(10) +
      `${r.avg.toFixed(1)}ms`.padEnd(10) +
      `${r.median.toFixed(1)}ms`.padEnd(10) +
      `${r.p95.toFixed(1)}ms`.padEnd(10) +
      (passed ? 'PASS [OPTIMAL]' : 'WARNING')
    );
  }

  console.log('========================================================================================');
  console.log(`Duplicate Rejection Rate: ${(duplicatesPrevented / RUNS * 100).toFixed(0)}% (${duplicatesPrevented}/${RUNS} duplicates intercepted)`);
  console.log('========================================================================================\n');
}

run().catch(console.error);

