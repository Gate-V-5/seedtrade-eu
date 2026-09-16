"""
SeedTrade.eu
Winter Wheat EU Crop Model v1.1

Purpose
-------
Structured agronomic model for winter wheat:

Weather
→ Region
→ Phenology / BBCH
→ Stage-specific weather stress
→ Crop impact
→ Seed-production impact

IMPORTANT
---------
This remains a preliminary rules-based model.

It does NOT yet:
- predict exact yield loss percentages
- predict certified seed output
- determine actual BBCH from calendar date alone
- replace field observations
- replace official crop monitoring

Future phenology inputs:
- regional crop calendar
- actual sowing date
- temperature accumulation / GDD
- historical weather
- JRC MARS / Agri4Cast
- Earth observation
- national crop-monitoring data
"""


# ============================================================
# MODEL METADATA
# ============================================================

MODEL_METADATA = {

    "crop_code": "WINTER_WHEAT",

    "name": "Winter wheat",

    "latin_name": "Triticum aestivum L.",

    "crop_group": "CEREALS",

    "production_type": "SEED_AND_GRAIN",

    "model_version": "1.1",

    "geographic_scope": "EU",

    "phenology_system": "BBCH / cereal growth stages",

    "status": "PRELIMINARY_RULE_BASED_MODEL",

    "yield_loss_model_enabled": False,

    "seed_output_model_enabled": False,
}


# ============================================================
# WEATHER SIGNALS
# ============================================================

WEATHER_SIGNALS = {

    "soil_dryness",

    "mild_moisture_deficit",

    "moderate_moisture_deficit",

    "strong_moisture_deficit",

    "drought",

    "heat",

    "strong_heat",

    "frost",

    "severe_frost",

    "heavy_rain",

    "repeated_heavy_rain",

    "waterlogging",

    "high_humidity",

    "storm",

    "strong_wind",
}


# ============================================================
# SENSITIVITY SCALE
# ============================================================

SENSITIVITY_LEVELS = {

    0: "NONE",

    1: "LOW",

    2: "MODERATE",

    3: "HIGH",

    4: "VERY_HIGH",
}


# ============================================================
# WINTER WHEAT PHENOLOGICAL STAGES
# ============================================================

