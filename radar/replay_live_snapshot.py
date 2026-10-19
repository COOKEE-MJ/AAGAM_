
import json
from pathlib import Path

RADAR_DIR = Path(__file__).resolve().parent
SNAPSHOT_DIR = RADAR_DIR / "live_snapshots"


def main():
    snapshots = sorted(SNAPSHOT_DIR.glob("live_alerts_*.json"))

    if not snapshots:
        print("No live snapshots found.")
        return

    latest_snapshot = snapshots[-1]

    with open(latest_snapshot, "r", encoding="utf-8") as file:
        alerts = json.load(file)

    if not isinstance(alerts, list):
        print("Invalid snapshot: expected a JSON list.")
        return

    if any(
        not isinstance(alert, dict) or alert.get("isSample") is not False
        for alert in alerts
    ):
        print("Safety check failed: snapshot contains invalid or sample records.")
        return

    print("Live snapshot replay successful!")
    print("Loaded from:", latest_snapshot.name)
    print("Records:", len(alerts))

    for alert in alerts[:5]:
        print(
            f"\nDistrict: {alert.get('district')}"
            f"\nIssue date: {alert.get('issueDate')}"
            f"\nSeverity: {alert.get('severity')}"
        )

    print("\nThese are saved IMD records, not necessarily current warnings.")


if __name__ == "__main__":
    main()
