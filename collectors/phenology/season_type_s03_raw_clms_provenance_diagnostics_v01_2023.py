#!/usr/bin/env python3
"""
SeedTrade.eu — LT 2023 S03 raw CLMS provenance diagnostics v0.1

Goal
----
Trace the 6,115-pixel PRIMARY event block back into the raw S03 Pixel
Intelligence data and identify which CLMS layer(s) carry the spatially
uniform signal.

Layers of interest:
- CPMCE
- CPMCECL
- CPMCD
- CPMCH
- CPMCHCL
- CPCSY
- CTY

Method
------
1. Load frozen v0.7 S03 pixels and identify PRIMARY_FULL_PATTERN coordinates.
2. Load raw 2023 S03 Pixel Intelligence pixels.
3. Join by (row, column).
4. Recursively inspect raw pixel fields and auto-detect leaf paths containing
   CLMS layer names.
5. For each detected layer/path, compare:
   - PRIMARY block
   - other AGRONOMIC_CONFLICT pixels
   - all other target-crop pixels
6. Report unique values, top values, dominant-value share, and whether PRIMARY
   is perfectly uniform for that raw field.

Diagnostic only. v0.7 is NOT modified.
"""

import json
from collections import Counter, defaultdict
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

TARGET_CTYS = {1110, 1120, 1150, 1430}

PRIMARY_CRITERIA = {
    "emergence_date": "2023-03-28",
    "emergence_uncertainty_days": 17,
    "duration_days": 119,
    "harvest_date": "2023-07-25",
}

LAYER_TOKENS = (
    "CTY",
    "CPMCE",
    "CPMCECL",
    "CPMCD",
    "CPMCDCL",
    "CPMCH",
    "CPMCHCL",
    "CPCSY",
)


def matches_primary(pixel):
    if pixel.get("agronomic_validation_status") != "AGRONOMIC_CONFLICT":
        return False
    ph = pixel.get("phenology_inputs") or {}
    return all(ph.get(k) == v for k, v in PRIMARY_CRITERIA.items())


def flatten_scalars(obj, prefix=""):
    """
    Recursively flatten dict/list scalar leaves into path -> value.
    Lists are indexed only when they are short and structured.
    """
    out = {}

    if isinstance(obj, dict):
        for k, v in obj.items():
            p = f"{prefix}.{k}" if prefix else str(k)
            out.update(flatten_scalars(v, p))
    elif isinstance(obj, list):
        if len(obj) <= 16:
            for i, v in enumerate(obj):
                p = f"{prefix}[{i}]"
                out.update(flatten_scalars(v, p))
    else:
        if obj is None or isinstance(obj, (str, int, float, bool)):
            out[prefix] = obj

    return out


def norm_value(v):
    if isinstance(v, float):
        return round(v, 8)
    return v


def top_counts(values, n=12):
    c = Counter(norm_value(v) for v in values)
    return [
        {"value": k, "count": v, "percent": round(100.0 * v / len(values), 2)}
        for k, v in c.most_common(n)
    ] if values else []


def summarize(values):
    if not values:
        return {
            "pixels_with_value": 0,
            "unique_values": 0,
            "dominant_value": None,
            "dominant_count": 0,
            "dominant_percent": 0.0,
            "uniform": False,
            "top_values": [],
        }

    c = Counter(norm_value(v) for v in values)
    dominant_value, dominant_count = c.most_common(1)[0]

    return {
        "pixels_with_value": len(values),
        "unique_values": len(c),
        "dominant_value": dominant_value,
        "dominant_count": dominant_count,
        "dominant_percent": round(100.0 * dominant_count / len(values), 2),
        "uniform": len(c) == 1,
        "top_values": top_counts(values),
    }


def detect_layer_paths(raw_pixels):
    paths = defaultdict(set)

    # A sample of up to 500 pixels is enough to discover schema paths.
    for p in raw_pixels[:500]:
        flat = flatten_scalars(p)
        for path in flat:
            upper = path.upper()
            for token in LAYER_TOKENS:
                if token in upper:
                    paths[token].add(path)

    return {k: sorted(v) for k, v in paths.items()}