STAGES = [

    # --------------------------------------------------------
    # PRE-SOWING
    # --------------------------------------------------------

    {
        "code": "PRE_SOWING",

        "name": "Pre-sowing",

        "bbch_min": None,

        "bbch_max": None,

        "yield_component": "establishment potential",

        "description":
            "Seedbed preparation and soil conditions before sowing.",

        "weather_sensitivity": {

            "soil_dryness": 2,

            "mild_moisture_deficit": 1,

            "moderate_moisture_deficit": 2,

            "strong_moisture_deficit": 3,

            "heavy_rain": 2,

            "repeated_heavy_rain": 3,

            "waterlogging": 3,
        },

        "main_concerns": [
            "poor seedbed conditions",
            "delayed sowing",
            "poor soil structure",
            "insufficient moisture for germination",
        ],
    },


    # --------------------------------------------------------
    # SOWING / GERMINATION
    # BBCH 00-09
    # --------------------------------------------------------

    {
        "code": "SOWING",

        "name": "Sowing and germination",

        "bbch_min": 0,

        "bbch_max": 9,

        "yield_component": "plant establishment",

        "description":
            "Seed germination and coleoptile development before emergence.",

        "weather_sensitivity": {

            "soil_dryness": 3,

            "mild_moisture_deficit": 1,

            "moderate_moisture_deficit": 3,

            "strong_moisture_deficit": 4,

            "drought": 4,

            "heat": 2,

            "strong_heat": 3,

            "heavy_rain": 2,

            "repeated_heavy_rain": 3,

            "waterlogging": 4,
        },

        "main_concerns": [
            "delayed germination",
            "uneven emergence",
            "seedling mortality",
            "soil crusting",
            "oxygen deficiency",
        ],
    },


    # --------------------------------------------------------
    # EMERGENCE / LEAF DEVELOPMENT
    # BBCH 10-19
    # --------------------------------------------------------

    {
        "code": "EMERGENCE",

        "name": "Emergence and leaf development",

        "bbch_min": 10,

        "bbch_max": 19,

        "yield_component": "plant population",

        "description":
            "Emergence and early leaf development.",

        "weather_sensitivity": {

            "soil_dryness": 3,

            "mild_moisture_deficit": 1,

            "moderate_moisture_deficit": 3,

            "strong_moisture_deficit": 4,

            "drought": 4,

            "heat": 2,

            "strong_heat": 3,

            "frost": 2,

            "heavy_rain": 2,

            "repeated_heavy_rain": 3,

            "waterlogging": 4,
        },

        "main_concerns": [
            "poor establishment",
            "reduced plant density",
            "uneven crop development",
            "root restriction",
        ],
    },


    # --------------------------------------------------------
    # TILLERING
    # BBCH 20-29
    # --------------------------------------------------------

    {
        "code": "TILLERING",

        "name": "Tillering",

        "bbch_min": 20,

        "bbch_max": 29,

        "yield_component": "potential ear number",

        "description":
            "Formation of tillers that contribute to final ear density.",

        "weather_sensitivity": {

            "soil_dryness": 2,

            "mild_moisture_deficit": 1,

            "moderate_moisture_deficit": 2,

            "strong_moisture_deficit": 3,

            "drought": 3,

            "frost": 2,

            "severe_frost": 3,

            "waterlogging": 3,
        },

        "main_concerns": [
            "reduced tiller formation",
            "tiller mortality",
            "restricted canopy development",
            "restricted root development",
        ],
    },


    # --------------------------------------------------------
    # WINTER DORMANCY
    # --------------------------------------------------------

    {
        "code": "WINTER_DORMANCY",

        "name": "Winter dormancy / slow winter development",

        "bbch_min": 20,

        "bbch_max": 29,

        "yield_component": "winter survival",

        "description":
            "Period of strongly reduced crop development during winter.",

        "weather_sensitivity": {

            "frost": 2,

            "severe_frost": 4,

            "waterlogging": 3,

            "repeated_heavy_rain": 2,
        },

        "main_concerns": [
            "winter kill",
            "crown damage",
            "root oxygen deficiency",
            "loss of plants",
        ],
    },


    # --------------------------------------------------------
    # SPRING REGROWTH
    # --------------------------------------------------------

    {
        "code": "SPRING_REGROWTH",

        "name": "Spring regrowth",

        "bbch_min": 20,

        "bbch_max": 30,

        "yield_component": "surviving productive shoots",

        "description":
            "Crop resumes active vegetative development after winter.",

        "weather_sensitivity": {

            "mild_moisture_deficit": 1,

            "moderate_moisture_deficit": 2,

            "strong_moisture_deficit": 3,

            "drought": 3,

            "frost": 2,

            "severe_frost": 3,

            "waterlogging": 3,
        },

        "main_concerns": [
            "slow recovery",
            "loss of shoots",
            "restricted biomass development",
            "restricted nutrient uptake",
        ],
    },


    # --------------------------------------------------------
    # STEM ELONGATION
    # BBCH 30-39
    # --------------------------------------------------------

    {
        "code": "STEM_ELONGATION",

        "name": "Stem elongation",

        "bbch_min": 30,

        "bbch_max": 39,

        "yield_component": "ear number and canopy capacity",

        "description":
            "Rapid canopy growth and formation of yield-producing structures.",

        "weather_sensitivity": {

            "mild_moisture_deficit": 1,

            "moderate_moisture_deficit": 2,

            "strong_moisture_deficit": 3,

            "drought": 3,

            "heat": 2,

            "strong_heat": 3,

            "frost": 3,

            "severe_frost": 4,

            "waterlogging": 3,

            "strong_wind": 2,
        },

        "main_concerns": [
            "reduced biomass",
            "shoot mortality",
            "reduced ear development",
            "frost injury to reproductive structures",
        ],
    },


    # --------------------------------------------------------
    # BOOTING
    # BBCH 40-49
    # --------------------------------------------------------

    {
        "code": "BOOTING",

        "name": "Booting",

        "bbch_min": 40,

        "bbch_max": 49,

        "yield_component": "potential fertile florets",

        "description":
            "Ear develops inside the flag-leaf sheath.",

        "weather_sensitivity": {

            "mild_moisture_deficit": 1,

            "moderate_moisture_deficit": 3,

            "strong_moisture_deficit": 4,

            "drought": 4,

            "heat": 3,

            "strong_heat": 4,

            "frost": 3,

            "severe_frost": 4,

            "waterlogging": 2,
        },

        "main_concerns": [
            "reduced floret survival",
            "reduced ear fertility",
            "reduced assimilate supply",
        ],
    },


    # --------------------------------------------------------
    # HEADING
    # BBCH 50-59
    # --------------------------------------------------------

    {
        "code": "HEADING",

        "name": "Ear emergence / heading",

        "bbch_min": 50,

        "bbch_max": 59,

        "yield_component": "grain number potential",

        "description":
            "Ear emerges from the flag-leaf sheath.",

        "weather_sensitivity": {

            "mild_moisture_deficit": 1,

            "moderate_moisture_deficit": 3,

            "strong_moisture_deficit": 4,

            "drought": 4,

            "heat": 3,

            "strong_heat": 4,

            "frost": 3,

            "severe_frost": 4,

            "heavy_rain": 2,

            "high_humidity": 2,
        },

        "main_concerns": [
            "reduced ear fertility",
            "reproductive stress",
            "disease-favourable conditions",
        ],
    },


    # --------------------------------------------------------
    # FLOWERING
    # BBCH 60-69
    # --------------------------------------------------------

    {
        "code": "FLOWERING",

        "name": "Flowering / anthesis",

        "bbch_min": 60,

        "bbch_max": 69,

        "yield_component": "grain number",

        "description":
            "Pollination, fertilisation and establishment of grain number.",

        "weather_sensitivity": {

            "mild_moisture_deficit": 2,

            "moderate_moisture_deficit": 3,

            "strong_moisture_deficit": 4,

            "drought": 4,

            "heat": 4,

            "strong_heat": 4,

            "frost": 4,

            "severe_frost": 4,

            "heavy_rain": 2,

            "repeated_heavy_rain": 3,

            "high_humidity": 3,
        },

        "main_concerns": [
            "poor fertilisation",
            "reduced grain set",
            "reduced grain number",
            "flower sterility",
            "increased disease pressure",
        ],
    },


    # --------------------------------------------------------
    # GRAIN FILLING
    # BBCH 70-79
    # --------------------------------------------------------

    {
        "code": "GRAIN_FILLING",

        "name": "Milk development / grain filling",

        "bbch_min": 70,

        "bbch_max": 79,

        "yield_component": "grain weight",

        "description":
            "Rapid accumulation of dry matter in developing grain.",

        "weather_sensitivity": {

            "mild_moisture_deficit": 2,

            "moderate_moisture_deficit": 3,

            "strong_moisture_deficit": 4,

            "drought": 4,

            "heat": 3,

            "strong_heat": 4,

            "heavy_rain": 2,

            "high_humidity": 2,
        },

        "main_concerns": [
            "shortened grain filling",
            "accelerated senescence",
            "reduced grain weight",
            "smaller seed",
            "reduced thousand grain weight",
        ],
    },


    # --------------------------------------------------------
    # RIPENING
    # BBCH 80-89
    # --------------------------------------------------------

    {
        "code": "RIPENING",

        "name": "Dough development and ripening",

        "bbch_min": 80,

        "bbch_max": 89,

        "yield_component": "final grain weight and quality",

        "description":
            "Final dry matter accumulation followed by physiological maturity.",

        "weather_sensitivity": {

            "strong_heat": 2,

            "heavy_rain": 2,

            "repeated_heavy_rain": 3,

            "high_humidity": 3,

            "storm": 2,

            "strong_wind": 2,
        },

        "main_concerns": [
            "premature senescence",
            "grain weathering",
            "lodging",
            "quality deterioration",
        ],
    },


    # --------------------------------------------------------
    # HARVEST
    # BBCH 90-99
    # --------------------------------------------------------

    {
        "code": "HARVEST",

        "name": "Harvest period",

        "bbch_min": 90,

        "bbch_max": 99,

        "yield_component": "harvestable yield and seed quality",

        "description":
            "Mature crop awaiting harvest or being harvested.",

        "weather_sensitivity": {

            "heavy_rain": 3,

            "repeated_heavy_rain": 4,

            "high_humidity": 3,

            "storm": 3,

            "strong_wind": 3,
        },

        "main_concerns": [
            "harvest delay",
            "lodging",
            "grain weathering",
            "pre-harvest sprouting risk",
            "reduced seed quality",
            "higher drying requirement",
        ],
    },
]


