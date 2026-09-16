"""
SeedTrade.eu
Copernicus Pixel Intelligence v0.6

Copernicus CLMS Data Fusion:

1. CTY      = Crop Type
2. CPMCE    = Main Crop Emergence
3. CPMCECL  = Emergence uncertainty, days
4. CPMCD    = Main Crop Duration, days
5. CPMCDCL  = Duration confidence, 0-100
6. CPMCH    = Main Crop Harvest
7. CPMCHCL  = Harvest uncertainty, days

Current purpose:
Scale the validated 7-layer crop-season evidence workflow to a 2 x 2 km (400 ha) test area while keeping full pixel records in JSON and printing aggregated terminal summaries.

IMPORTANT:
- This v0.6 run is a 400 ha scaling test; winter/spring classification remains a separate downstream step.
- STRONG_MATCH / REASONABLE_MATCH / CHECK are internal
  SeedTrade consistency diagnostics only.
- They are NOT official Copernicus confidence classes.
"""

import json
import math
import sys
from collections import Counter
from datetime import datetime, timezone, timedelta
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError


try:
    import tifffile
except ImportError:
    print()
    print("Required package 'tifffile' is not installed.")
    print("Run:")
    print("python -m pip install tifffile")
    sys.exit(1)


# ============================================================
# COPERNICUS LAYER REGISTRY
# ============================================================

try:
    from copernicus_layers import (
        get_collection_id,
        get_data_type,
        get_band,
    )
except ImportError as exc:
    print()
    print("Could not import copernicus_layers.py")
    print(exc)
    print()
    print("Expected file:")
    print("collectors/phenology/copernicus_layers.py")
    sys.exit(1)


# ============================================================
# PATHS
# ============================================================

PROJECT_ROOT = Path(__file__).resolve().parents[2]

ENV_FILE = PROJECT_ROOT / ".env"

OUTPUT_DIR = (
    PROJECT_ROOT
    / "data"
    / "raw"
    / "copernicus"
)


# ============================================================
# API
# ============================================================

TOKEN_URL = (
    "https://identity.dataspace.copernicus.eu/"
    "auth/realms/CDSE/protocol/openid-connect/token"
)

PROCESS_URL = (
    "https://sh.dataspace.copernicus.eu/process/v1"
)


# ============================================================
# ACTIVE LAYERS
# ============================================================

LAYER_CODES = [
    "CTY",
    "CPMCE",
    "CPMCECL",
    "CPMCD",
    "CPMCDCL",
    "CPMCH",
    "CPMCHCL",
]


# ============================================================
# CTY CLASSES
# ============================================================

CTY_CLASSES = {
    0: "No crop class / background",
    1110: "Wheat",
    1120: "Barley",
    1130: "Maize",
    1140: "Rice",
    1150: "Other cereals",
    1210: "Fresh vegetables",
    1220: "Dry pulses",
    1310: "Potatoes",
    1320: "Sugar beet",
    1330: "Other root crops",
    1410: "Sunflower",
    1420: "Soya",
    1430: "Rapeseed",
    1440: "Flax, cotton and hemp",
    2100: "Grapes",
    2200: "Olives",
    2310: "Fruits",
    2320: "Nuts",
    3100: "Unclassified annual crop",
    3200: "Unclassified permanent crop",
}


# ============================================================
# QUALITY FLAGS
# ============================================================

QUALITY_FLAGS = {
    65526: "FALLOW_LAND",
    65527: "NO_DELINEATED_FIELD_GEOMETRY",
    65530: "QUALITY_FLAG_65530",
    65531: "QUALITY_FLAG_65531",
    65532: "QUALITY_FLAG_65532",
    65533: "SEASON_OUTSIDE_DEFINED_TIMEFRAME",
    65534: "CONFIDENCE_NOT_AVAILABLE",
    65535: "OUTSIDE_AREA",
}


# ============================================================
# TEST REGION
# ============================================================

TEST_REGION = {
    "region_code": "PL_EAST",
    "country": "Poland",
    "region": "Eastern Poland",
    "latitude": 51.8,
    "longitude": 23.0,
}


TEST_YEAR = 2023

UTM_EPSG = 32634

UTM_CRS = (
    "http://www.opengis.net/"
    "def/crs/EPSG/0/32634"
)

TEST_HALF_SIZE_METERS = 1000

PIXEL_SIZE_METERS = 10

WIDTH_PIXELS = 200

HEIGHT_PIXELS = 200

PIXEL_AREA_HA = 0.01

HTTP_TIMEOUT_SECONDS = 180


# ============================================================
# ENV
# ============================================================

def load_env_file(file_path):

    if not file_path.exists():
        raise FileNotFoundError(
            f".env file not found: {file_path}"
        )

    values = {}

    with open(
        file_path,
        "r",
        encoding="utf-8",
    ) as file:

        for raw_line in file:

            line = raw_line.strip()

            if not line:
                continue

            if line.startswith("#"):
                continue

            if "=" not in line:
                continue

            key, value = line.split(
                "=",
                1,
            )

            values[
                key.strip()
            ] = value.strip()

    return values


