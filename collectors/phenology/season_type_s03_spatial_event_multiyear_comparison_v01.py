#!/usr/bin/env python3
"""
SeedTrade.eu — LT S03 2021–2023 spatial-event comparison v0.1

Goal
----
Compare the SAME S03 geography across 2021, 2022, 2023 and quantify whether
large structured conflict-event blocks are year-specific.

For each year:
- load frozen v0.7 S03 pixels;
- isolate AGRONOMIC_CONFLICT pixels;
- group conflicts by exact phenology event signature:
  emergence date + emergence uncertainty + duration + harvest date;
- report top signatures;
- compute 4-neighbour connected components for all conflicts and for each
  dominant signature;
- compare conflict masks and dominant-signature masks between years by
  coordinate overlap / Jaccard.

Diagnostic only. v0.7 is NOT modified.
"""

import json
from collections import Counter, defaultdict, deque
from datetime import datetime
from itertools import combinations
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / "data" / "raw" / "copernicus"
YEARS = (2021, 2022, 2023)

EXPECTED_TOTAL_CONFLICTS = {
    2021: 3476,
    2022: 90,
    2023: 17372,   # all five LT samples
}

EXPECTED_S03_CONFLICTS = {
    2023: 9049,
    # 2021/2022 intentionally not hard-coded because S03-specific counts
    # were not frozen in the previous diagnostic summary.
}


def find_v07(year):
    exact = DATA / (
        f"LT_VALIDATION_season_type_classifier_v07_hybrid_"
        f"multiyear_validation_{year}_5samples_2000ha_2026-09-07.json"
    )
    if exact.exists():
        return exact

    matches = sorted(DATA.glob(
        f"LT_VALIDATION_season_type_classifier_v07_hybrid*{year}*5samples*2000ha*.json"
    ))
    if len(matches) == 1:
        return matches[0]
    if not matches:
        raise FileNotFoundError(f"No LT v0.7 file found for {year}")
    raise RuntimeError(
        f"Ambiguous LT v0.7 files for {year}: {[x.name for x in matches]}"
    )


def event_signature(pixel):
    ph = pixel.get("phenology_inputs") or {}
    return (
        ph.get("emergence_date"),
        ph.get("emergence_uncertainty_days"),
        ph.get("duration_days"),
        ph.get("harvest_date"),
    )


def signature_text(sig):
    e, u, d, h = sig
    return f"{e}|unc={u}|dur={d}|harvest={h}"


def components(coords):
    remaining = set(coords)
    out = []

    while remaining:
        start = remaining.pop()
        q = deque([start])
        comp = [start]

        while q:
            r, c = q.popleft()
            for n in ((r-1, c), (r+1, c), (r, c-1), (r, c+1)):
                if n in remaining:
                    remaining.remove(n)
                    q.append(n)
                    comp.append(n)

        out.append(comp)

    out.sort(key=len, reverse=True)
    return out


def component_stats(coords):
    comps = components(coords)
    largest = len(comps[0]) if comps else 0
    return {
        "components": len(comps),
        "largest_component_pixels": largest,
        "largest_component_percent": round(
            100.0 * largest / len(coords), 2
        ) if coords else 0.0,
        "components_ge_10px": sum(len(c) >= 10 for c in comps),
        "components_ge_100px": sum(len(c) >= 100 for c in comps),
        "components_ge_1000px": sum(len(c) >= 1000 for c in comps),
    }


def bbox(coords):
    if not coords:
        return None
    rr = [x[0] for x in coords]
    cc = [x[1] for x in coords]
    return {
        "row_min": min(rr),
        "row_max": max(rr),
        "column_min": min(cc),
        "column_max": max(cc),
    }


def overlap_stats(a, b):
    inter = a & b
    union = a | b
    return {
        "a_pixels": len(a),
        "b_pixels": len(b),
        "intersection_pixels": len(inter),
        "union_pixels": len(union),
        "jaccard_percent": round(
            100.0 * len(inter) / len(union), 2
        ) if union else 0.0,
        "a_covered_by_b_percent": round(
            100.0 * len(inter) / len(a), 2
        ) if a else 0.0,
        "b_covered_by_a_percent": round(
            100.0 * len(inter) / len(b), 2
        ) if b else 0.0,
    }