# ============================================================
# SEED-SPECIFIC QUALITY LAYER
# ============================================================

SEED_QUALITY_RISKS = {

    "ESTABLISHMENT": {

        "possible_effects": [
            "reduced plant population",
            "uneven crop development",
            "reduced seed multiplication potential",
        ],
    },

    "FLOWERING": {

        "possible_effects": [
            "reduced grain number",
            "reduced multiplication yield",
        ],
    },

    "GRAIN_FILLING": {

        "possible_effects": [
            "reduced thousand grain weight",
            "smaller seed fraction",
            "lower physical seed quality",
        ],
    },

    "RIPENING": {

        "possible_effects": [
            "grain weathering",
            "potential deterioration of seed quality",
        ],
    },

    "HARVEST": {

        "possible_effects": [
            "higher seed moisture",
            "harvest delay",
            "pre-harvest sprouting risk",
            "possible germination deterioration",
            "possible increased cleaning losses",
        ],
    },
}


# ============================================================
# HELPER FUNCTIONS
# ============================================================

def get_model_metadata():

    return MODEL_METADATA


def get_stages():

    return STAGES


def get_stage(
    stage_code,
):

    for stage in STAGES:

        if (
            stage["code"]
            == stage_code
        ):

            return stage

    return None


def get_stage_by_bbch(
    bbch,
):

    if bbch is None:

        return None


    matches = []


    for stage in STAGES:

        bbch_min = stage[
            "bbch_min"
        ]

        bbch_max = stage[
            "bbch_max"
        ]


        if (
            bbch_min is None
            or bbch_max is None
        ):

            continue


        if (
            bbch_min
            <= bbch
            <= bbch_max
        ):

            matches.append(
                stage
            )


    if not matches:

        return None


    priority = [

        "SOWING",

        "EMERGENCE",

        "TILLERING",

        "STEM_ELONGATION",

        "BOOTING",

        "HEADING",

        "FLOWERING",

        "GRAIN_FILLING",

        "RIPENING",

        "HARVEST",
    ]


    for stage_code in priority:

        for stage in matches:

            if (
                stage["code"]
                == stage_code
            ):

                return stage


    return matches[0]


