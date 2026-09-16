"""
SeedTrade.eu
Rapeseed Transitional Weight Sensitivity v0.1

Purpose
-------
Evaluate several February rapeseed transitional-evidence weight pairs
against the existing v0.4 classifier outputs, without changing v0.4.

The script only touches pixels that satisfy ALL conditions:
- CTY 1430 Rapeseed
- emergence date is in February
- emergence does not already fall inside the standard v0.4 spring window
  (Rapeseed spring starts March 1 in PL_EAST)
- baseline classification exists in v0.4

For each candidate pair:
    winter_base_weight
    spring_base_weight

the script applies the existing v0.4 CPMCECL uncertainty weighting,
adds only the experimental February evidence to the stored v0.4 scores,
then reapplies the existing v0.4 evidence-strength/classification thresholds.

IMPORTANT
---------
- Diagnostic / sensitivity analysis only.
- v0.4 remains baseline.
- CPCSY is NOT used in scoring.
- No source classifier files are modified.
"""

import json
from collections import Counter, defaultdict
from datetime import datetime
from pathlib import Path


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

RAPESEED_CTY = 1430

# Candidate grid chosen to test the exact boundary revealed by v0.5:
# S02 has emergence uncertainty 12d => quality weight 0.65,
# duration contributes spring +1.5.
#
# Moderate requires:
# winning score >= 2.5
# score difference >= 1.25
#
# Therefore spring base around 1.6 becomes the first useful threshold
# if winter transitional evidence remains modest.
CANDIDATES = [
    {
        "id": "C01",
        "winter_base": 0.0,
        "spring_base": 1.2,
    },
    {
        "id": "C02",
        "winter_base": 0.0,
        "spring_base": 1.6,
    },
    {
        "id": "C03",
        "winter_base": 0.4,
        "spring_base": 1.6,
    },
    {
        "id": "C04",
        "winter_base": 0.6,
        "spring_base": 1.6,
    },
    {
        "id": "C05",
        "winter_base": 0.8,
        "spring_base": 1.6,
    },
    {
        "id": "C06",
        "winter_base": 0.4,
        "spring_base": 1.8,
    },
    {
        "id": "C07",
        "winter_base": 0.6,
        "spring_base": 1.8,
    },
    {
        "id": "C08",
        "winter_base": 0.8,
        "spring_base": 1.8,
    },
]


def load_json(path):

    with open(
        path,
        "r",
        encoding="utf-8",
    ) as file:

        return json.load(
            file
        )


def find_latest_v04_samples():

    files = sorted(
        COPERNICUS_DIR.glob(
            "*season_type_classifier_v04_*_S??_2km_400ha_test_*.json"
        ),
        key=lambda p: p.name,
    )

    latest = {}

    for path in files:

        for sample_id in SAMPLE_IDS:

            if f"_{sample_id}_" in path.name:

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
            "Missing v0.4 classifier sample JSON files for: "
            + ", ".join(
                missing
            )
        )

    return {
        sample_id:
            latest[
                sample_id
            ]
        for sample_id in SAMPLE_IDS
    }


def parse_date(
    value,
):

    if not value:

        return None

    try:

        return datetime.fromisoformat(
            value
        )

    except (
        ValueError,
        TypeError,
    ):

        return None


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


def is_february_rapeseed(
    pixel,
):

    if pixel.get(
        "cty"
    ) != RAPESEED_CTY:

        return False

    emergence = parse_date(
        pixel.get(
            "emergence_date"
        )
    )

    if emergence is None:

        return False

    return (
        emergence.month == 2
    )


def classify_from_scores(
    baseline_pixel,
    winter_score,
    spring_score,
):

    core_data_count = baseline_pixel.get(
        "core_data_count"
    )

    if core_data_count is None:

        core_data_count = sum(
            value is not None
            for value in (
                baseline_pixel.get(
                    "emergence_date"
                ),
                baseline_pixel.get(
                    "duration_days"
                ),
                baseline_pixel.get(
                    "harvest_date"
                ),
            )
        )

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
        "winter_score":
            winter_score,

        "spring_score":
            spring_score,

        "score_difference":
            difference,

        "evidence_strength":
            evidence_strength,

        "classification":
            classification,
    }


def apply_candidate(
    pixel,
    candidate,
):

    baseline_winter = (
        pixel.get(
            "winter_score"
        )
        or 0.0
    )

    baseline_spring = (
        pixel.get(
            "spring_score"
        )
        or 0.0
    )

    quality = uncertainty_weight(
        pixel.get(
            "emergence_uncertainty_days"
        )
    )

    winter_added = (
        candidate[
            "winter_base"
        ]
        * quality
    )

    spring_added = (
        candidate[
            "spring_base"
        ]
        * quality
    )

    result = classify_from_scores(
        pixel,
        baseline_winter
        + winter_added,
        baseline_spring
        + spring_added,
    )

    result.update(
        {
            "baseline_winter_score":
                baseline_winter,

            "baseline_spring_score":
                baseline_spring,

            "emergence_quality_weight":
                quality,

            "winter_added":
                round(
                    winter_added,
                    3,
                ),

            "spring_added":
                round(
                    spring_added,
                    3,
                ),
        }
    )

    return result


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


