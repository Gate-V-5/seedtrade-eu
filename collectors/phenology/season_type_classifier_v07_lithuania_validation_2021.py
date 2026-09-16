"""
SeedTrade.eu
Season Type Classifier v0.7 - Hybrid CLMS + Agronomic Validation

Architecture
------------
1. CLMS Zone 1 seasonal geometry is the PRIMARY season-cycle layer.
2. SeedTrade v0.4 is retained as a crop-specific AGRONOMIC validation layer.
3. CPCSY is retained as a SEPARATE CLMS cross-layer signal.
4. No arbitrary score tuning is introduced in v0.7.
5. v0.4 remains unchanged and is used only as an input/baseline.

Final v0.7 classes
------------------
WINTER_CYCLE_SIGNAL
SPRING_CYCLE_SIGNAL
NO_CLMS_MAIN_SEASON_LABEL
INSUFFICIENT_DATA

Validation statuses
-------------------
AGRONOMIC_AGREE
AGRONOMIC_WEAK_SUPPORT
AGRONOMIC_AMBIGUOUS
AGRONOMIC_CONFLICT
AGRONOMIC_INSUFFICIENT
NO_CLMS_LABEL

Confidence tiers
----------------
HIGH
    CLMS directional label + SeedTrade v0.4 agrees directionally.

MODERATE
    CLMS directional label + SeedTrade is WEAK or MIXED/AMBIGUOUS.

LOW
    CLMS directional label + SeedTrade gives the opposite direction,
    or CLMS has no usable directional label.

Important
---------
- Confidence is an internal evidence tier, NOT an official CLMS confidence.
- CPCSY does NOT identify winter vs spring and does not change the final class.
- CPMCDCL is not used for weighting.
- Pixel percentages are descriptive, not probabilities or regional acreage.
- This is an experimental production-candidate architecture, not yet adopted.
"""

import json
from collections import Counter
from datetime import date, datetime
from pathlib import Path


VERSION = "0.7-hybrid"
RULESET_VERSION = "CLMS_ZONE1_PRIMARY_SEEDTRADE_V04_VALIDATION_V01"

VALIDATION_YEAR = 2021
VALIDATION_MODE = "OUT_OF_SAMPLE_FROZEN_RULES_GEOGRAPHIC_TRANSFER"
SOURCE_REGION_CODE = "LT_VALIDATION"
SOURCE_V04_CALENDAR_PROXY = "PL_EAST"
GEOGRAPHIC_TRANSFER_TEST = True

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


def find_v04():
    return find_latest(
        f"LT_VALIDATION_season_type_classifier_v04_multiyear_validation_"
        f"{VALIDATION_YEAR}_S??_2km_400ha_test_*.json"
    )


def find_multiyear_raw():
    return find_latest(
        f"LT_VALIDATION_multiyear_validation_pixel_intelligence_"
        f"{VALIDATION_YEAR}_S??_2km_400ha_test_*.json"
    )


def pixel_key(pixel):
    return (pixel.get("row"), pixel.get("column"))


def parse_iso(value):
    if not value:
        return None

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


