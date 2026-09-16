#!/usr/bin/env python3
"""
SeedTrade.eu — LT 2023 S03 CTY × dominant-event overlay v0.1

Purpose
-------
Create a geographic GeoJSON overlay for S03 showing:
1) all target CTY crop pixels (Wheat, Barley, Other cereals, Rapeseed);
2) dominant CLMS event-pattern pixels;
3) event-pattern bounding polygons.

This is diagnostic only. Frozen v0.7 is NOT modified.

Source geometry is read from the authoritative S03 raw Pixel Intelligence JSON:
EPSG:32634, 200 x 200 pixels, 10 m resolution.
"""

import json
import math
from collections import Counter
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / "data" / "raw" / "copernicus"

V07 = DATA / (
    "LT_VALIDATION_season_type_classifier_v07_hybrid_multiyear_validation_"
    "2023_5samples_2000ha_2026-09-07.json"
)

RAW = DATA / (
    "LT_VALIDATION_multiyear_validation_pixel_intelligence_"
    "2023_S03_2km_400ha_test_2026-09-07.json"
)

SAMPLE_ID = "S03"

TARGET_CROPS = {
    1110: "Wheat",
    1120: "Barley",
    1150: "Other cereals",
    1430: "Rapeseed",
}

PATTERNS = {
    "PRIMARY_FULL_PATTERN": {
        "emergence_date": "2023-03-28",
        "emergence_uncertainty_days": 17,
        "duration_days": 119,
        "harvest_date": "2023-07-25",
    },
    "SECOND_DATE_UNCERTAINTY": {
        "emergence_date": "2023-03-31",
        "emergence_uncertainty_days": 19,
    },
}


def utm34n_to_wgs84(easting, northing):
    """Inverse WGS84 / UTM zone 34N (EPSG:32634) using stdlib only."""
    a = 6378137.0
    ecc_sq = 0.00669437999014
    k0 = 0.9996
    e1 = (1 - math.sqrt(1 - ecc_sq)) / (1 + math.sqrt(1 - ecc_sq))

    x = easting - 500000.0
    y = northing
    lon_origin = 21.0

    m = y / k0
    mu = m / (
        a * (
            1
            - ecc_sq / 4
            - 3 * ecc_sq**2 / 64
            - 5 * ecc_sq**3 / 256
        )
    )

    phi1 = (
        mu
        + (3 * e1 / 2 - 27 * e1**3 / 32) * math.sin(2 * mu)
        + (21 * e1**2 / 16 - 55 * e1**4 / 32) * math.sin(4 * mu)
        + (151 * e1**3 / 96) * math.sin(6 * mu)
        + (1097 * e1**4 / 512) * math.sin(8 * mu)
    )

    ecc_prime_sq = ecc_sq / (1 - ecc_sq)
    n1 = a / math.sqrt(1 - ecc_sq * math.sin(phi1) ** 2)
    t1 = math.tan(phi1) ** 2
    c1 = ecc_prime_sq * math.cos(phi1) ** 2
    r1 = a * (1 - ecc_sq) / (1 - ecc_sq * math.sin(phi1) ** 2) ** 1.5
    d = x / (n1 * k0)

    lat = phi1 - (
        n1 * math.tan(phi1) / r1
    ) * (
        d**2 / 2
        - (5 + 3*t1 + 10*c1 - 4*c1**2 - 9*ecc_prime_sq) * d**4 / 24
        + (
            61 + 90*t1 + 298*c1 + 45*t1**2
            - 252*ecc_prime_sq - 3*c1**2
        ) * d**6 / 720
    )

    lon = (
        d
        - (1 + 2*t1 + c1) * d**3 / 6
        + (
            5 - 2*c1 + 28*t1 - 3*c1**2
            + 8*ecc_prime_sq + 24*t1**2
        ) * d**5 / 120
    ) / math.cos(phi1)

    return math.degrees(lat), lon_origin + math.degrees(lon)


def pixel_bounds_utm(row, col, bbox, res):
    minx, miny, maxx, maxy = bbox
    left = minx + col * res
    right = left + res
    top = maxy - row * res
    bottom = top - res
    return left, bottom, right, top


