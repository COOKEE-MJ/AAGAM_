
import requests
import xml.etree.ElementTree as ET

url = "https://reactjs.imd.gov.in/geoserver/imd/ows"

params = {
    "service": "WFS",
    "version": "2.0.0",
    "request": "GetCapabilities",
}

try:
    response = requests.get(url, params=params, timeout=30)
    response.raise_for_status()

    root = ET.fromstring(response.content)

    namespaces = {
        "wfs": "http://www.opengis.net/wfs/2.0",
        "ows": "http://www.opengis.net/ows/1.1",
    }

    feature_types = root.findall(
        ".//wfs:FeatureTypeList/wfs:FeatureType",
        namespaces,
    )

    print("Number of published layers:", len(feature_types))

    for layer in feature_types:
        name = layer.findtext("wfs:Name", default="Unknown", namespaces=namespaces)
        title = layer.findtext("wfs:Title", default="", namespaces=namespaces)
        print(f"\nLayer: {name}")
        print(f"Title: {title}")

except Exception as error:
    print("Error:", repr(error))
