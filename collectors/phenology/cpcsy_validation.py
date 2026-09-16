"""
SeedTrade.eu
CPCSY Validation v0.1

Independent diagnostic for Copernicus Pixel Intelligence v0.8.

Purpose
-------
Read the latest PL_EAST v0.8 CPCSY 400 ha JSON and cross-tabulate:

    CTY crop
    x seasonal timing signal
    x emergence month
    x duration
    x harvest month
    x CPCSY

CPCSY is NOT used to create or modify WINTER/SPRING signals.
This script is diagnostic only.

Important
---------
- CPCSY = number of growing seasons detected within the calendar year.
- CPCSY 1/2 must NOT be interpreted as winter/spring crop type.
- Percentages are descriptive pixel proportions, not probabilities.
"""

import json
from collections import Counter, defaultdict
from datetime import datetime
from pathlib import Path
from statistics import mean


VERSION = "0.1"

PROJECT_ROOT = Path(__file__).resolve().parents[2]

COPERNICUS_DIR = (
    PROJECT_ROOT
    / "data"
    / "raw"
    / "copernicus"
)

TARGET_CROPS = {
    1110: "Wheat",
    1120: "Barley",
    1150: "Other cereals",
    1430: "Rapeseed",
}

CPCSY_LABELS = {
    0: "NO_ANNUAL_CROPLAND",
    1: "ONE_GROWING_SEASON",
    2: "TWO_GROWING_SEASONS",
}

MONTHS = {
    1: "Jan",
    2: "Feb",
    3: "Mar",
    4: "Apr",
    5: "May",
    6: "Jun",
    7: "Jul",
    8: "Aug",
    9: "Sep",
    10: "Oct",
    11: "Nov",
    12: "Dec",
}


def load_json(path):
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def find_latest_v08_json():
    files = sorted(
        COPERNICUS_DIR.glob(
            "*pixel_intelligence_v08_cpcsy_*_2km_400ha_test_*.json"
        ),
        key=lambda p: p.stat().st_mtime,
    )

    if not files:
        raise FileNotFoundError(
            "No v0.8 CPCSY 400 ha JSON file found."
        )

    return files[-1]


def parse_date(value):
    if not value:
        return None

    try:
        return datetime.fromisoformat(value)
    except (ValueError, TypeError):
        return None


def month_label(value):
    date = parse_date(value)

    if date is None:
        return "NO_DATA"

    return MONTHS[date.month]


def duration_bucket(value):
    if value is None:
        return "NO_DATA"

    if value < 90:
        return "<90"

    if value < 120:
        return "90-119"

    if value < 150:
        return "120-149"

    if value < 180:
        return "150-179"

    if value < 210:
        return "180-209"

    if value < 240:
        return "210-239"

    if value < 270:
        return "240-269"

    if value < 300:
        return "270-299"

    return "300+"


def cpcsy_key(pixel):
    seasons = pixel.get("cpcsy_seasons")

    if seasons in CPCSY_LABELS:
        return CPCSY_LABELS[seasons]

    label = pixel.get("cpcsy_label")

    if label:
        return label

    flag = pixel.get("cpcsy_flag")

    if flag:
        return f"FLAG:{flag}"

    status = pixel.get("cpcsy_status")

    if status:
        return f"STATUS:{status}"

    return "NO_DATA"


def percent(count, total):
    if not total:
        return 0.0

    return round(count / total * 100, 2)


def safe_mean(values):
    values = [
        value
        for value in values
        if value is not None
    ]

    if not values:
        return None

    return round(mean(values), 1)


def distribution(counter):
    total = sum(counter.values())

    return [
        {
            "value": key,
            "count": count,
            "percent": percent(count, total),
        }
        for key, count in counter.most_common()
    ]


def analyse_group(rows):
    cpcsy = Counter()
    emergence = Counter()
    duration = Counter()
    harvest = Counter()

    duration_values = []

    combinations = Counter()

    for pixel in rows:
        cpcsy_value = cpcsy_key(pixel)
        emergence_value = month_label(
            pixel.get("emergence_date")
        )
        duration_value = duration_bucket(
            pixel.get("duration_days")
        )
        harvest_value = month_label(
            pixel.get("harvest_date")
        )

        cpcsy[cpcsy_value] += 1
        emergence[emergence_value] += 1
        duration[duration_value] += 1
        harvest[harvest_value] += 1

        raw_duration = pixel.get("duration_days")

        if raw_duration is not None:
            duration_values.append(raw_duration)

        combinations[
            (
                cpcsy_value,
                emergence_value,
                duration_value,
                harvest_value,
            )
        ] += 1

    top_combinations = []

    for (
        cpcsy_value,
        emergence_value,
        duration_value,
        harvest_value,
    ), count in combinations.most_common(10):

        top_combinations.append(
            {
                "cpcsy": cpcsy_value,
                "emergence_month": emergence_value,
                "duration_bucket": duration_value,
                "harvest_month": harvest_value,
                "count": count,
                "percent": percent(count, len(rows)),
            }
        )

    return {
        "pixels": len(rows),
        "cpcsy": distribution(cpcsy),
        "emergence_month": distribution(emergence),
        "duration_bucket": distribution(duration),
        "duration_mean_days": safe_mean(duration_values),
        "harvest_month": distribution(harvest),
        "top_combinations": top_combinations,
    }


