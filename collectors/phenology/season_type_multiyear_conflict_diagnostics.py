"""
SeedTrade.eu
Season Type Multi-Year Conflict Diagnostics v0.1

Purpose
-------
Diagnose frozen v0.7 / v0.4 directional disagreement across 2021, 2022, 2023
for the same PL_EAST S01-S05 validation framework.

This script DOES NOT change any classifier rule.

Primary questions
-----------------
1. Is the 2021 conflict increase the same mechanism seen in 2023?
2. Are conflicts mainly SeedTrade v0.4 SPRING -> CLMS/v0.7 WINTER?
3. Which crops, samples, emergence months, durations and harvest months dominate?
4. Does CPCSY differ materially across conflict groups?
5. How do 2021, 2022 and 2023 compare under the same frozen v0.7 architecture?

Scientific constraints
----------------------
- CPCSY is a separate CLMS cross-layer signal, not independent evidence.
- CPCSY is NOT used to classify WINTER vs SPRING.
- CPMCDCL is not used here.
- Pixel percentages are descriptive proportions, not probabilities.
- WINTER_CYCLE_SIGNAL / SPRING_CYCLE_SIGNAL are crop-cycle signals,
  not proof of winter/spring variety identity.
- The five samples are not representative regional acreage estimates.
"""

import json
import statistics
from collections import Counter
from datetime import datetime
from pathlib import Path


VERSION = "0.1"
YEARS = (2021, 2022, 2023)
SAMPLE_IDS = ("S01", "S02", "S03", "S04", "S05")

PROJECT_ROOT = Path(__file__).resolve().parents[2]
COPERNICUS_DIR = PROJECT_ROOT / "data" / "raw" / "copernicus"

DIRECTIONAL = {
    "WINTER_CYCLE_SIGNAL": "WINTER",
    "SPRING_CYCLE_SIGNAL": "SPRING",
}


def load_json(path):
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def find_v07_summary(year):
    patterns = [
        f"*season_type_classifier_v07_hybrid_multiyear_validation_{year}_"
        "5samples_2000ha_*.json",
        f"*season_type_classifier_v07_hybrid*{year}*"
        "5samples_2000ha*.json",
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
            f"No v0.7 cross-sample JSON found for {year} in "
            f"{COPERNICUS_DIR}"
        )

    return candidates[-1]


def flatten_rows(data, year):
    rows = []

    samples = data.get("samples", {})

    for sid in SAMPLE_IDS:
        sample = samples.get(sid)

        if not sample:
            continue

        for pixel in sample.get("pixels", []):
            row = dict(pixel)
            row["_year"] = year
            row["_sample_id"] = sid
            rows.append(row)

    return rows


def pct(count, total):
    return round(count / total * 100, 2) if total else 0.0


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
        "mean": round(statistics.fmean(clean), 2),
        "median": round(statistics.median(clean), 2),
        "min": round(min(clean), 2),
        "max": round(max(clean), 2),
    }


def month_of(value):
    if not value:
        return "NO_DATA"

    try:
        return f"{datetime.fromisoformat(value).month:02d}"
    except (TypeError, ValueError):
        return "INVALID_DATE"


def seedtrade_class(row):
    return (
        row.get("seedtrade_v04_validation", {})
        .get("classification")
    )


def clms_class(row):
    return row.get("final_classification")


def phenology(row, key):
    return row.get("phenology_inputs", {}).get(key)


def cpcsy(row):
    block = row.get("cpcsy_cross_layer", {})

    value = block.get("value")

    if value is not None:
        return value

    seasons = block.get("seasons")

    if seasons is not None:
        return f"CPCSY_{seasons}"

    flag = block.get("flag")
    status = block.get("status")

    return flag or status or "NO_DATA"


def directional_conflict(row):
    old = seedtrade_class(row)
    new = clms_class(row)

    return (
        old in DIRECTIONAL
        and new in DIRECTIONAL
        and DIRECTIONAL[old] != DIRECTIONAL[new]
    )


def conflict_direction(row):
    old = seedtrade_class(row)
    new = clms_class(row)

    if old == "WINTER_CYCLE_SIGNAL" and new == "SPRING_CYCLE_SIGNAL":
        return "WINTER_TO_SPRING"

    if old == "SPRING_CYCLE_SIGNAL" and new == "WINTER_CYCLE_SIGNAL":
        return "SPRING_TO_WINTER"

    return "OTHER"


def profile_key(row):
    return (
        row["_sample_id"],
        row.get("crop"),
        seedtrade_class(row),
        clms_class(row),
        phenology(row, "emergence_date"),
        phenology(row, "duration_days"),
        phenology(row, "harvest_date"),
        cpcsy(row),
    )


