import json
from datetime import date, timedelta
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import urlopen

from regions import REGIONS


# ============================================================
# PATHS
# ============================================================

PROJECT_ROOT = Path(__file__).resolve().parents[2]

WEATHER_HISTORY_DIR = (
    PROJECT_ROOT
    / "data"
    / "raw"
    / "weather_history"
)


# ============================================================
# CONFIG
# ============================================================

HISTORY_DAYS = 30


# ============================================================
# API
# ============================================================

def get_history_dates(days=HISTORY_DAYS):

    end_date = date.today() - timedelta(days=1)

    start_date = (
        end_date
        - timedelta(days=days - 1)
    )

    return (
        start_date,
        end_date,
    )


def get_historical_weather(
    region_code,
    days=HISTORY_DAYS,
):

    region = REGIONS[
        region_code
    ]

    start_date, end_date = (
        get_history_dates(
            days
        )
    )

    params = {

        "latitude":
            region["latitude"],

        "longitude":
            region["longitude"],

        "start_date":
            start_date.isoformat(),

        "end_date":
            end_date.isoformat(),

        "daily":
            ",".join([
                "temperature_2m_max",
                "temperature_2m_min",
                "precipitation_sum",
                "et0_fao_evapotranspiration",
            ]),

        "timezone":
            "auto",
    }


    url = (
        "https://archive-api.open-meteo.com/v1/archive?"
        + urlencode(
            params
        )
    )


    with urlopen(
        url,
        timeout=30,
    ) as response:

        weather = json.load(
            response
        )


    return {

        "source":
            "Open-Meteo Historical Weather API",

        "region_code":
            region_code,

        "country":
            region["country"],

        "region":
            region["region"],

        "latitude":
            region["latitude"],

        "longitude":
            region["longitude"],

        "start_date":
            start_date.isoformat(),

        "end_date":
            end_date.isoformat(),

        "weather":
            weather,
    }


# ============================================================
# METRICS
# ============================================================

def calculate_period_metrics(
    daily,
    days,
):

    temperatures_max = daily[
        "temperature_2m_max"
    ]

    temperatures_min = daily[
        "temperature_2m_min"
    ]

    precipitation = daily[
        "precipitation_sum"
    ]

    et0 = daily[
        "et0_fao_evapotranspiration"
    ]


    total_available_days = len(
        precipitation
    )


    if total_available_days < days:

        days = total_available_days


    temperatures_max = (
        temperatures_max[-days:]
    )

    temperatures_min = (
        temperatures_min[-days:]
    )

    precipitation = (
        precipitation[-days:]
    )

    et0 = (
        et0[-days:]
    )


    precipitation_sum = sum(
        value or 0
        for value in precipitation
    )


    et0_sum = sum(
        value or 0
        for value in et0
    )


    water_balance = (
        precipitation_sum
        - et0_sum
    )


    max_temperature = max(
        value
        for value in temperatures_max
        if value is not None
    )


    min_temperature = min(
        value
        for value in temperatures_min
        if value is not None
    )


    hot_days = sum(
        1
        for value in temperatures_max
        if (
            value is not None
            and value >= 30
        )
    )


    very_hot_days = sum(
        1
        for value in temperatures_max
        if (
            value is not None
            and value >= 35
        )
    )


    frost_days = sum(
        1
        for value in temperatures_min
        if (
            value is not None
            and value <= 0
        )
    )


    heavy_rain_days = sum(
        1
        for value in precipitation
        if (
            value is not None
            and value >= 20
        )
    )


    dry_days = sum(
        1
        for value in precipitation
        if (
            value is not None
            and value < 1
        )
    )


    longest_dry_spell = (
        calculate_longest_dry_spell(
            precipitation
        )
    )


    return {

        "days":
            days,

        "precipitation_mm":
            round(
                precipitation_sum,
                1,
            ),

        "et0_mm":
            round(
                et0_sum,
                1,
            ),

        "water_balance_mm":
            round(
                water_balance,
                1,
            ),

        "max_temperature_c":
            round(
                max_temperature,
                1,
            ),

        "min_temperature_c":
            round(
                min_temperature,
                1,
            ),

        "hot_days":
            hot_days,

        "very_hot_days":
            very_hot_days,

        "frost_days":
            frost_days,

        "heavy_rain_days":
            heavy_rain_days,

        "dry_days":
            dry_days,

        "longest_dry_spell_days":
            longest_dry_spell,
    }


def calculate_longest_dry_spell(
    precipitation,
):

    longest = 0

    current = 0


    for value in precipitation:

        if (
            value is not None
            and value < 1
        ):

            current += 1

            longest = max(
                longest,
                current,
            )

        else:

            current = 0


    return longest


# ============================================================
# STRESS SIGNALS
# ============================================================

