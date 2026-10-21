
import requests
import json

url = "https://reactjs.imd.gov.in/geoserver/imd/ows"

districts = ["GURUGRAM", "GURGAON", "BENGALURU", "BANGALORE"]

for district in districts:
    params = {
        "service": "WFS",
        "version": "2.0.0",
        "request": "GetFeature",
        "typeNames": "imd:district_warnings_india",
        "outputFormat": "application/json",
        "sortBy": "ID ASC",
        "cql_filter": f"District ILIKE '%{district}%'",
    }

    try:
        response = requests.get(url, params=params, timeout=30)
        print(f"\n--- Searching for {district} ---")
        print("HTTP status:", response.status_code)

        if not response.ok:
            print("Server error details:")
            print(response.text[:3000])
            continue

        features = response.json().get("features", [])
        print("Matches:", len(features))

        for feature in features:
            properties = feature.get("properties", {})
            print(json.dumps({
                "District": properties.get("District"),
                "Date": properties.get("Date"),
                "Day_1": properties.get("Day_1"),
                "Day1_Color": properties.get("Day1_Color"),
                "Day1_text": properties.get("Day1_text"),
                "updated_at": properties.get("updated_at"),
            }, indent=2, ensure_ascii=False))

    except requests.RequestException as error:
        print("Request failed:", repr(error))