def top_profiles(rows, limit=15):
    counter = Counter(profile_key(row) for row in rows)

    result = []

    for profile, count in counter.most_common(limit):
        result.append({
            "count": count,
            "sample_id": profile[0],
            "crop": profile[1],
            "seedtrade_class": profile[2],
            "clms_class": profile[3],
            "emergence_date": profile[4],
            "duration_days": profile[5],
            "harvest_date": profile[6],
            "cpcsy": profile[7],
        })

    return result


def analyse_group(rows):
    return {
        "pixels": len(rows),

        "by_crop":
            distribution(
                Counter(
                    row.get("crop", "UNKNOWN")
                    for row in rows
                )
            ),

        "by_sample":
            distribution(
                Counter(
                    row["_sample_id"]
                    for row in rows
                )
            ),

        "direction":
            distribution(
                Counter(
                    conflict_direction(row)
                    for row in rows
                )
            ),

        "emergence_month":
            distribution(
                Counter(
                    month_of(
                        phenology(row, "emergence_date")
                    )
                    for row in rows
                )
            ),

        "harvest_month":
            distribution(
                Counter(
                    month_of(
                        phenology(row, "harvest_date")
                    )
                    for row in rows
                )
            ),

        "duration_days":
            numeric_summary(
                phenology(row, "duration_days")
                for row in rows
            ),

        "emergence_uncertainty_days":
            numeric_summary(
                phenology(
                    row,
                    "emergence_uncertainty_days",
                )
                for row in rows
            ),

        "harvest_uncertainty_days":
            numeric_summary(
                phenology(
                    row,
                    "harvest_uncertainty_days",
                )
                for row in rows
            ),

        "cpcsy":
            distribution(
                Counter(
                    cpcsy(row)
                    for row in rows
                )
            ),

        "top_profiles":
            top_profiles(rows),
    }


def weak_ambiguous_groups(rows):
    result = {}

    definitions = {
        "WEAK_TO_CLMS_WINTER": (
            {"WEAK_SEASON_SIGNAL"},
            "WINTER_CYCLE_SIGNAL",
        ),
        "WEAK_TO_CLMS_SPRING": (
            {"WEAK_SEASON_SIGNAL"},
            "SPRING_CYCLE_SIGNAL",
        ),
        "AMBIGUOUS_TO_CLMS_WINTER": (
            {"MIXED_OR_AMBIGUOUS"},
            "WINTER_CYCLE_SIGNAL",
        ),
        "AMBIGUOUS_TO_CLMS_SPRING": (
            {"MIXED_OR_AMBIGUOUS"},
            "SPRING_CYCLE_SIGNAL",
        ),
    }

    for name, (old_classes, new_class) in definitions.items():
        subset = [
            row
            for row in rows
            if (
                seedtrade_class(row) in old_classes
                and clms_class(row) == new_class
            )
        ]

        result[name] = analyse_group(subset)

    return result


def print_distribution(items, indent="  ", limit=None):
    shown = items if limit is None else items[:limit]

    if not shown:
        print(f"{indent}NONE")
        return

    for item in shown:
        print(
            f"{indent}{item['value']}: "
            f"{item['count']:,} "
            f"({item['percent']:.2f}%)"
        )


def print_numeric(label, summary):
    print(
        f"  {label}: "
        f"n={summary['count']:,} | "
        f"mean={summary['mean']} | "
        f"median={summary['median']} | "
        f"min={summary['min']} | "
        f"max={summary['max']}"
    )


def print_group(title, group):
    print()
    print("-" * 78)
    print(title)
    print("-" * 78)
    print(f"Pixels: {group['pixels']:,}")

    print("Direction:")
    print_distribution(group["direction"])

    print("By crop:")
    print_distribution(group["by_crop"])

    print("By sample:")
    print_distribution(group["by_sample"])

    print("Emergence month:")
    print_distribution(group["emergence_month"], limit=12)

    print("Harvest month:")
    print_distribution(group["harvest_month"], limit=12)

    print_numeric(
        "Duration",
        group["duration_days"],
    )

    print_numeric(
        "Emergence uncertainty",
        group["emergence_uncertainty_days"],
    )

    print_numeric(
        "Harvest uncertainty",
        group["harvest_uncertainty_days"],
    )

    print("CPCSY:")
    print_distribution(group["cpcsy"], limit=12)

    print("Top profiles:")

    if not group["top_profiles"]:
        print("  NONE")

    for profile in group["top_profiles"]:
        print(
            f"  {profile['count']:>5} px | "
            f"{profile['sample_id']} | "
            f"{profile['crop']} | "
            f"{profile['seedtrade_class']} -> "
            f"{profile['clms_class']} | "
            f"E={profile['emergence_date']} | "
            f"D={profile['duration_days']} | "
            f"H={profile['harvest_date']} | "
            f"{profile['cpcsy']}"
        )


