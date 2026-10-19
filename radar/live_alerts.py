
import json
from pathlib import Path

from imd_fetcher import fetch_imd_warnings

RADAR_DIR = Path(__file__).resolve().parent
OUTPUT_DIR = RADAR_DIR / "output"
OUTPUT_DIR.mkdir(exist_ok=True)

OUTPUT_FILE = OUTPUT_DIR / "live_normalized_alerts.json"


def normalize_live_alert(record):
    """Convert an IMD record without inventing missing information."""

    district = record.get("district")
    issue_date = record.get("issueDate")

    if not district or not issue_date:
        return None

    # Preserve the original IMD values.
    forecast = record.get("forecast", {})
    colors = record.get("warningColors", {})
    warning_text = record.get("warningText", {})

    # Keep colour meanings unverified until confirmed.
    warning_color_labels = {
        day: "Unverified" if code is not None else None
        for day, code in colors.items()
    }

    return {
        "hazard": None,
        "severity": "Unclassified",
        "district": district,
        "state": record.get("state") or None,
        "issueDate": issue_date,
        "forecast": forecast,
        "warningColors": colors,
        "warningColorLabels": warning_color_labels,
        "warningText": warning_text,
        "validUntil": None,
        "sourceUrl": record.get("sourceUrl"),
        "updatedAt": record.get("updatedAt"),
        "fetchedAt": record.get("fetchedAt"),
        "isSample": False,
    }


def main():
    # Fetch records. Do not overwrite existing output if fetching fails.
    try:
        records = fetch_imd_warnings()
    except RuntimeError as error:
        print(
            "Could not retrieve a complete set of IMD records:",
            error,
        )
        print("Existing output file was not replaced.")
        return

    if not records:
        print("No live records retrieved; output file was not replaced.")
        return

    # Normalize the retrieved records.
    alerts = [
        alert
        for record in records
        if (alert := normalize_live_alert(record)) is not None
    ]

    # Write to a temporary file before replacing the existing output.
    temp_file = OUTPUT_FILE.with_suffix(".tmp")

    try:
        with open(temp_file, "w", encoding="utf-8") as file:
            json.dump(alerts, file, indent=2, ensure_ascii=False)
            file.write("\n")

        temp_file.replace(OUTPUT_FILE)

    except OSError as error:
        print("Could not safely save the new alerts:", error)
        print("The previous output file was preserved if replacement failed.")

        # Clean up a leftover temporary file if possible.
        try:
            if temp_file.exists():
                temp_file.unlink()
        except OSError:
            pass

        return

    print("Live records retrieved:", len(records))
    print("Records normalized:", len(alerts))
    print("Saved to:", OUTPUT_FILE)
    print("Warning: severity remains unclassified until codes are verified.")


if __name__ == "__main__":
    main()
