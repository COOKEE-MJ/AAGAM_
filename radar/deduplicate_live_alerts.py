
import json
from pathlib import Path

RADAR_DIR = Path(__file__).resolve().parent
INPUT_FILE = RADAR_DIR / "output" / "live_normalized_alerts.json"
OUTPUT_FILE = RADAR_DIR / "output" / "live_deduplicated_alerts.json"


def alert_key(alert):
    return (
        (alert.get("district") or "").strip().casefold(),
        (alert.get("issueDate") or "").strip(),
    )


def main():
    if not INPUT_FILE.exists():
        print("Live input file not found:", INPUT_FILE)
        return

    with open(INPUT_FILE, "r", encoding="utf-8") as file:
        alerts = json.load(file)

    if not isinstance(alerts, list):
        print("Invalid input: expected a JSON list.")
        return

    unique_alerts = []
    seen = set()
    duplicates_removed = 0

    for alert in alerts:
        if not isinstance(alert, dict):
            continue

        # This pipeline accepts live records only.
        if alert.get("isSample") is not False:
            continue

        key = alert_key(alert)

        if not all(key):
            continue

        if key in seen:
            duplicates_removed += 1
            continue

        seen.add(key)
        unique_alerts.append(alert)

    with open(OUTPUT_FILE, "w", encoding="utf-8") as file:
        json.dump(unique_alerts, file, indent=2, ensure_ascii=False)

    print("Live records before deduplication:", len(alerts))
    print("Duplicates removed:", duplicates_removed)
    print("Unique live district records:", len(unique_alerts))
    print("Saved to:", OUTPUT_FILE)


if __name__ == "__main__":
    main()
