#!/usr/bin/env python3
"""
SeedTrade.eu — LT 2023 S03 8-band TIFF direct provenance audit v0.2

Directly audits the saved original 8-band TIFF:
LT_VALIDATION_multiyear_validation_pixel_intelligence_2023_S03_2km_400ha_test_2026-09-07.tif

Band order is taken from the recorded eight-layer workflow:
0 CTY
1 CPMCE
2 CPMCECL
3 CPMCD
4 CPMCDCL
5 CPMCH
6 CPMCHCL
7 CPCSY

The script compares TIFF band values at the exact frozen-v0.7 PRIMARY
6,115 coordinates against the expected Pixel Intelligence raw values.

Diagnostic only. No downloads. v0.7 remains FROZEN.
"""

import json
from collections import Counter, deque
from datetime import datetime
from pathlib import Path

import numpy as np
import tifffile

ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / "data" / "raw" / "copernicus"

TIFF = DATA / (
    "LT_VALIDATION_multiyear_validation_pixel_intelligence_"
    "2023_S03_2km_400ha_test_2026-09-07.tif"
)

V07 = DATA / (
    "LT_VALIDATION_season_type_classifier_v07_hybrid_multiyear_validation_"
    "2023_5samples_2000ha_2026-09-07.json"
)

BANDS = [
    "CTY",
    "CPMCE",
    "CPMCECL",
    "CPMCD",
    "CPMCDCL",
    "CPMCH",
    "CPMCHCL",
    "CPCSY",
]

EXPECTED = {
    "CPMCE": 23087,
    "CPMCECL": 17,
    "CPMCD": 119,
    "CPMCH": 23206,
    "CPMCHCL": 29,
    "CPCSY": 2,
}

PRIMARY_CRITERIA = {
    "emergence_date": "2023-03-28",
    "emergence_uncertainty_days": 17,
    "duration_days": 119,
    "harvest_date": "2023-07-25",
}


def get_primary():
    d = json.loads(V07.read_text(encoding="utf-8"))
    coords = set()
    cty = Counter()

    for p in d["samples"]["S03"]["pixels"]:
        if p.get("agronomic_validation_status") != "AGRONOMIC_CONFLICT":
            continue
        ph = p.get("phenology_inputs") or {}
        if all(ph.get(k) == v for k, v in PRIMARY_CRITERIA.items()):
            rc = (int(p["row"]), int(p["column"]))
            coords.add(rc)
            cty[int(p["cty"])] += 1

    return coords, cty


def components(coords):
    rem = set(coords)
    sizes = []
    while rem:
        s = rem.pop()
        q = deque([s])
        n = 1
        while q:
            r, c = q.popleft()
            for z in ((r-1,c),(r+1,c),(r,c-1),(r,c+1)):
                if z in rem:
                    rem.remove(z)
                    q.append(z)
                    n += 1
        sizes.append(n)
    sizes.sort(reverse=True)
    return {
        "count": len(sizes),
        "largest": sizes[0] if sizes else 0,
    }


def overlap(primary, candidate):
    inter = primary & candidate
    union = primary | candidate
    return {
        "candidate_pixels": len(candidate),
        "intersection": len(inter),
        "primary_covered_percent": round(100 * len(inter) / len(primary), 2) if primary else 0,
        "candidate_inside_primary_percent": round(100 * len(inter) / len(candidate), 2) if candidate else 0,
        "jaccard_percent": round(100 * len(inter) / len(union), 2) if union else 0,
    }


def top_values(arr, coords=None, n=12):
    if coords is None:
        vals = arr.ravel().tolist()
    else:
        vals = [int(arr[r, c]) for r, c in coords]
    c = Counter(vals)
    total = len(vals)
    return [
        {
            "value": int(v),
            "count": int(k),
            "percent": round(100 * k / total, 2) if total else 0,
        }
        for v, k in c.most_common(n)
    ]