def get_credentials():

    values = load_env_file(
        ENV_FILE
    )

    client_id = values.get(
        "COPERNICUS_CLIENT_ID"
    )

    client_secret = values.get(
        "COPERNICUS_CLIENT_SECRET"
    )

    if not client_id:
        raise ValueError(
            "COPERNICUS_CLIENT_ID missing in .env"
        )

    if not client_secret:
        raise ValueError(
            "COPERNICUS_CLIENT_SECRET missing in .env"
        )

    return (
        client_id,
        client_secret,
    )


# ============================================================
# OAUTH
# ============================================================

def request_access_token(
    client_id,
    client_secret,
):

    payload = urlencode(
        {
            "grant_type":
                "client_credentials",

            "client_id":
                client_id,

            "client_secret":
                client_secret,
        }
    ).encode(
        "utf-8"
    )

    request = Request(
        TOKEN_URL,
        data=payload,
        method="POST",
        headers={
            "Content-Type":
                "application/x-www-form-urlencoded",

            "Accept":
                "application/json",

            "User-Agent":
                "SeedTrade.eu-Pixel-Intelligence/0.6",
        },
    )

    with urlopen(
        request,
        timeout=60,
    ) as response:

        data = json.load(
            response
        )

    access_token = data.get(
        "access_token"
    )

    if not access_token:
        raise ValueError(
            "Access token missing from OAuth response"
        )

    return {
        "access_token":
            access_token,

        "expires_in":
            data.get(
                "expires_in"
            ),
    }


# ============================================================
# WGS84 -> UTM 34N
# ============================================================

def latlon_to_utm34(
    latitude,
    longitude,
):

    a = 6378137.0

    f = (
        1
        / 298.257223563
    )

    k0 = 0.9996

    e_sq = (
        f
        * (2 - f)
    )

    e_prime_sq = (
        e_sq
        / (1 - e_sq)
    )

    lat_rad = math.radians(
        latitude
    )

    lon_rad = math.radians(
        longitude
    )

    lon0_rad = math.radians(
        21.0
    )

    n = (
        a
        / math.sqrt(
            1
            - e_sq
            * math.sin(lat_rad) ** 2
        )
    )

    t = (
        math.tan(lat_rad) ** 2
    )

    c = (
        e_prime_sq
        * math.cos(lat_rad) ** 2
    )

    A = (
        math.cos(lat_rad)
        * (
            lon_rad
            - lon0_rad
        )
    )

    m = (
        a
        * (
            (
                1
                - e_sq / 4
                - 3 * e_sq ** 2 / 64
                - 5 * e_sq ** 3 / 256
            )
            * lat_rad

            - (
                3 * e_sq / 8
                + 3 * e_sq ** 2 / 32
                + 45 * e_sq ** 3 / 1024
            )
            * math.sin(
                2 * lat_rad
            )

            + (
                15 * e_sq ** 2 / 256
                + 45 * e_sq ** 3 / 1024
            )
            * math.sin(
                4 * lat_rad
            )

            - (
                35 * e_sq ** 3 / 3072
            )
            * math.sin(
                6 * lat_rad
            )
        )
    )

    easting = (
        k0
        * n
        * (
            A

            + (
                1
                - t
                + c
            )
            * A ** 3
            / 6

            + (
                5
                - 18 * t
                + t ** 2
                + 72 * c
                - 58 * e_prime_sq
            )
            * A ** 5
            / 120
        )
        + 500000.0
    )

    northing = (
        k0
        * (
            m

            + n
            * math.tan(lat_rad)
            * (
                A ** 2
                / 2

                + (
                    5
                    - t
                    + 9 * c
                    + 4 * c ** 2
                )
                * A ** 4
                / 24

                + (
                    61
                    - 58 * t
                    + t ** 2
                    + 600 * c
                    - 330 * e_prime_sq
                )
                * A ** 6
                / 720
            )
        )
    )

    if latitude < 0:
        northing += (
            10000000.0
        )

    return (
        easting,
        northing,
    )


def build_bbox():

    easting, northing = (
        latlon_to_utm34(
            TEST_REGION[
                "latitude"
            ],
            TEST_REGION[
                "longitude"
            ],
        )
    )

    bbox = [
        easting
        - TEST_HALF_SIZE_METERS,

        northing
        - TEST_HALF_SIZE_METERS,

        easting
        + TEST_HALF_SIZE_METERS,

        northing
        + TEST_HALF_SIZE_METERS,
    ]

    return (
        bbox,
        easting,
        northing,
    )


# ============================================================
# EVALSCRIPT
# ============================================================

def build_evalscript():

    return """
//VERSION=3

function setup() {

    return {

        input: [

            {
                datasource: "cty",
                bands: ["CTY", "dataMask"]
            },

            {
                datasource: "cpmce",
                bands: ["CPMCE", "dataMask"]
            },

            {
                datasource: "cpmcecl",
                bands: ["CPMCECL", "dataMask"]
            },

            {
                datasource: "cpmcd",
                bands: ["CPMCD", "dataMask"]
            },

            {
                datasource: "cpmcdcl",
                bands: ["CPMCDCL", "dataMask"]
            },

            {
                datasource: "cpmch",
                bands: ["CPMCH", "dataMask"]
            },

            {
                datasource: "cpmchcl",
                bands: ["CPMCHCL", "dataMask"]
            }
        ],

        output: {

            id: "default",

            bands: 7,

            sampleType: "UINT16",

            nodataValue: 0
        }
    };
}


function evaluatePixel(samples) {

    function firstValue(source, bandName) {

        if (
            !source
            ||
            source.length === 0
        ) {

            return 0;
        }

        return source[0][bandName];
    }


    return [

        firstValue(
            samples.cty,
            "CTY"
        ),

        firstValue(
            samples.cpmce,
            "CPMCE"
        ),

        firstValue(
            samples.cpmcecl,
            "CPMCECL"
        ),

        firstValue(
            samples.cpmcd,
            "CPMCD"
        ),

        firstValue(
            samples.cpmcdcl,
            "CPMCDCL"
        ),

        firstValue(
            samples.cpmch,
            "CPMCH"
        ),

        firstValue(
            samples.cpmchcl,
            "CPMCHCL"
        )
    ];
}
"""