def clms_zone1_classification(pixel, reference_year=VALIDATION_YEAR):
    emergence = parse_iso(pixel.get("emergence_date"))
    harvest = parse_iso(pixel.get("harvest_date"))

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
            "classification": "NO_CLMS_MAIN_SEASON_LABEL",
            "reason": "Harvest precedes emergence.",
            "winter_fit": False,
            "spring_fit": False,
            "winter_overlap_days": None,
            "spring_overlap_days": None,
        }

    duration = (harvest - emergence).days

    if duration < 40 or duration > 366:
        return {
            "classification": "NO_CLMS_MAIN_SEASON_LABEL",
            "reason": (
                f"Detected season duration {duration} d is outside "
                f"the 40-366 d main-season constraint."
            ),
            "winter_fit": False,
            "spring_fit": False,
            "winter_overlap_days": None,
            "spring_overlap_days": None,
        }

    windows = zone1_windows(reference_year)
    winter = windows["winter"]
    spring = windows["spring"]

    winter_fit = (
        in_range(
            emergence,
            winter["emergence_start"],
            winter["emergence_end"],
        )
        and in_range(
            harvest,
            winter["harvest_start"],
            winter["harvest_end"],
        )
    )

    spring_fit = (
        in_range(
            emergence,
            spring["emergence_start"],
            spring["emergence_end"],
        )
        and in_range(
            harvest,
            spring["harvest_start"],
            spring["harvest_end"],
        )
    )

    winter_overlap = overlap_days(
        emergence,
        harvest,
        winter["emergence_start"],
        winter["harvest_end"],
    )

    spring_overlap = overlap_days(
        emergence,
        harvest,
        spring["emergence_start"],
        spring["harvest_end"],
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
                "Season fits both CLMS Zone 1 limits; overlap priority "
                "selects spring."
            )
        else:
            classification = "WINTER_CYCLE_SIGNAL"
            reason = (
                "Season fits both CLMS Zone 1 limits; overlap priority "
                "selects winter."
            )

    else:
        classification = "NO_CLMS_MAIN_SEASON_LABEL"
        reason = (
            "Emergence/harvest pair does not fit the published CLMS "
            "Zone 1 winter or spring main-season limits."
        )

    return {
        "classification": classification,
        "reason": reason,
        "winter_fit": winter_fit,
        "spring_fit": spring_fit,
        "winter_overlap_days": winter_overlap,
        "spring_overlap_days": spring_overlap,
    }


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


def validation_status(clms_class, seedtrade_class):
    clms_direction = DIRECTIONAL.get(clms_class)
    seedtrade_direction = DIRECTIONAL.get(seedtrade_class)

    if clms_direction is None:
        if clms_class == "INSUFFICIENT_DATA":
            return "AGRONOMIC_INSUFFICIENT"
        return "NO_CLMS_LABEL"

    if seedtrade_direction is not None:
        if seedtrade_direction == clms_direction:
            return "AGRONOMIC_AGREE"
        return "AGRONOMIC_CONFLICT"

    if seedtrade_class == "WEAK_SEASON_SIGNAL":
        return "AGRONOMIC_WEAK_SUPPORT"

    if seedtrade_class == "MIXED_OR_AMBIGUOUS":
        return "AGRONOMIC_AMBIGUOUS"

    if seedtrade_class == "INSUFFICIENT_DATA":
        return "AGRONOMIC_INSUFFICIENT"

    return "AGRONOMIC_INSUFFICIENT"


def internal_confidence_tier(clms_class, validation):
    if clms_class not in DIRECTIONAL:
        return "LOW"

    if validation == "AGRONOMIC_AGREE":
        return "HIGH"

    if validation in {
        "AGRONOMIC_WEAK_SUPPORT",
        "AGRONOMIC_AMBIGUOUS",
    }:
        return "MODERATE"

    return "LOW"


