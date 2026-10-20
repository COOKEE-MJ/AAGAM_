import json
import os
import sys
from datetime import datetime, timezone, timedelta
from pathlib import Path

RADAR_DIR = Path(__file__).resolve().parent
if str(RADAR_DIR) not in sys.path:
    sys.path.insert(0, str(RADAR_DIR))

from imd_fetcher import fetch_imd_warnings
try:
    from radar_rules import detect_hazard
except ImportError:
    detect_hazard = lambda text: None

OUTPUT_DIR = RADAR_DIR / "output"
OUTPUT_DIR.mkdir(exist_ok=True)
OUTPUT_FILE = OUTPUT_DIR / "live_normalized_alerts.json"

# =====================================================================
# OFFICIAL IMD WARNING COLOUR AND SEVERITY SPECIFICATION
# =====================================================================
# IMD uses 4 colour bands for meteorological disaster warnings:
# Code 1: Red    -> "Warning (Take Action)"     -> Severity: "high" (or "extreme")
# Code 2: Orange -> "Alert (Be Prepared)"        -> Severity: "medium"
# Code 3: Yellow -> "Watch (Be Updated)"         -> Severity: "low"
# Code 4: Green  -> "No Warning (No Action)"     -> Severity: "none"
# =====================================================================
IMD_COLOR_CODE_MAP = {
    1: {"color": "Red",    "label": "Warning (Take Action)", "severity": "high"},
    2: {"color": "Orange", "label": "Alert (Be Prepared)",   "severity": "medium"},
    3: {"color": "Yellow", "label": "Watch (Be Updated)",    "severity": "low"},
    4: {"color": "Green",  "label": "No Warning (No Action)","severity": "none"},
}

# IMD Phenomenon Codes observed in GeoServer Day_1 forecasts
IMD_PHENOMENON_MAP = {
    "1":  "clear_weather",
    "4":  "lightning",
    "8":  "squall",
    "16": "heavy_rain",
    "32": "hailstorm",
    "64": "dust_storm",
}


def calculate_validity_and_freshness(issue_date_str, updated_at_str=None):
    """
    Computes validUntil (issueDate + 24h) and data freshness (Current, May be outdated, Expired)
    as required by the AAGAM Core Feature 2 specification.
    """
    now = datetime.now(timezone.utc)
    try:
        # issue_date is formatted as YYYY-MM-DD
        dt = datetime.strptime(issue_date_str.strip(), "%Y-%m-%d").replace(tzinfo=timezone.utc)
        # IMD daily forecast cycles are valid until 08:30 IST next day (~24-30 hours)
        valid_until = dt + timedelta(days=1, hours=8, minutes=30)
        valid_until_iso = valid_until.isoformat()

        ref_time = dt
        if updated_at_str:
            try:
                ref_time = datetime.fromisoformat(updated_at_str.replace("Z", "+00:00"))
            except Exception:
                pass

        age_hours = (now - ref_time).total_seconds() / 3600.0

        if now > valid_until:
            freshness = "Expired"
            is_stale = True
        elif age_hours > 18:
            freshness = "May be outdated"
            is_stale = False
        else:
            freshness = "Current"
            is_stale = False

        return valid_until_iso, freshness, is_stale
    except Exception:
        return None, "Unverified", False


def extract_hazard(text, day_forecast_code):
    """
    Detects hazard using multilingual keywords from radar_rules first,
    then falls back to IMD numerical phenomenon codes.
    """
    if text:
        detected = detect_hazard(text)
        if detected:
            return detected

    if day_forecast_code:
        codes = [c.strip() for c in str(day_forecast_code).split(",")]
        if "16" in codes:
            return "heavy_rain"
        if "32" in codes:
            return "hailstorm"
        if "64" in codes:
            return "dust_storm"
        if "4" in codes:
            return "lightning"
        if "8" in codes:
            return "cyclone"

    return None


