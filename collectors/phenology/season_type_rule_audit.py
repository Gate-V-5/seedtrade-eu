"""
SeedTrade.eu
Season Type Rule Audit v0.1

Purpose
-------
Audit the exact Season Type Classifier v0.4 pixel results against the
latest Pixel Intelligence v0.9 CPCSY pixel data.

This script DOES NOT reclassify pixels and DOES NOT change classifier rules.

For each S01-S05 sample it joins:
    v0.4 classifier pixel
    +
    v0.9 CPCSY pixel

using:
    (row, column)

It then exposes, for the supported seasonal crops:
    - final classification
    - evidence strength
    - winter score
    - spring score
    - score difference
    - emergence evidence
    - duration evidence
    - harvest evidence
    - uncertainty-adjusted weighted evidence
    - CPCSY separate validation signal

Special diagnostic focus:
    - S02 Rapeseed WEAK / UNCLASSIFIED case
    - short autumn-cycle anomalies
    - CPCSY=2 dominated ambiguous groups

IMPORTANT
---------
- Diagnostic only.
- Existing v0.4 output is treated as authoritative classifier output.
- CPCSY is a SEPARATE VALIDATION SIGNAL.
- CPCSY is NOT used to change WINTER/SPRING scores.
- Percentages are descriptive pixel proportions, not probabilities.
"""

import json
from collections import Counter, defaultdict
from datetime import datetime
from pathlib import Path
from statistics import mean


VERSION = "0.1"

PROJECT_ROOT = Path(__file__).resolve().parents[2]

COPERNICUS_DIR = (
    PROJECT_ROOT
    / "data"
    / "raw"
    / "copernicus"
)

SAMPLE_IDS = (
    "S01",
    "S02",
    "S03",
    "S04",
    "S05",
)

TARGET_CROPS = {
    1110: "Wheat",
    1120: "Barley",
    1150: "Other cereals",
    1430: "Rapeseed",
}


def load_json(path):
    with open(
        path,
        "r",
        encoding="utf-8",
    ) as file:
        return json.load(file)


def find_latest_sample_files(
    pattern,
):
    files = sorted(
        COPERNICUS_DIR.glob(
            pattern
        ),
        key=lambda p: p.name,
    )

    latest = {}

    for path in files:
        name = path.name

        for sample_id in SAMPLE_IDS:
            if f"_{sample_id}_" in name:
                latest[
                    sample_id
                ] = path
                break

    missing = [
        sample_id
        for sample_id in SAMPLE_IDS
        if sample_id not in latest
    ]

    if missing:
        raise FileNotFoundError(
            f"Missing files for samples: "
            f"{', '.join(missing)}"
        )

    return {
        sample_id:
            latest[
                sample_id
            ]
        for sample_id in SAMPLE_IDS
    }


def find_v04_files():
    return find_latest_sample_files(
        "*season_type_classifier_v04_*_S??_2km_400ha_test_*.json"
    )


def find_v09_files():
    return find_latest_sample_files(
        "*pixel_intelligence_v09_cpcsy_*_S??_2km_400ha_test_*.json"
    )


def pixel_key(pixel):
    return (
        pixel.get(
            "row"
        ),
        pixel.get(
            "column"
        ),
    )


def percent(
    count,
    total,
):
    if not total:
        return 0.0

    return round(
        count
        / total
        * 100,
        2,
    )


def safe_mean(values):
    values = [
        value
        for value in values
        if isinstance(
            value,
            (
                int,
                float,
            ),
        )
    ]

    if not values:
        return None

    return round(
        mean(
            values
        ),
        3,
    )


def cpcsy_label(pixel):
    seasons = pixel.get(
        "cpcsy_seasons"
    )

    if seasons == 0:
        return "CPCSY_0"

    if seasons == 1:
        return "CPCSY_1"

    if seasons == 2:
        return "CPCSY_2"

    flag = pixel.get(
        "cpcsy_flag"
    )

    if flag:
        return (
            f"FLAG:{flag}"
        )

    label = pixel.get(
        "cpcsy_label"
    )

    if label:
        return label

    status = pixel.get(
        "cpcsy_status"
    )

    if status:
        return (
            f"STATUS:{status}"
        )

    return "NO_DATA"


