"""
SeedTrade.eu
Season Type Classifier v0.4

Purpose
-------
Classify Copernicus crop pixels into broad seasonal crop-cycle signals.

v0.3:
- reads five Copernicus Pixel Intelligence v0.7 / 400 ha sample results
- supports 5 x 40,000-pixel cross-sample analysis
- uses regional crop-calendar priors
- uses official emergence uncertainty
- uses official harvest uncertainty
- preserves CPMCDCL raw/confidence values
- DOES NOT use CPMCDCL for evidence weighting
- produces aggregated crop summaries
- does not generate fake probability percentages

IMPORTANT
---------
This is NOT a botanical variety classifier.

WINTER_CYCLE_SIGNAL means that available observations are
consistent with an autumn-established / overwintering crop cycle.

SPRING_CYCLE_SIGNAL means that available observations are
consistent with a spring-established crop cycle.
"""

import json

from collections import Counter
from datetime import datetime, date
from pathlib import Path


# ============================================================
# PATHS
# ============================================================

PROJECT_ROOT = Path(__file__).resolve().parents[2]

COPERNICUS_DIR = (
    PROJECT_ROOT
    / "data"
    / "raw"
    / "copernicus"
)


# ============================================================
# VERSION
# ============================================================

CLASSIFIER_VERSION = "0.4"

RULESET_VERSION = "0.2-preliminary"

# Frozen out-of-sample validation year. v0.4 rules are unchanged.
VALIDATION_YEAR = 2021

# Geographic transfer validation adapter.
# IMPORTANT:
# - v0.4 scoring rules, thresholds and crop-calendar values are NOT changed.
# - LT_VALIDATION reuses the frozen PL_EAST v0.4 calendar as a proxy solely
#   to test geographic transferability before Lithuania-specific calibration.
SOURCE_REGION_CODE = "LT_VALIDATION"
FROZEN_CALENDAR_PROXY = "PL_EAST"
VALIDATION_MODE = "OUT_OF_SAMPLE_FROZEN_V04_GEOGRAPHIC_TRANSFER"



# ============================================================
# CROPS
# ============================================================

SEASONAL_CROP_CODES = {
    1110: "Wheat",
    1120: "Barley",
    1150: "Other cereals",
    1430: "Rapeseed",
}


# ============================================================
# CROP SPECIFICITY
# ============================================================

CROP_SPECIFICITY = {
    1110: "BROAD_CROP_CLASS",
    1120: "BROAD_CROP_CLASS",
    1150: "VERY_BROAD_CEREAL_CLASS",
    1430: "BROAD_CROP_CLASS",
}


# ============================================================
# REGIONAL CALENDAR
# ============================================================
#
# Preliminary SeedTrade agronomic priors.
#
# NOT official Copernicus observations.
#
# These windows still require validation against authoritative
# regional agronomic sources / JRC / national crop calendars.
#
# Format:
# (
#     start_month,
#     start_day,
#     end_month,
#     end_day,
# )
# ============================================================

REGIONAL_CALENDARS = {

    "PL_EAST": {

        1110: {
            "crop": "Wheat",

            "winter_emergence_window": (
                8, 20,
                11, 30,
            ),

            "spring_emergence_window": (
                2, 15,
                5, 31,
            ),

            "winter_harvest_window": (
                6, 15,
                8, 31,
            ),

            "spring_harvest_window": (
                7, 1,
                9, 30,
            ),

            "winter_duration_min": 180,

            "spring_duration_max": 180,
        },

        1120: {
            "crop": "Barley",

            "winter_emergence_window": (
                8, 20,
                11, 30,
            ),

            "spring_emergence_window": (
                2, 15,
                6, 30,
            ),

            "winter_harvest_window": (
                6, 15,
                8, 31,
            ),

            "spring_harvest_window": (
                7, 1,
                10, 15,
            ),

            "winter_duration_min": 180,

            "spring_duration_max": 180,
        },

        1150: {
            "crop": "Other cereals",

            "winter_emergence_window": (
                8, 20,
                11, 30,
            ),

            "spring_emergence_window": (
                2, 1,
                6, 30,
            ),

            "winter_harvest_window": (
                6, 1,
                8, 31,
            ),

            "spring_harvest_window": (
                6, 15,
                10, 15,
            ),

            "winter_duration_min": 180,

            "spring_duration_max": 180,
        },

        1430: {
            "crop": "Rapeseed",

            "winter_emergence_window": (
                7, 15,
                10, 15,
            ),

            "spring_emergence_window": (
                3, 1,
                6, 15,
            ),

            "winter_harvest_window": (
                6, 15,
                8, 31,
            ),

            "spring_harvest_window": (
                7, 1,
                10, 15,
            ),

            "winter_duration_min": 180,

            "spring_duration_max": 180,
        },
    },
}


