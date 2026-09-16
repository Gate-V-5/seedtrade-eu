"""Read saved LT geometry only; do not run any classifier."""
import json
import math
from itertools import combinations
from datetime import datetime, timezone
from selection_event_validation_v01 import DATA, ROOT, check_deadline, require, sha

OUT = ROOT / "data/validation/spatial_geometry_v01.json"


def geometry(raw):
    require(raw["crs"] == "EPSG:32634", "Expected common projected CRS EPSG:32634")
    bbox = raw["bbox"]
    require(len(bbox) == 4 and all(math.isfinite(x) for x in bbox), "Invalid bbox")
    w, h = raw["width_pixels"], raw["height_pixels"]
    require(type(w) is int and type(h) is int and w > 0 and h > 0, "Invalid grid")
    xmin, ymin, xmax, ymax = bbox
    require(xmax > xmin and ymax > ymin, "Reversed bbox")
    dx, dy = (xmax-xmin)/w, (ymax-ymin)/h
    require(math.isclose(dx, raw["resolution_m"], abs_tol=1e-6) and
            math.isclose(dy, raw["resolution_m"], abs_tol=1e-6), "Resolution mismatch")
    return {"crs": raw["crs"], "bbox": bbox, "width": w, "height": h, "dx": dx, "dy": dy}


def same_grid(a, b):
    return (all(a[k] == b[k] for k in ("crs", "width", "height")) and
            all(abs(x-y) <= 1e-6 for x, y in zip(a["bbox"], b["bbox"])))


def overlap_area(a, b):
    require(a["crs"] == b["crs"], "Cannot compare different CRSs")
    x1, y1, x2, y2 = a["bbox"]
    u1, v1, u2, v2 = b["bbox"]
    return max(0, min(x2,u2)-max(x1,u1)) * max(0, min(y2,v2)-max(y1,v1))


def main():
    check_deadline()
    hashes, grids = {}, {}
    for year in (2021, 2022, 2023):
        for sid in ("S01", "S02", "S03", "S04", "S05"):
            check_deadline()
            path = DATA / f"LT_VALIDATION_multiyear_validation_pixel_intelligence_{year}_{sid}_2km_400ha_test_2026-09-07.json"
            hashes[path] = sha(path)
            raw = json.loads(path.read_text(encoding="utf-8"))
            require(raw["year"] == year and raw["sample_id"] == sid, "Identity mismatch")
            grids[year, sid] = geometry(raw)
            print(f"Read {year} {sid}", flush=True)
    temporal = [{"sample_id": sid, "same_grid_all_years": all(
        same_grid(grids[2021,sid], grids[y,sid]) for y in (2022,2023))}
        for sid in ("S01", "S02", "S03", "S04", "S05")]
    pairs = [{"year": year, "sample_a": a, "sample_b": b,
              "overlap_m2": overlap_area(grids[year,a], grids[year,b])}
             for year in (2021,2022,2023)
             for a,b in combinations(("S01","S02","S03","S04","S05"),2)]
    require(all(sha(p) == h for p,h in hashes.items()), "Source changed")
    result = {"created_utc": datetime.now(timezone.utc).isoformat(),
              "diagnostic_only": True, "inputs_unchanged": True,
              "input_hashes": {str(p.relative_to(ROOT)): h for p,h in hashes.items()},
              "grids": [{"year": y, "sample_id": s, **g} for (y,s),g in grids.items()],
              "temporal": temporal, "within_year_pairs": pairs,
              "limitations": ["Saved metadata comparison, not independent geolocation validation.",
                              "Non-overlap does not establish statistical independence.",
                              "Repeated years at a site must remain grouped for validation.",
                              "Extent area is not crop acreage."]}
    check_deadline()
    with OUT.open("x", encoding="utf-8") as stream:
        json.dump(result, stream, indent=2, allow_nan=False)
        stream.write("\n")
    print(f"Unchanged inputs: {len(hashes)}; stable sites: {sum(r['same_grid_all_years'] for r in temporal)}; overlapping pairs: {sum(r['overlap_m2'] > 0 for r in pairs)}")


if __name__ == "__main__":
    main()
