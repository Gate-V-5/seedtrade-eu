
"""
SeedTrade.eu
Season Type Diagnostics v0.2

Cross-sample diagnostics for Season Type Classifier v0.4.

Purpose
-------
Read all five PL_EAST v0.4 classifier sample JSON files (S01-S05)
and compare seasonal-cycle behavior across samples.

This script does NOT reclassify pixels and does NOT alter the classifier.

It reports:
- classification proportions by sample and crop
- emergence month distributions
- duration distributions
- harvest month distributions
- uncertainty statistics
- valid-data completeness
- top emergence-month x duration-band x harvest-month combinations
- cross-sample stability summaries
- anomaly flags for strongly divergent samples

Percentages are descriptive pixel proportions, not probabilities.
"""

import json
from collections import Counter, defaultdict
from datetime import datetime
from pathlib import Path
from statistics import mean, median


PROJECT_ROOT = Path(__file__).resolve().parents[2]

COPERNICUS_DIR = (
    PROJECT_ROOT
    / "data"
    / "raw"
    / "copernicus"
)

DIAGNOSTICS_VERSION = "0.2"

TARGET_CROPS = {
    1110: "Wheat",
    1120: "Barley",
    1150: "Other cereals",
    1430: "Rapeseed",
}

TARGET_CLASSES = (
    "WINTER_CYCLE_SIGNAL",
    "SPRING_CYCLE_SIGNAL",
    "WEAK_SEASON_SIGNAL",
    "MIXED_OR_AMBIGUOUS",
    "INSUFFICIENT_DATA",
)

DURATION_BUCKETS = (
    ("<90", None, 89),
    ("90-119", 90, 119),
    ("120-149", 120, 149),
    ("150-179", 150, 179),
    ("180-209", 180, 209),
    ("210-239", 210, 239),
    ("240-269", 240, 269),
    ("270-299", 270, 299),
    ("300+", 300, None),
)

MONTH_LABELS = {
    1: "Jan",
    2: "Feb",
    3: "Mar",
    4: "Apr",
    5: "May",
    6: "Jun",
    7: "Jul",
    8: "Aug",
    9: "Sep",
    10: "Oct",
    11: "Nov",
    12: "Dec",
}


def load_json(path):
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def find_latest_v04_sample_jsons():
    files = sorted(
        COPERNICUS_DIR.glob(
            "*season_type_classifier_v04_*_S??_2km_400ha_test_*.json"
        ),
        key=lambda x: x.name,
    )

    latest = {}

    for path in files:
        for sid in ("S01", "S02", "S03", "S04", "S05"):
            if f"_{sid}_" in path.name:
                latest[sid] = path
                break

    ordered = [
        latest[sid]
        for sid in ("S01", "S02", "S03", "S04", "S05")
        if sid in latest
    ]

    if len(ordered) != 5:
        raise FileNotFoundError(
            f"Expected 5 v0.4 sample JSON files, found {len(ordered)}."
        )

    return ordered


def parse_date(value):
    if not value:
        return None

    try:
        return datetime.fromisoformat(value)
    except (ValueError, TypeError):
        return None


def safe_mean(values):
    values = [v for v in values if v is not None]
    return round(mean(values), 1) if values else None


def safe_median(values):
    values = [v for v in values if v is not None]
    return round(median(values), 1) if values else None


def safe_min(values):
    values = [v for v in values if v is not None]
    return min(values) if values else None


def safe_max(values):
    values = [v for v in values if v is not None]
    return max(values) if values else None


def month_of(value):
    d = parse_date(value)
    return d.month if d else None


def duration_bucket(value):
    if value is None:
        return "NO_DATA"

    for label, low, high in DURATION_BUCKETS:
        if low is None and value <= high:
            return label
        if high is None and value >= low:
            return label
        if low is not None and high is not None and low <= value <= high:
            return label

    return "OTHER"


def month_distribution(rows, field):
    counter = Counter()
    valid = 0

    for row in rows:
        m = month_of(row.get(field))
        if m is None:
            continue
        valid += 1
        counter[m] += 1

    result = []

    for m in range(1, 13):
        if counter[m] == 0:
            continue

        result.append({
            "month": m,
            "label": MONTH_LABELS[m],
            "count": counter[m],
            "percent": round(counter[m] / valid * 100, 2) if valid else 0.0,
        })

    return {
        "valid": valid,
        "months": result,
    }


