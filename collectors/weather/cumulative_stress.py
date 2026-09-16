import json
import sys
from datetime import date
from pathlib import Path


# ============================================================
# PATH SETUP
# ============================================================

PROJECT_ROOT = Path(__file__).resolve().parents[2]

COLLECTORS_DIR = (
    PROJECT_ROOT
    / "collectors"
)

WEATHER_DIR = (
    COLLECTORS_DIR
    / "weather"
)

CROP_MODELS_DIR = (
    COLLECTORS_DIR
    / "crop_models"
)

WEATHER_DATA_DIR = (
    PROJECT_ROOT
    / "data"
    / "raw"
    / "weather"
)

WEATHER_HISTORY_DIR = (
    PROJECT_ROOT
    / "data"
    / "raw"
    / "weather_history"
)


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

from crop_weather_engine import (
    analyze_region_crop,
    get_latest_weather_file,
    load_weather_data,
)

from winter_wheat import (
    get_stage as get_winter_wheat_stage,
)


# ============================================================
# MODEL CONFIG
# ============================================================

MODEL_VERSION = "0.1"


HISTORICAL_SIGNAL_WEIGHTS = {

    "no_major_historical_stress": 0,

    "moderate_cumulative_moisture_deficit": 1,

    "strong_cumulative_moisture_deficit": 2,

    "severe_cumulative_moisture_deficit": 3,

    "moderate_dry_spell": 1,

    "long_dry_spell": 2,

    "prolonged_heat": 1,

    "prolonged_strong_heat": 2,

    "repeated_frost": 2,

    "repeated_heavy_rain": 2,
}


CURRENT_RISK_WEIGHTS = {

    "NOT_EVALUATED": 0,

    "MINIMAL": 0,

    "LOW": 1,

    "MODERATE": 2,

    "HIGH": 3,

    "VERY_HIGH": 4,
}


# ============================================================
# HISTORY FILE
# ============================================================

def get_latest_history_file(
    region_code,
):

    files = sorted(
        WEATHER_HISTORY_DIR.glob(
            f"{region_code}_*.json"
        ),
        reverse=True,
    )

    if not files:
        raise FileNotFoundError(
            f"No historical weather file found "
            f"for {region_code}."
        )

    return files[0]