def pixel_polygon_wgs84(row, col, bbox, res):
    left, bottom, right, top = pixel_bounds_utm(row, col, bbox, res)
    utm = [
        (left, bottom),
        (right, bottom),
        (right, top),
        (left, top),
        (left, bottom),
    ]
    coords = []
    for x, y in utm:
        lat, lon = utm34n_to_wgs84(x, y)
        coords.append([round(lon, 8), round(lat, 8)])
    return coords


def pixel_center_wgs84(row, col, bbox, res):
    left, bottom, right, top = pixel_bounds_utm(row, col, bbox, res)
    lat, lon = utm34n_to_wgs84((left + right) / 2, (bottom + top) / 2)
    return round(lat, 8), round(lon, 8)


def matches(pixel, criteria):
    ph = pixel.get("phenology_inputs") or {}
    return all(ph.get(k) == v for k, v in criteria.items())


def classify_pattern(pixel):
    if pixel.get("agronomic_validation_status") != "AGRONOMIC_CONFLICT":
        return None
    for name, criteria in PATTERNS.items():
        if matches(pixel, criteria):
            return name
    return None


def bbox_polygon(rows, cols, bbox, res):
    rmin, rmax = min(rows), max(rows)
    cmin, cmax = min(cols), max(cols)

    minx, miny, maxx, maxy = bbox
    left = minx + cmin * res
    right = minx + (cmax + 1) * res
    top = maxy - rmin * res
    bottom = maxy - (rmax + 1) * res

    coords = []
    for x, y in [
        (left, bottom),
        (right, bottom),
        (right, top),
        (left, top),
        (left, bottom),
    ]:
        lat, lon = utm34n_to_wgs84(x, y)
        coords.append([round(lon, 8), round(lat, 8)])

    return coords, {
        "row_min": rmin,
        "row_max": rmax,
        "column_min": cmin,
        "column_max": cmax,
    }


