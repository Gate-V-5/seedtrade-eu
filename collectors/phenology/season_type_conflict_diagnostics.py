"""
SeedTrade.eu
Season Type Conflict Diagnostics v0.1

Purpose
-------
Diagnose the 5,222 SeedTrade v0.4 vs CLMS v0.6 directional conflicts and
the main weak/ambiguous groups across 5 x 400 ha PL_EAST samples.

Inputs
------
- Season Type Classifier v0.4 per-sample JSON
- Pixel Intelligence v0.9 CPCSY per-sample JSON
- Existing CLMS Zone 1 rules are reproduced locally for comparison

Outputs
-------
- Conflict counts by sample and crop
- Directional transition matrix:
    SeedTrade WINTER -> CLMS SPRING
    SeedTrade SPRING -> CLMS WINTER
- Top date/duration profiles for each conflict direction
- Uncertainty summaries
- CPCSY cross-tabs
- Weak SeedTrade -> CLMS WINTER diagnostics
- Ambiguous SeedTrade -> CLMS WINTER diagnostics

Scientific constraints
----------------------
- CPCSY is a separate CLMS cross-layer signal only.
- CPCSY is NOT used to classify WINTER vs SPRING.
- CPMCDCL is NOT used for weighting.
- No classifier is modified.
- Pixel percentages are descriptive, not probabilities.
"""

import json
import statistics
from collections import Counter, defaultdict
from datetime import date, datetime
from pathlib import Path


VERSION = "0.1"

PROJECT_ROOT = Path(__file__).resolve().parents[2]
COPERNICUS_DIR = PROJECT_ROOT / "data" / "raw" / "copernicus"

SAMPLE_IDS = ("S01", "S02", "S03", "S04", "S05")

TARGET_CROPS = {
    1110: "Wheat",
    1120: "Barley",
    1150: "Other cereals",
    1430: "Rapeseed",
}

DIRECTIONAL = {
    "WINTER_CYCLE_SIGNAL": "WINTER",
    "SPRING_CYCLE_SIGNAL": "SPRING",
}


def load_json(path):
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def find_latest(pattern):
    files = sorted(COPERNICUS_DIR.glob(pattern), key=lambda p: p.name)
    latest = {}

    for path in files:
        for sid in SAMPLE_IDS:
            if f"_{sid}_" in path.name:
                latest[sid] = path
                break

    missing = [sid for sid in SAMPLE_IDS if sid not in latest]
    if missing:
        raise FileNotFoundError(
            f"Missing files for samples: {', '.join(missing)} | pattern={pattern}"
        )

    return {sid: latest[sid] for sid in SAMPLE_IDS}


def find_v04():
    return find_latest(
        "*season_type_classifier_v04_*_S??_2km_400ha_test_*.json"
    )


def find_v09():
    return find_latest(
        "*pixel_intelligence_v09_cpcsy_*_S??_2km_400ha_test_*.json"
    )


def pixel_key(pixel):
    return (pixel.get("row"), pixel.get("column"))


def parse_iso(value):
    if not value:
        return None
    try:
        return date.fromisoformat(value)
    except (ValueError, TypeError):
        return None


def overlap_days(start_a, end_a, start_b, end_b):
    start = max(start_a, start_b)
    end = min(end_a, end_b)
    if end < start:
        return 0
    return (end - start).days + 1


def zone1_windows(reference_year):
    return {
        "winter": {
            "emergence_start": date(reference_year - 1, 8, 15),
            "emergence_end": date(reference_year, 4, 30),
            "harvest_start": date(reference_year, 6, 1),
            "harvest_end": date(reference_year, 9, 15),
        },
        "spring": {
            "emergence_start": date(reference_year, 4, 1),
            "emergence_end": date(reference_year, 7, 1),
            "harvest_start": date(reference_year, 7, 1),
            "harvest_end": date(reference_year, 12, 1),
        },
    }


def in_range(value, start, end):
    return value is not None and start <= value <= end