def get_weather_sensitivity(
    stage_code,
    weather_signal,
):

    stage = get_stage(
        stage_code
    )


    if stage is None:

        return 0


    return stage[
        "weather_sensitivity"
    ].get(
        weather_signal,
        0,
    )


def get_sensitivity_label(
    level,
):

    return SENSITIVITY_LEVELS.get(
        level,
        "UNKNOWN",
    )


def evaluate_weather_signal(
    stage_code,
    weather_signal,
):

    stage = get_stage(
        stage_code
    )


    if stage is None:

        return {

            "status":
                "UNKNOWN_STAGE",

            "stage":
                stage_code,

            "weather_signal":
                weather_signal,

            "sensitivity_score":
                0,

            "sensitivity":
                "UNKNOWN",
        }


    sensitivity_score = (
        get_weather_sensitivity(
            stage_code,
            weather_signal,
        )
    )


    sensitivity = (
        get_sensitivity_label(
            sensitivity_score
        )
    )


    return {

        "status":
            "EVALUATED",

        "stage":
            stage_code,

        "stage_name":
            stage[
                "name"
            ],

        "weather_signal":
            weather_signal,

        "sensitivity_score":
            sensitivity_score,

        "sensitivity":
            sensitivity,

        "yield_component":
            stage[
                "yield_component"
            ],

        "main_concerns":
            stage[
                "main_concerns"
            ],
    }


# ============================================================
# TEST
# ============================================================

def print_model_summary():

    print()

    print(
        "===================================================="
    )

    print(
        "SeedTrade.eu Winter Wheat EU Model"
    )

    print(
        "===================================================="
    )


    print(
        f"Crop: "
        f"{MODEL_METADATA['name']}"
    )


    print(
        f"Latin name: "
        f"{MODEL_METADATA['latin_name']}"
    )


    print(
        f"Model version: "
        f"{MODEL_METADATA['model_version']}"
    )


    print(
        f"Status: "
        f"{MODEL_METADATA['status']}"
    )


    print()

    print(
        "Phenological stages:"
    )

    print()


    for stage in STAGES:

        if (
            stage[
                "bbch_min"
            ]
            is None
        ):

            bbch_text = (
                "seasonal"
            )

        else:

            bbch_text = (
                f"BBCH "
                f"{stage['bbch_min']}"
                f"-"
                f"{stage['bbch_max']}"
            )


        print(
            f"{stage['code']:<20} "
            f"{bbch_text:<14} "
            f"{stage['name']}"
        )


    print()

    print(
        "Example risk evaluations:"
    )

    print()


    tests = [

        (
            "SOWING",
            "mild_moisture_deficit",
        ),

        (
            "SOWING",
            "strong_moisture_deficit",
        ),

        (
            "TILLERING",
            "strong_heat",
        ),

        (
            "FLOWERING",
            "strong_heat",
        ),

        (
            "GRAIN_FILLING",
            "strong_moisture_deficit",
        ),

        (
            "HARVEST",
            "repeated_heavy_rain",
        ),
    ]


    for (
        stage_code,
        signal,
    ) in tests:

        result = (
            evaluate_weather_signal(
                stage_code,
                signal,
            )
        )


        print(
            f"{stage_code:<20} "
            f"{signal:<30} "
            f"{result['sensitivity']}"
        )


    print()

    print(
        "Exact yield-loss estimation: DISABLED"
    )

    print(
        "Certified seed-output estimation: DISABLED"
    )

    print()

    print(
        "===================================================="
    )


if __name__ == "__main__":

    print_model_summary()