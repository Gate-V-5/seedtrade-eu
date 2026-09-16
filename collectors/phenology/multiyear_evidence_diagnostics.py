"""
SeedTrade.eu
Multi-Year Evidence Diagnostics v0.1

Purpose
-------
Compare the frozen SeedTrade v0.4 season-type evidence between 2022 and 2023
for the same PL_EAST S01-S05 sample locations.

This script DOES NOT change any classifier rule.

It reads:
- 2022 v0.4 multiyear-validation per-sample JSON files
- 2023 v0.4 baseline per-sample JSON files

It reports, by year and crop:
- classification distribution
- evidence-strength distribution
- emergence month distribution
- harvest month distribution
- duration statistics
- emergence / harvest uncertainty statistics
- missing core-input patterns
- evidence signal + direction combinations

It also provides a dedicated Rapeseed diagnostic section because the 2022
rapeseed result differs strongly from the 2023 baseline.

Important
---------
- Pixel proportions are descriptive, not probabilities.
- The five samples are not representative regional acreage estimates.
- WINTER_CYCLE_SIGNAL / SPRING_CYCLE_SIGNAL are seasonal-cycle evidence,
  not proof of botanical winter/spring variety identity.
- CPMCDCL is not used for evidence weighting.
"""

import json
import statistics
from collections import Counter
from datetime import datetime
from pathlib import Path


VERSION = "0.1"
PROJECT_ROOT = Path(__file__).resolve().parents[2]
COPERNICUS_DIR = PROJECT_ROOT / "data" / "raw" / "copernicus"

YEARS = (2022, 2023)
SAMPLE_IDS = ("S01", "S02", "S03", "S04", "S05")

TARGET_CROPS = {
    1110: "Wheat",
    1120: "Barley",
    1150: "Other cereals",
    1430: "Rapeseed",
}


def load_json(path):
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def latest_by_sample(pattern):
    files = sorted(
        COPERNICUS_DIR.glob(pattern),
        key=lambda p: p.name,
    )

    result = {}

    for path in files:
        for sid in SAMPLE_IDS:
            if f"_{sid}_" in path.name:
                result[sid] = path
                break

    missing = [
        sid for sid in SAMPLE_IDS
        if sid not in result
    ]

    if missing:
        raise FileNotFoundError(
            f"Missing samples {missing} for pattern: {pattern}"
        )

    return result


def source_paths():
    return {
        2022: latest_by_sample(
            "*season_type_classifier_v04_multiyear_validation_2022_"
            "S??_2km_400ha_test_*.json"
        ),
        2023: latest_by_sample(
            "*season_type_classifier_v04_2023_"
            "S??_2km_400ha_test_*.json"
        ),
    }


def parse_date(value):
    if not value:
        return None

    try:
        return datetime.fromisoformat(value)
    except (TypeError, ValueError):
        return None


def month_label(value):
    dt = parse_date(value)

    if dt is None:
        return "NO_DATA"

    return f"{dt.month:02d}"


