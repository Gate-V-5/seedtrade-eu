"""
SeedTrade.eu
CPCSY Multi-Sample Validation v0.2

Purpose
-------
Read the latest five PL_EAST Pixel Intelligence v0.9 CPCSY sample JSON files
(S01-S05) and compare CPCSY behaviour across samples for the main seasonal crops:

- Wheat (CTY 1110)
- Barley (CTY 1120)
- Other cereals (CTY 1150)
- Rapeseed (CTY 1430)

The script cross-tabulates:
    sample
    x crop
    x seasonal timing signal
    x CPCSY 1/2
    x emergence month
    x duration
    x harvest month

It also highlights anomaly cases, especially:
- high share of CPCSY=2 inside unusual timing groups
- high share of unclassified timing
- high no-data / quality-flag shares
- suspicious short-duration autumn crop cycles
- suspicious late harvest cases

IMPORTANT
---------
- Diagnostic only.
- Does NOT modify any WINTER/SPRING classifier.
- CPCSY is NOT interpreted as winter/spring.
- Percentages are descriptive pixel proportions, not probabilities.
- The five 400 ha samples are a spatial-stability test, not a representative
  regional acreage sample.
"""

import json
from collections import Counter, defaultdict
from datetime import datetime
from pathlib import Path
from statistics import mean


VERSION = "0.2"

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

MONTHS = {
    1: "Jan",
    2: "Feb",
    3: "Mar",
    4: "Apr",
    5: "May",
    6: "Jun",
    7: "Jul",
    8: "Aug",
    9: "Sep",
    10: "Oct",
    11: "Nov",
    12: "Dec",
}


def load_json(path):
    with open(
        path,
        "r",
        encoding="utf-8",
    ) as file:
        return json.load(file)


def find_latest_v09_samples():
    files = sorted(
        COPERNICUS_DIR.glob(
            "*pixel_intelligence_v09_cpcsy_*_S??_2km_400ha_test_*.json"
        ),
        key=lambda p: p.name,
    )

    if not files:
        raise FileNotFoundError(
            "No v0.9 CPCSY sample JSON files found."
        )

    latest = {}

    for path in files:
        name = path.name

        for sample_id in SAMPLE_IDS:
            if f"_{sample_id}_" in name:
                latest[sample_id] = path
                break

    missing = [
        sample_id
        for sample_id in SAMPLE_IDS
        if sample_id not in latest
    ]

    if missing:
        raise FileNotFoundError(
            "Missing v0.9 sample JSON files for: "
            + ", ".join(missing)
        )

    return {
        sample_id: latest[sample_id]
        for sample_id in SAMPLE_IDS
    }


def parse_date(value):
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


def month_name(value):
    date_value = parse_date(
        value
    )

    if date_value is None:
        return "NO_DATA"

    return MONTHS[
        date_value.month
    ]


def duration_bucket(value):
    if value is None:
        return "NO_DATA"

    if value < 90:
        return "<90"

    if value < 120:
        return "90-119"

    if value < 150:
        return "120-149"

    if value < 180:
        return "150-179"

    if value < 210:
        return "180-209"

    if value < 240:
        return "210-239"

    if value < 270:
        return "240-269"

    if value < 300:
        return "270-299"

    return "300+"


def cpcsy_value(pixel):
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
        return f"FLAG:{flag}"

    label = pixel.get(
        "cpcsy_label"
    )

    if label:
        return label

    status = pixel.get(
        "cpcsy_status"
    )

    if status:
        return f"STATUS:{status}"

    return "NO_DATA"


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
        if value is not None
    ]

    if not values:
        return None

    return round(
        mean(values),
        1,
    )


def safe_min(values):
    values = [
        value
        for value in values
        if value is not None
    ]

    if not values:
        return None

    return min(
        values
    )


def safe_max(values):
    values = [
        value
        for value in values
        if value is not None
    ]

    if not values:
        return None

    return max(
        values
    )


def distribution(counter):
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


