
import json
import sys
from pathlib import Path

# Configure stdout to handle UTF-8 symbols (such as bullet points) on Windows terminals
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

RADAR_DIR = Path(__file__).resolve().parent
results_file = RADAR_DIR / "output" / "alerts.json"

with open(results_file, "r", encoding="utf-8") as file:
    results = json.load(file)

for index, item in enumerate(results, start=1):
    print(f"\n--- RESULT {index} ---")
    print("Title:", item.get("title"))
    print("URL:", item.get("url"))
    print("Snippet:", item.get("snippet"))
