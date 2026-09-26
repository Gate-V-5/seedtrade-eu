import json
import pathlib
import re
import unittest


ROOT = pathlib.Path(__file__).resolve().parents[1]


class ProductionQaFixBatch1Tests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.app = (ROOT / "src/AppV2.jsx").read_text()
        cls.css = (ROOT / "src/styles.css").read_text()
        cls.index = (ROOT / "index.html").read_text()
        cls.htaccess = (ROOT / "public/.htaccess").read_text()
        cls.pulse = json.loads((ROOT / "src/generated/trade_pulse_public.json").read_text())

    def test_each_flow_has_complete_verified_metric_set(self):
        required = {
            "volume_tonnes", "volume_yoy_percent", "trade_value_eur",
            "value_yoy_percent", "unit_value_eur_kg",
        }
        for view in self.pulse["views"].values():
            self.assertTrue(required.issubset(view["latest"]))
            self.assertGreaterEqual(view["latest"]["observation_count"], 20)
            self.assertGreaterEqual(view["latest"]["cn_code_count"], 6)
        self.assertEqual("PUBLIC_SAFE", self.pulse["classification"])

    def test_trade_value_and_value_yoy_are_rendered(self):
        self.assertIn("Trade value</dt>", self.app)
        self.assertIn("Trade value YoY</dt>", self.app)
        self.assertIn("view.latest.trade_value_eur", self.app)
        self.assertIn("view.latest.value_yoy_percent", self.app)

    def test_period_guard_stays_fail_closed(self):
        self.assertEqual("2026-06", self.pulse["latest_completed_period"])
        self.assertEqual("2026-07", self.pulse["latest_available_partial_period"])
        self.assertTrue(self.pulse["partial_period_excluded"])
        for view in self.pulse["views"].values():
            self.assertNotIn("2026-07", {row["period"] for row in view["history"]})

    def test_readability_has_explicit_contrast_and_mobile_rules(self):
        for token in (
            ".trade-pulse-card h2{color:#fff", ".pulse-flow dt{", "color:#cbd9e2",
            ".pulse-flow dd{", "color:#fff", ".pulse-flow .trend.up{color:#79e5b8",
            ".pulse-flow .trend.down{color:#ff9b8f", "@media(max-width:620px)",
        ):
            self.assertIn(token, self.css)

    def test_html_revalidates_and_hashed_assets_cache(self):
        self.assertIn('Header set Cache-Control "no-cache, must-revalidate"', self.htaccess)
        self.assertIn('Header set Cache-Control "public, max-age=31536000, immutable"', self.htaccess)
        self.assertIn('name="seedtrade-build"', self.index)

    def test_obsolete_production_copy_absent(self):
        for path in (ROOT / "src").rglob("*"):
            if path.is_file():
                self.assertNotIn("No public deployment performed", path.read_text(errors="ignore"))

    def test_no_partial_value_is_hard_coded_in_component(self):
        component = re.search(r"function TradePulseSignal\(\).*?\n}\n", self.app, re.S).group(0)
        self.assertNotIn("2026-07", component)
        self.assertIn("view.latest.trade_value_eur", component)


if __name__ == "__main__":
    unittest.main()
