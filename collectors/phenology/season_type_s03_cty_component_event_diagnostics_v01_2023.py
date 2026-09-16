#!/usr/bin/env python3
"""
SeedTrade.eu — LT 2023 S03 CTY-component × dominant-event diagnostics v0.1

Purpose:
- Build 4-neighbour connected components separately inside each CTY crop class.
- Measure how much of every CTY component is covered by PRIMARY and SECOND events.
- Quantify whether dominant phenology events fill whole CTY components or cut through them.

Diagnostic only. Frozen v0.7 is NOT modified.
"""

import json
from collections import Counter, deque
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / "data" / "raw" / "copernicus"

V07 = DATA / (
    "LT_VALIDATION_season_type_classifier_v07_hybrid_multiyear_validation_"
    "2023_5samples_2000ha_2026-09-07.json"
)

CROPS = {
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


def matches(pixel, criteria):
    ph = pixel.get("phenology_inputs") or {}
    return all(ph.get(k) == v for k, v in criteria.items())


def event_name(pixel):
    if pixel.get("agronomic_validation_status") != "AGRONOMIC_CONFLICT":
        return None
    for name, criteria in PATTERNS.items():
        if matches(pixel, criteria):
            return name
    return None


def connected_components(coords):
    remaining = set(coords)
    components = []
    while remaining:
        start = remaining.pop()
        q = deque([start])
        comp = [start]
        while q:
            r, c = q.popleft()
            for n in ((r-1,c),(r+1,c),(r,c-1),(r,c+1)):
                if n in remaining:
                    remaining.remove(n)
                    q.append(n)
                    comp.append(n)
        components.append(comp)
    components.sort(key=len, reverse=True)
    return components


def band(pct):
    if pct == 0:
        return "0%"
    if pct < 10:
        return ">0-<10%"
    if pct < 50:
        return "10-<50%"
    if pct < 90:
        return "50-<90%"
    if pct < 100:
        return "90-<100%"
    return "100%"


def main():
    with V07.open(encoding="utf-8") as f:
        v07 = json.load(f)

    pixels = v07["samples"]["S03"]["pixels"]
    grid = {}
    crop_coords = {name: set() for name in CROPS.values()}

    primary_total = 0
    second_total = 0

    for p in pixels:
        cty = int(p["cty"])
        if cty not in CROPS:
            continue
        key = (int(p["row"]), int(p["column"]))
        crop = CROPS[cty]
        ev = event_name(p)
        grid[key] = {"crop": crop, "event": ev}
        crop_coords[crop].add(key)
        if ev == "PRIMARY_FULL_PATTERN":
            primary_total += 1
        elif ev == "SECOND_DATE_UNCERTAINTY":
            second_total += 1

    if len(grid) != 20991 or primary_total != 6115 or second_total != 1156:
        raise RuntimeError(
            f"Integrity failed: target={len(grid)}, primary={primary_total}, second={second_total}"
        )

    rows = []
    crop_summary = {}
    event_component_sets = {
        "PRIMARY_FULL_PATTERN": set(),
        "SECOND_DATE_UNCERTAINTY": set(),
    }

    for crop, coords in crop_coords.items():
        comps = connected_components(coords)
        crop_rows = []

        for idx, comp in enumerate(comps, 1):
            n = len(comp)
            counts = Counter(grid[x]["event"] for x in comp)
            p1 = counts["PRIMARY_FULL_PATTERN"]
            p2 = counts["SECOND_DATE_UNCERTAINTY"]
            p1pct = 100.0 * p1 / n
            p2pct = 100.0 * p2 / n

            if p1:
                event_component_sets["PRIMARY_FULL_PATTERN"].add((crop, idx))
            if p2:
                event_component_sets["SECOND_DATE_UNCERTAINTY"].add((crop, idx))

            rr = [x[0] for x in comp]
            cc = [x[1] for x in comp]

            item = {
                "crop": crop,
                "component_id": idx,
                "pixels": n,
                "hectares": round(n * 0.01, 2),
                "bbox_rows": [min(rr), max(rr)],
                "bbox_cols": [min(cc), max(cc)],
                "primary_pixels": p1,
                "primary_percent": round(p1pct, 2),
                "primary_band": band(p1pct),
                "second_pixels": p2,
                "second_percent": round(p2pct, 2),
                "second_band": band(p2pct),
            }
            rows.append(item)
            crop_rows.append(item)

        crop_summary[crop] = {
            "pixels": len(coords),
            "components": len(comps),
            "components_ge_10px": sum(x["pixels"] >= 10 for x in crop_rows),
            "components_ge_100px": sum(x["pixels"] >= 100 for x in crop_rows),
            "primary_intersected_components": sum(x["primary_pixels"] > 0 for x in crop_rows),
            "second_intersected_components": sum(x["second_pixels"] > 0 for x in crop_rows),
        }

    def event_summary(name):
        affected = [x for x in rows if x[
            "primary_pixels" if name == "PRIMARY_FULL_PATTERN" else "second_pixels"
        ] > 0]
        pct_key = "primary_percent" if name == "PRIMARY_FULL_PATTERN" else "second_percent"
        pix_key = "primary_pixels" if name == "PRIMARY_FULL_PATTERN" else "second_pixels"
        bands = Counter(band(x[pct_key]) for x in affected)
        return {
            "intersected_cty_components": len(affected),
            "intersected_components_by_crop": dict(Counter(x["crop"] for x in affected)),
            "coverage_band_counts": dict(bands),
            "fully_covered_components": sum(x[pct_key] == 100 for x in affected),
            "partially_covered_components": sum(0 < x[pct_key] < 100 for x in affected),
            "event_pixels_in_components": sum(x[pix_key] for x in affected),
        }

    summary = {
        "dataset": "LT_VALIDATION_S03_CTY_component_x_dominant_event_diagnostics",
        "version": "0.1",
        "diagnostic_only": True,
        "classifier_v07_status": "FROZEN_UNCHANGED",
        "connectivity": "4-neighbour",
        "target_crop_pixels": len(grid),
        "crop_summary": crop_summary,
        "events": {
            "PRIMARY_FULL_PATTERN": event_summary("PRIMARY_FULL_PATTERN"),
            "SECOND_DATE_UNCERTAINTY": event_summary("SECOND_DATE_UNCERTAINTY"),
        },
        "components": rows,
        "generated_at": datetime.now().isoformat(timespec="seconds"),
    }

    stamp = datetime.now().strftime("%Y-%m-%d")
    out = DATA / f"LT_VALIDATION_S03_CTY_component_x_event_diagnostics_v01_2023_{stamp}.json"
    out.write_text(json.dumps(summary, indent=2, ensure_ascii=False), encoding="utf-8")

    print("=" * 104)
    print("LT 2023 S03 CTY-COMPONENT x DOMINANT-EVENT DIAGNOSTICS")
    print("4-neighbour connectivity | v0.7 remains FROZEN")
    print("=" * 104)
    print("Integrity PASS: True")
    print(f"Target crop pixels: {len(grid):,}")
    print(f"PRIMARY_FULL_PATTERN: {primary_total:,}")
    print(f"SECOND_DATE_UNCERTAINTY: {second_total:,}")
    print()

    print("CTY COMPONENTS")
    for crop, s in crop_summary.items():
        print(
            f"  {crop:<16} components={s['components']:,} | "
            f">=10px={s['components_ge_10px']:,} | >=100px={s['components_ge_100px']:,} | "
            f"PRIMARY intersects={s['primary_intersected_components']:,} | "
            f"SECOND intersects={s['second_intersected_components']:,}"
        )

    for ev in ("PRIMARY_FULL_PATTERN", "SECOND_DATE_UNCERTAINTY"):
        s = summary["events"][ev]
        print()
        print(ev)
        print(f"  Intersected CTY components: {s['intersected_cty_components']:,}")
        print(f"  By crop: {s['intersected_components_by_crop']}")
        print(f"  Fully covered components: {s['fully_covered_components']:,}")
        print(f"  Partially covered components: {s['partially_covered_components']:,}")
        print(f"  Coverage bands: {s['coverage_band_counts']}")

        key = "primary_percent" if ev == "PRIMARY_FULL_PATTERN" else "second_percent"
        pkey = "primary_pixels" if ev == "PRIMARY_FULL_PATTERN" else "second_pixels"
        top = sorted(
            [x for x in rows if x[pkey] > 0],
            key=lambda x: (x[pkey], x[key]),
            reverse=True
        )[:15]
        print("  Top intersected components by event pixels:")
        for x in top:
            print(
                f"    {x['crop']:<16} #{x['component_id']:<3} "
                f"component={x['pixels']:>5,} px | event={x[pkey]:>5,} px | "
                f"coverage={x[key]:>6.2f}%"
            )

    print()
    print(f"Saved: {out}")
    print("=" * 104)


if __name__ == "__main__":
    main()
