"""
SeedTrade.eu
Lithuania 2023 Geographic-Transfer Conflict Diagnostics v0.1

Purpose
-------
Diagnose directional disagreement between frozen SeedTrade v0.4 and frozen
v0.7 for LT_VALIDATION 2023.

This script DOES NOT change any classifier rule.

Questions
---------
1. Are conflicts mainly v0.4 SPRING -> v0.7 WINTER?
2. Which crops and S01-S05 samples dominate?
3. Which emergence months, harvest months and durations dominate?
4. What CPCSY states occur in the conflict pixels?
5. Is the Lithuania mechanism similar to the previously diagnosed PL_EAST
   early-spring-emergence conflict pattern?

Scientific constraints
----------------------
- Diagnostic only; no threshold/calendar/rule tuning.
- CPCSY is a separate CLMS cross-layer signal, not independent evidence.
- CPCSY is NOT used to classify WINTER vs SPRING.
- CPMCDCL is not used here.
- Pixel percentages are descriptive proportions, not probabilities.
- WINTER_CYCLE_SIGNAL / SPRING_CYCLE_SIGNAL are crop-cycle signals,
  not proof of winter/spring variety identity.
- The five samples are not representative Lithuanian acreage estimates.
"""

import json
import statistics
from collections import Counter, defaultdict
from datetime import datetime
from pathlib import Path


VERSION = "0.1"
VALIDATION_YEAR = 2023
REGION_CODE = "LT_VALIDATION"
SAMPLE_IDS = ("S01", "S02", "S03", "S04", "S05")

PROJECT_ROOT = Path(__file__).resolve().parents[2]
COPERNICUS_DIR = PROJECT_ROOT / "data" / "raw" / "copernicus"

DIRECTIONAL = {
    "WINTER_CYCLE_SIGNAL": "WINTER",
    "SPRING_CYCLE_SIGNAL": "SPRING",
}

CROP_NAMES = {
    1110: "Wheat",
    1120: "Barley",
    1150: "Other cereals",
    1430: "Rapeseed",
}


def load_json(path):
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def find_v07_summary():
    patterns = [
        (
            f"{REGION_CODE}_season_type_classifier_"
            f"v07_hybrid_multiyear_validation_{VALIDATION_YEAR}_"
            "5samples_2000ha_*.json"
        ),
        (
            f"{REGION_CODE}_*v07*{VALIDATION_YEAR}*"
            "5samples_2000ha*.json"
        ),
    ]

    candidates = []
    for pattern in patterns:
        candidates.extend(COPERNICUS_DIR.glob(pattern))

    candidates = sorted(
        set(candidates),
        key=lambda p: (p.stat().st_mtime, p.name),
    )

    if not candidates:
        raise FileNotFoundError(
            "No LT_VALIDATION v0.7 2023 cross-sample JSON found in "
            f"{COPERNICUS_DIR}"
        )

    return candidates[-1]


def pct(count, total):
    return round(count / total * 100.0, 2) if total else 0.0


def distribution(counter):
    total = sum(counter.values())
    return [
        {
            "value": value,
            "count": count,
            "percent": pct(count, total),
        }
        for value, count in counter.most_common()
    ]


def numeric_summary(values):
    clean = [
        float(v)
        for v in values
        if isinstance(v, (int, float))
    ]

    if not clean:
        return {
            "count": 0,
            "mean": None,
            "median": None,
            "min": None,
            "max": None,
        }

    return {
        "count": len(clean),
        "mean": round(statistics.mean(clean), 2),
        "median": round(statistics.median(clean), 2),
        "min": min(clean),
        "max": max(clean),
    }


def first_value(row, keys):
    for key in keys:
        value = row.get(key)
        if value is not None:
            return value
    return None


def date_month(value):
    if not isinstance(value, str) or len(value) < 7:
        return None

    try:
        return int(value[5:7])
    except ValueError:
        return None


def crop_code(row):
    value = first_value(
        row,
        ("crop_code", "cty", "cty_code"),
    )
    try:
        return int(value)
    except (TypeError, ValueError):
        return value


def crop_name(row):
    code = crop_code(row)
    return first_value(
        row,
        ("crop_name", "cty_name"),
    ) or CROP_NAMES.get(code, str(code))


def v04_direction(row):
    value = first_value(
        row,
        (
            "v04_classification",
            "v04_season_type",
            "seedtrade_v04_classification",
            "baseline_classification",
            "baseline_season_type",
            "agronomic_classification",
        ),
    )

    if value in DIRECTIONAL:
        return DIRECTIONAL[value]

    if value in ("WINTER", "SPRING"):
        return value

    return None


def v07_direction(row):
    value = first_value(
        row,
        (
            "final_classification",
            "v07_classification",
            "season_type",
        ),
    )

    if value in DIRECTIONAL:
        return DIRECTIONAL[value]

    if value in ("WINTER", "SPRING"):
        return value

    return None


def emergence_date(row):
    return first_value(
        row,
        (
            "emergence_date",
            "cpmce_date",
            "cpmce_interpreted_date",
            "cpmce",
        ),
    )