def evidence_by_signal(
    classifier_pixel,
):
    grouped = defaultdict(
        list
    )

    for item in classifier_pixel.get(
        "evidence",
        [],
    ):
        signal = item.get(
            "signal",
            "UNKNOWN",
        )

        grouped[
            signal
        ].append(
            item
        )

    return dict(
        grouped
    )


def score_components(
    classifier_pixel,
):
    evidence = evidence_by_signal(
        classifier_pixel
    )

    result = {
        "emergence_winter":
            0.0,

        "emergence_spring":
            0.0,

        "duration_winter":
            0.0,

        "duration_spring":
            0.0,

        "harvest_winter":
            0.0,

        "harvest_spring":
            0.0,

        "neutral_harvest":
            False,

        "evidence_rows":
            classifier_pixel.get(
                "evidence",
                [],
            ),
    }

    for item in evidence.get(
        "EMERGENCE_DATE",
        [],
    ):
        direction = item.get(
            "direction"
        )

        score = item.get(
            "weighted_score",
            0.0,
        )

        if direction == "WINTER":
            result[
                "emergence_winter"
            ] += score

        elif direction == "SPRING":
            result[
                "emergence_spring"
            ] += score

    for item in evidence.get(
        "CROP_DURATION",
        [],
    ):
        direction = item.get(
            "direction"
        )

        score = item.get(
            "weighted_score",
            0.0,
        )

        if direction == "WINTER":
            result[
                "duration_winter"
            ] += score

        elif direction == "SPRING":
            result[
                "duration_spring"
            ] += score

    for item in evidence.get(
        "HARVEST_DATE",
        [],
    ):
        direction = item.get(
            "direction"
        )

        score = item.get(
            "weighted_score",
            0.0,
        )

        if direction == "WINTER":
            result[
                "harvest_winter"
            ] += score

        elif direction == "SPRING":
            result[
                "harvest_spring"
            ] += score

        elif direction == "NEUTRAL":
            result[
                "neutral_harvest"
            ] = True

    return result


def build_joined_rows(
    sample_id,
    classifier_data,
    cpcsy_data,
):
    cpcsy_pixels = {
        pixel_key(
            pixel
        ):
            pixel
        for pixel in cpcsy_data.get(
            "pixels",
            [],
        )
    }

    joined = []

    missing_cpcsy = 0

    for classifier_pixel in classifier_data.get(
        "pixels",
        [],
    ):
        crop_code = classifier_pixel.get(
            "cty"
        )

        if crop_code not in TARGET_CROPS:
            continue

        key = pixel_key(
            classifier_pixel
        )

        cpcsy_pixel = cpcsy_pixels.get(
            key
        )

        if cpcsy_pixel is None:
            missing_cpcsy += 1
            continue

        components = score_components(
            classifier_pixel
        )

        joined.append(
            {
                "sample_id":
                    sample_id,

                "row":
                    classifier_pixel.get(
                        "row"
                    ),

                "column":
                    classifier_pixel.get(
                        "column"
                    ),

                "cty":
                    crop_code,

                "crop":
                    TARGET_CROPS[
                        crop_code
                    ],

                "classification":
                    classifier_pixel.get(
                        "classification"
                    ),

                "evidence_strength":
                    classifier_pixel.get(
                        "evidence_strength"
                    ),

                "winter_score":
                    classifier_pixel.get(
                        "winter_score"
                    ),

                "spring_score":
                    classifier_pixel.get(
                        "spring_score"
                    ),

                "score_difference":
                    classifier_pixel.get(
                        "score_difference"
                    ),

                "core_data_count":
                    classifier_pixel.get(
                        "core_data_count"
                    ),

                "emergence_date":
                    classifier_pixel.get(
                        "emergence_date"
                    ),

                "emergence_uncertainty_days":
                    classifier_pixel.get(
                        "emergence_uncertainty_days"
                    ),

                "duration_days":
                    classifier_pixel.get(
                        "duration_days"
                    ),

                "duration_confidence":
                    classifier_pixel.get(
                        "duration_confidence"
                    ),

                "harvest_date":
                    classifier_pixel.get(
                        "harvest_date"
                    ),

                "harvest_uncertainty_days":
                    classifier_pixel.get(
                        "harvest_uncertainty_days"
                    ),

                "emergence_winter_score":
                    round(
                        components[
                            "emergence_winter"
                        ],
                        3,
                    ),

                "emergence_spring_score":
                    round(
                        components[
                            "emergence_spring"
                        ],
                        3,
                    ),

                "duration_winter_score":
                    round(
                        components[
                            "duration_winter"
                        ],
                        3,
                    ),

                "duration_spring_score":
                    round(
                        components[
                            "duration_spring"
                        ],
                        3,
                    ),

                "harvest_winter_score":
                    round(
                        components[
                            "harvest_winter"
                        ],
                        3,
                    ),

                "harvest_spring_score":
                    round(
                        components[
                            "harvest_spring"
                        ],
                        3,
                    ),

                "neutral_harvest":
                    components[
                        "neutral_harvest"
                    ],

                "evidence":
                    components[
                        "evidence_rows"
                    ],

                "cpcsy":
                    cpcsy_label(
                        cpcsy_pixel
                    ),

                "cpcsy_raw":
                    cpcsy_pixel.get(
                        "cpcsy_raw"
                    ),

                "cpcsy_status":
                    cpcsy_pixel.get(
                        "cpcsy_status"
                    ),

                "cpcsy_seasons":
                    cpcsy_pixel.get(
                        "cpcsy_seasons"
                    ),

                "cpcsy_flag":
                    cpcsy_pixel.get(
                        "cpcsy_flag"
                    ),
            }
        )

    return (
        joined,
        missing_cpcsy,
    )


