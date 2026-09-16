"""
SeedTrade.eu
Season Type Classifier v0.6 - CLMS Zone 1 Rules

Purpose
-------
Experimental classifier reproducing the published Copernicus CLMS Zone 1
main-season winter/spring seasonal limits and comparing the result with the
existing SeedTrade v0.4 classifier.

This is NOT a replacement for v0.4 until validation is reviewed.

Official CLMS Zone 1 main-season limits used here
-------------------------------------------------
WINTER:
    emergence: 15 Aug (year-1) -> 30 Apr (year)
    harvest:   01 Jun (year)   -> 15 Sep (year)

SPRING:
    emergence: 01 Apr (year)   -> 01 Jul (year)
    harvest:   01 Jul (year)   -> 01 Dec (year)

When a detected season fits both winter and spring limits, the CLMS ATBD
priority rule is reproduced:
    overlap days in spring seasonal period > winter -> SPRING
    overlap days equal                           -> SPRING
    overlap days in spring seasonal period < winter -> WINTER

Important
---------
- CTY crop type is NOT used to determine the CLMS winter/spring label.
- CTY is retained only for reporting/cross-tabs.
- CPCSY is NOT used for classification.
- CPMCDCL is NOT used for weighting.
- Emergence/harvest confidence is retained for diagnostics only.
- v0.4 files are read only for comparison.
- Percentages are pixel proportions, not probabilities.
"""

import json
from collections import Counter, defaultdict
from datetime import date, datetime, timedelta
from pathlib import Path


VERSION = "0.6-clms-zone1-test"
RULESET_VERSION = "CLMS_ATBD_ZONE1_MAIN_SEASON_V2_1_REPRODUCTION"

PROJECT_ROOT = Path(__file__).resolve().parents[2]
COPERNICUS_DIR = PROJECT_ROOT / "data" / "raw" / "copernicus"

SAMPLE_IDS = ("S01", "S02", "S03", "S04", "S05")

TARGET_CROPS = {
    1110: "Wheat",
    1120: "Barley",
    1150: "Other cereals",
    1430: "Rapeseed",
}

QUALITY_FLAGS = {
    0,
    65526,
    65527,
    65528,
    65529,
    65531,
    65532,
    65533,
    65534,
    65535,
}


def load_json(path):
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def find_latest(pattern):
    files = sorted(COPERNICUS_DIR.glob(pattern), key=lambda p: p.name)
    latest = {}
    for path in files:
        for sid in SAMPLE_IDS:
            if f"_{sid}_" in path.name:
                latest[sid] = path
                break
    missing = [sid for sid in SAMPLE_IDS if sid not in latest]
    if missing:
        raise FileNotFoundError(
            f"Missing files for samples: {', '.join(missing)} | pattern={pattern}"
        )
    return {sid: latest[sid] for sid in SAMPLE_IDS}


def find_v07():
    return find_latest(
        "*pixel_intelligence_v07_2023_S??_2km_400ha_test_*.json"
    )


def find_v04():
    return find_latest(
        "*season_type_classifier_v04_*_S??_2km_400ha_test_*.json"
    )


def parse_iso(value):
    if not value:
        return None
    try:
        return date.fromisoformat(value)
    except (ValueError, TypeError):
        return None


def key(pixel):
    return (pixel.get("row"), pixel.get("column"))


def overlap_days(start_a, end_a, start_b, end_b):
    start = max(start_a, start_b)
    end = min(end_a, end_b)
    if end < start:
        return 0
    return (end - start).days + 1


def zone1_windows(reference_year):
    return {
        "winter": {
            "emergence_start": date(reference_year - 1, 8, 15),
            "emergence_end": date(reference_year, 4, 30),
            "harvest_start": date(reference_year, 6, 1),
            "harvest_end": date(reference_year, 9, 15),
        },
        "spring": {
            "emergence_start": date(reference_year, 4, 1),
            "emergence_end": date(reference_year, 7, 1),
            "harvest_start": date(reference_year, 7, 1),
            "harvest_end": date(reference_year, 12, 1),
        },
    }


def in_range(value, start, end):
    return value is not None and start <= value <= end


