import json
import sys
from datetime import date
from pathlib import Path


# ============================================================
# PATH SETUP
# ============================================================

PROJECT_ROOT = Path(__file__).resolve().parents[2]

WEATHER_DATA_DIR = (
    PROJECT_ROOT
    / "data"
    / "raw"
    / "weather"
)

COLLECTORS_DIR = (
    PROJECT_ROOT
    / "collectors"
)

CROP_MODELS_DIR = (
    COLLECTORS_DIR
    / "crop_models"
)

WEATHER_DIR = (
    COLLECTORS_DIR
    / "weather"
)


# Allow imports from:
# collectors/weather
# collectors/crop_models

for path in [
    str(WEATHER_DIR),
    str(CROP_MODELS_DIR),
]:

    if path not in sys.path:
        sys.path.insert(
            0,
            path,
        )


from crop_calendar import get_crop_stage_for_date

from winter_wheat import (
    MODEL_METADATA as WINTER_WHEAT_METADATA,
    evaluate_weather_signal as evaluate_winter_wheat_signal,
    get_stage as get_winter_wheat_stage,
)


# ============================================================
# MODEL REGISTRY
# ============================================================

CROP_MODEL_REGISTRY = {

    "WINTER_WHEAT": {

        "metadata": WINTER_WHEAT_METADATA,

        "evaluate_weather_signal":
            evaluate_winter_wheat_signal,

        "get_stage":
            get_winter_wheat_stage,
    },
}


# ============================================================
# WEATHER FILE
# ============================================================

def get_latest_weather_file():

    files = sorted(
        WEATHER_DATA_DIR.glob(
            "*.json"
        ),
        reverse=True,
    )

    if not files:

        raise FileNotFoundError(
            "No weather JSON files found "
            "in data/raw/weather."
        )

    return files[0]


def load_weather_data(
    file_path,
):

    with open(
        file_path,
        "r",
        encoding="utf-8",
    ) as file:

        return json.load(
            file
        )


# ============================================================
# WEATHER METRICS
# ============================================================

def calculate_weather_metrics(
    region_data,
):

    weather = region_data[
        "weather"
    ]

    daily = weather[
        "daily"
    ]

    temperatures_max = daily[
        "temperature_2m_max"
    ]

    temperatures_min = daily[
        "temperature_2m_min"
    ]

    precipitation = daily[
        "precipitation_sum"
    ]

    et0 = daily[
        "et0_fao_evapotranspiration"
    ]


    precipitation_7d = sum(
        value or 0
        for value in precipitation
    )

    et0_7d = sum(
        value or 0
        for value in et0
    )

    water_balance = (
        precipitation_7d
        - et0_7d
    )


    max_temperature = max(
        value
        for value in temperatures_max
        if value is not None
    )

    min_temperature = min(
        value
        for value in temperatures_min
        if value is not None
    )


    hot_days = sum(
        1
        for value in temperatures_max
        if (
            value is not None
            and value >= 30
        )
    )


    very_hot_days = sum(
        1
        for value in temperatures_max
        if (
            value is not None
            and value >= 35
        )
    )


    frost_days = sum(
        1
        for value in temperatures_min
        if (
            value is not None
            and value <= 0
        )
    )


    heavy_rain_days = sum(
        1
        for value in precipitation
        if (
            value is not None
            and value >= 20
        )
    )


    return {

        "precipitation_7d_mm":
            round(
                precipitation_7d,
                1,
            ),

        "et0_7d_mm":
            round(
                et0_7d,
                1,
            ),

        "water_balance_7d_mm":
            round(
                water_balance,
                1,
            ),

        "max_temperature_c":
            round(
                max_temperature,
                1,
            ),

        "min_temperature_c":
            round(
                min_temperature,
                1,
            ),

        "hot_days":
            hot_days,

        "very_hot_days":
            very_hot_days,

        "frost_days":
            frost_days,

        "heavy_rain_days":
            heavy_rain_days,
    }


# ============================================================
# WEATHER SIGNAL DETECTION
# ============================================================

def detect_weather_signals(
    metrics,
):

    signals = []


    water_balance = metrics[
        "water_balance_7d_mm"
    ]


    if water_balance <= -30:

        signals.append(
            "strong_moisture_deficit"
        )


    elif water_balance <= -15:

        signals.append(
            "moderate_moisture_deficit"
        )


    elif water_balance <= -5:

        signals.append(
            "mild_moisture_deficit"
        )


    if (
        metrics[
            "very_hot_days"
        ]
        >= 2
    ):

        signals.append(
            "strong_heat"
        )


    elif (
        metrics[
            "hot_days"
        ]
        >= 3
    ):

        signals.append(
            "heat"
        )


    if (
        metrics[
            "frost_days"
        ]
        >= 1
    ):

        signals.append(
            "frost"
        )


    if (
        metrics[
            "heavy_rain_days"
        ]
        >= 2
    ):

        signals.append(
            "repeated_heavy_rain"
        )


    elif (
        metrics[
            "heavy_rain_days"
        ]
        == 1
    ):

        signals.append(
            "heavy_rain"
        )


    if not signals:

        signals.append(
            "no_major_weather_signal"
        )


    return signals


