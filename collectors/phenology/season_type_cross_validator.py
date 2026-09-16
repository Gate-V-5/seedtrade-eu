"""
SeedTrade.eu
Season Type Cross Validator v0.1

Purpose
-------
Join, pixel-by-pixel:

1. SeedTrade Season Type Classifier v0.4
2. CLMS Zone 1 rule test v0.6
3. CPCSY from Pixel Intelligence v0.9

and create a diagnostic cross-validation layer.

This script DOES NOT modify either classifier.
CPCSY is NOT used to determine WINTER/SPRING.

Cross-validation statuses
-------------------------
AGREE
    SeedTrade v0.4 and CLMS v0.6 agree on WINTER or SPRING.

CLMS_WINTER_SEEDTRADE_WEAK
    CLMS says WINTER while SeedTrade v0.4 is WEAK.

CLMS_SPRING_SEEDTRADE_WEAK
    CLMS says SPRING while SeedTrade v0.4 is WEAK.

SEEDTRADE_CLMS_CONFLICT
    SeedTrade gives a directional WINTER/SPRING class and CLMS gives
    the opposite directional class.

NO_CLMS_LABEL
    CLMS v0.6 returns NO_CLMS_MAIN_SEASON_LABEL or another non-directional
    temporal outcome.

INSUFFICIENT_DATA
    Either layer cannot provide a usable seasonal comparison.

SEEDTRADE_AMBIGUOUS_CLMS_WINTER
SEEDTRADE_AMBIGUOUS_CLMS_SPRING
    SeedTrade is mixed/ambiguous while CLMS gives a directional label.

SEEDTRADE_DIRECTIONAL_CLMS_INSUFFICIENT
    SeedTrade gives a directional label but CLMS lacks sufficient data.

OTHER_DIAGNOSTIC
    Remaining combinations preserved without forced interpretation.

Important scientific notes
--------------------------
- CPCSY is a separate CLMS cross-layer signal, not an independent source.
- CPCSY does not identify winter vs spring.
- Pixel proportions are descriptive, not probabilities or regional acreage.
- Five 400 ha windows are not claimed to be statistically representative.
"""

import json
from collections import Counter, defaultdict
from datetime import datetime
from pathlib import Path


VERSION = "0.1"

PROJECT_ROOT = Path(__file__).resolve().parents[2]
COPERNICUS_DIR = PROJECT_ROOT / "data" / "raw" / "copernicus"

SAMPLE_IDS = ("S01", "S02", "S03", "S04", "S05")

TARGET_CROPS = {
    1110: "Wheat",
    1120: "Barley",
    1150: "Other cereals",
    1430: "Rapeseed",
}

DIRECTIONAL = {
    "WINTER_CYCLE_SIGNAL": "WINTER",
    "SPRING_CYCLE_SIGNAL": "SPRING",
}


def load_json(path):
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def find_latest(pattern):
    files = sorted(
        COPERNICUS_DIR.glob(pattern),
        key=lambda p: p.name,
    )

    latest = {}

    for path in files:
        for sid in SAMPLE_IDS:
            if f"_{sid}_" in path.name:
                latest[sid] = path
                break

    missing = [
        sid for sid in SAMPLE_IDS
        if sid not in latest
    ]

    if missing:
        raise FileNotFoundError(
            f"Missing files for samples: {', '.join(missing)} | "
            f"pattern={pattern}"
        )

    return {
        sid: latest[sid]
        for sid in SAMPLE_IDS
    }


def find_v04():
    return find_latest(
        "*season_type_classifier_v04_*_S??_2km_400ha_test_*.json"
    )


def find_v09():
    return find_latest(
        "*pixel_intelligence_v09_cpcsy_*_S??_2km_400ha_test_*.json"
    )


def load_v06_combined():
    files = sorted(
        COPERNICUS_DIR.glob(
            "*season_type_classifier_v06_clms_rules_2023_"
            "5samples_2000ha_*.json"
        ),
        key=lambda p: p.name,
    )

    if not files:
        raise FileNotFoundError(
            "No v0.6 CLMS combined JSON found."
        )

    return files[-1], load_json(files[-1])