def main():
    print()
    print("=" * 78)
    print("SeedTrade.eu Season Type Multi-Year Conflict Diagnostics v0.1")
    print("Frozen v0.7 vs frozen v0.4 | 2021-2023 | PL_EAST")
    print("=" * 78)

    all_year_results = {}
    all_conflicts = []

    for year in YEARS:
        source = find_v07_summary(year)
        data = load_json(source)
        rows = flatten_rows(data, year)

        conflicts = [
            row
            for row in rows
            if directional_conflict(row)
        ]

        compared = [
            row
            for row in rows
            if (
                seedtrade_class(row) in DIRECTIONAL
                and clms_class(row) in DIRECTIONAL
            )
        ]

        match_count = len(compared) - len(conflicts)

        conflict_group = analyse_group(conflicts)
        weak_groups = weak_ambiguous_groups(rows)

        all_year_results[str(year)] = {
            "source": str(source),
            "target_pixels": len(rows),
            "directional_pixels_compared": len(compared),
            "directional_match": match_count,
            "directional_match_percent":
                pct(match_count, len(compared)),
            "directional_conflict": len(conflicts),
            "directional_conflict_percent":
                pct(len(conflicts), len(compared)),
            "conflicts": conflict_group,
            "weak_ambiguous_groups": weak_groups,
        }

        all_conflicts.extend(conflicts)

        print()
        print("=" * 78)
        print(f"{year} DIRECTIONAL CONFLICT DIAGNOSTIC")
        print("=" * 78)
        print(f"Source: {source.name}")
        print(f"Target pixels: {len(rows):,}")
        print(f"Directional compared: {len(compared):,}")
        print(
            f"Match: {match_count:,} "
            f"({pct(match_count, len(compared)):.2f}%)"
        )
        print(
            f"Conflict: {len(conflicts):,} "
            f"({pct(len(conflicts), len(compared)):.2f}%)"
        )

        print_group(
            f"{year} ALL DIRECTIONAL CONFLICTS",
            conflict_group,
        )

        for group_name, group in weak_groups.items():
            print_group(
                f"{year} {group_name}",
                group,
            )

    print()
    print("=" * 78)
    print("THREE-YEAR COMPARISON")
    print("=" * 78)

    for year in YEARS:
        item = all_year_results[str(year)]
        conflict = item["conflicts"]

        directions = {
            row["value"]: row["count"]
            for row in conflict["direction"]
        }

        print(
            f"{year} | "
            f"compared={item['directional_pixels_compared']:,} | "
            f"match={item['directional_match_percent']:.2f}% | "
            f"conflict={item['directional_conflict_percent']:.2f}% | "
            f"S->W={directions.get('SPRING_TO_WINTER', 0):,} | "
            f"W->S={directions.get('WINTER_TO_SPRING', 0):,}"
        )

    combined = analyse_group(all_conflicts)

    print_group(
        "2021-2023 COMBINED DIRECTIONAL CONFLICTS",
        combined,
    )

    current_date = datetime.now().strftime("%Y-%m-%d")

    output_path = (
        COPERNICUS_DIR
        / (
            "PL_EAST_"
            "season_type_multiyear_conflict_diagnostics_"
            "v01_"
            "2021_2022_2023_"
            "5samples_2000ha_"
            f"{current_date}.json"
        )
    )

    result = {
        "dataset":
            "SeedTrade.eu Season Type Multi-Year Conflict Diagnostics",

        "version":
            VERSION,

        "years":
            list(YEARS),

        "region":
            "PL_EAST",

        "diagnostic_only":
            True,

        "classifier_modified":
            False,

        "frozen_architecture":
            "v0.7 CLMS Zone 1 primary + SeedTrade v0.4 validation",

        "cpcsy_role":
            "SEPARATE_CLMS_CROSS_LAYER_SIGNAL",

        "cpcsy_independence_claimed":
            False,

        "cpcsy_used_for_classification":
            False,

        "probabilities_generated":
            False,

        "representative_regional_acreage":
            False,

        "year_results":
            all_year_results,

        "combined_2021_2023_conflicts":
            combined,

        "scientific_note":
            (
                "This diagnostic compares frozen v0.7 directional cycle "
                "labels with frozen v0.4 agronomic validation across "
                "2021-2023. It does not tune rules and does not infer "
                "winter/spring variety identity."
            ),
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
    print("=" * 78)
    print("MULTI-YEAR CONFLICT DIAGNOSTIC COMPLETE")
    print("=" * 78)
    print("No classifier rules were changed.")
    print("JSON saved to:")
    print(output_path)


if __name__ == "__main__":
    main()