def distribution(
    counter,
):
    total = sum(
        counter.values()
    )

    return [
        {
            "value":
                key,

            "count":
                count,

            "percent":
                percent(
                    count,
                    total,
                ),
        }
        for key, count
        in counter.most_common()
    ]


def summarise_group(
    rows,
):
    class_counter = Counter()
    strength_counter = Counter()
    cpcsy_counter = Counter()

    winter_scores = []
    spring_scores = []
    differences = []

    emergence_winter = []
    emergence_spring = []
    duration_winter = []
    duration_spring = []
    harvest_winter = []
    harvest_spring = []

    neutral_harvest = 0

    for row in rows:
        class_counter[
            row[
                "classification"
            ]
        ] += 1

        strength_counter[
            row[
                "evidence_strength"
            ]
        ] += 1

        cpcsy_counter[
            row[
                "cpcsy"
            ]
        ] += 1

        winter_scores.append(
            row.get(
                "winter_score"
            )
        )

        spring_scores.append(
            row.get(
                "spring_score"
            )
        )

        differences.append(
            row.get(
                "score_difference"
            )
        )

        emergence_winter.append(
            row.get(
                "emergence_winter_score"
            )
        )

        emergence_spring.append(
            row.get(
                "emergence_spring_score"
            )
        )

        duration_winter.append(
            row.get(
                "duration_winter_score"
            )
        )

        duration_spring.append(
            row.get(
                "duration_spring_score"
            )
        )

        harvest_winter.append(
            row.get(
                "harvest_winter_score"
            )
        )

        harvest_spring.append(
            row.get(
                "harvest_spring_score"
            )
        )

        if row.get(
            "neutral_harvest"
        ):
            neutral_harvest += 1

    return {
        "pixels":
            len(
                rows
            ),

        "classification":
            distribution(
                class_counter
            ),

        "evidence_strength":
            distribution(
                strength_counter
            ),

        "cpcsy":
            distribution(
                cpcsy_counter
            ),

        "mean_scores": {
            "winter":
                safe_mean(
                    winter_scores
                ),

            "spring":
                safe_mean(
                    spring_scores
                ),

            "difference":
                safe_mean(
                    differences
                ),
        },

        "mean_components": {
            "emergence_winter":
                safe_mean(
                    emergence_winter
                ),

            "emergence_spring":
                safe_mean(
                    emergence_spring
                ),

            "duration_winter":
                safe_mean(
                    duration_winter
                ),

            "duration_spring":
                safe_mean(
                    duration_spring
                ),

            "harvest_winter":
                safe_mean(
                    harvest_winter
                ),

            "harvest_spring":
                safe_mean(
                    harvest_spring
                ),
        },

        "neutral_harvest_pixels":
            neutral_harvest,

        "neutral_harvest_percent":
            percent(
                neutral_harvest,
                len(
                    rows
                ),
            ),
    }