def analyse_rows(rows):
    cpcsy_counter = Counter()
    emergence_counter = Counter()
    duration_counter = Counter()
    harvest_counter = Counter()
    timing_counter = Counter()

    durations = []

    combinations = Counter()

    for pixel in rows:
        cpcsy = cpcsy_value(
            pixel
        )

        emergence = month_name(
            pixel.get(
                "emergence_date"
            )
        )

        duration = duration_bucket(
            pixel.get(
                "duration_days"
            )
        )

        harvest = month_name(
            pixel.get(
                "harvest_date"
            )
        )

        timing = (
            pixel.get(
                "seasonal_timing_signal"
            )
            or "NO_TIMING_SIGNAL"
        )

        cpcsy_counter[
            cpcsy
        ] += 1

        emergence_counter[
            emergence
        ] += 1

        duration_counter[
            duration
        ] += 1

        harvest_counter[
            harvest
        ] += 1

        timing_counter[
            timing
        ] += 1

        raw_duration = pixel.get(
            "duration_days"
        )

        if raw_duration is not None:
            durations.append(
                raw_duration
            )

        combinations[
            (
                cpcsy,
                timing,
                emergence,
                duration,
                harvest,
            )
        ] += 1

    top_combinations = []

    for (
        cpcsy,
        timing,
        emergence,
        duration,
        harvest,
    ), count in combinations.most_common(
        12
    ):

        top_combinations.append(
            {
                "cpcsy":
                    cpcsy,

                "timing":
                    timing,

                "emergence_month":
                    emergence,

                "duration_bucket":
                    duration,

                "harvest_month":
                    harvest,

                "count":
                    count,

                "percent":
                    percent(
                        count,
                        len(rows),
                    ),
            }
        )

    return {
        "pixels":
            len(rows),

        "cpcsy":
            distribution(
                cpcsy_counter
            ),

        "timing_signals":
            distribution(
                timing_counter
            ),

        "emergence_month":
            distribution(
                emergence_counter
            ),

        "duration_bucket":
            distribution(
                duration_counter
            ),

        "duration_mean_days":
            safe_mean(
                durations
            ),

        "duration_min_days":
            safe_min(
                durations
            ),

        "duration_max_days":
            safe_max(
                durations
            ),

        "harvest_month":
            distribution(
                harvest_counter
            ),

        "top_combinations":
            top_combinations,
    }


def analyse_crop(
    pixels,
    crop_code,
):
    crop_rows = [
        pixel
        for pixel in pixels
        if pixel.get(
            "cty"
        ) == crop_code
    ]

    timing_groups = defaultdict(
        list
    )

    for pixel in crop_rows:
        timing = (
            pixel.get(
                "seasonal_timing_signal"
            )
            or "NO_TIMING_SIGNAL"
        )

        timing_groups[
            timing
        ].append(
            pixel
        )

    timing_analysis = {
        timing:
            analyse_rows(
                rows
            )
        for timing, rows
        in sorted(
            timing_groups.items()
        )
    }

    return {
        "cty":
            crop_code,

        "crop":
            TARGET_CROPS[
                crop_code
            ],

        "pixels":
            len(
                crop_rows
            ),

        "area_ha":
            round(
                len(
                    crop_rows
                )
                * 0.01,
                2,
            ),

        "overall":
            analyse_rows(
                crop_rows
            ),

        "timing_groups":
            timing_analysis,
    }


def lookup_percent(
    items,
    value,
):
    for item in items:
        if item[
            "value"
        ] == value:
            return item[
                "percent"
            ]

    return 0.0


