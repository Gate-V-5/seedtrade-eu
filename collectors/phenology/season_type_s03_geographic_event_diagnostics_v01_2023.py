#!/usr/bin/env python3
"""
SeedTrade.eu — LT 2023 S03 geographic event-pattern diagnostics v0.1

Converts v0.7 S03 raster row/column positions to EPSG:32634 and WGS84
coordinates using the authoritative metadata stored in the raw S03
Pixel Intelligence JSON.

Outputs:
- JSON diagnostic
- CSV with every S03 conflict pixel and its coordinates
- GeoJSON with dominant-pattern pixels and bounding polygons

Diagnostic only. Frozen v0.7 is NOT modified.
"""

import csv
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


def utm33_to_wgs84(easting, northing):
    # EPSG:32634 = WGS84 / UTM zone 34N.
    # Pure-standard-library inverse UTM implementation.
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


def pixel_center(row, col, bbox, resolution):
    minx, miny, maxx, maxy = bbox
    x = minx + (col + 0.5) * resolution
    y = maxy - (row + 0.5) * resolution
    return x, y


def pixel_matches(pixel, criteria):
    ph = pixel.get("phenology_inputs") or {}
    return all(ph.get(k) == v for k, v in criteria.items())


def polygon_from_rc_bbox(row_min, row_max, col_min, col_max, bbox, res):
    minx, miny, maxx, maxy = bbox

    left = minx + col_min * res
    right = minx + (col_max + 1) * res
    top = maxy - row_min * res
    bottom = maxy - (row_max + 1) * res

    corners_utm = [
        (left, bottom),
        (right, bottom),
        (right, top),
        (left, top),
        (left, bottom),
    ]

    coords = []
    for x, y in corners_utm:
        lat, lon = utm33_to_wgs84(x, y)
        coords.append([lon, lat])

    return coords