def clms_label(pixel, reference_year=2023):
    emergence = parse_iso(pixel.get("emergence_date"))
    harvest = parse_iso(pixel.get("harvest_date"))

    if emergence is None or harvest is None:
        return "INSUFFICIENT_DATA"

    if harvest < emergence:
        return "INVALID_TEMPORAL_ORDER"

    duration = (harvest - emergence).days
    if duration < 40 or duration > 365:
        return "OUTSIDE_CLMS_DURATION_LIMIT"

    windows = zone1_windows(reference_year)
    w = windows["winter"]
    s = windows["spring"]

    winter_fit = (
        in_range(emergence, w["emergence_start"], w["emergence_end"])
        and in_range(harvest, w["harvest_start"], w["harvest_end"])
    )

    spring_fit = (
        in_range(emergence, s["emergence_start"], s["emergence_end"])
        and in_range(harvest, s["harvest_start"], s["harvest_end"])
    )

    if winter_fit and not spring_fit:
        return "WINTER_CYCLE_SIGNAL"

    if spring_fit and not winter_fit:
        return "SPRING_CYCLE_SIGNAL"

    if winter_fit and spring_fit:
        winter_overlap = overlap_days(
            emergence,
            harvest,
            w["emergence_start"],
            w["harvest_end"],
        )
        spring_overlap = overlap_days(
            emergence,
            harvest,
            s["emergence_start"],
            s["harvest_end"],
        )

        return (
            "SPRING_CYCLE_SIGNAL"
            if spring_overlap >= winter_overlap
            else "WINTER_CYCLE_SIGNAL"
        )

    return "NO_CLMS_MAIN_SEASON_LABEL"


def cpcsy_value(pixel):
    seasons = pixel.get("cpcsy_seasons")
    if seasons == 0:
        return "CPCSY_0"
    if seasons == 1:
        return "CPCSY_1"
    if seasons == 2:
        return "CPCSY_2"

    flag = pixel.get("cpcsy_flag")
    if flag:
        return f"FLAG:{flag}"

    label = pixel.get("cpcsy_label")
    if label:
        return label

    status = pixel.get("cpcsy_status")
    if status:
        return f"STATUS:{status}"

    return "NO_DATA"


def safe_float(value):
    try:
        if value is None:
            return None
        return float(value)
    except (ValueError, TypeError):
        return None


def numeric_summary(values):
    clean = [safe_float(v) for v in values]
    clean = [v for v in clean if v is not None]

    if not clean:
        return {
            "count": 0,
            "mean": None,
            "median": None,
            "min": None,
            "max": None,
        }

    return {
        "count": len(clean),
        "mean": round(statistics.mean(clean), 2),
        "median": round(statistics.median(clean), 2),
        "min": round(min(clean), 2),
        "max": round(max(clean), 2),
    }


def month_distribution(values):
    counter = Counter()
    for value in values:
        parsed = parse_iso(value)
        if parsed is not None:
            counter[f"{parsed.month:02d}"] += 1

    total = sum(counter.values())

    return [
        {
            "month": month,
            "count": count,
            "percent": round(count / total * 100, 2) if total else 0.0,
        }
        for month, count in sorted(counter.items())
    ]


def distribution(counter):
    total = sum(counter.values())
    return [
        {
            "value": value,
            "count": count,
            "percent": round(count / total * 100, 2) if total else 0.0,
        }
        for value, count in counter.most_common()
    ]


def classify_status(seedtrade_class, clms_class):
    seed_dir = DIRECTIONAL.get(seedtrade_class)
    clms_dir = DIRECTIONAL.get(clms_class)

    if seed_dir and clms_dir:
        if seed_dir == clms_dir:
            return "AGREE"
        return "SEEDTRADE_CLMS_CONFLICT"

    if seedtrade_class == "WEAK_SEASON_SIGNAL":
        if clms_dir == "WINTER":
            return "CLMS_WINTER_SEEDTRADE_WEAK"
        if clms_dir == "SPRING":
            return "CLMS_SPRING_SEEDTRADE_WEAK"

    if seedtrade_class == "MIXED_OR_AMBIGUOUS":
        if clms_dir == "WINTER":
            return "SEEDTRADE_AMBIGUOUS_CLMS_WINTER"
        if clms_dir == "SPRING":
            return "SEEDTRADE_AMBIGUOUS_CLMS_SPRING"

    return "OTHER"


