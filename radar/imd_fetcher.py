
import requests
from datetime import datetime, timezone

IMD_WFS_URL = "https://reactjs.imd.gov.in/geoserver/imd/ows"


def fetch_imd_warnings(limit=100, district=None):
    """Fetch district warning records from the IMD GeoServer."""

    params = {
        "service": "WFS",
        "version": "2.0.0",
        "request": "GetFeature",
        "typeNames": "imd:district_warnings_india",
        "count": limit,
        "sortBy": "ID ASC",
        "outputFormat": "application/json",
        "propertyName": (
            "ID,District,state,Date,"
            "Day_1,Day_2,Day_3,Day_4,Day_5,"
            "Day1_Color,Day2_Color,Day3_Color,Day4_Color,Day5_Color,"
            "Day1_text,Day2_text,Day3_text,Day4_text,Day5_text,"
            "updated_at"
        ),
    }

    if district:
        params["cql_filter"] = f"District = '{district.upper()}'"
    try:
        response = requests.get(
            IMD_WFS_URL,
            params=params,
            timeout=30,
        )
        response.raise_for_status()
        data = response.json()

    except requests.RequestException as error:
        print("IMD request failed:", error)
        return []

    except ValueError as error:
        print("Could not read IMD response as JSON:", error)
        return []

    features = data.get("features", [])
    fetched_at = datetime.now(timezone.utc).isoformat()

    records = []

    for feature in features:
        properties = feature.get("properties", {})

        records.append({
            "district": properties.get("District"),
            "state": properties.get("state"),
            "issueDate": properties.get("Date"),
            "forecast": {
                "day1": properties.get("Day_1"),
                "day2": properties.get("Day_2"),
                "day3": properties.get("Day_3"),
                "day4": properties.get("Day_4"),
                "day5": properties.get("Day_5"),
            },
            "warningColors": {
                "day1": properties.get("Day1_Color"),
                "day2": properties.get("Day2_Color"),
                "day3": properties.get("Day3_Color"),
                "day4": properties.get("Day4_Color"),
                "day5": properties.get("Day5_Color"),
            },
            "warningText": {
                "day1": properties.get("Day1_text"),
                "day2": properties.get("Day2_text"),
                "day3": properties.get("Day3_text"),
                "day4": properties.get("Day4_text"),
                "day5": properties.get("Day5_text"),
            },
            "sourceUrl": IMD_WFS_URL,
            "updatedAt": properties.get("updated_at"),
            "fetchedAt": fetched_at,
            "isSample": False,
        })

    return records


if __name__ == "__main__":
    warnings = fetch_imd_warnings(
    limit=100,
    district="GURGAON"
)

    print("Records retrieved:", len(warnings))

    target_names = {"GURGAON", "GURUGRAM"}

    matches = [
        record for record in warnings
        if (record.get("district") or "").strip().upper()
        in target_names
    ]

    print("Gurgaon district matches:", len(matches))

    if matches:
        for record in matches:
            print("\nDistrict:", record["district"])
            print("State:", record["state"])
            print("Issue date:", record["issueDate"])
            print("Forecast:", record["forecast"])
            print("Warning colors:", record["warningColors"])
            print("Warning text:", record["warningText"])
            print("Last updated:", record["updatedAt"])
    else:
        print(
            "Gurgaon was not found in the first 100 records. "
            "This does not mean there are no warnings."
        )
