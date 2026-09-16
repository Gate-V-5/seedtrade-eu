from datetime import date, datetime
from pathlib import Path
import json


# ============================================================
# PATHS
# ============================================================

PROJECT_ROOT = Path(__file__).resolve().parents[2]

WEATHER_HISTORY_DIR = (
    PROJECT_ROOT
    / "data"
    / "raw"
    / "weather_history"
)


# ============================================================
# MODEL INFO
# ============================================================

MODEL_METADATA = {

    "name":
        "SeedTrade.eu Phenology Engine",

    "version":
        "0.1",

    "status":
        "PRELIMINARY_RULE_BASED_MODEL",

    "purpose":
        (
            "Estimate likely crop development stage using "
            "regional crop calendar, sowing window and "
            "temperature accumulation."
        ),

    "limitations": [
        "Does not yet use actual field sowing dates",
        "Does not yet use satellite observations",
        "Does not yet use JRC MARS crop-stage observations",
        "Does not yet include vernalization",
        "Does not yet include photoperiod",
        "Does not yet estimate exact BBCH",
    ],
}


# ============================================================
# REGION SOWING WINDOWS
# WINTER WHEAT v0.1
# ============================================================

WINTER_WHEAT_SOWING_WINDOWS = {

    "LT_NORTH": {
        "start": "09-01",
        "end": "09-20",
    },

    "LT_CENTRAL": {
        "start": "09-01",
        "end": "09-25",
    },

    "LT_SOUTH": {
        "start": "09-05",
        "end": "09-30",
    },

    "FR_NORTH": {
        "start": "09-20",
        "end": "10-25",
    },

    "FR_WEST": {
        "start": "09-25",
        "end": "10-30",
    },

    "FR_CENTRAL": {
        "start": "09-20",
        "end": "10-25",
    },

    "FR_EAST": {
        "start": "09-15",
        "end": "10-20",
    },

    "DE_NORTH": {
        "start": "09-15",
        "end": "10-20",
    },

    "DE_EAST": {
        "start": "09-10",
        "end": "10-15",
    },

    "DE_CENTRAL": {
        "start": "09-15",
        "end": "10-20",
    },

    "DE_SOUTH": {
        "start": "09-10",
        "end": "10-15",
    },

    "PL_NORTH": {
        "start": "09-01",
        "end": "09-25",
    },

    "PL_WEST": {
        "start": "09-10",
        "end": "10-05",
    },

    "PL_CENTRAL": {
        "start": "09-05",
        "end": "09-30",
    },

    "PL_EAST": {
        "start": "09-01",
        "end": "09-20",
    },

    "PL_SOUTH": {
        "start": "09-01",
        "end": "09-25",
    },

    "ES_NORTH": {
        "start": "10-01",
        "end": "11-10",
    },

    "ES_CENTRAL": {
        "start": "10-10",
        "end": "11-20",
    },

    "ES_SOUTH": {
        "start": "10-20",
        "end": "12-01",
    },

    "IT_NORTH": {
        "start": "10-01",
        "end": "11-10",
    },

    "IT_CENTRAL": {
        "start": "10-10",
        "end": "11-20",
    },

    "IT_SOUTH": {
        "start": "10-20",
        "end": "12-01",
    },
}


# ============================================================
# DEVELOPMENT THRESHOLDS v0.1
#
# These are NOT final validated agronomic coefficients.
# They are technical thresholds for architecture testing.
# ============================================================

WINTER_WHEAT_GDD_THRESHOLDS = {

    "SOWING":
        0,

    "GERMINATION":
        40,

    "EMERGENCE":
        80,

    "EARLY_LEAF":
        130,

    "TILLERING":
        200,
}


BASE_TEMPERATURE_C = 0.0


# ============================================================
# HELPERS
# ============================================================

def parse_month_day(
    value,
    year,
):

    month, day = value.split(
        "-"
    )

    return date(
        year,
        int(month),
        int(day),
    )


def get_sowing_window(
    region_code,
    check_date,
):

    window = (
        WINTER_WHEAT_SOWING_WINDOWS.get(
            region_code
        )
    )


    if window is None:

        return None


    start_date = parse_month_day(
        window["start"],
        check_date.year,
    )


    end_date = parse_month_day(
        window["end"],
        check_date.year,
    )


    return {

        "start_date":
            start_date,

        "end_date":
            end_date,
    }