def duration_distribution(rows):
    counter = Counter()
    values = []

    for row in rows:
        value = row.get("duration_days")
        if value is not None:
            values.append(value)
        counter[duration_bucket(value)] += 1

    total = len(rows)

    order = [x[0] for x in DURATION_BUCKETS] + ["NO_DATA", "OTHER"]

    buckets = []

    for label in order:
        count = counter.get(label, 0)

        if count == 0:
            continue

        buckets.append({
            "bucket": label,
            "count": count,
            "percent": round(count / total * 100, 2) if total else 0.0,
        })

    return {
        "valid": len(values),
        "mean": safe_mean(values),
        "median": safe_median(values),
        "min": safe_min(values),
        "max": safe_max(values),
        "buckets": buckets,
    }


def uncertainty_summary(rows, field):
    values = [
        row.get(field)
        for row in rows
        if row.get(field) is not None
    ]

    return {
        "valid": len(values),
        "mean": safe_mean(values),
        "median": safe_median(values),
        "min": safe_min(values),
        "max": safe_max(values),
    }


def top_combinations(rows, limit=10):
    counter = Counter()

    for row in rows:
        em = month_of(row.get("emergence_date"))
        hm = month_of(row.get("harvest_date"))
        db = duration_bucket(row.get("duration_days"))

        key = (
            MONTH_LABELS.get(em, "NO_DATA"),
            db,
            MONTH_LABELS.get(hm, "NO_DATA"),
        )

        counter[key] += 1

    total = len(rows)

    result = []

    for (em, db, hm), count in counter.most_common(limit):
        result.append({
            "emergence_month": em,
            "duration_bucket": db,
            "harvest_month": hm,
            "count": count,
            "percent": round(count / total * 100, 2) if total else 0.0,
        })

    return result


def analyze_class(rows):
    return {
        "pixels": len(rows),
        "emergence_months": month_distribution(rows, "emergence_date"),
        "duration": duration_distribution(rows),
        "harvest_months": month_distribution(rows, "harvest_date"),
        "emergence_uncertainty": uncertainty_summary(
            rows,
            "emergence_uncertainty_days",
        ),
        "harvest_uncertainty": uncertainty_summary(
            rows,
            "harvest_uncertainty_days",
        ),
        "top_combinations": top_combinations(rows),
    }


def analyze_crop(pixels, crop_code):
    rows = [r for r in pixels if r.get("cty") == crop_code]

    by_class = defaultdict(list)

    for row in rows:
        by_class[row.get("classification")].append(row)

    classification_counts = Counter(
        row.get("classification")
        for row in rows
    )

    classes = {}

    for cls in TARGET_CLASSES:
        cls_rows = by_class.get(cls, [])
        if cls_rows:
            classes[cls] = analyze_class(cls_rows)

    return {
        "crop_code": crop_code,
        "crop": TARGET_CROPS[crop_code],
        "pixels": len(rows),
        "area_ha": round(len(rows) * 0.01, 2),
        "classification_counts": dict(classification_counts),
        "classes": classes,
    }


def percentage(count, total):
    return round(count / total * 100, 2) if total else 0.0


def build_cross_sample_table(sample_results):
    crops = {}

    for crop_code, crop_name in TARGET_CROPS.items():
        crop_item = {
            "crop_code": crop_code,
            "crop": crop_name,
            "samples": {},
        }

        for sample in sample_results:
            sid = sample["sample_id"]
            crop = next(
                (
                    item
                    for item in sample["crops"]
                    if item["crop_code"] == crop_code
                ),
                None,
            )

            if crop is None:
                crop_item["samples"][sid] = {
                    "pixels": 0,
                    "area_ha": 0.0,
                    "winter_percent": 0.0,
                    "spring_percent": 0.0,
                    "weak_percent": 0.0,
                    "mixed_percent": 0.0,
                    "insufficient_percent": 0.0,
                }
                continue

            total = crop["pixels"]
            counts = crop["classification_counts"]

            crop_item["samples"][sid] = {
                "pixels": total,
                "area_ha": crop["area_ha"],
                "winter_percent": percentage(
                    counts.get("WINTER_CYCLE_SIGNAL", 0),
                    total,
                ),
                "spring_percent": percentage(
                    counts.get("SPRING_CYCLE_SIGNAL", 0),
                    total,
                ),
                "weak_percent": percentage(
                    counts.get("WEAK_SEASON_SIGNAL", 0),
                    total,
                ),
                "mixed_percent": percentage(
                    counts.get("MIXED_OR_AMBIGUOUS", 0),
                    total,
                ),
                "insufficient_percent": percentage(
                    counts.get("INSUFFICIENT_DATA", 0),
                    total,
                ),
            }

        crops[crop_code] = crop_item

    return crops


