
from pathlib import Path
from dotenv import load_dotenv
from tinyfish import TinyFish


RADAR_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = RADAR_DIR.parent

# Load the radar .env first, then the project-root .env
load_dotenv(RADAR_DIR / ".env")
load_dotenv(PROJECT_ROOT / ".env", override=False)


print("1. Starting TinyFish test...", flush=True)

client = TinyFish()

print("2. TinyFish client created.", flush=True)

url = "https://mausam.imd.gov.in/responsive/districtWiseWarningGIS.php"

try:
    print("3. Sending browser task...", flush=True)

    result = client.agent.run(
        url=url,
       
goal=(
    "Interact with the official IMD districtwise warning GIS map. "
    "Wait for the map and its data to load. Find the map's date "
    "selector, district search, legend, and any available controls. "
    "Select the latest available forecast date. Try to inspect "
    "Gurugram in Haryana, New Delhi in Delhi, and Bengaluru Urban "
    "in Karnataka by using the map or its search controls. "
    "For each district, report the exact warning category and "
    "colour shown, the forecast date, and the source of the data. "
    "If a district's warning cannot be accessed, explicitly say so. "
    "Never assume a district has no warning just because its data "
    "is not visible. Do not invent any values."
),

    )

    print("4. Browser task finished.", flush=True)
    print(result, flush=True)

except Exception as error:
    print("ERROR:", repr(error), flush=True)
