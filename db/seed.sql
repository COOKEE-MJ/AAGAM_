-- Seed data. Everything here is DEMO data: shelter names/coordinates are invented placeholders
-- and must be replaced with real, sourced entries by M4 (seed CSV) before the demo is presented as real.
-- Demo centre point is roughly central India so any map view works; change coordinates freely.

INSERT INTO hazard_types (code, label, category, default_advice) VALUES
 ('cyclone',    'Cyclone',                 'hydro-meteorological', 'Move to the nearest cyclone shelter. Stay indoors away from windows. Keep a battery radio.'),
 ('flood',      'Flood',                   'hydro-meteorological', 'Move to higher ground. Do not walk or drive through flood water. Switch off mains power.'),
 ('heavy_rain', 'Heavy rainfall',          'hydro-meteorological', 'Avoid low-lying areas and underpasses. Postpone travel if possible.'),
 ('cloudburst', 'Cloudburst / flash flood','hydro-meteorological', 'Move away from streams and gullies immediately to higher ground.'),
 ('lightning',  'Lightning / thunderstorm','hydro-meteorological', 'Go indoors. Stay away from trees, poles and open fields.'),
 ('tsunami',    'Tsunami',                 'geological',           'Move inland and to high ground immediately. Do not wait for the water to recede.'),
 ('earthquake', 'Earthquake',              'geological',           'Drop, cover and hold on. After shaking stops, move to an open area away from buildings.'),
 ('landslide',  'Landslide',               'geological',           'Move away from the slope path. Avoid hill roads during heavy rain.'),
 ('heatwave',   'Heatwave',                'climatological',       'Stay indoors in the afternoon, drink water often, check on elderly neighbours.'),
 ('cold_wave',  'Cold wave',               'climatological',       'Stay warm and indoors, wear layers, check on elderly and homeless people.'),
 ('drought',    'Drought',                 'climatological',       'Conserve water. Follow district water-supply advisories.'),
 ('forest_fire','Forest fire',             'other',                'Move away from the fire and smoke. Follow evacuation orders from authorities.')
ON CONFLICT (code) DO NOTHING;

-- Passwords: demo only. citizen: Demo@1234   officer: Demo@1234  (bcrypt hashes are created by scripts/seed.js)
-- Users are inserted by scripts/seed.js because it hashes the passwords.

INSERT INTO shelters (name, type, district, address, location, capacity, occupancy, status, facilities, suitable_for, contact, source_name) VALUES
 ('DEMO Cyclone Shelter A',        'cyclone shelter',  'Demo District', 'Placeholder address 1', ST_MakePoint(85.8312, 20.2961)::geography, 400, 120, 'open',    '{water,food,medical,power,toilets}', '{cyclone,flood,heavy_rain}', '+910000000001', 'DEMO seed'),
 ('DEMO Govt School Shelter',      'school',           'Demo District', 'Placeholder address 2', ST_MakePoint(85.8450, 20.3050)::geography, 250, 215, 'filling', '{water,toilets,power}',            '{cyclone,flood,heavy_rain,landslide}', '+910000000002', 'DEMO seed'),
 ('DEMO Community Hall',           'community hall',   'Demo District', 'Placeholder address 3', ST_MakePoint(85.8190, 20.2800)::geography, 150, 150, 'full',    '{water,toilets}',                    '{flood,heavy_rain,heatwave,cold_wave}', '+910000000003', 'DEMO seed'),
 ('DEMO District Hospital Annex',  'hospital',         'Demo District', 'Placeholder address 4', ST_MakePoint(85.8600, 20.2700)::geography, 80,  10,  'open',    '{medical,water,power,wheelchair}',   '{earthquake,flood,heatwave}', '+910000000004', 'DEMO seed'),
 ('DEMO Open Ground Assembly Point','open assembly point','Demo District','Placeholder address 5', ST_MakePoint(85.8250, 20.3100)::geography, 1000,0,   'open',    '{water}',                            '{earthquake,tsunami,forest_fire}', '+910000000005', 'DEMO seed'),
 ('DEMO Hill-road Relief Camp',    'relief camp',      'Demo District', 'Placeholder address 6', ST_MakePoint(85.8700, 20.3200)::geography, 120, 30,  'open',    '{water,food,toilets}',               '{landslide,cloudburst}', '+910000000006', 'DEMO seed');

