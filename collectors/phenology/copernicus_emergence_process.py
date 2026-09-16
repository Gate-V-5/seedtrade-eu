"""
SeedTrade.eu
Copernicus Main Crop Emergence - Processing API v0.1

Purpose
-------
Test direct raster access to the Copernicus CLMS
Main Crop Emergence (CPMCE) dataset using Sentinel Hub
Processing API instead of Statistical API.

Test:
- PL_EAST
- 2023
- 100 m x 100 m
- 10 m resolution
- expected raster: 10 x 10 pixels
- GeoTIFF UINT16

CPMCE encoding:
YYDOY

Example:
23280 = year 2023, day 280

This test only downloads the raw CPMCE raster.
It does NOT yet combine Crop Types + Emergence.
"""

import json
import math
import struct
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

PROCESS_URL = (
    "https://sh.dataspace.copernicus.eu/process/v1"
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
# REGION
# ============================================================

TEST_REGION = {
    "region_code": "PL_EAST",
    "country": "Poland",
    "region": "Eastern Poland",
    "latitude": 51.8,
    "longitude": 23.0,
}


# ============================================================
# TEST SETTINGS
# ============================================================

TEST_YEAR = 2023

UTM_EPSG = 32634

UTM_CRS = (
    "http://www.opengis.net/"
    "def/crs/EPSG/0/32634"
)

# 50 m each side = 100 x 100 m
TEST_HALF_SIZE_METERS = 50

PIXEL_SIZE_METERS = 10

TEST_WIDTH_PIXELS = 10
TEST_HEIGHT_PIXELS = 10

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

            values[key.strip()] = value.strip()

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
                "SeedTrade.eu-CPMCE-Process/0.1",
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


def build_bbox():

    easting, northing = latlon_to_utm34(
        TEST_REGION["latitude"],
        TEST_REGION["longitude"],
    )

    bbox = [
        easting - TEST_HALF_SIZE_METERS,
        northing - TEST_HALF_SIZE_METERS,
        easting + TEST_HALF_SIZE_METERS,
        northing + TEST_HALF_SIZE_METERS,
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

        output: {{
            id: "default",
            bands: 1,
            sampleType: "UINT16",
            nodataValue: 0
        }}
    }};
}}

