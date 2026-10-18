// =====================================================================
// STOPGAP OFFICIAL-SOURCE FETCHER (Stand-in until TinyFish worker connects)
// ---------------------------------------------------------------------
// 1. Reads RSS/Atom feed from official portals or a local sample XML file.
// 2. Stores a raw snapshot in radar_snapshots for full traceability.
// 3. Extracts bulletin items (title, text, date, link, district).
// 4. Applies AAGAM radar rules (decide: auto-publish vs pending review).
// 5. Ingests alerts via POST /api/alerts using the X-Radar-Key header.
//
// Usage:
//   node scripts/fetch-official.js test-data/sample-cap-feed.xml
//   node scripts/fetch-official.js
// =====================================================================
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { pool } = require('../src/db');
const rules = require('../src/radar/rules');

const API = process.env.API_BASE || `http://localhost:${process.env.PORT || 3000}`;

const unwrap = (s) =>
  String(s || '')
    .replace(/<!\[CDATA\[|\]\]>/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();

const tag = (block, name) => {
  const m = block.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, 'i'));
  return m ? unwrap(m[1]) : '';
};

function parseFeed(xml) {
  const blocks = xml.match(/<(item|entry)[\s>][\s\S]*?<\/(item|entry)>/gi) || [];
  return blocks.map((b) => ({
    title: tag(b, 'title'),
    text: tag(b, 'description') || tag(b, 'summary'),
    publishedAt: tag(b, 'pubDate') || tag(b, 'updated') || tag(b, 'published'),
    link: tag(b, 'link') || (b.match(/<link[^>]*href="([^"]+)"/i) || [])[1] || '',
    district: tag(b, 'category'),
  }));
}

async function load(src) {
  if (!/^https?:/.test(src)) return fs.readFileSync(src, 'utf8');
  const res = await fetch(src, { headers: { 'User-Agent': 'AAGAM-Disaster-Radar/1.0' } });
  if (!res.ok) throw new Error(`${src} responded with status ${res.status}`);
  return res.text();
}

(async () => {
  const arg = process.argv[2];
  const sources = arg
    ? [{ name: 'Local test feed', url: arg }]
    : JSON.parse(fs.readFileSync(path.join(__dirname, '../config/official_sources.json'), 'utf8'))
        .sources.filter((s) => s.feed_url)
        .map((s) => ({ name: s.name, url: s.feed_url }));

  if (!sources.length) {
    console.log('No active feed addresses populated in config/official_sources.json.');
    console.log('To test locally, run: node scripts/fetch-official.js test-data/sample-cap-feed.xml');
  }

  for (const s of sources) {
    try {
      const text = await load(s.url);
      await pool.query('INSERT INTO radar_snapshots (source_url, raw_text) VALUES ($1, $2)', [
        s.url,
        text.slice(0, 200000),
      ]);
      const items = parseFeed(text);
      console.log(`[${s.name}] Saved snapshot, extracted ${items.length} alert item(s).`);

      for (const it of items) {
        const sourceUrl = it.link || s.url;
        const d = rules.decide({
          title: it.title,
          text: it.text,
          district: it.district,
          sourceUrl,
          publishedAt: it.publishedAt && new Date(it.publishedAt).toISOString(),
        });

        const body = {
          hazard: d.hazard,
          severity: d.severity,
          title: it.title,
          message: it.text,
          district: it.district || '',
          sourceName: s.name,
          sourceUrl,
          sourcePublishedAt: it.publishedAt ? new Date(it.publishedAt).toISOString() : undefined,
          dedupeKey: d.dedupeKey,
          extractionStatus: 'parsed_by_ai',
        };

        if (!d.hazard || !d.severity) {
          console.log(`  Skipped (undetermined hazard/severity): ${it.title}`);
          continue;
        }

        const r = await fetch(`${API}/api/alerts`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Radar-Key': process.env.RADAR_API_KEY || 'change-me-radar-key',
          },
          body: JSON.stringify(body),
        });

        const resJson = await r.json().catch(() => ({}));
        console.log(`  HTTP ${r.status} -> ${d.status}${d.reviewReason ? ' (' + d.reviewReason + ')' : ''}: ${it.title}`);
      }
    } catch (e) {
      console.log(`[${s.name}] Fetch failed: ${e.message}`);
    }
  }

  await pool.end();
})();