def pixel_key(pixel):
    return (
        pixel.get("row"),
        pixel.get("column"),
    )


def cpcsy_value(pixel):
    seasons = pixel.get("cpcsy_seasons")

    if seasons == 0:
        return "CPCSY_0"

    if seasons == 1:
        return "CPCSY_1"

    if seasons == 2:
        return "CPCSY_2"

    flag = pixel.get("cpcsy_flag")

    if flag:
        return f"FLAG:{flag}"

    label = pixel.get("cpcsy_label")

    if label:
        return label

    status = pixel.get("cpcsy_status")

    if status:
        return f"STATUS:{status}"

    return "NO_DATA"


def v06_rows_for_sample(v06_data, sid):
    sample = v06_data["samples"][sid]

    rows = []

    for crop_data in sample["crops"].values():
        # Combined v0.6 output stores summaries, not per-pixel rows.
        # Exact changed_details alone are insufficient for a full join.
        # Therefore rebuild the v0.6 classification from v0.9 dates below.
        pass

    return rows


def parse_iso(value):
    if not value:
        return None

    from datetime import date

    try:
        return date.fromisoformat(value)
    except (ValueError, TypeError):
        return None


def overlap_days(start_a, end_a, start_b, end_b):
    start = max(start_a, start_b)
    end = min(end_a, end_b)

    if end < start:
        return 0

    return (end - start).days + 1


def zone1_windows(reference_year):
    from datetime import date

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
    return (
        value is not None
        and start <= value <= end
    )