# ============================================================
# SOURCE
# ============================================================


# Geographic-transfer alias only.
# This does NOT create Lithuania-specific agronomic priors.
REGIONAL_CALENDARS[SOURCE_REGION_CODE] = REGIONAL_CALENDARS[FROZEN_CALENDAR_PROXY]


def find_validation_sample_jsons():

    files = sorted(
        COPERNICUS_DIR.glob(
            f"LT_VALIDATION_multiyear_validation_pixel_intelligence_{VALIDATION_YEAR}_S??_2km_400ha_test_*.json"
        ),
        key=lambda path: path.name,
    )

    if not files:
        raise FileNotFoundError(
            f"No {VALIDATION_YEAR} multi-year validation sample JSON files found."
        )

    latest_by_sample = {}

    for path in files:
        name = path.name

        sample_id = None

        for candidate in ("S01", "S02", "S03", "S04", "S05"):
            if f"_{candidate}_" in name:
                sample_id = candidate
                break

        if sample_id is not None:
            latest_by_sample[sample_id] = path

    ordered = [
        latest_by_sample[sample_id]
        for sample_id in ("S01", "S02", "S03", "S04", "S05")
        if sample_id in latest_by_sample
    ]

    if len(ordered) != 5:
        raise FileNotFoundError(
            f"Expected 5 validation samples (S01-S05), found {len(ordered)}."
        )

    return ordered


def load_json(path):

    with open(
        path,
        "r",
        encoding="utf-8",
    ) as file:

        return json.load(
            file
        )


# ============================================================
# DATE HELPERS
# ============================================================

def parse_date(value):

    if not value:
        return None

    try:

        return datetime.fromisoformat(
            value
        ).date()

    except (
        ValueError,
        TypeError,
    ):

        return None


def month_day_number(
    month,
    day,
):

    return date(
        2000,
        month,
        day,
    ).timetuple().tm_yday


def date_month_day_number(
    value,
):

    return month_day_number(
        value.month,
        value.day,
    )


def date_in_window(
    value,
    window,
):

    if value is None:
        return False

    (
        start_month,
        start_day,
        end_month,
        end_day,
    ) = window

    current = (
        date_month_day_number(
            value
        )
    )

    start = (
        month_day_number(
            start_month,
            start_day,
        )
    )

    end = (
        month_day_number(
            end_month,
            end_day,
        )
    )

    if start <= end:

        return (
            start
            <= current
            <= end
        )

    return (
        current >= start
        or current <= end
    )


# ============================================================
# UNCERTAINTY QUALITY
# ============================================================
#
# SeedTrade technical weighting.
#
# It is NOT an official Copernicus confidence classification.
#
# Used only to prevent highly uncertain date observations from
# contributing equally to very precise date observations.
# ============================================================

def uncertainty_weight(
    uncertainty_days,
):

    if uncertainty_days is None:
        return 0.50

    if uncertainty_days <= 5:
        return 1.00

    if uncertainty_days <= 10:
        return 0.85

    if uncertainty_days <= 20:
        return 0.65

    if uncertainty_days <= 30:
        return 0.45

    return 0.25


# ============================================================
# EVIDENCE
# ============================================================