def detect_anomalies(
    sample_id,
    crop,
):
    anomalies = []

    total_pixels = crop[
        "pixels"
    ]

    if total_pixels == 0:
        return anomalies

    overall = crop[
        "overall"
    ]

    flag_share = 0.0

    for item in overall[
        "cpcsy"
    ]:
        if item[
            "value"
        ].startswith(
            "FLAG:"
        ):
            flag_share += item[
                "percent"
            ]

    if flag_share >= 25.0:
        anomalies.append(
            {
                "sample_id":
                    sample_id,

                "crop":
                    crop[
                        "crop"
                    ],

                "type":
                    "HIGH_CPCSY_FLAG_SHARE",

                "value_percent":
                    round(
                        flag_share,
                        2,
                    ),
            }
        )

    for timing, group in crop[
        "timing_groups"
    ].items():

        group_pixels = group[
            "pixels"
        ]

        if group_pixels == 0:
            continue

        group_share = percent(
            group_pixels,
            total_pixels,
        )

        cpcsy_2_share = (
            lookup_percent(
                group[
                    "cpcsy"
                ],
                "CPCSY_2",
            )
        )

        if (
            "UNCLASSIFIED" in timing
            and group_share >= 20.0
        ):
            anomalies.append(
                {
                    "sample_id":
                        sample_id,

                    "crop":
                        crop[
                            "crop"
                        ],

                    "type":
                        "HIGH_UNCLASSIFIED_TIMING_SHARE",

                    "timing":
                        timing,

                    "value_percent":
                        group_share,
                }
            )

        if (
            "UNCLASSIFIED" in timing
            and cpcsy_2_share >= 60.0
        ):
            anomalies.append(
                {
                    "sample_id":
                        sample_id,

                    "crop":
                        crop[
                            "crop"
                        ],

                    "type":
                        "UNCLASSIFIED_DOMINATED_BY_CPCSY_2",

                    "timing":
                        timing,

                    "value_percent":
                        cpcsy_2_share,
                }
            )

        if (
            "AUTUMN" in timing
            and group[
                "duration_min_days"
            ] is not None
            and group[
                "duration_min_days"
            ] < 90
        ):
            anomalies.append(
                {
                    "sample_id":
                        sample_id,

                    "crop":
                        crop[
                            "crop"
                        ],

                    "type":
                        "AUTUMN_SIGNAL_WITH_SHORT_DURATION",

                    "timing":
                        timing,

                    "min_duration_days":
                        group[
                            "duration_min_days"
                        ],
                }
            )

        late_harvest_share = (
            lookup_percent(
                group[
                    "harvest_month"
                ],
                "Nov",
            )
        )

        if (
            "AUTUMN" in timing
            and late_harvest_share >= 1.0
        ):
            anomalies.append(
                {
                    "sample_id":
                        sample_id,

                    "crop":
                        crop[
                            "crop"
                        ],

                    "type":
                        "AUTUMN_SIGNAL_WITH_NOVEMBER_HARVEST",

                    "timing":
                        timing,

                    "value_percent":
                        late_harvest_share,
                }
            )

    return anomalies


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


def print_crop(
    sample_id,
    crop,
):
    print()
    print(
        "-" * 72
    )

    print(
        f"{sample_id} | "
        f"{crop['crop']} "
        f"(CTY {crop['cty']})"
    )

    print(
        "-" * 72
    )

    print(
        f"Pixels: "
        f"{crop['pixels']:,} | "
        f"Area: "
        f"{crop['area_ha']:.2f} ha"
    )

    print()
    print(
        "  CPCSY overall:"
    )

    print_distribution(
        crop[
            "overall"
        ][
            "cpcsy"
        ],
        indent="    ",
    )

    for timing, group in crop[
        "timing_groups"
    ].items():

        print()
        print(
            f"  [{timing}]"
        )

        print(
            f"    Pixels: "
            f"{group['pixels']:,}"
        )

        print(
            f"    Duration: "
            f"mean={group['duration_mean_days']} | "
            f"min={group['duration_min_days']} | "
            f"max={group['duration_max_days']}"
        )

        print(
            "    CPCSY:"
        )

        print_distribution(
            group[
                "cpcsy"
            ],
            indent="      ",
        )

        print(
            "    Emergence:"
        )

        print_distribution(
            group[
                "emergence_month"
            ],
            indent="      ",
        )

        print(
            "    Harvest:"
        )

        print_distribution(
            group[
                "harvest_month"
            ],
            indent="      ",
        )

        print(
            "    Top combinations:"
        )

        for combo in group[
            "top_combinations"
        ][:5]:

            print(
                "      "
                f"{combo['cpcsy']} | "
                f"{combo['timing']} | "
                f"{combo['emergence_month']} | "
                f"{combo['duration_bucket']} d | "
                f"{combo['harvest_month']} "
                f"→ {combo['count']:,} px "
                f"({combo['percent']:.2f}%)"
            )


def build_cross_sample_table(
    sample_results,
    crop_code,
):
    rows = []

    for sample_id in SAMPLE_IDS:
        crop = sample_results[
            sample_id
        ][
            "crops"
        ][
            str(
                crop_code
            )
        ]

        overall = crop[
            "overall"
        ]

        rows.append(
            {
                "sample_id":
                    sample_id,

                "pixels":
                    crop[
                        "pixels"
                    ],

                "cpcsy_1_percent":
                    lookup_percent(
                        overall[
                            "cpcsy"
                        ],
                        "CPCSY_1",
                    ),

                "cpcsy_2_percent":
                    lookup_percent(
                        overall[
                            "cpcsy"
                        ],
                        "CPCSY_2",
                    ),
            }
        )

    return rows


