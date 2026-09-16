#!/usr/bin/env python3
"""
SeedTrade.eu — LT 2023 S03 spatial event-pattern diagnostics v0.1

Purpose
-------
Test whether dominant S03 AGRONOMIC_CONFLICT phenology patterns form
spatially contiguous pixel clusters.

Primary pattern:
  emergence_date = 2023-03-28
  emergence_uncertainty_days = 17
  duration_days = 119
  harvest_date = 2023-07-25

Also diagnoses all conflict pixels and the second main date/uncertainty pattern.

Connectivity
------------
4-neighbour: up/down/left/right
8-neighbour: includes diagonals

Diagnostic only. Frozen v0.7 is NOT modified.
"""

import json
from collections import Counter, deque
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / "data" / "raw" / "copernicus"

INPUT = DATA / (
    "LT_VALIDATION_season_type_classifier_v07_hybrid_multiyear_validation_"
    "2023_5samples_2000ha_2026-09-07.json"
)

SAMPLE_ID = "S03"

PATTERNS = {
    "PRIMARY_FULL_PATTERN": {
        "emergence_date": "2023-03-28",
        "emergence_uncertainty_days": 17,
        "duration_days": 119,
        "harvest_date": "2023-07-25",
    },
    "PRIMARY_DATE_UNCERTAINTY": {
        "emergence_date": "2023-03-28",
        "emergence_uncertainty_days": 17,
    },
    "SECOND_DATE_UNCERTAINTY": {
        "emergence_date": "2023-03-31",
        "emergence_uncertainty_days": 19,
    },
}

TOP_COMPONENTS = 20


def pct(n, d):
    return round(100.0 * n / d, 2) if d else 0.0


def pixel_matches(pixel, criteria):
    ph = pixel.get("phenology_inputs") or {}
    source = {
        "emergence_date": ph.get("emergence_date"),
        "emergence_uncertainty_days": ph.get("emergence_uncertainty_days"),
        "duration_days": ph.get("duration_days"),
        "harvest_date": ph.get("harvest_date"),
    }
    return all(source.get(k) == v for k, v in criteria.items())


def components(coords, connectivity=4):
    coords = set(coords)
    unseen = set(coords)

    if connectivity == 4:
        offsets = ((1,0),(-1,0),(0,1),(0,-1))
    elif connectivity == 8:
        offsets = (
            (1,0),(-1,0),(0,1),(0,-1),
            (1,1),(1,-1),(-1,1),(-1,-1)
        )
    else:
        raise ValueError("connectivity must be 4 or 8")

    result = []

    while unseen:
        start = unseen.pop()
        q = deque([start])
        comp = [start]

        while q:
            r, c = q.popleft()
            for dr, dc in offsets:
                nxt = (r + dr, c + dc)
                if nxt in unseen:
                    unseen.remove(nxt)
                    q.append(nxt)
                    comp.append(nxt)

        result.append(comp)

    result.sort(key=len, reverse=True)
    return result


def component_summary(comp, total_selected):
    rows = [x[0] for x in comp]
    cols = [x[1] for x in comp]

    height = max(rows) - min(rows) + 1
    width = max(cols) - min(cols) + 1
    bbox_pixels = height * width

    return {
        "pixels": len(comp),
        "percent_of_selected": pct(len(comp), total_selected),
        "bbox": {
            "row_min": min(rows),
            "row_max": max(rows),
            "column_min": min(cols),
            "column_max": max(cols),
            "height_pixels": height,
            "width_pixels": width,
            "bbox_pixels": bbox_pixels,
        },
        "bbox_fill_percent": pct(len(comp), bbox_pixels),
    }


def diagnose(coords):
    total = len(coords)
    output = {"selected_pixels": total}

    for conn in (4, 8):
        comps = components(coords, conn)
        sizes = [len(c) for c in comps]

        output[f"connectivity_{conn}"] = {
            "component_count": len(comps),
            "largest_component_pixels": sizes[0] if sizes else 0,
            "largest_component_percent": pct(sizes[0], total) if sizes else 0.0,
            "components_ge_10px": sum(1 for x in sizes if x >= 10),
            "components_ge_100px": sum(1 for x in sizes if x >= 100),
            "components_ge_1000px": sum(1 for x in sizes if x >= 1000),
            "top_components": [
                component_summary(c, total)
                for c in comps[:TOP_COMPONENTS]
            ],
        }

    return output


