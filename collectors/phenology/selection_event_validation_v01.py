"""Saved-output diagnostics only; no classifier imports or source mutations."""
import hashlib
import json
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / "data/raw/copernicus"
OUT = ROOT / "data/validation/selection_event_v01.json"
DEADLINE = datetime(2026, 9, 11, 18, tzinfo=timezone.utc)
TARGET = {1110, 1120, 1150, 1430}
FIELDS = ("emergence_date", "emergence_uncertainty_days", "duration_days", "harvest_date")


def require(condition, message):
    if not condition:
        raise ValueError(message)


def check_deadline():
    require(datetime.now(timezone.utc) < DEADLINE, "Review gate reached: development paused")


def sha(path):
    with path.open("rb") as stream:
        return hashlib.file_digest(stream, "sha256").hexdigest()


def index(rows, width, height):
    result = {}
    for row in rows:
        r, c = row["row"], row["column"]
        require(type(r) is int and type(c) is int, "Non-integer coordinate")
        require(0 <= r < height and 0 <= c < width, "Out-of-bounds coordinate")
        require((r, c) not in result, "Duplicate coordinate")
        result[r, c] = row
    return result


def component_sizes(coords):
    remaining, sizes = set(coords), []
    while remaining:
        queue = [remaining.pop()]
        size = 0
        while queue:
            r, c = queue.pop()
            size += 1
            for neighbour in ((r-1, c), (r+1, c), (r, c-1), (r, c+1)):
                if neighbour in remaining:
                    remaining.remove(neighbour)
                    queue.append(neighbour)
        sizes.append(size)
    return sorted(sizes, reverse=True)


def fraction(numerator, denominator):
    return numerator / denominator if denominator else None


def analyse(raw, baseline, saved):
    width, height = raw["width_pixels"], raw["height_pixels"]
    rg = index(raw["pixels"], width, height)
    bg = index(baseline["pixels"], width, height)
    vg = index(saved["pixels"], width, height)
    require(len(rg) == width * height, "Incomplete raw grid")
    targets = {rc for rc, p in rg.items() if p["cty"] in TARGET}
    expected = targets & bg.keys()
    require(expected == vg.keys(), "Saved v0.7 selection differs from target CTY with baseline")
    for rc, p in vg.items():
        require(p["cty"] == rg[rc]["cty"] == bg[rc]["cty"], "CTY mismatch")
        ph = p["phenology_inputs"]
        require(all(ph.get(k) == rg[rc].get(k) for k in FIELDS), "Phenology mismatch")
        require(all(k in ph and k in rg[rc] for k in FIELDS), "Missing phenology field")
        require(p["seedtrade_v04_validation"]["classification"] == bg[rc]["classification"],
                "Saved baseline classification mismatch")
    statuses = Counter(p["agronomic_validation_status"] for p in vg.values())
    conflicts = {rc: p for rc, p in vg.items() if p["agronomic_validation_status"] == "AGRONOMIC_CONFLICT"}
    events = defaultdict(set)
    for rc, p in conflicts.items():
        events[tuple(p["phenology_inputs"][k] for k in FIELDS)].add(rc)
    ordered = sorted(events.items(), key=lambda item: (-len(item[1]), repr(item[0])))
    event_rows = []
    for signature, coords in ordered:
        sizes = component_sizes(coords)
        event_rows.append({"signature": dict(zip(FIELDS, signature)), "pixels": len(coords),
                           "component_count": len(sizes), "component_sizes": sizes,
                           "by_cty": dict(sorted(Counter(vg[rc]["cty"] for rc in coords).items()))})
    return {"raw_pixels": len(rg), "target_pixels": len(targets), "selected_pixels": len(vg),
            "non_target_exclusions": len(rg) - len(targets),
            "target_missing_baseline": len(targets - bg.keys()),
            "selection_and_saved_fields_pass": True,
            "statuses": dict(sorted(statuses.items())), "conflict_pixels": len(conflicts),
            "conflict_fraction_selected": fraction(len(conflicts), len(vg)),
            "conflict_fraction_directional_comparison": fraction(len(conflicts), len(conflicts) + statuses["AGRONOMIC_AGREE"]),
            "conflict_event_count": len(events),
            "largest_event_fraction_of_conflicts": fraction(len(ordered[0][1]) if ordered else 0, len(conflicts)),
            "conflict_events": event_rows}


def main():
    check_deadline()
    hashes, results = {}, []

    def load(path):
        hashes[path] = sha(path)
        return json.loads(path.read_text(encoding="utf-8"))

    for year in (2021, 2022, 2023):
        check_deadline()
        frozen = load(DATA / f"LT_VALIDATION_season_type_classifier_v07_hybrid_multiyear_validation_{year}_5samples_2000ha_2026-09-07.json")
        require(frozen["reference_year"] == year and frozen["classifier_rules_frozen"], "Frozen metadata mismatch")
        for sid in ("S01", "S02", "S03", "S04", "S05"):
            check_deadline()
            raw = load(DATA / f"LT_VALIDATION_multiyear_validation_pixel_intelligence_{year}_{sid}_2km_400ha_test_2026-09-07.json")
            baseline = load(DATA / f"LT_VALIDATION_season_type_classifier_v04_multiyear_validation_{year}_{sid}_2km_400ha_test_2026-09-07.json")
            require(raw["sample_id"] == sid and raw["year"] == year, "Raw identity mismatch")
            row = {"year": year, "sample_id": sid, **analyse(raw, baseline, frozen["samples"][sid])}
            results.append(row)
            print(f"{year} {sid}: selected={row['selected_pixels']} conflicts={row['conflict_pixels']} events={row['conflict_event_count']}", flush=True)
    require(all(sha(path) == value for path, value in hashes.items()), "Input changed during analysis")
    report = {"diagnostic_version": "0.1", "created_utc": datetime.now(timezone.utc).isoformat(),
              "v07_frozen": True, "boundary_audit_rerun": False,
              "limitations": ["Descriptive cross-layer disagreement, not accuracy.",
                              "Events and components are not independent field observations.",
                              "No regional acreage inference; no classifier execution."],
              "input_hashes": {str(p.relative_to(ROOT)): h for p, h in hashes.items()},
              "inputs_unchanged": True, "samples": results}
    check_deadline()
    require(not OUT.exists(), "Output exists: preserve previous diagnostic")
    OUT.parent.mkdir(parents=True, exist_ok=True)
    with OUT.open("x", encoding="utf-8") as stream:
        json.dump(report, stream, indent=2, allow_nan=False)
        stream.write("\n")
    print(f"PASS: {len(results)} sample-years; {len(hashes)} unchanged inputs; {OUT}")


if __name__ == "__main__":
    main()
