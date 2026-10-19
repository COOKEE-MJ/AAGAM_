
import json
from pathlib import Path

from imd_fetcher import fetch_imd_warnings

RADAR_DIR = Path(__file__).resolve().parent
OUTPUT_DIR = RADAR_DIR / "output"
OUTPUT_DIR.mkdir(exist_ok=True)

OUTPUT_FILE = OUTPUT_DIR / "live_normalized_alerts.json"


def normalize_live_alert(record):
    """Convert an IMD record without inventing missing information."""

    district = record.get("district")
    issue_date = record.get("issueDate")

    if not district or not issue_date:
        return None

    # Preserve raw IMD codes until their meanings are verified.
    forecast = record.get("forecast", {})
    colors = record.get("warningColors", {})
    warning_text = record.get("warningText", {})

    return {
        "hazard": None,
        "severity": "Unclassified",
        "district": district,
        "state": record.get("state") or None,
        "issueDate": issue_date,
        "forecast": forecast,
        "warningColors": colors,
        "warningText": warning_text,
        "validUntil": None,
        "sourceUrl": record.get("sourceUrl"),
        "updatedAt": record.get("updatedAt"),
        "fetchedAt": record.get("fetchedAt"),
        "isSample": False,
    }


def main():
    records = fetch_imd_warnings(limit=100)

    if not records:
        print("No live records retrieved; output file was not replaced.")
        return

    alerts = [
        alert
        for record in records
        if (alert := normalize_live_alert(record)) is not None
    ]

    with open(OUTPUT_FILE, "w", encoding="utf-8") as file:
        json.dump(alerts, file, indent=2, ensure_ascii=False)

    print("Live records retrieved:", len(records))
    print("Records normalized:", len(alerts))
    print("Saved to:", OUTPUT_FILE)
    print("Warning: severity remains unclassified until codes are verified.")


if __name__ == "__main__":
    main()