def main():
    with V07.open(encoding="utf-8") as f:
        v07 = json.load(f)
    with RAW.open(encoding="utf-8") as f:
        raw = json.load(f)

    v07_pixels = v07["samples"]["S03"]["pixels"]
    raw_pixels = raw["pixels"]

    v07_by_coord = {
        (int(p["row"]), int(p["column"])): p
        for p in v07_pixels
    }

    raw_by_coord = {
        (int(p["row"]), int(p["column"])): p
        for p in raw_pixels
        if "row" in p and "column" in p
    }

    primary_coords = {
        coord for coord, p in v07_by_coord.items()
        if matches_primary(p)
    }

    conflict_coords = {
        coord for coord, p in v07_by_coord.items()
        if p.get("agronomic_validation_status") == "AGRONOMIC_CONFLICT"
    }

    target_coords = {
        coord for coord, p in v07_by_coord.items()
        if int(p.get("cty", -1)) in TARGET_CTYS
    }

    other_conflict_coords = conflict_coords - primary_coords
    other_target_coords = target_coords - conflict_coords

    joined_primary = primary_coords & raw_by_coord.keys()
    joined_other_conflicts = other_conflict_coords & raw_by_coord.keys()
    joined_other_target = other_target_coords & raw_by_coord.keys()

    detected = detect_layer_paths(raw_pixels)

    # Also keep all discovered scalar paths that look phenology-related,
    # even if they do not literally contain a layer code.
    phenology_keywords = (
        "emerg", "harvest", "duration", "confidence", "uncert",
        "season", "cpcsy", "cty"
    )

    extra_paths = set()
    for p in raw_pixels[:500]:
        for path in flatten_scalars(p):
            low = path.lower()
            if any(k in low for k in phenology_keywords):
                extra_paths.add(path)

    candidate_paths = set(extra_paths)
    for paths in detected.values():
        candidate_paths.update(paths)

    results = {}

    for path in sorted(candidate_paths):
        primary_vals = []
        other_conflict_vals = []
        other_target_vals = []

        for coord in joined_primary:
            flat = flatten_scalars(raw_by_coord[coord])
            if path in flat:
                primary_vals.append(flat[path])

        for coord in joined_other_conflicts:
            flat = flatten_scalars(raw_by_coord[coord])
            if path in flat:
                other_conflict_vals.append(flat[path])

        for coord in joined_other_target:
            flat = flatten_scalars(raw_by_coord[coord])
            if path in flat:
                other_target_vals.append(flat[path])

        # Keep only paths that actually contain data in PRIMARY or appear
        # directly relevant to a CLMS layer.
        if not primary_vals:
            continue

        upper = path.upper()
        direct_layer = next((t for t in LAYER_TOKENS if t in upper), None)

        results[path] = {
            "direct_layer_token": direct_layer,
            "primary": summarize(primary_vals),
            "other_conflicts": summarize(other_conflict_vals),
            "other_target_pixels": summarize(other_target_vals),
        }

    # Rank paths where PRIMARY is especially uniform.
    ranked_uniform = []
    for path, r in results.items():
        p = r["primary"]
        if p["pixels_with_value"] != len(joined_primary):
            continue
        ranked_uniform.append({
            "path": path,
            "layer": r["direct_layer_token"],
            "unique_primary_values": p["unique_values"],
            "dominant_value": p["dominant_value"],
            "dominant_percent": p["dominant_percent"],
            "other_conflict_unique_values": r["other_conflicts"]["unique_values"],
            "other_target_unique_values": r["other_target_pixels"]["unique_values"],
        })

    ranked_uniform.sort(
        key=lambda x: (
            x["unique_primary_values"],
            -x["dominant_percent"],
            x["path"]
        )
    )

    integrity = {
        "primary_expected": 6115,
        "primary_actual": len(primary_coords),
        "primary_joined_to_raw": len(joined_primary),
        "other_conflicts": len(other_conflict_coords),
        "other_target_pixels": len(other_target_coords),
        "raw_pixels": len(raw_pixels),
        "pass": (
            len(primary_coords) == 6115
            and len(joined_primary) == 6115
        ),
    }

    output = {
        "dataset": "LT_VALIDATION_S03_raw_CLMS_provenance_diagnostics",
        "version": "0.1",
        "diagnostic_only": True,
        "classifier_v07_status": "FROZEN_UNCHANGED",
        "source_v07": str(V07),
        "source_raw": str(RAW),
        "primary_criteria": PRIMARY_CRITERIA,
        "integrity": integrity,
        "detected_layer_paths": detected,
        "candidate_path_results": results,
        "ranked_primary_uniform_paths": ranked_uniform,
        "generated_at": datetime.now().isoformat(timespec="seconds"),
    }

    stamp = datetime.now().strftime("%Y-%m-%d")
    out = DATA / (
        f"LT_VALIDATION_S03_raw_CLMS_provenance_diagnostics_v01_"
        f"2023_{stamp}.json"
    )
    out.write_text(
        json.dumps(output, indent=2, ensure_ascii=False),
        encoding="utf-8"
    )

    print("=" * 116)
    print("LT 2023 S03 RAW CLMS PROVENANCE DIAGNOSTICS v0.1")
    print("PRIMARY event -> raw CLMS field tracing")
    print("v0.7 remains FROZEN")
    print("=" * 116)
    print(f"Integrity PASS: {integrity['pass']}")
    print(
        f"PRIMARY: {integrity['primary_actual']:,} | "
        f"joined to raw: {integrity['primary_joined_to_raw']:,}"
    )
    print(
        f"Other conflicts: {integrity['other_conflicts']:,} | "
        f"other target pixels: {integrity['other_target_pixels']:,}"
    )
    print()

    print("DETECTED RAW LAYER PATHS")
    for token in LAYER_TOKENS:
        paths = detected.get(token, [])
        print(f"  {token}: {len(paths)} path(s)")
        for p in paths[:12]:
            print(f"    {p}")
    print()

    print("PRIMARY-UNIFORM / MOST INFORMATIVE PATHS")
    shown = 0
    for x in ranked_uniform:
        if shown >= 30:
            break
        path = x["path"]
        r = results[path]
        p = r["primary"]

        # Prioritize direct CLMS layer paths and phenology fields.
        low = path.lower()
        if not (
            x["layer"]
            or any(k in low for k in (
                "emerg", "harvest", "duration",
                "confidence", "uncert", "season"
            ))
        ):
            continue

        print(
            f"  {path}"
            f" | layer={x['layer']}"
            f" | PRIMARY unique={p['unique_values']}"
            f" | dominant={p['dominant_value']}"
            f" ({p['dominant_percent']:.2f}%)"
        )
        print(
            f"    other conflicts: unique={r['other_conflicts']['unique_values']} "
            f"top={r['other_conflicts']['top_values'][:4]}"
        )
        print(
            f"    other target: unique={r['other_target_pixels']['unique_values']} "
            f"top={r['other_target_pixels']['top_values'][:4]}"
        )
        shown += 1

    print()
    print("PRIMARY EXACT RAW TOP VALUES FOR DIRECT CLMS PATHS")
    for token in LAYER_TOKENS:
        token_paths = [
            p for p in results
            if token in p.upper()
        ]
        if not token_paths:
            continue
        print(f"  {token}")
        for path in token_paths[:10]:
            r = results[path]
            print(
                f"    {path}: "
                f"PRIMARY unique={r['primary']['unique_values']} "
                f"top={r['primary']['top_values'][:5]}"
            )

    print()
    print(f"Saved: {out}")
    print("=" * 116)


if __name__ == "__main__":
    main()