def group_rows(
    rows,
    key_name,
):
    groups = defaultdict(
        list
    )

    for row in rows:
        groups[
            row.get(
                key_name
            )
        ].append(
            row
        )

    return groups


def analyse_crop(
    rows,
    crop_code,
):
    crop_rows = [
        row
        for row in rows
        if row[
            "cty"
        ] == crop_code
    ]

    class_groups = group_rows(
        crop_rows,
        "classification",
    )

    strength_groups = group_rows(
        crop_rows,
        "evidence_strength",
    )

    cpcsy_groups = group_rows(
        crop_rows,
        "cpcsy",
    )

    return {
        "cty":
            crop_code,

        "crop":
            TARGET_CROPS[
                crop_code
            ],

        "overall":
            summarise_group(
                crop_rows
            ),

        "by_classification": {
            str(
                key
            ):
                summarise_group(
                    group
                )
            for key, group
            in sorted(
                class_groups.items(),
                key=lambda item: str(
                    item[
                        0
                    ]
                ),
            )
        },

        "by_evidence_strength": {
            str(
                key
            ):
                summarise_group(
                    group
                )
            for key, group
            in sorted(
                strength_groups.items(),
                key=lambda item: str(
                    item[
                        0
                    ]
                ),
            )
        },

        "by_cpcsy": {
            str(
                key
            ):
                summarise_group(
                    group
                )
            for key, group
            in sorted(
                cpcsy_groups.items(),
                key=lambda item: str(
                    item[
                        0
                    ]
                ),
            )
        },
    }


def find_s02_rapeseed_focus(
    rows,
):
    focus_rows = [
        row
        for row in rows
        if (
            row[
                "sample_id"
            ] == "S02"
            and row[
                "cty"
            ] == 1430
            and row[
                "classification"
            ] == "WEAK_SEASON_SIGNAL"
        )
    ]

    if not focus_rows:
        return {
            "pixels":
                0,

            "message":
                (
                    "No S02 Rapeseed WEAK_SEASON_SIGNAL "
                    "pixels found."
                ),
        }

    unique_profiles = Counter()

    for row in focus_rows:
        profile = (
            row[
                "emergence_date"
            ],
            row[
                "emergence_uncertainty_days"
            ],
            row[
                "duration_days"
            ],
            row[
                "harvest_date"
            ],
            row[
                "harvest_uncertainty_days"
            ],
            row[
                "winter_score"
            ],
            row[
                "spring_score"
            ],
            row[
                "score_difference"
            ],
            row[
                "emergence_winter_score"
            ],
            row[
                "emergence_spring_score"
            ],
            row[
                "duration_winter_score"
            ],
            row[
                "duration_spring_score"
            ],
            row[
                "harvest_winter_score"
            ],
            row[
                "harvest_spring_score"
            ],
            row[
                "neutral_harvest"
            ],
            row[
                "cpcsy"
            ],
        )

        unique_profiles[
            profile
        ] += 1

    profiles = []

    for profile, count in (
        unique_profiles.most_common()
    ):
        (
            emergence_date,
            emergence_uncertainty,
            duration_days,
            harvest_date,
            harvest_uncertainty,
            winter_score,
            spring_score,
            score_difference,
            emergence_winter_score,
            emergence_spring_score,
            duration_winter_score,
            duration_spring_score,
            harvest_winter_score,
            harvest_spring_score,
            neutral_harvest,
            cpcsy,
        ) = profile

        profiles.append(
            {
                "count":
                    count,

                "percent":
                    percent(
                        count,
                        len(
                            focus_rows
                        ),
                    ),

                "emergence_date":
                    emergence_date,

                "emergence_uncertainty_days":
                    emergence_uncertainty,

                "duration_days":
                    duration_days,

                "harvest_date":
                    harvest_date,

                "harvest_uncertainty_days":
                    harvest_uncertainty,

                "winter_score":
                    winter_score,

                "spring_score":
                    spring_score,

                "score_difference":
                    score_difference,

                "components": {
                    "emergence_winter":
                        emergence_winter_score,

                    "emergence_spring":
                        emergence_spring_score,

                    "duration_winter":
                        duration_winter_score,

                    "duration_spring":
                        duration_spring_score,

                    "harvest_winter":
                        harvest_winter_score,

                    "harvest_spring":
                        harvest_spring_score,

                    "harvest_neutral":
                        neutral_harvest,
                },

                "cpcsy":
                    cpcsy,
            }
        )

    sample_row = focus_rows[
        0
    ]

    return {
        "pixels":
            len(
                focus_rows
            ),

        "summary":
            summarise_group(
                focus_rows
            ),

        "unique_profiles":
            profiles,

        "example_evidence":
            sample_row.get(
                "evidence",
                [],
            ),
    }


