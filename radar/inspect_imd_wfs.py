
import requests

url = "https://reactjs.imd.gov.in/geoserver/imd/ows"

params = {
    "service": "WFS",
    "version": "2.0.0",
    "request": "GetFeature",
    "typeNames": "imd:district_warnings_india",
    "count": 5,
    "outputFormat": "application/json",
    "sortBy": "ID ASC",
    "cql_filter": "District = 'GURGAON'",
}

try:
    response = requests.get(url, params=params, timeout=30)

    print("Status code:", response.status_code)
    response.raise_for_status()

    data = response.json()
    features = data.get("features", [])

    print("Records:", len(features))

    for feature in features:
        props = feature.get("properties", {})

        record = {
            "district": props.get("District"),
            "geometry": feature.get("geometry"),
        }

        print("District:", record["district"])
        print("Geometry type:", (
            record["geometry"].get("type")
            if record["geometry"]
            else None
        ))

except requests.RequestException as error:
    print("Request failed:", error)
except ValueError as error:
    print("Could not parse JSON:", error)
