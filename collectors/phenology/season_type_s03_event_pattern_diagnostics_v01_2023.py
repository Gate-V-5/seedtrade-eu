#!/usr/bin/env python3
"""
SeedTrade.eu — LT 2023 S03 CPMCE event-pattern diagnostics v0.1

Purpose
-------
Diagnose whether 2023 S03 AGRONOMIC_CONFLICT pixels cluster into a small
number of repeated CLMS phenology patterns rather than being diffuse noise.

Compares AGRONOMIC_CONFLICT vs AGRONOMIC_AGREE for S03 using:
- emergence_date
- emergence_uncertainty_days
- crop
- duration_days
- harvest_date

Diagnostic only. Frozen v0.7 is NOT modified.
"""

import json
from collections import Counter, defaultdict
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / "data" / "raw" / "copernicus"

INPUT = DATA / (
    "LT_VALIDATION_season_type_classifier_v07_hybrid_multiyear_validation_"
    "2023_5samples_2000ha_2026-09-07.json"
)

SAMPLE_ID = "S03"
STATUSES = ("AGRONOMIC_CONFLICT", "AGRONOMIC_AGREE")
TOP_N = 30


def pct(n, d):
    return round(100.0 * n / d, 2) if d else 0.0


def safe(v):
    return "MISSING" if v is None else v


def summarize_counter(counter, total, top_n=TOP_N):
    return [
        {
            "value": key,
            "count": count,
            "percent": pct(count, total),
        }
        for key, count in counter.most_common(top_n)
    ]


def build_records(sample):
    rows = []
    for p in sample.get("pixels", []):
        status = p.get("agronomic_validation_status")
        if status not in STATUSES:
            continue

        ph = p.get("phenology_inputs") or {}

        rows.append({
            "row": p.get("row"),
            "column": p.get("column"),
            "crop": p.get("crop") or f"CTY_{p.get('cty')}",
            "status": status,
            "final_classification": p.get("final_classification"),
            "v04_classification": (
                (p.get("seedtrade_v04_validation") or {}).get("classification")
            ),
            "emergence_date": safe(ph.get("emergence_date")),
            "emergence_uncertainty_days": safe(
                ph.get("emergence_uncertainty_days")
            ),
            "duration_days": safe(ph.get("duration_days")),
            "harvest_date": safe(ph.get("harvest_date")),
        })
    return rows


def summarize_group(rows):
    total = len(rows)

    emergence_dates = Counter(r["emergence_date"] for r in rows)
    uncertainty = Counter(r["emergence_uncertainty_days"] for r in rows)
    duration = Counter(r["duration_days"] for r in rows)
    harvest_dates = Counter(r["harvest_date"] for r in rows)
    crops = Counter(r["crop"] for r in rows)

    full_patterns = Counter(
        (
            r["crop"],
            r["emergence_date"],
            r["emergence_uncertainty_days"],
            r["duration_days"],
            r["harvest_date"],
        )
        for r in rows
    )

    date_uncertainty = Counter(
        (
            r["emergence_date"],
            r["emergence_uncertainty_days"],
        )
        for r in rows
    )

    date_duration_harvest = Counter(
        (
            r["emergence_date"],
            r["duration_days"],
            r["harvest_date"],
        )
        for r in rows
    )

    return {
        "records": total,
        "by_crop": summarize_counter(crops, total),
        "top_emergence_dates": summarize_counter(emergence_dates, total),
        "top_uncertainty_values": summarize_counter(uncertainty, total),
        "top_duration_values": summarize_counter(duration, total),
        "top_harvest_dates": summarize_counter(harvest_dates, total),
        "top_emergence_date_x_uncertainty": [
            {
                "emergence_date": key[0],
                "uncertainty_days": key[1],
                "count": count,
                "percent": pct(count, total),
            }
            for key, count in date_uncertainty.most_common(TOP_N)
        ],
        "top_emergence_x_duration_x_harvest": [
            {
                "emergence_date": key[0],
                "duration_days": key[1],
                "harvest_date": key[2],
                "count": count,
                "percent": pct(count, total),
            }
            for key, count in date_duration_harvest.most_common(TOP_N)
        ],
        "top_full_patterns": [
            {
                "crop": key[0],
                "emergence_date": key[1],
                "uncertainty_days": key[2],
                "duration_days": key[3],
                "harvest_date": key[4],
                "count": count,
                "percent": pct(count, total),
            }
            for key, count in full_patterns.most_common(TOP_N)
        ],
    }


def crop_breakdown(rows):
    grouped = defaultdict(lambda: {s: [] for s in STATUSES})

    for r in rows:
        grouped[r["crop"]][r["status"]].append(r)

    result = {}
    for crop in sorted(grouped):
        result[crop] = {
            status: summarize_group(grouped[crop][status])
            for status in STATUSES
        }
    return result


