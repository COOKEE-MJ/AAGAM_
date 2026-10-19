
import requests
import json
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

try:
    print("Fetching IMD district-warning data...")

    response = requests.get(
        URL,
        params=PARAMS,
        timeout=(10, 60),
    )

    print("Fetch time (UTC):", datetime.now(timezone.utc).isoformat())
    print("HTTP status:", response.status_code)
    print("Content type:", response.headers.get("Content-Type"))
    print("Response size:", len(response.content), "bytes")

    response.raise_for_status()
    data = response.json()

    features = data.get("features", [])
    print("Number of features:", len(features))

    if features:
        first = features[0]
        print("\nFirst feature properties:")
        print(json.dumps(first.get("properties", {}), indent=2)[:4000])

        print("\nTop-level JSON keys:", list(data.keys()))
    else:
        print("\nNo features found. Response preview:")
        print(json.dumps(data, indent=2)[:2000])

except requests.RequestException as error:
    print("Request failed:", error)

except ValueError:
    print("Response was not valid JSON.")
    print(response.text[:2000])