function evaluatePixel(sample) {{

    if (sample.dataMask === 0) {{
        return [0];
    }}

    return [
        sample.{EMERGENCE_BAND}
    ];
}}
"""


# ============================================================
# PROCESS REQUEST
# ============================================================

def build_process_payload(
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
                        "timeRange": {
                            "from":
                                f"{TEST_YEAR}-01-01T00:00:00Z",

                            "to":
                                f"{TEST_YEAR}-12-31T23:59:59Z"
                        },

                        "mosaickingOrder":
                            "mostRecent"
                    }
                }
            ]
        },

        "output": {
            "width":
                TEST_WIDTH_PIXELS,

            "height":
                TEST_HEIGHT_PIXELS,

            "responses": [
                {
                    "identifier":
                        "default",

                    "format": {
                        "type":
                            "image/tiff"
                    }
                }
            ]
        },

        "evalscript":
            build_evalscript(),
    }


# ============================================================
# HTTP PROCESSING API
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
                "SeedTrade.eu-CPMCE-Process/0.1",
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

        content_type = response.headers.get(
            "Content-Type"
        )

        raster_bytes = response.read()

    return (
        raster_bytes,
        content_type,
    )


# ============================================================
# BASIC TIFF VALIDATION
# ============================================================

def inspect_tiff_header(
    raster_bytes,
):

    if len(raster_bytes) < 8:

        return {
            "valid_tiff":
                False,

            "reason":
                "File too small",
        }

    byte_order = raster_bytes[0:2]

    if byte_order == b"II":

        endian = "<"
        byte_order_name = "little-endian"

    elif byte_order == b"MM":

        endian = ">"
        byte_order_name = "big-endian"

    else:

        return {
            "valid_tiff":
                False,

            "reason":
                "Invalid TIFF byte-order marker",
        }

    magic = struct.unpack(
        endian + "H",
        raster_bytes[2:4],
    )[0]

    return {
        "valid_tiff":
            magic == 42,

        "byte_order":
            byte_order_name,

        "magic":
            magic,

        "size_bytes":
            len(raster_bytes),
    }


# ============================================================
# SAVE
# ============================================================

def save_raster(
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

    file_path = (
        OUTPUT_DIR
        / (
            f"PL_EAST_CPMCE_"
            f"{TEST_YEAR}_"
            f"100m_test_"
            f"{current_date}.tif"
        )
    )

    with open(
        file_path,
        "wb",
    ) as file:

        file.write(
            raster_bytes
        )

    return file_path


def save_metadata(
    bbox,
    easting,
    northing,
    content_type,
    tiff_info,
    raster_path,
):

    metadata = {
        "dataset":
            "Copernicus CLMS Main Crop Emergence",

        "connector_version":
            "Processing API v0.1",

        "collection_id":
            EMERGENCE_COLLECTION_ID,

        "band":
            EMERGENCE_BAND,

        "encoding":
            "YYDOY",

        "year":
            TEST_YEAR,

        "region":
            TEST_REGION,

        "crs":
            f"EPSG:{UTM_EPSG}",

        "resolution_m":
            PIXEL_SIZE_METERS,

        "width_pixels":
            TEST_WIDTH_PIXELS,

        "height_pixels":
            TEST_HEIGHT_PIXELS,

        "expected_pixels":
            (
                TEST_WIDTH_PIXELS
                * TEST_HEIGHT_PIXELS
            ),

        "test_area_ha":
            1.0,

        "bbox":
            bbox,

        "reference_utm": {
            "easting":
                easting,

            "northing":
                northing,
        },

        "content_type":
            content_type,

        "tiff":
            tiff_info,

        "raster_file":
            str(raster_path),

        "collected_at":
            datetime.now(
                timezone.utc
            ).isoformat(),
    }

    metadata_path = (
        raster_path.with_suffix(
            ".json"
        )
    )

    with open(
        metadata_path,
        "w",
        encoding="utf-8",
    ) as file:

        json.dump(
            metadata,
            file,
            indent=2,
            ensure_ascii=False,
        )

    return metadata_path


# ============================================================
# MAIN
# ============================================================

def main():

    try:

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

        bbox, easting, northing = (
            build_bbox()
        )

        print()

        print(
            "========================================================"
        )

        print(
            "SeedTrade.eu CPMCE Processing API v0.1"
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
            f"CRS: "
            f"EPSG:{UTM_EPSG}"
        )

        print(
            f"Area: "
            f"100 x 100 m = 1.00 ha"
        )

        print(
            f"Raster: "
            f"{TEST_WIDTH_PIXELS} x "
            f"{TEST_HEIGHT_PIXELS} pixels"
        )

        print(
            f"Expected pixels: "
            f"{TEST_WIDTH_PIXELS * TEST_HEIGHT_PIXELS}"
        )

        print(
            f"Resolution: "
            f"{PIXEL_SIZE_METERS} m"
        )

        print()

        print(
            "Bounding box:"
        )

        print(
            f"  {bbox}"
        )

        print()

        print(
            "Requesting CPMCE GeoTIFF via Processing API..."
        )

        payload = build_process_payload(
            bbox
        )

        raster_bytes, content_type = (
            request_raster(
                payload,
                token_data[
                    "access_token"
                ],
            )
        )

        print(
            "Copernicus response received."
        )

        print()

        print(
            f"Content-Type: "
            f"{content_type}"
        )

        print(
            f"Downloaded bytes: "
            f"{len(raster_bytes)}"
        )

        tiff_info = inspect_tiff_header(
            raster_bytes
        )

        print()

        print(
            "TIFF validation:"
        )

        print(
            f"  Valid TIFF: "
            f"{tiff_info.get('valid_tiff')}"
        )

        print(
            f"  Byte order: "
            f"{tiff_info.get('byte_order')}"
        )

        print(
            f"  TIFF magic: "
            f"{tiff_info.get('magic')}"
        )

        if not tiff_info.get(
            "valid_tiff"
        ):

            raise ValueError(
                "Copernicus response is not a valid TIFF"
            )

        raster_path = save_raster(
            raster_bytes
        )

        metadata_path = save_metadata(
            bbox,
            easting,
            northing,
            content_type,
            tiff_info,
            raster_path,
        )

        print()

        print(
            "========================================================"
        )

        print(
            "PROCESSING API TEST: SUCCESS"
        )

        print(
            "========================================================"
        )

        print()

        print(
            f"Raster saved to:"
        )

        print(
            raster_path
        )

        print()

        print(
            f"Metadata saved to:"
        )

        print(
            metadata_path
        )

        print()

        print(
            "IMPORTANT:"
        )

        print(
            "This proves direct CPMCE raster access."
        )

        print(
            "Pixel values have NOT yet been decoded."
        )

        print()

        print(
            "Next step:"
        )

        print(
            "Read UINT16 pixel values and decode YYDOY."
        )

        print(
            "Then combine CPMCE with CTY at identical pixels."
        )

        print()

    except HTTPError as exc:

        print()

        print(
            "========================================================"
        )

        print(
            "CPMCE Processing API FAILED"
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
            "Processing API request timed out."
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
            "CPMCE Processing API FAILED"
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