
import requests
import json
from datetime import datetime, timezone

url = "https://api.imd.gov.in/api/v1/districtwarning"

try:
    response = requests.get(url, timeout=(10, 60))

    print("Fetch time (UTC):", datetime.now(timezone.utc).isoformat())
    print("HTTP status:", response.status_code)
    print("Content type:", response.headers.get("Content-Type"))
    print("Response preview:")
    print(response.text[:2000])

    if response.ok:
        try:
            data = response.json()
            print("\nParsed JSON successfully.")
            print(json.dumps(data, indent=2)[:3000])
        except ValueError:
            print("\nResponse was not valid JSON.")

except requests.RequestException as error:
    print("Request failed:", error)