def classify_pixel(raw, baseline):
    clms = clms_zone1_classification(raw, VALIDATION_YEAR)

    seedtrade_class = baseline.get("classification")
    clms_class = clms["classification"]

    validation = validation_status(
        clms_class,
        seedtrade_class,
    )

    confidence = internal_confidence_tier(
        clms_class,
        validation,
    )

    return {
        "row": raw.get("row"),
        "column": raw.get("column"),
        "cty": raw.get("cty"),
        "crop": TARGET_CROPS.get(raw.get("cty")),

        "final_classification":
            clms_class,

        "internal_confidence_tier":
            confidence,

        "agronomic_validation_status":
            validation,

        "clms_primary": {
            "classification":
                clms_class,

            "reason":
                clms.get("reason"),

            "winter_fit":
                clms.get("winter_fit"),

            "spring_fit":
                clms.get("spring_fit"),

            "winter_overlap_days":
                clms.get("winter_overlap_days"),

            "spring_overlap_days":
                clms.get("spring_overlap_days"),
        },

        "seedtrade_v04_validation": {
            "classification":
                seedtrade_class,

            "evidence_strength":
                baseline.get("evidence_strength"),

            "winter_score":
                baseline.get("winter_score"),

            "spring_score":
                baseline.get("spring_score"),

            "score_difference":
                baseline.get("score_difference"),

            "core_data_count":
                baseline.get("core_data_count"),
        },

        "phenology_inputs": {
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
        },

        "cpcsy_cross_layer": {
            "role":
                "SEPARATE_CLMS_CROSS_LAYER_SIGNAL",

            "used_for_classification":
                False,

            "independence_claimed":
                False,

            "value":
                cpcsy_value(raw),

            "seasons":
                raw.get("cpcsy_seasons"),

            "status":
                raw.get("cpcsy_status"),

            "flag":
                raw.get("cpcsy_flag"),
        },
    }


def distribution(counter):
    total = sum(counter.values())

    return [
        {
            "value": value,
            "count": count,
            "percent": round(
                count / total * 100,
                2,
            ) if total else 0.0,
        }
        for value, count in counter.most_common()
    ]


