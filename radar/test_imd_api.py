
"""
Research probe for the legacy IMD district-warning API.

The endpoint may return HTTP 401 when the requesting IP address
has not been whitelisted. This is an access restriction observed
during investigation, not necessarily a defect in this script.

The project uses the public IMD GeoServer WFS endpoint in
radar/imd_fetcher.py as an alternative data source.

The ID 573 below is an example ID, not a confirmed Gurugram ID.
This diagnostic script does not guarantee API access.
"""

from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError

# Official IMD legacy district-warning endpoint.
url = "https://mausam.imd.gov.in/api/warnings_district_api.php?id=573"

request = Request(
    url,
    headers={"User-Agent": "Mozilla/5.0"}
)

try:
    with urlopen(request, timeout=20) as response:
        body = response.read().decode("utf-8", errors="replace")

        print("HTTP status:", response.status)
        print("Response preview:")
        print(body[:3000])

except HTTPError as error:
    print("HTTP status:", error.code)
    print("Response:", error.read().decode("utf-8", errors="replace")[:1000])

except URLError as error:
    print("Connection error:", error.reason)