def clms_zone1_label(emergence, harvest, reference_year):
    """
    Reproduce the published Zone 1 winter/spring main-season limits.

    First test whether emergence AND harvest fit each seasonal limit.
    If exactly one fits, use it.
    If both fit, reproduce the ATBD overlap-priority rule by comparing
    actual detected-season overlap with the winter and spring seasonal
    periods bounded by their emergence-start and harvest-end limits.
    """
    if emergence is None or harvest is None:
        return {
            "classification": "INSUFFICIENT_DATA",
            "reason": "Missing valid emergence or harvest date.",
            "winter_fit": False,
            "spring_fit": False,
            "winter_overlap_days": None,
            "spring_overlap_days": None,
        }

    if harvest < emergence:
        return {
            "classification": "INVALID_TEMPORAL_ORDER",
            "reason": "Harvest precedes emergence.",
            "winter_fit": False,
            "spring_fit": False,
            "winter_overlap_days": None,
            "spring_overlap_days": None,
        }

    duration = (harvest - emergence).days

    if duration < 40 or duration > 365:
        return {
            "classification": "OUTSIDE_CLMS_DURATION_LIMIT",
            "reason": f"Detected season duration {duration} d is outside 40-365 d.",
            "winter_fit": False,
            "spring_fit": False,
            "winter_overlap_days": None,
            "spring_overlap_days": None,
        }

    w = zone1_windows(reference_year)["winter"]
    s = zone1_windows(reference_year)["spring"]

    winter_fit = (
        in_range(emergence, w["emergence_start"], w["emergence_end"])
        and in_range(harvest, w["harvest_start"], w["harvest_end"])
    )

    spring_fit = (
        in_range(emergence, s["emergence_start"], s["emergence_end"])
        and in_range(harvest, s["harvest_start"], s["harvest_end"])
    )

    winter_overlap = overlap_days(
        emergence,
        harvest,
        w["emergence_start"],
        w["harvest_end"],
    )

    spring_overlap = overlap_days(
        emergence,
        harvest,
        s["emergence_start"],
        s["harvest_end"],
    )

    if winter_fit and not spring_fit:
        classification = "WINTER_CYCLE_SIGNAL"
        reason = "Emergence and harvest fit only CLMS Zone 1 winter limits."

    elif spring_fit and not winter_fit:
        classification = "SPRING_CYCLE_SIGNAL"
        reason = "Emergence and harvest fit only CLMS Zone 1 spring limits."

    elif winter_fit and spring_fit:
        if spring_overlap >= winter_overlap:
            classification = "SPRING_CYCLE_SIGNAL"
            reason = (
                "Season fits both Zone 1 limits; CLMS overlap priority "
                "selects spring because spring overlap >= winter overlap."
            )
        else:
            classification = "WINTER_CYCLE_SIGNAL"
            reason = (
                "Season fits both Zone 1 limits; CLMS overlap priority "
                "selects winter because winter overlap > spring overlap."
            )

    else:
        classification = "NO_CLMS_MAIN_SEASON_LABEL"
        reason = (
            "Emergence/harvest pair does not fit the published Zone 1 "
            "winter or spring main-season limits."
        )

    return {
        "classification": classification,
        "reason": reason,
        "winter_fit": winter_fit,
        "spring_fit": spring_fit,
        "winter_overlap_days": winter_overlap,
        "spring_overlap_days": spring_overlap,
    }


def classify_pixel(pixel, reference_year=2023):
    emergence = parse_iso(pixel.get("emergence_date"))
    harvest = parse_iso(pixel.get("harvest_date"))

    result = clms_zone1_label(
        emergence,
        harvest,
        reference_year,
    )

    return {
        "row": pixel.get("row"),
        "column": pixel.get("column"),
        "cty": pixel.get("cty"),
        "crop": TARGET_CROPS.get(pixel.get("cty"), pixel.get("crop")),
        "emergence_date": pixel.get("emergence_date"),
        "emergence_uncertainty_days": pixel.get("emergence_uncertainty_days"),
        "duration_days": pixel.get("duration_days"),
        "duration_confidence": pixel.get("duration_confidence"),
        "harvest_date": pixel.get("harvest_date"),
        "harvest_uncertainty_days": pixel.get("harvest_uncertainty_days"),
        **result,
    }