# ============================================================
# RISK LEVEL
# ============================================================

def sensitivity_to_score(
    sensitivity_score,
):

    if sensitivity_score >= 4:
        return 4

    if sensitivity_score == 3:
        return 3

    if sensitivity_score == 2:
        return 2

    if sensitivity_score == 1:
        return 1

    return 0


def calculate_overall_risk_level(
    evaluations,
):

    if not evaluations:

        return (
            "MINIMAL",
            0,
        )


    max_score = max(
        item[
            "sensitivity_score"
        ]
        for item in evaluations
    )


    if max_score >= 4:

        return (
            "VERY_HIGH",
            max_score,
        )


    if max_score == 3:

        return (
            "HIGH",
            max_score,
        )


    if max_score == 2:

        return (
            "MODERATE",
            max_score,
        )


    if max_score == 1:

        return (
            "LOW",
            max_score,
        )


    return (
        "MINIMAL",
        0,
    )


# ============================================================
# CROP MODEL ACCESS
# ============================================================

def get_crop_model(
    crop_code,
):

    return CROP_MODEL_REGISTRY.get(
        crop_code
    )


# ============================================================
# CROP-WEATHER EVALUATION
# ============================================================

def calculate_crop_weather_risk(
    crop_code,
    region_code,
    weather_metrics,
    check_date,
):

    crop_model = get_crop_model(
        crop_code
    )


    if crop_model is None:

        return {

            "status":
                "NO_DETAILED_MODEL",

            "crop_code":
                crop_code,

            "stage_codes":
                [],

            "weather_signals":
                detect_weather_signals(
                    weather_metrics
                ),

            "risk_level":
                "NOT_EVALUATED",

            "risk_score":
                0,

            "evaluations":
                [],

            "confidence":
                "LOW",
        }


    stage_codes = (
        get_crop_stage_for_date(
            crop_code,
            region_code,
            check_date,
        )
    )


    weather_signals = (
        detect_weather_signals(
            weather_metrics
        )
    )


    if not stage_codes:

        return {

            "status":
                "OUTSIDE_ACTIVE_CALENDAR",

            "crop_code":
                crop_code,

            "crop":
                crop_model[
                    "metadata"
                ][
                    "name"
                ],

            "stage_codes":
                [],

            "weather_signals":
                weather_signals,

            "risk_level":
                "NOT_EVALUATED",

            "risk_score":
                0,

            "evaluations":
                [],

            "confidence":
                "LOW",
        }


    evaluations = []


    for stage_code in stage_codes:

        stage = (
            crop_model[
                "get_stage"
            ](
                stage_code
            )
        )


        if stage is None:

            continue


        for signal in weather_signals:

            if (
                signal
                == "no_major_weather_signal"
            ):

                continue


            result = (
                crop_model[
                    "evaluate_weather_signal"
                ](
                    stage_code,
                    signal,
                )
            )


            if (
                result[
                    "sensitivity_score"
                ]
                <= 0
            ):

                continue


            evaluations.append(
                result
            )


    risk_level, risk_score = (
        calculate_overall_risk_level(
            evaluations
        )
    )


    if len(stage_codes) == 1:

        confidence = "MEDIUM"

    else:

        confidence = "LOW"


    return {

        "status":
            "EVALUATED",

        "crop_code":
            crop_code,

        "crop":
            crop_model[
                "metadata"
            ][
                "name"
            ],

        "stage_codes":
            stage_codes,

        "weather_signals":
            weather_signals,

        "risk_level":
            risk_level,

        "risk_score":
            risk_score,

        "evaluations":
            evaluations,

        "confidence":
            confidence,
    }


# ============================================================
# REGION + CROP ANALYSIS
# ============================================================