def print_top_patterns(label, summary, n=15):
    print(f"\n{label}")
    print("-" * 110)
    for i, item in enumerate(summary["top_full_patterns"][:n], start=1):
        print(
            f"{i:>2}. {item['crop']:<15} | "
            f"emerg {item['emergence_date']} | "
            f"unc {str(item['uncertainty_days']):>4} | "
            f"dur {str(item['duration_days']):>4} | "
            f"harvest {item['harvest_date']} | "
            f"{item['count']:>5,} px ({item['percent']:>6.2f}%)"
        )


def main():
    if not INPUT.exists():
        raise FileNotFoundError(INPUT)

    with INPUT.open(encoding="utf-8") as f:
        data = json.load(f)

    samples = data.get("samples")
    if not isinstance(samples, dict):
        raise ValueError("Expected source['samples'] to be dict.")

    if SAMPLE_ID not in samples:
        raise KeyError(f"{SAMPLE_ID} not found in source samples.")

    rows = build_records(samples[SAMPLE_ID])

    conflict = [r for r in rows if r["status"] == "AGRONOMIC_CONFLICT"]
    agree = [r for r in rows if r["status"] == "AGRONOMIC_AGREE"]

    conflict_summary = summarize_group(conflict)
    agree_summary = summarize_group(agree)

    integrity = {
        "sample_id": SAMPLE_ID,
        "conflict_records": len(conflict),
        "agree_records": len(agree),
        "expected_conflict_records": 9049,
        "expected_agree_records": 9277,
        "conflict_matches_expected": len(conflict) == 9049,
        "agree_matches_expected": len(agree) == 9277,
    }
    integrity["pass"] = (
        integrity["conflict_matches_expected"]
        and integrity["agree_matches_expected"]
    )

    output = {
        "dataset": "SeedTrade.eu LT 2023 S03 CPMCE event-pattern diagnostics",
        "version": "0.1",
        "reference_year": 2023,
        "sample_id": SAMPLE_ID,
        "diagnostic_only": True,
        "classifier_v07_status": "FROZEN",
        "source_file": str(INPUT),
        "integrity": integrity,
        "AGRONOMIC_CONFLICT": conflict_summary,
        "AGRONOMIC_AGREE": agree_summary,
        "by_crop": crop_breakdown(rows),
        "scientific_note": [
            "This is a descriptive clustering diagnostic.",
            "Repeated phenology tuples can indicate concentrated event-detection regimes, but do not by themselves prove a CLMS processing artifact.",
            "No classifier rules, thresholds, weights, calendars, or classifications are modified.",
            "Pixel percentages are descriptive proportions, not probabilities."
        ],
        "generated_at": datetime.now().astimezone().isoformat(timespec="seconds"),
    }

    outfile = DATA / (
        "LT_VALIDATION_S03_event_pattern_diagnostics_v01_"
        f"2023_{datetime.now():%Y-%m-%d}.json"
    )

    with outfile.open("w", encoding="utf-8") as f:
        json.dump(output, f, indent=2, ensure_ascii=False)

    print("=" * 110)
    print("LT 2023 S03 CPMCE EVENT-PATTERN DIAGNOSTICS")
    print("v0.7 remains FROZEN")
    print("=" * 110)
    print(f"Integrity PASS: {integrity['pass']}")
    print(f"CONFLICT: {len(conflict):,} / expected 9,049")
    print(f"AGREE:    {len(agree):,} / expected 9,277")

    print_top_patterns("TOP CONFLICT FULL PATTERNS", conflict_summary)
    print_top_patterns("TOP AGREE FULL PATTERNS", agree_summary)

    print("\nTOP CONFLICT EMERGENCE DATE × UNCERTAINTY")
    print("-" * 110)
    for i, item in enumerate(
        conflict_summary["top_emergence_date_x_uncertainty"][:20], start=1
    ):
        print(
            f"{i:>2}. {item['emergence_date']} | "
            f"unc {str(item['uncertainty_days']):>4} | "
            f"{item['count']:>5,} px ({item['percent']:>6.2f}%)"
        )

    print("\nTOP AGREE EMERGENCE DATE × UNCERTAINTY")
    print("-" * 110)
    for i, item in enumerate(
        agree_summary["top_emergence_date_x_uncertainty"][:20], start=1
    ):
        print(
            f"{i:>2}. {item['emergence_date']} | "
            f"unc {str(item['uncertainty_days']):>4} | "
            f"{item['count']:>5,} px ({item['percent']:>6.2f}%)"
        )

    print("\nBY CROP — CONFLICT TOP PATTERN")
    print("-" * 110)
    for crop, groups in output["by_crop"].items():
        s = groups["AGRONOMIC_CONFLICT"]
        if not s["records"]:
            continue
        top = s["top_full_patterns"][0]
        print(
            f"{crop:<15} | {s['records']:>5,} conflict px | "
            f"top: emerg {top['emergence_date']} | "
            f"unc {top['uncertainty_days']} | "
            f"dur {top['duration_days']} | "
            f"harvest {top['harvest_date']} | "
            f"{top['count']:,} px ({top['percent']:.2f}%)"
        )

    print()
    print(f"Saved: {outfile}")
    print("=" * 110)


if __name__ == "__main__":
    main()