def summarise(rows):
    return {
        "pixels": len(rows),

        "final_classification":
            distribution(
                Counter(
                    row["final_classification"]
                    for row in rows
                )
            ),

        "internal_confidence_tier":
            distribution(
                Counter(
                    row["internal_confidence_tier"]
                    for row in rows
                )
            ),

        "agronomic_validation_status":
            distribution(
                Counter(
                    row["agronomic_validation_status"]
                    for row in rows
                )
            ),

        "cpcsy":
            distribution(
                Counter(
                    row["cpcsy_cross_layer"]["value"]
                    for row in rows
                )
            ),
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


def comparison_vs_v04(rows):
    transitions = Counter()

    directional_match = 0
    directional_conflict = 0
    compared_directional = 0

    for row in rows:
        old = row[
            "seedtrade_v04_validation"
        ]["classification"]

        new = row["final_classification"]

        transitions[(old, new)] += 1

        old_direction = DIRECTIONAL.get(old)
        new_direction = DIRECTIONAL.get(new)

        if (
            old_direction is not None
            and new_direction is not None
        ):
            compared_directional += 1

            if old_direction == new_direction:
                directional_match += 1
            else:
                directional_conflict += 1

    return {
        "directional_pixels_compared":
            compared_directional,

        "directional_match":
            directional_match,

        "directional_conflict":
            directional_conflict,

        "directional_match_percent":
            round(
                directional_match
                / compared_directional
                * 100,
                2,
            ) if compared_directional else 0.0,

        "directional_conflict_percent":
            round(
                directional_conflict
                / compared_directional
                * 100,
                2,
            ) if compared_directional else 0.0,

        "transitions": [
            {
                "from_v04": old,
                "to_v07": new,
                "count": count,
            }
            for (old, new), count
            in transitions.most_common()
        ],
    }


def focus_s02_rapeseed(rows):
    focus = [
        row for row in rows
        if (
            row["crop"] == "Rapeseed"
            and row[
                "seedtrade_v04_validation"
            ]["classification"] == "WEAK_SEASON_SIGNAL"
        )
    ]

    return {
        "pixels": len(focus),
        "summary": summarise(focus),
    }


def focus_conflicts(rows):
    focus = [
        row for row in rows
        if row[
            "agronomic_validation_status"
        ] == "AGRONOMIC_CONFLICT"
    ]

    return {
        "pixels": len(focus),

        "by_crop":
            distribution(
                Counter(
                    row["crop"]
                    for row in focus
                )
            ),

        "final_classification":
            distribution(
                Counter(
                    row["final_classification"]
                    for row in focus
                )
            ),

        "old_classification":
            distribution(
                Counter(
                    row[
                        "seedtrade_v04_validation"
                    ]["classification"]
                    for row in focus
                )
            ),

        "confidence":
            distribution(
                Counter(
                    row["internal_confidence_tier"]
                    for row in focus
                )
            ),
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
    raw_paths = find_multiyear_raw()

    print()
    print("=" * 78)
    print("SeedTrade.eu Season Type Classifier v0.7 - Multi-Year Validation")
    print(f"LT_VALIDATION | {VALIDATION_YEAR} | frozen geographic-transfer validation")
    print("CLMS season geometry -> SeedTrade agronomic validation -> confidence")
    print("=" * 78)

    all_rows = []
    samples = {}

    for sid in SAMPLE_IDS:
        v04 = load_json(v04_paths[sid])
        raw_data = load_json(raw_paths[sid])

        baseline_by_pixel = {
            pixel_key(pixel): pixel
            for pixel in v04.get("pixels", [])
        }

        rows = []

        for raw in raw_data.get("pixels", []):
            crop_code = raw.get("cty")

            if crop_code not in TARGET_CROPS:
                continue

            baseline = baseline_by_pixel.get(
                pixel_key(raw)
            )

            if baseline is None:
                continue

            rows.append(
                classify_pixel(
                    raw,
                    baseline,
                )
            )

        all_rows.extend(rows)

        sample_summary = summarise(rows)
        crop_summary = summarise_by_crop(rows)
        comparison = comparison_vs_v04(rows)

        samples[sid] = {
            "v04_source":
                str(v04_paths[sid]),

            "raw_multiyear_source":
                str(raw_paths[sid]),

            "pixels":
                rows,

            "summary":
                sample_summary,

            "by_crop":
                crop_summary,

            "comparison_vs_v04":
                comparison,
        }

        print()
        print("-" * 78)
        print(f"{sid} | target pixels: {len(rows):,}")
        print("-" * 78)

        print("Final classification:")
        print_distribution(
            sample_summary["final_classification"]
        )

        print("Internal confidence:")
        print_distribution(
            sample_summary["internal_confidence_tier"]
        )

        print("Agronomic validation:")
        print_distribution(
            sample_summary["agronomic_validation_status"]
        )

    combined_summary = summarise(all_rows)
    combined_by_crop = summarise_by_crop(all_rows)
    combined_comparison = comparison_vs_v04(all_rows)
    conflicts = focus_conflicts(all_rows)

    s02_rows = samples["S02"]["pixels"]

    s02_rapeseed_weak = focus_s02_rapeseed(
        s02_rows
    )

    print()
    print("=" * 78)
    print("COMBINED v0.7 SUMMARY")
    print("=" * 78)
    print(f"Target pixels: {len(all_rows):,}")

    print("Final classification:")
    print_distribution(
        combined_summary["final_classification"]
    )

    print("Internal confidence:")
    print_distribution(
        combined_summary["internal_confidence_tier"]
    )

    print("Agronomic validation:")
    print_distribution(
        combined_summary["agronomic_validation_status"]
    )

    print()
    print("Directional comparison vs v0.4:")
    print(
        f"  Compared: "
        f"{combined_comparison['directional_pixels_compared']:,}"
    )
    print(
        f"  Match: "
        f"{combined_comparison['directional_match']:,} "
        f"({combined_comparison['directional_match_percent']:.2f}%)"
    )
    print(
        f"  Conflict: "
        f"{combined_comparison['directional_conflict']:,} "
        f"({combined_comparison['directional_conflict_percent']:.2f}%)"
    )

    print()
    print("S02 RAPESEED | v0.4 WEAK focus:")
    print(
        f"  Pixels: "
        f"{s02_rapeseed_weak['pixels']:,}"
    )
    print("  v0.7 final:")
    print_distribution(
        s02_rapeseed_weak[
            "summary"
        ]["final_classification"],
        indent="    ",
    )
    print("  confidence:")
    print_distribution(
        s02_rapeseed_weak[
            "summary"
        ]["internal_confidence_tier"],
        indent="    ",
    )

    current_date = datetime.now().strftime(
        "%Y-%m-%d"
    )

    output_path = (
        COPERNICUS_DIR
        / (
            "LT_VALIDATION_"
            "season_type_classifier_"
            "v07_hybrid_multiyear_validation_"
            f"{VALIDATION_YEAR}_"
            "5samples_2000ha_"
            f"{current_date}.json"
        )
    )

    result = {
        "dataset":
            "SeedTrade.eu Season Type Classifier v0.7 Hybrid - Multi-Year Validation",

        "version":
            VERSION,

        "ruleset_version":
            RULESET_VERSION,

        "experimental":
            True,

        "production_candidate":
            True,

        "adopted_as_production":
            False,

        "reference_year":
            VALIDATION_YEAR,

        "validation_mode":
            VALIDATION_MODE,

        "classifier_rules_frozen":
            True,

        "source_region_code":
            SOURCE_REGION_CODE,

        "geographic_transfer_test":
            GEOGRAPHIC_TRANSFER_TEST,

        "source_v04_calendar_proxy":
            SOURCE_V04_CALENDAR_PROXY,

        "clms_zone1_transfer_status":
            "FROZEN_RULE_TRANSFER_NOT_LOCAL_ZONE_RECALIBRATION",

        "clms_zone":
            "ZONE_1",

        "architecture": {
            "primary_season_cycle_layer":
                "CLMS_ZONE1_SEASONAL_GEOMETRY",

            "crop_specific_validation_layer":
                "SEEDTRADE_V04",

            "cross_layer_signal":
                "CPCSY",

            "cpcsy_used_for_classification":
                False,

            "independence_claimed":
                False,

            "cpmdcl_used_for_weighting":
                False,

            "new_score_tuning_introduced":
                False,
        },

        "confidence_definition": {
            "HIGH":
                "CLMS directional class and SeedTrade v0.4 agree.",

            "MODERATE":
                "CLMS directional class with SeedTrade WEAK or AMBIGUOUS.",

            "LOW":
                "Directional conflict or no usable CLMS directional label.",

            "official_clms_confidence":
                False,
        },

        "combined_summary":
            combined_summary,

        "combined_by_crop":
            combined_by_crop,

        "combined_comparison_vs_v04":
            combined_comparison,

        "combined_conflict_focus":
            conflicts,

        "s02_rapeseed_v04_weak_focus":
            s02_rapeseed_weak,

        "samples":
            samples,

        "scientific_note":
            (
                f"This is a frozen-rule geographic-transfer validation for "
                f"LT_VALIDATION in {VALIDATION_YEAR}. v0.7 applies the same "
                "CLMS Zone 1 seasonal geometry used in the PL_EAST experiments "
                "as the primary cycle label and retains the frozen SeedTrade "
                "v0.4 geographic-transfer baseline as the crop-specific "
                "validation layer. No Lithuania-specific threshold or calendar "
                "tuning is introduced. Internal confidence tiers describe "
                "agreement between evidence layers and are not official CLMS "
                "confidence values. CPCSY is a separate CLMS cross-layer signal "
                "and does not identify winter versus spring. This run tests "
                "transferability; it is not a locally recalibrated Lithuania model."
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
    print("v0.7 HYBRID TEST COMPLETE")
    print("=" * 78)
    print("v0.4 was not modified.")
    print("No new arbitrary score tuning was introduced.")
    print("Frozen v0.7 rules were applied without tuning.")
    print(f"Geographic-transfer validation year: {VALIDATION_YEAR}")
    print()
    print("JSON saved to:")
    print(output_path)


if __name__ == "__main__":
    main()