def build_rows():
    v04_paths = find_v04()
    v09_paths = find_v09()

    rows = []

    for sid in SAMPLE_IDS:
        v04 = load_json(v04_paths[sid])
        v09 = load_json(v09_paths[sid])

        old = {
            pixel_key(p): p
            for p in v04.get("pixels", [])
        }

        for raw in v09.get("pixels", []):
            crop_code = raw.get("cty")

            if crop_code not in TARGET_CROPS:
                continue

            baseline = old.get(pixel_key(raw))
            if baseline is None:
                continue

            seedtrade_class = baseline.get("classification")
            clms_class = clms_label(raw)

            row = {
                "sample_id": sid,
                "row": raw.get("row"),
                "column": raw.get("column"),
                "cty": crop_code,
                "crop": TARGET_CROPS[crop_code],
                "seedtrade_class": seedtrade_class,
                "seedtrade_evidence_strength": baseline.get("evidence_strength"),
                "seedtrade_winter_score": baseline.get("winter_score"),
                "seedtrade_spring_score": baseline.get("spring_score"),
                "clms_class": clms_class,
                "status": classify_status(seedtrade_class, clms_class),
                "emergence_date": raw.get("emergence_date"),
                "emergence_uncertainty_days": raw.get(
                    "emergence_uncertainty_days"
                ),
                "duration_days": raw.get("duration_days"),
                "harvest_date": raw.get("harvest_date"),
                "harvest_uncertainty_days": raw.get(
                    "harvest_uncertainty_days"
                ),
                "cpcsy": cpcsy_value(raw),
                "cpcsy_seasons": raw.get("cpcsy_seasons"),
            }

            rows.append(row)

    return rows


def top_profiles(rows, limit=20):
    counter = Counter(
        (
            row["sample_id"],
            row["crop"],
            row["seedtrade_class"],
            row["clms_class"],
            row["emergence_date"],
            row["duration_days"],
            row["harvest_date"],
            row["cpcsy"],
        )
        for row in rows
    )

    return [
        {
            "count": count,
            "sample_id": profile[0],
            "crop": profile[1],
            "seedtrade_class": profile[2],
            "clms_class": profile[3],
            "emergence_date": profile[4],
            "duration_days": profile[5],
            "harvest_date": profile[6],
            "cpcsy": profile[7],
        }
        for profile, count in counter.most_common(limit)
    ]


def analyse_group(rows):
    return {
        "pixels": len(rows),
        "by_sample": distribution(
            Counter(row["sample_id"] for row in rows)
        ),
        "by_crop": distribution(
            Counter(row["crop"] for row in rows)
        ),
        "seedtrade_to_clms": distribution(
            Counter(
                f"{row['seedtrade_class']} -> {row['clms_class']}"
                for row in rows
            )
        ),
        "emergence_months": month_distribution(
            row["emergence_date"] for row in rows
        ),
        "harvest_months": month_distribution(
            row["harvest_date"] for row in rows
        ),
        "duration_days": numeric_summary(
            row["duration_days"] for row in rows
        ),
        "emergence_uncertainty_days": numeric_summary(
            row["emergence_uncertainty_days"] for row in rows
        ),
        "harvest_uncertainty_days": numeric_summary(
            row["harvest_uncertainty_days"] for row in rows
        ),
        "cpcsy": distribution(
            Counter(row["cpcsy"] for row in rows)
        ),
        "top_profiles": top_profiles(rows, 25),
    }


def print_distribution(items, indent="  "):
    for item in items:
        label = item.get("value", item.get("month"))
        print(
            f"{indent}{label}: "
            f"{item['count']:,} ({item['percent']:.2f}%)"
        )


def print_numeric(label, summary):
    print(
        f"  {label}: "
        f"n={summary['count']:,} | "
        f"mean={summary['mean']} | "
        f"median={summary['median']} | "
        f"min={summary['min']} | "
        f"max={summary['max']}"
    )


