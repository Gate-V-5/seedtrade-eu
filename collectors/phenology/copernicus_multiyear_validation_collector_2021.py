"""
SeedTrade.eu Copernicus Multi-Year Validation Collector v1.0
PL_EAST five-sample out-of-sample multi-year validation runner.

Runs the validated v0.8 eight-layer workflow over five geographically
separate 2 x 2 km / 400 ha samples. Total sampled area: 2,000 ha.

Layers
------
1. CTY
2. CPMCE
3. CPMCECL
4. CPMCD
5. CPMCDCL
6. CPMCH
7. CPMCHCL
8. CPCSY

IMPORTANT
---------
- The v0.8 analytical functions remain unchanged and are reused directly.
- CPCSY is a separate CLMS cross-layer validation signal only.
- CPCSY is NOT used to create or modify WINTER/SPRING classification.
- Winter/spring classification remains a separate downstream step.
- The five samples are a spatial-stability test, NOT a statistically
  representative regional acreage estimate.
"""

import json
from collections import Counter
from datetime import datetime, timezone

import copernicus_pixel_intelligence_v08_cpcsy as core


VERSION = "1.0-multiyear-validation"

# Frozen out-of-sample validation year. Change only after completing/reviewing this year.
VALIDATION_YEAR = 2021
core.TEST_YEAR = VALIDATION_YEAR

SAMPLES = [
    {"sample_id": "S01", "latitude": 51.80, "longitude": 23.00},
    {"sample_id": "S02", "latitude": 52.20, "longitude": 22.70},
    {"sample_id": "S03", "latitude": 52.55, "longitude": 23.05},
    {"sample_id": "S04", "latitude": 51.45, "longitude": 22.65},
    {"sample_id": "S05", "latitude": 51.20, "longitude": 23.15},
]


def build_bbox(latitude, longitude):
    easting, northing = core.latlon_to_utm34(
        latitude,
        longitude,
    )

    half_size = core.TEST_HALF_SIZE_METERS

    return [
        easting - half_size,
        northing - half_size,
        easting + half_size,
        northing + half_size,
    ], easting, northing


def dated_path(sample_id, suffix):
    current_date = datetime.now(
        timezone.utc
    ).strftime(
        "%Y-%m-%d"
    )

    return core.OUTPUT_DIR / (
        f"PL_EAST_multiyear_validation_pixel_intelligence_"
        f"{core.TEST_YEAR}_"
        f"{sample_id}_"
        f"2km_400ha_test_"
        f"{current_date}.{suffix}"
    )


def save_bytes(path, data):
    path.parent.mkdir(
        parents=True,
        exist_ok=True,
    )

    path.write_bytes(
        data
    )


def save_json(path, data):
    path.parent.mkdir(
        parents=True,
        exist_ok=True,
    )

    with open(
        path,
        "w",
        encoding="utf-8",
    ) as file:

        json.dump(
            data,
            file,
            indent=2,
            ensure_ascii=False,
        )


def layer_metadata():
    result = {}

    for code in core.LAYER_CODES:

        result[code] = {
            "collection_id":
                core.layer_collection_id(
                    code
                ),

            "band":
                core.layer_band(
                    code
                ),
        }

    return result


def cpcsy_summary_from_analysis(analysis):
    distribution = dict(
        analysis[
            "cpcsy_counter"
        ]
    )

    status = dict(
        analysis[
            "cpcsy_status_counter"
        ]
    )

    return {
        "role":
            "SEPARATE_CLMS_CROSS_LAYER_SIGNAL",

        "used_for_winter_spring_classification":
            False,

        "meaning":
            (
                "Number of growing seasons detected "
                "within the calendar year"
            ),

        "distribution":
            distribution,

        "status":
            status,
    }