def estimate_reference_sowing_date(
    region_code,
    check_date,
):

    window = get_sowing_window(
        region_code,
        check_date,
    )


    if window is None:

        return None


    start_date = window[
        "start_date"
    ]

    end_date = window[
        "end_date"
    ]


    midpoint_days = (
        (end_date - start_date).days
        // 2
    )


    reference_date = (
        start_date
        + (
            end_date
            - start_date
        )
        / 2
    )


    reference_date = (
        start_date
        + __import__(
            "datetime"
        ).timedelta(
            days=midpoint_days
        )
    )


    return reference_date


# ============================================================
# WEATHER HISTORY
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
            f"No historical weather data "
            f"found for {region_code}."
        )


    return files[0]


def load_history(
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
# TEMPERATURE SERIES
# ============================================================

def get_daily_temperature_series(
    history_data,
):

    weather = history_data.get(
        "weather"
    )


    if weather is None:

        return []


    daily = weather.get(
        "daily",
        {}
    )


    dates = daily.get(
        "time",
        []
    )


    tmax = daily.get(
        "temperature_2m_max",
        []
    )


    tmin = daily.get(
        "temperature_2m_min",
        []
    )


    result = []


    for index, value in enumerate(
        dates
    ):

        if (
            index >= len(tmax)
            or
            index >= len(tmin)
        ):

            continue


        max_temp = tmax[
            index
        ]

        min_temp = tmin[
            index
        ]


        if (
            max_temp is None
            or min_temp is None
        ):

            continue


        daily_mean = (
            max_temp
            + min_temp
        ) / 2


        result.append({

            "date":
                date.fromisoformat(
                    value
                ),

            "tmax":
                max_temp,

            "tmin":
                min_temp,

            "tmean":
                daily_mean,
        })


    return result


# ============================================================
# GDD
# ============================================================

def calculate_gdd(
    temperature_series,
    start_date,
    end_date,
    base_temperature=BASE_TEMPERATURE_C,
):

    total_gdd = 0.0

    days_used = 0


    for item in temperature_series:

        current_date = item[
            "date"
        ]


        if current_date < start_date:

            continue


        if current_date > end_date:

            continue


        daily_gdd = max(
            0.0,
            item["tmean"]
            - base_temperature,
        )


        total_gdd += (
            daily_gdd
        )


        days_used += 1


    return {

        "gdd":
            round(
                total_gdd,
                1,
            ),

        "days_used":
            days_used,
    }


# ============================================================
# PHENOLOGY CLASSIFICATION
# ============================================================

def classify_stage_from_gdd(
    gdd,
):

    if (
        gdd
        < WINTER_WHEAT_GDD_THRESHOLDS[
            "GERMINATION"
        ]
    ):

        return "SOWING"


    if (
        gdd
        < WINTER_WHEAT_GDD_THRESHOLDS[
            "EMERGENCE"
        ]
    ):

        return "GERMINATION"


    if (
        gdd
        < WINTER_WHEAT_GDD_THRESHOLDS[
            "EARLY_LEAF"
        ]
    ):

        return "EMERGENCE"


    if (
        gdd
        < WINTER_WHEAT_GDD_THRESHOLDS[
            "TILLERING"
        ]
    ):

        return "EARLY_LEAF"


    return "TILLERING"


# ============================================================
# PHENOLOGY ENGINE
# ============================================================

def estimate_winter_wheat_phenology(
    region_code,
    history_data,
    check_date=None,
):

    if check_date is None:

        check_date = (
            date.today()
        )


    sowing_window = (
        get_sowing_window(
            region_code,
            check_date,
        )
    )


    if sowing_window is None:

        return {

            "status":
                "NO_REGION_MODEL",

            "region_code":
                region_code,

            "confidence":
                "LOW",
        }


    start_date = (
        sowing_window[
            "start_date"
        ]
    )


    end_date = (
        sowing_window[
            "end_date"
        ]
    )


    if check_date < start_date:

        return {

            "status":
                "PRE_SOWING",

            "region_code":
                region_code,

            "check_date":
                str(check_date),

            "sowing_window_start":
                str(start_date),

            "sowing_window_end":
                str(end_date),

            "estimated_stage":
                "PRE_SOWING",

            "gdd":
                0.0,

            "confidence":
                "MEDIUM",
        }


    reference_sowing_date = (
        estimate_reference_sowing_date(
            region_code,
            check_date,
        )
    )


    if (
        check_date
        < reference_sowing_date
    ):

        return {

            "status":
                "SOWING_WINDOW",

            "region_code":
                region_code,

            "check_date":
                str(check_date),

            "sowing_window_start":
                str(start_date),

            "sowing_window_end":
                str(end_date),

            "reference_sowing_date":
                str(reference_sowing_date),

            "estimated_stage":
                "SOWING",

            "gdd":
                0.0,

            "confidence":
                "LOW",
        }


    temperature_series = (
        get_daily_temperature_series(
            history_data
        )
    )


    if not temperature_series:

        return {

            "status":
                "NO_TEMPERATURE_DATA",

            "region_code":
                region_code,

            "confidence":
                "LOW",
        }


    gdd_result = (
        calculate_gdd(
            temperature_series,
            reference_sowing_date,
            check_date,
        )
    )


    estimated_stage = (
        classify_stage_from_gdd(
            gdd_result[
                "gdd"
            ]
        )
    )


    if (
        gdd_result[
            "days_used"
        ]
        >= 7
    ):

        confidence = (
            "MEDIUM"
        )

    else:

        confidence = (
            "LOW"
        )


    return {

        "status":
            "ESTIMATED",

        "region_code":
            region_code,

        "check_date":
            str(check_date),

        "sowing_window_start":
            str(start_date),

        "sowing_window_end":
            str(end_date),

        "reference_sowing_date":
            str(reference_sowing_date),

        "temperature_days_used":
            gdd_result[
                "days_used"
            ],

        "gdd":
            gdd_result[
                "gdd"
            ],

        "estimated_stage":
            estimated_stage,

        "confidence":
            confidence,
    }


# ============================================================
# PRINT
# ============================================================

def print_result(
    result,
):

    print()

    print(
        "========================================================"
    )

    print(
        "SeedTrade.eu Phenology Engine v0.1"
    )

    print(
        "========================================================"
    )

    print()


    print(
        f"Region: "
        f"{result.get('region_code')}"
    )


    print(
        f"Status: "
        f"{result.get('status')}"
    )


    if (
        "check_date"
        in result
    ):

        print(
            f"Date: "
            f"{result['check_date']}"
        )


    if (
        "sowing_window_start"
        in result
    ):

        print(
            f"Sowing window: "
            f"{result['sowing_window_start']} "
            f"to "
            f"{result['sowing_window_end']}"
        )


    if (
        "reference_sowing_date"
        in result
    ):

        print(
            f"Reference sowing date: "
            f"{result['reference_sowing_date']}"
        )


    print()


    print(
        f"Estimated stage: "
        f"{result.get('estimated_stage', 'UNKNOWN')}"
    )


    print(
        f"GDD: "
        f"{result.get('gdd', 0.0)}"
    )


    if (
        "temperature_days_used"
        in result
    ):

        print(
            f"Temperature days used: "
            f"{result['temperature_days_used']}"
        )


    print(
        f"Confidence: "
        f"{result.get('confidence', 'LOW')}"
    )


    print()

    print(
        "IMPORTANT:"
    )

    print(
        "  This is a preliminary estimated phenology stage."
    )

    print(
        "  It is NOT yet an observed field BBCH stage."
    )

    print()

    print(
        "========================================================"
    )


# ============================================================
# TEST
# ============================================================

def test_engine():

    region_code = (
        "PL_EAST"
    )


    history_file = (
        get_latest_history_file(
            region_code
        )
    )


    history_data = (
        load_history(
            history_file
        )
    )


    result = (
        estimate_winter_wheat_phenology(
            region_code,
            history_data,
            date.today(),
        )
    )


    print_result(
        result
    )


if __name__ == "__main__":

    test_engine()