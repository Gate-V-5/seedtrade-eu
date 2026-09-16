#!/usr/bin/env python3
"""Read-only LT 2023 S03 PRIMARY boundary audit v0.1.

Reproduce the masks in season_type_s03_8band_tiff_direct_provenance_audit_
v02_2023.py and the four-neighbour convention in the S03 component audits.
Read saved outputs only: never import, rerun, or change classifier logic.
Print the complete diagnostic to stdout; do not write report files.

Requires numpy and tifffile. Run with Python -B to suppress bytecode files.
Coordinates are zero-based row/column and pixel centres calculated from the
saved raw JSON bbox (north-up), in its recorded CRS; no reprojection is used.
Profiles are lossless groups of identical pixel attributes, referenced by
every pixel row. No classification or phenology fields are inferred.
"""

import hashlib
import json
from collections import Counter, deque
from pathlib import Path

import numpy as np
import tifffile

ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / "data" / "raw" / "copernicus"
STEM = "LT_VALIDATION_multiyear_validation_pixel_intelligence_2023_S03_2km_400ha_test_2026-09-07"
TIFF = DATA / (STEM + ".tif")
RAW = DATA / (STEM + ".json")
V07 = DATA / "LT_VALIDATION_season_type_classifier_v07_hybrid_multiyear_validation_2023_5samples_2000ha_2026-09-07.json"
V04 = DATA / "LT_VALIDATION_season_type_classifier_v04_multiyear_validation_2023_S03_2km_400ha_test_2026-09-07.json"
BANDS = ("CTY", "CPMCE", "CPMCECL", "CPMCD", "CPMCDCL", "CPMCH", "CPMCHCL", "CPCSY")
EXPECTED = {"CPMCE": 23087, "CPMCECL": 17, "CPMCD": 119,
            "CPMCH": 23206, "CPMCHCL": 29, "CPCSY": 2}
PRIMARY_CRITERIA = {"emergence_date": "2023-03-28", "emergence_uncertainty_days": 17,
                    "duration_days": 119, "harvest_date": "2023-07-25"}
RAW_FIELDS = ("cty", "emergence_raw", "emergence_uncertainty_raw", "duration_raw",
              "duration_confidence_raw", "harvest_raw", "harvest_uncertainty_raw", "cpcsy_raw")


def require(condition, message):
    if not condition:
        raise RuntimeError("Integrity failure: " + message)


def digest(path):
    with path.open("rb") as stream:
        return hashlib.file_digest(stream, "sha256").hexdigest()


def neighbours(rc):
    r, c = rc
    return ((r - 1, c), (r + 1, c), (r, c - 1), (r, c + 1))


def components(coords):
    remaining = set(coords)
    result = []
    while remaining:
        start = min(remaining)
        remaining.remove(start)
        queue = deque([start])
        comp = {start}
        while queue:
            for rc in neighbours(queue.popleft()):
                if rc in remaining:
                    remaining.remove(rc)
                    comp.add(rc)
                    queue.append(rc)
        result.append(comp)
    return sorted(result, key=lambda comp: (-len(comp), min(comp)))


def index_pixels(pixels, label, height, width):
    result = {}
    for p in pixels:
        rc = (int(p["row"]), int(p["column"]))
        require(rc not in result, f"duplicate {label} coordinate {rc}")
        require(0 <= rc[0] < height and 0 <= rc[1] < width, f"out-of-bounds {label}: {rc}")
        result[rc] = p
    return result


def matches(p):
    ph = p.get("phenology_inputs") or {}
    return all(ph.get(k) == v for k, v in PRIMARY_CRITERIA.items())


def compact(value):
    return json.dumps(value, ensure_ascii=True, sort_keys=True)