def main():
    with V07.open(encoding="utf-8") as f:
        v07 = json.load(f)
    with RAW.open(encoding="utf-8") as f:
        raw = json.load(f)

    if raw["crs"] != "EPSG:32634":
        raise ValueError(f"Unexpected CRS: {raw['crs']}")

    bbox = raw["bbox"]
    res = raw["resolution_m"]
    width = raw["width_pixels"]
    height = raw["height_pixels"]

    if (width, height, res) != (200, 200, 10):
        raise ValueError(
            f"Unexpected geometry: {width}x{height}, resolution={res}"
        )

    pixels = v07["samples"][SAMPLE_ID]["pixels"]

    # One v0.7 record per target-crop pixel is expected.
    coord_seen = set()
    crop_counts = Counter()
    pattern_counts = Counter()
    pattern_crop_counts = {}
    features = []

    for p in pixels:
        row = int(p["row"])
        col = int(p["column"])
        cty = int(p["cty"])

        if cty not in TARGET_CROPS:
            continue
        if not (0 <= row < height and 0 <= col < width):
            raise ValueError(f"Out-of-range pixel: row={row}, col={col}")

        key = (row, col)
        if key in coord_seen:
            raise ValueError(f"Duplicate target pixel coordinate: {key}")
        coord_seen.add(key)

        crop = TARGET_CROPS[cty]
        crop_counts[crop] += 1
        pattern = classify_pattern(p)

        if pattern:
            pattern_counts[pattern] += 1
            pattern_crop_counts.setdefault(pattern, Counter())[crop] += 1

        ph = p.get("phenology_inputs") or {}
        lat, lon = pixel_center_wgs84(row, col, bbox, res)

        # Crop layer: actual 10 m raster-cell polygon.
        features.append({
            "type": "Feature",
            "properties": {
                "layer": "CTY_CROP",
                "sample": SAMPLE_ID,
                "row": row,
                "column": col,
                "cty": cty,
                "crop": crop,
                "pattern": pattern,
                "agronomic_validation_status":
                    p.get("agronomic_validation_status"),
                "final_classification": p.get("final_classification"),
                "emergence_date": ph.get("emergence_date"),
                "emergence_uncertainty_days":
                    ph.get("emergence_uncertainty_days"),
                "duration_days": ph.get("duration_days"),
                "harvest_date": ph.get("harvest_date"),
                "center_latitude": lat,
                "center_longitude": lon,
            },
            "geometry": {
                "type": "Polygon",
                "coordinates": [
                    pixel_polygon_wgs84(row, col, bbox, res)
                ],
            },
        })

    # Add pattern bounding polygons last so they remain selectable.
    for pattern_name in PATTERNS:
        selected = [
            p for p in pixels
            if int(p["cty"]) in TARGET_CROPS
            and classify_pattern(p) == pattern_name
        ]
        if not selected:
            continue

        rows = [int(p["row"]) for p in selected]
        cols = [int(p["column"]) for p in selected]
        coords, rc_bbox = bbox_polygon(rows, cols, bbox, res)

        features.append({
            "type": "Feature",
            "properties": {
                "layer": "PATTERN_BBOX",
                "pattern": pattern_name,
                "pixels": len(selected),
                **rc_bbox,
            },
            "geometry": {
                "type": "Polygon",
                "coordinates": [coords],
            },
        })

    expected_target = 20991
    expected_primary = 6115
    expected_second = 1156

    integrity = {
        "target_crop_pixels": len(coord_seen),
        "expected_target_crop_pixels": expected_target,
        "target_pass": len(coord_seen) == expected_target,
        "primary_pixels": pattern_counts["PRIMARY_FULL_PATTERN"],
        "expected_primary_pixels": expected_primary,
        "primary_pass":
            pattern_counts["PRIMARY_FULL_PATTERN"] == expected_primary,
        "second_pixels": pattern_counts["SECOND_DATE_UNCERTAINTY"],
        "expected_second_pixels": expected_second,
        "second_pass":
            pattern_counts["SECOND_DATE_UNCERTAINTY"] == expected_second,
    }
    integrity["pass"] = all([
        integrity["target_pass"],
        integrity["primary_pass"],
        integrity["second_pass"],
    ])

    geojson = {
        "type": "FeatureCollection",
        "name": "LT_2023_S03_CTY_x_dominant_event_overlay",
        "metadata": {
            "diagnostic_only": True,
            "classifier_v07_status": "FROZEN",
            "crs_source": raw["crs"],
            "output_crs": "EPSG:4326",
            "resolution_m": res,
            "integrity": integrity,
            "crop_counts": dict(crop_counts),
            "pattern_counts": dict(pattern_counts),
            "pattern_crop_counts": {
                k: dict(v) for k, v in pattern_crop_counts.items()
            },
            "interpretation_guardrail": (
                "Coincidence of an event pattern across multiple CTY classes "
                "is diagnostic evidence only; it does not by itself prove "
                "a CLMS processing artifact."
            ),
        },
        "features": features,
    }

    stamp = datetime.now().strftime("%Y-%m-%d")
    out_geojson = DATA / (
        f"LT_VALIDATION_S03_CTY_x_dominant_event_overlay_v01_2023_{stamp}.geojson"
    )
    out_json = DATA / (
        f"LT_VALIDATION_S03_CTY_x_dominant_event_overlay_v01_2023_{stamp}.json"
    )

    text = json.dumps(geojson, ensure_ascii=False, separators=(",", ":"))
    out_geojson.write_text(text, encoding="utf-8")
    out_json.write_text(text, encoding="utf-8")

    print("=" * 108)
    print("LT 2023 S03 CTY x DOMINANT-EVENT OVERLAY")
    print("v0.7 remains FROZEN")
    print("=" * 108)
    print(f"Integrity PASS: {integrity['pass']}")
    print(
        f"Target crop pixels: {integrity['target_crop_pixels']:,} "
        f"(expected {expected_target:,})"
    )
    print("Crop counts:")
    for crop, count in crop_counts.most_common():
        print(f"  {crop:<16} {count:>6,} px  ({count/100:.2f} ha)")

    print("\nDominant event patterns:")
    for name in PATTERNS:
        count = pattern_counts[name]
        print(f"  {name}: {count:,} px ({count/100:.2f} ha)")
        print(
            "    crops:",
            dict(pattern_crop_counts.get(name, Counter()))
        )

    print("\nGeoJSON layer logic:")
    print("  layer=CTY_CROP     -> every target-crop 10 m pixel polygon")
    print("  pattern=<name>     -> crop pixel belongs to dominant event pattern")
    print("  layer=PATTERN_BBOX -> diagnostic bounding rectangle")
    print("\nSaved:")
    print(f"  {out_geojson}")
    print(f"  {out_json}")
    print("=" * 108)


if __name__ == "__main__":
    main()
