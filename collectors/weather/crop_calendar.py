from datetime import date


# SeedTrade.eu
# Seasonal Crop Calendar v0.1
#
# Purpose:
# Map crop development stages to SeedTrade monitoring regions
# using approximate calendar windows.
#
# IMPORTANT:
# These are initial SeedTrade monitoring assumptions,
# not official agronomic boundaries.
# Later they should be refined using:
# - sowing date data
# - temperature accumulation / GDD
# - BBCH observations
# - regional crop calendars
# - JRC MARS / national agronomic sources


CROP_CALENDAR = {

    # =========================================================
    # WINTER WHEAT
    # =========================================================

    "WINTER_WHEAT": {

        "LT_NORTH": [
            ("PRE_SOWING", 8, 20, 9, 5),
            ("SOWING", 9, 1, 9, 25),
            ("EMERGENCE", 9, 10, 10, 15),
            ("TILLERING", 9, 25, 11, 30),
        ],

        "LT_CENTRAL": [
            ("PRE_SOWING", 8, 20, 9, 5),
            ("SOWING", 9, 1, 9, 25),
            ("EMERGENCE", 9, 10, 10, 15),
            ("TILLERING", 9, 25, 11, 30),
        ],

        "LT_SOUTH": [
            ("PRE_SOWING", 8, 25, 9, 10),
            ("SOWING", 9, 5, 9, 30),
            ("EMERGENCE", 9, 15, 10, 20),
            ("TILLERING", 10, 1, 11, 30),
        ],

        "FR_NORTH": [
            ("PRE_SOWING", 9, 1, 9, 25),
            ("SOWING", 9, 20, 10, 25),
            ("EMERGENCE", 10, 1, 11, 15),
            ("TILLERING", 10, 20, 12, 31),
        ],

        "FR_WEST": [
            ("PRE_SOWING", 9, 5, 9, 30),
            ("SOWING", 9, 25, 11, 5),
            ("EMERGENCE", 10, 5, 11, 25),
            ("TILLERING", 10, 25, 12, 31),
        ],

        "FR_CENTRAL": [
            ("PRE_SOWING", 9, 1, 9, 25),
            ("SOWING", 9, 20, 10, 31),
            ("EMERGENCE", 10, 1, 11, 20),
            ("TILLERING", 10, 20, 12, 31),
        ],

        "FR_EAST": [
            ("PRE_SOWING", 8, 25, 9, 20),
            ("SOWING", 9, 15, 10, 20),
            ("EMERGENCE", 9, 25, 11, 10),
            ("TILLERING", 10, 15, 12, 15),
        ],

        "FR_SOUTH": [
            ("PRE_SOWING", 9, 20, 10, 15),
            ("SOWING", 10, 10, 11, 30),
            ("EMERGENCE", 10, 20, 12, 20),
            ("TILLERING", 11, 10, 1, 31),
        ],

        "DE_NORTH": [
            ("PRE_SOWING", 8, 25, 9, 20),
            ("SOWING", 9, 15, 10, 20),
            ("EMERGENCE", 9, 25, 11, 10),
            ("TILLERING", 10, 15, 12, 15),
        ],

        "DE_EAST": [
            ("PRE_SOWING", 8, 20, 9, 15),
            ("SOWING", 9, 10, 10, 15),
            ("EMERGENCE", 9, 20, 11, 5),
            ("TILLERING", 10, 10, 12, 10),
        ],

        "DE_CENTRAL": [
            ("PRE_SOWING", 8, 25, 9, 20),
            ("SOWING", 9, 15, 10, 20),
            ("EMERGENCE", 9, 25, 11, 10),
            ("TILLERING", 10, 15, 12, 15),
        ],

        "DE_SOUTH": [
            ("PRE_SOWING", 8, 25, 9, 20),
            ("SOWING", 9, 15, 10, 20),
            ("EMERGENCE", 9, 25, 11, 10),
            ("TILLERING", 10, 15, 12, 15),
        ],

        "PL_NORTH": [
            ("PRE_SOWING", 8, 20, 9, 10),
            ("SOWING", 9, 5, 9, 30),
            ("EMERGENCE", 9, 15, 10, 20),
            ("TILLERING", 10, 1, 11, 30),
        ],

        "PL_WEST": [
            ("PRE_SOWING", 8, 25, 9, 15),
            ("SOWING", 9, 10, 10, 10),
            ("EMERGENCE", 9, 20, 10, 31),
            ("TILLERING", 10, 10, 12, 15),
        ],

        "PL_CENTRAL": [
            ("PRE_SOWING", 8, 20, 9, 10),
            ("SOWING", 9, 5, 9, 30),
            ("EMERGENCE", 9, 15, 10, 20),
            ("TILLERING", 10, 1, 11, 30),
        ],

        "PL_EAST": [
            ("PRE_SOWING", 8, 15, 9, 5),
            ("SOWING", 9, 1, 9, 25),
            ("EMERGENCE", 9, 10, 10, 15),
            ("TILLERING", 9, 25, 11, 30),
        ],

        "PL_SOUTH": [
            ("PRE_SOWING", 8, 20, 9, 10),
            ("SOWING", 9, 5, 9, 30),
            ("EMERGENCE", 9, 15, 10, 20),
            ("TILLERING", 10, 1, 11, 30),
        ],

        "IT_NORTH": [
            ("PRE_SOWING", 9, 15, 10, 20),
            ("SOWING", 10, 10, 11, 30),
            ("EMERGENCE", 10, 20, 12, 20),
            ("TILLERING", 11, 10, 1, 31),
        ],

        "IT_CENTRAL": [
            ("PRE_SOWING", 9, 20, 10, 31),
            ("SOWING", 10, 20, 12, 10),
            ("EMERGENCE", 11, 1, 12, 31),
            ("TILLERING", 11, 25, 2, 15),
        ],

        "IT_SOUTH": [
            ("PRE_SOWING", 10, 1, 11, 15),
            ("SOWING", 11, 1, 12, 20),
            ("EMERGENCE", 11, 15, 1, 15),
            ("TILLERING", 12, 1, 2, 28),
        ],

        "ES_NORTH": [
            ("PRE_SOWING", 9, 15, 10, 20),
            ("SOWING", 10, 10, 11, 30),
            ("EMERGENCE", 10, 20, 12, 20),
            ("TILLERING", 11, 10, 1, 31),
        ],

        "ES_CENTRAL": [
            ("PRE_SOWING", 9, 25, 11, 5),
            ("SOWING", 10, 20, 12, 15),
            ("EMERGENCE", 11, 1, 1, 10),
            ("TILLERING", 11, 25, 2, 15),
        ],

        "ES_SOUTH": [
            ("PRE_SOWING", 10, 1, 11, 20),
            ("SOWING", 11, 1, 12, 31),
            ("EMERGENCE", 11, 15, 1, 31),
            ("TILLERING", 12, 1, 2, 28),
        ],
    },


    # =========================================================
    # WINTER RAPESEED
    # =========================================================

    "WINTER_RAPESEED": {

        "LT_NORTH": [
            ("PRE_SOWING", 7, 25, 8, 10),
            ("SOWING_EMERGENCE", 8, 5, 8, 31),
            ("ROSETTE", 8, 20, 11, 15),
        ],

        "LT_CENTRAL": [
            ("PRE_SOWING", 7, 25, 8, 10),
            ("SOWING_EMERGENCE", 8, 5, 8, 31),
            ("ROSETTE", 8, 20, 11, 15),
        ],

        "LT_SOUTH": [
            ("PRE_SOWING", 7, 30, 8, 15),
            ("SOWING_EMERGENCE", 8, 10, 9, 5),
            ("ROSETTE", 8, 25, 11, 20),
        ],

        "FR_NORTH": [
            ("PRE_SOWING", 7, 25, 8, 20),
            ("SOWING_EMERGENCE", 8, 10, 9, 10),
            ("ROSETTE", 8, 25, 12, 15),
        ],

        "FR_WEST": [
            ("PRE_SOWING", 8, 1, 8, 25),
            ("SOWING_EMERGENCE", 8, 15, 9, 20),
            ("ROSETTE", 9, 1, 12, 31),
        ],

        "FR_CENTRAL": [
            ("PRE_SOWING", 7, 25, 8, 20),
            ("SOWING_EMERGENCE", 8, 10, 9, 15),
            ("ROSETTE", 8, 25, 12, 15),
        ],

        "FR_EAST": [
            ("PRE_SOWING", 7, 20, 8, 15),
            ("SOWING_EMERGENCE", 8, 5, 9, 5),
            ("ROSETTE", 8, 20, 11, 30),
        ],

        "DE_NORTH": [
            ("PRE_SOWING", 7, 20, 8, 15),
            ("SOWING_EMERGENCE", 8, 5, 9, 5),
            ("ROSETTE", 8, 20, 11, 30),
        ],

        "DE_EAST": [
            ("PRE_SOWING", 7, 15, 8, 10),
            ("SOWING_EMERGENCE", 8, 1, 8, 31),
            ("ROSETTE", 8, 15, 11, 20),
        ],

        "DE_CENTRAL": [
            ("PRE_SOWING", 7, 20, 8, 15),
            ("SOWING_EMERGENCE", 8, 5, 9, 5),
            ("ROSETTE", 8, 20, 11, 30),
        ],

        "DE_SOUTH": [
            ("PRE_SOWING", 7, 20, 8, 15),
            ("SOWING_EMERGENCE", 8, 5, 9, 5),
            ("ROSETTE", 8, 20, 11, 30),
        ],

        "PL_NORTH": [
            ("PRE_SOWING", 7, 15, 8, 10),
            ("SOWING_EMERGENCE", 8, 1, 8, 31),
            ("ROSETTE", 8, 15, 11, 20),
        ],

        "PL_WEST": [
            ("PRE_SOWING", 7, 20, 8, 15),
            ("SOWING_EMERGENCE", 8, 5, 9, 5),
            ("ROSETTE", 8, 20, 11, 30),
        ],

        "PL_CENTRAL": [
            ("PRE_SOWING", 7, 15, 8, 10),
            ("SOWING_EMERGENCE", 8, 1, 8, 31),
            ("ROSETTE", 8, 15, 11, 20),
        ],

        "PL_EAST": [
            ("PRE_SOWING", 7, 10, 8, 5),
            ("SOWING_EMERGENCE", 7, 25, 8, 25),
            ("ROSETTE", 8, 10, 11, 15),
        ],

        "PL_SOUTH": [
            ("PRE_SOWING", 7, 15, 8, 10),
            ("SOWING_EMERGENCE", 8, 1, 8, 31),
            ("ROSETTE", 8, 15, 11, 20),
        ],
    },
}


