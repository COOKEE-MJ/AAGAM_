
import json
from pathlib import Path
from datetime import datetime, timezone

RADAR_DIR = Path(__file__).resolve().parent

INPUT_FILE = RADAR_DIR / "output" / "deduplicated_alerts.json"
SNAPSHOT_DIR = RADAR_DIR / "snapshots"

SNAPSHOT_DIR.mkdir(exist_ok=True)

# Load the latest deduplicated alerts
with open(INPUT_FILE, "r", encoding="utf-8") as file:
    alerts = json.load(file)

# Create a unique timestamp for this snapshot
timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")

snapshot_file = SNAPSHOT_DIR / f"alerts_{timestamp}.json"

# Save a copy of the alerts
with open(snapshot_file, "w", encoding="utf-8") as file:
    json.dump(alerts, file, indent=2, ensure_ascii=False)

print("Snapshot created successfully!")
print("Alerts saved:", len(alerts))
print("Snapshot location:", snapshot_file)
print("Reminder: these are sample alerts, not live warnings.")