def analyze_region_crop(
    dataset,
    region_code,
    crop_code,
    check_date,
):

    region_data = dataset[
        "regions"
    ].get(
        region_code
    )


    if region_data is None:

        return None


    if (
        region_data.get(
            "status"
        )
        == "error"
    ):

        return {

            "status":
                "ERROR",

            "error":
                region_data.get(
                    "error",
                    "Unknown collector error",
                ),
        }


    weather_metrics = (
        calculate_weather_metrics(
            region_data
        )
    )


    crop_analysis = (
        calculate_crop_weather_risk(
            crop_code,
            region_code,
            weather_metrics,
            check_date,
        )
    )


    return {

        "region_code":
            region_code,

        "country":
            region_data[
                "country"
            ],

        "region":
            region_data[
                "region"
            ],

        "crop_code":
            crop_code,

        "date":
            str(
                check_date
            ),

        "weather_metrics":
            weather_metrics,

        "crop_analysis":
            crop_analysis,
    }


# ============================================================
# PRINT RESULT
# ============================================================

def print_result(
    result,
):

    if result is None:

        print(
            "No result."
        )

        return


    if (
        result.get(
            "status"
        )
        == "ERROR"
    ):

        print(
            "ERROR"
        )

        print(
            result[
                "error"
            ]
        )

        return


    analysis = result[
        "crop_analysis"
    ]

    metrics = result[
        "weather_metrics"
    ]


    print()
    print(
        "========================================================"
    )
    print(
        "SeedTrade.eu Crop-Weather Intelligence Engine v0.2"
    )
    print(
        "========================================================"
    )
    print()


    print(
        f"Region: "
        f"{result['region_code']} | "
        f"{result['country']} | "
        f"{result['region']}"
    )


    print(
        f"Crop: "
        f"{analysis.get('crop', result['crop_code'])}"
    )


    print(
        f"Date: "
        f"{result['date']}"
    )


    print()


    print(
        "Phenology:"
    )


    if analysis[
        "stage_codes"
    ]:

        print(
            "  "
            + ", ".join(
                analysis[
                    "stage_codes"
                ]
            )
        )


    else:

        print(
            "  Outside active crop calendar"
        )


    print()


    print(
        "Weather:"
    )


    print(
        f"  Rain 7d: "
        f"{metrics['precipitation_7d_mm']} mm"
    )


    print(
        f"  ET0 7d: "
        f"{metrics['et0_7d_mm']} mm"
    )


    print(
        f"  Water balance: "
        f"{metrics['water_balance_7d_mm']} mm"
    )


    print(
        f"  Temperature: "
        f"{metrics['min_temperature_c']} °C "
        f"to "
        f"{metrics['max_temperature_c']} °C"
    )


    print()


    print(
        "Weather signals:"
    )


    for signal in analysis[
        "weather_signals"
    ]:

        print(
            f"  - {signal}"
        )


    print()


    print(
        "Detailed crop-stage evaluation:"
    )


    if analysis[
        "evaluations"
    ]:

        for item in analysis[
            "evaluations"
        ]:

            print()

            print(
                f"  Stage: "
                f"{item['stage']}"
            )

            print(
                f"  Signal: "
                f"{item['weather_signal']}"
            )

            print(
                f"  Sensitivity: "
                f"{item['sensitivity']}"
            )

            print(
                f"  Yield component: "
                f"{item['yield_component']}"
            )

            print(
                "  Main concerns:"
            )

            for concern in item[
                "main_concerns"
            ]:

                print(
                    f"    - {concern}"
                )


    else:

        print(
            "  No relevant stage-specific "
            "weather stress detected"
        )


    print()


    print(
        f"Crop-weather risk: "
        f"{analysis['risk_level']} "
        f"(score {analysis['risk_score']})"
    )


    print(
        f"Confidence: "
        f"{analysis['confidence']}"
    )


    print()


    print(
        "Seed production impact: "
        "NOT YET QUANTIFIED"
    )


    print(
        "Exact yield-loss estimate: "
        "DISABLED"
    )


    print(
        "Certified seed-output estimate: "
        "DISABLED"
    )


    print()

    print(
        "========================================================"
    )


# ============================================================
# TEST
# ============================================================

def test_engine():

    latest_file = (
        get_latest_weather_file()
    )


    print(
        f"Using weather file: "
        f"{latest_file}"
    )


    dataset = (
        load_weather_data(
            latest_file
        )
    )


    check_date = (
        date.today()
    )


    tests = [

        (
            "PL_EAST",
            "WINTER_WHEAT",
        ),

        (
            "PL_SOUTH",
            "WINTER_WHEAT",
        ),

        (
            "FR_NORTH",
            "WINTER_WHEAT",
        ),

        (
            "ES_SOUTH",
            "WINTER_WHEAT",
        ),
    ]


    for (
        region_code,
        crop_code,
    ) in tests:

        result = (
            analyze_region_crop(
                dataset,
                region_code,
                crop_code,
                check_date,
            )
        )


        print_result(
            result
        )


if __name__ == "__main__":

    test_engine()