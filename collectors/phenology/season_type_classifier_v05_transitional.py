"""
SeedTrade.eu
Season Type Classifier v0.5 Transitional Test

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

v0.5 TRANSITIONAL TEST
----------------------
This experimental version keeps all v0.4 rules unchanged except for one
targeted Rapeseed emergence rule:

- Rapeseed emergence from February 1 through February 29 is treated as a
  transitional seasonal signal.
- It contributes weak evidence to both directions:
      WINTER base weight = 0.8
      SPRING base weight = 1.2
- Official CPMCECL emergence uncertainty still scales both weights.
- CPCSY is NOT used in classification.
- The purpose is to test whether the audited S02 February rapeseed cluster
  can be resolved without materially disturbing the rest of the classifier.
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

CLASSIFIER_VERSION = "0.5-transitional-test"

RULESET_VERSION = "0.3-transitional-test"


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
# v0.5 TRANSITIONAL TEST RULE
# ============================================================
#
# This is an experimental SeedTrade rule derived from the v0.4 rule audit.
# It is NOT an official Copernicus rule and must be validated before adoption.
#
# Only Rapeseed (CTY 1430) is affected.
# February emergence receives low-weight evidence in both directions.
# ============================================================

TRANSITIONAL_EMERGENCE_RULE = {
    1430: {
        "window": (
            2, 1,
            2, 29,
        ),
        "winter_base_weight": 0.8,
        "spring_base_weight": 1.2,
    },
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

def find_latest_v07_sample_jsons():

    files = sorted(
        COPERNICUS_DIR.glob(
            "*pixel_intelligence_v07_*_S??_2km_400ha_test_*.json"
        ),
        key=lambda path: path.name,
    )

    if not files:
        raise FileNotFoundError(
            "No Pixel Intelligence v0.7 multi-sample JSON files found."
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
            f"Expected 5 v0.7 samples (S01-S05), found {len(ordered)}."
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

        # ====================================================
        # v0.5 RAPESEED TRANSITIONAL EMERGENCE TEST
        # ====================================================
        #
        # Applied only when the emergence date does NOT already fall
        # inside the crop's standard winter or spring emergence window.
        #
        # This prevents double-counting if regional calendar windows are
        # changed later.
        # ====================================================

        transitional_rule = (
            TRANSITIONAL_EMERGENCE_RULE.get(
                crop_code
            )
        )

        if transitional_rule is not None:

            in_standard_winter_window = (
                date_in_window(
                    emergence,
                    crop_calendar[
                        "winter_emergence_window"
                    ],
                )
            )

            in_standard_spring_window = (
                date_in_window(
                    emergence,
                    crop_calendar[
                        "spring_emergence_window"
                    ],
                )
            )

            in_transitional_window = (
                date_in_window(
                    emergence,
                    transitional_rule[
                        "window"
                    ],
                )
            )

            if (
                in_transitional_window
                and not in_standard_winter_window
                and not in_standard_spring_window
            ):

                winter_score += (
                    add_evidence(
                        evidence,
                        "EMERGENCE_DATE_TRANSITIONAL",
                        "WINTER",
                        transitional_rule[
                            "winter_base_weight"
                        ],
                        emergence_quality,
                        "SEEDTRADE_V05_TRANSITIONAL_RULE",
                        (
                            f"Rapeseed emergence "
                            f"{emergence.isoformat()} "
                            f"falls inside the experimental "
                            f"February transitional window; "
                            f"low-weight winter evidence added."
                        ),
                    )
                )

                spring_score += (
                    add_evidence(
                        evidence,
                        "EMERGENCE_DATE_TRANSITIONAL",
                        "SPRING",
                        transitional_rule[
                            "spring_base_weight"
                        ],
                        emergence_quality,
                        "SEEDTRADE_V05_TRANSITIONAL_RULE",
                        (
                            f"Rapeseed emergence "
                            f"{emergence.isoformat()} "
                            f"falls inside the experimental "
                            f"February transitional window; "
                            f"low-weight spring evidence added."
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
        "SeedTrade.eu Season Type Classifier v0.5 Transitional Test"
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
        "v0.5 transitional test analyses the same five v0.7 / 400 ha Copernicus samples as v0.4."
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
            f"v05_transitional_"
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
            "rapeseed_february_transitional_emergence_test",
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

    source_paths = find_latest_v07_sample_jsons()

    all_sample_results = []
    combined_classified_pixels = []

    print()
    print("========================================================")
    print("SeedTrade.eu Season Type Classifier v0.5 Transitional Test")
    print("PL_EAST | 5 x 400 ha cross-sample classification")
    print("========================================================")

    for source_path in source_paths:

        source_data = load_json(source_path)

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
            f"PL_EAST_"
            f"season_type_classifier_"
            f"v05_transitional_"
            f"2023_"
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
            "PL_EAST",

        "year":
            2023,

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
            True,

        "comparison_baseline":
            "v0.4",

        "transitional_rule_tested":
            "RAPESEED_FEBRUARY_EMERGENCE",

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


# ============================================================
# v0.4 vs v0.5 COMPARISON
# ============================================================

def find_latest_v04_sample_jsons():

    files = sorted(
        COPERNICUS_DIR.glob(
            "*season_type_classifier_v04_*_S??_2km_400ha_test_*.json"
        ),
        key=lambda path: path.name,
    )

    latest_by_sample = {}

    for path in files:

        for sample_id in (
            "S01",
            "S02",
            "S03",
            "S04",
            "S05",
        ):

            if f"_{sample_id}_" in path.name:

                latest_by_sample[
                    sample_id
                ] = path

                break

    return latest_by_sample


def comparison_key(
    row,
):

    return (
        row.get(
            "row"
        ),
        row.get(
            "column"
        ),
    )


def build_v04_v05_comparison(
    v04_data,
    v05_pixels,
):

    old_pixels = {
        comparison_key(
            row
        ):
            row
        for row in v04_data.get(
            "pixels",
            []
        )
    }

    transition_counts = Counter()

    crop_transition_counts = {}

    strength_transition_counts = Counter()

    changed_pixels = []

    matched = 0

    for new_row in v05_pixels:

        key = comparison_key(
            new_row
        )

        old_row = old_pixels.get(
            key
        )

        if old_row is None:
            continue

        matched += 1

        old_class = old_row.get(
            "classification"
        )

        new_class = new_row.get(
            "classification"
        )

        old_strength = old_row.get(
            "evidence_strength"
        )

        new_strength = new_row.get(
            "evidence_strength"
        )

        transition_counts[
            (
                old_class,
                new_class,
            )
        ] += 1

        strength_transition_counts[
            (
                old_strength,
                new_strength,
            )
        ] += 1

        crop_code = new_row.get(
            "cty"
        )

        if crop_code not in crop_transition_counts:

            crop_transition_counts[
                crop_code
            ] = Counter()

        crop_transition_counts[
            crop_code
        ][
            (
                old_class,
                new_class,
            )
        ] += 1

        if (
            old_class != new_class
            or old_strength != new_strength
        ):

            changed_pixels.append(
                {
                    "row":
                        new_row.get(
                            "row"
                        ),

                    "column":
                        new_row.get(
                            "column"
                        ),

                    "cty":
                        crop_code,

                    "crop":
                        new_row.get(
                            "crop"
                        ),

                    "old_classification":
                        old_class,

                    "new_classification":
                        new_class,

                    "old_evidence_strength":
                        old_strength,

                    "new_evidence_strength":
                        new_strength,

                    "old_winter_score":
                        old_row.get(
                            "winter_score"
                        ),

                    "new_winter_score":
                        new_row.get(
                            "winter_score"
                        ),

                    "old_spring_score":
                        old_row.get(
                            "spring_score"
                        ),

                    "new_spring_score":
                        new_row.get(
                            "spring_score"
                        ),

                    "emergence_date":
                        new_row.get(
                            "emergence_date"
                        ),

                    "duration_days":
                        new_row.get(
                            "duration_days"
                        ),

                    "harvest_date":
                        new_row.get(
                            "harvest_date"
                        ),
                }
            )

    return {
        "matched_pixels":
            matched,

        "changed_pixels":
            len(
                changed_pixels
            ),

        "changed_percent":
            round(
                (
                    len(
                        changed_pixels
                    )
                    / matched
                    * 100
                )
                if matched
                else 0.0,
                4,
            ),

        "classification_transitions": [
            {
                "from":
                    old_class,

                "to":
                    new_class,

                "count":
                    count,
            }
            for (
                old_class,
                new_class,
            ), count in (
                transition_counts.most_common()
            )
        ],

        "evidence_strength_transitions": [
            {
                "from":
                    old_strength,

                "to":
                    new_strength,

                "count":
                    count,
            }
            for (
                old_strength,
                new_strength,
            ), count in (
                strength_transition_counts.most_common()
            )
        ],

        "crop_classification_transitions": {
            str(
                crop_code
            ): [
                {
                    "from":
                        old_class,

                    "to":
                        new_class,

                    "count":
                        count,
                }
                for (
                    old_class,
                    new_class,
                ), count in (
                    counter.most_common()
                )
            ]
            for crop_code, counter in (
                crop_transition_counts.items()
            )
        },

        "changed_pixel_details":
            changed_pixels,
    }


def print_comparison(
    sample_id,
    comparison,
):

    print()

    print(
        "--------------------------------------------------------"
    )

    print(
        f"{sample_id} | v0.4 -> v0.5 transitional comparison"
    )

    print(
        "--------------------------------------------------------"
    )

    print(
        f"Matched pixels: "
        f"{comparison['matched_pixels']:,}"
    )

    print(
        f"Changed pixels: "
        f"{comparison['changed_pixels']:,} "
        f"({comparison['changed_percent']:.4f}%)"
    )

    print(
        "Classification transitions:"
    )

    for item in comparison[
        "classification_transitions"
    ]:

        if item[
            "from"
        ] != item[
            "to"
        ]:

            print(
                f"  {item['from']} -> "
                f"{item['to']}: "
                f"{item['count']:,}"
            )


def run_comparison_after_v05():

    v04_paths = (
        find_latest_v04_sample_jsons()
    )

    v05_files = sorted(
        COPERNICUS_DIR.glob(
            "*season_type_classifier_v05_transitional_*_S??_2km_400ha_test_*.json"
        ),
        key=lambda path: path.name,
    )

    latest_v05 = {}

    for path in v05_files:

        for sample_id in (
            "S01",
            "S02",
            "S03",
            "S04",
            "S05",
        ):

            if f"_{sample_id}_" in path.name:

                latest_v05[
                    sample_id
                ] = path

                break

    if len(
        v04_paths
    ) != 5:

        print()

        print(
            "v0.4 comparison skipped: "
            "five baseline sample JSON files were not found."
        )

        return

    if len(
        latest_v05
    ) != 5:

        print()

        print(
            "v0.5 comparison skipped: "
            "five new sample JSON files were not found."
        )

        return

    comparisons = {}

    total_matched = 0
    total_changed = 0

    print()

    print(
        "========================================================"
    )

    print(
        "v0.4 vs v0.5 TRANSITIONAL COMPARISON"
    )

    print(
        "========================================================"
    )

    for sample_id in (
        "S01",
        "S02",
        "S03",
        "S04",
        "S05",
    ):

        old_data = load_json(
            v04_paths[
                sample_id
            ]
        )

        new_data = load_json(
            latest_v05[
                sample_id
            ]
        )

        comparison = (
            build_v04_v05_comparison(
                old_data,
                new_data.get(
                    "pixels",
                    []
                ),
            )
        )

        comparisons[
            sample_id
        ] = comparison

        total_matched += (
            comparison[
                "matched_pixels"
            ]
        )

        total_changed += (
            comparison[
                "changed_pixels"
            ]
        )

        print_comparison(
            sample_id,
            comparison,
        )

    current_date = (
        datetime.now().strftime(
            "%Y-%m-%d"
        )
    )

    output_path = (
        COPERNICUS_DIR
        / (
            "PL_EAST_"
            "season_type_classifier_"
            "v05_transitional_"
            "vs_v04_comparison_"
            "2023_"
            "5samples_2000ha_"
            f"{current_date}.json"
        )
    )

    result = {
        "dataset":
            (
                "SeedTrade.eu Season Type Classifier "
                "v0.4 vs v0.5 Transitional Comparison"
            ),

        "baseline":
            "v0.4",

        "candidate":
            CLASSIFIER_VERSION,

        "ruleset_version":
            RULESET_VERSION,

        "experimental_rule":
            {
                "crop":
                    "Rapeseed",

                "cty":
                    1430,

                "emergence_window":
                    "February 1-29",

                "winter_base_weight":
                    0.8,

                "spring_base_weight":
                    1.2,

                "uncertainty_weighting":
                    "existing v0.4 CPMCECL weighting",

                "cpcsy_used":
                    False,
            },

        "total_matched_pixels":
            total_matched,

        "total_changed_pixels":
            total_changed,

        "total_changed_percent":
            round(
                (
                    total_changed
                    / total_matched
                    * 100
                )
                if total_matched
                else 0.0,
                4,
            ),

        "samples":
            comparisons,

        "probabilities_generated":
            False,

        "candidate_adopted":
            False,

        "interpretation":
            (
                "Experimental comparison only. "
                "v0.4 remains the baseline until the "
                "transition results are reviewed."
            ),
    }

    with open(
        output_path,
        "w",
        encoding="utf-8",
    ) as file:

        json.dump(
            result,
            file,
            indent=2,
            ensure_ascii=False,
        )

    print()

    print(
        "========================================================"
    )

    print(
        "COMPARISON COMPLETE"
    )

    print(
        "========================================================"
    )

    print(
        f"Total matched pixels: "
        f"{total_matched:,}"
    )

    print(
        f"Total changed pixels: "
        f"{total_changed:,} "
        f"("
        f"{(total_changed / total_matched * 100) if total_matched else 0.0:.4f}%"
        f")"
    )

    print()

    print(
        "v0.4 remains the baseline. "
        "v0.5 is experimental only."
    )

    print()

    print(
        "Comparison JSON saved to:"
    )

    print(
        output_path
    )


if __name__ == "__main__":

    main()

    run_comparison_after_v05()