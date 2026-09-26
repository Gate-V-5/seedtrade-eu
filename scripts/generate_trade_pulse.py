#!/usr/bin/env python3
"""Generate the PUBLIC_SAFE EU Seed Trade Pulse from verified COMEXT rows."""

from __future__ import annotations

import argparse
import collections
import hashlib
import json
import math
from pathlib import Path


EU27 = {
    "AT", "BE", "BG", "HR", "CY", "CZ", "DE", "DK", "EE", "ES", "FI",
    "FR", "GR", "EL", "HU", "IE", "IT", "LT", "LU", "LV", "MT", "NL",
    "PL", "PT", "RO", "SE", "SI", "SK",
}
VIEW_DEFINITIONS = {
    "eu_internal_trade": "Exporter-reported dispatches where both reporter and partner are EU-27 members; each reported export flow is counted once and mirror import declarations are excluded.",
    "eu_imports": "Reporter-declared EU-27 imports from partners outside the EU-27; EU internal movements and aggregate/special partner codes are excluded.",
    "eu_exports": "Reporter-declared EU-27 exports to partners outside the EU-27; EU internal movements and aggregate/special partner codes are excluded.",
}
VIEW_LABELS = {
    "eu_internal_trade": "EU Internal Trade",
    "eu_imports": "EU Imports",
    "eu_exports": "EU Exports",
}
UNIT_VALUE_RANGE_MIN_TONNES = 100.0
UNIT_VALUE_RANGE_MIN_OBSERVATIONS = 2


def previous_year(period: str) -> str:
    return f"{int(period[:4]) - 1}{period[4:]}"


def shift_month(period: str, delta: int) -> str:
    year, month = map(int, period.split("-"))
    value = year * 12 + month - 1 + delta
    return f"{value // 12:04d}-{value % 12 + 1:02d}"


def safe_round(value: float | None, digits: int = 2):
    return None if value is None else round(value, digits)


def metric(bucket: dict) -> dict:
    kg = bucket.get("kg", 0.0)
    eur = bucket.get("eur", 0.0)
    return {
        "volume_tonnes": safe_round(kg / 1000, 2),
        "trade_value_eur": safe_round(eur, 2),
        "unit_value_eur_kg": safe_round(eur / kg, 4) if kg > 0 else None,
        "observation_count": int(bucket.get("rows", 0)),
        "cn_code_count": len(bucket.get("codes", set())),
    }


def unit_value_range(species_monthly: dict, market_crops: list[dict], view: str, period: str) -> dict:
    eligible = []
    for crop in market_crops:
        point = metric(species_monthly[(crop["slug"], view)][period])
        unit_value = point["unit_value_eur_kg"]
        if (
            point["volume_tonnes"] < UNIT_VALUE_RANGE_MIN_TONNES
            or point["observation_count"] < UNIT_VALUE_RANGE_MIN_OBSERVATIONS
            or unit_value is None
            or not math.isfinite(unit_value)
            or unit_value <= 0
        ):
            continue
        eligible.append({
            "slug": crop["slug"],
            "category": crop["crop"],
            "volume_tonnes": point["volume_tonnes"],
            "observation_count": point["observation_count"],
            "unit_value_eur_kg": unit_value,
        })
    eligible.sort(key=lambda item: (item["unit_value_eur_kg"], item["slug"]))
    rule = (
        "Category-level aggregate for the same completed month; at least "
        f"{int(UNIT_VALUE_RANGE_MIN_TONNES)} tonnes and {UNIT_VALUE_RANGE_MIN_OBSERVATIONS} verified observations "
        "with positive net weight and trade value. Review-only, ambiguous and partial-period rows are excluded."
    )
    if len(eligible) < 2:
        return {"status": "INSUFFICIENT_EVIDENCE", "period": period, "eligible_category_count": len(eligible), "rule": rule}
    return {
        "status": "VERIFIED",
        "period": period,
        "eligible_category_count": len(eligible),
        "low": eligible[0],
        "high": eligible[-1],
        "rule": rule,
    }


def yoy(current: float | None, prior: float | None):
    if current is None or prior is None or prior <= 0:
        return None
    return round((current / prior - 1) * 100, 2)