def harvest_date(row):
    return first_value(
        row,
        (
            "harvest_date",
            "cpmch_date",
            "cpmch_interpreted_date",
            "cpmch",
        ),
    )


def duration_days(row):
    value = first_value(
        row,
        (
            "duration_days",
            "crop_duration_days",
            "cpmcd_days",
            "cpmcd",
        ),
    )

    if isinstance(value, bool):
        return None

    if isinstance(value, (int, float)):
        return value

    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def cpcsy_label(row):
    value = first_value(
        row,
        (
            "cpcsy_label",
            "cpcsy_interpretation",
            "cpcsy_status",
            "cpcsy",
        ),
    )

    mapping = {
        0: "NO_ANNUAL_CROPLAND",
        1: "CPCSY_1",
        2: "CPCSY_2",
        65526: "FALLOW_LAND_OCCURRENCE",
        65527: "NO_DELINEATED_FIELD_GEOMETRY",
        65528: "QUALITY_FLAG_65528",
        65529: "BARE_SOIL_PERIOD_CANNOT_BE_DERIVED",
        65531: "QUALITY_FLAG_65531",
        65532: "QUALITY_FLAG_65532",
        65533: "SEASON_OUTSIDE_DEFINED_TIMEFRAME",
        65534: "CONFIDENCE_CANNOT_BE_CALCULATED",
        65535: "OUTSIDE_AREA",
    }

    if isinstance(value, (int, float)):
        return mapping.get(int(value), str(int(value)))

    return str(value) if value is not None else "UNKNOWN"


def flatten_rows(data):
    rows = []
    samples = data.get("samples", {})

    for sid in SAMPLE_IDS:
        sample = samples.get(sid)
        if not sample:
            continue

        for pixel in sample.get("pixels", []):
            row = dict(pixel)
            row["_sample_id"] = sid
            rows.append(row)

    return rows


def analyse_conflicts(rows):
    conflicts = []

    for row in rows:
        a = v04_direction(row)
        b = v07_direction(row)

        if a is None or b is None or a == b:
            continue

        item = dict(row)
        item["_v04_direction"] = a
        item["_v07_direction"] = b
        item["_direction"] = f"{a}_TO_{b}"
        conflicts.append(item)

    by_direction = Counter()
    by_sample = Counter()
    by_crop = Counter()
    by_sample_crop = Counter()
    emergence_month = Counter()
    harvest_month = Counter()
    cpcsy = Counter()
    durations = []

    direction_crop = defaultdict(Counter)
    direction_sample = defaultdict(Counter)

    for row in conflicts:
        direction = row["_direction"]
        sid = row["_sample_id"]
        cname = crop_name(row)

        by_direction[direction] += 1
        by_sample[sid] += 1
        by_crop[cname] += 1
        by_sample_crop[(sid, cname)] += 1

        direction_crop[direction][cname] += 1
        direction_sample[direction][sid] += 1

        em = date_month(emergence_date(row))
        hm = date_month(harvest_date(row))

        if em is not None:
            emergence_month[em] += 1

        if hm is not None:
            harvest_month[hm] += 1

        duration = duration_days(row)
        if duration is not None:
            durations.append(duration)

        cpcsy[cpcsy_label(row)] += 1

    top_combinations = [
        {
            "sample_id": sid,
            "crop": crop,
            "count": count,
            "percent_of_conflicts": pct(count, len(conflicts)),
        }
        for (sid, crop), count in by_sample_crop.most_common(20)
    ]

    direction_details = {}
    for direction in sorted(by_direction):
        subset = [
            row
            for row in conflicts
            if row["_direction"] == direction
        ]

        em = Counter()
        hm = Counter()
        cp = Counter()
        durs = []

        for row in subset:
            month = date_month(emergence_date(row))
            if month is not None:
                em[month] += 1

            month = date_month(harvest_date(row))
            if month is not None:
                hm[month] += 1

            cp[cpcsy_label(row)] += 1

            d = duration_days(row)
            if d is not None:
                durs.append(d)

        direction_details[direction] = {
            "count": len(subset),
            "percent_of_conflicts": pct(
                len(subset),
                len(conflicts),
            ),
            "by_crop": distribution(
                direction_crop[direction]
            ),
            "by_sample": distribution(
                direction_sample[direction]
            ),
            "emergence_month": distribution(em),
            "harvest_month": distribution(hm),
            "duration_days": numeric_summary(durs),
            "cpcsy": distribution(cp),
        }

    return {
        "conflict_count": len(conflicts),
        "by_direction": distribution(by_direction),
        "by_sample": distribution(by_sample),
        "by_crop": distribution(by_crop),
        "top_sample_crop_combinations": top_combinations,
        "emergence_month": distribution(emergence_month),
        "harvest_month": distribution(harvest_month),
        "duration_days": numeric_summary(durations),
        "cpcsy": distribution(cpcsy),
        "direction_details": direction_details,
        "conflict_pixels": conflicts,
    }