# ============================================================
# PROCESS PAYLOAD
# ============================================================

def build_process_payload(
    bbox,
):

    time_range = {
        "from":
            f"{TEST_YEAR}-01-01T00:00:00Z",

        "to":
            f"{TEST_YEAR}-12-31T23:59:59Z",
    }

    input_data = []

    for layer_code in LAYER_CODES:

        input_data.append(
            {
                "type":
                    get_data_type(
                        layer_code
                    ),

                "id":
                    layer_code.lower(),

                "dataFilter": {
                    "timeRange":
                        time_range,

                    "mosaickingOrder":
                        "mostRecent",
                },
            }
        )

    return {
        "input": {

            "bounds": {

                "bbox":
                    bbox,

                "properties": {

                    "crs":
                        UTM_CRS
                },
            },

            "data":
                input_data,
        },

        "output": {

            "width":
                WIDTH_PIXELS,

            "height":
                HEIGHT_PIXELS,

            "responses": [
                {
                    "identifier":
                        "default",

                    "format": {
                        "type":
                            "image/tiff"
                    },
                }
            ],
        },

        "evalscript":
            build_evalscript(),
    }


# ============================================================
# HTTP REQUEST
# ============================================================

def request_raster(
    payload,
    access_token,
):

    body = json.dumps(
        payload
    ).encode(
        "utf-8"
    )

    request = Request(
        PROCESS_URL,
        data=body,
        method="POST",
        headers={
            "Authorization":
                f"Bearer {access_token}",

            "Content-Type":
                "application/json",

            "Accept":
                "image/tiff",

            "User-Agent":
                "SeedTrade.eu-Pixel-Intelligence/0.6",
        },
    )

    print(
        f"HTTP timeout: "
        f"{HTTP_TIMEOUT_SECONDS} seconds"
    )

    with urlopen(
        request,
        timeout=HTTP_TIMEOUT_SECONDS,
    ) as response:

        raster_bytes = (
            response.read()
        )

        content_type = (
            response.headers.get(
                "Content-Type"
            )
        )

    return (
        raster_bytes,
        content_type,
    )


# ============================================================
# SAVE TIFF
# ============================================================

def save_tiff(
    raster_bytes,
):

    OUTPUT_DIR.mkdir(
        parents=True,
        exist_ok=True,
    )

    current_date = (
        datetime.now(
            timezone.utc
        ).strftime(
            "%Y-%m-%d"
        )
    )

    path = (
        OUTPUT_DIR
        / (
            f"PL_EAST_pixel_intelligence_v06_"
            f"{TEST_YEAR}_"
            f"2km_400ha_test_"
            f"{current_date}.tif"
        )
    )

    with open(
        path,
        "wb",
    ) as file:

        file.write(
            raster_bytes
        )

    return path


# ============================================================
# QUALITY HELPERS
# ============================================================

def special_quality_flag(
    value,
):

    try:
        value = int(
            value
        )
    except (
        TypeError,
        ValueError,
    ):
        return None

    return QUALITY_FLAGS.get(
        value
    )


# ============================================================
# YYDOY DATE
# ============================================================

def decode_yydoy(
    value,
):

    value = int(
        value
    )

    if value == 0:
        return None

    if special_quality_flag(
        value
    ):
        return None

    yy = (
        value
        // 1000
    )

    doy = (
        value
        % 1000
    )

    if doy < 1 or doy > 366:
        return None

    year = (
        2000
        + yy
    )

    try:

        date_value = (
            datetime(
                year,
                1,
                1,
            )
            + timedelta(
                days=doy - 1
            )
        )

    except ValueError:
        return None

    if date_value.year != year:
        return None

    return {
        "code":
            value,

        "year":
            year,

        "doy":
            doy,

        "date":
            date_value.date().isoformat(),
    }


def interpret_date_value(
    value,
):

    value = int(
        value
    )

    if value == 0:

        return {
            "status":
                "NO_DATA",

            "raw":
                value,

            "flag":
                "NO_DATA_OR_NO_ANNUAL_CROPLAND",

            "date":
                None,
        }

    flag = special_quality_flag(
        value
    )

    if flag:

        return {
            "status":
                "QUALITY_FLAG",

            "raw":
                value,

            "flag":
                flag,

            "date":
                None,
        }

    decoded = decode_yydoy(
        value
    )

    if decoded:

        return {
            "status":
                "VALID",

            "raw":
                value,

            "flag":
                None,

            "date":
                decoded[
                    "date"
                ],
        }

    return {
        "status":
            "INVALID",

        "raw":
            value,

        "flag":
            None,

        "date":
            None,
    }


