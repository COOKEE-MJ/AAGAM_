
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError

# Official IMD legacy district-warning endpoint.
# 573 is an example ID from IMD documentation,
# NOT a confirmed ID for Gurugram.
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