def analyse_year(year):
    path = find_v07(year)
    with path.open(encoding="utf-8") as f:
        data = json.load(f)

    sample = data["samples"]["S03"]
    pixels = sample["pixels"]

    target_coords = set()
    conflicts = []
    conflict_coords = set()
    by_sig = defaultdict(list)
    by_crop = Counter()

    for p in pixels:
        coord = (int(p["row"]), int(p["column"]))
        target_coords.add(coord)

        if p.get("agronomic_validation_status") != "AGRONOMIC_CONFLICT":
            continue

        conflicts.append(p)
        conflict_coords.add(coord)
        sig = event_signature(p)
        by_sig[sig].append(coord)
        by_crop[p.get("crop") or str(p.get("cty"))] += 1

    ranked = sorted(
        by_sig.items(),
        key=lambda kv: len(kv[1]),
        reverse=True
    )

    top = []
    for rank, (sig, coords_list) in enumerate(ranked[:15], 1):
        coords = set(coords_list)
        cs = component_stats(coords)
        top.append({
            "rank": rank,
            "signature": {
                "emergence_date": sig[0],
                "emergence_uncertainty_days": sig[1],
                "duration_days": sig[2],
                "harvest_date": sig[3],
            },
            "signature_text": signature_text(sig),
            "pixels": len(coords),
            "share_of_conflicts_percent": round(
                100.0 * len(coords) / len(conflicts), 2
            ) if conflicts else 0.0,
            "bbox": bbox(coords),
            "spatial": cs,
        })

    result = {
        "year": year,
        "source": str(path),
        "s03_target_pixels": len(target_coords),
        "conflict_pixels": len(conflicts),
        "conflict_percent_of_s03_target": round(
            100.0 * len(conflicts) / len(target_coords), 2
        ) if target_coords else 0.0,
        "conflicts_by_crop": dict(by_crop),
        "unique_exact_event_signatures": len(by_sig),
        "all_conflicts_spatial": component_stats(conflict_coords),
        "all_conflicts_bbox": bbox(conflict_coords),
        "top_event_signatures": top,
    }

    return result, conflict_coords, {
        signature_text(sig): set(coords)
        for sig, coords in by_sig.items()
    }