# ============================================================
# UNCERTAINTY
# ============================================================

def interpret_uncertainty(
    value,
    minimum,
    maximum,
):

    value = int(
        value
    )

    if value == 0:

        return {
            "status":
                "NO_DATA",

            "raw":
                value,

            "flag":
                "NO_DATA_OR_NO_ANNUAL_CROPLAND",

            "days":
                None,
        }

    flag = special_quality_flag(
        value
    )

    if flag:

        return {
            "status":
                "QUALITY_FLAG",

            "raw":
                value,

            "flag":
                flag,

            "days":
                None,
        }

    if (
        minimum
        <= value
        <= maximum
    ):

        return {
            "status":
                "VALID",

            "raw":
                value,

            "flag":
                None,

            "days":
                value,
        }

    return {
        "status":
            "INVALID",

        "raw":
            value,

        "flag":
            None,

        "days":
            None,
    }


# ============================================================
# DURATION
# ============================================================

def interpret_duration(
    value,
):

    value = int(
        value
    )

    if value == 0:

        return {
            "status":
                "NO_DATA",

            "raw":
                value,

            "flag":
                "NO_DATA_OR_NO_ANNUAL_CROPLAND",

            "days":
                None,
        }

    flag = special_quality_flag(
        value
    )

    if flag:

        return {
            "status":
                "QUALITY_FLAG",

            "raw":
                value,

            "flag":
                flag,

            "days":
                None,
        }

    if 1 <= value <= 366:

        return {
            "status":
                "VALID",

            "raw":
                value,

            "flag":
                None,

            "days":
                value,
        }

    return {
        "status":
            "INVALID",

        "raw":
            value,

        "flag":
            None,

        "days":
            None,
    }


# ============================================================
# DURATION CONFIDENCE
# ============================================================

def interpret_duration_confidence(
    value,
):

    value = int(
        value
    )

    flag = special_quality_flag(
        value
    )

    if flag:

        return {
            "status":
                "QUALITY_FLAG",

            "raw":
                value,

            "flag":
                flag,

            "confidence":
                None,
        }

    if 0 <= value <= 100:

        return {
            "status":
                "VALID",

            "raw":
                value,

            "flag":
                None,

            "confidence":
                value,
        }

    return {
        "status":
            "INVALID",

        "raw":
            value,

        "flag":
            None,

        "confidence":
            None,
    }


# ============================================================
# TIFF
# ============================================================

def read_seven_band_tiff(
    path,
):

    data = tifffile.imread(
        path
    )

    shape = data.shape

    print()

    print(
        f"TIFF array shape: "
        f"{shape}"
    )

    if (
        len(shape) == 3
        and shape[-1] == 7
    ):

        return tuple(
            data[
                :,
                :,
                index
            ]
            for index in range(
                7
            )
        )

    if (
        len(shape) == 3
        and shape[0] == 7
    ):

        return tuple(
            data[
                index,
                :,
                :
            ]
            for index in range(
                7
            )
        )

    raise ValueError(
        "Unexpected TIFF shape. "
        f"Expected 7 bands, got {shape}"
    )


# ============================================================
# SEASONAL SIGNAL
# ============================================================

def seasonal_signal(
    crop_code,
    emergence_date,
):

    if not emergence_date:
        return (
            "NO_EMERGENCE_DATA"
        )

    date_value = (
        datetime.fromisoformat(
            emergence_date
        )
    )

    month = (
        date_value.month
    )

    if crop_code in (
        1110,
        1120,
        1150,
    ):

        if month in (
            8,
            9,
            10,
            11,
            12,
        ):

            return (
                "AUTUMN_EMERGENCE"
            )

        if month in (
            1,
            2,
            3,
            4,
            5,
            6,
        ):

            return (
                "SPRING_OR_EARLY_SUMMER_EMERGENCE"
            )

    if crop_code == 1430:

        if month in (
            7,
            8,
            9,
            10,
        ):

            return (
                "AUTUMN_RAPESEED_TIMING"
            )

        if month in (
            3,
            4,
            5,
            6,
        ):

            return (
                "SPRING_RAPESEED_TIMING"
            )

    return (
        "UNCLASSIFIED_TIMING"
    )


# ============================================================
# SEASON CONSISTENCY
# ============================================================

def calculate_calendar_duration(
    emergence_date,
    harvest_date,
):

    if not emergence_date:
        return None

    if not harvest_date:
        return None

    emergence = (
        datetime.fromisoformat(
            emergence_date
        )
    )

    harvest = (
        datetime.fromisoformat(
            harvest_date
        )
    )

    days = (
        harvest
        - emergence
    ).days

    if days < 0:
        return None

    return days


def season_consistency(
    emergence_date,
    harvest_date,
    duration_days,
):

    calculated = (
        calculate_calendar_duration(
            emergence_date,
            harvest_date,
        )
    )

    if (
        calculated is None
        or duration_days is None
    ):

        return {
            "status":
                "NOT_EVALUATED",

            "calendar_days":
                calculated,

            "difference_days":
                None,
        }

    difference = abs(
        calculated
        - duration_days
    )

    if difference <= 10:

        status = (
            "STRONG_MATCH"
        )

    elif difference <= 30:

        status = (
            "REASONABLE_MATCH"
        )

    else:

        status = (
            "CHECK"
        )

    return {
        "status":
            status,

        "calendar_days":
            calculated,

        "difference_days":
            difference,
    }