def distribution(counter):
    total = sum(counter.values())
    return [
        {
            "value": k,
            "count": v,
            "percent": round(v / total * 100, 2) if total else 0.0,
        }
        for k, v in counter.most_common()
    ]


def summarise(rows):
    counter = Counter(row["classification"] for row in rows)
    return {
        "pixels": len(rows),
        "classification": distribution(counter),
    }


def compare_with_v04(v06_rows, v04_data):
    old = {key(p): p for p in v04_data.get("pixels", [])}
    transitions = Counter()
    details = []
    matched = 0

    for row in v06_rows:
        old_row = old.get(key(row))
        if old_row is None:
            continue

        matched += 1
        old_class = old_row.get("classification")
        new_class = row.get("classification")
        transitions[(old_class, new_class)] += 1

        if old_class != new_class:
            details.append({
                "row": row.get("row"),
                "column": row.get("column"),
                "cty": row.get("cty"),
                "crop": row.get("crop"),
                "emergence_date": row.get("emergence_date"),
                "duration_days": row.get("duration_days"),
                "harvest_date": row.get("harvest_date"),
                "v04": old_class,
                "v06": new_class,
                "v06_reason": row.get("reason"),
                "winter_fit": row.get("winter_fit"),
                "spring_fit": row.get("spring_fit"),
                "winter_overlap_days": row.get("winter_overlap_days"),
                "spring_overlap_days": row.get("spring_overlap_days"),
            })

    return {
        "matched_pixels": matched,
        "changed_pixels": len(details),
        "changed_percent": round(
            len(details) / matched * 100, 4
        ) if matched else 0.0,
        "transitions": [
            {"from": a, "to": b, "count": n}
            for (a, b), n in transitions.most_common()
        ],
        "changed_details": details,
    }


def s02_rapeseed_focus(rows, v04_data):
    old = {key(p): p for p in v04_data.get("pixels", [])}
    focus = []

    for row in rows:
        old_row = old.get(key(row))
        if (
            row.get("cty") == 1430
            and old_row is not None
            and old_row.get("classification") == "WEAK_SEASON_SIGNAL"
        ):
            focus.append(row)

    return {
        "pixels": len(focus),
        "classification": distribution(
            Counter(row["classification"] for row in focus)
        ),
        "profiles": [
            {
                "profile": list(profile),
                "count": count,
            }
            for profile, count in Counter(
                (
                    row.get("emergence_date"),
                    row.get("duration_days"),
                    row.get("harvest_date"),
                    row.get("classification"),
                    row.get("winter_fit"),
                    row.get("spring_fit"),
                    row.get("winter_overlap_days"),
                    row.get("spring_overlap_days"),
                )
                for row in focus
            ).most_common(20)
        ],
    }


def print_dist(items, indent="  "):
    for item in items:
        print(
            f"{indent}{item['value']}: "
            f"{item['count']:,} ({item['percent']:.2f}%)"
        )