def run_sample(
    sample,
    token,
    layers,
):
    sample_id = sample[
        "sample_id"
    ]

    (
        bbox,
        easting,
        northing,
    ) = build_bbox(
        sample[
            "latitude"
        ],
        sample[
            "longitude"
        ],
    )

    print()
    print(
        "=" * 64
    )

    print(
        f"{sample_id} | center "
        f"{sample['latitude']:.5f}, "
        f"{sample['longitude']:.5f}"
    )

    print(
        "=" * 64
    )

    print(
        "Requesting 8-layer Data Fusion:"
    )

    print(
        "CTY + CPMCE + CPMCECL + CPMCD + "
        "CPMCDCL + CPMCH + CPMCHCL + CPCSY"
    )

    payload = (
        core.build_process_payload(
            bbox
        )
    )

    (
        raster_bytes,
        content_type,
    ) = core.request_raster(
        payload,
        token,
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
        f"{len(raster_bytes):,}"
    )

    tif_path = dated_path(
        sample_id,
        "tif",
    )

    save_bytes(
        tif_path,
        raster_bytes,
    )

    print(
        f"TIFF: {tif_path}"
    )

    arrays = (
        core.read_eight_band_tiff(
            tif_path
        )
    )

    analysis = (
        core.analyse_pixels(
            *arrays
        )
    )

    crop_summary = (
        core.build_crop_summary(
            analysis[
                "crop_counter"
            ]
        )
    )

    phenology = (
        core.build_crop_phenology_summary(
            analysis[
                "pixels"
            ]
        )
    )

    cpcsy_validation = (
        cpcsy_summary_from_analysis(
            analysis
        )
    )

    region = dict(
        core.TEST_REGION
    )

    region[
        "latitude"
    ] = sample[
        "latitude"
    ]

    region[
        "longitude"
    ] = sample[
        "longitude"
    ]

    result = {
        "dataset":
            "SeedTrade.eu Copernicus Pixel Intelligence",

        "version":
            VERSION,

        "source_workflow_version":
            "0.8",

        "test_type":
            "LT_VALIDATION_GEOGRAPHIC_TRANSFER_VALIDATION",

        "sample_id":
            sample_id,

        "year":
            core.TEST_YEAR,

        "validation_mode":
            "OUT_OF_SAMPLE_FROZEN_RULES_GEOGRAPHIC_TRANSFER",

        "source_workflow":
            "v0.9 eight-layer workflow / v0.8 analytical core",

        "cpcsy_role":
            "SEPARATE_CLMS_CROSS_LAYER_SIGNAL",

        "cpcsy_independence_claimed":
            False,

        "region":
            region,

        "sample_center": {
            "latitude":
                sample[
                    "latitude"
                ],

            "longitude":
                sample[
                    "longitude"
                ],

            "utm_easting":
                round(
                    easting,
                    3,
                ),

            "utm_northing":
                round(
                    northing,
                    3,
                ),
        },

        "crs":
            f"EPSG:{core.UTM_EPSG}",

        "bbox":
            bbox,

        "resolution_m":
            core.PIXEL_SIZE_METERS,

        "width_pixels":
            core.WIDTH_PIXELS,

        "height_pixels":
            core.HEIGHT_PIXELS,

        "area_ha":
            round(
                core.WIDTH_PIXELS
                * core.HEIGHT_PIXELS
                * core.PIXEL_AREA_HA,
                2,
            ),

        "test_extent_m":
            core.TEST_HALF_SIZE_METERS
            * 2,

        "layers":
            layers,

        "crop_summary":
            crop_summary,

        "crop_phenology_summary":
            phenology,

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

        "cpcsy_validation":
            cpcsy_validation,

        "cpcsy_used_for_classification":
            False,

        "pixels":
            analysis[
                "pixels"
            ],

        "collected_at":
            datetime.now(
                timezone.utc
            ).isoformat(),
    }

    json_path = dated_path(
        sample_id,
        "json",
    )

    save_json(
        json_path,
        result,
    )

    print()
    print(
        f"{sample_id} CPCSY distribution:"
    )

    for label, count in (
        cpcsy_validation[
            "distribution"
        ].items()
    ):

        print(
            f"  {label}: "
            f"{count:,}"
        )

    print()
    print(
        f"JSON: {json_path}"
    )

    return (
        result,
        json_path,
        tif_path,
    )


