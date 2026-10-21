"""
radar/push_to_api.py - sends radar output to the AAGAM backend (POST /api/alerts).

Reads radar/output/live_normalized_alerts.json (written by run_live.py / live_alerts.py),
keeps only entries with an ACTIVE warning and a hazard the backend knows, and posts them
with the X-Radar-Key header. The backend decides publish vs pending (official .gov.in/.nic.in
sources auto-publish; everything else waits for an officer).

Usage:
  python radar/push_to_api.py [--file path.json] [--dry-run] [--demo]

  --demo  the saved snapshot in radar/output is old, so its alerts are already expired and the
          backend (correctly) holds them as "pending". --demo re-dates them to "valid for 24 h
          from now" and labels titles "(DEMO snapshot)" so the radar -> dashboard flow can be shown.
          Never use --demo with real data.
Env (or radar/.env):
  AAGAM_API_URL   default http://localhost:3000
  RADAR_API_KEY   must equal RADAR_API_KEY in the backend .env
"""
import argparse
import json
import os
import sys
import urllib.error
import urllib.request
from pathlib import Path

RADAR_DIR = Path(__file__).resolve().parent
DEFAULT_FILE = RADAR_DIR / "output" / "live_normalized_alerts.json"

try:
    from dotenv import load_dotenv
    load_dotenv(RADAR_DIR / ".env")
    load_dotenv(RADAR_DIR.parent / ".env")
except ImportError:
    pass

# radar hazard name -> backend hazard code
HAZARD_MAP = {
    "lightning": "lightning", "heavy_rain": "rain", "rain": "rain", "flood": "flood",
    "cyclone": "cyclone", "earthquake": "earthquake", "tsunami": "tsunami",
    "landslide": "landslide", "heatwave": "heatwave", "coldwave": "coldwave",
    "cold_wave": "coldwave", "forest_fire": "forest_fire",
}
SEVERITIES = {"low", "medium", "high", "extreme"}


def to_payload(a, demo=False):
    hazard = HAZARD_MAP.get(a.get("hazard") or "")
    severity = a.get("severity")
    if not a.get("hasActiveWarning") or not hazard or severity not in SEVERITIES:
        return None
    district = (a.get("district") or "").title()
    label = hazard.replace("_", " ").title()
    valid_until = a.get("validUntil")
    title = f"{label} {a.get('warningColor', '')} alert - {district}".replace("  ", " ")
    if demo:
        from datetime import datetime, timedelta, timezone
        valid_until = (datetime.now(timezone.utc) + timedelta(hours=24)).isoformat()
        title += " (DEMO snapshot)"
    return {
        "hazard": hazard,
        "severity": severity,
        "title": title,
        "message": next((t for t in (a.get("warningText") or {}).values() if t), "")
                   or f"IMD {a.get('warningColor', '')} warning for {district}.",
        "district": district,
        "state": a.get("state"),
        "sourceName": "IMD",
        "sourceUrl": a.get("sourceUrl") or "https://mausam.imd.gov.in/",
        "validUntil": valid_until,
        "fetchedAt": a.get("fetchedAt"),
        "sourcePublishedAt": a.get("issueDate"),
        "extractionStatus": "official_feed",
    }


def post(url, key, payload):
    req = urllib.request.Request(
        url + "/api/alerts", data=json.dumps(payload).encode(), method="POST",
        headers={"Content-Type": "application/json", "X-Radar-Key": key},
    )
    with urllib.request.urlopen(req, timeout=15) as r:
        return json.loads(r.read())


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--file", default=str(DEFAULT_FILE))
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--demo", action="store_true", help="re-date old snapshot alerts to valid-for-24h (demo only)")
    args = ap.parse_args()

    url = os.getenv("AAGAM_API_URL", "http://localhost:3000").rstrip("/")
    key = os.getenv("RADAR_API_KEY", "")
    alerts = json.loads(Path(args.file).read_text(encoding="utf-8"))
    payloads = [p for p in (to_payload(a, args.demo) for a in alerts) if p]
    print(f"{len(alerts)} radar records, {len(payloads)} active and mappable")

    if args.dry_run:
        print(json.dumps(payloads, indent=2))
        return 0
    if not key:
        print("RADAR_API_KEY not set", file=sys.stderr)
        return 1
    for p in payloads:
        try:
            r = post(url, key, p)
            print(f"  {p['hazard']:10} {p['district']:20} -> {r.get('action')} / {r.get('status')}")
        except urllib.error.HTTPError as e:
            print(f"  {p['hazard']} {p['district']} FAILED {e.code}: {e.read().decode()[:150]}", file=sys.stderr)
        except Exception as e:
            print(f"  {p['hazard']} {p['district']} FAILED: {e}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())