def add_evidence(
    evidence,
    signal,
    direction,
    base_weight,
    quality_weight,
    source,
    explanation,
):

    weighted_score = (
        base_weight
        * quality_weight
    )

    evidence.append(
        {
            "signal":
                signal,

            "direction":
                direction,

            "base_weight":
                base_weight,

            "quality_weight":
                round(
                    quality_weight,
                    3,
                ),

            "weighted_score":
                round(
                    weighted_score,
                    3,
                ),

            "source":
                source,

            "explanation":
                explanation,
        }
    )

    return weighted_score


# ============================================================
# CLASSIFIER
# ============================================================

def classify_supported_pixel(
    pixel,
    region_code,
):

    crop_code = pixel.get(
        "cty"
    )

    regional_calendar = (
        REGIONAL_CALENDARS.get(
            region_code,
            {}
        )
    )

    crop_calendar = (
        regional_calendar.get(
            crop_code
        )
    )

    if crop_calendar is None:

        return {
            "classification":
                "INSUFFICIENT_REGIONAL_MODEL",

            "evidence_strength":
                "INSUFFICIENT",

            "winter_score":
                0.0,

            "spring_score":
                0.0,

            "score_difference":
                0.0,

            "evidence":
                [],
        }

    emergence = parse_date(
        pixel.get(
            "emergence_date"
        )
    )

    harvest = parse_date(
        pixel.get(
            "harvest_date"
        )
    )

    duration_days = pixel.get(
        "duration_days"
    )

    emergence_uncertainty = (
        pixel.get(
            "emergence_uncertainty_days"
        )
    )

    harvest_uncertainty = (
        pixel.get(
            "harvest_uncertainty_days"
        )
    )

    duration_confidence = (
        pixel.get(
            "duration_confidence"
        )
    )

    evidence = []

    winter_score = 0.0

    spring_score = 0.0


    # ========================================================
    # EMERGENCE
    # Primary seasonal signal
    # ========================================================

    if emergence is not None:

        emergence_quality = (
            uncertainty_weight(
                emergence_uncertainty
            )
        )

        if date_in_window(
            emergence,
            crop_calendar[
                "winter_emergence_window"
            ],
        ):

            winter_score += (
                add_evidence(
                    evidence,
                    "EMERGENCE_DATE",
                    "WINTER",
                    3.0,
                    emergence_quality,
                    "COPERNICUS_CPMCE_CPMCECL",
                    (
                        f"Emergence "
                        f"{emergence.isoformat()} "
                        f"fits preliminary regional "
                        f"autumn establishment window."
                    ),
                )
            )

        if date_in_window(
            emergence,
            crop_calendar[
                "spring_emergence_window"
            ],
        ):

            spring_score += (
                add_evidence(
                    evidence,
                    "EMERGENCE_DATE",
                    "SPRING",
                    3.0,
                    emergence_quality,
                    "COPERNICUS_CPMCE_CPMCECL",
                    (
                        f"Emergence "
                        f"{emergence.isoformat()} "
                        f"fits preliminary regional "
                        f"spring establishment window."
                    ),
                )
            )


    # ========================================================
    # DURATION
    #
    # CPMCD duration itself is used as supporting evidence.
    #
    # IMPORTANT:
    # CPMCDCL is intentionally NOT used for weighting in v0.3.
    # ========================================================

    if duration_days is not None:

        if (
            duration_days
            >= crop_calendar[
                "winter_duration_min"
            ]
        ):

            winter_score += (
                add_evidence(
                    evidence,
                    "CROP_DURATION",
                    "WINTER",
                    2.0,
                    1.0,
                    "COPERNICUS_CPMCD",
                    (
                        f"Duration "
                        f"{duration_days} days "
                        f"is consistent with a long "
                        f"seasonal crop cycle."
                    ),
                )
            )

        elif (
            duration_days
            <= crop_calendar[
                "spring_duration_max"
            ]
        ):

            spring_score += (
                add_evidence(
                    evidence,
                    "CROP_DURATION",
                    "SPRING",
                    1.5,
                    1.0,
                    "COPERNICUS_CPMCD",
                    (
                        f"Duration "
                        f"{duration_days} days "
                        f"is consistent with a shorter "
                        f"seasonal crop cycle."
                    ),
                )
            )


    # ========================================================
    # HARVEST
    # Supporting signal
    # ========================================================

    if harvest is not None:

        harvest_quality = (
            uncertainty_weight(
                harvest_uncertainty
            )
        )

        winter_harvest = (
            date_in_window(
                harvest,
                crop_calendar[
                    "winter_harvest_window"
                ],
            )
        )

        spring_harvest = (
            date_in_window(
                harvest,
                crop_calendar[
                    "spring_harvest_window"
                ],
            )
        )

        if (
            winter_harvest
            and not spring_harvest
        ):

            winter_score += (
                add_evidence(
                    evidence,
                    "HARVEST_DATE",
                    "WINTER",
                    0.75,
                    harvest_quality,
                    "COPERNICUS_CPMCH_CPMCHCL",
                    (
                        f"Harvest "
                        f"{harvest.isoformat()} "
                        f"fits preliminary winter-cycle "
                        f"harvest timing."
                    ),
                )
            )

        elif (
            spring_harvest
            and not winter_harvest
        ):

            spring_score += (
                add_evidence(
                    evidence,
                    "HARVEST_DATE",
                    "SPRING",
                    0.75,
                    harvest_quality,
                    "COPERNICUS_CPMCH_CPMCHCL",
                    (
                        f"Harvest "
                        f"{harvest.isoformat()} "
                        f"fits preliminary spring-cycle "
                        f"harvest timing."
                    ),
                )
            )

        elif (
            winter_harvest
            and spring_harvest
        ):

            evidence.append(
                {
                    "signal":
                        "HARVEST_DATE",

                    "direction":
                        "NEUTRAL",

                    "base_weight":
                        0.0,

                    "quality_weight":
                        round(
                            harvest_quality,
                            3,
                        ),

                    "weighted_score":
                        0.0,

                    "source":
                        "COPERNICUS_CPMCH_CPMCHCL",

                    "explanation":
                        (
                            f"Harvest "
                            f"{harvest.isoformat()} "
                            f"falls inside overlapping "
                            f"seasonal harvest windows."
                        ),
                }
            )


    # ========================================================
    # DATA COMPLETENESS
    # ========================================================

    core_data_count = sum(
        value is not None
        for value in (
            emergence,
            duration_days,
            harvest,
        )
    )

    if core_data_count == 0:

        return {
            "classification":
                "INSUFFICIENT_DATA",

            "evidence_strength":
                "INSUFFICIENT",

            "winter_score":
                0.0,

            "spring_score":
                0.0,

            "score_difference":
                0.0,

            "core_data_count":
                0,

            "duration_confidence_raw_preserved":
                duration_confidence,

            "duration_confidence_used_in_weighting":
                False,

            "evidence":
                evidence,
        }


    # ========================================================
    # SCORES
    # ========================================================

    winter_score = round(
        winter_score,
        3,
    )

    spring_score = round(
        spring_score,
        3,
    )

    difference = round(
        abs(
            winter_score
            - spring_score
        ),
        3,
    )

    winning_score = max(
        winter_score,
        spring_score,
    )


    # ========================================================
    # EVIDENCE STRENGTH
    # ========================================================

    if (
        core_data_count >= 2
        and winning_score >= 4.0
        and difference >= 2.0
    ):

        evidence_strength = (
            "STRONG"
        )

    elif (
        core_data_count >= 2
        and winning_score >= 2.5
        and difference >= 1.25
    ):

        evidence_strength = (
            "MODERATE"
        )

    elif winning_score > 0:

        evidence_strength = (
            "WEAK"
        )

    else:

        evidence_strength = (
            "INSUFFICIENT"
        )


    # ========================================================
    # BROAD CLASS SAFETY CAP
    # ========================================================
    #
    # "Other cereals" is too broad to claim STRONG crop-specific
    # seasonal classification.
    # ========================================================

    if (
        crop_code == 1150
        and evidence_strength == "STRONG"
    ):

        evidence_strength = (
            "MODERATE"
        )


    # ========================================================
    # CLASS
    # ========================================================

    if evidence_strength in (
        "STRONG",
        "MODERATE",
    ):

        if winter_score > spring_score:

            classification = (
                "WINTER_CYCLE_SIGNAL"
            )

        elif spring_score > winter_score:

            classification = (
                "SPRING_CYCLE_SIGNAL"
            )

        else:

            classification = (
                "MIXED_OR_AMBIGUOUS"
            )

    elif (
        winter_score > 0
        and spring_score > 0
    ):

        classification = (
            "MIXED_OR_AMBIGUOUS"
        )

    elif winning_score > 0:

        classification = (
            "WEAK_SEASON_SIGNAL"
        )

    else:

        classification = (
            "INSUFFICIENT_DATA"
        )


    return {
        "classification":
            classification,

        "evidence_strength":
            evidence_strength,

        "winter_score":
            winter_score,

        "spring_score":
            spring_score,

        "score_difference":
            difference,

        "core_data_count":
            core_data_count,

        "duration_confidence_raw_preserved":
            duration_confidence,

        "duration_confidence_used_in_weighting":
            False,

        "evidence":
            evidence,
    }