def numeric_stats(values):
    clean = [
        float(v) for v in values
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


def pct(count, total):
    if not total:
        return 0.0
    return round(count / total * 100, 2)


def distribution(counter):
    total = sum(counter.values())

    return [
        {
            "value": key,
            "count": count,
            "percent": pct(count, total),
        }
        for key, count in counter.most_common()
    ]


def raw_field(pixel, *names):
    for name in names:
        if name in pixel:
            return pixel.get(name)

    return None


def evidence_signature(pixel):
    evidence = pixel.get("evidence") or []

    parts = []

    for row in evidence:
        signal = row.get("signal", "UNKNOWN")
        direction = row.get("direction", "UNKNOWN")
        parts.append(f"{signal}|{direction}")

    if not parts:
        return "NO_EVIDENCE_ROWS"

    return " + ".join(sorted(parts))


def missing_pattern(pixel):
    emergence = raw_field(
        pixel,
        "emergence_date",
    )
    duration = raw_field(
        pixel,
        "duration_days",
    )
    harvest = raw_field(
        pixel,
        "harvest_date",
    )

    missing = []

    if emergence is None:
        missing.append("EMERGENCE")

    if duration is None:
        missing.append("DURATION")

    if harvest is None:
        missing.append("HARVEST")

    if not missing:
        return "COMPLETE"

    return "+".join(missing)


def summarise_pixels(pixels):
    total = len(pixels)

    class_counts = Counter(
        p.get("classification", "UNKNOWN")
        for p in pixels
    )

    strength_counts = Counter(
        p.get("evidence_strength", "UNKNOWN")
        for p in pixels
    )

    emergence_months = Counter(
        month_label(
            raw_field(
                p,
                "emergence_date",
            )
        )
        for p in pixels
    )

    harvest_months = Counter(
        month_label(
            raw_field(
                p,
                "harvest_date",
            )
        )
        for p in pixels
    )

    missing_counts = Counter(
        missing_pattern(p)
        for p in pixels
    )

    evidence_signatures = Counter(
        evidence_signature(p)
        for p in pixels
    )

    evidence_rows = Counter()

    for p in pixels:
        for row in p.get("evidence") or []:
            evidence_rows[
                (
                    row.get("signal", "UNKNOWN"),
                    row.get("direction", "UNKNOWN"),
                )
            ] += 1

    return {
        "pixels": total,

        "classification":
            distribution(class_counts),

        "evidence_strength":
            distribution(strength_counts),

        "emergence_month":
            distribution(emergence_months),

        "harvest_month":
            distribution(harvest_months),

        "duration_days":
            numeric_stats(
                [
                    raw_field(p, "duration_days")
                    for p in pixels
                ]
            ),

        "emergence_uncertainty_days":
            numeric_stats(
                [
                    raw_field(
                        p,
                        "emergence_uncertainty_days",
                    )
                    for p in pixels
                ]
            ),

        "harvest_uncertainty_days":
            numeric_stats(
                [
                    raw_field(
                        p,
                        "harvest_uncertainty_days",
                    )
                    for p in pixels
                ]
            ),

        "missing_core_inputs":
            distribution(missing_counts),

        "evidence_rows":
            [
                {
                    "signal": signal,
                    "direction": direction,
                    "count": count,
                    "percent_of_pixels": pct(
                        count,
                        total,
                    ),
                }
                for (
                    signal,
                    direction,
                ), count
                in evidence_rows.most_common()
            ],

        "evidence_signatures":
            distribution(evidence_signatures),
    }


def enrich_from_source(classified, source):
    """
    v0.4 output pixels may or may not preserve every raw phenology field
    at top level depending on the exact historical runner.

    Join source pixel records by row/column when needed.
    """
    source_pixels = source.get("pixels", [])

    source_map = {
        (
            p.get("row"),
            p.get("column"),
        ): p
        for p in source_pixels
    }

    enriched = []

    for p in classified:
        merged = dict(p)

        src = source_map.get(
            (
                p.get("row"),
                p.get("column"),
            ),
            {},
        )

        for field in (
            "cty",
            "emergence_date",
            "emergence_uncertainty_days",
            "duration_days",
            "duration_confidence",
            "harvest_date",
            "harvest_uncertainty_days",
        ):
            if merged.get(field) is None:
                merged[field] = src.get(field)

        enriched.append(merged)

    return enriched


def load_year(year, paths):
    rows = []
    sample_results = {}

    for sid in SAMPLE_IDS:
        path = paths[year][sid]
        data = load_json(path)

        classified = data.get("pixels", [])

        source_path = data.get("source")
        source_data = {}

        if source_path:
            candidate = Path(source_path)

            if candidate.exists():
                source_data = load_json(candidate)

        enriched = enrich_from_source(
            classified,
            source_data,
        )

        for p in enriched:
            p["_sample_id"] = sid
            p["_year"] = year

        rows.extend(enriched)
        sample_results[sid] = {
            "path": str(path),
            "pixels": enriched,
        }

    return rows, sample_results


def by_crop(rows):
    result = {}

    for code, name in TARGET_CROPS.items():
        crop_rows = [
            p for p in rows
            if p.get("cty") == code
        ]

        result[str(code)] = {
            "crop": name,
            **summarise_pixels(crop_rows),
        }

    return result


def rapeseed_class_focus(rows):
    rapeseed = [
        p for p in rows
        if p.get("cty") == 1430
    ]

    result = {}

    for classification in (
        "WINTER_CYCLE_SIGNAL",
        "SPRING_CYCLE_SIGNAL",
        "WEAK_SEASON_SIGNAL",
        "MIXED_OR_AMBIGUOUS",
        "INSUFFICIENT_DATA",
    ):
        subset = [
            p for p in rapeseed
            if p.get("classification") == classification
        ]

        result[classification] = (
            summarise_pixels(subset)
        )

    return result


def compare_crop_summaries(year_data):
    result = {}

    for code, name in TARGET_CROPS.items():
        result[str(code)] = {
            "crop": name,
            "2022_pixels":
                year_data[2022]["by_crop"][str(code)]["pixels"],
            "2023_pixels":
                year_data[2023]["by_crop"][str(code)]["pixels"],
            "2022_classification":
                year_data[2022]["by_crop"][str(code)]["classification"],
            "2023_classification":
                year_data[2023]["by_crop"][str(code)]["classification"],
        }

    return result


def print_dist(items, indent="    ", limit=None):
    shown = items if limit is None else items[:limit]

    for item in shown:
        print(
            f"{indent}{item['value']}: "
            f"{item['count']:,} "
            f"({item['percent']:.2f}%)"
        )


def print_stats(label, stats, indent="    "):
    print(
        f"{indent}{label}: "
        f"n={stats['count']:,}, "
        f"mean={stats['mean']}, "
        f"median={stats['median']}, "
        f"min={stats['min']}, "
        f"max={stats['max']}"
    )


def print_crop(year, crop):
    print()
    print(
        f"{year} | {crop['crop']} | "
        f"{crop['pixels']:,} px"
    )

    print("  Classification:")
    print_dist(
        crop["classification"],
        indent="    ",
    )

    print("  Emergence month:")
    print_dist(
        crop["emergence_month"],
        indent="    ",
        limit=8,
    )

    print("  Harvest month:")
    print_dist(
        crop["harvest_month"],
        indent="    ",
        limit=8,
    )

    print_stats(
        "Duration days",
        crop["duration_days"],
        indent="  ",
    )

    print_stats(
        "Emergence uncertainty",
        crop["emergence_uncertainty_days"],
        indent="  ",
    )

    print_stats(
        "Harvest uncertainty",
        crop["harvest_uncertainty_days"],
        indent="  ",
    )

    print("  Missing core inputs:")
    print_dist(
        crop["missing_core_inputs"],
        indent="    ",
        limit=8,
    )

    print("  Evidence rows:")
    for row in crop["evidence_rows"][:10]:
        print(
            f"    {row['signal']} | "
            f"{row['direction']}: "
            f"{row['count']:,} "
            f"({row['percent_of_pixels']:.2f}% of pixels)"
        )


def main():
    paths = source_paths()

    print()
    print("=" * 78)
    print("SeedTrade.eu Multi-Year Evidence Diagnostics v0.1")
    print("Frozen v0.4 evidence | 2022 vs 2023 | PL_EAST S01-S05")
    print("=" * 78)

    year_data = {}

    for year in YEARS:
        rows, samples = load_year(
            year,
            paths,
        )

        year_data[year] = {
            "rows": rows,
            "samples": samples,
            "by_crop": by_crop(rows),
            "rapeseed_class_focus":
                rapeseed_class_focus(rows),
        }

        print()
        print("=" * 78)
        print(f"{year} SUMMARY")
        print("=" * 78)

        for code in TARGET_CROPS:
            print_crop(
                year,
                year_data[year]["by_crop"][str(code)],
            )

    print()
    print("=" * 78)
    print("RAPESEED 2022 vs 2023 DIAGNOSTIC")
    print("=" * 78)

    for year in YEARS:
        rapeseed = year_data[year]["by_crop"]["1430"]

        print()
        print(
            f"{year} Rapeseed | "
            f"{rapeseed['pixels']:,} px"
        )

        print("Classification:")
        print_dist(
            rapeseed["classification"],
            indent="  ",
        )

        print("Emergence month:")
        print_dist(
            rapeseed["emergence_month"],
            indent="  ",
            limit=12,
        )

        print("Harvest month:")
        print_dist(
            rapeseed["harvest_month"],
            indent="  ",
            limit=12,
        )

        print_stats(
            "Duration",
            rapeseed["duration_days"],
            indent="  ",
        )

        print("Missing core inputs:")
        print_dist(
            rapeseed["missing_core_inputs"],
            indent="  ",
        )

        print("Top evidence signatures:")
        print_dist(
            rapeseed["evidence_signatures"],
            indent="  ",
            limit=12,
        )

    print()
    print("=" * 78)
    print("RAPESEED CLASS-BY-CLASS FOCUS")
    print("=" * 78)

    for year in YEARS:
        print()
        print(f"{year}")

        focus = year_data[year][
            "rapeseed_class_focus"
        ]

        for classification, summary in focus.items():
            print()
            print(
                f"  {classification}: "
                f"{summary['pixels']:,} px"
            )

            print("    Emergence month:")
            print_dist(
                summary["emergence_month"],
                indent="      ",
                limit=6,
            )

            print("    Harvest month:")
            print_dist(
                summary["harvest_month"],
                indent="      ",
                limit=6,
            )

            print_stats(
                "Duration",
                summary["duration_days"],
                indent="    ",
            )

            print("    Missing:")
            print_dist(
                summary["missing_core_inputs"],
                indent="      ",
                limit=6,
            )

    comparison = compare_crop_summaries(
        year_data
    )

    current_date = datetime.now().strftime(
        "%Y-%m-%d"
    )

    output_path = (
        COPERNICUS_DIR
        / (
            "PL_EAST_"
            "multiyear_evidence_diagnostics_"
            "v01_"
            "2022_vs_2023_"
            "5samples_2000ha_"
            f"{current_date}.json"
        )
    )

    result = {
        "dataset":
            "SeedTrade.eu Multi-Year Evidence Diagnostics",

        "version":
            VERSION,

        "region":
            "PL_EAST",

        "years":
            list(YEARS),

        "samples":
            list(SAMPLE_IDS),

        "classifier":
            "SeedTrade v0.4 frozen baseline",

        "classifier_rules_changed":
            False,

        "probabilities_generated":
            False,

        "representative_regional_acreage":
            False,

        "year_data": {
            str(year): {
                "by_crop":
                    year_data[year]["by_crop"],

                "rapeseed_class_focus":
                    year_data[year]["rapeseed_class_focus"],

                "sources": {
                    sid:
                        year_data[year]["samples"][sid]["path"]
                    for sid in SAMPLE_IDS
                },
            }
            for year in YEARS
        },

        "comparison":
            comparison,

        "scientific_note":
            (
                "This diagnostic compares frozen v0.4 evidence between "
                "2022 and 2023. It does not infer botanical winter/spring "
                "variety identity and does not modify classifier weights."
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
    print("DIAGNOSTIC COMPLETE")
    print("=" * 78)
    print("No classifier rules were changed.")
    print("JSON saved to:")
    print(output_path)


if __name__ == "__main__":
    main()