def analyse_crop(pixels, crop_code):
    rows = [
        pixel
        for pixel in pixels
        if pixel.get("cty") == crop_code
    ]

    timing_groups = defaultdict(list)

    for pixel in rows:
        signal = (
            pixel.get("seasonal_timing_signal")
            or "NO_TIMING_SIGNAL"
        )

        timing_groups[signal].append(pixel)

    timing_analysis = {
        signal: analyse_group(group)
        for signal, group in sorted(
            timing_groups.items()
        )
    }

    overall = analyse_group(rows)

    return {
        "cty": crop_code,
        "crop": TARGET_CROPS[crop_code],
        "pixels": len(rows),
        "area_ha": round(len(rows) * 0.01, 2),
        "overall": overall,
        "timing_signals": timing_analysis,
    }


def print_distribution(items, indent="      "):
    for item in items:
        print(
            f"{indent}{item['value']}: "
            f"{item['count']:,} "
            f"({item['percent']:.2f}%)"
        )


def print_crop(crop):
    print()
    print("=" * 68)
    print(
        f"{crop['crop']} "
        f"(CTY {crop['cty']})"
    )
    print("=" * 68)

    print(
        f"Pixels: {crop['pixels']:,} | "
        f"Area: {crop['area_ha']:.2f} ha"
    )

    print()
    print("  OVERALL CPCSY")

    print_distribution(
        crop["overall"]["cpcsy"],
        indent="    ",
    )

    for signal, data in crop[
        "timing_signals"
    ].items():

        print()
        print(f"  [{signal}]")
        print(f"    Pixels: {data['pixels']:,}")

        print("    CPCSY:")

        print_distribution(
            data["cpcsy"],
            indent="      ",
        )

        print(
            "    Duration mean: "
            f"{data['duration_mean_days']} d"
        )

        print("    Emergence months:")

        print_distribution(
            data["emergence_month"],
            indent="      ",
        )

        print("    Harvest months:")

        print_distribution(
            data["harvest_month"],
            indent="      ",
        )

        print("    Top CPCSY × phenology combinations:")

        for combo in data[
            "top_combinations"
        ][:5]:

            print(
                "      "
                f"{combo['cpcsy']} | "
                f"{combo['emergence_month']} | "
                f"{combo['duration_bucket']} d | "
                f"{combo['harvest_month']} "
                f"→ {combo['count']:,} px "
                f"({combo['percent']:.2f}%)"
            )


def build_consistency_matrix(crops):
    matrix = {}

    for crop in crops:
        crop_matrix = {}

        for signal, data in crop[
            "timing_signals"
        ].items():

            crop_matrix[signal] = {
                item["value"]: {
                    "count": item["count"],
                    "percent": item["percent"],
                }
                for item in data["cpcsy"]
            }

        matrix[str(crop["cty"])] = {
            "crop": crop["crop"],
            "timing_signals": crop_matrix,
        }

    return matrix


def main():
    source_path = find_latest_v08_json()
    source = load_json(source_path)

    pixels = source.get("pixels", [])

    if not pixels:
        raise ValueError(
            "No pixel records found in v0.8 JSON."
        )

    print()
    print("=" * 68)
    print("SeedTrade.eu CPCSY Validation v0.1")
    print("Independent 400 ha pixel-by-pixel diagnostic")
    print("=" * 68)
    print()
    print(f"Source: {source_path}")
    print(f"Pixels: {len(pixels):,}")
    print()
    print(
        "CPCSY is NOT used to create or modify "
        "WINTER/SPRING signals."
    )

    crops = []

    for crop_code in TARGET_CROPS:
        crop = analyse_crop(
            pixels,
            crop_code,
        )

        crops.append(crop)

        print_crop(crop)

    matrix = build_consistency_matrix(crops)

    current_date = datetime.now().strftime(
        "%Y-%m-%d"
    )

    output_path = (
        COPERNICUS_DIR
        / (
            "PL_EAST_"
            "cpcsy_validation_"
            "v01_"
            "2023_"
            "2km_400ha_test_"
            f"{current_date}.json"
        )
    )

    result = {
        "dataset":
            "SeedTrade.eu CPCSY Independent Validation",

        "version":
            VERSION,

        "source":
            str(source_path),

        "region":
            source.get("region"),

        "year":
            source.get("year"),

        "diagnostic_only":
            True,

        "winter_spring_classifier_modified":
            False,

        "cpcsy_used_for_classification":
            False,

        "probabilities_generated":
            False,

        "interpretation":
            (
                "CPCSY reports the number of growing seasons "
                "detected within the calendar year. "
                "CPCSY 1/2 is not equivalent to winter/spring."
            ),

        "crops":
            crops,

        "consistency_matrix":
            matrix,
    }

    with open(
        output_path,
        "w",
        encoding="utf-8",
    ) as f:

        json.dump(
            result,
            f,
            indent=2,
            ensure_ascii=False,
        )

    print()
    print("=" * 68)
    print("VALIDATION COMPLETE")
    print("=" * 68)
    print()
    print(
        "No classification rules were changed."
    )
    print(
        "Percentages are descriptive pixel proportions, "
        "not probabilities."
    )
    print()
    print("JSON saved to:")
    print(output_path)


if __name__ == "__main__":
    main()