# ============================================================
# PIXEL ANALYSIS
# ============================================================

def analyse_pixels(
    cty_array,
    cpmce_array,
    cpmcecl_array,
    cpmcd_array,
    cpmcdcl_array,
    cpmch_array,
    cpmchcl_array,
):

    rows = []

    crop_counter = Counter()

    consistency_counter = Counter()

    harvest_uncertainty_status_counter = (
        Counter()
    )

    pixel_number = 0

    for row_index in range(
        HEIGHT_PIXELS
    ):

        for column_index in range(
            WIDTH_PIXELS
        ):

            pixel_number += 1

            cty = int(
                cty_array[
                    row_index,
                    column_index
                ]
            )

            emergence_raw = int(
                cpmce_array[
                    row_index,
                    column_index
                ]
            )

            emergence_uncertainty_raw = int(
                cpmcecl_array[
                    row_index,
                    column_index
                ]
            )

            duration_raw = int(
                cpmcd_array[
                    row_index,
                    column_index
                ]
            )

            duration_confidence_raw = int(
                cpmcdcl_array[
                    row_index,
                    column_index
                ]
            )

            harvest_raw = int(
                cpmch_array[
                    row_index,
                    column_index
                ]
            )

            harvest_uncertainty_raw = int(
                cpmchcl_array[
                    row_index,
                    column_index
                ]
            )

            emergence = (
                interpret_date_value(
                    emergence_raw
                )
            )

            emergence_uncertainty = (
                interpret_uncertainty(
                    emergence_uncertainty_raw,
                    1,
                    40,
                )
            )

            duration = (
                interpret_duration(
                    duration_raw
                )
            )

            duration_confidence = (
                interpret_duration_confidence(
                    duration_confidence_raw
                )
            )

            harvest = (
                interpret_date_value(
                    harvest_raw
                )
            )

            harvest_uncertainty = (
                interpret_uncertainty(
                    harvest_uncertainty_raw,
                    1,
                    40,
                )
            )

            consistency = (
                season_consistency(
                    emergence[
                        "date"
                    ],
                    harvest[
                        "date"
                    ],
                    duration[
                        "days"
                    ],
                )
            )

            timing = (
                seasonal_signal(
                    cty,
                    emergence[
                        "date"
                    ],
                )
            )

            record = {
                "pixel":
                    pixel_number,

                "row":
                    row_index,

                "column":
                    column_index,

                "cty":
                    cty,

                "crop":
                    CTY_CLASSES.get(
                        cty,
                        "Unknown CTY class",
                    ),

                "emergence_raw":
                    emergence_raw,

                "emergence_status":
                    emergence[
                        "status"
                    ],

                "emergence_date":
                    emergence[
                        "date"
                    ],

                "emergence_flag":
                    emergence[
                        "flag"
                    ],

                "emergence_uncertainty_raw":
                    emergence_uncertainty_raw,

                "emergence_uncertainty_status":
                    emergence_uncertainty[
                        "status"
                    ],

                "emergence_uncertainty_days":
                    emergence_uncertainty[
                        "days"
                    ],

                "duration_raw":
                    duration_raw,

                "duration_status":
                    duration[
                        "status"
                    ],

                "duration_days":
                    duration[
                        "days"
                    ],

                "duration_flag":
                    duration[
                        "flag"
                    ],

                "duration_confidence_raw":
                    duration_confidence_raw,

                "duration_confidence_status":
                    duration_confidence[
                        "status"
                    ],

                "duration_confidence":
                    duration_confidence[
                        "confidence"
                    ],

                "duration_confidence_flag":
                    duration_confidence[
                        "flag"
                    ],

                "harvest_raw":
                    harvest_raw,

                "harvest_status":
                    harvest[
                        "status"
                    ],

                "harvest_date":
                    harvest[
                        "date"
                    ],

                "harvest_flag":
                    harvest[
                        "flag"
                    ],

                "harvest_uncertainty_raw":
                    harvest_uncertainty_raw,

                "harvest_uncertainty_status":
                    harvest_uncertainty[
                        "status"
                    ],

                "harvest_uncertainty_days":
                    harvest_uncertainty[
                        "days"
                    ],

                "harvest_uncertainty_flag":
                    harvest_uncertainty[
                        "flag"
                    ],

                "seasonal_timing_signal":
                    timing,

                "calendar_season_days":
                    consistency[
                        "calendar_days"
                    ],

                "duration_difference_days":
                    consistency[
                        "difference_days"
                    ],

                "season_consistency":
                    consistency[
                        "status"
                    ],
            }

            rows.append(
                record
            )

            crop_counter[
                cty
            ] += 1

            consistency_counter[
                consistency[
                    "status"
                ]
            ] += 1

            harvest_uncertainty_status_counter[
                harvest_uncertainty[
                    "status"
                ]
            ] += 1

    return {
        "pixels":
            rows,

        "crop_counter":
            crop_counter,

        "consistency_counter":
            consistency_counter,

        "harvest_uncertainty_status_counter":
            harvest_uncertainty_status_counter,
    }