def print_distribution(
    items,
    indent="    ",
):
    for item in items:
        print(
            f"{indent}"
            f"{item['value']}: "
            f"{item['count']:,} "
            f"({item['percent']:.2f}%)"
        )


def print_crop_audit(
    sample_id,
    crop,
):
    print()
    print(
        "-" * 76
    )

    print(
        f"{sample_id} | "
        f"{crop['crop']} "
        f"(CTY {crop['cty']})"
    )

    print(
        "-" * 76
    )

    overall = crop[
        "overall"
    ]

    print(
        f"Pixels: "
        f"{overall['pixels']:,}"
    )

    print(
        "Classification:"
    )

    print_distribution(
        overall[
            "classification"
        ],
        indent="  ",
    )

    print(
        "CPCSY:"
    )

    print_distribution(
        overall[
            "cpcsy"
        ],
        indent="  ",
    )

    print(
        "Mean final scores: "
        f"W={overall['mean_scores']['winter']} | "
        f"S={overall['mean_scores']['spring']} | "
        f"diff={overall['mean_scores']['difference']}"
    )

    print(
        "Mean score components: "
        f"E(W/S)="
        f"{overall['mean_components']['emergence_winter']}/"
        f"{overall['mean_components']['emergence_spring']} | "
        f"D(W/S)="
        f"{overall['mean_components']['duration_winter']}/"
        f"{overall['mean_components']['duration_spring']} | "
        f"H(W/S)="
        f"{overall['mean_components']['harvest_winter']}/"
        f"{overall['mean_components']['harvest_spring']}"
    )


def print_s02_focus(
    focus,
):
    print()
    print(
        "=" * 76
    )

    print(
        "S02 RAPESEED WEAK-SIGNAL RULE AUDIT"
    )

    print(
        "=" * 76
    )

    print(
        f"Pixels: "
        f"{focus.get('pixels', 0):,}"
    )

    if not focus.get(
        "pixels"
    ):
        print(
            focus.get(
                "message",
                "No focus pixels.",
            )
        )
        return

    summary = focus[
        "summary"
    ]

    print()
    print(
        "CPCSY:"
    )

    print_distribution(
        summary[
            "cpcsy"
        ],
        indent="  ",
    )

    print()
    print(
        "Mean final scores:"
    )

    print(
        f"  winter = "
        f"{summary['mean_scores']['winter']}"
    )

    print(
        f"  spring = "
        f"{summary['mean_scores']['spring']}"
    )

    print(
        f"  difference = "
        f"{summary['mean_scores']['difference']}"
    )

    print()
    print(
        "Mean components:"
    )

    for key, value in (
        summary[
            "mean_components"
        ].items()
    ):
        print(
            f"  {key}: "
            f"{value}"
        )

    print()
    print(
        "Unique rule profiles:"
    )

    for profile in focus[
        "unique_profiles"
    ]:
        print()
        print(
            f"  {profile['count']:,} px "
            f"({profile['percent']:.2f}%)"
        )

        print(
            f"    emergence: "
            f"{profile['emergence_date']} "
            f"±{profile['emergence_uncertainty_days']} d"
        )

        print(
            f"    duration: "
            f"{profile['duration_days']} d"
        )

        print(
            f"    harvest: "
            f"{profile['harvest_date']} "
            f"±{profile['harvest_uncertainty_days']} d"
        )

        print(
            f"    final scores: "
            f"W={profile['winter_score']} | "
            f"S={profile['spring_score']} | "
            f"diff={profile['score_difference']}"
        )

        components = profile[
            "components"
        ]

        print(
            f"    emergence score W/S: "
            f"{components['emergence_winter']}/"
            f"{components['emergence_spring']}"
        )

        print(
            f"    duration score W/S: "
            f"{components['duration_winter']}/"
            f"{components['duration_spring']}"
        )

        print(
            f"    harvest score W/S: "
            f"{components['harvest_winter']}/"
            f"{components['harvest_spring']} "
            f"| neutral={components['harvest_neutral']}"
        )

        print(
            f"    CPCSY: "
            f"{profile['cpcsy']}"
        )

    print()
    print(
        "Example evidence rows from v0.4:"
    )

    for item in focus[
        "example_evidence"
    ]:
        print(
            f"  {item.get('signal')} | "
            f"{item.get('direction')} | "
            f"base={item.get('base_weight')} | "
            f"quality={item.get('quality_weight')} | "
            f"weighted={item.get('weighted_score')}"
        )

        print(
            f"    {item.get('explanation')}"
        )


