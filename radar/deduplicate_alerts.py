
import json
from pathlib import Path

RADAR_DIR = Path(__file__).resolve().parent

INPUT_FILE = RADAR_DIR / "output" / "sample_normalized_alerts.json"
OUTPUT_FILE = RADAR_DIR / "output" / "deduplicated_alerts.json"

with open(INPUT_FILE, "r", encoding="utf-8") as file:
    alerts = json.load(file)


def alert_key(alert):
    return (
        alert.get("hazard", "").strip().lower(),
        alert.get("district", "").strip().lower(),
        alert.get("issueDate", "").strip()
    )


unique_alerts = []
seen = set()
duplicates_removed = 0

for alert in alerts:
    key = alert_key(alert)

    if key in seen:
        duplicates_removed += 1
        continue

    seen.add(key)
    unique_alerts.append(alert)

with open(OUTPUT_FILE, "w", encoding="utf-8") as file:
    json.dump(unique_alerts, file, indent=2, ensure_ascii=False)

print("Alerts before deduplication:", len(alerts))
print("Duplicates removed:", duplicates_removed)
print("Unique alerts:", len(unique_alerts))
print("Saved to:", OUTPUT_FILE)
print("These are sample alerts, not live warnings.")
