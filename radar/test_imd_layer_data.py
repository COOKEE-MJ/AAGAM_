
import requests
import xml.etree.ElementTree as ET

BASE_URL = "https://reactjs.imd.gov.in/geoserver/imd/ows"

layers = [
    "imd:district_warnings_india",
    "imd:mcwise_district_warnings_view",
    "imd:delhi_district_warnings_view",
    "imd:NowcastWarningDistrict",
]

for layer in layers:
    print("\n" + "=" * 60)
    print("LAYER:", layer)

    params = {
        "service": "WFS",
        "version": "2.0.0",
        "request": "DescribeFeatureType",
        "typeNames": layer,
    }

    try:
        response = requests.get(BASE_URL, params=params, timeout=30)
        print("HTTP status:", response.status_code)
        response.raise_for_status()

        root = ET.fromstring(response.content)

        for element in root.iter():
            if element.tag.endswith("element"):
                name = element.attrib.get("name")
                field_type = element.attrib.get("type", "unknown")

                if name:
                    print(f"  {name}: {field_type}")

    except Exception as error:
        print("Schema request failed:", repr(error))
        print(response.text[:1000] if "response" in locals() else "")

print("\nSchema inspection finished.")
