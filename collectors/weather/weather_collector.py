import json
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import urlopen

from regions import REGIONS


# SeedTrade.eu project root
PROJECT_ROOT = Path(__file__).resolve().parents[2]

# Raw weather data storage
WEATHER_DATA_DIR = PROJECT_ROOT / "data" / "raw" / "weather"


def get_weather(region_code):
    region = REGIONS[region_code]

    params = {
        "latitude": region["latitude"],
        "longitude": region["longitude"],
        "daily": ",".join([
            "temperature_2m_max",
            "temperature_2m_min",
            "precipitation_sum",
            "precipitation_probability_max",
            "et0_fao_evapotranspiration",
        ]),
        "hourly": ",".join([
            "soil_temperature_0cm",
            "soil_moisture_0_to_1cm",
        ]),
        "timezone": "auto",
        "forecast_days": 7,
    }

    url = "https://api.open-meteo.com/v1/forecast?" + urlencode(params)

    with urlopen(url, timeout=30) as response:
        weather = json.load(response)

    return {
        "source": "Open-Meteo",
        "collected_at": datetime.now(timezone.utc).isoformat(),
        "region_code": region_code,
        "country": region["country"],
        "region": region["region"],
        "latitude": region["latitude"],
        "longitude": region["longitude"],
        "weather": weather,
    }


def collect_all_regions():
    results = {}

    total_regions = len(REGIONS)

    print(f"Starting weather collection for {total_regions} regions.")
    print()

    for region_code in REGIONS:
        print(f"Collecting {region_code}...")

        try:
            results[region_code] = get_weather(region_code)

        except Exception as exc:
            results[region_code] = {
                "source": "Open-Meteo",
                "collected_at": datetime.now(timezone.utc).isoformat(),
                "region_code": region_code,
                "status": "error",
                "error": str(exc),
            }

    return results


def save_weather_data(results):
    WEATHER_DATA_DIR.mkdir(
        parents=True,
        exist_ok=True
    )

    collection_time = datetime.now(timezone.utc)

    filename = collection_time.strftime("%Y-%m-%d") + ".json"

    file_path = WEATHER_DATA_DIR / filename

    output = {
        "dataset": "SeedTrade.eu Weather Intelligence",
        "source": "Open-Meteo",
        "collected_at": collection_time.isoformat(),
        "region_count": len(results),
        "regions": results,
    }

    with open(
        file_path,
        "w",
        encoding="utf-8"
    ) as file:
        json.dump(
            output,
            file,
            indent=2,
            ensure_ascii=False
        )

    return file_path


def print_summary(results, file_path):
    successful = sum(
        1
        for result in results.values()
        if result.get("status") != "error"
    )

    failed = len(results) - successful

    print()
    print("----------------------------------------")
    print("SeedTrade.eu Weather Collector")
    print("----------------------------------------")
    print(f"Regions:    {len(results)}")
    print(f"Successful: {successful}")
    print(f"Failed:     {failed}")
    print(f"Saved to:   {file_path}")
    print("----------------------------------------")


if __name__ == "__main__":
    results = collect_all_regions()

    file_path = save_weather_data(results)

    print_summary(
        results,
        file_path
    )