def date_in_window(check_date, start_month, start_day, end_month, end_day):
    year = check_date.year

    start = date(year, start_month, start_day)
    end = date(year, end_month, end_day)

    if start <= end:
        return start <= check_date <= end

    # Window crosses New Year
    return check_date >= start or check_date <= end


def get_crop_stage_for_date(crop_code, region_code, check_date=None):
    if check_date is None:
        check_date = date.today()

    crop_regions = CROP_CALENDAR.get(crop_code)

    if crop_regions is None:
        return None

    stages = crop_regions.get(region_code)

    if stages is None:
        return None

    matches = []

    for stage in stages:
        (
            stage_code,
            start_month,
            start_day,
            end_month,
            end_day,
        ) = stage

        if date_in_window(
            check_date,
            start_month,
            start_day,
            end_month,
            end_day,
        ):
            matches.append(stage_code)

    if not matches:
        return None

    return matches


def test_calendar():
    test_date = date.today()

    print("SeedTrade.eu Crop Calendar")
    print("--------------------------")
    print(f"Date: {test_date}")
    print()

    for crop_code in CROP_CALENDAR:

        print(crop_code)

        for region_code in CROP_CALENDAR[crop_code]:

            stages = get_crop_stage_for_date(
                crop_code,
                region_code,
                test_date,
            )

            if stages:
                print(
                    f"  {region_code}: "
                    + ", ".join(stages)
                )

        print()


if __name__ == "__main__":
    test_calendar()