def load_history_data(
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
# HISTORICAL STRESS
# ============================================================

def score_historical_period(
    period_data,
):

    signals = period_data.get(
        "signals",
        [],
    )

    score = 0

    weighted_signals = []


    for signal in signals:

        signal_score = (
            HISTORICAL_SIGNAL_WEIGHTS.get(
                signal,
                0,
            )
        )

        score += signal_score

        weighted_signals.append({
            "signal":
                signal,

            "score":
                signal_score,
        })


    return {
        "score":
            score,

        "signals":
            weighted_signals,
    }


def calculate_historical_context(
    history_data,
):

    periods = history_data[
        "periods"
    ]


    result_7d = (
        score_historical_period(
            periods["7d"]
        )
    )


    result_14d = (
        score_historical_period(
            periods["14d"]
        )
    )


    result_30d = (
        score_historical_period(
            periods["30d"]
        )
    )


    weighted_score = (
        result_7d["score"] * 0.2
        + result_14d["score"] * 0.3
        + result_30d["score"] * 0.5
    )


    return {

        "7d":
            result_7d,

        "14d":
            result_14d,

        "30d":
            result_30d,

        "weighted_score":
            round(
                weighted_score,
                2,
            ),
    }


# ============================================================
# CROP RELEVANCE
# ============================================================

def historical_signal_relevant_to_stage(
    stage_code,
    signal,
):

    stage = (
        get_winter_wheat_stage(
            stage_code
        )
    )


    if stage is None:
        return False


    moisture_signals = {
        "moderate_cumulative_moisture_deficit",
        "strong_cumulative_moisture_deficit",
        "severe_cumulative_moisture_deficit",
        "moderate_dry_spell",
        "long_dry_spell",
    }


    heat_signals = {
        "prolonged_heat",
        "prolonged_strong_heat",
    }


    frost_signals = {
        "repeated_frost",
    }


    rain_signals = {
        "repeated_heavy_rain",
    }


    stage_sensitivity = stage[
        "weather_sensitivity"
    ]


    if signal in moisture_signals:

        moisture_keys = {
            "soil_dryness",
            "mild_moisture_deficit",
            "moderate_moisture_deficit",
            "strong_moisture_deficit",
            "drought",
        }

        return any(
            key in stage_sensitivity
            for key in moisture_keys
        )


    if signal in heat_signals:

        return (
            "heat" in stage_sensitivity
            or "strong_heat" in stage_sensitivity
        )


    if signal in frost_signals:

        return (
            "frost" in stage_sensitivity
            or "severe_frost" in stage_sensitivity
        )


    if signal in rain_signals:

        return (
            "heavy_rain" in stage_sensitivity
            or "repeated_heavy_rain" in stage_sensitivity
            or "waterlogging" in stage_sensitivity
        )


    return False


# ============================================================
# CUMULATIVE STRESS
# ============================================================

def calculate_cumulative_stress(
    current_analysis,
    history_data,
    crop_code,
    region_code,
    check_date,
):

    crop_analysis = (
        current_analysis[
            "crop_analysis"
        ]
    )


    stage_codes = (
        get_crop_stage_for_date(
            crop_code,
            region_code,
            check_date,
        )
    )


    if not stage_codes:

        return {

            "status":
                "NOT_EVALUATED",

            "reason":
                "Crop is outside active seasonal calendar.",

            "stage_codes":
                [],

            "current_risk":
                crop_analysis[
                    "risk_level"
                ],

            "historical_context":
                None,

            "cumulative_stress_level":
                "NOT_EVALUATED",

            "cumulative_stress_score":
                0,

            "confidence":
                "LOW",
        }


    historical_context = (
        calculate_historical_context(
            history_data
        )
    )


    relevant_history_score = 0

    relevant_history_signals = []


    for period_name in [
        "7d",
        "14d",
        "30d",
    ]:

        period_result = (
            historical_context[
                period_name
            ]
        )


        period_weight = {
            "7d": 0.2,
            "14d": 0.3,
            "30d": 0.5,
        }[
            period_name
        ]


        for item in period_result[
            "signals"
        ]:

            signal = item[
                "signal"
            ]


            if (
                signal
                == "no_major_historical_stress"
            ):
                continue


            relevant = False


            for stage_code in stage_codes:

                if (
                    historical_signal_relevant_to_stage(
                        stage_code,
                        signal,
                    )
                ):

                    relevant = True
                    break


            if not relevant:
                continue


            weighted_score = (
                item["score"]
                * period_weight
            )


            relevant_history_score += (
                weighted_score
            )


            relevant_history_signals.append({

                "period":
                    period_name,

                "signal":
                    signal,

                "base_score":
                    item[
                        "score"
                    ],

                "weighted_score":
                    round(
                        weighted_score,
                        2,
                    ),
            })


    current_risk = (
        crop_analysis[
            "risk_level"
        ]
    )


    current_score = (
        CURRENT_RISK_WEIGHTS.get(
            current_risk,
            0,
        )
    )


    cumulative_score = (
        current_score
        + relevant_history_score
    )


    cumulative_score = round(
        cumulative_score,
        2,
    )


    if cumulative_score >= 5:

        stress_level = (
            "VERY_HIGH"
        )


    elif cumulative_score >= 3:

        stress_level = (
            "HIGH"
        )


    elif cumulative_score >= 2:

        stress_level = (
            "MODERATE"
        )


    elif cumulative_score >= 1:

        stress_level = (
            "LOW"
        )


    else:

        stress_level = (
            "MINIMAL"
        )


    if (
        len(stage_codes) == 1
        and relevant_history_signals
    ):

        confidence = (
            "MEDIUM"
        )


    elif (
        len(stage_codes) == 1
    ):

        confidence = (
            crop_analysis[
                "confidence"
            ]
        )


    else:

        confidence = (
            "LOW"
        )


    return {

        "status":
            "EVALUATED",

        "stage_codes":
            stage_codes,

        "current_risk":
            current_risk,

        "current_risk_score":
            current_score,

        "historical_context":
            historical_context,

        "relevant_history_signals":
            relevant_history_signals,

        "historical_relevance_score":
            round(
                relevant_history_score,
                2,
            ),

        "cumulative_stress_level":
            stress_level,

        "cumulative_stress_score":
            cumulative_score,

        "confidence":
            confidence,
    }


# ============================================================
# EXPLANATION
# ============================================================

def build_explanation(
    result,
):

    if (
        result[
            "status"
        ]
        != "EVALUATED"
    ):

        return (
            result.get(
                "reason",
                "Not evaluated.",
            )
        )


    signals = (
        result[
            "relevant_history_signals"
        ]
    )


    if not signals:

        return (
            "No meaningful historical weather stress "
            "was identified for the current crop stage."
        )


    unique_signals = []


    for item in signals:

        signal = item[
            "signal"
        ]

        if signal not in unique_signals:
            unique_signals.append(
                signal
            )


    if (
        "strong_cumulative_moisture_deficit"
        in unique_signals
        or
        "severe_cumulative_moisture_deficit"
        in unique_signals
    ):

        return (
            "The crop entered the current development "
            "stage after a prolonged moisture deficit. "
            "Current weather stress should therefore be "
            "interpreted in the context of already reduced "
            "soil-water availability."
        )


    if (
        "moderate_cumulative_moisture_deficit"
        in unique_signals
    ):

        return (
            "Recent weather shows a cumulative moisture "
            "deficit that may increase sensitivity during "
            "the current crop stage."
        )


    if (
        "long_dry_spell"
        in unique_signals
        or
        "moderate_dry_spell"
        in unique_signals
    ):

        return (
            "A recent dry spell may have reduced available "
            "soil moisture and increased crop sensitivity."
        )


    if (
        "prolonged_heat"
        in unique_signals
        or
        "prolonged_strong_heat"
        in unique_signals
    ):

        return (
            "The crop has experienced accumulated heat "
            "stress that may amplify current-stage risk."
        )


    if (
        "repeated_heavy_rain"
        in unique_signals
    ):

        return (
            "Repeated heavy rainfall may have created "
            "persistent wet-soil or waterlogging conditions."
        )


    if (
        "repeated_frost"
        in unique_signals
    ):

        return (
            "Repeated frost events may have created "
            "cumulative cold stress."
        )


    return (
        "Historical weather conditions are relevant to "
        "the current crop-stage risk."
    )


# ============================================================
# PRINT
# ============================================================

def print_result(
    region_code,
    crop_code,
    current_analysis,
    cumulative_result,
):

    print()

    print(
        "========================================================"
    )

    print(
        "SeedTrade.eu Cumulative Crop Stress Engine v0.1"
    )

    print(
        "========================================================"
    )

    print()


    print(
        f"Region: "
        f"{region_code}"
    )


    print(
        f"Crop: "
        f"{crop_code}"
    )


    print(
        f"Date: "
        f"{current_analysis['date']}"
    )


    print()


    print(
        "Phenology:"
    )


    if cumulative_result[
        "stage_codes"
    ]:

        print(
            "  "
            + ", ".join(
                cumulative_result[
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
        f"Current crop-weather risk: "
        f"{cumulative_result['current_risk']}"
    )


    if (
        cumulative_result[
            "status"
        ]
        != "EVALUATED"
    ):

        print()

        print(
            f"Cumulative stress: "
            f"{cumulative_result['cumulative_stress_level']}"
        )

        print(
            f"Confidence: "
            f"{cumulative_result['confidence']}"
        )

        print()

        print(
            build_explanation(
                cumulative_result
            )
        )

        print()

        print(
            "========================================================"
        )

        return


    historical_context = (
        cumulative_result[
            "historical_context"
        ]
    )


    print()

    print(
        "Historical context:"
    )


    for period_name in [
        "7d",
        "14d",
        "30d",
    ]:

        signals = (
            historical_context[
                period_name
            ][
                "signals"
            ]
        )

        signal_names = [
            item[
                "signal"
            ]
            for item in signals
        ]


        print(
            f"  {period_name}: "
            + ", ".join(
                signal_names
            )
        )


    print()

    print(
        "Relevant historical signals:"
    )


    relevant_signals = (
        cumulative_result[
            "relevant_history_signals"
        ]
    )


    if relevant_signals:

        for item in relevant_signals:

            print(
                f"  - {item['period']} | "
                f"{item['signal']} | "
                f"weighted score "
                f"{item['weighted_score']}"
            )

    else:

        print(
            "  None"
        )


    print()

    print(
        f"Historical relevance score: "
        f"{cumulative_result['historical_relevance_score']}"
    )


    print(
        f"Cumulative crop stress: "
        f"{cumulative_result['cumulative_stress_level']} "
        f"(score "
        f"{cumulative_result['cumulative_stress_score']})"
    )


    print(
        f"Confidence: "
        f"{cumulative_result['confidence']}"
    )


    print()

    print(
        "Interpretation:"
    )

    print(
        "  "
        + build_explanation(
            cumulative_result
        )
    )


    print()

    print(
        "Yield-loss estimate: DISABLED"
    )

    print(
        "Seed-output estimate: DISABLED"
    )

    print()

    print(
        "========================================================"
    )


# ============================================================
# TEST
# ============================================================

def test_cumulative_stress():

    region_code = (
        "PL_EAST"
    )

    crop_code = (
        "WINTER_WHEAT"
    )

    check_date = (
        date.today()
    )


    latest_weather_file = (
        get_latest_weather_file()
    )


    weather_dataset = (
        load_weather_data(
            latest_weather_file
        )
    )


    current_analysis = (
        analyze_region_crop(
            weather_dataset,
            region_code,
            crop_code,
            check_date,
        )
    )


    history_file = (
        get_latest_history_file(
            region_code
        )
    )


    history_data = (
        load_history_data(
            history_file
        )
    )


    cumulative_result = (
        calculate_cumulative_stress(
            current_analysis,
            history_data,
            crop_code,
            region_code,
            check_date,
        )
    )


    print_result(
        region_code,
        crop_code,
        current_analysis,
        cumulative_result,
    )


if __name__ == "__main__":

    test_cumulative_stress()