"""
SeedTrade.eu
Copernicus Main Crop Emergence v0.2

Purpose
-------
Test real Copernicus CLMS Main Crop Emergence (CPMCE)
data on a small area before scaling up.

Test configuration:
- Region: PL_EAST
- Year: 2023
- Resolution: 10 m
- Area: 500 m x 500 m = 25 ha
- Expected pixels: about 2,500
- HTTP timeout: 300 seconds

CPMCE values use YYDOY format:
    YY = last two digits of year
    DOY = day of year

Example:
    23280 = 2023 day 280

IMPORTANT
---------
This version analyses emergence for all main annual crops
inside the test area.

It does NOT yet intersect CPMCE with CTY Crop Types.
"""

import json
import math
from datetime import datetime, timezone, timedelta
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
# MAIN CROP EMERGENCE
# ============================================================

EMERGENCE_COLLECTION_ID = (
    "10c22197-036f-44d0-b09c-5864d811f154"
)

EMERGENCE_DATA_TYPE = (
    "byoc-10c22197-036f-44d0-b09c-5864d811f154"
)

EMERGENCE_BAND = "CPMCE"


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

# 250 m each direction from centre:
# total 500 x 500 m
TEST_HALF_SIZE_METERS = 250

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
# HTTP SETTINGS
# ============================================================

HTTP_TIMEOUT_SECONDS = 300


# ============================================================
# TEST YEAR
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
                "SeedTrade.eu-Copernicus-Emergence/0.2",
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

        northing += 10000000.0

    return (
        easting,
        northing,
    )