def main():
    classifier_paths = (
        find_v04_files()
    )

    cpcsy_paths = (
        find_v09_files()
    )

    print()
    print(
        "=" * 76
    )

    print(
        "SeedTrade.eu Season Type Rule Audit v0.1"
    )

    print(
        "v0.4 classifier × v0.9 CPCSY"
    )

    print(
        "=" * 76
    )

    all_joined = []

    samples_result = {}

    for sample_id in SAMPLE_IDS:
        classifier_path = (
            classifier_paths[
                sample_id
            ]
        )

        cpcsy_path = (
            cpcsy_paths[
                sample_id
            ]
        )

        classifier_data = load_json(
            classifier_path
        )

        cpcsy_data = load_json(
            cpcsy_path
        )

        (
            joined,
            missing_cpcsy,
        ) = build_joined_rows(
            sample_id,
            classifier_data,
            cpcsy_data,
        )

        all_joined.extend(
            joined
        )

        crops = {}

        for crop_code in TARGET_CROPS:
            crop = analyse_crop(
                joined,
                crop_code,
            )

            crops[
                str(
                    crop_code
                )
            ] = crop

            print_crop_audit(
                sample_id,
                crop,
            )

        samples_result[
            sample_id
        ] = {
            "classifier_source":
                str(
                    classifier_path
                ),

            "cpcsy_source":
                str(
                    cpcsy_path
                ),

            "joined_target_crop_pixels":
                len(
                    joined
                ),

            "missing_cpcsy_matches":
                missing_cpcsy,

            "crops":
                crops,
        }

    focus = (
        find_s02_rapeseed_focus(
            all_joined
        )
    )

    print_s02_focus(
        focus
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
            "season_type_rule_audit_"
            "v01_"
            "2023_"
            "5samples_2000ha_"
            f"{current_date}.json"
        )
    )

    result = {
        "dataset":
            "SeedTrade.eu Season Type Rule Audit",

        "version":
            VERSION,

        "diagnostic_only":
            True,

        "classifier_version":
            "0.4",

        "classifier_rules_modified":
            False,

        "cpcsy_role":
            "SEPARATE_VALIDATION_SIGNAL",

        "cpcsy_used_for_classification":
            False,

        "probabilities_generated":
            False,

        "join_key":
            [
                "row",
                "column",
            ],

        "samples":
            samples_result,

        "s02_rapeseed_weak_focus":
            focus,

        "interpretation_note":
            (
                "The audit reads the exact stored v0.4 classifier "
                "scores/evidence and joins them to v0.9 CPCSY. "
                "No scores are recalculated and no classifier "
                "rules are changed."
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
        "=" * 76
    )

    print(
        "RULE AUDIT COMPLETE"
    )

    print(
        "=" * 76
    )

    print()
    print(
        "No classifier rules were changed."
    )

    print(
        "CPCSY is treated as a separate validation signal."
    )

    print()
    print(
        "JSON saved to:"
    )

    print(
        output_path
    )


if __name__ == "__main__":
    main()