# ============================================================
# PIXEL
# ============================================================

def classify_pixel(
    pixel,
    region_code,
):

    crop_code = pixel.get(
        "cty"
    )

    base_result = {
        "pixel":
            pixel.get(
                "pixel"
            ),

        "row":
            pixel.get(
                "row"
            ),

        "column":
            pixel.get(
                "column"
            ),

        "cty":
            crop_code,

        "crop":
            pixel.get(
                "crop"
            ),

        "crop_specificity":
            CROP_SPECIFICITY.get(
                crop_code,
                "NOT_APPLICABLE",
            ),

        "region_code":
            region_code,

        "emergence_date":
            pixel.get(
                "emergence_date"
            ),

        "emergence_uncertainty_days":
            pixel.get(
                "emergence_uncertainty_days"
            ),

        "duration_days":
            pixel.get(
                "duration_days"
            ),

        "duration_confidence":
            pixel.get(
                "duration_confidence"
            ),

        "harvest_date":
            pixel.get(
                "harvest_date"
            ),

        "harvest_uncertainty_days":
            pixel.get(
                "harvest_uncertainty_days"
            ),
    }

    if crop_code not in (
        SEASONAL_CROP_CODES
    ):

        base_result.update(
            {
                "classification":
                    "NOT_APPLICABLE",

                "evidence_strength":
                    "NOT_APPLICABLE",

                "winter_score":
                    None,

                "spring_score":
                    None,

                "score_difference":
                    None,

                "evidence":
                    [],
            }
        )

        return base_result

    result = (
        classify_supported_pixel(
            pixel,
            region_code,
        )
    )

    base_result.update(
        result
    )

    return base_result


