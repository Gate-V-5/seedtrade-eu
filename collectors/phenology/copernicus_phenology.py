"""
SeedTrade.eu
Copernicus Crop Types Connector v0.5

Purpose
-------
Download real CLMS Crop Types statistics for a small test area
and convert categorical CTY raster values into a normalized
SeedTrade crop distribution.

Current test:
- Region: PL_EAST
- Year: 2023
- Resolution: 10 m
- Test area: 2 km x 2 km = 4 km² = 400 ha

Important
---------
Copernicus CTY crop classes are broad crop classes.

For example:
    1110 = Wheat

This does NOT mean:
    1110 = Winter wheat

Winter/spring crop separation must be inferred later using
phenology, emergence timing, weather, GDD and other evidence.
"""

import json
import math
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError


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
# COPERNICUS ENDPOINTS
# ============================================================

TOKEN_URL = (
    "https://identity.dataspace.copernicus.eu/"
    "auth/realms/CDSE/protocol/openid-connect/token"
)

STATISTICS_URL = (
    "https://sh.dataspace.copernicus.eu/statistics/v1"
)


# ============================================================
# CLMS CROP TYPES
# ============================================================

CROP_TYPES_COLLECTION_ID = (
    "4fa71893-371f-4440-97c4-917f569f67b2"
)

CROP_TYPES_DATA_TYPE = (
    "byoc-4fa71893-371f-4440-97c4-917f569f67b2"
)

CROP_TYPES_BAND = "CTY"


# ============================================================
# OFFICIAL CTY CLASS MAPPING
#
# Broad CLMS crop classes.
#
# IMPORTANT:
# Wheat / barley / etc. are not automatically winter crops.
# ============================================================