def print_cross_sample(
    cross_sample,
):
    print()
    print(
        "=" * 72
    )

    print(
        "CROSS-SAMPLE CPCSY COMPARISON"
    )

    print(
        "=" * 72
    )

    for crop_code, rows in (
        cross_sample.items()
    ):

        print()
        print(
            f"{TARGET_CROPS[int(crop_code)]} "
            f"(CTY {crop_code})"
        )

        print(
            "  Sample | Pixels | CPCSY1% | CPCSY2%"
        )

        for row in rows:
            print(
                f"  "
                f"{row['sample_id']:<6} | "
                f"{row['pixels']:>6,} | "
                f"{row['cpcsy_1_percent']:>7.2f} | "
                f"{row['cpcsy_2_percent']:>7.2f}"
            )


def main():
    paths = (
        find_latest_v09_samples()
    )

    print()
    print(
        "=" * 72
    )

    print(
        "SeedTrade.eu CPCSY Multi-Sample Validation v0.2"
    )

    print(
        "5 samples | 2,000 ha | diagnostic only"
    )

    print(
        "=" * 72
    )

    sample_results = {}

    all_anomalies = []

    for sample_id in SAMPLE_IDS:
        path = paths[
            sample_id
        ]

        data = load_json(
            path
        )

        pixels = data.get(
            "pixels",
            [],
        )

        if not pixels:
            raise ValueError(
                f"{sample_id}: no pixel records found."
            )

        print()
        print(
            f"[{sample_id}] "
            f"Source: {path.name}"
        )

        crops = {}

        for crop_code in TARGET_CROPS:
            crop = analyse_crop(
                pixels,
                crop_code,
            )

            crops[
                str(
                    crop_code
                )
            ] = crop

            print_crop(
                sample_id,
                crop,
            )

            all_anomalies.extend(
                detect_anomalies(
                    sample_id,
                    crop,
                )
            )

        sample_results[
            sample_id
        ] = {
            "source":
                str(
                    path
                ),

            "pixels":
                len(
                    pixels
                ),

            "crops":
                crops,
        }

    cross_sample = {}

    for crop_code in TARGET_CROPS:
        cross_sample[
            str(
                crop_code
            )
        ] = (
            build_cross_sample_table(
                sample_results,
                crop_code,
            )
        )

    print_cross_sample(
        cross_sample
    )

    print()
    print(
        "=" * 72
    )

    print(
        "ANOMALIES"
    )

    print(
        "=" * 72
    )

    if not all_anomalies:
        print(
            "No anomalies triggered by current diagnostic thresholds."
        )

    else:
        for anomaly in all_anomalies:
            print(
                json.dumps(
                    anomaly,
                    ensure_ascii=False,
                )
            )

    current_date = datetime.now().strftime(
        "%Y-%m-%d"
    )

    output_path = (
        COPERNICUS_DIR
        / (
            "PL_EAST_"
            "cpcsy_multisample_validation_"
            "v02_"
            "2023_"
            "5samples_2000ha_"
            f"{current_date}.json"
        )
    )

    result = {
        "dataset":
            "SeedTrade.eu CPCSY Multi-Sample Validation",

        "version":
            VERSION,

        "diagnostic_only":
            True,

        "classifier_modified":
            False,

        "cpcsy_used_for_classification":
            False,

        "probabilities_generated":
            False,

        "sample_count":
            len(
                SAMPLE_IDS
            ),

        "sample_area_ha":
            400.0,

        "total_sampled_area_ha":
            2000.0,

        "representative_regional_sample":
            False,

        "sampling_note":
            (
                "Five geographically separated heuristic 400 ha windows "
                "used for spatial-stability diagnostics only."
            ),

        "samples":
            sample_results,

        "cross_sample":
            cross_sample,

        "anomalies":
            all_anomalies,

        "interpretation_note":
            (
                "CPCSY reports the number of growing seasons detected "
                "within the calendar year. CPCSY 1/2 is not equivalent "
                "to winter/spring."
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
        "=" * 72
    )

    print(
        "VALIDATION COMPLETE"
    )

    print(
        "=" * 72
    )

    print()
    print(
        "No WINTER/SPRING classification rules were changed."
    )

    print(
        "CPCSY remains independent validation evidence only."
    )

    print(
        "The five samples are not a representative regional acreage estimate."
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