# ============================================================
# SUMMARY
# ============================================================

def build_summary(
    classified_pixels,
):

    crops = {}

    for row in classified_pixels:

        if row[
            "classification"
        ] == "NOT_APPLICABLE":

            continue

        crop_code = row[
            "cty"
        ]

        if crop_code not in crops:

            crops[
                crop_code
            ] = {
                "crop":
                    row[
                        "crop"
                    ],

                "crop_specificity":
                    row[
                        "crop_specificity"
                    ],

                "total_pixels":
                    0,

                "classification_counts":
                    Counter(),

                "strength_counts":
                    Counter(),
            }

        crops[
            crop_code
        ][
            "total_pixels"
        ] += 1

        crops[
            crop_code
        ][
            "classification_counts"
        ][
            row[
                "classification"
            ]
        ] += 1

        crops[
            crop_code
        ][
            "strength_counts"
        ][
            row[
                "evidence_strength"
            ]
        ] += 1

    result = []

    for crop_code, data in (
        sorted(
            crops.items()
        )
    ):

        result.append(
            {
                "cty":
                    crop_code,

                "crop":
                    data[
                        "crop"
                    ],

                "crop_specificity":
                    data[
                        "crop_specificity"
                    ],

                "total_pixels":
                    data[
                        "total_pixels"
                    ],

                "area_ha":
                    round(
                        data[
                            "total_pixels"
                        ]
                        * 0.01,
                        2,
                    ),

                "classification_counts":
                    dict(
                        data[
                            "classification_counts"
                        ]
                    ),

                "evidence_strength_counts":
                    dict(
                        data[
                            "strength_counts"
                        ]
                    ),
            }
        )

    return result