def print_distribution(title, rows):
    print()
    print(title)
    if not rows:
        print("  No data")
        return

    for row in rows:
        print(
            f"  {str(row['value']):28s} "
            f"{row['count']:8,d} | "
            f"{row['percent']:6.2f}%"
        )


def print_numeric(title, summary):
    print()
    print(title)
    print(f"  count : {summary['count']:,}")
    print(f"  mean  : {summary['mean']}")
    print(f"  median: {summary['median']}")
    print(f"  min   : {summary['min']}")
    print(f"  max   : {summary['max']}")


def main():
    source_path = find_v07_summary()
    data = load_json(source_path)
    rows = flatten_rows(data)

    result = analyse_conflicts(rows)

    total_directional = 0
    comparison = data.get(
        "combined_comparison_vs_v04",
        {},
    )
    total_directional = comparison.get(
        "directional_pixels_compared",
        0,
    )

    conflict_rate = pct(
        result["conflict_count"],
        total_directional,
    )

    print()
    print("=" * 78)
    print("SeedTrade.eu Lithuania 2023 Conflict Diagnostics v0.1")
    print("=" * 78)
    print(f"Source: {source_path.name}")
    print(f"Rows loaded: {len(rows):,}")
    print(f"Directional pixels compared: {total_directional:,}")
    print(
        f"Directional conflicts: "
        f"{result['conflict_count']:,} "
        f"({conflict_rate:.2f}%)"
    )

    print_distribution(
        "CONFLICT DIRECTION",
        result["by_direction"],
    )
    print_distribution(
        "CONFLICTS BY SAMPLE",
        result["by_sample"],
    )
    print_distribution(
        "CONFLICTS BY CROP",
        result["by_crop"],
    )
    print_distribution(
        "EMERGENCE MONTH",
        result["emergence_month"],
    )
    print_distribution(
        "HARVEST MONTH",
        result["harvest_month"],
    )
    print_numeric(
        "DURATION DAYS",
        result["duration_days"],
    )
    print_distribution(
        "CPCSY",
        result["cpcsy"],
    )

    print()
    print("TOP SAMPLE x CROP CONFLICT GROUPS")
    for row in result["top_sample_crop_combinations"]:
        print(
            f"  {row['sample_id']} | "
            f"{row['crop']:18s} | "
            f"{row['count']:7,d} | "
            f"{row['percent_of_conflicts']:6.2f}%"
        )

    for direction, detail in result["direction_details"].items():
        print()
        print("-" * 78)
        print(
            f"{direction}: "
            f"{detail['count']:,} "
            f"({detail['percent_of_conflicts']:.2f}% "
            "of conflicts)"
        )
        print("-" * 78)

        print_distribution(
            "By crop",
            detail["by_crop"],
        )
        print_distribution(
            "By sample",
            detail["by_sample"],
        )
        print_distribution(
            "Emergence month",
            detail["emergence_month"],
        )
        print_distribution(
            "Harvest month",
            detail["harvest_month"],
        )
        print_numeric(
            "Duration days",
            detail["duration_days"],
        )
        print_distribution(
            "CPCSY",
            detail["cpcsy"],
        )

    current_date = datetime.now().strftime("%Y-%m-%d")

    output_path = (
        COPERNICUS_DIR
        / (
            f"{REGION_CODE}_"
            "season_type_conflict_diagnostics_"
            "v01_"
            f"{VALIDATION_YEAR}_"
            "5samples_2000ha_"
            f"{current_date}.json"
        )
    )

    output = {
        "dataset":
            "SeedTrade.eu Lithuania Geographic-Transfer Conflict Diagnostics",
        "version":
            VERSION,
        "region_code":
            REGION_CODE,
        "validation_year":
            VALIDATION_YEAR,
        "diagnostic_only":
            True,
        "classifier_modified":
            False,
        "classifier_rules_frozen":
            True,
        "probabilities_generated":
            False,
        "representative_regional_acreage":
            False,
        "source":
            str(source_path),
        "directional_pixels_compared":
            total_directional,
        "directional_conflicts":
            result["conflict_count"],
        "directional_conflict_percent":
            conflict_rate,
        "analysis": {
            key: value
            for key, value in result.items()
            if key != "conflict_pixels"
        },
        "conflict_pixels":
            result["conflict_pixels"],
        "scientific_note":
            (
                "Diagnostic of frozen v0.4 versus frozen v0.7 directional "
                "cycle disagreement in LT_VALIDATION 2023. No rule, threshold "
                "or calendar value is changed. CPCSY is retained only as a "
                "separate CLMS cross-layer descriptive signal. Results are "
                "sample diagnostics, not representative Lithuania acreage "
                "estimates and not proof of winter/spring variety identity."
            ),
    }

    with open(
        output_path,
        "w",
        encoding="utf-8",
    ) as f:
        json.dump(
            output,
            f,
            indent=2,
            ensure_ascii=False,
        )

    print()
    print("=" * 78)
    print("LITHUANIA 2023 CONFLICT DIAGNOSTIC COMPLETE")
    print("=" * 78)
    print("No classifier rules were changed.")
    print("JSON saved to:")
    print(output_path)


if __name__ == "__main__":
    main()