def activity_state(latest: dict, prior: dict | None) -> dict:
    if (
        not prior
        or latest["observation_count"] < 20
        or prior["observation_count"] < 20
        or latest["cn_code_count"] < 6
        or prior["cn_code_count"] < 6
        or latest["volume_tonnes"] <= 0
        or prior["volume_tonnes"] <= 0
    ):
        return {"state": "INSUFFICIENT_EVIDENCE", "rule": "At least 20 observations and 6 eligible CN codes are required in both comparison months."}
    change = yoy(latest["volume_tonnes"], prior["volume_tonnes"])
    state = "HIGH" if change >= 15 else "LOW" if change <= -15 else "NORMAL"
    return {"state": state, "rule": "HIGH at volume YoY >= +15%; LOW at <= -15%; otherwise NORMAL. This is descriptive, not a forecast."}


def classify(row: dict) -> str | None:
    reporter, partner, flow = row.get("reporter"), row.get("partner"), row.get("reporting_flow")
    if reporter not in EU27 or not isinstance(partner, str) or len(partner) != 2 or not partner.isalpha():
        return None
    if flow == "EXPORT" and partner in EU27:
        return "eu_internal_trade"
    if flow == "IMPORT" and partner not in EU27:
        return "eu_imports"
    if flow == "EXPORT" and partner not in EU27:
        return "eu_exports"
    return None


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--normalized", required=True)
    parser.add_argument("--market", required=True)
    parser.add_argument("--output", required=True)
    args = parser.parse_args()

    normalized = Path(args.normalized)
    market = json.loads(Path(args.market).read_text())
    latest = market["latest_completed_period"]
    partial = market["latest_available_period"]
    allowed = {str(crop["cn8"]): crop for crop in market["crops"]}
    monthly = {view: collections.defaultdict(lambda: {"kg": 0.0, "eur": 0.0, "rows": 0, "codes": set()}) for view in VIEW_DEFINITIONS}
    species_monthly = collections.defaultdict(lambda: collections.defaultdict(lambda: {"kg": 0.0, "eur": 0.0, "rows": 0, "codes": set()}))
    accepted = rejected_partial = 0

    with normalized.open() as handle:
        for line in handle:
            row = json.loads(line)
            if row.get("classification") != "PUBLIC_SAFE" or row.get("mapping_status") != "VERIFIED" or str(row.get("cn8")) not in allowed:
                continue
            if row["period"] > latest:
                rejected_partial += 1
                continue
            view = classify(row)
            if not view:
                continue
            accepted += 1
            bucket = monthly[view][row["period"]]
            bucket["kg"] += float(row.get("net_weight_kg") or 0)
            bucket["eur"] += float(row.get("trade_value_eur") or 0)
            bucket["rows"] += 1
            bucket["codes"].add(str(row["cn8"]))
            slug = allowed[str(row["cn8"])]["slug"]
            sb = species_monthly[(slug, view)][row["period"]]
            sb["kg"] += float(row.get("net_weight_kg") or 0)
            sb["eur"] += float(row.get("trade_value_eur") or 0)
            sb["rows"] += 1
            sb["codes"].add(str(row["cn8"]))

    periods = [shift_month(latest, offset) for offset in range(-11, 1)]
    views = {}
    for key, definition in VIEW_DEFINITIONS.items():
        history = []
        for period in periods:
            point = metric(monthly[key][period])
            point["period"] = period
            prior_point = metric(monthly[key][previous_year(period)])
            point["volume_yoy_percent"] = yoy(point["volume_tonnes"], prior_point["volume_tonnes"])
            point["value_yoy_percent"] = yoy(point["trade_value_eur"], prior_point["trade_value_eur"])
            history.append(point)
        current = metric(monthly[key][latest])
        prior = metric(monthly[key][previous_year(latest)])
        current.update({
            "period": latest,
            "volume_yoy_percent": yoy(current["volume_tonnes"], prior["volume_tonnes"]),
            "value_yoy_percent": yoy(current["trade_value_eur"], prior["trade_value_eur"]),
            "unit_value_yoy_percent": yoy(current["unit_value_eur_kg"], prior["unit_value_eur_kg"]),
        })
        views[key] = {
            "label": VIEW_LABELS[key],
            "definition": definition,
            "latest": current,
            "trade_activity": activity_state(current, prior),
            "unit_value_range": unit_value_range(species_monthly, market["crops"], key, latest),
            "history": history,
        }

    imports, exports = views["eu_imports"]["latest"], views["eu_exports"]["latest"]
    balance = {
        "period": latest,
        "volume_tonnes": safe_round(exports["volume_tonnes"] - imports["volume_tonnes"], 2),
        "trade_value_eur": safe_round(exports["trade_value_eur"] - imports["trade_value_eur"], 2),
        "definition": "Extra-EU exports minus extra-EU imports for the same eligible seed CN scope and completed month.",
    }
    balance_direction = "surplus" if balance["trade_value_eur"] >= 0 else "deficit"
    market_context = {
        "status": "FACTUAL_ONLY",
        "causal_explanation_status": "WITHHELD_INSUFFICIENT_EVIDENCE",
        "text": (
            f"Extra-EU seed trade recorded a EUR {abs(balance['trade_value_eur']):,.0f} {balance_direction} in {latest}. "
            "Verified trade evidence confirms the balance and flow changes, but does not support a specific supply, price or weather explanation."
        ),
    }

    totals_by_period = []
    for period in periods:
        total = sum(metric(monthly[key][period])["volume_tonnes"] for key in VIEW_DEFINITIONS)
        prior_total = sum(metric(monthly[key][previous_year(period)])["volume_tonnes"] for key in VIEW_DEFINITIONS)
        totals_by_period.append({
            "period": period,
            "volume_tonnes": safe_round(total, 2),
            "volume_yoy_percent": yoy(total, prior_total),
        })
    peak_activity = max(totals_by_period, key=lambda item: (item["volume_tonnes"], item["period"]))
    peak_activity.update({
        "status": "VERIFIED",
        "definition": "Highest combined eligible volume across EU Internal Trade, EU Imports and EU Exports within the displayed completed-month period.",
    })

    contexts = {}
    for crop in market["crops"]:
        slug = crop["slug"]
        bucket = species_monthly[(slug, "eu_internal_trade")]
        current = metric(bucket[latest])
        prior = metric(bucket[previous_year(latest)])
        if current["observation_count"] >= 2 and current["volume_tonnes"] > 0:
            contexts[slug] = {
                "view": "EU_INTERNAL_TRADE",
                "period": latest,
                "volume_tonnes": current["volume_tonnes"],
                "volume_yoy_percent": yoy(current["volume_tonnes"], prior["volume_tonnes"]),
                "unit_value_eur_kg": current["unit_value_eur_kg"],
                "unit_value_yoy_percent": yoy(current["unit_value_eur_kg"], prior["unit_value_eur_kg"]),
                "evidence_status": "VERIFIED" if prior["observation_count"] >= 2 else "INSUFFICIENT_EVIDENCE",
            }

    normalized_sha = hashlib.sha256(normalized.read_bytes()).hexdigest()
    output = {
        "schema": "SEEDTRADE_EU_SEED_TRADE_PULSE_V1",
        "generated_at": "2026-09-26T00:00:00Z",
        "classification": "PUBLIC_SAFE",
        "source": "Eurostat COMEXT DS-045409",
        "source_artifact_sha256": normalized_sha,
        "latest_completed_period": latest,
        "latest_available_partial_period": partial,
        "partial_period_excluded": True,
        "accepted_observations": accepted,
        "excluded_partial_observations": rejected_partial,
        "scope": {
            "rule": "Only CN codes already approved for the PUBLIC_SAFE market dataset and normalized rows marked VERIFIED are included; unresolved or review-only mappings are excluded.",
            "included_cn_codes": [{"cn8": str(c["cn8"]), "crop": c["crop"], "slug": c["slug"]} for c in market["crops"]],
            "mirror_flow_control": "EU internal trade uses exporter-reported dispatches only; mirror import declarations are excluded.",
        },
        "views": views,
        "extra_eu_balance": balance,
        "market_context": market_context,
        "peak_activity": peak_activity,
        "species_market_context": contexts,
        "interpretation": "Trade Activity is a deterministic description of completed-month volume, not a forecast, recommendation or transaction price.",
    }
    destination = Path(args.output)
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_text(json.dumps(output, indent=2, ensure_ascii=False) + "\n")


if __name__ == "__main__":
    main()
