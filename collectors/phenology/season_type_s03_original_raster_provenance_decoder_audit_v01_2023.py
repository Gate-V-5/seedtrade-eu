#!/usr/bin/env python3
"""
SeedTrade.eu — LT 2023 S03 original-raster provenance / decoder audit v0.1

Purpose
-------
Trace the 6,115-pixel PRIMARY block one step below Pixel Intelligence.

This script DOES NOT download anything and DOES NOT modify v0.7.
It:
1) finds the 2023 S03 raw Pixel Intelligence JSON;
2) discovers provenance / source / raster / TIFF references recursively;
3) searches local data/raw/copernicus for likely S03 2023 raster files;
4) if TIFFs exist, inspects their shape/dtype/value frequencies;
5) tests whether expected PRIMARY raw values form 6,115-pixel masks:
   CPMCE   -> 23087
   CPMCECL -> 17
   CPMCD   -> 119
   CPMCH   -> 23206
   CPMCHCL -> 29
   CPCSY   -> 2
6) compares candidate raster masks with the exact PRIMARY coordinates
   from frozen v0.7.

Diagnostic only. v0.7 remains FROZEN.
"""

import json
import re
from collections import Counter, deque
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

PRIMARY = {
    "emergence_date": "2023-03-28",
    "emergence_uncertainty_days": 17,
    "duration_days": 119,
    "harvest_date": "2023-07-25",
}

EXPECTED = {
    "CPMCE": 23087,
    "CPMCECL": 17,
    "CPMCD": 119,
    "CPMCH": 23206,
    "CPMCHCL": 29,
    "CPCSY": 2,
}

TOKENS = tuple(EXPECTED) + ("CTY",)


def flatten(obj, prefix=""):
    out = {}
    if isinstance(obj, dict):
        for k, v in obj.items():
            p = f"{prefix}.{k}" if prefix else str(k)
            out.update(flatten(v, p))
    elif isinstance(obj, list):
        if len(obj) <= 100:
            for i, v in enumerate(obj):
                out.update(flatten(v, f"{prefix}[{i}]"))
    else:
        out[prefix] = obj
    return out


def primary_coords():
    d = json.loads(V07.read_text(encoding="utf-8"))
    pixels = d["samples"]["S03"]["pixels"]
    coords = set()
    for p in pixels:
        if p.get("agronomic_validation_status") != "AGRONOMIC_CONFLICT":
            continue
        ph = p.get("phenology_inputs") or {}
        if all(ph.get(k) == v for k, v in PRIMARY.items()):
            coords.add((int(p["row"]), int(p["column"])))
    return coords


def discover_json_provenance():
    d = json.loads(RAW.read_text(encoding="utf-8"))
    flat = flatten(d)
    interesting = {}
    words = (
        "source", "file", "path", "tif", "tiff", "raster", "layer",
        "collection", "evalscript", "request", "bbox", "crs",
        "resolution", "width", "height"
    )
    for k, v in flat.items():
        low = k.lower()
        sval = str(v)
        if any(w in low for w in words) or any(t in sval.upper() for t in TOKENS):
            interesting[k] = v
    return interesting


def candidate_files():
    exts = {".tif", ".tiff", ".npy", ".npz"}
    files = []
    for p in DATA.rglob("*"):
        if not p.is_file() or p.suffix.lower() not in exts:
            continue
        s = str(p).upper()
        score = 0
        if "2023" in s:
            score += 2
        if "S03" in s:
            score += 4
        if "LT_VALIDATION" in s:
            score += 2
        token = next((t for t in TOKENS if t in p.name.upper()), None)
        if token:
            score += 5
        files.append((score, token, p))
    return sorted(files, key=lambda x: (-x[0], str(x[2])))


def connected_stats(coords):
    remaining = set(coords)
    comps = []
    while remaining:
        start = remaining.pop()
        q = deque([start])
        n = 1
        while q:
            r, c = q.popleft()
            for z in ((r-1,c),(r+1,c),(r,c-1),(r,c+1)):
                if z in remaining:
                    remaining.remove(z)
                    q.append(z)
                    n += 1
        comps.append(n)
    comps.sort(reverse=True)
    return {
        "components": len(comps),
        "largest": comps[0] if comps else 0,
    }


def overlap(a, b):
    inter = a & b
    union = a | b
    return {
        "intersection": len(inter),
        "jaccard_percent": round(100 * len(inter) / len(union), 2) if union else 0,
        "primary_covered_percent": round(100 * len(inter) / len(a), 2) if a else 0,
        "candidate_in_primary_percent": round(100 * len(inter) / len(b), 2) if b else 0,
    }