def main():
    rows = build_rows()

    conflicts = [
        row for row in rows
        if row["status"] == "SEEDTRADE_CLMS_CONFLICT"
    ]

    winter_to_spring = [
        row for row in conflicts
        if (
            row["seedtrade_class"] == "WINTER_CYCLE_SIGNAL"
            and row["clms_class"] == "SPRING_CYCLE_SIGNAL"
        )
    ]

    spring_to_winter = [
        row for row in conflicts
        if (
            row["seedtrade_class"] == "SPRING_CYCLE_SIGNAL"
            and row["clms_class"] == "WINTER_CYCLE_SIGNAL"
        )
    ]

    weak_to_winter = [
        row for row in rows
        if row["status"] == "CLMS_WINTER_SEEDTRADE_WEAK"
    ]

    weak_to_spring = [
        row for row in rows
        if row["status"] == "CLMS_SPRING_SEEDTRADE_WEAK"
    ]

    ambiguous_to_winter = [
        row for row in rows
        if row["status"] == "SEEDTRADE_AMBIGUOUS_CLMS_WINTER"
    ]

    print()
    print("=" * 78)
    print("SeedTrade.eu Season Type Conflict Diagnostics v0.1")
    print("v0.4 SeedTrade vs CLMS Zone 1 | CPCSY diagnostic only")
    print("=" * 78)

    print()
    print("TOTAL DIRECTIONAL CONFLICTS")
    print("-" * 78)
    print(f"Pixels: {len(conflicts):,}")
    print("By crop:")
    print_distribution(
        distribution(Counter(row["crop"] for row in conflicts))
    )
    print("By sample:")
    print_distribution(
        distribution(Counter(row["sample_id"] for row in conflicts))
    )
    print("Direction:")
    print_distribution(
        distribution(
            Counter(
                f"{row['seedtrade_class']} -> {row['clms_class']}"
                for row in conflicts
            )
        )
    )

    groups = {
        "WINTER_TO_SPRING": analyse_group(winter_to_spring),
        "SPRING_TO_WINTER": analyse_group(spring_to_winter),
        "WEAK_TO_CLMS_WINTER": analyse_group(weak_to_winter),
        "WEAK_TO_CLMS_SPRING": analyse_group(weak_to_spring),
        "AMBIGUOUS_TO_CLMS_WINTER": analyse_group(ambiguous_to_winter),
    }

    for title, group in groups.items():
        print()
        print("=" * 78)
        print(title)
        print("=" * 78)
        print(f"Pixels: {group['pixels']:,}")

        print("By crop:")
        print_distribution(group["by_crop"])

        print("By sample:")
        print_distribution(group["by_sample"])

        print("Emergence months:")
        print_distribution(group["emergence_months"])

        print("Harvest months:")
        print_distribution(group["harvest_months"])

        print_numeric("Duration", group["duration_days"])
        print_numeric(
            "Emergence uncertainty",
            group["emergence_uncertainty_days"],
        )
        print_numeric(
            "Harvest uncertainty",
            group["harvest_uncertainty_days"],
        )

        print("CPCSY:")
        print_distribution(group["cpcsy"])

        print("Top profiles:")
        for profile in group["top_profiles"][:10]:
            print(
                "  "
                f"{profile['count']:>5} px | "
                f"{profile['sample_id']} | "
                f"{profile['crop']} | "
                f"{profile['seedtrade_class']} -> "
                f"{profile['clms_class']} | "
                f"E={profile['emergence_date']} | "
                f"D={profile['duration_days']} | "
                f"H={profile['harvest_date']} | "
                f"{profile['cpcsy']}"
            )

    current_date = datetime.now().strftime("%Y-%m-%d")

    output_path = (
        COPERNICUS_DIR
        / (
            "PL_EAST_"
            "season_type_conflict_diagnostics_"
            "v01_"
            "2023_"
            "5samples_2000ha_"
            f"{current_date}.json"
        )
    )

    result = {
        "dataset": "SeedTrade.eu Season Type Conflict Diagnostics",
        "version": VERSION,
        "diagnostic_only": True,
        "classifier_modified": False,
        "cpcsy_role": "SEPARATE_CLMS_CROSS_LAYER_SIGNAL",
        "independence_claimed": False,
        "cpcsy_used_for_classification": False,
        "target_crop_pixels": len(rows),
        "directional_conflict_pixels": len(conflicts),
        "directional_conflict_percent": round(
            len(conflicts) / len(rows) * 100, 2
        ) if rows else 0.0,
        "directional_conflicts_by_crop": distribution(
            Counter(row["crop"] for row in conflicts)
        ),
        "directional_conflicts_by_sample": distribution(
            Counter(row["sample_id"] for row in conflicts)
        ),
        "groups": groups,
        "scientific_note": (
            "This diagnostic decomposes SeedTrade v0.4 vs CLMS Zone 1 "
            "disagreements. It does not establish which layer is correct. "
            "CPCSY is used only as a separate CLMS cross-layer signal and "
            "does not identify winter versus spring."
        ),
    }

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(result, f, indent=2, ensure_ascii=False)

    print()
    print("=" * 78)
    print("CONFLICT DIAGNOSTICS COMPLETE")
    print("=" * 78)
    print("No classifier rules were changed.")
    print("JSON saved to:")
    print(output_path)


if __name__ == "__main__":
    main()
