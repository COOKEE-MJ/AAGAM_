
import requests

url = "https://reactjs.imd.gov.in/geoserver/imd/ows"

params = {
    "service": "WFS",
    "version": "2.0.0",
    "request": "GetFeature",
    "typeNames": "imd:district_warnings_india",
    "outputFormat": "application/json",
    "count": 1000,
    "sortBy": "ID ASC",
}

try:
    response = requests.get(url, params=params, timeout=60)
    print("HTTP status:", response.status_code)
    response.raise_for_status()

    features = response.json().get("features", [])
    print("Records retrieved:", len(features))

    keywords = ["BANGALORE", "BENGALURU", "GURGAON", "GURUGRAM"]

    print("\nMatching district names:")
    matches = 0

    for feature in features:
        properties = feature.get("properties", {})
        district = str(properties.get("District", ""))

        if any(word in district.upper() for word in keywords):
            print(
                district,
                "| Date:", properties.get("Date"),
                "| Day 1:", properties.get("Day_1"),
                "| Color:", properties.get("Day1_Color"),
            )
            matches += 1

    if matches == 0:
        print("No matching district names in the retrieved records.")

except requests.RequestException as error:
    print("Request failed:", repr(error))
except ValueError as error:
    print("Could not parse JSON:", repr(error))
