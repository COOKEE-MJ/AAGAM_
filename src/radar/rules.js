// =====================================================================
// RADAR RULES  (AAGAM Multi-Hazard Verification Engine)
// ---------------------------------------------------------------------
// Evaluates alerts discovered by the radar (TinyFish code):
//   1. Which hazard is it?  (cyclone, flood, earthquake ...)
//   2. How serious is it?   (low / medium / high / extreme)
//   3. Can it be shown to citizens right away, or must an officer approve it first?
//   4. What is its "same alert" dedupe key, so finding it twice updates rather than duplicates?
//
// THE CORE PUBLISH RULE:
//   Only web addresses starting with https:// and ending in .gov.in or .nic.in
//   are published automatically. EVERY other website waits as "pending"
//   until an officer approves it.
//
// All rules, keywords, colours, and official domains live in config/radar_rules.json.
// =====================================================================
const path = require('path');
const RULES = require(path.join(__dirname, '../../config/radar_rules.json'));

const LEVELS = ['low', 'medium', 'high', 'extreme'];

// Extract hostname from a URL. Returns null if invalid.
function hostOf(url) {
  try { return new URL(url).hostname.toLowerCase(); } catch { return null; }
}

// Validates whether the URL belongs to an official Indian government domain (.gov.in or .nic.in over HTTPS).
// "evil-gov.in.example.com" is strictly rejected by verifying the hostname suffix.
function isOfficialUrl(url) {
  let u; try { u = new URL(url); } catch { return false; }
  if (RULES.publish_rule.require_https && u.protocol !== 'https:') return false;
  const host = u.hostname.toLowerCase();
  return RULES.publish_rule.official_host_suffixes.some((suf) => host.endsWith(suf) || host === suf.replace(/^\./, ''));
}

// Identifies the hazard category from text using multilingual keywords (English, Hindi, Odia).
function detectHazard(text) {
  const t = String(text || '').toLowerCase();
  let best = null, bestHits = 0;
  for (const [code, h] of Object.entries(RULES.hazards)) {
    if (!h.radar_enabled) continue;
    const hits = h.keywords.filter((k) => t.includes(k.toLowerCase())).length;
    if (hits > bestHits) { best = code; bestHits = hits; }
  }
  return best;
}

// Derives alert severity level from IMD color codes, earthquake Richter magnitude, or keywords.
function detectSeverity({ colour, magnitude, text } = {}) {
  if (colour) {
    const c = RULES.severity.imd_colour[String(colour).toLowerCase()];
    if (c !== undefined) return c; // green returns null intentionally (no warning)
  }
  if (magnitude !== undefined && magnitude !== null && Number.isFinite(Number(magnitude))) {
    const m = Number(magnitude);
    for (const lvl of LEVELS) {
      const [lo, hi] = RULES.severity.earthquake_magnitude_bands[lvl];
      if (m >= lo && m <= hi) return lvl;
    }
    return m < 3 ? null : 'extreme';
  }
  const t = String(text || '').toLowerCase();
  for (const lvl of ['extreme', 'high', 'medium', 'low']) {
    if (RULES.severity.keywords[lvl].some((k) => t.includes(k))) return lvl;
  }
  return null;
}

// Builds deterministic deduplication key: hazard | district | source_host | day.
function makeDedupeKey({ hazard, district, sourceUrl, when }) {
  const day = (when ? new Date(when) : new Date()).toISOString().slice(0, 10);
  return [hazard, String(district || '').trim().toLowerCase(), hostOf(sourceUrl) || 'unknown', day].join('|');
}

// Evaluates a discovered bulletin and decides whether it auto-publishes or requires officer review.
function decide(found, now = new Date()) {
  const reasons = [];
  const hazard = found.hazard || detectHazard(`${found.title || ''} ${found.text || ''}`);
  const severity = found.severity || detectSeverity({ colour: found.colour, magnitude: found.magnitude, text: `${found.title || ''} ${found.text || ''}` });
  const official = isOfficialUrl(found.sourceUrl);

  if (!official) reasons.push(hostOf(found.sourceUrl) ? 'Source is not an https .gov.in / .nic.in website - an officer must approve' : 'Source address is missing or broken');
  if (!hazard || !RULES.hazards[hazard]) reasons.push('Hazard type not recognised');
  if (!severity) reasons.push('Could not work out how serious it is');
  if (!found.district) reasons.push('No district given');
  if (found.validUntil && new Date(found.validUntil) <= now) reasons.push('Alert has already expired');

  const publish = reasons.length === 0;
  return {
    status: publish ? 'published' : 'pending',
    hazard: hazard || null,
    severity: severity || null,
    isOfficialSource: official,
    reviewReason: publish ? null : reasons.join('; '),
    dedupeKey: hazard ? makeDedupeKey({ hazard, district: found.district, sourceUrl: found.sourceUrl, when: found.publishedAt || now }) : null,
    officialAgency: hazard && RULES.hazards[hazard] ? RULES.hazards[hazard].official_agency : null,
  };
}

module.exports = { RULES, hostOf, isOfficialUrl, detectHazard, detectSeverity, makeDedupeKey, decide };