def main():
    if not INPUT.exists():
        raise FileNotFoundError(INPUT)

    with INPUT.open(encoding="utf-8") as f:
        data = json.load(f)

    samples = data.get("samples")
    if not isinstance(samples, dict) or SAMPLE_ID not in samples:
        raise ValueError(f"{SAMPLE_ID} not found in source samples")

    pixels = samples[SAMPLE_ID].get("pixels", [])

    conflict_pixels = [
        p for p in pixels
        if p.get("agronomic_validation_status") == "AGRONOMIC_CONFLICT"
    ]

    all_conflict_coords = {
        (p["row"], p["column"])
        for p in conflict_pixels
        if p.get("row") is not None and p.get("column") is not None
    }

    pattern_results = {}

    for name, criteria in PATTERNS.items():
        selected = [
            p for p in conflict_pixels
            if pixel_matches(p, criteria)
        ]

        coords = {
            (p["row"], p["column"])
            for p in selected
            if p.get("row") is not None and p.get("column") is not None
        }

        crops = Counter(
            p.get("crop") or f"CTY_{p.get('cty')}"
            for p in selected
        )

        pattern_results[name] = {
            "criteria": criteria,
            "matching_conflict_pixels": len(selected),
            "percent_of_all_s03_conflicts": pct(
                len(selected), len(conflict_pixels)
            ),
            "crop_counts": dict(crops),
            "spatial": diagnose(coords),
        }

    output = {
        "dataset": "SeedTrade.eu LT 2023 S03 spatial event-pattern diagnostics",
        "version": "0.1",
        "reference_year": 2023,
        "sample_id": SAMPLE_ID,
        "diagnostic_only": True,
        "classifier_v07_status": "FROZEN",
        "source_file": str(INPUT),
        "integrity": {
            "all_s03_conflict_pixels": len(conflict_pixels),
            "expected_s03_conflict_pixels": 9049,
            "conflict_count_matches": len(conflict_pixels) == 9049,
            "conflict_pixels_with_coordinates": len(all_conflict_coords),
            "pass": (
                len(conflict_pixels) == 9049
                and len(all_conflict_coords) == len(conflict_pixels)
            ),
        },
        "all_conflicts_spatial": diagnose(all_conflict_coords),
        "patterns": pattern_results,
        "scientific_note": [
            "Spatial contiguity is measured in raster row/column space.",
            "4-neighbour and 8-neighbour connectivity are both reported.",
            "Large contiguous components support spatial concentration but do not by themselves prove a CLMS processing artifact.",
            "No v0.7 rules, thresholds, weights, calendars, or classifications are modified."
        ],
        "generated_at": datetime.now().astimezone().isoformat(timespec="seconds"),
    }

    outfile = DATA / (
        "LT_VALIDATION_S03_spatial_event_pattern_diagnostics_v01_"
        f"2023_{datetime.now():%Y-%m-%d}.json"
    )

    with outfile.open("w", encoding="utf-8") as f:
        json.dump(output, f, indent=2, ensure_ascii=False)

    print("=" * 108)
    print("LT 2023 S03 SPATIAL EVENT-PATTERN DIAGNOSTICS")
    print("v0.7 remains FROZEN")
    print("=" * 108)
    print(f"Integrity PASS: {output['integrity']['pass']}")
    print(
        f"S03 conflicts: {len(conflict_pixels):,} / "
        f"expected 9,049"
    )

    print("\nALL S03 CONFLICTS")
    for conn in (4, 8):
        x = output["all_conflicts_spatial"][f"connectivity_{conn}"]
        print(
            f"  {conn}-neighbour | components {x['component_count']:,} | "
            f"largest {x['largest_component_pixels']:,} px "
            f"({x['largest_component_percent']:.2f}%) | "
            f">=100px {x['components_ge_100px']} | "
            f">=1000px {x['components_ge_1000px']}"
        )

    for name, result in pattern_results.items():
        print(f"\n{name}")
        print(f"  Criteria: {result['criteria']}")
        print(
            f"  Matching conflicts: {result['matching_conflict_pixels']:,} "
            f"({result['percent_of_all_s03_conflicts']:.2f}% of S03 conflicts)"
        )
        print(f"  Crops: {result['crop_counts']}")

        for conn in (4, 8):
            x = result["spatial"][f"connectivity_{conn}"]
            print(
                f"  {conn}-neighbour | components {x['component_count']:,} | "
                f"largest {x['largest_component_pixels']:,} px "
                f"({x['largest_component_percent']:.2f}%) | "
                f">=100px {x['components_ge_100px']} | "
                f">=1000px {x['components_ge_1000px']}"
            )

            if x["top_components"]:
                top = x["top_components"][0]
                b = top["bbox"]
                print(
                    f"    Largest bbox: rows {b['row_min']}-{b['row_max']}, "
                    f"cols {b['column_min']}-{b['column_max']} | "
                    f"{b['height_pixels']}x{b['width_pixels']} px | "
                    f"bbox fill {top['bbox_fill_percent']:.2f}%"
                )

    print()
    print(f"Saved: {outfile}")
    print("=" * 108)


if __name__ == "__main__":
    main()