def inspect_tiff(path, primary):
    try:
        import tifffile
    except Exception as e:
        return {"error": f"tifffile unavailable: {e}"}

    try:
        arr = tifffile.imread(path)
    except Exception as e:
        return {"error": f"read failed: {e}"}

    shape = tuple(int(x) for x in arr.shape)
    result = {
        "shape": shape,
        "dtype": str(arr.dtype),
    }

    # Accept a direct 200x200 layer or a singleton-band equivalent.
    while getattr(arr, "ndim", 0) > 2 and 1 in arr.shape:
        import numpy as np
        arr = np.squeeze(arr)

    if getattr(arr, "ndim", 0) != 2 or tuple(arr.shape) != (200, 200):
        result["mask_test"] = "SKIPPED_NOT_200x200_SINGLE_LAYER"
        return result

    token = next((t for t in TOKENS if t in path.name.upper()), None)
    result["detected_token"] = token

    vals = arr.ravel().tolist()
    result["top_values"] = [
        {"value": k.item() if hasattr(k, "item") else k, "count": v}
        for k, v in Counter(vals).most_common(12)
    ]

    if token not in EXPECTED:
        result["mask_test"] = "NO_EXPECTED_VALUE_FOR_FILENAME_TOKEN"
        return result

    expected = EXPECTED[token]
    coords = set()
    rows, cols = (arr == expected).nonzero()
    for r, c in zip(rows.tolist(), cols.tolist()):
        coords.add((int(r), int(c)))

    result["expected_value"] = expected
    result["matching_pixels"] = len(coords)
    result["spatial"] = connected_stats(coords)
    result["vs_primary"] = overlap(primary, coords)
    return result


def main():
    primary = primary_coords()
    provenance = discover_json_provenance()
    candidates = candidate_files()

    integrity = {
        "primary_expected": 6115,
        "primary_actual": len(primary),
        "v07_exists": V07.exists(),
        "raw_json_exists": RAW.exists(),
    }
    integrity["pass"] = (
        integrity["primary_actual"] == integrity["primary_expected"]
        and integrity["v07_exists"]
        and integrity["raw_json_exists"]
    )

    inspected = []
    for score, token, path in candidates:
        item = {
            "score": score,
            "filename_token": token,
            "path": str(path),
            "suffix": path.suffix.lower(),
        }
        if path.suffix.lower() in {".tif", ".tiff"}:
            item["inspection"] = inspect_tiff(path, primary)
        else:
            item["inspection"] = {"status": "DISCOVERED_NOT_TIFF"}
        inspected.append(item)

    output = {
        "dataset": "LT_VALIDATION_S03_original_raster_provenance_decoder_audit",
        "version": "0.1",
        "diagnostic_only": True,
        "classifier_v07_status": "FROZEN_UNCHANGED",
        "integrity": integrity,
        "expected_primary_raw_values": EXPECTED,
        "raw_json_provenance_fields": provenance,
        "candidate_local_rasters": inspected,
        "generated_at": datetime.now().isoformat(timespec="seconds"),
    }

    stamp = datetime.now().strftime("%Y-%m-%d")
    out = DATA / (
        f"LT_VALIDATION_S03_original_raster_provenance_decoder_audit_v01_"
        f"2023_{stamp}.json"
    )
    out.write_text(json.dumps(output, indent=2, ensure_ascii=False), encoding="utf-8")

    print("=" * 118)
    print("LT 2023 S03 ORIGINAL-RASTER PROVENANCE / DECODER AUDIT v0.1")
    print("No downloads | no classifier changes | v0.7 remains FROZEN")
    print("=" * 118)
    print(f"Integrity PASS: {integrity['pass']}")
    print(f"PRIMARY coordinates: {len(primary):,} (expected 6,115)")
    print()

    print("RAW JSON PROVENANCE / REQUEST FIELDS")
    if not provenance:
        print("  NONE FOUND")
    else:
        for k, v in list(provenance.items())[:80]:
            text = str(v)
            if len(text) > 220:
                text = text[:217] + "..."
            print(f"  {k}: {text}")
    print()

    print("LOCAL ORIGINAL-RASTER CANDIDATES")
    print(f"  Found: {len(candidates)}")
    if not candidates:
        print("  NO local .tif/.tiff/.npy/.npz candidates found under data/raw/copernicus")
    else:
        for item in inspected[:50]:
            print(f"  [{item['score']:02d}] {item['path']}")
            ins = item["inspection"]
            if "error" in ins:
                print(f"       ERROR: {ins['error']}")
                continue
            if "shape" in ins:
                print(f"       shape={ins['shape']} dtype={ins['dtype']} token={ins.get('detected_token')}")
                if "expected_value" in ins:
                    ov = ins["vs_primary"]
                    sp = ins["spatial"]
                    print(
                        f"       expected={ins['expected_value']} | matches={ins['matching_pixels']:,} | "
                        f"components={sp['components']} largest={sp['largest']:,}"
                    )
                    print(
                        f"       PRIMARY overlap={ov['intersection']:,} | "
                        f"PRIMARY covered={ov['primary_covered_percent']:.2f}% | "
                        f"candidate in PRIMARY={ov['candidate_in_primary_percent']:.2f}% | "
                        f"Jaccard={ov['jaccard_percent']:.2f}%"
                    )
                else:
                    print(f"       {ins.get('mask_test')}")
    print()

    if not candidates:
        print("INTERPRETATION")
        print("  Original raster files are not present locally.")
        print("  Next step: audit the collector request/decoder code or add a diagnostic")
        print("  save of the unmodified Sentinel Hub TIFF responses before decoding.")
    else:
        print("INTERPRETATION")
        print("  For a direct provenance confirmation, look for a layer where:")
        print("  PRIMARY covered = 100.00% and the expected raw value matches the")
        print("  Pixel Intelligence raw value. This demonstrates the block exists")
        print("  in the saved original raster before JSON normalization.")

    print()
    print(f"Saved: {out}")
    print("=" * 118)


if __name__ == "__main__":
    main()