-- Seed alerts across hazards. source_url points at the official site root so the "View source" button works;
-- real radar alerts (M3) will carry the exact bulletin URL.
INSERT INTO alerts (hazard, severity, title, message, district, state, center, radius_km, valid_until, source_name, source_url, origin, status, dedupe_key) VALUES
 ('cyclone',    'high',    'Cyclone warning (DEMO)',        'Demo alert: cyclonic storm expected to cross coast within 24 h.', 'Demo District', 'Demo State', ST_MakePoint(85.83,20.30)::geography, 60, now() + interval '24 hours', 'IMD (demo seed)',   'https://mausam.imd.gov.in/', 'seed', 'published', 'seed-cyclone'),
 ('flood',      'medium',  'River flood watch (DEMO)',      'Demo alert: river levels rising; low-lying areas at risk.',        'Demo District', 'Demo State', NULL, NULL,                                        now() + interval '36 hours', 'CWC (demo seed)',   'https://cwc.gov.in/', 'seed', 'published', 'seed-flood'),
 ('earthquake', 'low',     'Earthquake M3.8 reported (DEMO)','Demo alert: light tremor felt, no damage reported.',            'Demo District', 'Demo State', ST_MakePoint(85.90,20.35)::geography, 80, now() + interval '12 hours', 'NCS (demo seed)',   'https://riseq.seismo.gov.in/', 'seed', 'published', 'seed-eq'),
 ('landslide',  'medium',  'Landslide risk on hill roads (DEMO)','Demo alert: heavy rain on slopes; avoid hill roads.',     'Demo District', 'Demo State', ST_MakePoint(85.87,20.32)::geography, 15, now() + interval '48 hours', 'GSI (demo seed)',   'https://www.gsi.gov.in/', 'seed', 'published', 'seed-landslide'),
 ('heatwave',   'high',    'Heatwave warning (DEMO)',       'Demo alert: maximum temperature far above normal for 3 days.',     'Demo District', 'Demo State', NULL, NULL,                                        now() + interval '72 hours', 'IMD (demo seed)',   'https://mausam.imd.gov.in/', 'seed', 'published', 'seed-heat'),
 ('tsunami',    'low',     'Tsunami bulletin: no threat (DEMO)','Demo alert: bulletin issued, no threat to the Indian coast.','Demo District', 'Demo State', NULL, NULL,                                      now() + interval '6 hours',  'INCOIS (demo seed)','https://incois.gov.in/', 'seed', 'published', 'seed-tsunami')
ON CONFLICT (dedupe_key) DO NOTHING;

-- A few incidents so the officer heatmap is not empty on day one.
INSERT INTO sos_events (client_id, location, hazard, created_on_phone_at, people_count, injured, note, status) VALUES
 ('seed-sos-1', ST_MakePoint(85.8320,20.2970)::geography, 'flood', now() - interval '20 minutes', 4, false, 'DEMO: water at doorstep', 'new'),
 ('seed-sos-2', ST_MakePoint(85.8330,20.2980)::geography, 'flood', now() - interval '15 minutes', 2, true,  'DEMO: elderly person stuck', 'new'),
 ('seed-sos-3', ST_MakePoint(85.8700,20.3210)::geography, 'landslide', now() - interval '40 minutes', 6, false, 'DEMO: road blocked by debris', 'acknowledged')
ON CONFLICT (client_id) DO NOTHING;

INSERT INTO reports (client_id, location, type, hazard, note, ai_label, ai_confidence, ai_mode, status) VALUES
 ('seed-rep-1', ST_MakePoint(85.8315,20.2965)::geography, 'flooding',        'flood',      'DEMO flooded street',   'flood',           0.88, 'mock', 'ai_verified'),
 ('seed-rep-2', ST_MakePoint(85.9010,20.3490)::geography, 'building_damage', 'earthquake', 'DEMO cracked wall',     'building_damage', 0.74, 'mock', 'ai_verified'),
 ('seed-rep-3', ST_MakePoint(85.8710,20.3220)::geography, 'landslide',       'landslide',  'DEMO slope failure',    'landslide',       0.55, 'mock', 'needs_review')
ON CONFLICT (client_id) DO NOTHING;
