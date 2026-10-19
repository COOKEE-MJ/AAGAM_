
import requests
from datetime import datetime, timezone, date
from collections import Counter

PROJECT_NAME = "AAGAM"

IMD_WFS_URL = "https://reactjs.imd.gov.in/geoserver/ows"

IMD_PARAMS = {
    "service": "WFS",
    "version": "1.1.0",
    "request": "GetFeature",
    "typename": "imd:district_warnings_india",
    "srsname": "EPSG:4326",
    "outputFormat": "application/json",
}

# Do not interpret colour codes as verified warning labels yet.
# Verify the official mapping before using it for alert decisions.


def parse_warning_codes(value):
    """Parse values such as '2,4,8' without losing individual codes."""
    if value is None or not str(value).strip():
        return []

    codes = []

    for part in str(value).split(","):
        part = part.strip()

        if part.isdigit():
            codes.append(int(part))

    return codes


def parse_date(value):
    """Parse an ISO date safely."""
    if not value:
        return None

    try:
        return date.fromisoformat(str(value)[:10])
    except (TypeError, ValueError):
        return None


def parse_timestamp(value):
    """Parse an ISO timestamp, including timestamps ending in Z."""
    if not value:
        return None

    try:
        normalized = str(value).replace("Z", "+00:00")
        parsed = datetime.fromisoformat(normalized)

        if parsed.tzinfo is None:
            return None

        return parsed.astimezone(timezone.utc)

    except (TypeError, ValueError):
        return None


def fetch_imd_warnings():
    """Fetch IMD district warnings and flag potential data-quality issues."""


    request_started_at = datetime.now(timezone.utc)

    response = requests.get(
        IMD_WFS_URL,
        params=IMD_PARAMS,
        timeout=(10, 60),
    )
    response.raise_for_status()

    data = response.json()

    # Record the time after the response has arrived.
    fetched_at = datetime.now(timezone.utc)

    if not isinstance(data, dict) or not isinstance(
        data.get("features"), list
    ):
        raise ValueError("Unexpected IMD response format.")

    features = data["features"]
    records = []
    districts = []

    for feature in features:
        properties = feature.get("properties") or {}
        district = str(properties.get("District") or "").strip()

        # Keep records with missing district names for auditing.
        flags = []

        if not district:
            flags.append("missing_district_name")

        record_date = properties.get("Date") or None
        source_updated_at = properties.get("updated_at") or None

        parsed_date = parse_date(record_date)
        parsed_update = parse_timestamp(source_updated_at)

        if not record_date:
            flags.append("missing_record_date")
        elif parsed_date is None:
            flags.append("invalid_record_date")
        elif (fetched_at.date() - parsed_date).days > 1:
            flags.append("record_date_older_than_1_day")
        elif (parsed_date - fetched_at.date()).days > 0:
            flags.append("record_date_in_future")

        if not source_updated_at:
            flags.append("missing_source_update_time")
        elif parsed_update is None:
            flags.append("invalid_source_update_time")
        elif parsed_update > fetched_at:
            flags.append("source_update_time_in_future")

        days = []

        for day in range(1, 6):
            raw_color = properties.get(f"Day{day}_Color")

            try:
                color_code = int(raw_color)
            except (TypeError, ValueError):
                color_code = None

            raw_codes = properties.get(f"Day_{day}")

            days.append({
                "day": day,
                "warning_codes": parse_warning_codes(raw_codes),
                "color_code": color_code,
                "color_label": "Unverified",
                "warning_text": properties.get(f"Day{day}_text"),
            })

        if district:
            districts.append(district.casefold())

        records.append({
            "district": district or None,
            "record_date": record_date,
            "source_updated_at": source_updated_at,
            "days": days,
            "source": "IMD GeoServer",
            "source_url": response.url,
            "fetched_at": fetched_at.isoformat(),
            "data_quality_flags": flags,
            "raw_properties": properties,
        })

    # Flag every record belonging to a district appearing more than once.
    district_counts = Counter(districts)

    for record in records:
        district = record["district"]

        if district and district_counts[district.casefold()] > 1:
            record["data_quality_flags"].append(
                "duplicate_district_record"
            )

    flagged_records = [
        record for record in records
        if record["data_quality_flags"]
    ]

    return {
        "source": "IMD GeoServer",
        "source_url": response.url,
        "request_started_at": request_started_at.isoformat(),
        "fetched_at": fetched_at.isoformat(),
        "server_timestamp": data.get("timeStamp"),
        "features_received": len(features),
        "records_with_district": sum(
            1 for record in records if record["district"]
        ),
        "unique_district_names": len(set(districts)),
        "records_with_quality_flags": len(flagged_records),
        "records": records,
    }


if __name__ == "__main__":
    print("Project:", PROJECT_NAME)

    try:
        result = fetch_imd_warnings()
        
        flag_counts = Counter(
            flag
            for record in result["records"]
            for flag in record["data_quality_flags"]
        )

        print("\nQuality-flag breakdown:")

        for flag, count in flag_counts.most_common():
            print(f"{flag}: {count}")

        print("\nExamples with future source timestamps:")

        shown = 0

        for record in result["records"]:
            if "source_update_time_in_future" in record["data_quality_flags"]:
                print({
                    "district": record["district"],
                    "source_updated_at": record["source_updated_at"],
                    "fetched_at": record["fetched_at"],
                })
                shown += 1

                if shown >= 5:
                    break


        print("Source:", result["source"])
        print("Fetched at (UTC):", result["fetched_at"])
        print("Server timestamp:", result["server_timestamp"])
        print("Features received:", result["features_received"])
        print("Records with district:", result["records_with_district"])
        print("Unique district names:", result["unique_district_names"])
        print(
            "Records with quality flags:",
            result["records_with_quality_flags"],
        )

        print("\nSample records:")

        for record in result["records"][:5]:
            print({
                "district": record["district"],
                "record_date": record["record_date"],
                "flags": record["data_quality_flags"],
            })

        print("\nRecords needing investigation:")

        shown = 0

        for record in result["records"]:
            if record["data_quality_flags"]:
                print(
                    record["district"],
                    record["record_date"],
                    record["data_quality_flags"],
                )
                shown += 1

                if shown >= 10:
                    break

        if shown == 0:
            print("No quality flags detected.")

    except (requests.RequestException, ValueError) as error:
        print("IMD data fetch failed:", error)