def main():
    before = {p: digest(p) for p in (TIFF, RAW, V07, V04)}
    arr = tifffile.imread(TIFF)
    require(arr.shape == (200, 200, 8), f"unexpected TIFF shape {arr.shape}")
    height, width, _ = arr.shape
    raw = json.loads(RAW.read_text(encoding="utf-8"))
    frozen = json.loads(V07.read_text(encoding="utf-8"))
    require(raw["sample_id"] == "S03" and raw["year"] == 2023, "raw sample/year")
    require(raw["width_pixels"] == width and raw["height_pixels"] == height, "raw grid dimensions")
    grid = index_pixels(frozen["samples"]["S03"]["pixels"], "v0.7", height, width)
    raw_grid = index_pixels(raw["pixels"], "raw", height, width)
    baseline = json.loads(V04.read_text(encoding="utf-8"))
    v04_grid = index_pixels(baseline["pixels"], "v0.4", height, width)
    require(len(raw_grid) == height * width, "incomplete raw grid")
    primary = {rc for rc, p in grid.items()
               if p.get("agronomic_validation_status") == "AGRONOMIC_CONFLICT" and matches(p)}
    mask = np.ones((height, width), dtype=bool)
    for name, value in EXPECTED.items():
        mask &= arr[:, :, BANDS.index(name)] == value
    signature = {tuple(rc) for rc in np.argwhere(mask).tolist()}
    extra = signature - primary
    missing = primary - signature
    require(len(signature) == 6151, f"signature={len(signature)}, expected 6151")
    require(len(primary) == 6115, f"PRIMARY={len(primary)}, expected 6115")
    require(len(extra) == 36 and not missing, f"TIFF-only={len(extra)}, PRIMARY-only={len(missing)}")
    require(signature <= v04_grid.keys(), "signature pixels missing from v0.4 output")
    for rc in sorted(signature):
        p, rp = grid.get(rc), raw_grid[rc]
        if p is not None:
            require(int(p["cty"]) == int(arr[rc][0]), f"v0.7 CTY differs from TIFF at {rc}")
            require(all(p["phenology_inputs"][k] == rp[k] for k in p["phenology_inputs"]),
                    f"frozen phenology differs from raw JSON at {rc}")
        require(all(rp[field] == int(arr[rc][i]) for i, field in enumerate(RAW_FIELDS)),
                f"raw JSON differs from TIFF at {rc}")
        require(v04_grid[rc]["cty"] == rp["cty"], f"v0.4 CTY differs at {rc}")
        require(all(v04_grid[rc][k] == rp[k] for k in PRIMARY_CRITERIA), f"v0.4 phenology differs at {rc}")

    all_comps = {"TIFF_signature": components(signature), "PRIMARY": components(primary),
                 "TIFF_only": components(extra)}
    labels = {name: {rc: i for i, comp in enumerate(comps, 1) for rc in comp}
              for name, comps in all_comps.items()}
    profiles, profile_ids = [], {}
    rows = []
    xmin, ymin, xmax, ymax = raw["bbox"]
    dx, dy = (xmax - xmin) / width, (ymax - ymin) / height
    require(abs(dx - 10) < 1e-6 and abs(dy - 10) < 1e-6, "unexpected pixel resolution")
    for rc in sorted(extra):
        p, rp = grid.get(rc), raw_grid[rc]
        # Preserve every frozen field except row/column; also retain all raw
        # phenology/status fields. Grouping only reduces repeated printing.
        profile = {"cty": rp["cty"], "crop": rp["crop"],
                   "v07_record_present": p is not None,
                   "frozen_v07": ({k: v for k, v in p.items() if k not in ("row", "column")} if p else {
                       "final_classification": None, "agronomic_validation_status": None,
                       "clms_primary": None,
                       "availability": "NOT_PRESENT_IN_SAVED_V07_OUTPUT"}),
                   "saved_v04": {k: v for k, v in v04_grid[rc].items() if k not in ("pixel", "row", "column")},
                   "tiff_bands": dict(zip(BANDS, map(int, arr[rc]))),
                   "raw_pixel_inputs": {k: v for k, v in rp.items()
                                        if k not in ("pixel", "row", "column", "cty", "crop")},
                   "primary_exclusion": {
                       "raw_phenology_matches": all(rp[k] == v for k, v in PRIMARY_CRITERIA.items()),
                       "v07_record_present": p is not None,
                       "status_is_AGRONOMIC_CONFLICT": p.get("agronomic_validation_status") == "AGRONOMIC_CONFLICT" if p else None}}
        key = compact(profile)
        if key not in profile_ids:
            profile_ids[key] = len(profiles) + 1
            profiles.append(profile)
        r, c = rc
        rows.append((rc, profile_ids[key], xmin + (c + 0.5) * dx, ymax - (r + 0.5) * dy))

    print("LT 2023 S03 PRIMARY BOUNDARY 36px AUDIT v0.1")
    print("Diagnostic only | saved outputs only | v0.7 FROZEN | no report files written")
    for path, sha in before.items():
        print(f"Source: {path.relative_to(ROOT).as_posix()} | SHA256={sha}")
    print(f"TIFF shape={arr.shape}; dtype={arr.dtype}; band order={','.join(BANDS)}")
    print("Six-layer signature: " + compact(EXPECTED))
    print("PRIMARY: AGRONOMIC_CONFLICT AND " + compact(PRIMARY_CRITERIA))
    print("CTY and CPMCDCL are not restrictions on the six-layer signature.")
    print(f"Integrity PASS: signature={len(signature)}; PRIMARY={len(primary)}; intersection={len(signature & primary)}; TIFF-only={len(extra)}; PRIMARY-only={len(missing)}")
    print("All 6151 signature pixels: TIFF/raw eight-band and v0.4 CTY/phenology agreement PASS")
    print(f"Signature pixels present in v0.7={len(signature & grid.keys())}; absent={len(signature - grid.keys())}; CTY/phenology agreement for present records PASS")
    print(f"PRIMARY coverage={100 * len(signature & primary) / len(primary):.6f}%; Jaccard={100 * len(signature & primary) / len(signature | primary):.6f}%")
    for name, coords in (("TIFF_signature", signature), ("PRIMARY", primary), ("TIFF_only", extra)):
        print(f"{name} CTY counts: " + compact(dict(Counter(int(arr[rc][0]) for rc in coords))))
        sizes = [len(c) for c in all_comps[name]]
        print(f"{name} 4-neighbour components={len(sizes)}; sizes={sizes}")
    print("TIFF-only classification combinations (count, CTY, crop, final, validation, CLMS, v0.4):")
    absent = "ABSENT_FROM_V07"
    counts = Counter((raw_grid[rc]["cty"], raw_grid[rc]["crop"], grid.get(rc, {}).get("final_classification", absent),
                      grid.get(rc, {}).get("agronomic_validation_status", absent),
                      grid.get(rc, {}).get("clms_primary", {}).get("classification", absent),
                      v04_grid[rc]["classification"]) for rc in extra)
    for fields, count in sorted(counts.items()):
        print(f"  {count} | " + " | ".join(map(str, fields)))
    print("TIFF-only connected components (IDs sorted by descending size, then first coordinate):")
    for i, comp in enumerate(all_comps["TIFF_only"], 1):
        adjacent = {n for rc in comp for n in neighbours(rc) if n in primary}
        edges = sum(n in primary for rc in comp for n in neighbours(rc))
        print(f"  component={i}; pixels={len(comp)}; rows={min(r for r,c in comp)}..{max(r for r,c in comp)}; columns={min(c for r,c in comp)}..{max(c for r,c in comp)}; primary_contact_edges={edges}; distinct_primary_neighbours={len(adjacent)}; primary_components={sorted({labels['PRIMARY'][rc] for rc in adjacent})}; signature_components={sorted({labels['TIFF_signature'][rc] for rc in comp})}")
    touching = sum(any(n in primary for n in neighbours(rc)) for rc in extra)
    print(f"TIFF-only pixels directly touching PRIMARY={touching}/36; not directly touching={36-touching}")
    print("ATTRIBUTE PROFILES (all fields; each pixel below references exactly one profile)")
    for i, profile in enumerate(profiles, 1):
        print(f"Profile {i}:")
        print(json.dumps(profile, indent=2, ensure_ascii=True))
    print(f"ALL 36 PIXELS | zero-based row,column | pixel-centre coordinates in {raw['crs']}")
    print("Neighbour lists are exact N/S/W/E contacts; diagonals do not count. [] means none.")
    print("row,col | profile | easting,northing | extra_component | signature_component | PRIMARY neighbours | TIFF-only neighbours")
    for rc, pid, x, y in rows:
        pn = [n for n in neighbours(rc) if n in primary]
        en = [n for n in neighbours(rc) if n in extra]
        print(f"{rc[0]},{rc[1]} | {pid} | {x:.3f},{y:.3f} | {labels['TIFF_only'][rc]} | {labels['TIFF_signature'][rc]} | {pn} | {en}")
    require(all(digest(p) == sha for p, sha in before.items()), "source file changed during audit")
    print("Source SHA256 verification: PASS (all four input files unchanged)")
    if not extra & grid.keys():
        print("RESULT: All 36 TIFF-only pixels are absent from saved v0.7; final classification, agronomic status and CLMS primary classification are unavailable, not inferred.")
        print("The v0.7 2023 validation collector targets CTY 1110,1120,1150,1430 and skips other crops before classification.")
    elif all(matches(grid[rc]) and grid[rc]["agronomic_validation_status"] != "AGRONOMIC_CONFLICT" for rc in extra if rc in grid):
        print("RESULT: All 36 TIFF-only pixels match the PRIMARY phenology criteria but fail its AGRONOMIC_CONFLICT status filter.")
    else:
        print("RESULT: See the explicit PRIMARY exclusion checks in each profile.")
    print("Audit complete. No classifier logic executed or modified.")


if __name__ == "__main__":
    main()
