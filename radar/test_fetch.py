
import json
from pathlib import Path
from dotenv import load_dotenv
from tinyfish import TinyFish

# Find the radar folder and load its API key

# Find the project root and radar folder
RADAR_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = RADAR_DIR.parent

# Load the radar .env first, then fill missing values from the root .env
load_dotenv(RADAR_DIR / ".env")
load_dotenv(PROJECT_ROOT / ".env", override=False)


# Read the saved search results
results_file = RADAR_DIR / "output" / "alerts.json"

with open(results_file, "r", encoding="utf-8") as file:
    results = json.load(file)

# Test the official IMD district-wise warning page
urls = [
    "https://mausam.imd.gov.in/imd_latest/contents/districtwise-warning_mc.php?lang=en"
]

if not urls:
    print("No URLs found in alerts.json")
    raise SystemExit

print("Fetching", len(urls), "source pages...")





client = TinyFish()
response = client.fetch.get_contents(urls=urls)


# Inspect the fetched pages for district warning information
for item in response.results:
    page_text = item.text or ""

    print("\nTitle:", item.title)
    print("URL:", item.final_url)
    print("Total text length:", len(page_text))

    print("\n========== EXTRACTED PAGE TEXT ==========")
    print(page_text[:5000])
    print("\n========== END OF EXTRACTED PAGE TEXT ==========")
    

    keywords = [
        "District Wise",
        "Districtwise",
        "Heavy Rain",
        "Warning",
        "Delhi",
        "Gurugram",
        "New Delhi",
        "No Warning",
    ]

    for keyword in keywords:
        positions = []
        start = 0

        while True:
            position = page_text.lower().find(keyword.lower(), start)

            if position == -1:
                break

            positions.append(position)
            start = position + len(keyword)

        print(f"\n{keyword}: found {len(positions)} time(s)")

        for position in positions[-2:]:
            left = max(0, position - 150)
            right = min(len(page_text), position + 350)

            print(page_text[left:right].replace("\n", " "))
