# SeedTrade.eu
# Crop Profiles v0.1
#
# Purpose:
# Define crop-specific agronomic timing, phenological stages
# and weather sensitivity for SeedTrade Weather Intelligence.
#
# IMPORTANT:
# This is an initial rules-based structure.
# Later it should be refined by region, official agronomic sources,
# historical observations and model validation.


CROP_PROFILES = {

    "WINTER_WHEAT": {
        "name": "Winter wheat",
        "latin_name": "Triticum aestivum",
        "crop_group": "cereals",

        "stages": [
            {
                "code": "PRE_SOWING",
                "name": "Pre-sowing",
                "bbch_min": None,
                "bbch_max": None,
                "main_weather_risks": [
                    "soil_dryness",
                    "excessive_rain",
                    "waterlogging",
                    "high_soil_temperature",
                ],
            },
            {
                "code": "SOWING",
                "name": "Sowing",
                "bbch_min": 0,
                "bbch_max": 9,
                "main_weather_risks": [
                    "soil_dryness",
                    "excessive_rain",
                    "waterlogging",
                    "high_soil_temperature",
                ],
            },
            {
                "code": "EMERGENCE",
                "name": "Emergence and establishment",
                "bbch_min": 10,
                "bbch_max": 19,
                "main_weather_risks": [
                    "soil_dryness",
                    "frost",
                    "waterlogging",
                    "high_temperature",
                ],
            },
            {
                "code": "TILLERING",
                "name": "Tillering",
                "bbch_min": 20,
                "bbch_max": 29,
                "main_weather_risks": [
                    "frost",
                    "waterlogging",
                    "soil_dryness",
                ],
            },
            {
                "code": "STEM_EXTENSION",
                "name": "Stem extension",
                "bbch_min": 30,
                "bbch_max": 39,
                "main_weather_risks": [
                    "frost",
                    "drought",
                    "heat",
                    "waterlogging",
                ],
            },
            {
                "code": "BOOTING_HEADING",
                "name": "Booting and heading",
                "bbch_min": 40,
                "bbch_max": 59,
                "main_weather_risks": [
                    "frost",
                    "heat",
                    "drought",
                    "heavy_rain",
                ],
            },
            {
                "code": "FLOWERING",
                "name": "Flowering",
                "bbch_min": 60,
                "bbch_max": 69,
                "main_weather_risks": [
                    "heat",
                    "drought",
                    "heavy_rain",
                    "frost",
                ],
            },
            {
                "code": "GRAIN_FILLING",
                "name": "Grain filling",
                "bbch_min": 70,
                "bbch_max": 89,
                "main_weather_risks": [
                    "heat",
                    "drought",
                    "heavy_rain",
                ],
            },
            {
                "code": "MATURITY_HARVEST",
                "name": "Maturity and harvest",
                "bbch_min": 90,
                "bbch_max": 99,
                "main_weather_risks": [
                    "heavy_rain",
                    "high_humidity",
                    "lodging",
                ],
            },
        ],

        "seed_quality_risks": [
            "reduced_germination",
            "reduced_tgm",
            "pre_harvest_sprouting",
            "disease_pressure",
            "lodging_losses",
        ],
    },


    "WINTER_RAPESEED": {
        "name": "Winter rapeseed",
        "latin_name": "Brassica napus",
        "crop_group": "oilseeds",

        "stages": [
            {
                "code": "PRE_SOWING",
                "name": "Pre-sowing",
                "bbch_min": None,
                "bbch_max": None,
                "main_weather_risks": [
                    "soil_dryness",
                    "high_soil_temperature",
                    "excessive_rain",
                ],
            },
            {
                "code": "SOWING_EMERGENCE",
                "name": "Sowing and emergence",
                "bbch_min": 0,
                "bbch_max": 19,
                "main_weather_risks": [
                    "soil_dryness",
                    "heat",
                    "waterlogging",
                ],
            },
            {
                "code": "ROSETTE",
                "name": "Rosette development",
                "bbch_min": 20,
                "bbch_max": 29,
                "main_weather_risks": [
                    "frost",
                    "waterlogging",
                    "excessive_growth",
                ],
            },
            {
                "code": "STEM_EXTENSION",
                "name": "Stem extension",
                "bbch_min": 30,
                "bbch_max": 39,
                "main_weather_risks": [
                    "frost",
                    "drought",
                ],
            },
            {
                "code": "BUD_FLOWERING",
                "name": "Bud development and flowering",
                "bbch_min": 50,
                "bbch_max": 69,
                "main_weather_risks": [
                    "frost",
                    "heat",
                    "drought",
                    "heavy_rain",
                ],
            },
            {
                "code": "POD_FILLING",
                "name": "Pod and seed filling",
                "bbch_min": 70,
                "bbch_max": 89,
                "main_weather_risks": [
                    "heat",
                    "drought",
                    "heavy_rain",
                ],
            },
            {
                "code": "MATURITY_HARVEST",
                "name": "Maturity and harvest",
                "bbch_min": 90,
                "bbch_max": 99,
                "main_weather_risks": [
                    "heavy_rain",
                    "wind",
                    "pod_shattering",
                ],
            },
        ],

        "seed_quality_risks": [
            "reduced_seed_size",
            "reduced_germination",
            "pod_shattering",
            "disease_pressure",
        ],
    },


    "PEA": {
        "name": "Field pea",
        "latin_name": "Pisum sativum",
        "crop_group": "legumes",

        "stages": [
            {
                "code": "SOWING_EMERGENCE",
                "name": "Sowing and emergence",
                "bbch_min": 0,
                "bbch_max": 19,
                "main_weather_risks": [
                    "cold_soil",
                    "waterlogging",
                    "soil_dryness",
                ],
            },
            {
                "code": "VEGETATIVE",
                "name": "Vegetative development",
                "bbch_min": 20,
                "bbch_max": 39,
                "main_weather_risks": [
                    "drought",
                    "waterlogging",
                    "frost",
                ],
            },
            {
                "code": "FLOWERING",
                "name": "Flowering",
                "bbch_min": 50,
                "bbch_max": 69,
                "main_weather_risks": [
                    "heat",
                    "drought",
                    "heavy_rain",
                ],
            },
            {
                "code": "POD_FILLING",
                "name": "Pod and seed filling",
                "bbch_min": 70,
                "bbch_max": 89,
                "main_weather_risks": [
                    "heat",
                    "drought",
                    "excessive_rain",
                ],
            },
            {
                "code": "MATURITY_HARVEST",
                "name": "Maturity and harvest",
                "bbch_min": 90,
                "bbch_max": 99,
                "main_weather_risks": [
                    "heavy_rain",
                    "lodging",
                    "high_humidity",
                ],
            },
        ],

        "seed_quality_risks": [
            "reduced_germination",
            "seed_discoloration",
            "seed_disease",
            "lodging_losses",
        ],
    },


    "RED_CLOVER": {
        "name": "Red clover",
        "latin_name": "Trifolium pratense",
        "crop_group": "forage_legumes",

        "stages": [
            {
                "code": "ESTABLISHMENT",
                "name": "Establishment",
                "bbch_min": 0,
                "bbch_max": 29,
                "main_weather_risks": [
                    "soil_dryness",
                    "heat",
                    "waterlogging",
                ],
            },
            {
                "code": "VEGETATIVE",
                "name": "Vegetative development",
                "bbch_min": 30,
                "bbch_max": 49,
                "main_weather_risks": [
                    "drought",
                    "waterlogging",
                ],
            },
            {
                "code": "FLOWERING",
                "name": "Flowering and pollination",
                "bbch_min": 50,
                "bbch_max": 69,
                "main_weather_risks": [
                    "heavy_rain",
                    "heat",
                    "drought",
                    "low_pollination_conditions",
                ],
            },
            {
                "code": "SEED_FILLING",
                "name": "Seed filling",
                "bbch_min": 70,
                "bbch_max": 89,
                "main_weather_risks": [
                    "drought",
                    "heavy_rain",
                    "high_humidity",
                ],
            },
            {
                "code": "MATURITY_HARVEST",
                "name": "Seed maturity and harvest",
                "bbch_min": 90,
                "bbch_max": 99,
                "main_weather_risks": [
                    "heavy_rain",
                    "high_humidity",
                    "lodging",
                ],
            },
        ],

        "seed_quality_risks": [
            "reduced_seed_set",
            "reduced_germination",
            "harvest_losses",
            "seed_disease",
        ],
    },


    "FLAX": {
        "name": "Oilseed flax",
        "latin_name": "Linum usitatissimum",
        "crop_group": "oilseeds",

        "stages": [
            {
                "code": "SOWING_EMERGENCE",
                "name": "Sowing and emergence",
                "bbch_min": 0,
                "bbch_max": 19,
                "main_weather_risks": [
                    "cold_soil",
                    "waterlogging",
                    "soil_dryness",
                ],
            },
            {
                "code": "VEGETATIVE",
                "name": "Vegetative development",
                "bbch_min": 20,
                "bbch_max": 49,
                "main_weather_risks": [
                    "drought",
                    "waterlogging",
                    "frost",
                ],
            },
            {
                "code": "FLOWERING",
                "name": "Flowering",
                "bbch_min": 50,
                "bbch_max": 69,
                "main_weather_risks": [
                    "heat",
                    "drought",
                    "heavy_rain",
                ],
            },
            {
                "code": "CAPSULE_FILLING",
                "name": "Capsule and seed filling",
                "bbch_min": 70,
                "bbch_max": 89,
                "main_weather_risks": [
                    "heat",
                    "drought",
                    "heavy_rain",
                ],
            },
            {
                "code": "MATURITY_HARVEST",
                "name": "Maturity and harvest",
                "bbch_min": 90,
                "bbch_max": 99,
                "main_weather_risks": [
                    "heavy_rain",
                    "high_humidity",
                    "lodging",
                ],
            },
        ],

        "seed_quality_risks": [
            "reduced_germination",
            "seed_discoloration",
            "fungal_disease",
            "reduced_seed_weight",
        ],
    },
}


def get_crop_profile(crop_code):
    return CROP_PROFILES.get(crop_code)


def get_crop_stage(crop_code, bbch):
    crop = get_crop_profile(crop_code)

    if crop is None:
        return None

    for stage in crop["stages"]:

        bbch_min = stage["bbch_min"]
        bbch_max = stage["bbch_max"]

        if bbch_min is None or bbch_max is None:
            continue

        if bbch_min <= bbch <= bbch_max:
            return stage

    return None


if __name__ == "__main__":

    print("SeedTrade.eu Crop Profiles")
    print("--------------------------")

    for crop_code, crop in CROP_PROFILES.items():
        print()
        print(f"{crop_code}: {crop['name']}")

        for stage in crop["stages"]:
            print(
                f"  {stage['code']} | "
                f"{stage['name']}"
            )