def main():
    if not V07.exists():
        raise FileNotFoundError(V07)
    if not RAW.exists():
        raise FileNotFoundError(RAW)

    with V07.open(encoding="utf-8") as f:
        v07 = json.load(f)
    with RAW.open(encoding="utf-8") as f:
        raw = json.load(f)

    crs = raw["crs"]
    bbox = raw["bbox"]
    res = raw["resolution_m"]
    width = raw["width_pixels"]
    height = raw["height_pixels"]
    center = raw["sample_center"]

    if crs != "EPSG:32634":
        raise ValueError(f"Expected EPSG:32634, got {crs}")
    if width != 200 or height != 200 or res != 10:
        raise ValueError(
            f"Unexpected raster geometry: {width}x{height}, {res} m"
        )

    sample = v07["samples"][SAMPLE_ID]
    conflicts = [
        p for p in sample["pixels"]
        if p.get("agronomic_validation_status") == "AGRONOMIC_CONFLICT"
    ]

    if len(conflicts) != 9049:
        raise ValueError(f"Expected 9049 S03 conflicts, got {len(conflicts)}")

    enriched = []
    for p in conflicts:
        row = p["row"]
        col = p["column"]

        if not (0 <= row < height and 0 <= col < width):
            raise ValueError(f"Pixel outside raster: row={row}, col={col}")

        x, y = pixel_center(row, col, bbox, res)
        lat, lon = utm33_to_wgs84(x, y)
        ph = p.get("phenology_inputs") or {}

        pattern = "OTHER_CONFLICT"
        for name, criteria in PATTERNS.items():
            if pixel_matches(p, criteria):
                pattern = name
                break

        enriched.append({
            "row": row,
            "column": col,
            "crop": p.get("crop") or f"CTY_{p.get('cty')}",
            "pattern": pattern,
            "emergence_date": ph.get("emergence_date"),
            "emergence_uncertainty_days": ph.get(
                "emergence_uncertainty_days"
            ),
            "duration_days": ph.get("duration_days"),
            "harvest_date": ph.get("harvest_date"),
            "utm_easting": round(x, 3),
            "utm_northing": round(y, 3),
            "latitude": round(lat, 7),
            "longitude": round(lon, 7),
        })

    pattern_summary = {}
    geojson_features = []

    for name, criteria in PATTERNS.items():
        rows = [r for r in enriched if r["pattern"] == name]
        if not rows:
            continue

        rmin = min(r["row"] for r in rows)
        rmax = max(r["row"] for r in rows)
        cmin = min(r["column"] for r in rows)
        cmax = max(r["column"] for r in rows)

        lats = [r["latitude"] for r in rows]
        lons = [r["longitude"] for r in rows]

        summary = {
            "criteria": criteria,
            "pixels": len(rows),
            "crop_counts": dict(Counter(r["crop"] for r in rows)),
            "row_column_bbox": {
                "row_min": rmin,
                "row_max": rmax,
                "column_min": cmin,
                "column_max": cmax,
            },
            "wgs84_pixel_center_extent": {
                "latitude_min": min(lats),
                "latitude_max": max(lats),
                "longitude_min": min(lons),
                "longitude_max": max(lons),
            },
            "mean_center": {
                "latitude": round(sum(lats) / len(lats), 7),
                "longitude": round(sum(lons) / len(lons), 7),
            },
        }
        pattern_summary[name] = summary

        geojson_features.append({
            "type": "Feature",
            "properties": {
                "name": name,
                "pixels": len(rows),
                "type": "bounding_polygon",
            },
            "geometry": {
                "type": "Polygon",
                "coordinates": [[
                    *polygon_from_rc_bbox(
                        rmin, rmax, cmin, cmax, bbox, res
                    )
                ]],
            },
        })

        for r in rows:
            geojson_features.append({
                "type": "Feature",
                "properties": {
                    "name": name,
                    "row": r["row"],
                    "column": r["column"],
                    "crop": r["crop"],
                    "emergence_date": r["emergence_date"],
                    "emergence_uncertainty_days":
                        r["emergence_uncertainty_days"],
                    "duration_days": r["duration_days"],
                    "harvest_date": r["harvest_date"],
                },
                "geometry": {
                    "type": "Point",
                    "coordinates": [r["longitude"], r["latitude"]],
                },
            })

    stamp = datetime.now().strftime("%Y-%m-%d")

    csv_path = DATA / (
        f"LT_VALIDATION_S03_geographic_conflict_pixels_v01_2023_{stamp}.csv"
    )
    json_path = DATA / (
        f"LT_VALIDATION_S03_geographic_event_diagnostics_v01_2023_{stamp}.json"
    )
    geojson_path = DATA / (
        f"LT_VALIDATION_S03_dominant_patterns_v01_2023_{stamp}.geojson"
    )

    with csv_path.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=list(enriched[0].keys()))
        writer.writeheader()
        writer.writerows(enriched)

    diagnostic = {
        "dataset": "SeedTrade.eu LT 2023 S03 geographic event diagnostics",
        "version": "0.1",
        "diagnostic_only": True,
        "classifier_v07_status": "FROZEN",
        "source_v07": str(V07),
        "source_raw": str(RAW),
        "georeferencing": {
            "crs": crs,
            "bbox": bbox,
            "resolution_m": res,
            "width_pixels": width,
            "height_pixels": height,
            "sample_center": center,
            "row_column_convention": (
                "row 0 begins at north/top; column 0 begins at west/left; "
                "coordinates represent pixel centers"
            ),
        },
        "integrity": {
            "conflict_pixels": len(enriched),
            "expected_conflict_pixels": 9049,
            "pass": len(enriched) == 9049,
        },
        "patterns": pattern_summary,
        "scientific_note": [
            "Coordinates are derived from the raw S03 EPSG:32634 bbox and 10 m raster geometry.",
            "GeoJSON uses WGS84 longitude/latitude.",
            "Bounding polygons describe raster extents, not agricultural field boundaries.",
            "Spatial concentration does not by itself prove a CLMS processing artifact.",
            "No v0.7 classification rules are modified."
        ],
        "generated_at": datetime.now().astimezone().isoformat(timespec="seconds"),
    }

    with json_path.open("w", encoding="utf-8") as f:
        json.dump(diagnostic, f, indent=2, ensure_ascii=False)

    geojson = {
        "type": "FeatureCollection",
        "name": "LT_2023_S03_dominant_CLMS_event_patterns",
        "features": geojson_features,
    }
    with geojson_path.open("w", encoding="utf-8") as f:
        json.dump(geojson, f, indent=2, ensure_ascii=False)

    print("=" * 108)
    print("LT 2023 S03 GEOGRAPHIC EVENT-PATTERN DIAGNOSTICS")
    print("v0.7 remains FROZEN")
    print("=" * 108)
    print(f"Integrity PASS: {len(enriched) == 9049}")
    print(f"CRS: {crs}")
    print(f"BBOX: {bbox}")
    print(f"Resolution: {res} m | Raster: {width} x {height}")
    print(
        f"Declared center: {center['latitude']}, {center['longitude']} | "
        f"UTM {center['utm_easting']}, {center['utm_northing']}"
    )

    for name, s in pattern_summary.items():
        print(f"\n{name}")
        print(f"  Pixels: {s['pixels']:,}")
        print(f"  Crops: {s['crop_counts']}")
        rc = s["row_column_bbox"]
        print(
            f"  Raster bbox: rows {rc['row_min']}-{rc['row_max']}, "
            f"cols {rc['column_min']}-{rc['column_max']}"
        )
        g = s["wgs84_pixel_center_extent"]
        print(
            f"  WGS84 extent: lat {g['latitude_min']:.7f} .. "
            f"{g['latitude_max']:.7f} | lon {g['longitude_min']:.7f} .. "
            f"{g['longitude_max']:.7f}"
        )
        m = s["mean_center"]
        print(
            f"  Mean pixel center: {m['latitude']:.7f}, "
            f"{m['longitude']:.7f}"
        )

    print("\nSaved:")
    print(f"  JSON:    {json_path}")
    print(f"  CSV:     {csv_path}")
    print(f"  GeoJSON: {geojson_path}")
    print("=" * 108)


if __name__ == "__main__":
    main()