# ============================================================
# PRINT
# ============================================================

def print_result(
    source_path,
    source_data,
    region_code,
    summary,
):

    print()

    print(
        "========================================================"
    )

    print(
        "SeedTrade.eu Season Type Classifier v0.4"
    )

    print(
        "========================================================"
    )

    print()

    print(
        f"Region: {region_code}"
    )

    print(
        f"Source Pixel Intelligence version: "
        f"{source_data.get('version')}"
    )

    print(
        f"Raster: "
        f"{source_data.get('width_pixels')} x "
        f"{source_data.get('height_pixels')}"
    )

    total_pixels = (
        source_data.get(
            "width_pixels",
            0,
        )
        *
        source_data.get(
            "height_pixels",
            0,
        )
    )

    print(
        f"Total pixels: "
        f"{total_pixels:,}"
    )

    print()

    print(
        "Source:"
    )

    print(
        source_path
    )

    print()

    print(
        "--------------------------------------------------------"
    )

    print(
        "SEASON TYPE SUMMARY"
    )

    print(
        "--------------------------------------------------------"
    )

    for crop in summary:

        print()

        print(
            f"{crop['crop']} "
            f"(CTY {crop['cty']})"
        )

        print(
            f"  Crop specificity: "
            f"{crop['crop_specificity']}"
        )

        print(
            f"  Pixels: "
            f"{crop['total_pixels']:,}"
        )

        print(
            f"  Area: "
            f"{crop['area_ha']:.2f} ha"
        )

        print(
            "  Classification:"
        )

        for (
            classification,
            count
        ) in crop[
            "classification_counts"
        ].items():

            percent = (
                count
                / crop[
                    "total_pixels"
                ]
                * 100
            )

            print(
                f"    {classification}: "
                f"{count:,} "
                f"({percent:.2f}%)"
            )

        print(
            "  Evidence strength:"
        )

        for (
            strength,
            count
        ) in crop[
            "evidence_strength_counts"
        ].items():

            percent = (
                count
                / crop[
                    "total_pixels"
                ]
                * 100
            )

            print(
                f"    {strength}: "
                f"{count:,} "
                f"({percent:.2f}%)"
            )

    print()

    print(
        "========================================================"
    )

    print(
        "IMPORTANT"
    )

    print(
        "========================================================"
    )

    print()

    print(
        f"v0.4 rules are frozen and applied to five {VALIDATION_YEAR} / 400 ha Copernicus samples."
    )

    print()

    print(
        "Percentages shown above are proportions of classified "
        "pixels, NOT probabilities."
    )

    print()

    print(
        "CPMCECL emergence uncertainty is used to adjust "
        "emergence evidence."
    )

    print()

    print(
        "CPMCHCL harvest uncertainty is used to adjust "
        "harvest evidence."
    )

    print()

    print(
        "CPMCDCL is preserved in the output but is NOT used "
        "for evidence weighting in v0.4."
    )

    print()

    print(
        "Regional crop-calendar windows remain preliminary "
        "SeedTrade priors."
    )

    print()

    print(
        "WINTER_CYCLE_SIGNAL / SPRING_CYCLE_SIGNAL describe "
        "seasonal crop-cycle evidence."
    )

    print()

    print(
        "They do NOT prove a specific winter or spring variety."
    )

    print()

    print(
        "========================================================"
    )


# ============================================================
# SAVE
# ============================================================

