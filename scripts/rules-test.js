// Quick checks for the radar rules. Run: node scripts/rules-test.js (no database needed)
const r = require('../src/radar/rules');
let pass = 0, fail = 0;
const t = (name, ok, extra = '') => {
  if (ok) {
    pass++;
    console.log(`PASS ${name}`);
  } else {
    fail++;
    console.log(`FAIL ${name} -> ${extra}`);
  }
};

const base = {
  title: 'Heavy rain warning',
  district: 'Puri',
  sourceUrl: 'https://mausam.imd.gov.in/x',
  colour: 'orange',
};

// --- the website rule (most important) ---
t('imd.gov.in https -> official', r.isOfficialUrl('https://mausam.imd.gov.in/a'));
t('nic.in https -> official', r.isOfficialUrl('https://fsi.nic.in/x'));
t('http (not https) gov.in -> NOT official', !r.isOfficialUrl('http://mausam.imd.gov.in/'));
t('.com site -> NOT official', !r.isOfficialUrl('https://www.ndtv.com/news'));
t('.org -> NOT official', !r.isOfficialUrl('https://reliefweb.org/x'));
t('trick domain gov.in.evil.com -> NOT official', !r.isOfficialUrl('https://gov.in.evil.com/'));
t('trick domain notgov.in -> NOT official', !r.isOfficialUrl('https://notgov.in/'));
t('broken address -> NOT official', !r.isOfficialUrl('not a url'));
t('empty -> NOT official', !r.isOfficialUrl(''));

// --- publish / pending decisions ---
t('official + complete -> published', r.decide(base).status === 'published', JSON.stringify(r.decide(base)));
t('news site -> pending', r.decide({ ...base, sourceUrl: 'https://www.thehindu.com/a' }).status === 'pending');
t('pending reason is plain words', /officer must approve/.test(r.decide({ ...base, sourceUrl: 'https://x.com' }).reviewReason || ''));
t('no district -> pending', r.decide({ ...base, district: '' }).status === 'pending');
t('expired -> pending', r.decide({ ...base, validUntil: '2020-01-01T00:00:00Z' }).status === 'pending');
t('green colour (no warning) -> pending', r.decide({ ...base, colour: 'green' }).status === 'pending');
t('unknown hazard text -> pending', r.decide({ ...base, title: 'Cultural festival tonight', colour: undefined, text: 'severe crowd' }).status === 'pending');

// --- hazards & severity ---
t('hazard: earthquake', r.detectHazard('M 5.2 earthquake near Leh') === 'earthquake');
t('hazard: cyclone in Hindi', r.detectHazard('चक्रवात की चेतावनी') === 'cyclone');
t('hazard: landslide', r.detectHazard('Landslide blocks highway') === 'landslide');
t('hazard: tsunami', r.detectHazard('Tsunami warning for Andaman') === 'tsunami');
t('drought is not radar-enabled', r.detectHazard('severe drought conditions') === null);
t('colour red -> high', r.detectSeverity({ colour: 'red' }) === 'high');
t('colour yellow -> low', r.detectSeverity({ colour: 'yellow' }) === 'low');
t('magnitude 5.0 -> medium', r.detectSeverity({ magnitude: 5.0 }) === 'medium');
t('magnitude 6.8 -> extreme', r.detectSeverity({ magnitude: 6.8 }) === 'extreme');
t('magnitude 2.0 -> none', r.detectSeverity({ magnitude: 2.0 }) === null);
t('words: extremely severe -> extreme', r.detectSeverity({ text: 'Extremely severe cyclonic storm' }) === 'extreme');

// --- same alert twice ---
const k1 = r.makeDedupeKey({ hazard: 'flood', district: 'Puri ', sourceUrl: 'https://cwc.gov.in/a', when: '2026-10-19T03:00:00Z' });
const k2 = r.makeDedupeKey({ hazard: 'flood', district: 'puri', sourceUrl: 'https://cwc.gov.in/b', when: '2026-10-19T20:00:00Z' });
t('same alert twice -> same key', k1 === k2, k1 + ' vs ' + k2);
t('next day -> different key', k1 !== r.makeDedupeKey({ hazard: 'flood', district: 'puri', sourceUrl: 'https://cwc.gov.in/b', when: '2026-10-20T01:00:00Z' }));

// --- every hazard in the file is complete ---
for (const [c, h] of Object.entries(r.RULES.hazards)) {
  t(`hazard '${c}' has agency, url, keywords`, Boolean(h.official_agency && h.agency_url && h.keywords.length > 0));
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);

