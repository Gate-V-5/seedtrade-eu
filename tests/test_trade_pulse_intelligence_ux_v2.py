import collections
import importlib.util
import json
import pathlib
import unittest


ROOT = pathlib.Path(__file__).resolve().parents[1]
APP = (ROOT / "src/AppV2.jsx").read_text()
CSS = (ROOT / "src/styles.css").read_text()
PULSE = json.loads((ROOT / "src/generated/trade_pulse_public.json").read_text())
MARKET = json.loads((ROOT / "src/generated/market_public.json").read_text())

SPEC = importlib.util.spec_from_file_location("trade_pulse_generator", ROOT / "scripts/generate_trade_pulse.py")
GENERATOR = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(GENERATOR)


def buckets():
    return collections.defaultdict(lambda: collections.defaultdict(lambda: {"kg": 0.0, "eur": 0.0, "rows": 0, "codes": set()}))


class TradePulseIntelligenceUxV2Tests(unittest.TestCase):
    def test_unit_value_ranges_are_verified_and_attributed(self):
        for view in PULSE["views"].values():
            value_range = view["unit_value_range"]
            self.assertEqual("VERIFIED", value_range["status"])
            self.assertGreaterEqual(value_range["eligible_category_count"], 2)
            self.assertLess(value_range["low"]["unit_value_eur_kg"], value_range["high"]["unit_value_eur_kg"])
            self.assertTrue(value_range["low"]["category"])
            self.assertTrue(value_range["high"]["category"])

    def test_range_rule_is_explicit_and_excludes_unsafe_rows(self):
        rule = PULSE["views"]["eu_internal_trade"]["unit_value_range"]["rule"]
        for phrase in ("100 tonnes", "2 verified observations", "positive net weight", "Review-only", "partial-period"):
            self.assertIn(phrase, rule)

    def test_low_volume_and_anomalous_category_is_excluded(self):
        data = buckets()
        crops = [{"slug": "tiny", "crop": "Tiny"}, {"slug": "valid-a", "crop": "Valid A"}, {"slug": "valid-b", "crop": "Valid B"}]
        data[("tiny", "view")]["2026-06"] = {"kg": 3, "eur": 30000, "rows": 3, "codes": {"1"}}
        data[("valid-a", "view")]["2026-06"] = {"kg": 100000, "eur": 100000, "rows": 2, "codes": {"2"}}
        data[("valid-b", "view")]["2026-06"] = {"kg": 200000, "eur": 400000, "rows": 2, "codes": {"3"}}
        result = GENERATOR.unit_value_range(data, crops, "view", "2026-06")
        self.assertEqual("Valid A", result["low"]["category"])
        self.assertEqual("Valid B", result["high"]["category"])
        self.assertEqual(2, result["eligible_category_count"])

    def test_missing_weight_or_value_fails_closed(self):
        data = buckets()
        crops = [{"slug": "missing-weight", "crop": "Missing weight"}, {"slug": "missing-value", "crop": "Missing value"}]
        data[("missing-weight", "view")]["2026-06"] = {"kg": 0, "eur": 200000, "rows": 10, "codes": {"1"}}
        data[("missing-value", "view")]["2026-06"] = {"kg": 200000, "eur": 0, "rows": 10, "codes": {"2"}}
        result = GENERATOR.unit_value_range(data, crops, "view", "2026-06")
        self.assertEqual("INSUFFICIENT_EVIDENCE", result["status"])
        self.assertEqual(0, result["eligible_category_count"])

    def test_partial_period_is_excluded_from_ranges_and_history(self):
        self.assertEqual("2026-06", PULSE["latest_completed_period"])
        self.assertEqual("2026-07", PULSE["latest_available_partial_period"])
        for view in PULSE["views"].values():
            self.assertEqual("2026-06", view["unit_value_range"]["period"])
            self.assertNotIn("2026-07", [point["period"] for point in view["history"]])

    def test_charts_have_quantitative_axes_dates_and_tooltips(self):
        for token in ("pulse-y-axis", "axisLabel(value,metric)", "periodLabel(period)", "Jul", "title={`${periodLabel(period)}"):
            self.assertIn(token, APP)
        self.assertIn("pulse-plot", CSS)
        self.assertIn("value_yoy_percent", PULSE["views"]["eu_internal_trade"]["history"][-1])

    def test_peak_activity_is_calculated_from_displayed_history(self):
        peak = PULSE["peak_activity"]
        totals = []
        for index, point in enumerate(PULSE["views"]["eu_internal_trade"]["history"]):
            total = sum(view["history"][index]["volume_tonnes"] for view in PULSE["views"].values())
            totals.append((round(total, 2), point["period"]))
        expected = max(totals)
        self.assertEqual(expected[0], peak["volume_tonnes"])
        self.assertEqual(expected[1], peak["period"])
        self.assertIn("Peak activity", APP)

    def test_market_context_withholds_unproven_causality(self):
        context = PULSE["market_context"]
        self.assertEqual("FACTUAL_ONLY", context["status"])
        self.assertEqual("WITHHELD_INSUFFICIENT_EVIDENCE", context["causal_explanation_status"])
        self.assertIn("does not support a specific supply, price or weather explanation", context["text"])
        self.assertIn("Market context", APP)

    def test_trade_balance_remains_exact(self):
        imports = PULSE["views"]["eu_imports"]["latest"]["trade_value_eur"]
        exports = PULSE["views"]["eu_exports"]["latest"]["trade_value_eur"]
        self.assertAlmostEqual(exports - imports, PULSE["extra_eu_balance"]["trade_value_eur"], places=2)

    def test_homepage_replaces_single_unit_value_with_range(self):
        component = APP.split("function TradePulseSignal()", 1)[1].split("const pulseViews", 1)[0]
        self.assertIn("Unit value range", component)
        self.assertNotIn("<dt>Unit value</dt>", component)
        self.assertIn("not market prices", component)

    def test_existing_marketplace_and_static_first_contracts_remain(self):
        self.assertIn('marketplaceMatches(query,request)', APP)
        self.assertIn('path === "/trade-pulse"', APP)
        self.assertIn('<TradePulseSignal/>', APP)
        self.assertEqual(11, len(MARKET["crops"]))


if __name__ == "__main__":
    unittest.main()