def reproduce_v06_label(pixel, reference_year=2023):
    emergence = parse_iso(
        pixel.get("emergence_date")
    )

    harvest = parse_iso(
        pixel.get("harvest_date")
    )

    if emergence is None or harvest is None:
        return {
            "classification": "INSUFFICIENT_DATA",
            "reason": "Missing valid emergence or harvest date.",
            "winter_fit": False,
            "spring_fit": False,
        }

    if harvest < emergence:
        return {
            "classification": "INVALID_TEMPORAL_ORDER",
            "reason": "Harvest precedes emergence.",
            "winter_fit": False,
            "spring_fit": False,
        }

    duration = (harvest - emergence).days

    if duration < 40 or duration > 365:
        return {
            "classification": "OUTSIDE_CLMS_DURATION_LIMIT",
            "reason": (
                f"Detected season duration {duration} d "
                f"is outside 40-365 d."
            ),
            "winter_fit": False,
            "spring_fit": False,
        }

    windows = zone1_windows(reference_year)
    w = windows["winter"]
    s = windows["spring"]

    winter_fit = (
        in_range(
            emergence,
            w["emergence_start"],
            w["emergence_end"],
        )
        and in_range(
            harvest,
            w["harvest_start"],
            w["harvest_end"],
        )
    )

    spring_fit = (
        in_range(
            emergence,
            s["emergence_start"],
            s["emergence_end"],
        )
        and in_range(
            harvest,
            s["harvest_start"],
            s["harvest_end"],
        )
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
        reason = "Fits only CLMS Zone 1 winter limits."

    elif spring_fit and not winter_fit:
        classification = "SPRING_CYCLE_SIGNAL"
        reason = "Fits only CLMS Zone 1 spring limits."

    elif winter_fit and spring_fit:
        if spring_overlap >= winter_overlap:
            classification = "SPRING_CYCLE_SIGNAL"
            reason = (
                "Fits both; CLMS overlap priority selects spring."
            )
        else:
            classification = "WINTER_CYCLE_SIGNAL"
            reason = (
                "Fits both; CLMS overlap priority selects winter."
            )

    else:
        classification = "NO_CLMS_MAIN_SEASON_LABEL"
        reason = (
            "Does not fit published Zone 1 winter or spring limits."
        )

    return {
        "classification": classification,
        "reason": reason,
        "winter_fit": winter_fit,
        "spring_fit": spring_fit,
        "winter_overlap_days": winter_overlap,
        "spring_overlap_days": spring_overlap,
    }


def cross_status(seedtrade_class, clms_class):
    seed_dir = DIRECTIONAL.get(seedtrade_class)
    clms_dir = DIRECTIONAL.get(clms_class)

    if seed_dir and clms_dir:
        if seed_dir == clms_dir:
            return "AGREE"
        return "SEEDTRADE_CLMS_CONFLICT"

    if seedtrade_class == "WEAK_SEASON_SIGNAL":
        if clms_dir == "WINTER":
            return "CLMS_WINTER_SEEDTRADE_WEAK"
        if clms_dir == "SPRING":
            return "CLMS_SPRING_SEEDTRADE_WEAK"

    if seedtrade_class == "MIXED_OR_AMBIGUOUS":
        if clms_dir == "WINTER":
            return "SEEDTRADE_AMBIGUOUS_CLMS_WINTER"
        if clms_dir == "SPRING":
            return "SEEDTRADE_AMBIGUOUS_CLMS_SPRING"

    if clms_class == "NO_CLMS_MAIN_SEASON_LABEL":
        return "NO_CLMS_LABEL"

    if (
        seedtrade_class == "INSUFFICIENT_DATA"
        or clms_class == "INSUFFICIENT_DATA"
    ):
        if seed_dir and clms_class == "INSUFFICIENT_DATA":
            return "SEEDTRADE_DIRECTIONAL_CLMS_INSUFFICIENT"
        return "INSUFFICIENT_DATA"

    if clms_class in {
        "INVALID_TEMPORAL_ORDER",
        "OUTSIDE_CLMS_DURATION_LIMIT",
    }:
        return "NO_CLMS_LABEL"

    return "OTHER_DIAGNOSTIC"


def percentage(count, total):
    if not total:
        return 0.0
    return round(
        count / total * 100,
        2,
    )


def distribution(counter):
    total = sum(counter.values())

    return [
        {
            "value": value,
            "count": count,
            "percent": percentage(count, total),
        }
        for value, count in counter.most_common()
    ]


def join_sample(sid, v04_data, v09_data):
    old = {
        pixel_key(p): p
        for p in v04_data.get("pixels", [])
    }

    joined = []

    missing_v04 = 0

    for raw in v09_data.get("pixels", []):
        crop_code = raw.get("cty")

        if crop_code not in TARGET_CROPS:
            continue

        baseline = old.get(
            pixel_key(raw)
        )

        if baseline is None:
            missing_v04 += 1
            continue

        clms = reproduce_v06_label(
            raw,
            2023,
        )

        seedtrade_class = baseline.get(
            "classification"
        )

        clms_class = clms.get(
            "classification"
        )

        joined.append({
            "sample_id": sid,
            "row": raw.get("row"),
            "column": raw.get("column"),
            "cty": crop_code,
            "crop": TARGET_CROPS[crop_code],

            "seedtrade_v04_classification":
                seedtrade_class,

            "seedtrade_v04_evidence_strength":
                baseline.get("evidence_strength"),

            "seedtrade_v04_winter_score":
                baseline.get("winter_score"),

            "seedtrade_v04_spring_score":
                baseline.get("spring_score"),

            "clms_v06_classification":
                clms_class,

            "clms_v06_reason":
                clms.get("reason"),

            "clms_winter_fit":
                clms.get("winter_fit"),

            "clms_spring_fit":
                clms.get("spring_fit"),

            "clms_winter_overlap_days":
                clms.get("winter_overlap_days"),

            "clms_spring_overlap_days":
                clms.get("spring_overlap_days"),

            "cross_validation_status":
                cross_status(
                    seedtrade_class,
                    clms_class,
                ),

            "emergence_date":
                raw.get("emergence_date"),

            "emergence_uncertainty_days":
                raw.get("emergence_uncertainty_days"),

            "duration_days":
                raw.get("duration_days"),

            "harvest_date":
                raw.get("harvest_date"),

            "harvest_uncertainty_days":
                raw.get("harvest_uncertainty_days"),

            "cpcsy":
                cpcsy_value(raw),

            "cpcsy_seasons":
                raw.get("cpcsy_seasons"),

            "cpcsy_status":
                raw.get("cpcsy_status"),

            "cpcsy_flag":
                raw.get("cpcsy_flag"),
        })

    return joined, missing_v04


def summarise(rows):
    status = Counter(
        row["cross_validation_status"]
        for row in rows
    )

    seedtrade = Counter(
        row["seedtrade_v04_classification"]
        for row in rows
    )

    clms = Counter(
        row["clms_v06_classification"]
        for row in rows
    )

    cpcsy = Counter(
        row["cpcsy"]
        for row in rows
    )

    return {
        "pixels": len(rows),
        "cross_validation_status": distribution(status),
        "seedtrade_v04": distribution(seedtrade),
        "clms_v06": distribution(clms),
        "cpcsy": distribution(cpcsy),
    }


def summarise_by_crop(rows):
    result = {}

    for code, name in TARGET_CROPS.items():
        crop_rows = [
            row for row in rows
            if row["cty"] == code
        ]

        result[str(code)] = {
            "crop": name,
            **summarise(crop_rows),
        }

    return result


def build_focus(rows, sid, crop_code):
    focus = [
        row for row in rows
        if (
            row["sample_id"] == sid
            and row["cty"] == crop_code
        )
    ]

    profiles = Counter(
        (
            row["seedtrade_v04_classification"],
            row["clms_v06_classification"],
            row["cross_validation_status"],
            row["emergence_date"],
            row["duration_days"],
            row["harvest_date"],
            row["cpcsy"],
        )
        for row in focus
    )

    return {
        "pixels": len(focus),
        "summary": summarise(focus),
        "top_profiles": [
            {
                "count": count,
                "seedtrade_v04": profile[0],
                "clms_v06": profile[1],
                "status": profile[2],
                "emergence_date": profile[3],
                "duration_days": profile[4],
                "harvest_date": profile[5],
                "cpcsy": profile[6],
            }
            for profile, count
            in profiles.most_common(25)
        ],
    }


def build_s02_weak_rapeseed_focus(rows):
    focus = [
        row for row in rows
        if (
            row["sample_id"] == "S02"
            and row["cty"] == 1430
            and row[
                "seedtrade_v04_classification"
            ] == "WEAK_SEASON_SIGNAL"
        )
    ]

    return {
        "pixels": len(focus),
        "summary": summarise(focus),
        "profiles": [
            {
                "profile": list(profile),
                "count": count,
            }
            for profile, count
            in Counter(
                (
                    row["clms_v06_classification"],
                    row["cross_validation_status"],
                    row["emergence_date"],
                    row["duration_days"],
                    row["harvest_date"],
                    row["cpcsy"],
                )
                for row in focus
            ).most_common(20)
        ],
    }


def print_distribution(items, indent="    "):
    for item in items:
        print(
            f"{indent}{item['value']}: "
            f"{item['count']:,} "
            f"({item['percent']:.2f}%)"
        )


def main():
    v04_paths = find_v04()
    v09_paths = find_v09()

    # Verify that the previously generated v0.6 combined output exists.
    v06_path, _ = load_v06_combined()

    print()
    print("=" * 78)
    print("SeedTrade.eu Season Type Cross Validator v0.1")
    print("v0.4 SeedTrade × v0.6 CLMS × CPCSY")
    print("=" * 78)

    all_rows = []
    samples = {}

    for sid in SAMPLE_IDS:
        v04 = load_json(
            v04_paths[sid]
        )

        v09 = load_json(
            v09_paths[sid]
        )

        rows, missing_v04 = join_sample(
            sid,
            v04,
            v09,
        )

        all_rows.extend(rows)

        summary = summarise(rows)
        crops = summarise_by_crop(rows)

        samples[sid] = {
            "v04_source": str(v04_paths[sid]),
            "v09_source": str(v09_paths[sid]),
            "joined_target_crop_pixels": len(rows),
            "missing_v04_matches": missing_v04,
            "summary": summary,
            "crops": crops,
        }

        print()
        print("-" * 78)
        print(
            f"{sid} | joined target pixels: "
            f"{len(rows):,}"
        )
        print("-" * 78)

        print("Cross-validation status:")
        print_distribution(
            summary["cross_validation_status"]
        )

    s02_focus = build_s02_weak_rapeseed_focus(
        all_rows
    )

    s04_rapeseed = build_focus(
        all_rows,
        "S04",
        1430,
    )

    combined = summarise(
        all_rows
    )

    combined_crops = summarise_by_crop(
        all_rows
    )

    print()
    print("=" * 78)
    print("S02 RAPESEED | v0.4 WEAK FOCUS")
    print("=" * 78)
    print(
        f"Pixels: {s02_focus['pixels']:,}"
    )
    print_distribution(
        s02_focus["summary"][
            "cross_validation_status"
        ]
    )
    print("CLMS:")
    print_distribution(
        s02_focus["summary"]["clms_v06"]
    )
    print("CPCSY:")
    print_distribution(
        s02_focus["summary"]["cpcsy"]
    )

    print()
    print("=" * 78)
    print("S04 RAPESEED DIAGNOSTIC")
    print("=" * 78)
    print(
        f"Pixels: {s04_rapeseed['pixels']:,}"
    )
    print_distribution(
        s04_rapeseed["summary"][
            "cross_validation_status"
        ]
    )

    print()
    print("=" * 78)
    print("COMBINED CROSS-VALIDATION SUMMARY")
    print("=" * 78)
    print(
        f"Target crop pixels: {len(all_rows):,}"
    )
    print_distribution(
        combined["cross_validation_status"]
    )

    current_date = datetime.now().strftime(
        "%Y-%m-%d"
    )

    output_path = (
        COPERNICUS_DIR
        / (
            "PL_EAST_"
            "season_type_cross_validator_"
            "v01_"
            "2023_"
            "5samples_2000ha_"
            f"{current_date}.json"
        )
    )

    result = {
        "dataset":
            "SeedTrade.eu Season Type Cross Validator",

        "version":
            VERSION,

        "diagnostic_only":
            True,

        "seedtrade_classifier":
            "v0.4",

        "clms_rule_layer":
            "v0.6 CLMS Zone 1",

        "v06_reference_output":
            str(v06_path),

        "cpcsy_role":
            "SEPARATE_CLMS_CROSS_LAYER_SIGNAL",

        "independence_claimed":
            False,

        "cpcsy_used_for_classification":
            False,

        "classifier_modified":
            False,

        "representative_regional_sample":
            False,

        "probabilities_generated":
            False,

        "samples":
            samples,

        "combined_summary":
            combined,

        "combined_by_crop":
            combined_crops,

        "s02_rapeseed_v04_weak_focus":
            s02_focus,

        "s04_rapeseed_diagnostic":
            s04_rapeseed,

        "scientific_note":
            (
                "This layer compares SeedTrade v0.4 with the "
                "CLMS Zone 1 rule reproduction and CPCSY. "
                "CPCSY is a separate CLMS cross-layer signal "
                "and does not identify winter versus spring. "
                "No classifier is automatically adopted or changed."
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
    print("CROSS-VALIDATION COMPLETE")
    print("=" * 78)
    print()
    print("No classifier rules were changed.")
    print(
        "CPCSY is used only as a separate "
        "CLMS cross-layer validation signal."
    )
    print()
    print("JSON saved to:")
    print(output_path)


if __name__ == "__main__":
    main()
