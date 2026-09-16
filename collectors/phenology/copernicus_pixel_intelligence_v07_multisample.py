"""
SeedTrade.eu Copernicus Pixel Intelligence v0.7
PL_EAST five-sample spatial-stability runner.

Runs the validated v0.6 seven-layer workflow over five geographically
separate 2 x 2 km / 400 ha samples. Total sampled area: 2,000 ha.

The v0.6 analytical functions remain unchanged and are reused directly.
Winter/spring classification remains a downstream step.
"""

import json
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

import copernicus_pixel_intelligence as core


VERSION = "0.7"

SAMPLES = [
    {"sample_id": "S01", "latitude": 51.80, "longitude": 23.00},
    {"sample_id": "S02", "latitude": 52.20, "longitude": 22.70},
    {"sample_id": "S03", "latitude": 52.55, "longitude": 23.05},
    {"sample_id": "S04", "latitude": 51.45, "longitude": 22.65},
    {"sample_id": "S05", "latitude": 51.20, "longitude": 23.15},
]


def build_bbox(latitude, longitude):
    easting, northing = core.latlon_to_utm34(latitude, longitude)
    h = core.TEST_HALF_SIZE_METERS
    return [
        easting - h,
        northing - h,
        easting + h,
        northing + h,
    ], easting, northing


def dated_path(sample_id, suffix):
    date = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    return core.OUTPUT_DIR / (
        f"PL_EAST_pixel_intelligence_v07_{core.TEST_YEAR}_"
        f"{sample_id}_2km_400ha_test_{date}.{suffix}"
    )


def save_bytes(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(data)


def save_json(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)


def layer_metadata():
    result = {}
    for code in core.LAYER_CODES:
        result[code] = {
            "collection_id": core.get_collection_id(code),
            "band": core.get_band(code),
        }
    return result


def run_sample(sample, token, layers):
    sample_id = sample["sample_id"]
    bbox, easting, northing = build_bbox(
        sample["latitude"], sample["longitude"]
    )

    print()
    print("=" * 56)
    print(
        f"{sample_id} | center "
        f"{sample['latitude']:.5f}, {sample['longitude']:.5f}"
    )
    print("=" * 56)

    payload = core.build_process_payload(bbox)
    raster_bytes, content_type = core.request_raster(payload, token)

    print("Copernicus response received.")
    print(f"Content-Type: {content_type}")
    print(f"Downloaded bytes: {len(raster_bytes):,}")

    tif_path = dated_path(sample_id, "tif")
    save_bytes(tif_path, raster_bytes)
    print(f"TIFF: {tif_path}")

    arrays = core.read_seven_band_tiff(tif_path)
    analysis = core.analyse_pixels(*arrays)
    crop_summary = core.build_crop_summary(analysis["crop_counter"])
    phenology = core.build_crop_phenology_summary(analysis["pixels"])

    region = dict(core.TEST_REGION)
    region["latitude"] = sample["latitude"]
    region["longitude"] = sample["longitude"]

    result = {
        "dataset": "SeedTrade.eu Copernicus Pixel Intelligence",
        "version": VERSION,
        "test_type": "PL_EAST_MULTI_SAMPLE",
        "sample_id": sample_id,
        "year": core.TEST_YEAR,
        "region": region,
        "sample_center": {
            "latitude": sample["latitude"],
            "longitude": sample["longitude"],
            "utm_easting": round(easting, 3),
            "utm_northing": round(northing, 3),
        },
        "crs": f"EPSG:{core.UTM_EPSG}",
        "bbox": bbox,
        "resolution_m": core.PIXEL_SIZE_METERS,
        "width_pixels": core.WIDTH_PIXELS,
        "height_pixels": core.HEIGHT_PIXELS,
        "area_ha": round(
            core.WIDTH_PIXELS
            * core.HEIGHT_PIXELS
            * core.PIXEL_AREA_HA,
            2,
        ),
        "test_extent_m": core.TEST_HALF_SIZE_METERS * 2,
        "layers": layers,
        "crop_summary": crop_summary,
        "crop_phenology_summary": phenology,
        "season_consistency": dict(analysis["consistency_counter"]),
        "harvest_uncertainty_status": dict(
            analysis["harvest_uncertainty_status_counter"]
        ),
        "pixels": analysis["pixels"],
        "collected_at": datetime.now(timezone.utc).isoformat(),
    }

    json_path = dated_path(sample_id, "json")
    save_json(json_path, result)
    print(f"JSON: {json_path}")

    return result, json_path, tif_path


def main():
    print()
    print("SeedTrade.eu Copernicus Pixel Intelligence v0.7")
    print("PL_EAST | 5 x 400 ha spatial-stability test")
    print()

    client_id, client_secret = core.get_credentials()
    token_data = core.request_access_token(client_id, client_secret)
    token = token_data["access_token"]

    print("OAuth: SUCCESS")
    print(f"Token expires in: {token_data.get('expires_in')} seconds")

    layers = layer_metadata()
    completed = []
    combined = Counter()

    for sample in SAMPLES:
        result, json_path, tif_path = run_sample(sample, token, layers)

        for crop in result["crop_summary"]:
            combined[int(crop["cty"])] += int(crop["pixels"])

        completed.append({
            "sample_id": sample["sample_id"],
            "latitude": sample["latitude"],
            "longitude": sample["longitude"],
            "area_ha": result["area_ha"],
            "json_path": str(json_path),
            "tiff_path": str(tif_path),
            "crop_summary": result["crop_summary"],
        })

    combined_summary = core.build_crop_summary(combined)
    date = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    summary_path = core.OUTPUT_DIR / (
        f"PL_EAST_pixel_intelligence_v07_{core.TEST_YEAR}_"
        f"5samples_2000ha_summary_{date}.json"
    )

    summary = {
        "dataset": "SeedTrade.eu Copernicus Pixel Intelligence Multi-Sample Summary",
        "version": VERSION,
        "region_code": "PL_EAST",
        "year": core.TEST_YEAR,
        "sample_count": len(completed),
        "sample_area_ha": 400.0,
        "total_sampled_area_ha": round(len(completed) * 400.0, 2),
        "total_pixels": len(completed) * core.WIDTH_PIXELS * core.HEIGHT_PIXELS,
        "continuous_polygon": False,
        "samples": completed,
        "combined_crop_summary": combined_summary,
        "collected_at": datetime.now(timezone.utc).isoformat(),
    }
    save_json(summary_path, summary)

    print()
    print("=" * 56)
    print("MULTI-SAMPLE RUN COMPLETE")
    print("=" * 56)
    print(f"Successful samples: {len(completed)}/{len(SAMPLES)}")
    print(f"Total sampled area: {summary['total_sampled_area_ha']:.2f} ha")
    print(f"Total pixels: {summary['total_pixels']:,}")
    print()
    print("Combined crop distribution:")
    for crop in combined_summary:
        print(
            f"{crop['cty']:>5} | {crop['crop']:<30} | "
            f"{crop['pixels']:>7,} px | {crop['area_ha']:>8.2f} ha | "
            f"{crop['share_percent']:>6.2f}%"
        )
    print()
    print("Regional summary:")
    print(summary_path)


if __name__ == "__main__":
    main()
