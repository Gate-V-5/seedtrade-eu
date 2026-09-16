#!/usr/bin/env python3
"""
SeedTrade.eu — Lithuania Sample × Crop CPMCE uncertainty diagnostics v0.1
Years: 2021, 2022, 2023

Diagnostic only. Does NOT modify or tune frozen v0.7.
"""

import json
import statistics
from collections import defaultdict
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / "data" / "raw" / "copernicus"

FILES = {
    2021: DATA / "LT_VALIDATION_season_type_classifier_v07_hybrid_multiyear_validation_2021_5samples_2000ha_2026-09-07.json",
    2022: DATA / "LT_VALIDATION_season_type_classifier_v07_hybrid_multiyear_validation_2022_5samples_2000ha_2026-09-07.json",
    2023: DATA / "LT_VALIDATION_season_type_classifier_v07_hybrid_multiyear_validation_2023_5samples_2000ha_2026-09-07.json",
}

STATUSES = ("AGRONOMIC_CONFLICT", "AGRONOMIC_AGREE")


def mean(values):
    return round(statistics.mean(values), 2) if values else None


def median(values):
    return round(statistics.median(values), 2) if values else None


def summarize(rows):
    vals = [
        r["uncertainty"]
        for r in rows
        if isinstance(r["uncertainty"], (int, float))
    ]
    return {
        "records": len(rows),
        "valid_uncertainty": len(vals),
        "mean": mean(vals),
        "median": median(vals),
        "min": min(vals) if vals else None,
        "max": max(vals) if vals else None,
    }


def load_year(year, path):
    if not path.exists():
        raise FileNotFoundError(f"Missing {year} file: {path}")

    with path.open(encoding="utf-8") as f:
        data = json.load(f)

    matrix = defaultdict(lambda: defaultdict(lambda: defaultdict(list)))

    for sample_id, sample in data["samples"].items():
        for p in sample.get("pixels", []):
            status = p.get("agronomic_validation_status")
            if status not in STATUSES:
                continue

            ph = p.get("phenology_inputs") or {}
            crop = p.get("crop") or f"CTY_{p.get('cty')}"

            matrix[sample_id][crop][status].append({
                "uncertainty": ph.get("emergence_uncertainty_days")
            })

    result = {}
    for sample_id in sorted(matrix):
        result[sample_id] = {}
        for crop in sorted(matrix[sample_id]):
            groups = matrix[sample_id][crop]
            result[sample_id][crop] = {
                status: summarize(groups.get(status, []))
                for status in STATUSES
            }

            c = result[sample_id][crop]["AGRONOMIC_CONFLICT"]["mean"]
            a = result[sample_id][crop]["AGRONOMIC_AGREE"]["mean"]
            result[sample_id][crop]["conflict_minus_agree_mean"] = (
                round(c - a, 2)
                if c is not None and a is not None
                else None
            )

    return result


def main():
    all_results = {}

    print("=" * 92)
    print("LT 2021-2023 SAMPLE x CROP CPMCE EMERGENCE UNCERTAINTY")
    print("v0.7 remains FROZEN")
    print("=" * 92)

    for year, path in FILES.items():
        result = load_year(year, path)
        all_results[str(year)] = result

        print(f"\n{'=' * 36} {year} {'=' * 36}")

        for sample_id, crops in result.items():
            print(f"\n{sample_id}")
            for crop, v in crops.items():
                c = v["AGRONOMIC_CONFLICT"]
                a = v["AGRONOMIC_AGREE"]
                delta = v["conflict_minus_agree_mean"]

                print(
                    f"  {crop:<16} | "
                    f"CONFLICT {c['records']:>6,} "
                    f"mean {str(c['mean']):>5} med {str(c['median']):>5} | "
                    f"AGREE {a['records']:>6,} "
                    f"mean {str(a['mean']):>5} med {str(a['median']):>5} | "
                    f"DELTA {str(delta):>6}"
                )

    output = {
        "dataset": "SeedTrade.eu LT Sample x Crop CPMCE uncertainty diagnostics",
        "version": "0.1",
        "years": [2021, 2022, 2023],
        "diagnostic_only": True,
        "classifier_v07_status": "FROZEN",
        "results": all_results,
        "scientific_note": [
            "Descriptive diagnostic only.",
            "No v0.7 rules, weights, thresholds, calendars, or classifications are modified.",
            "Mean delta is CONFLICT mean uncertainty minus AGREE mean uncertainty within the same year, sample and crop.",
            "Cells with no conflict or no agree observations have delta = null."
        ],
        "generated_at": datetime.now().astimezone().isoformat(timespec="seconds"),
    }

    outfile = DATA / (
        "LT_VALIDATION_sample_crop_emergence_uncertainty_diagnostics_v01_"
        f"2021_2022_2023_5samples_2000ha_{datetime.now():%Y-%m-%d}.json"
    )

    with outfile.open("w", encoding="utf-8") as f:
        json.dump(output, f, indent=2, ensure_ascii=False)

    print()
    print("=" * 92)
    print(f"Saved: {outfile}")
    print("=" * 92)


if __name__ == "__main__":
    main()
