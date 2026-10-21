
import requests
import json

url = "https://reactjs.imd.gov.in/geoserver/imd/ows"

params = {
    "service": "WFS",
    "version": "2.0.0",
    "request": "GetFeature",
    "typeNames": "imd:district_warnings_india",
    "count": 5,
    "sortBy": "ID A",
    "outputFormat": "application/json",
    "propertyName": (
        "ID,District,state,Date,Day_1,Day_2,Day_3,Day_4,Day_5,"
        "Day1_Color,Day2_Color,Day3_Color,Day4_Color,Day5_Color,"
        "Day1_text,Day2_text,Day3_text,Day4_text,Day5_text,updated_at"
    ),
}

try:
    response = requests.get(url, params=params, timeout=30)
    print("HTTP status:", response.status_code)

    if not response.ok:
        print("Server response:")
        print(response.text[:3000])
    else:
        data = response.json()
        features = data.get("features", [])
        print("Features retrieved:", len(features))

        for feature in features:
            print("\n" + "=" * 40)
            print(json.dumps(
                feature.get("properties", {}),
                indent=2,
                ensure_ascii=False,
            ))

except requests.RequestException as error:
    print("Request failed:", repr(error))
except ValueError as error:
    print("Could not parse JSON:", repr(error))