def main():
    print()
    print(
        "SeedTrade.eu Copernicus Multi-Year Validation Collector v1.0"
    )

    print(
        f"PL_EAST | {VALIDATION_YEAR} | 5 x 400 ha out-of-sample validation"
    )

    print()

    (
        client_id,
        client_secret,
    ) = core.get_credentials()

    token_data = (
        core.request_access_token(
            client_id,
            client_secret,
        )
    )

    token = token_data[
        "access_token"
    ]

    print(
        "OAuth: SUCCESS"
    )

    print(
        f"Token expires in: "
        f"{token_data.get('expires_in')} seconds"
    )

    layers = (
        layer_metadata()
    )

    completed = []

    combined_crops = (
        Counter()
    )

    combined_cpcsy = (
        Counter()
    )

    combined_cpcsy_status = (
        Counter()
    )

    total_strong_match = 0
    total_not_evaluated = 0

    for sample in SAMPLES:

        (
            result,
            json_path,
            tif_path,
        ) = run_sample(
            sample,
            token,
            layers,
        )

        for crop in result[
            "crop_summary"
        ]:

            combined_crops[
                int(
                    crop[
                        "cty"
                    ]
                )
            ] += int(
                crop[
                    "pixels"
                ]
            )

        for label, count in result[
            "cpcsy_validation"
        ][
            "distribution"
        ].items():

            combined_cpcsy[
                label
            ] += int(
                count
            )

        for status, count in result[
            "cpcsy_validation"
        ][
            "status"
        ].items():

            combined_cpcsy_status[
                status
            ] += int(
                count
            )

        total_strong_match += int(
            result[
                "season_consistency"
            ].get(
                "STRONG_MATCH",
                0,
            )
        )

        total_not_evaluated += int(
            result[
                "season_consistency"
            ].get(
                "NOT_EVALUATED",
                0,
            )
        )

        completed.append(
            {
                "sample_id":
                    sample[
                        "sample_id"
                    ],

                "latitude":
                    sample[
                        "latitude"
                    ],

                "longitude":
                    sample[
                        "longitude"
                    ],

                "area_ha":
                    result[
                        "area_ha"
                    ],

                "json_path":
                    str(
                        json_path
                    ),

                "tiff_path":
                    str(
                        tif_path
                    ),

                "crop_summary":
                    result[
                        "crop_summary"
                    ],

                "cpcsy_validation":
                    result[
                        "cpcsy_validation"
                    ],
            }
        )

    combined_crop_summary = (
        core.build_crop_summary(
            combined_crops
        )
    )

    current_date = (
        datetime.now(
            timezone.utc
        ).strftime(
            "%Y-%m-%d"
        )
    )

    summary_path = (
        core.OUTPUT_DIR
        / (
            "LT_VALIDATION_"
            "multiyear_validation_pixel_intelligence_"
            f"{core.TEST_YEAR}_"
            "5samples_2000ha_summary_"
            f"{current_date}.json"
        )
    )

    total_pixels = (
        len(
            completed
        )
        * core.WIDTH_PIXELS
        * core.HEIGHT_PIXELS
    )

    summary = {
        "dataset":
            (
                "SeedTrade.eu Copernicus Pixel Intelligence "
                "Multi-Sample CPCSY Summary"
            ),

        "version":
            VERSION,

        "source_workflow_version":
            "0.8",

        "region_code":
            "LT_VALIDATION",

        "year":
            core.TEST_YEAR,

        "validation_mode":
            "OUT_OF_SAMPLE_FROZEN_RULES_GEOGRAPHIC_TRANSFER",

        "source_workflow":
            "v0.9 eight-layer workflow / v0.8 analytical core",

        "cpcsy_role":
            "SEPARATE_CLMS_CROSS_LAYER_SIGNAL",

        "cpcsy_independence_claimed":
            False,

        "sample_count":
            len(
                completed
            ),

        "sample_area_ha":
            400.0,

        "total_sampled_area_ha":
            round(
                len(
                    completed
                )
                * 400.0,
                2,
            ),

        "total_pixels":
            total_pixels,

        "continuous_polygon":
            False,

        "representative_regional_sample":
            False,

        "sampling_note":
            (
                "Five geographically separated heuristic 400 ha windows "
                "across the Lithuanian agricultural belt for geographic-transfer "
                "testing. Not a probability sample and not suitable for "
                "national or regional acreage estimation."
            ),

        "layers":
            layers,

        "samples":
            completed,

        "combined_crop_summary":
            combined_crop_summary,

        "combined_cpcsy_validation": {
            "role":
                "SEPARATE_CLMS_CROSS_LAYER_SIGNAL",

            "used_for_winter_spring_classification":
                False,

            "distribution":
                dict(
                    combined_cpcsy
                ),

            "status":
                dict(
                    combined_cpcsy_status
                ),
        },

        "combined_season_consistency": {
            "STRONG_MATCH":
                total_strong_match,

            "NOT_EVALUATED":
                total_not_evaluated,
        },

        "collected_at":
            datetime.now(
                timezone.utc
            ).isoformat(),
    }

    save_json(
        summary_path,
        summary,
    )

    print()
    print(
        "=" * 64
    )

    print(
        "MULTI-SAMPLE CPCSY RUN COMPLETE"
    )

    print(
        "=" * 64
    )

    print(
        f"Successful samples: "
        f"{len(completed)}/{len(SAMPLES)}"
    )

    print(
        f"Total sampled area: "
        f"{summary['total_sampled_area_ha']:.2f} ha"
    )

    print(
        f"Total pixels: "
        f"{summary['total_pixels']:,}"
    )

    print()
    print(
        "Combined crop distribution:"
    )

    for crop in (
        combined_crop_summary
    ):

        print(
            f"{crop['cty']:>5} | "
            f"{crop['crop']:<30} | "
            f"{crop['pixels']:>7,} px | "
            f"{crop['area_ha']:>8.2f} ha | "
            f"{crop['share_percent']:>6.2f}%"
        )

    print()
    print(
        "Combined CPCSY distribution:"
    )

    for label, count in (
        combined_cpcsy.most_common()
    ):

        share = (
            count
            / total_pixels
            * 100
            if total_pixels
            else 0.0
        )

        print(
            f"{label:<36} | "
            f"{count:>7,} px | "
            f"{share:>6.2f}%"
        )

    print()
    print(
        "IMPORTANT:"
    )

    print(
        "CPCSY remains a separate CLMS cross-layer validation signal only."
    )

    print(
        "No WINTER/SPRING classification rules were changed."
    )

    print(
        "The five samples are not a representative regional acreage estimate."
    )

    print()
    print(
        "Regional summary:"
    )

    print(
        summary_path
    )


if __name__ == "__main__":
    main()