def build_stability_summary(cross_sample_table):
    result = {}

    for crop_code, crop in cross_sample_table.items():
        winter_values = [
            s["winter_percent"]
            for s in crop["samples"].values()
            if s["pixels"] > 0
        ]

        spring_values = [
            s["spring_percent"]
            for s in crop["samples"].values()
            if s["pixels"] > 0
        ]

        weak_values = [
            s["weak_percent"]
            for s in crop["samples"].values()
            if s["pixels"] > 0
        ]

        insufficient_values = [
            s["insufficient_percent"]
            for s in crop["samples"].values()
            if s["pixels"] > 0
        ]

        result[crop_code] = {
            "crop": crop["crop"],
            "sample_count_with_crop": len(winter_values),
            "winter_percent_range": [
                safe_min(winter_values),
                safe_max(winter_values),
            ],
            "spring_percent_range": [
                safe_min(spring_values),
                safe_max(spring_values),
            ],
            "weak_percent_range": [
                safe_min(weak_values),
                safe_max(weak_values),
            ],
            "insufficient_percent_range": [
                safe_min(insufficient_values),
                safe_max(insufficient_values),
            ],
        }

    return result


def detect_anomalies(sample_results):
    anomalies = []

    for sample in sample_results:
        sid = sample["sample_id"]

        for crop in sample["crops"]:
            total = crop["pixels"]

            if total == 0:
                continue

            counts = crop["classification_counts"]

            weak = percentage(
                counts.get("WEAK_SEASON_SIGNAL", 0),
                total,
            )

            insufficient = percentage(
                counts.get("INSUFFICIENT_DATA", 0),
                total,
            )

            mixed = percentage(
                counts.get("MIXED_OR_AMBIGUOUS", 0),
                total,
            )

            if weak >= 50:
                anomalies.append({
                    "sample_id": sid,
                    "crop": crop["crop"],
                    "type": "HIGH_WEAK_SHARE",
                    "value_percent": weak,
                })

            if insufficient >= 50:
                anomalies.append({
                    "sample_id": sid,
                    "crop": crop["crop"],
                    "type": "HIGH_INSUFFICIENT_SHARE",
                    "value_percent": insufficient,
                })

            if mixed >= 20:
                anomalies.append({
                    "sample_id": sid,
                    "crop": crop["crop"],
                    "type": "HIGH_MIXED_SHARE",
                    "value_percent": mixed,
                })

    return anomalies


def print_class_detail(class_name, data):
    print(f"      {class_name}: {data['pixels']:,} px")

    em = data["emergence_months"]
    if em["valid"]:
        months = ", ".join(
            f"{x['label']} {x['percent']:.1f}%"
            for x in em["months"]
        )
        print(f"        emergence: {months}")

    duration = data["duration"]
    print(
        f"        duration: mean={duration['mean']} d | "
        f"median={duration['median']} | "
        f"min={duration['min']} | max={duration['max']}"
    )

    hm = data["harvest_months"]
    if hm["valid"]:
        months = ", ".join(
            f"{x['label']} {x['percent']:.1f}%"
            for x in hm["months"]
        )
        print(f"        harvest: {months}")

    eu = data["emergence_uncertainty"]
    hu = data["harvest_uncertainty"]

    print(
        f"        uncertainty: emergence mean={eu['mean']} d | "
        f"harvest mean={hu['mean']} d"
    )

    if data["top_combinations"]:
        print("        top combinations:")

        for combo in data["top_combinations"][:5]:
            print(
                f"          {combo['emergence_month']} | "
                f"{combo['duration_bucket']} d | "
                f"{combo['harvest_month']} "
                f"→ {combo['count']:,} px "
                f"({combo['percent']:.1f}%)"
            )


