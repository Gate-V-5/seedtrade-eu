"""
SeedTrade.eu
Season Type Evidence Audit v0.1

Purpose
-------
Explain WHY SeedTrade Season Type Classifier v0.4 produced its labels for the
pixels that conflict with the CLMS Zone 1 seasonal-rule layer.

Primary focus
-------------
1. The 5,222 directional conflicts:
       SeedTrade SPRING -> CLMS WINTER
2. SeedTrade WEAK -> CLMS WINTER
3. SeedTrade MIXED/AMBIGUOUS -> CLMS WINTER

This script reads:
- v0.4 per-sample classifier JSON
- v0.9 CPCSY pixel-intelligence JSON

It reproduces the CLMS Zone 1 label only for diagnostic comparison.

No classifier rules are changed.

Scientific constraints
----------------------
- CPCSY is a separate CLMS cross-layer signal only.
- CPCSY is NOT used to classify winter vs spring.
- CPMCDCL is NOT used for weighting.
- Pixel percentages are descriptive, not probabilities or acreage estimates.
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


def get_evidence_list(pixel):
    candidates = (
        "evidence",
        "evidence_rows",
        "score_evidence",
        "evidence_components",
        "components",
        "rule_evidence",
    )

    for field in candidates:
        value = pixel.get(field)
        if isinstance(value, list):
            return value

    return []


def evidence_type(item):
    for key in (
        "evidence_type",
        "type",
        "component",
        "rule",
        "name",
        "signal",
    ):
        value = item.get(key)
        if value:
            return str(value)

    return "UNKNOWN"


def evidence_direction(item):
    for key in (
        "direction",
        "season",
        "side",
        "classification",
        "target",
    ):
        value = item.get(key)
        if value:
            text = str(value).upper()
            if "WINTER" in text:
                return "WINTER"
            if "SPRING" in text:
                return "SPRING"
            if "NEUTRAL" in text:
                return "NEUTRAL"
            return text

    return "UNKNOWN"


def evidence_weight(item):
    for key in (
        "weighted_score",
        "weighted_value",
        "score",
        "weight",
        "contribution",
        "value",
    ):
        value = item.get(key)
        if isinstance(value, (int, float)):
            return float(value)

    return None


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
        "mean": round(statistics.mean(clean), 3),
        "median": round(statistics.median(clean), 3),
        "min": round(min(clean), 3),
        "max": round(max(clean), 3),
    }


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


def extract_evidence_summary(pixel):
    evidence = get_evidence_list(pixel)

    winter_total = 0.0
    spring_total = 0.0
    neutral_total = 0.0

    by_type_direction = Counter()
    raw_rows = []

    for item in evidence:
        etype = evidence_type(item)
        direction = evidence_direction(item)
        weight = evidence_weight(item)

        by_type_direction[(etype, direction)] += 1

        if weight is not None:
            if direction == "WINTER":
                winter_total += weight
            elif direction == "SPRING":
                spring_total += weight
            elif direction == "NEUTRAL":
                neutral_total += weight

        raw_rows.append({
            "type": etype,
            "direction": direction,
            "weight": weight,
            "raw": item,
        })

    return {
        "evidence_count": len(evidence),
        "winter_weight_total_from_rows": round(winter_total, 3),
        "spring_weight_total_from_rows": round(spring_total, 3),
        "neutral_weight_total_from_rows": round(neutral_total, 3),
        "by_type_direction": [
            {
                "type": etype,
                "direction": direction,
                "count": count,
            }
            for (etype, direction), count
            in by_type_direction.most_common()
        ],
        "rows": raw_rows,
    }


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

            evidence = extract_evidence_summary(baseline)

            rows.append({
                "sample_id": sid,
                "row": raw.get("row"),
                "column": raw.get("column"),
                "cty": crop_code,
                "crop": TARGET_CROPS[crop_code],

                "seedtrade_class": seedtrade_class,
                "seedtrade_evidence_strength":
                    baseline.get("evidence_strength"),

                "seedtrade_winter_score":
                    safe_float(baseline.get("winter_score")),

                "seedtrade_spring_score":
                    safe_float(baseline.get("spring_score")),

                "seedtrade_score_difference":
                    safe_float(baseline.get("score_difference")),

                "seedtrade_core_data_count":
                    baseline.get("core_data_count"),

                "clms_class": clms_class,

                "emergence_date":
                    raw.get("emergence_date"),

                "emergence_uncertainty_days":
                    raw.get("emergence_uncertainty_days"),

                "duration_days":
                    raw.get("duration_days"),

                "harvest_date":
                    raw.get("harvest_date"),

                "harvest_uncertainty_days":
                    raw.get("harvest_uncertainty_days"),

                "cpcsy_seasons":
                    raw.get("cpcsy_seasons"),

                "evidence":
                    evidence,
            })

    return rows


def classify_group(row):
    seed = row["seedtrade_class"]
    clms = row["clms_class"]

    if (
        seed == "SPRING_CYCLE_SIGNAL"
        and clms == "WINTER_CYCLE_SIGNAL"
    ):
        return "SPRING_TO_WINTER"

    if (
        seed == "WINTER_CYCLE_SIGNAL"
        and clms == "SPRING_CYCLE_SIGNAL"
    ):
        return "WINTER_TO_SPRING"

    if (
        seed == "WEAK_SEASON_SIGNAL"
        and clms == "WINTER_CYCLE_SIGNAL"
    ):
        return "WEAK_TO_CLMS_WINTER"

    if (
        seed == "WEAK_SEASON_SIGNAL"
        and clms == "SPRING_CYCLE_SIGNAL"
    ):
        return "WEAK_TO_CLMS_SPRING"

    if (
        seed == "MIXED_OR_AMBIGUOUS"
        and clms == "WINTER_CYCLE_SIGNAL"
    ):
        return "AMBIGUOUS_TO_CLMS_WINTER"

    return "OTHER"


def aggregate_evidence_types(rows):
    type_direction_counter = Counter()

    for row in rows:
        for item in row["evidence"]["rows"]:
            type_direction_counter[
                (item["type"], item["direction"])
            ] += 1

    return [
        {
            "type": etype,
            "direction": direction,
            "count": count,
        }
        for (etype, direction), count
        in type_direction_counter.most_common()
    ]


def aggregate_weight_totals(rows):
    winter = [
        row["evidence"]["winter_weight_total_from_rows"]
        for row in rows
    ]

    spring = [
        row["evidence"]["spring_weight_total_from_rows"]
        for row in rows
    ]

    neutral = [
        row["evidence"]["neutral_weight_total_from_rows"]
        for row in rows
    ]

    return {
        "winter": numeric_summary(winter),
        "spring": numeric_summary(spring),
        "neutral": numeric_summary(neutral),
    }


def top_profiles(rows, limit=20):
    counter = Counter(
        (
            row["sample_id"],
            row["crop"],
            row["emergence_date"],
            row["duration_days"],
            row["harvest_date"],
            row["seedtrade_winter_score"],
            row["seedtrade_spring_score"],
            row["seedtrade_evidence_strength"],
            row["cpcsy_seasons"],
        )
        for row in rows
    )

    return [
        {
            "count": count,
            "sample_id": profile[0],
            "crop": profile[1],
            "emergence_date": profile[2],
            "duration_days": profile[3],
            "harvest_date": profile[4],
            "winter_score": profile[5],
            "spring_score": profile[6],
            "evidence_strength": profile[7],
            "cpcsy_seasons": profile[8],
        }
        for profile, count
        in counter.most_common(limit)
    ]


def analyse_group(rows):
    return {
        "pixels": len(rows),

        "by_crop":
            distribution(Counter(row["crop"] for row in rows)),

        "by_sample":
            distribution(Counter(row["sample_id"] for row in rows)),

        "emergence_months":
            month_distribution(row["emergence_date"] for row in rows),

        "harvest_months":
            month_distribution(row["harvest_date"] for row in rows),

        "duration_days":
            numeric_summary(row["duration_days"] for row in rows),

        "emergence_uncertainty_days":
            numeric_summary(
                row["emergence_uncertainty_days"]
                for row in rows
            ),

        "harvest_uncertainty_days":
            numeric_summary(
                row["harvest_uncertainty_days"]
                for row in rows
            ),

        "winter_scores":
            numeric_summary(
                row["seedtrade_winter_score"]
                for row in rows
            ),

        "spring_scores":
            numeric_summary(
                row["seedtrade_spring_score"]
                for row in rows
            ),

        "score_differences":
            numeric_summary(
                row["seedtrade_score_difference"]
                for row in rows
            ),

        "evidence_strength":
            distribution(
                Counter(
                    row["seedtrade_evidence_strength"]
                    for row in rows
                )
            ),

        "core_data_count":
            distribution(
                Counter(
                    row["seedtrade_core_data_count"]
                    for row in rows
                )
            ),

        "cpcsy_seasons":
            distribution(
                Counter(
                    row["cpcsy_seasons"]
                    for row in rows
                )
            ),

        "evidence_type_direction":
            aggregate_evidence_types(rows),

        "evidence_weight_totals_from_rows":
            aggregate_weight_totals(rows),

        "top_profiles":
            top_profiles(rows, 25),
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


def print_group(title, group):
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

    print_numeric(
        "SeedTrade winter score",
        group["winter_scores"],
    )
    print_numeric(
        "SeedTrade spring score",
        group["spring_scores"],
    )
    print_numeric(
        "SeedTrade score difference",
        group["score_differences"],
    )

    print("Evidence strength:")
    print_distribution(group["evidence_strength"])

    print("Core data count:")
    print_distribution(group["core_data_count"])

    print("CPCSY seasons:")
    print_distribution(group["cpcsy_seasons"])

    print("Evidence row types/directions:")
    for item in group["evidence_type_direction"][:20]:
        print(
            f"  {item['type']} | "
            f"{item['direction']}: "
            f"{item['count']:,}"
        )

    print("Top profiles:")
    for profile in group["top_profiles"][:10]:
        print(
            "  "
            f"{profile['count']:>5} px | "
            f"{profile['sample_id']} | "
            f"{profile['crop']} | "
            f"E={profile['emergence_date']} | "
            f"D={profile['duration_days']} | "
            f"H={profile['harvest_date']} | "
            f"W={profile['winter_score']} | "
            f"S={profile['spring_score']} | "
            f"strength={profile['evidence_strength']} | "
            f"CPCSY={profile['cpcsy_seasons']}"
        )


def main():
    rows = build_rows()

    groups_raw = defaultdict(list)

    for row in rows:
        groups_raw[classify_group(row)].append(row)

    ordered_groups = (
        "SPRING_TO_WINTER",
        "WINTER_TO_SPRING",
        "WEAK_TO_CLMS_WINTER",
        "WEAK_TO_CLMS_SPRING",
        "AMBIGUOUS_TO_CLMS_WINTER",
    )

    groups = {
        name: analyse_group(groups_raw[name])
        for name in ordered_groups
    }

    print()
    print("=" * 78)
    print("SeedTrade.eu Season Type Evidence Audit v0.1")
    print("Why v0.4 disagrees with CLMS Zone 1")
    print("=" * 78)

    for name in ordered_groups:
        print_group(name, groups[name])

    current_date = datetime.now().strftime("%Y-%m-%d")

    output_path = (
        COPERNICUS_DIR
        / (
            "PL_EAST_"
            "season_type_evidence_audit_"
            "v01_"
            "2023_"
            "5samples_2000ha_"
            f"{current_date}.json"
        )
    )

    result = {
        "dataset":
            "SeedTrade.eu Season Type Evidence Audit",

        "version":
            VERSION,

        "diagnostic_only":
            True,

        "classifier_modified":
            False,

        "cpcsy_role":
            "SEPARATE_CLMS_CROSS_LAYER_SIGNAL",

        "independence_claimed":
            False,

        "cpcsy_used_for_classification":
            False,

        "groups":
            groups,

        "scientific_note":
            (
                "This audit explains the evidence structure behind "
                "SeedTrade v0.4 labels that disagree with the CLMS "
                "Zone 1 seasonal-rule layer. It does not determine "
                "which layer is agronomically correct."
            ),
    }

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(result, f, indent=2, ensure_ascii=False)

    print()
    print("=" * 78)
    print("EVIDENCE AUDIT COMPLETE")
    print("=" * 78)
    print("No classifier rules were changed.")
    print("JSON saved to:")
    print(output_path)


if __name__ == "__main__":
    main()