def main():
    v07_paths = find_v07()
    v04_paths = find_v04()

    print()
    print("=" * 78)
    print("SeedTrade.eu Season Type Classifier v0.6 - CLMS Zone 1 Rules")
    print("Official seasonal-limit reproduction test | v0.4 remains baseline")
    print("=" * 78)

    samples = {}
    combined_target_rows = []
    total_source_pixels = 0

    for sid in SAMPLE_IDS:
        source = load_json(v07_paths[sid])
        baseline = load_json(v04_paths[sid])

        source_pixels = source.get("pixels", [])
        total_source_pixels += len(source_pixels)

        target_pixels = [
            p for p in source_pixels
            if p.get("cty") in TARGET_CROPS
        ]

        rows = [
            classify_pixel(p, 2023)
            for p in target_pixels
        ]

        combined_target_rows.extend(rows)

        comparison = compare_with_v04(
            rows,
            baseline,
        )

        crops = {}
        for crop_code, crop_name in TARGET_CROPS.items():
            crop_rows = [
                row for row in rows
                if row.get("cty") == crop_code
            ]
            crops[str(crop_code)] = {
                "crop": crop_name,
                **summarise(crop_rows),
            }

        focus = (
            s02_rapeseed_focus(rows, baseline)
            if sid == "S02"
            else None
        )

        samples[sid] = {
            "source_v07": str(v07_paths[sid]),
            "baseline_v04": str(v04_paths[sid]),
            "source_pixels": len(source_pixels),
            "target_crop_pixels": len(rows),
            "crops": crops,
            "comparison_vs_v04": comparison,
            "s02_rapeseed_v04_weak_focus": focus,
        }

        print()
        print("-" * 78)
        print(f"{sid} | target pixels: {len(rows):,}")
        print("-" * 78)

        for crop_code, crop_name in TARGET_CROPS.items():
            summary = crops[str(crop_code)]
            if summary["pixels"] == 0:
                continue
            print(f"{crop_name}: {summary['pixels']:,} px")
            print_dist(summary["classification"], indent="    ")

        print(
            f"v0.4 -> v0.6 changed: "
            f"{comparison['changed_pixels']:,} / "
            f"{comparison['matched_pixels']:,} "
            f"({comparison['changed_percent']:.4f}%)"
        )

        if focus is not None:
            print()
            print("S02 RAPESEED | v0.4 WEAK focus:")
            print(f"  Pixels: {focus['pixels']:,}")
            print_dist(focus["classification"], indent="    ")

    combined_by_crop = {}
    for crop_code, crop_name in TARGET_CROPS.items():
        crop_rows = [
            row for row in combined_target_rows
            if row.get("cty") == crop_code
        ]
        combined_by_crop[str(crop_code)] = {
            "crop": crop_name,
            **summarise(crop_rows),
        }

    output = {
        "dataset": "SeedTrade.eu Season Type Classifier v0.6 CLMS Rules",
        "version": VERSION,
        "ruleset_version": RULESET_VERSION,
        "reference_year": 2023,
        "zone": "CLMS_ZONE_1",
        "experimental": True,
        "candidate_adopted": False,
        "v04_remains_baseline": True,
        "cty_used_for_season_label": False,
        "cpcsy_used_for_classification": False,
        "cpmdcl_used_for_weighting": False,
        "official_limits_reproduced": {
            "winter": {
                "emergence": "15 Aug year-1 -> 30 Apr year",
                "harvest": "01 Jun -> 15 Sep",
            },
            "spring": {
                "emergence": "01 Apr -> 01 Jul",
                "harvest": "01 Jul -> 01 Dec",
            },
            "duration_filter_days": "40-365",
            "winter_spring_overlap_priority": (
                "spring if spring overlap >= winter overlap; "
                "otherwise winter"
            ),
        },
        "total_source_pixels": total_source_pixels,
        "total_sampled_area_ha": total_source_pixels * 0.01,
        "samples": samples,
        "combined_target_crop_summary": combined_by_crop,
        "scientific_note": (
            "This script reproduces the published CLMS Zone 1 seasonal "
            "limits as a diagnostic classifier. It does not claim that "
            "SeedTrade has independently validated the CLMS algorithm, "
            "and it does not replace v0.4 automatically."
        ),
    }

    current_date = datetime.now().strftime("%Y-%m-%d")
    output_path = (
        COPERNICUS_DIR
        / (
            "PL_EAST_season_type_classifier_"
            "v06_clms_rules_2023_"
            "5samples_2000ha_"
            f"{current_date}.json"
        )
    )

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(output, f, indent=2, ensure_ascii=False)

    print()
    print("=" * 78)
    print("v0.6 CLMS RULE TEST COMPLETE")
    print("=" * 78)
    print(f"Samples: {len(SAMPLE_IDS)}/{len(SAMPLE_IDS)}")
    print(f"Total source pixels: {total_source_pixels:,}")
    print(f"Total sampled area: {total_source_pixels * 0.01:,.2f} ha")
    print()
    print("v0.4 remains baseline. v0.6 is experimental.")
    print("CPCSY is not used for classification.")
    print()
    print("JSON saved to:")
    print(output_path)


if __name__ == "__main__":
    main()