def save_result(
    source_data,
    source_path,
    region_code,
    classified_pixels,
    summary,
    sample_id,
):

    current_date = datetime.now().strftime("%Y-%m-%d")

    output_path = (
        COPERNICUS_DIR
        / (
            f"{region_code}_"
            f"season_type_classifier_"
            f"v04_multiyear_validation_"
            f"{source_data.get('year')}_"
            f"{sample_id}_"
            f"2km_400ha_test_"
            f"{current_date}.json"
        )
    )

    result = {
        "dataset": "SeedTrade.eu Season Type Classifier",
        "version": CLASSIFIER_VERSION,
        "ruleset_version": RULESET_VERSION,
        "model_type": "regional_calendar_evidence_classifier",
        "validation_mode": VALIDATION_MODE,
        "source_region_code": SOURCE_REGION_CODE,
        "frozen_calendar_proxy": FROZEN_CALENDAR_PROXY,
        "geographic_transfer_test": True,
        "validation_year": VALIDATION_YEAR,
        "rules_changed_for_validation": False,
        "sample_id": sample_id,
        "source": str(source_path),
        "source_pixel_intelligence_version": source_data.get("version"),
        "region": source_data.get("region"),
        "year": source_data.get("year"),
        "width_pixels": source_data.get("width_pixels"),
        "height_pixels": source_data.get("height_pixels"),
        "resolution_m": source_data.get("resolution_m"),
        "regional_calendar_status": "PRELIMINARY_NOT_FULLY_VALIDATED",
        "probabilities_generated": False,
        "duration_confidence_used_in_weighting": False,
        "official_inputs": [
            "CTY",
            "CPMCE",
            "CPMCECL",
            "CPMCD",
            "CPMCDCL",
            "CPMCH",
            "CPMCHCL",
        ],
        "seedtrade_rules": [
            "regional_calendar_prior",
            "emergence_uncertainty_weighting",
            "harvest_uncertainty_weighting",
            "duration_supporting_signal",
            "broad_crop_specificity_cap",
        ],
        "summary": summary,
        "pixels": classified_pixels,
    }

    with open(output_path, "w", encoding="utf-8") as file:
        json.dump(result, file, indent=2, ensure_ascii=False)

    return output_path


# ============================================================
# MAIN
# ============================================================