# ============================================================
# CROP SUMMARY
# ============================================================

def build_crop_summary(
    crop_counter,
):

    total = sum(
        crop_counter.values()
    )

    result = []

    for code, pixels in (
        crop_counter.most_common()
    ):

        result.append(
            {
                "cty":
                    code,

                "crop":
                    CTY_CLASSES.get(
                        code,
                        "Unknown CTY class",
                    ),

                "pixels":
                    pixels,

                "area_ha":
                    round(
                        pixels
                        * PIXEL_AREA_HA,
                        2,
                    ),

                "share_percent":
                    round(
                        pixels
                        / total
                        * 100,
                        2,
                    )
                    if total
                    else 0.0,
            }
        )

    return result


# ============================================================
# PHENOLOGY SUMMARY
# ============================================================

def mean_value(
    values,
):

    if not values:
        return None

    return round(
        sum(
            values
        )
        / len(
            values
        ),
        1,
    )


def build_crop_phenology_summary(
    pixels,
):

    crop_codes = sorted(
        set(
            row[
                "cty"
            ]
            for row in pixels
            if row[
                "cty"
            ]
            != 0
        )
    )

    result = []

    for crop_code in crop_codes:

        rows = [
            row
            for row in pixels
            if row[
                "cty"
            ]
            == crop_code
        ]

        valid_emergence = [
            row
            for row in rows
            if row[
                "emergence_status"
            ]
            == "VALID"
        ]

        valid_duration = [
            row
            for row in rows
            if row[
                "duration_status"
            ]
            == "VALID"
        ]

        valid_duration_confidence = [
            row
            for row in rows
            if row[
                "duration_confidence_status"
            ]
            == "VALID"
        ]

        valid_harvest = [
            row
            for row in rows
            if row[
                "harvest_status"
            ]
            == "VALID"
        ]

        valid_emergence_uncertainty = [
            row
            for row in rows
            if row[
                "emergence_uncertainty_status"
            ]
            == "VALID"
        ]

        valid_harvest_uncertainty = [
            row
            for row in rows
            if row[
                "harvest_uncertainty_status"
            ]
            == "VALID"
        ]

        timing = Counter(
            row[
                "seasonal_timing_signal"
            ]
            for row in rows
        )

        consistency = Counter(
            row[
                "season_consistency"
            ]
            for row in rows
        )

        emergence_dates = sorted(
            row[
                "emergence_date"
            ]
            for row in valid_emergence
        )

        harvest_dates = sorted(
            row[
                "harvest_date"
            ]
            for row in valid_harvest
        )

        duration_values = [
            row[
                "duration_days"
            ]
            for row in valid_duration
        ]

        duration_confidence_values = [
            row[
                "duration_confidence"
            ]
            for row in valid_duration_confidence
        ]

        emergence_uncertainty_values = [
            row[
                "emergence_uncertainty_days"
            ]
            for row in valid_emergence_uncertainty
        ]

        harvest_uncertainty_values = [
            row[
                "harvest_uncertainty_days"
            ]
            for row in valid_harvest_uncertainty
        ]

        item = {
            "cty":
                crop_code,

            "crop":
                CTY_CLASSES.get(
                    crop_code,
                    "Unknown CTY class",
                ),

            "pixels":
                len(
                    rows
                ),

            "area_ha":
                round(
                    len(
                        rows
                    )
                    * PIXEL_AREA_HA,
                    2,
                ),

            "valid_emergence_pixels":
                len(
                    valid_emergence
                ),

            "valid_duration_pixels":
                len(
                    valid_duration
                ),

            "valid_duration_confidence_pixels":
                len(
                    valid_duration_confidence
                ),

            "valid_harvest_pixels":
                len(
                    valid_harvest
                ),

            "valid_harvest_uncertainty_pixels":
                len(
                    valid_harvest_uncertainty
                ),

            "earliest_emergence":
                emergence_dates[
                    0
                ]
                if emergence_dates
                else None,

            "latest_emergence":
                emergence_dates[
                    -1
                ]
                if emergence_dates
                else None,

            "mean_emergence_uncertainty_days":
                mean_value(
                    emergence_uncertainty_values
                ),

            "mean_duration_days":
                mean_value(
                    duration_values
                ),

            "mean_duration_confidence":
                mean_value(
                    duration_confidence_values
                ),

            "min_duration_confidence":
                min(
                    duration_confidence_values
                )
                if duration_confidence_values
                else None,

            "max_duration_confidence":
                max(
                    duration_confidence_values
                )
                if duration_confidence_values
                else None,

            "earliest_harvest":
                harvest_dates[
                    0
                ]
                if harvest_dates
                else None,

            "latest_harvest":
                harvest_dates[
                    -1
                ]
                if harvest_dates
                else None,

            "mean_harvest_uncertainty_days":
                mean_value(
                    harvest_uncertainty_values
                ),

            "min_harvest_uncertainty_days":
                min(
                    harvest_uncertainty_values
                )
                if harvest_uncertainty_values
                else None,

            "max_harvest_uncertainty_days":
                max(
                    harvest_uncertainty_values
                )
                if harvest_uncertainty_values
                else None,

            "timing_signals":
                dict(
                    timing
                ),

            "season_consistency":
                dict(
                    consistency
                ),
        }

        result.append(
            item
        )

    return result


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
        "SeedTrade.eu Copernicus Pixel Intelligence v0.6"
    )

    print(
        "========================================================"
    )

    print()

    print(
        f"Region: "
        f"{TEST_REGION['region_code']} | "
        f"{TEST_REGION['country']}"
    )

    print(
        f"Year: "
        f"{TEST_YEAR}"
    )

    print(
        f"Resolution: "
        f"{PIXEL_SIZE_METERS} m"
    )

    print(
        f"Raster: "
        f"{WIDTH_PIXELS} x "
        f"{HEIGHT_PIXELS}"
    )

    print(
        f"Area: "
        f"{WIDTH_PIXELS * HEIGHT_PIXELS * PIXEL_AREA_HA:.2f} ha"
    )

    print()

    print(
        "--------------------------------------------------------"
    )

    print(
        "CROP DISTRIBUTION"
    )

    print(
        "--------------------------------------------------------"
    )

    for row in result[
        "crop_summary"
    ]:

        print(
            f"{row['cty']:>5} | "
            f"{row['crop']:<30} | "
            f"{row['pixels']:>3} px | "
            f"{row['area_ha']:>5.2f} ha | "
            f"{row['share_percent']:>6.2f}%"
        )

    print()

    print(
        "--------------------------------------------------------"
    )

    print(
        "PIXEL DETAIL OUTPUT"
    )

    print(
        "--------------------------------------------------------"
    )

    print(
        f"Pixel-level terminal output suppressed for "
        f"{len(result['pixels'])} pixels."
    )

    print(
        "Full pixel-level records are preserved in the JSON output."
    )

    print()

    print(
        "--------------------------------------------------------"
    )

    print(
        "CROP PHENOLOGY SUMMARY"
    )

    print(
        "--------------------------------------------------------"
    )

    for crop in result[
        "crop_phenology_summary"
    ]:

        print()

        print(
            f"{crop['crop']} "
            f"(CTY {crop['cty']})"
        )

        print(
            f"  Pixels: "
            f"{crop['pixels']}"
        )

        print(
            f"  Valid emergence: "
            f"{crop['valid_emergence_pixels']}"
        )

        print(
            f"  Emergence range: "
            f"{crop['earliest_emergence']} "
            f"→ "
            f"{crop['latest_emergence']}"
        )

        print(
            f"  Mean emergence uncertainty: "
            f"{crop['mean_emergence_uncertainty_days']} days"
        )

        print(
            f"  Valid duration: "
            f"{crop['valid_duration_pixels']}"
        )

        print(
            f"  Mean duration: "
            f"{crop['mean_duration_days']} days"
        )

        print(
            f"  Duration confidence: "
            f"mean={crop['mean_duration_confidence']} | "
            f"min={crop['min_duration_confidence']} | "
            f"max={crop['max_duration_confidence']}"
        )

        print(
            f"  Valid harvest: "
            f"{crop['valid_harvest_pixels']}"
        )

        print(
            f"  Harvest range: "
            f"{crop['earliest_harvest']} "
            f"→ "
            f"{crop['latest_harvest']}"
        )

        print(
            f"  Valid harvest uncertainty: "
            f"{crop['valid_harvest_uncertainty_pixels']}"
        )

        print(
            f"  Harvest uncertainty: "
            f"mean={crop['mean_harvest_uncertainty_days']} d | "
            f"min={crop['min_harvest_uncertainty_days']} | "
            f"max={crop['max_harvest_uncertainty_days']}"
        )

        print(
            f"  Timing signals: "
            f"{crop['timing_signals']}"
        )

        print(
            f"  Season consistency: "
            f"{crop['season_consistency']}"
        )

    print()

    print(
        "--------------------------------------------------------"
    )

    print(
        "OVERALL SEASON CONSISTENCY"
    )

    print(
        "--------------------------------------------------------"
    )

    for status, count in result[
        "season_consistency"
    ].items():

        print(
            f"{status}: "
            f"{count}"
        )

    print()

    print(
        "--------------------------------------------------------"
    )

    print(
        "HARVEST UNCERTAINTY STATUS"
    )

    print(
        "--------------------------------------------------------"
    )

    for status, count in result[
        "harvest_uncertainty_status"
    ].items():

        print(
            f"{status}: "
            f"{count}"
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
        "CPMCECL = emergence-date uncertainty in days."
    )

    print()

    print(
        "CPMCDCL = Main Crop Duration confidence, "
        "0-100 scale."
    )

    print()

    print(
        "CPMCHCL = harvest-date uncertainty in days."
    )

    print()

    print(
        "STRONG_MATCH / REASONABLE_MATCH / CHECK "
        "are SeedTrade internal technical diagnostics only."
    )

    print()

    print(
        "Next step after successful test:"
    )

    print(
        "Build evidence-based winter/spring crop "
        "classification without claiming false certainty."
    )

    print()

    print(
        "========================================================"
    )


