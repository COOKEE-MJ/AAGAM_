
import json
import os
from datetime import datetime, timezone
from pathlib import Path

from dotenv import load_dotenv
from tinyfish import TinyFish

# Find the project root, regardless of the terminal's location.

PROJECT_ROOT = Path(__file__).resolve().parent.parent

# Check both the radar folder and the project root for .env
load_dotenv(PROJECT_ROOT / "radar" / ".env")
load_dotenv(PROJECT_ROOT / ".env", override=False)


def main():
    if not os.getenv("TINYFISH_API_KEY"):
        print("API key not found. Check your .env file.")
        return

    print("Searching official disaster information...")

    client = TinyFish()
    response = client.search.query(
        "Latest official India weather warnings "
        "site:imd.gov.in OR site:cwc.gov.in",
        location="IN",
        language="en",
    )

    saved_results = []

    for result in response.results:
        saved_results.append({
            "title": result.title,
            "url": result.url,
            "snippet": result.snippet,
            "sourceType": "unverified_search_result",
            "fetchedAt": datetime.now(timezone.utc).isoformat(),
        })

    output_dir = PROJECT_ROOT / "radar" / "output"
    output_dir.mkdir(parents=True, exist_ok=True)

    output_file = output_dir / "alerts.json"
    output_file.write_text(
        json.dumps(saved_results, indent=2, ensure_ascii=False),
        encoding="utf-8",
    )

    print(f"Saved {len(saved_results)} search results.")
    print(f"Output file: {output_file}")


if __name__ == "__main__":
    main()
