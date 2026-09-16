import json
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[2]

WEATHER_DATA_DIR = PROJECT_ROOT / "data" / "raw" / "weather"


def get_latest_weather_file():
    files = sorted(
        WEATHER_DATA_DIR.glob("*.json"),
        reverse=True
    )

    if not files:
        raise FileNotFoundError(
            "No weather JSON files found in data/raw/weather."
        )

    return files[0]


def load_weather_data(file_path):
    with open(
        file_path,
        "r",
        encoding="utf-8"
    ) as file:
        return json.load(file)


def calculate_region_metrics(region_data):
    weather = region_data["weather"]
    daily = weather["daily"]

    dates = daily["time"]

    max_temperatures = daily["temperature_2m_max"]
    min_temperatures = daily["temperature_2m_min"]
    precipitation = daily["precipitation_sum"]
    et0 = daily["et0_fao_evapotranspiration"]

    precipitation_7d = sum(
        value or 0
        for value in precipitation
    )

    et0_7d = sum(
        value or 0
        for value in et0
    )

    water_balance = precipitation_7d - et0_7d

    max_temperature = max(
        value
        for value in max_temperatures
        if value is not None
    )

    min_temperature = min(
        value
        for value in min_temperatures
        if value is not None
    )

    hot_days = sum(
        1
        for value in max_temperatures
        if value is not None and value >= 30
    )

    very_hot_days = sum(
        1
        for value in max_temperatures
        if value is not None and value >= 35
    )

    frost_days = sum(
        1
        for value in min_temperatures
        if value is not None and value <= 0
    )

    heavy_rain_days = sum(
        1
        for value in precipitation
        if value is not None and value >= 20
    )

    risk_score = 0
    risk_reasons = []

    if water_balance <= -30:
        risk_score += 3
        risk_reasons.append("Strong negative water balance")

    elif water_balance <= -15:
        risk_score += 2
        risk_reasons.append("Negative water balance")

    elif water_balance <= -5:
        risk_score += 1
        risk_reasons.append("Moderate moisture deficit")

    if very_hot_days >= 2:
        risk_score += 3
        risk_reasons.append("Multiple days above 35°C")

    elif hot_days >= 3:
        risk_score += 2
        risk_reasons.append("Multiple days above 30°C")

    elif hot_days >= 1:
        risk_score += 1
        risk_reasons.append("Heat risk")

    if frost_days >= 1:
        risk_score += 3
        risk_reasons.append("Frost risk")

    if heavy_rain_days >= 2:
        risk_score += 2
        risk_reasons.append("Repeated heavy rainfall")

    elif heavy_rain_days == 1:
        risk_score += 1
        risk_reasons.append("Heavy rainfall event")

    if risk_score >= 6:
        risk_level = "HIGH"

    elif risk_score >= 3:
        risk_level = "MEDIUM"

    else:
        risk_level = "LOW"

    return {
        "period_start": dates[0],
        "period_end": dates[-1],
        "max_temperature_c": round(max_temperature, 1),
        "min_temperature_c": round(min_temperature, 1),
        "precipitation_7d_mm": round(
            precipitation_7d,
            1
        ),
        "et0_7d_mm": round(
            et0_7d,
            1
        ),
        "water_balance_7d_mm": round(
            water_balance,
            1
        ),
        "hot_days_30c_plus": hot_days,
        "very_hot_days_35c_plus": very_hot_days,
        "frost_days": frost_days,
        "heavy_rain_days_20mm_plus": heavy_rain_days,
        "risk_score": risk_score,
        "risk_level": risk_level,
        "risk_reasons": risk_reasons,
    }


def analyze_weather(dataset):
    results = {}

    regions = dataset["regions"]

    for region_code, region_data in regions.items():

        if region_data.get("status") == "error":
            results[region_code] = {
                "status": "error",
                "error": region_data.get(
                    "error",
                    "Unknown collector error"
                ),
            }

            continue

        results[region_code] = {
            "country": region_data["country"],
            "region": region_data["region"],
            "metrics": calculate_region_metrics(
                region_data
            ),
        }

    return results


def print_analysis(results):
    print()
    print("====================================================")
    print("SeedTrade.eu Weather Intelligence")
    print("====================================================")

    for region_code, result in results.items():

        if result.get("status") == "error":
            print()
            print(f"{region_code}")
            print("Status: ERROR")
            print(result["error"])
            continue

        metrics = result["metrics"]

        print()
        print(
            f"{region_code} | "
            f"{result['country']} | "
            f"{result['region']}"
        )

        print(
            f"Period: "
            f"{metrics['period_start']} - "
            f"{metrics['period_end']}"
        )

        print(
            f"Temperature: "
            f"{metrics['min_temperature_c']} °C "
            f"to "
            f"{metrics['max_temperature_c']} °C"
        )

        print(
            f"Rain 7d: "
            f"{metrics['precipitation_7d_mm']} mm"
        )

        print(
            f"ET0 7d: "
            f"{metrics['et0_7d_mm']} mm"
        )

        print(
            f"Water balance: "
            f"{metrics['water_balance_7d_mm']} mm"
        )

        print(
            f"Hot days >=30°C: "
            f"{metrics['hot_days_30c_plus']}"
        )

        print(
            f"Very hot days >=35°C: "
            f"{metrics['very_hot_days_35c_plus']}"
        )

        print(
            f"Frost days: "
            f"{metrics['frost_days']}"
        )

        print(
            f"Heavy rain days >=20 mm: "
            f"{metrics['heavy_rain_days_20mm_plus']}"
        )

        print(
            f"Risk: "
            f"{metrics['risk_level']} "
            f"(score {metrics['risk_score']})"
        )

        if metrics["risk_reasons"]:
            print(
                "Reasons: "
                + "; ".join(
                    metrics["risk_reasons"]
                )
            )

        else:
            print(
                "Reasons: "
                "No major weather risk detected"
            )

    print()
    print("====================================================")


if __name__ == "__main__":
    latest_file = get_latest_weather_file()

    print(
        f"Using weather file: {latest_file}"
    )

    dataset = load_weather_data(
        latest_file
    )

    results = analyze_weather(
        dataset
    )

    print_analysis(
        results
    )