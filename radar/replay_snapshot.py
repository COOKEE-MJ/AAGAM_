
import json
from pathlib import Path

RADAR_DIR = Path(__file__).resolve().parent
SNAPSHOT_DIR = RADAR_DIR / "snapshots"

# Find all saved snapshot files
snapshot_files = sorted(SNAPSHOT_DIR.glob("alerts_*.json"))

if not snapshot_files:
    print("No snapshots found. Run radar/run.py first.")
else:
    # Select the most recently named snapshot
    latest_snapshot = snapshot_files[-1]

    # Load the saved alerts without using the internet
    with open(latest_snapshot, "r", encoding="utf-8") as file:
        alerts = json.load(file)

    print("Snapshot replay successful!")
    print("Loaded from:", latest_snapshot.name)
    print("Number of alerts:", len(alerts))

    for number, alert in enumerate(alerts, start=1):
        print(f"\nAlert {number}")
        print("Hazard:", alert.get("hazard"))
        print("Severity:", alert.get("severity"))
        print("District:", alert.get("district"))
        print("Issue date:", alert.get("issueDate"))

    print("\nThese are saved sample alerts, not live warnings.")

