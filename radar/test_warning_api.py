
import requests
import json

url = "https://mausam.imd.gov.in/api/warnings_district_api.php"

params = {
    "id": 573
}

try:
    response = requests.get(url, params=params, timeout=20)

    print("Status code:", response.status_code)
    print("URL:", response.url)
    print("Response preview:", response.text[:1500])

    response.raise_for_status()

    try:
        data = response.json()
        print("\nParsed response:")
        print(json.dumps(data, indent=2)[:4000])
    except ValueError:
        print("\nResponse is not JSON.")

except requests.RequestException as error:
    print("Request failed:", error)
