
import requests
from datetime import datetime, timezone

IMD_WFS_URL = "https://reactjs.imd.gov.in/geoserver/imd/ows"


def fetch_imd_warnings(limit=None, district=None):
    """Fetch IMD district warnings across multiple pages.

    Args:
        limit: Maximum number of records to retrieve.
               None means retrieve all available records.
        district: Optional district name to filter by.
    """
    if limit is not None and limit <= 0:
        return []

    if district is not None and not district.strip():
        raise ValueError("District cannot be an empty string.")

    page_size = 100
    start_index = 0
    records = []

    while limit is None or len(records) < limit:
        count = (
            page_size
            if limit is None
            else min(page_size, limit - len(records))
        )

        params = {
            "service": "WFS",
            "version": "2.0.0",
            "request": "GetFeature",
            "typeNames": "imd:district_warnings_india",
            "count": count,
            "startIndex": start_index,
            "sortBy": "ID ASC",
            "outputFormat": "application/json",
            "propertyName": (
                "ID,District,state,Date,"
                "Day_1,Day_2,Day_3,Day_4,Day_5,"
                "Day1_Color,Day2_Color,Day3_Color,"
                "Day4_Color,Day5_Color,"
                "Day1_text,Day2_text,Day3_text,"
                "Day4_text,Day5_text,updated_at"
            ),
        }

        if district:
            safe_district = district.strip().upper().replace("'", "''")
            params["cql_filter"] = f"District = '{safe_district}'"

        try:
            response = requests.get(
                IMD_WFS_URL,
                params=params,
                timeout=30,
            )
            response.raise_for_status()
            data = response.json()

        except requests.RequestException as error:
            raise RuntimeError(
                f"IMD request failed at startIndex={start_index}"
            ) from error

        except ValueError as error:
            raise RuntimeError(
                "Could not read IMD response as JSON "
                f"at startIndex={start_index}"
            ) from error

        if not isinstance(data, dict):
            raise RuntimeError(
                "IMD returned an unexpected response format."
            )

        if "features" not in data:
            raise RuntimeError(
                "IMD response did not contain the expected 'features' field."
            )

        features = data["features"]

        if not isinstance(features, list):
            raise RuntimeError(
                "IMD response contains an invalid 'features' value."
            )

        if not features:
            break

        fetched_at = datetime.now(timezone.utc).isoformat()

        for feature in features:
            if not isinstance(feature, dict):
                raise RuntimeError(
                    "IMD response contains an invalid feature."
                )

            properties = feature.get("properties", {})

            if not isinstance(properties, dict):
                raise RuntimeError(
                    "IMD response contains invalid feature properties."
                )

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

        start_index += len(features)

        if len(features) < count:
            break

    return records[:limit] if limit is not None else records


if __name__ == "__main__":
    warnings = fetch_imd_warnings()

    print("Records retrieved:", len(warnings))

    for record in warnings:
        print(
            record["district"],
            "| State:", record["state"],
            "| Issue date:", record["issueDate"],
            "| Forecast:", record["forecast"],
        )

    gurgaon_warnings = fetch_imd_warnings(district="GURGAON")

    print("\nGurgaon district matches:", len(gurgaon_warnings))

    for record in gurgaon_warnings:
        print("\nDistrict:", record["district"])
        print("State:", record["state"])
        print("Issue date:", record["issueDate"])
        print("Forecast:", record["forecast"])
        print("Warning colors:", record["warningColors"])
        print("Warning text:", record["warningText"])
        print("Last updated:", record["updatedAt"])