def analyse_candidate(
    candidate,
    sample_pixels,
):

    overall_transition = Counter()

    sample_results = {}

    total_affected = 0

    total_changed = 0

    for sample_id in SAMPLE_IDS:

        affected = [
            pixel
            for pixel in sample_pixels[
                sample_id
            ]
            if is_february_rapeseed(
                pixel
            )
        ]

        transitions = Counter()

        strength_transitions = Counter()

        changed = 0

        profiles = Counter()

        for pixel in affected:

            simulated = apply_candidate(
                pixel,
                candidate,
            )

            old_class = pixel.get(
                "classification"
            )

            new_class = simulated[
                "classification"
            ]

            old_strength = pixel.get(
                "evidence_strength"
            )

            new_strength = simulated[
                "evidence_strength"
            ]

            transitions[
                (
                    old_class,
                    new_class,
                )
            ] += 1

            overall_transition[
                (
                    old_class,
                    new_class,
                )
            ] += 1

            strength_transitions[
                (
                    old_strength,
                    new_strength,
                )
            ] += 1

            if (
                old_class != new_class
                or old_strength != new_strength
            ):

                changed += 1

            profile = (
                pixel.get(
                    "emergence_date"
                ),
                pixel.get(
                    "emergence_uncertainty_days"
                ),
                pixel.get(
                    "duration_days"
                ),
                pixel.get(
                    "harvest_date"
                ),
                pixel.get(
                    "classification"
                ),
                simulated[
                    "classification"
                ],
                simulated[
                    "evidence_strength"
                ],
                simulated[
                    "winter_score"
                ],
                simulated[
                    "spring_score"
                ],
                simulated[
                    "score_difference"
                ],
            )

            profiles[
                profile
            ] += 1

        total_affected += len(
            affected
        )

        total_changed += changed

        sample_results[
            sample_id
        ] = {
            "affected_february_rapeseed_pixels":
                len(
                    affected
                ),

            "changed_pixels":
                changed,

            "changed_percent_of_affected":
                percent(
                    changed,
                    len(
                        affected
                    ),
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
                    transitions.most_common()
                )
            ],

            "strength_transitions": [
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
                    strength_transitions.most_common()
                )
            ],

            "profiles": [
                {
                    "count":
                        count,

                    "emergence_date":
                        profile[
                            0
                        ],

                    "emergence_uncertainty_days":
                        profile[
                            1
                        ],

                    "duration_days":
                        profile[
                            2
                        ],

                    "harvest_date":
                        profile[
                            3
                        ],

                    "old_classification":
                        profile[
                            4
                        ],

                    "new_classification":
                        profile[
                            5
                        ],

                    "new_evidence_strength":
                        profile[
                            6
                        ],

                    "new_winter_score":
                        profile[
                            7
                        ],

                    "new_spring_score":
                        profile[
                            8
                        ],

                    "new_score_difference":
                        profile[
                            9
                        ],
                }
                for profile, count in (
                    profiles.most_common(
                        20
                    )
                )
            ],
        }

    return {
        "candidate":
            candidate,

        "total_affected_february_rapeseed_pixels":
            total_affected,

        "total_changed_pixels":
            total_changed,

        "total_changed_percent_of_affected":
            percent(
                total_changed,
                total_affected,
            ),

        "overall_classification_transitions": [
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
                overall_transition.most_common()
            )
        ],

        "samples":
            sample_results,
    }


def get_transition_count(
    result,
    sample_id,
    from_class,
    to_class,
):

    for item in result[
        "samples"
    ][
        sample_id
    ][
        "classification_transitions"
    ]:

        if (
            item[
                "from"
            ] == from_class
            and item[
                "to"
            ] == to_class
        ):

            return item[
                "count"
            ]

    return 0


