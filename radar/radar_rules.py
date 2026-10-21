"""
RADAR RULES - Python module for Member 3's scraping workers
=============================================================
Mirrors src/radar/rules.js, reading the exact SAME configuration: config/radar_rules.json.
Use it right after TinyFish Fetch has extracted clean bulletin text:

    from radar_rules import decide
    result = decide({
        "title": "Heavy rain warning",
        "district": "Puri",
        "sourceUrl": "https://mausam.imd.gov.in/...",
        "colour": "orange"
    })
    # result["status"] is "published" or "pending"

CORE RULE:
  Only addresses that start with https:// and end in .gov.in or .nic.in are published
  automatically. Everything else is "pending" until an officer approves it.
"""
import json
import os
from datetime import datetime, timezone
from urllib.parse import urlparse

_HERE = os.path.dirname(os.path.abspath(__file__))
with open(os.path.join(_HERE, "..", "config", "radar_rules.json"), encoding="utf-8") as f:
    RULES = json.load(f)

LEVELS = ["low", "medium", "high", "extreme"]


def host_of(url):
    """Extracts website hostname, or None if invalid."""
    try:
        return urlparse(url).hostname.lower()
    except Exception:
        return None


def is_official_url(url):
    """True only for https websites ending in .gov.in or .nic.in (verifies hostname suffix)."""
    try:
        u = urlparse(url)
        host = (u.hostname or "").lower()
    except Exception:
        return False
    if not host:
        return False
    if RULES["publish_rule"]["require_https"] and u.scheme != "https":
        return False
    return any(host.endswith(s) or host == s.lstrip(".") for s in RULES["publish_rule"]["official_host_suffixes"])


def detect_hazard(text):
    """Identifies the hazard category from text using multilingual keywords."""
    t = (text or "").lower()
    best, best_hits = None, 0
    for code, h in RULES["hazards"].items():
        if not h["radar_enabled"]:
            continue
        hits = sum(1 for k in h["keywords"] if k.lower() in t)
        if hits > best_hits:
            best, best_hits = code, hits
    return best


def detect_severity(colour=None, magnitude=None, text=""):
    """Derives severity: IMD colour first, then earthquake magnitude, then keyword matches."""
    if colour:
        m = RULES["severity"]["imd_colour"]
        c = str(colour).lower()
        if c in m:
            return m[c]  # green returns None on purpose
    if magnitude is not None:
        try:
            mag = float(magnitude)
            for lvl in LEVELS:
                lo, hi = RULES["severity"]["earthquake_magnitude_bands"][lvl]
                if lo <= mag <= hi:
                    return lvl
            return None if mag < 3 else "extreme"
        except (TypeError, ValueError):
            pass
    t = (text or "").lower()
    for lvl in ["extreme", "high", "medium", "low"]:
        if any(k in t for k in RULES["severity"]["keywords"][lvl]):
            return lvl
    return None


def make_dedupe_key(hazard, district, source_url, when=None):
    """Builds composite dedupe key: hazard | district | website | day."""
    when = when or datetime.now(timezone.utc)
    if isinstance(when, str):
        when = datetime.fromisoformat(when.replace("Z", "+00:00"))
    return "|".join([hazard, (district or "").strip().lower(), host_of(source_url) or "unknown", when.date().isoformat()])


def decide(found, now=None):
    """Evaluates the discovered bulletin and returns publication decision."""
    now = now or datetime.now(timezone.utc)
    text = f"{found.get('title', '')} {found.get('text', '')}"
    hazard = found.get("hazard") or detect_hazard(text)
    severity = found.get("severity") or detect_severity(found.get("colour"), found.get("magnitude"), text)
    official = is_official_url(found.get("sourceUrl"))

    reasons = []
    if not official:
        reasons.append("Source is not an https .gov.in / .nic.in website - an officer must approve" if host_of(found.get("sourceUrl")) else "Source address is missing or broken")
    if not hazard or hazard not in RULES["hazards"]:
        reasons.append("Hazard type not recognised")
    if not severity:
        reasons.append("Could not work out how serious it is")
    if not found.get("district"):
        reasons.append("No district given")
    vu = found.get("validUntil")
    if vu and datetime.fromisoformat(vu.replace("Z", "+00:00")) <= now:
        reasons.append("Alert has already expired")

    publish = len(reasons) == 0
    return {
        "status": "published" if publish else "pending",
        "hazard": hazard,
        "severity": severity,
        "isOfficialSource": official,
        "reviewReason": "; ".join(reasons) or None,
        "dedupeKey": make_dedupe_key(hazard, found.get("district"), found.get("sourceUrl"), found.get("publishedAt") or now) if hazard else None,
        "officialAgency": RULES["hazards"][hazard]["official_agency"] if hazard in RULES["hazards"] else None,
    }