def main():
    primary, primary_cty = get_primary()
    arr = tifffile.imread(TIFF)

    integrity = {
        "tiff_exists": TIFF.exists(),
        "shape": list(arr.shape),
        "dtype": str(arr.dtype),
        "expected_shape": [200, 200, 8],
        "primary_expected": 6115,
        "primary_actual": len(primary),
        "pass": tuple(arr.shape) == (200, 200, 8) and len(primary) == 6115,
    }

    results = {}

    for i, name in enumerate(BANDS):
        band = arr[:, :, i]

        entry = {
            "band_index_zero_based": i,
            "band_index_human": i + 1,
            "global_top_values": top_values(band),
            "primary_top_values": top_values(band, primary),
            "primary_unique_values": len({int(band[r, c]) for r, c in primary}),
        }

        if name in EXPECTED:
            expected = EXPECTED[name]
            coords = set(map(tuple, np.argwhere(band == expected).tolist()))
            entry["expected_value"] = expected
            entry["expected_value_spatial"] = components(coords)
            entry["vs_primary"] = overlap(primary, coords)

        results[name] = entry

    # Exact multi-band signature test.
    signature_coords = set()
    for r in range(200):
        for c in range(200):
            if (
                int(arr[r, c, 1]) == EXPECTED["CPMCE"]
                and int(arr[r, c, 2]) == EXPECTED["CPMCECL"]
                and int(arr[r, c, 3]) == EXPECTED["CPMCD"]
                and int(arr[r, c, 5]) == EXPECTED["CPMCH"]
                and int(arr[r, c, 6]) == EXPECTED["CPMCHCL"]
                and int(arr[r, c, 7]) == EXPECTED["CPCSY"]
            ):
                signature_coords.add((r, c))

    exact_signature = {
        "pixels": len(signature_coords),
        "spatial": components(signature_coords),
        "vs_primary": overlap(primary, signature_coords),
    }

    output = {
        "dataset": "LT_VALIDATION_S03_8band_TIFF_direct_provenance_audit",
        "version": "0.2",
        "diagnostic_only": True,
        "classifier_v07_status": "FROZEN_UNCHANGED",
        "tiff": str(TIFF),
        "band_order": BANDS,
        "integrity": integrity,
        "primary_cty_counts": dict(primary_cty),
        "expected_raw_values": EXPECTED,
        "bands": results,
        "exact_six_layer_signature": exact_signature,
        "generated_at": datetime.now().isoformat(timespec="seconds"),
    }

    stamp = datetime.now().strftime("%Y-%m-%d")
    out = DATA / (
        f"LT_VALIDATION_S03_8band_TIFF_direct_provenance_audit_v02_"
        f"2023_{stamp}.json"
    )
    out.write_text(json.dumps(output, indent=2, ensure_ascii=False), encoding="utf-8")

    print("=" * 118)
    print("LT 2023 S03 8-BAND TIFF DIRECT PROVENANCE AUDIT v0.2")
    print("Saved original TIFF -> exact PRIMARY coordinates")
    print("v0.7 remains FROZEN")
    print("=" * 118)
    print(f"Integrity PASS: {integrity['pass']}")
    print(f"TIFF shape: {arr.shape} | dtype={arr.dtype}")
    print(f"PRIMARY: {len(primary):,} pixels")
    print(f"PRIMARY CTY: {dict(primary_cty)}")
    print()

    print("BAND ORDER")
    for i, name in enumerate(BANDS, 1):
        print(f"  Band {i}: {name}")
    print()

    print("DIRECT TIFF TEST")
    for name in BANDS:
        x = results[name]
        print(
            f"  {name}: PRIMARY unique={x['primary_unique_values']} | "
            f"top={x['primary_top_values'][:5]}"
        )
        if name in EXPECTED:
            ov = x["vs_primary"]
            sp = x["expected_value_spatial"]
            print(
                f"    expected raw={x['expected_value']} | "
                f"all TIFF matches={ov['candidate_pixels']:,} | "
                f"components={sp['count']} largest={sp['largest']:,}"
            )
            print(
                f"    overlap={ov['intersection']:,} | "
                f"PRIMARY covered={ov['primary_covered_percent']:.2f}% | "
                f"matches inside PRIMARY={ov['candidate_inside_primary_percent']:.2f}% | "
                f"Jaccard={ov['jaccard_percent']:.2f}%"
            )

    print()
    print("EXACT SIX-LAYER SIGNATURE")
    ov = exact_signature["vs_primary"]
    sp = exact_signature["spatial"]
    print(
        f"  pixels={exact_signature['pixels']:,} | "
        f"components={sp['count']} | largest={sp['largest']:,}"
    )
    print(
        f"  overlap={ov['intersection']:,} | "
        f"PRIMARY covered={ov['primary_covered_percent']:.2f}% | "
        f"signature inside PRIMARY={ov['candidate_inside_primary_percent']:.2f}% | "
        f"Jaccard={ov['jaccard_percent']:.2f}%"
    )

    print()
    if (
        integrity["pass"]
        and exact_signature["pixels"] == 6115
        and ov["intersection"] == 6115
    ):
        print("PROVENANCE RESULT: EXACT MATCH")
        print("  The complete PRIMARY phenology signature already exists in the saved")
        print("  original 8-band TIFF before Pixel Intelligence JSON normalization.")
    else:
        print("PROVENANCE RESULT: NOT YET AN EXACT MATCH")
        print("  Inspect per-band results before drawing a decoder/source conclusion.")

    print()
    print(f"Saved: {out}")
    print("=" * 118)


if __name__ == "__main__":
    main()