# ============================================================
# SAVE JSON
# ============================================================

def save_json(
    result,
):

    OUTPUT_DIR.mkdir(
        parents=True,
        exist_ok=True,
    )

    current_date = (
        datetime.now(
            timezone.utc
        ).strftime(
            "%Y-%m-%d"
        )
    )

    path = (
        OUTPUT_DIR
        / (
            f"PL_EAST_pixel_intelligence_v06_"
            f"{TEST_YEAR}_"
            f"2km_400ha_test_"
            f"{current_date}.json"
        )
    )

    with open(
        path,
        "w",
        encoding="utf-8",
    ) as file:

        json.dump(
            result,
            file,
            indent=2,
            ensure_ascii=False,
        )

    return path


# ============================================================
# MAIN
# ============================================================

def main():

    try:

        print()

        print(
            "Authenticating with Copernicus..."
        )

        (
            client_id,
            client_secret,
        ) = get_credentials()

        token_data = (
            request_access_token(
                client_id,
                client_secret,
            )
        )

        print(
            "OAuth: SUCCESS"
        )

        print(
            f"Token expires in: "
            f"{token_data.get('expires_in')} seconds"
        )

        bbox, _, _ = (
            build_bbox()
        )

        print()

        print(
            "Requesting 7-layer Copernicus Data Fusion..."
        )

        print(
            "CTY + CPMCE + CPMCECL + CPMCD + "
            "CPMCDCL + CPMCH + CPMCHCL"
        )

        payload = (
            build_process_payload(
                bbox
            )
        )

        (
            raster_bytes,
            content_type,
        ) = request_raster(
            payload,
            token_data[
                "access_token"
            ],
        )

        print(
            "Copernicus response received."
        )

        print(
            f"Content-Type: "
            f"{content_type}"
        )

        print(
            f"Downloaded bytes: "
            f"{len(raster_bytes)}"
        )

        raster_path = (
            save_tiff(
                raster_bytes
            )
        )

        print()

        print(
            "Raster saved to:"
        )

        print(
            raster_path
        )

        (
            cty_array,
            cpmce_array,
            cpmcecl_array,
            cpmcd_array,
            cpmcdcl_array,
            cpmch_array,
            cpmchcl_array,
        ) = read_seven_band_tiff(
            raster_path
        )

        analysis = (
            analyse_pixels(
                cty_array,
                cpmce_array,
                cpmcecl_array,
                cpmcd_array,
                cpmcdcl_array,
                cpmch_array,
                cpmchcl_array,
            )
        )

        crop_summary = (
            build_crop_summary(
                analysis[
                    "crop_counter"
                ]
            )
        )

        crop_phenology_summary = (
            build_crop_phenology_summary(
                analysis[
                    "pixels"
                ]
            )
        )

        layer_metadata = {}

        for layer_code in LAYER_CODES:

            layer_metadata[
                layer_code
            ] = {
                "collection_id":
                    get_collection_id(
                        layer_code
                    ),

                "band":
                    get_band(
                        layer_code
                    ),
            }

        result = {
            "dataset":
                "SeedTrade.eu Copernicus Pixel Intelligence",

            "version":
                "0.6",

            "year":
                TEST_YEAR,

            "region":
                TEST_REGION,

            "crs":
                f"EPSG:{UTM_EPSG}",

            "bbox":
                bbox,

            "resolution_m":
                PIXEL_SIZE_METERS,

            "width_pixels":
                WIDTH_PIXELS,

            "height_pixels":
                HEIGHT_PIXELS,

            "area_ha":
                round(
                    WIDTH_PIXELS
                    * HEIGHT_PIXELS
                    * PIXEL_AREA_HA,
                    2,
                ),

            "test_extent_m":
                TEST_HALF_SIZE_METERS * 2,

            "layers":
                layer_metadata,

            "crop_summary":
                crop_summary,

            "crop_phenology_summary":
                crop_phenology_summary,

            "season_consistency":
                dict(
                    analysis[
                        "consistency_counter"
                    ]
                ),

            "harvest_uncertainty_status":
                dict(
                    analysis[
                        "harvest_uncertainty_status_counter"
                    ]
                ),

            "pixels":
                analysis[
                    "pixels"
                ],

            "collected_at":
                datetime.now(
                    timezone.utc
                ).isoformat(),
        }

        print_result(
            result
        )

        json_path = (
            save_json(
                result
            )
        )

        print()

        print(
            "JSON saved to:"
        )

        print(
            json_path
        )

    except HTTPError as exc:

        print()

        print(
            "========================================================"
        )

        print(
            "Copernicus Pixel Intelligence FAILED"
        )

        print(
            "========================================================"
        )

        print()

        print(
            f"HTTP status: "
            f"{exc.code}"
        )

        print(
            f"Reason: "
            f"{exc.reason}"
        )

        try:

            body = (
                exc.read()
                .decode(
                    "utf-8",
                    errors="replace",
                )
            )

            if body:

                print()

                print(
                    "Copernicus response:"
                )

                print(
                    body
                )

        except Exception:
            pass

    except TimeoutError:

        print()
        print(
            "Copernicus request timed out."
        )

    except URLError as exc:

        print()
        print(
            "Copernicus connection error:"
        )
        print(
            exc
        )

    except Exception as exc:

        print()

        print(
            "========================================================"
        )

        print(
            "Copernicus Pixel Intelligence FAILED"
        )

        print(
            "========================================================"
        )

        print()

        print(
            f"Error: "
            f"{exc}"
        )


if __name__ == "__main__":

    main()