def main():
    analyses = {}
    conflict_masks = {}
    sig_masks = {}

    for year in YEARS:
        a, cm, sm = analyse_year(year)
        analyses[year] = a
        conflict_masks[year] = cm
        sig_masks[year] = sm

    # Integrity: 2023 S03 exact known count.
    integrity = {
        "2023_s03_conflicts_expected": EXPECTED_S03_CONFLICTS[2023],
        "2023_s03_conflicts_actual": analyses[2023]["conflict_pixels"],
        "2023_s03_conflicts_pass":
            analyses[2023]["conflict_pixels"] == EXPECTED_S03_CONFLICTS[2023],
        "same_s03_grid_target_pixels":
            len({analyses[y]["s03_target_pixels"] for y in YEARS}) == 1,
    }
    integrity["pass"] = all([
        integrity["2023_s03_conflicts_pass"],
        integrity["same_s03_grid_target_pixels"],
    ])

    pairwise_conflict_overlap = {}
    pairwise_top1_overlap = {}

    for y1, y2 in combinations(YEARS, 2):
        pairwise_conflict_overlap[f"{y1}_vs_{y2}"] = overlap_stats(
            conflict_masks[y1], conflict_masks[y2]
        )

        top1_y1 = analyses[y1]["top_event_signatures"][0]["signature_text"] \
            if analyses[y1]["top_event_signatures"] else None
        top1_y2 = analyses[y2]["top_event_signatures"][0]["signature_text"] \
            if analyses[y2]["top_event_signatures"] else None

        m1 = sig_masks[y1].get(top1_y1, set()) if top1_y1 else set()
        m2 = sig_masks[y2].get(top1_y2, set()) if top1_y2 else set()

        pairwise_top1_overlap[f"{y1}_vs_{y2}"] = {
            "top1_year1_signature": top1_y1,
            "top1_year2_signature": top1_y2,
            **overlap_stats(m1, m2),
        }

    # Cross-year reuse of identical exact event signatures.
    all_sig_years = defaultdict(dict)
    for year in YEARS:
        for sig, coords in sig_masks[year].items():
            all_sig_years[sig][year] = len(coords)

    reused = {
        sig: counts for sig, counts in all_sig_years.items()
        if len(counts) >= 2
    }

    output = {
        "dataset": "LT_VALIDATION_S03_spatial_event_multiyear_comparison",
        "version": "0.1",
        "diagnostic_only": True,
        "classifier_v07_status": "FROZEN_UNCHANGED",
        "years": list(YEARS),
        "connectivity": "4-neighbour",
        "integrity": integrity,
        "year_analysis": analyses,
        "pairwise_all_conflict_mask_overlap": pairwise_conflict_overlap,
        "pairwise_top1_event_mask_overlap": pairwise_top1_overlap,
        "exact_event_signatures_reused_across_years": reused,
        "scientific_guardrail": (
            "Year-specific spatial concentration supports a year-specific "
            "phenology/event phenomenon, but does not by itself prove a CLMS error."
        ),
        "generated_at": datetime.now().isoformat(timespec="seconds"),
    }

    stamp = datetime.now().strftime("%Y-%m-%d")
    out = DATA / (
        f"LT_VALIDATION_S03_spatial_event_multiyear_comparison_v01_"
        f"2021_2022_2023_{stamp}.json"
    )
    out.write_text(
        json.dumps(output, indent=2, ensure_ascii=False),
        encoding="utf-8"
    )

    print("=" * 112)
    print("LT S03 2021–2023 SPATIAL-EVENT COMPARISON")
    print("Same geography | exact event signatures | 4-neighbour components")
    print("v0.7 remains FROZEN")
    print("=" * 112)
    print(f"Integrity PASS: {integrity['pass']}")
    print()

    for year in YEARS:
        a = analyses[year]
        s = a["all_conflicts_spatial"]
        print(f"{year}")
        print(
            f"  S03 target pixels: {a['s03_target_pixels']:,} | "
            f"conflicts: {a['conflict_pixels']:,} "
            f"({a['conflict_percent_of_s03_target']:.2f}%)"
        )
        print(f"  Conflicts by crop: {a['conflicts_by_crop']}")
        print(
            f"  Conflict components: {s['components']:,} | "
            f"largest={s['largest_component_pixels']:,} px "
            f"({s['largest_component_percent']:.2f}% of conflicts)"
        )
        print(
            f"  Unique exact event signatures: "
            f"{a['unique_exact_event_signatures']:,}"
        )

        for x in a["top_event_signatures"][:5]:
            sp = x["spatial"]
            print(
                f"    #{x['rank']} {x['signature_text']} | "
                f"{x['pixels']:,} px "
                f"({x['share_of_conflicts_percent']:.2f}% conflicts) | "
                f"components={sp['components']}, "
                f"largest={sp['largest_component_pixels']:,} "
                f"({sp['largest_component_percent']:.2f}%)"
            )
        print()

    print("PAIRWISE ALL-CONFLICT MASK OVERLAP")
    for k, x in pairwise_conflict_overlap.items():
        print(
            f"  {k}: intersection={x['intersection_pixels']:,} | "
            f"Jaccard={x['jaccard_percent']:.2f}% | "
            f"A covered={x['a_covered_by_b_percent']:.2f}% | "
            f"B covered={x['b_covered_by_a_percent']:.2f}%"
        )

    print()
    print("PAIRWISE TOP-1 EVENT MASK OVERLAP")
    for k, x in pairwise_top1_overlap.items():
        print(f"  {k}")
        print(f"    A top1: {x['top1_year1_signature']}")
        print(f"    B top1: {x['top1_year2_signature']}")
        print(
            f"    intersection={x['intersection_pixels']:,} | "
            f"Jaccard={x['jaccard_percent']:.2f}%"
        )

    print()
    print(
        "Exact event signatures reused in >=2 years: "
        f"{len(reused):,}"
    )
    if reused:
        for sig, counts in sorted(
            reused.items(),
            key=lambda kv: sum(kv[1].values()),
            reverse=True
        )[:10]:
            print(f"  {sig} -> {counts}")

    print()
    print(f"Saved: {out}")
    print("=" * 112)


if __name__ == "__main__":
    main()