def print_result(sample_results, cross_sample_table, anomalies):
    print()
    print("=" * 64)
    print("SeedTrade.eu Season Type Diagnostics v0.2")
    print("PL_EAST | 5-sample cross-sample diagnostics")
    print("=" * 64)

    for sample in sample_results:
        print()
        print("-" * 64)
        print(f"{sample['sample_id']} | {sample['source']}")
        print("-" * 64)

        for crop in sample["crops"]:
            if crop["pixels"] == 0:
                continue

            print()
            print(
                f"  {crop['crop']} (CTY {crop['crop_code']}) | "
                f"{crop['pixels']:,} px | {crop['area_ha']:.2f} ha"
            )

            for cls in (
                "WINTER_CYCLE_SIGNAL",
                "SPRING_CYCLE_SIGNAL",
                "WEAK_SEASON_SIGNAL",
            ):
                if cls in crop["classes"]:
                    print_class_detail(
                        cls,
                        crop["classes"][cls],
                    )

    print()
    print("=" * 64)
    print("CROSS-SAMPLE COMPARISON")
    print("=" * 64)

    for crop_code, crop in cross_sample_table.items():
        print()
        print(f"{crop['crop']} (CTY {crop_code})")

        header = (
            "  Sample | Pixels | Winter% | Spring% | Weak% | "
            "Mixed% | Insuff%"
        )

        print(header)

        for sid, row in crop["samples"].items():
            print(
                f"  {sid:<6} | "
                f"{row['pixels']:>6,} | "
                f"{row['winter_percent']:>7.2f} | "
                f"{row['spring_percent']:>7.2f} | "
                f"{row['weak_percent']:>5.2f} | "
                f"{row['mixed_percent']:>6.2f} | "
                f"{row['insufficient_percent']:>7.2f}"
            )

    print()
    print("=" * 64)
    print("ANOMALIES")
    print("=" * 64)

    if not anomalies:
        print("No threshold-based anomalies detected.")
    else:
        for item in anomalies:
            print(
                f"{item['sample_id']} | "
                f"{item['crop']} | "
                f"{item['type']} | "
                f"{item['value_percent']:.2f}%"
            )

    print()
    print("=" * 64)
    print("IMPORTANT")
    print("=" * 64)
    print(
        "This script does not reclassify pixels. It diagnoses the "
        "existing v0.4 output only."
    )
    print(
        "Percentages are pixel proportions, not probabilities."
    )


def save_output(
    sample_results,
    cross_sample_table,
    stability_summary,
    anomalies,
):
    current_date = datetime.now().strftime("%Y-%m-%d")

    path = (
        COPERNICUS_DIR
        / (
            "PL_EAST_"
            "season_type_diagnostics_"
            "v02_"
            "2023_"
            "5samples_2000ha_"
            f"{current_date}.json"
        )
    )

    result = {
        "dataset":
            "SeedTrade.eu Season Type Diagnostics Cross-Sample",

        "version":
            DIAGNOSTICS_VERSION,

        "region_code":
            "PL_EAST",

        "year":
            2023,

        "sample_count":
            len(sample_results),

        "diagnostic_only":
            True,

        "classifier_modified":
            False,

        "probabilities_generated":
            False,

        "sample_results":
            sample_results,

        "cross_sample_table":
            cross_sample_table,

        "stability_summary":
            stability_summary,

        "anomalies":
            anomalies,
    }

    with open(
        path,
        "w",
        encoding="utf-8",
    ) as f:
        json.dump(
            result,
            f,
            indent=2,
            ensure_ascii=False,
        )

    return path


def main():
    source_paths = find_latest_v04_sample_jsons()

    sample_results = []

    for source_path in source_paths:
        data = load_json(source_path)

        sample_id = data.get("sample_id")

        if not sample_id:
            raise ValueError(
                f"sample_id missing from {source_path}"
            )

        pixels = data.get("pixels", [])

        crops = []

        for crop_code in TARGET_CROPS:
            crops.append(
                analyze_crop(
                    pixels,
                    crop_code,
                )
            )

        sample_results.append({
            "sample_id": sample_id,
            "source": str(source_path),
            "crops": crops,
        })

    cross_sample_table = build_cross_sample_table(
        sample_results
    )

    stability_summary = build_stability_summary(
        cross_sample_table
    )

    anomalies = detect_anomalies(
        sample_results
    )

    print_result(
        sample_results,
        cross_sample_table,
        anomalies,
    )

    output_path = save_output(
        sample_results,
        cross_sample_table,
        stability_summary,
        anomalies,
    )

    print()
    print("JSON saved to:")
    print(output_path)


if __name__ == "__main__":
    main()