CTY_CLASSES = {

    0: {
        "name": "No crop class / background",
        "seedtrade_group": "BACKGROUND",
    },

    1110: {
        "name": "Wheat",
        "seedtrade_group": "CEREALS",
    },

    1120: {
        "name": "Barley",
        "seedtrade_group": "CEREALS",
    },

    1130: {
        "name": "Maize",
        "seedtrade_group": "CEREALS",
    },

    1140: {
        "name": "Rice",
        "seedtrade_group": "CEREALS",
    },

    1150: {
        "name": "Other cereals",
        "seedtrade_group": "CEREALS",
    },

    1210: {
        "name": "Fresh vegetables",
        "seedtrade_group": "VEGETABLES",
    },

    1220: {
        "name": "Dry pulses",
        "seedtrade_group": "LEGUMES",
    },

    1310: {
        "name": "Potatoes",
        "seedtrade_group": "OTHER_ARABLE",
    },

    1320: {
        "name": "Sugar beet",
        "seedtrade_group": "OTHER_ARABLE",
    },

    1330: {
        "name": "Other root crops",
        "seedtrade_group": "OTHER_ARABLE",
    },

    1410: {
        "name": "Sunflower",
        "seedtrade_group": "OILSEEDS",
    },

    1420: {
        "name": "Soya",
        "seedtrade_group": "LEGUMES",
    },

    1430: {
        "name": "Rapeseed",
        "seedtrade_group": "OILSEEDS",
    },

    1440: {
        "name": "Flax, cotton and hemp",
        "seedtrade_group": "FIBRE_OIL_CROPS",
    },

    2100: {
        "name": "Grassland",
        "seedtrade_group": "GRASSLAND",
    },

    2210: {
        "name": "Vineyards",
        "seedtrade_group": "PERMANENT_CROPS",
    },

    2220: {
        "name": "Olive groves",
        "seedtrade_group": "PERMANENT_CROPS",
    },

    2310: {
        "name": "Fruits",
        "seedtrade_group": "PERMANENT_CROPS",
    },

    3100: {
        "name": "Unclassified arable crop",
        "seedtrade_group": "UNCLASSIFIED_ARABLE",
    },
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


# ============================================================
# SPATIAL SETTINGS
# ============================================================

UTM_EPSG = 32634

UTM_CRS = (
    "http://www.opengis.net/"
    "def/crs/EPSG/0/32634"
)

TEST_HALF_SIZE_METERS = 1000

PIXEL_SIZE_METERS = 10

PIXEL_AREA_M2 = (
    PIXEL_SIZE_METERS
    * PIXEL_SIZE_METERS
)

PIXEL_AREA_HA = (
    PIXEL_AREA_M2
    / 10000
)


# ============================================================
# TIME
# ============================================================

TEST_YEAR = 2023


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

    env_values = (
        load_env_file(
            ENV_FILE
        )
    )

    client_id = (
        env_values.get(
            "COPERNICUS_CLIENT_ID"
        )
    )

    client_secret = (
        env_values.get(
            "COPERNICUS_CLIENT_SECRET"
        )
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

    payload = urlencode({

        "grant_type":
            "client_credentials",

        "client_id":
            client_id,

        "client_secret":
            client_secret,

    }).encode(
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
                "SeedTrade.eu-Copernicus/0.5",
        },
    )

    with urlopen(
        request,
        timeout=60,
    ) as response:

        data = json.load(
            response
        )

    access_token = (
        data.get(
            "access_token"
        )
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

        "token_type":
            data.get(
                "token_type"
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


def build_utm_bbox(
    latitude,
    longitude,
):

    easting, northing = (
        latlon_to_utm34(
            latitude,
            longitude,
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

    return f"""
//VERSION=3

function setup() {{
    return {{
        input: [{{
            bands: [
                "{CROP_TYPES_BAND}",
                "dataMask"
            ]
        }}],

        output: [
            {{
                id: "crop_type",
                bands: 1,
                sampleType: "UINT16"
            }},
            {{
                id: "dataMask",
                bands: 1
            }}
        ]
    }};
}}

function evaluatePixel(sample) {{
    return {{
        crop_type: [
            sample.{CROP_TYPES_BAND}
        ],

        dataMask: [
            sample.dataMask
        ]
    }};
}}
"""


# ============================================================
# STATISTICS REQUEST
# ============================================================

def build_statistics_payload(
    bbox,
):

    return {

        "input": {

            "bounds": {

                "bbox":
                    bbox,

                "properties": {

                    "crs":
                        UTM_CRS
                }
            },

            "data": [

                {
                    "type":
                        CROP_TYPES_DATA_TYPE,

                    "dataFilter": {

                        "mosaickingOrder":
                            "mostRecent"
                    }
                }
            ]
        },

        "aggregation": {

            "timeRange": {

                "from":
                    f"{TEST_YEAR}-01-01T00:00:00Z",

                "to":
                    f"{TEST_YEAR + 1}-01-01T00:00:00Z",
            },

            "aggregationInterval": {

                "of":
                    "P1Y"
            },

            "evalscript":
                build_evalscript(),

            "resx":
                PIXEL_SIZE_METERS,

            "resy":
                PIXEL_SIZE_METERS,
        },

        "calculations": {

            "crop_type": {

                "histograms": {

                    "default": {

                        "binWidth":
                            1,

                        "lowEdge":
                            0
                    }
                }
            }
        }
    }


# ============================================================
# HTTP
# ============================================================

def post_json(
    url,
    payload,
    access_token,
    timeout=120,
):

    body = json.dumps(
        payload
    ).encode(
        "utf-8"
    )

    request = Request(
        url,
        data=body,
        method="POST",
        headers={

            "Authorization":
                f"Bearer {access_token}",

            "Content-Type":
                "application/json",

            "Accept":
                "application/json",

            "User-Agent":
                "SeedTrade.eu-Copernicus/0.5",
        },
    )

    with urlopen(
        request,
        timeout=timeout,
    ) as response:

        return json.load(
            response
        )


# ============================================================
# RESPONSE HELPERS
# ============================================================

def get_first_interval(
    api_response,
):

    data = api_response.get(
        "data",
        []
    )

    if not data:

        return None

    return data[0]


def get_crop_type_band(
    interval,
):

    if not interval:

        return None

    outputs = interval.get(
        "outputs",
        {}
    )

    crop_output = outputs.get(
        "crop_type",
        {}
    )

    bands = crop_output.get(
        "bands",
        {}
    )

    if not bands:

        return None

    return next(
        iter(
            bands.values()
        ),
        None,
    )


# ============================================================
# HISTOGRAM NORMALIZATION
# ============================================================

def histogram_bin_to_code(
    low_edge,
    high_edge,
):

    if low_edge is None:

        return None

    low_value = float(
        low_edge
    )

    high_value = None

    if high_edge is not None:

        high_value = float(
            high_edge
        )

    rounded_low = int(
        round(
            low_value
        )
    )

    if (
        abs(
            low_value
            - rounded_low
        )
        < 0.000001
    ):

        if rounded_low in CTY_CLASSES:

            return rounded_low

    if high_value is not None:

        rounded_high = int(
            round(
                high_value
            )
        )

        if (
            abs(
                high_value
                - rounded_high
            )
            < 0.000001
        ):

            if rounded_high in CTY_CLASSES:

                return rounded_high

    return rounded_low


def normalize_crop_distribution(
    band,
):

    histogram = band.get(
        "histogram",
        {}
    )

    bins = histogram.get(
        "bins",
        []
    )

    rows = []

    total_pixels = 0

    for item in bins:

        count = int(
            item.get(
                "count",
                0
            )
        )

        if count <= 0:

            continue

        total_pixels += count

    for item in bins:

        count = int(
            item.get(
                "count",
                0
            )
        )

        if count <= 0:

            continue

        low_edge = item.get(
            "lowEdge"
        )

        high_edge = item.get(
            "highEdge"
        )

        code = histogram_bin_to_code(
            low_edge,
            high_edge,
        )

        class_info = (
            CTY_CLASSES.get(
                code
            )
        )

        if class_info:

            name = class_info[
                "name"
            ]

            group = class_info[
                "seedtrade_group"
            ]

            mapping_status = (
                "MAPPED"
            )

        else:

            name = (
                "Unknown / needs validation"
            )

            group = (
                "UNKNOWN"
            )

            mapping_status = (
                "UNMAPPED"
            )

        area_ha = (
            count
            * PIXEL_AREA_HA
        )

        percentage = 0.0

        if total_pixels > 0:

            percentage = (
                count
                / total_pixels
                * 100
            )

        rows.append({

            "cty_code":
                code,

            "histogram_low_edge":
                low_edge,

            "histogram_high_edge":
                high_edge,

            "mapping_status":
                mapping_status,

            "crop_name":
                name,

            "seedtrade_group":
                group,

            "pixels":
                count,

            "area_ha":
                round(
                    area_ha,
                    2,
                ),

            "share_percent":
                round(
                    percentage,
                    2,
                ),
        })

    rows.sort(
        key=lambda row:
            row[
                "pixels"
            ],
        reverse=True,
    )

    return {
        "total_pixels":
            total_pixels,

        "total_area_ha":
            round(
                total_pixels
                * PIXEL_AREA_HA,
                2,
            ),

        "classes":
            rows,
    }


# ============================================================
# GROUP DISTRIBUTION
# ============================================================

def build_group_distribution(
    crop_distribution,
):

    groups = {}

    total_pixels = (
        crop_distribution[
            "total_pixels"
        ]
    )

    for row in crop_distribution[
        "classes"
    ]:

        group = row[
            "seedtrade_group"
        ]

        if group not in groups:

            groups[group] = 0

        groups[group] += (
            row[
                "pixels"
            ]
        )

    result = []

    for group, pixels in groups.items():

        area_ha = (
            pixels
            * PIXEL_AREA_HA
        )

        percentage = 0.0

        if total_pixels > 0:

            percentage = (
                pixels
                / total_pixels
                * 100
            )

        result.append({

            "seedtrade_group":
                group,

            "pixels":
                pixels,

            "area_ha":
                round(
                    area_ha,
                    2,
                ),

            "share_percent":
                round(
                    percentage,
                    2,
                ),
        })

    result.sort(
        key=lambda row:
            row[
                "pixels"
            ],
        reverse=True,
    )

    return result


# ============================================================
# RUN
# ============================================================

def run_test():

    print()

    print(
        "Authenticating with Copernicus..."
    )

    client_id, client_secret = (
        get_credentials()
    )

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

    (
        bbox,
        easting,
        northing,
    ) = build_utm_bbox(
        TEST_REGION[
            "latitude"
        ],
        TEST_REGION[
            "longitude"
        ],
    )

    print()

    print(
        "Requesting real CLMS Crop Types data..."
    )

    api_response = (
        post_json(
            STATISTICS_URL,
            build_statistics_payload(
                bbox
            ),
            token_data[
                "access_token"
            ],
        )
    )

    interval = (
        get_first_interval(
            api_response
        )
    )

    band = (
        get_crop_type_band(
            interval
        )
    )

    if not band:

        raise ValueError(
            "Crop Types statistics not found "
            "in Copernicus response"
        )

    crop_distribution = (
        normalize_crop_distribution(
            band
        )
    )

    group_distribution = (
        build_group_distribution(
            crop_distribution
        )
    )

    return {

        "dataset":
            "SeedTrade.eu Copernicus Crop Types",

        "connector_version":
            "0.5",

        "source":
            (
                "Copernicus Data Space Ecosystem "
                "CLMS Crop Types"
            ),

        "collected_at":
            datetime.now(
                timezone.utc
            ).isoformat(),

        "region":
            TEST_REGION,

        "test_year":
            TEST_YEAR,

        "crs":
            f"EPSG:{UTM_EPSG}",

        "resolution_m":
            PIXEL_SIZE_METERS,

        "pixel_area_ha":
            PIXEL_AREA_HA,

        "utm_reference_point": {

            "easting":
                easting,

            "northing":
                northing,
        },

        "bbox":
            bbox,

        "collection_id":
            CROP_TYPES_COLLECTION_ID,

        "crop_distribution":
            crop_distribution,

        "group_distribution":
            group_distribution,

        "raw_api_response":
            api_response,
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
        "SeedTrade.eu Copernicus Crop Types v0.5"
    )

    print(
        "========================================================"
    )

    print()

    region = result[
        "region"
    ]

    print(
        f"Region: "
        f"{region['region_code']} | "
        f"{region['country']} | "
        f"{region['region']}"
    )

    print(
        f"Year: "
        f"{result['test_year']}"
    )

    print(
        f"Resolution: "
        f"{result['resolution_m']} m"
    )

    distribution = result[
        "crop_distribution"
    ]

    print(
        f"Total pixels: "
        f"{distribution['total_pixels']}"
    )

    print(
        f"Total analysed area: "
        f"{distribution['total_area_ha']} ha"
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

    for row in distribution[
        "classes"
    ]:

        print(
            f"{row['cty_code']:>5} | "
            f"{row['crop_name']:<30} | "
            f"{row['area_ha']:>7.2f} ha | "
            f"{row['share_percent']:>6.2f}% | "
            f"{row['mapping_status']}"
        )

    print()

    print(
        "--------------------------------------------------------"
    )

    print(
        "SEEDTRADE GROUP DISTRIBUTION"
    )

    print(
        "--------------------------------------------------------"
    )

    for row in result[
        "group_distribution"
    ]:

        print(
            f"{row['seedtrade_group']:<22} | "
            f"{row['area_ha']:>7.2f} ha | "
            f"{row['share_percent']:>6.2f}%"
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
        "Wheat = broad Copernicus crop class."
    )

    print(
        "It is NOT automatically Winter wheat."
    )

    print()

    print(
        "Barley = broad Copernicus crop class."
    )

    print(
        "It is NOT automatically Winter barley."
    )

    print()

    print(
        "Unknown histogram codes remain UNMAPPED."
    )

    print(
        "No unknown value is silently converted "
        "to another CTY class."
    )

    print()

    print(
        "========================================================"
    )


# ============================================================
# SAVE
# ============================================================

def save_result(
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

    file_path = (
        OUTPUT_DIR
        / (
            f"PL_EAST_crop_distribution_"
            f"{TEST_YEAR}_"
            f"{current_date}.json"
        )
    )

    with open(
        file_path,
        "w",
        encoding="utf-8",
    ) as file:

        json.dump(
            result,
            file,
            indent=2,
            ensure_ascii=False,
        )

    return file_path


# ============================================================
# MAIN
# ============================================================

def main():

    try:

        result = run_test()

        print_result(
            result
        )

        file_path = (
            save_result(
                result
            )
        )

        print()

        print(
            f"Saved to: "
            f"{file_path}"
        )

    except HTTPError as exc:

        print()

        print(
            "========================================================"
        )

        print(
            "Copernicus Crop Types FAILED"
        )

        print(
            "========================================================"
        )

        print(
            f"HTTP status: "
            f"{exc.code}"
        )

        print(
            f"Reason: "
            f"{exc.reason}"
        )

        try:

            error_body = (
                exc.read()
                .decode(
                    "utf-8",
                    errors="replace",
                )
            )

            if error_body:

                print()

                print(
                    "Copernicus response:"
                )

                print(
                    error_body
                )

        except Exception:

            pass

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
            "Copernicus Crop Types FAILED"
        )

        print()

        print(
            f"Error: "
            f"{exc}"
        )


if __name__ == "__main__":

    main()