
import requests
from collections import Counter
from datetime import datetime, timezone

URL = "https://reactjs.imd.gov.in/geoserver/ows"

PARAMS = {
    "service": "WFS",
    "version": "1.1.0",
    "request": "GetFeature",
    "typename": "imd:district_warnings_india",
    "srsname": "EPSG:4326",
    "outputFormat": "application/json",
}

response = requests.get(URL, params=PARAMS, timeout=(10, 60))
response.raise_for_status()
data = response.json()

features = data.get("features", [])
records = [f.get("properties", {}) for f in features]

print("Fetched at UTC:", datetime.now(timezone.utc).isoformat())
print("Server timestamp:", data.get("timeStamp"))
print("Total features:", len(records))
print("Unique district names:", len({
    r.get("District") for r in records if r.get("District")
}))

print("\nRecord dates:")
print(Counter(str(r.get("Date")) for r in records).most_common())

print("\nRecord update timestamps:")
print(Counter(str(r.get("updated_at")) for r in records).most_common(10))

for day in range(1, 6):
    warning_key = f"Day_{day}"
    color_key = f"Day{day}_Color"

    print(f"\nDay {day} warning codes:")
    print(Counter(str(r.get(warning_key)) for r in records))

    print(f"Day {day} colour codes:")
    print(Counter(str(r.get(color_key)) for r in records))

print("\nSample non-green records:")
shown = 0

for r in records:
    colors = [r.get(f"Day{day}_Color") for day in range(1, 6)]

    # Print records with colour codes other than 4.
    if any(color not in (None, 4, "4") for color in colors):
        print({
            "district": r.get("District"),
            "date": r.get("Date"),
            "warnings": [r.get(f"Day_{day}") for day in range(1, 6)],
            "colors": colors,
            "texts": [r.get(f"Day{day}_text") for day in range(1, 6)],
            "updated_at": r.get("updated_at"),
        })
        shown += 1

        if shown >= 10:
            break

if shown == 0:
    print("No records with colour codes other than 4 found.")