def normalize_live_alert(record):
    """Convert an IMD record into an AAGAM structured alert with verified severity and validity."""
    district = record.get("district")
    issue_date = record.get("issueDate")

    # Safety check: skip records with missing essential identifiers
    if not district or not issue_date:
        return None

    forecast = record.get("forecast", {})
    colors = record.get("warningColors", {})
    warning_text = record.get("warningText", {})

    # Map numerical colors to human labels across Day 1 to Day 5
    warning_color_labels = {}
    for day, code in colors.items():
        if code in IMD_COLOR_CODE_MAP:
            warning_color_labels[day] = IMD_COLOR_CODE_MAP[code]["label"]
        elif code is not None:
            warning_color_labels[day] = f"Code {code}"
        else:
            warning_color_labels[day] = "Missing"

    # Derive primary Day 1 severity from IMD warning color
    day1_color_code = colors.get("day1")
    if day1_color_code in IMD_COLOR_CODE_MAP:
        mapping = IMD_COLOR_CODE_MAP[day1_color_code]
        severity = mapping["severity"]
        color_name = mapping["color"]
    else:
        severity = "unclassified"
        color_name = "Unknown"

    # Hazard detection
    day1_text = warning_text.get("day1", "")
    day1_forecast = forecast.get("day1", "")
    hazard = extract_hazard(day1_text, day1_forecast)

    # Validity and freshness calculation
    valid_until, freshness, is_stale = calculate_validity_and_freshness(
        issue_date, record.get("updatedAt")
    )

    # Active warning flag (Codes 1, 2, 3 have active warnings; Code 4 is Green/No warning)
    has_active_warning = severity in ("high", "medium", "low")

    return {
        "hazard": hazard,
        "severity": severity,
        "warningColor": color_name,
        "district": district.strip(),
        "state": record.get("state") or None,
        "issueDate": issue_date,
        "validUntil": valid_until,
        "freshness": freshness,
        "isStale": is_stale,
        "hasActiveWarning": has_active_warning,
        "forecast": forecast,
        "warningColors": colors,
        "warningColorLabels": warning_color_labels,
        "warningText": warning_text,
        "sourceUrl": record.get("sourceUrl"),
        "updatedAt": record.get("updatedAt"),
        "fetchedAt": record.get("fetchedAt"),
        "isSample": False,
    }


def main():
    try:
        # Fetch up to 100 live records from IMD GeoServer for testing / ingest
        print("Connecting to live IMD GeoServer WFS endpoint...")
        records = fetch_imd_warnings(limit=100)
    except Exception as error:
        print("Could not retrieve IMD records:", error)
        return

    if not records:
        print("No live records retrieved; output file was not replaced.")
        return

    alerts = [
        alert
        for record in records
        if (alert := normalize_live_alert(record)) is not None
    ]

    active_warnings = [a for a in alerts if a["hasActiveWarning"]]

    temp_file = OUTPUT_FILE.with_suffix(".tmp")
    try:
        with open(temp_file, "w", encoding="utf-8") as file:
            json.dump(alerts, file, indent=2, ensure_ascii=False)
            file.write("\n")
        temp_file.replace(OUTPUT_FILE)
    except OSError as error:
        print("Could not safely save alerts:", error)
        return

    print("\n" + "=" * 60)
    print("LIVE IMD WARNING INGESTION & SEVERITY MAPPING SUCCESS")
    print("=" * 60)
    print(f"Total IMD records retrieved: {len(records)}")
    print(f"Records successfully normalized: {len(alerts)}")
    print(f"Active disaster warnings (Red/Orange/Yellow): {len(active_warnings)}")
    print(f"Normal / Green (No Warning) records: {len(alerts) - len(active_warnings)}")
    print(f"Saved to: {OUTPUT_FILE}")
    print("=" * 60)

    if active_warnings:
        print("\nSAMPLE ACTIVE DISASTER ALERT (FIRST MATCH):")
        sample = active_warnings[0]
        print(f"  District: {sample['district']} ({sample['state']})")
        print(f"  Hazard: {sample['hazard']}")
        print(f"  Severity: {sample['severity'].upper()} (IMD {sample['warningColor']})")
        print(f"  Freshness: {sample['freshness']} (Valid Until: {sample['validUntil']})")
        print(f"  Day 1 Warning: {sample['warningColorLabels'].get('day1')}")


if __name__ == "__main__":
    main()
