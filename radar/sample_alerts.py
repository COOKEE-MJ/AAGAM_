
import json
from pathlib import Path
from datetime import datetime, timezone

RADAR_DIR = Path(__file__).resolve().parent
OUTPUT_DIR = RADAR_DIR / "output"
OUTPUT_DIR.mkdir(exist_ok=True)

# SAMPLE DATA ONLY — not real or active disaster alerts
sample_records = [
    {
        "District": "Sample District A",
        "Date": "2026-10-17",
        "Day_1": "Heavy Rain",
        "Day1_Color": "Orange"
    },
    {
        "District": "Sample District B",
        "Date": "2026-10-17",
        "Day_1": "Thunderstorm",
        "Day1_Color": "Yellow"
    },
    {
        "District": "Sample District C",
        "Date": "2026-10-17",
        "Day_1": "No Warning",
        "Day1_Color": "Green"
    },
    {
        "District": "Sample District A",
        "Date": "2026-10-17",
        "Day_1": "Heavy Rain",
        "Day1_Color": "Orange"
    },
    {
        "District": "Sample District A",
        "Date": "2026-10-17",
        "Day_1": "Heavy Rain",
        "Day1_Color": "Orange"
    }, 
    {
        "District": "Sample District A",
        "Date": "2026-10-17",
        "Day_1": "Heavy Rain",
        "Day1_Color": "Orange"
    }


]

def normalize_alert(record):
    """Convert one sample source record to the team alert format."""

    hazard = record.get("Day_1")
    color = record.get("Day1_Color")
    district = record.get("District")
    issue_date = record.get("Date")

    # Do not create an alert from incomplete data.
    if not all([hazard, color, district, issue_date]):
        return None

    # Example mapping for testing only.
    severity_map = {
        "Red": "High",
        "Orange": "Moderate",
        "Yellow": "Low",
        "Green": "None"
    }

    severity = severity_map.get(color)

    if severity is None:
        severity = "Unknown"

    return {
        "hazard": hazard,
        "severity": severity,
        "district": district,
        "validUntil": None,
        "sourceUrl": "SAMPLE_DATA_NOT_A_LIVE_SOURCE",
        "fetchedAt": datetime.now(timezone.utc).isoformat(),
        "issueDate": issue_date,
        "isSample": True
    }

alerts = []

for record in sample_records:
    alert = normalize_alert(record)

    if alert is not None and alert["severity"] != "None":
        alerts.append(alert)

output_file = OUTPUT_DIR / "sample_normalized_alerts.json"

with open(output_file, "w", encoding="utf-8") as file:
    json.dump(alerts, file, indent=2, ensure_ascii=False)

print(f"Created {len(alerts)} sample alerts.")
print(f"Saved to: {output_file}")
print("WARNING: These are test records, not live alerts.")