def build_utm_bbox(
    latitude,
    longitude,
):

    easting, northing = latlon_to_utm34(
        latitude,
        longitude,
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
                "{EMERGENCE_BAND}",
                "dataMask"
            ]
        }}],

        output: [
            {{
                id: "emergence",
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

        emergence: [
            sample.{EMERGENCE_BAND}
        ],

        dataMask: [
            sample.dataMask
        ]
    }};
}}
"""


# ============================================================
# STATISTICS PAYLOAD
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
                        EMERGENCE_DATA_TYPE,

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

            "emergence": {

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
                "SeedTrade.eu-Copernicus-Emergence/0.2",
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


def get_emergence_band(
    interval,
):

    if not interval:

        return None

    outputs = interval.get(
        "outputs",
        {}
    )

    emergence_output = outputs.get(
        "emergence",
        {}
    )

    bands = emergence_output.get(
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
# YYDOY DECODER
# ============================================================

def decode_yydoy(
    value,
):

    try:

        code = int(
            round(
                float(value)
            )
        )

    except (
        TypeError,
        ValueError,
    ):

        return None

    if code <= 0:

        return None

    yy = (
        code
        // 1000
    )

    doy = (
        code
        % 1000
    )

    if yy < 0 or yy > 99:

        return None

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
            code,

        "year":
            year,

        "doy":
            doy,

        "date":
            date_value.date().isoformat(),
    }


# ============================================================
# HISTOGRAM NORMALIZATION
# ============================================================

def normalize_histogram(
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

    valid_pixels = 0

    invalid_pixels = 0

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

        low_edge = item.get(
            "lowEdge"
        )

        high_edge = item.get(
            "highEdge"
        )

        decoded = decode_yydoy(
            low_edge
        )

        used_edge = "LOW"

        raw_code = low_edge

        if decoded is None:

            decoded = decode_yydoy(
                high_edge
            )

            used_edge = "HIGH"

            raw_code = high_edge

        if decoded is None:

            invalid_pixels += count

            rows.append({

                "status":
                    "INVALID_OR_BACKGROUND",

                "raw_low_edge":
                    low_edge,

                "raw_high_edge":
                    high_edge,

                "pixels":
                    count,

                "area_ha":
                    round(
                        count
                        * PIXEL_AREA_HA,
                        2,
                    ),
            })

            continue

        valid_pixels += count

        rows.append({

            "status":
                "VALID",

            "used_edge":
                used_edge,

            "raw_code":
                raw_code,

            "code":
                decoded[
                    "code"
                ],

            "year":
                decoded[
                    "year"
                ],

            "doy":
                decoded[
                    "doy"
                ],

            "date":
                decoded[
                    "date"
                ],

            "pixels":
                count,

            "area_ha":
                round(
                    count
                    * PIXEL_AREA_HA,
                    2,
                ),
        })

    return {

        "total_pixels":
            total_pixels,

        "total_area_ha":
            round(
                total_pixels
                * PIXEL_AREA_HA,
                2,
            ),

        "valid_emergence_pixels":
            valid_pixels,

        "valid_emergence_area_ha":
            round(
                valid_pixels
                * PIXEL_AREA_HA,
                2,
            ),

        "invalid_or_background_pixels":
            invalid_pixels,

        "invalid_or_background_area_ha":
            round(
                invalid_pixels
                * PIXEL_AREA_HA,
                2,
            ),

        "bins":
            rows,
    }


# ============================================================
# SUMMARY
# ============================================================

def build_emergence_summary(
    normalized,
):

    valid_rows = [

        row
        for row in normalized[
            "bins"
        ]
        if row.get(
            "status"
        )
        == "VALID"
    ]

    if not valid_rows:

        return {

            "status":
                "NO_VALID_EMERGENCE_DATA"
        }

    valid_rows.sort(
        key=lambda row: (
            row[
                "year"
            ],
            row[
                "doy"
            ],
        )
    )

    total_valid = sum(

        row[
            "pixels"
        ]

        for row in valid_rows
    )

    target = (
        total_valid
        / 2
    )

    cumulative = 0

    median_row = None

    for row in valid_rows:

        cumulative += (
            row[
                "pixels"
            ]
        )

        if cumulative >= target:

            median_row = row

            break

    earliest = valid_rows[0]

    latest = valid_rows[-1]

    years = sorted(
        {
            row[
                "year"
            ]
            for row in valid_rows
        }
    )

    return {

        "status":
            "OK",

        "years_detected":
            years,

        "earliest_emergence": {

            "date":
                earliest[
                    "date"
                ],

            "doy":
                earliest[
                    "doy"
                ],

            "code":
                earliest[
                    "code"
                ],
        },

        "median_emergence": {

            "date":
                median_row[
                    "date"
                ],

            "doy":
                median_row[
                    "doy"
                ],

            "code":
                median_row[
                    "code"
                ],
        },

        "latest_emergence": {

            "date":
                latest[
                    "date"
                ],

            "doy":
                latest[
                    "doy"
                ],

            "code":
                latest[
                    "code"
                ],
        },
    }


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

    width_m = (
        TEST_HALF_SIZE_METERS
        * 2
    )

    height_m = (
        TEST_HALF_SIZE_METERS
        * 2
    )

    expected_pixels = int(
        (
            width_m
            / PIXEL_SIZE_METERS
        )
        *
        (
            height_m
            / PIXEL_SIZE_METERS
        )
    )

    expected_area_ha = (
        width_m
        * height_m
        / 10000
    )

    print()

    print(
        "Test area:"
    )

    print(
        f"  Width:  {width_m} m"
    )

    print(
        f"  Height: {height_m} m"
    )

    print(
        f"  Area:   {expected_area_ha:.2f} ha"
    )

    print(
        f"  Expected pixels: "
        f"{expected_pixels}"
    )

    print()

    print(
        "Reference point in UTM:"
    )

    print(
        f"  Easting:  "
        f"{easting:.2f}"
    )

    print(
        f"  Northing: "
        f"{northing:.2f}"
    )

    print()

    print(
        "Requesting real CLMS Main Crop Emergence data..."
    )

    api_response = post_json(
        STATISTICS_URL,
        build_statistics_payload(
            bbox
        ),
        token_data[
            "access_token"
        ],
    )

    print(
        "Copernicus response received."
    )

    interval = get_first_interval(
        api_response
    )

    band = get_emergence_band(
        interval
    )

    if not band:

        raise ValueError(
            "CPMCE statistics not found "
            "in Copernicus response"
        )

    normalized = (
        normalize_histogram(
            band
        )
    )

    summary = (
        build_emergence_summary(
            normalized
        )
    )

    return {

        "dataset":
            (
                "SeedTrade.eu "
                "Copernicus Main Crop Emergence"
            ),

        "connector_version":
            "0.2",

        "source":
            (
                "Copernicus Data Space Ecosystem "
                "CLMS Main Crop Emergence"
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

        "test_width_m":
            width_m,

        "test_height_m":
            height_m,

        "test_area_ha":
            expected_area_ha,

        "expected_pixels":
            expected_pixels,

        "utm_reference_point": {

            "easting":
                easting,

            "northing":
                northing,
        },

        "bbox":
            bbox,

        "collection_id":
            EMERGENCE_COLLECTION_ID,

        "band":
            EMERGENCE_BAND,

        "encoding":
            "YYDOY",

        "emergence_distribution":
            normalized,

        "emergence_summary":
            summary,

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
        "SeedTrade.eu Main Crop Emergence v0.2"
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
        f"Year requested: "
        f"{result['test_year']}"
    )

    print(
        f"Resolution: "
        f"{result['resolution_m']} m"
    )

    print(
        f"Test area: "
        f"{result['test_area_ha']:.2f} ha"
    )

    print(
        f"Expected pixels: "
        f"{result['expected_pixels']}"
    )

    print(
        f"Encoding: "
        f"{result['encoding']}"
    )

    distribution = result[
        "emergence_distribution"
    ]

    print()

    print(
        "--------------------------------------------------------"
    )

    print(
        "PIXEL SUMMARY"
    )

    print(
        "--------------------------------------------------------"
    )

    print(
        f"Returned pixels: "
        f"{distribution['total_pixels']}"
    )

    print(
        f"Returned area: "
        f"{distribution['total_area_ha']} ha"
    )

    print(
        f"Valid emergence pixels: "
        f"{distribution['valid_emergence_pixels']}"
    )

    print(
        f"Valid emergence area: "
        f"{distribution['valid_emergence_area_ha']} ha"
    )

    print(
        f"Background / invalid pixels: "
        f"{distribution['invalid_or_background_pixels']}"
    )

    print(
        f"Background / invalid area: "
        f"{distribution['invalid_or_background_area_ha']} ha"
    )

    summary = result[
        "emergence_summary"
    ]

    print()

    print(
        "--------------------------------------------------------"
    )

    print(
        "EMERGENCE SUMMARY"
    )

    print(
        "--------------------------------------------------------"
    )

    if (
        summary.get(
            "status"
        )
        != "OK"
    ):

        print(
            "No valid emergence data detected."
        )

    else:

        print(
            f"Years detected: "
            f"{summary['years_detected']}"
        )

        print()

        print(
            f"Earliest emergence: "
            f"{summary['earliest_emergence']['date']} "
            f"(DOY "
            f"{summary['earliest_emergence']['doy']})"
        )

        print(
            f"Median emergence:   "
            f"{summary['median_emergence']['date']} "
            f"(DOY "
            f"{summary['median_emergence']['doy']})"
        )

        print(
            f"Latest emergence:   "
            f"{summary['latest_emergence']['date']} "
            f"(DOY "
            f"{summary['latest_emergence']['doy']})"
        )

    print()

    print(
        "--------------------------------------------------------"
    )

    print(
        "VALID EMERGENCE BINS"
    )

    print(
        "--------------------------------------------------------"
    )

    valid_rows = [

        row
        for row in distribution[
            "bins"
        ]
        if row.get(
            "status"
        )
        == "VALID"
    ]

    valid_rows.sort(
        key=lambda row: (
            row[
                "year"
            ],
            row[
                "doy"
            ],
        )
    )

    if not valid_rows:

        print(
            "No valid bins."
        )

    else:

        for row in valid_rows:

            print(
                f"{row['code']} | "
                f"{row['date']} | "
                f"DOY {row['doy']:>3} | "
                f"{row['area_ha']:>6.2f} ha | "
                f"{row['pixels']} px"
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
        "This is Main Crop Emergence for all "
        "supported annual crops in the area."
    )

    print()

    print(
        "It is NOT yet wheat-only emergence."
    )

    print(
        "It is NOT yet winter-wheat emergence."
    )

    print()

    print(
        "Next successful step:"
    )

    print(
        "CTY + CPMCE pixel-level intersection."
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
            f"PL_EAST_main_crop_emergence_"
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

        file_path = save_result(
            result
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
            "Copernicus Main Crop Emergence FAILED"
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

    except TimeoutError:

        print()

        print(
            "========================================================"
        )

        print(
            "Copernicus Main Crop Emergence TIMEOUT"
        )

        print(
            "========================================================"
        )

        print()

        print(
            f"No response within "
            f"{HTTP_TIMEOUT_SECONDS} seconds."
        )

        print()

        print(
            "The API request is still too expensive "
            "for this test configuration."
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
            "Copernicus Main Crop Emergence FAILED"
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