def print_candidate(
    result,
):

    candidate = result[
        "candidate"
    ]

    print()

    print(
        "=" * 78
    )

    print(
        f"{candidate['id']} | "
        f"winter_base={candidate['winter_base']} | "
        f"spring_base={candidate['spring_base']}"
    )

    print(
        "=" * 78
    )

    print(
        f"Affected February rapeseed pixels: "
        f"{result['total_affected_february_rapeseed_pixels']:,}"
    )

    print(
        f"Changed: "
        f"{result['total_changed_pixels']:,} "
        f"("
        f"{result['total_changed_percent_of_affected']:.2f}%"
        f")"
    )

    for sample_id in (
        "S01",
        "S02",
    ):

        sample = result[
            "samples"
        ][
            sample_id
        ]

        print()

        print(
            f"{sample_id}: "
            f"affected={sample['affected_february_rapeseed_pixels']:,} | "
            f"changed={sample['changed_pixels']:,}"
        )

        for item in sample[
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


def main():

    paths = (
        find_latest_v04_samples()
    )

    sample_pixels = {}

    for sample_id in SAMPLE_IDS:

        data = load_json(
            paths[
                sample_id
            ]
        )

        sample_pixels[
            sample_id
        ] = data.get(
            "pixels",
            [],
        )

    print()

    print(
        "=" * 78
    )

    print(
        "SeedTrade.eu Rapeseed Transitional Weight Sensitivity v0.1"
    )

    print(
        "v0.4 baseline | February Rapeseed only | no CPCSY scoring"
    )

    print(
        "=" * 78
    )

    results = []

    for candidate in CANDIDATES:

        result = analyse_candidate(
            candidate,
            sample_pixels,
        )

        results.append(
            result
        )

        print_candidate(
            result
        )

    ranking = []

    for result in results:

        candidate = result[
            "candidate"
        ]

        s02_to_spring = get_transition_count(
            result,
            "S02",
            "WEAK_SEASON_SIGNAL",
            "SPRING_CYCLE_SIGNAL",
        )

        s02_to_mixed = get_transition_count(
            result,
            "S02",
            "WEAK_SEASON_SIGNAL",
            "MIXED_OR_AMBIGUOUS",
        )

        s01_to_spring = get_transition_count(
            result,
            "S01",
            "WEAK_SEASON_SIGNAL",
            "SPRING_CYCLE_SIGNAL",
        )

        s01_to_winter = get_transition_count(
            result,
            "S01",
            "WEAK_SEASON_SIGNAL",
            "WINTER_CYCLE_SIGNAL",
        )

        ranking.append(
            {
                "candidate_id":
                    candidate[
                        "id"
                    ],

                "winter_base":
                    candidate[
                        "winter_base"
                    ],

                "spring_base":
                    candidate[
                        "spring_base"
                    ],

                "s02_weak_to_spring":
                    s02_to_spring,

                "s02_weak_to_mixed":
                    s02_to_mixed,

                "s01_weak_to_spring":
                    s01_to_spring,

                "s01_weak_to_winter":
                    s01_to_winter,

                "total_changed_pixels":
                    result[
                        "total_changed_pixels"
                    ],
            }
        )

    print()

    print(
        "=" * 78
    )

    print(
        "CANDIDATE SUMMARY"
    )

    print(
        "=" * 78
    )

    print(
        "ID  | Wbase | Sbase | "
        "S02 WEAK->SPRING | S02 WEAK->MIXED | "
        "S01 WEAK->SPRING | S01 WEAK->WINTER | Changed"
    )

    for row in ranking:

        print(
            f"{row['candidate_id']:<3} | "
            f"{row['winter_base']:<5} | "
            f"{row['spring_base']:<5} | "
            f"{row['s02_weak_to_spring']:>16,} | "
            f"{row['s02_weak_to_mixed']:>15,} | "
            f"{row['s01_weak_to_spring']:>16,} | "
            f"{row['s01_weak_to_winter']:>16,} | "
            f"{row['total_changed_pixels']:>7,}"
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
            "rapeseed_transitional_weight_sensitivity_"
            "v01_"
            "2023_"
            "5samples_2000ha_"
            f"{current_date}.json"
        )
    )

    output = {
        "dataset":
            "SeedTrade.eu Rapeseed Transitional Weight Sensitivity",

        "version":
            VERSION,

        "baseline":
            "Season Type Classifier v0.4",

        "diagnostic_only":
            True,

        "classifier_modified":
            False,

        "cpcsy_used_for_scoring":
            False,

        "target_crop":
            {
                "cty":
                    RAPESEED_CTY,

                "crop":
                    "Rapeseed",
            },

        "target_emergence_month":
            "February",

        "candidate_results":
            results,

        "candidate_summary":
            ranking,

        "interpretation_note":
            (
                "This sensitivity test does not establish agronomic truth. "
                "It identifies how candidate transitional weights change "
                "the existing v0.4 decisions and helps avoid tuning a new "
                "rule blindly to one sample."
            ),
    }

    with open(
        output_path,
        "w",
        encoding="utf-8",
    ) as file:

        json.dump(
            output,
            file,
            indent=2,
            ensure_ascii=False,
        )

    print()

    print(
        "=" * 78
    )

    print(
        "SENSITIVITY TEST COMPLETE"
    )

    print(
        "=" * 78
    )

    print()

    print(
        "v0.4 remains unchanged."
    )

    print(
        "No candidate is adopted automatically."
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
