
import json
from datetime import datetime, timezone
from pathlib import Path

RADAR_DIR = Path(__file__).resolve().parent
INPUT_FILE = RADAR_DIR / "output" / "live_deduplicated_alerts.json"
SNAPSHOT_DIR = RADAR_DIR / "live_snapshots"


def main():
    if not INPUT_FILE.exists():
        print("Live input file not found:", INPUT_FILE)
        print("Run radar/live_alerts.py and radar/deduplicate_live_alerts.py first.")
        return

    with open(INPUT_FILE, "r", encoding="utf-8") as file:
        alerts = json.load(file)

    if not isinstance(alerts, list):
        print("Invalid input: expected a JSON list.")
        return

    # Never save sample records in the live snapshot.
    if any(
        not isinstance(alert, dict) or alert.get("isSample") is not False
        for alert in alerts
    ):
        print("Safety check failed: input contains invalid or sample records.")
        return

    SNAPSHOT_DIR.mkdir(parents=True, exist_ok=True)

    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    snapshot_file = SNAPSHOT_DIR / f"live_alerts_{timestamp}.json"

    with open(snapshot_file, "w", encoding="utf-8") as file:
        json.dump(alerts, file, indent=2, ensure_ascii=False)

    print("Live snapshot created successfully!")
    print("Live records saved:", len(alerts))
    print("Snapshot location:", snapshot_file)
    print("Source: IMD GeoServer; records are not sample alerts.")


if __name__ == "__main__":
    main()
