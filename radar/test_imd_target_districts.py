
import requests
import json

url = "https://reactjs.imd.gov.in/geoserver/imd/ows"

params = {
    "service": "WFS",
    "version": "2.0.0",
    "request": "GetFeature",
    "typeNames": "imd:district_warnings_india",
    "outputFormat": "application/json",
    "sortBy": "ID A",
    "CQL_FILTER": (
        "District ILIKE '%GURUGRAM%' OR "
        "District ILIKE '%DELHI%' OR "
        "District ILIKE '%BENGALURU%'"
    ),
}

try:
    response = requests.get(url, params=params, timeout=30)
    print("HTTP status:", response.status_code)
    response.raise_for_status()

    data = response.json()
    features = data.get("features", [])
    print("Matching records:", len(features))

    for feature in features:
        print("\n" + "=" * 45)
        print(json.dumps(
            feature.get("properties", {}),
            indent=2,
            ensure_ascii=False,
        ))

except requests.RequestException as error:
    print("Request failed:", repr(error))
except ValueError as error:
    print("Could not parse JSON:", repr(error))