def detect_historical_stress(
    metrics,
):

    signals = []


    water_balance = metrics[
        "water_balance_mm"
    ]


    longest_dry_spell = metrics[
        "longest_dry_spell_days"
    ]


    if water_balance <= -80:

        signals.append(
            "severe_cumulative_moisture_deficit"
        )


    elif water_balance <= -50:

        signals.append(
            "strong_cumulative_moisture_deficit"
        )


    elif water_balance <= -25:

        signals.append(
            "moderate_cumulative_moisture_deficit"
        )


    if longest_dry_spell >= 14:

        signals.append(
            "long_dry_spell"
        )


    elif longest_dry_spell >= 7:

        signals.append(
            "moderate_dry_spell"
        )


    if metrics[
        "very_hot_days"
    ] >= 5:

        signals.append(
            "prolonged_strong_heat"
        )


    elif metrics[
        "hot_days"
    ] >= 5:

        signals.append(
            "prolonged_heat"
        )


    if metrics[
        "frost_days"
    ] >= 3:

        signals.append(
            "repeated_frost"
        )


    if metrics[
        "heavy_rain_days"
    ] >= 3:

        signals.append(
            "repeated_heavy_rain"
        )


    if not signals:

        signals.append(
            "no_major_historical_stress"
        )


    return signals


# ============================================================
# ANALYSIS
# ============================================================

def analyze_history(
    region_data,
):

    weather = region_data[
        "weather"
    ]

    daily = weather[
        "daily"
    ]


    metrics_7d = (
        calculate_period_metrics(
            daily,
            7,
        )
    )


    metrics_14d = (
        calculate_period_metrics(
            daily,
            14,
        )
    )


    metrics_30d = (
        calculate_period_metrics(
            daily,
            30,
        )
    )


    return {

        "region_code":
            region_data["region_code"],

        "country":
            region_data["country"],

        "region":
            region_data["region"],

        "start_date":
            region_data["start_date"],

        "end_date":
            region_data["end_date"],

        "periods": {

            "7d": {
                "metrics":
                    metrics_7d,

                "signals":
                    detect_historical_stress(
                        metrics_7d
                    ),
            },

            "14d": {
                "metrics":
                    metrics_14d,

                "signals":
                    detect_historical_stress(
                        metrics_14d
                    ),
            },

            "30d": {
                "metrics":
                    metrics_30d,

                "signals":
                    detect_historical_stress(
                        metrics_30d
                    ),
            },
        },
    }


# ============================================================
# SAVE
# ============================================================

def save_history(
    result,
):

    WEATHER_HISTORY_DIR.mkdir(
        parents=True,
        exist_ok=True,
    )


    file_path = (
        WEATHER_HISTORY_DIR
        / (
            result["region_code"]
            + "_"
            + result["end_date"]
            + ".json"
        )
    )


    with open(
        file_path,
        "w",
        encoding="utf-8",
    ) as file:

        json.dump(
            result,
            file,
            indent=2,
            ensure_ascii=False,
        )


    return file_path


# ============================================================
# PRINT
# ============================================================

def print_history_summary(
    result,
):

    print()

    print(
        "========================================================"
    )

    print(
        "SeedTrade.eu Historical Weather Intelligence"
    )

    print(
        "========================================================"
    )

    print()


    print(
        f"Region: "
        f"{result['region_code']} | "
        f"{result['country']} | "
        f"{result['region']}"
    )


    print(
        f"Period: "
        f"{result['start_date']} "
        f"to "
        f"{result['end_date']}"
    )


    for period_name in [
        "7d",
        "14d",
        "30d",
    ]:

        period = result[
            "periods"
        ][
            period_name
        ]

        metrics = period[
            "metrics"
        ]

        signals = period[
            "signals"
        ]


        print()

        print(
            f"{period_name.upper()}:"
        )


        print(
            f"  Rain: "
            f"{metrics['precipitation_mm']} mm"
        )


        print(
            f"  ET0: "
            f"{metrics['et0_mm']} mm"
        )


        print(
            f"  Water balance: "
            f"{metrics['water_balance_mm']} mm"
        )


        print(
            f"  Temperature: "
            f"{metrics['min_temperature_c']} °C "
            f"to "
            f"{metrics['max_temperature_c']} °C"
        )


        print(
            f"  Dry days: "
            f"{metrics['dry_days']}"
        )


        print(
            f"  Longest dry spell: "
            f"{metrics['longest_dry_spell_days']} days"
        )


        print(
            f"  Hot days >=30 °C: "
            f"{metrics['hot_days']}"
        )


        print(
            f"  Very hot days >=35 °C: "
            f"{metrics['very_hot_days']}"
        )


        print(
            f"  Frost days <=0 °C: "
            f"{metrics['frost_days']}"
        )


        print(
            f"  Heavy rain days >=20 mm: "
            f"{metrics['heavy_rain_days']}"
        )


        print(
            "  Historical signals:"
        )


        for signal in signals:

            print(
                f"    - {signal}"
            )


    print()

    print(
        "========================================================"
    )


# ============================================================
# TEST
# ============================================================

def test_history():

    test_region = (
        "PL_EAST"
    )


    print(
        f"Collecting historical weather "
        f"for {test_region}..."
    )


    region_data = (
        get_historical_weather(
            test_region,
            HISTORY_DAYS,
        )
    )


    result = (
        analyze_history(
            region_data
        )
    )


    file_path = (
        save_history(
            result
        )
    )


    print_history_summary(
        result
    )


    print(
        f"Saved to: "
        f"{file_path}"
    )


if __name__ == "__main__":

    test_history()