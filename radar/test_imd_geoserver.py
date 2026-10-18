
import requests

base_url = "https://reactjs.imd.gov.in/geoserver/imd/ows"

params = {
    "service": "WFS",
    "version": "2.0.0",
    "request": "GetCapabilities",
}

try:
    response = requests.get(base_url, params=params, timeout=30)

    print("HTTP status:", response.status_code)
    print("Response URL:", response.url)
    print("Response preview:")
    print(response.text[:5000])

except requests.RequestException as error:
    print("Request failed:", repr(error))