def main():

    source_paths = find_validation_sample_jsons()

    all_sample_results = []
    combined_classified_pixels = []

    print()
    print("========================================================")
    print("SeedTrade.eu Season Type Classifier v0.4 | Multi-Year Validation Runner")
    print(f"LT_VALIDATION | {VALIDATION_YEAR} | frozen v0.4 geographic-transfer classification")
    print("========================================================")

    for source_path in source_paths:

        source_data = load_json(source_path)

        if source_data.get("year") != VALIDATION_YEAR:
            raise ValueError(
                f"Expected validation year {VALIDATION_YEAR}, "
                f"got {source_data.get('year')} in {source_path}"
            )

        region = source_data.get("region", {})
        region_code = region.get("region_code")
        sample_id = source_data.get("sample_id")

        if not region_code:
            raise ValueError(
                f"region_code missing from source data: {source_path}"
            )

        if region_code not in REGIONAL_CALENDARS:
            raise ValueError(
                f"No regional calendar defined for {region_code}"
            )

        if not sample_id:
            raise ValueError(
                f"sample_id missing from v0.7 source: {source_path}"
            )

        pixels = source_data.get("pixels", [])

        if not pixels:
            raise ValueError(
                f"No pixel records found in source: {source_path}"
            )

        print()
        print(
            f"[{sample_id}] Classifying {len(pixels):,} pixels..."
        )

        classified_pixels = [
            classify_pixel(pixel, region_code)
            for pixel in pixels
        ]

        summary = build_summary(classified_pixels)

        print_result(
            source_path,
            source_data,
            region_code,
            summary,
        )

        output_path = save_result(
            source_data,
            source_path,
            region_code,
            classified_pixels,
            summary,
            sample_id,
        )

        print()
        print(f"[{sample_id}] JSON saved to:")
        print(output_path)

        all_sample_results.append(
            {
                "sample_id": sample_id,
                "source": str(source_path),
                "output": str(output_path),
                "summary": summary,
            }
        )

        for row in classified_pixels:
            row_copy = dict(row)
            row_copy["sample_id"] = sample_id
            combined_classified_pixels.append(row_copy)

    combined_summary = build_summary(
        combined_classified_pixels
    )

    current_date = datetime.now().strftime("%Y-%m-%d")

    regional_output_path = (
        COPERNICUS_DIR
        / (
            f"LT_VALIDATION_"
            f"season_type_classifier_"
            f"v04_multiyear_validation_"
            f"{VALIDATION_YEAR}_"
            f"5samples_2000ha_summary_"
            f"{current_date}.json"
        )
    )

    regional_result = {
        "dataset":
            "SeedTrade.eu Season Type Classifier Cross-Sample Summary",

        "version":
            CLASSIFIER_VERSION,

        "ruleset_version":
            RULESET_VERSION,

        "region_code":
            SOURCE_REGION_CODE,

        "frozen_calendar_proxy":
            FROZEN_CALENDAR_PROXY,

        "geographic_transfer_test":
            True,

        "year":
            VALIDATION_YEAR,

        "sample_count":
            len(all_sample_results),

        "total_source_pixels":
            len(source_paths) * 40000,

        "total_sampled_area_ha":
            len(source_paths) * 400.0,

        "probabilities_generated":
            False,

        "duration_confidence_used_in_weighting":
            False,

        "classification_rules_changed_from_v03":
            False,

        "validation_mode":
            VALIDATION_MODE,

        "source_region_code":
            SOURCE_REGION_CODE,

        "frozen_calendar_proxy":
            FROZEN_CALENDAR_PROXY,

        "geographic_transfer_test":
            True,

        "rules_changed_for_validation":
            False,

        "scientific_note":
            (
                "Geographic transfer test only. LT_VALIDATION uses the exact "
                "frozen PL_EAST v0.4 calendar priors without Lithuania-specific "
                "tuning. Results therefore test transferability and are not a "
                "validated Lithuania agronomic calendar."
            ),

        "samples":
            all_sample_results,

        "combined_summary":
            combined_summary,
    }

    with open(
        regional_output_path,
        "w",
        encoding="utf-8",
    ) as file:

        json.dump(
            regional_result,
            file,
            indent=2,
            ensure_ascii=False,
        )

    print()
    print("========================================================")
    print("CROSS-SAMPLE CLASSIFICATION COMPLETE")
    print("========================================================")
    print(f"Samples: {len(all_sample_results)}/5")
    print(
        f"Total source pixels: "
        f"{len(source_paths) * 40000:,}"
    )
    print(
        f"Total sampled area: "
        f"{len(source_paths) * 400.0:,.2f} ha"
    )
    print()
    print("COMBINED SEASON TYPE SUMMARY")
    print("--------------------------------------------------------")

    for crop in combined_summary:

        print()
        print(
            f"{crop['crop']} "
            f"(CTY {crop['cty']})"
        )
        print(
            f"  Pixels: "
            f"{crop['total_pixels']:,}"
        )
        print(
            f"  Area: "
            f"{crop['area_ha']:.2f} ha"
        )

        print("  Classification:")

        for classification, count in (
            crop["classification_counts"].items()
        ):

            percent = (
                count
                / crop["total_pixels"]
                * 100
            )

            print(
                f"    {classification}: "
                f"{count:,} "
                f"({percent:.2f}%)"
            )

        print("  Evidence strength:")

        for strength, count in (
            crop["evidence_strength_counts"].items()
        ):

            percent = (
                count
                / crop["total_pixels"]
                * 100
            )

            print(
                f"    {strength}: "
                f"{count:,} "
                f"({percent:.2f}%)"
            )

    print()
    print("Regional cross-sample JSON saved to:")
    print(regional_output_path)


if __name__ == "__main__":

    main()