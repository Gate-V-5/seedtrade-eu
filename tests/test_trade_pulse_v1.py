import json
import pathlib
import unittest


ROOT = pathlib.Path(__file__).resolve().parents[1]


class TradePulseV1Tests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.pulse = json.loads((ROOT / "src/generated/trade_pulse_public.json").read_text())
        cls.market = json.loads((ROOT / "src/generated/market_public.json").read_text())
        cls.rfqs = json.loads((ROOT / "src/generated/rfqs_public.json").read_text())
        cls.app = (ROOT / "src/AppV2.jsx").read_text()

    def test_three_non_overlapping_views(self):
        self.assertEqual({"eu_internal_trade", "eu_imports", "eu_exports"}, set(self.pulse["views"]))
        self.assertIn("mirror import declarations are excluded", self.pulse["views"]["eu_internal_trade"]["definition"])

    def test_completed_period_and_partial_exclusion(self):
        self.assertEqual("2026-06", self.pulse["latest_completed_period"])
        self.assertEqual("2026-07", self.pulse["latest_available_partial_period"])
        self.assertTrue(self.pulse["partial_period_excluded"])
        for view in self.pulse["views"].values():
            self.assertNotIn("2026-07", [point["period"] for point in view["history"]])

    def test_twelve_month_history(self):
        for view in self.pulse["views"].values():
            self.assertEqual(12, len(view["history"]))
            self.assertEqual("2025-07", view["history"][0]["period"])
            self.assertEqual("2026-06", view["history"][-1]["period"])

    def test_weighted_unit_value_formula(self):
        for view in self.pulse["views"].values():
            latest = view["latest"]
            expected = latest["trade_value_eur"] / (latest["volume_tonnes"] * 1000)
            self.assertAlmostEqual(expected, latest["unit_value_eur_kg"], places=3)

    def test_activity_is_deterministic_and_not_forecast(self):
        for view in self.pulse["views"].values():
            self.assertIn(view["trade_activity"]["state"], {"HIGH", "NORMAL", "LOW", "INSUFFICIENT_EVIDENCE"})
            self.assertIn("not a forecast", view["trade_activity"]["rule"])

    def test_only_public_market_cn_scope(self):
        public_codes = {str(crop["cn8"]) for crop in self.market["crops"]}
        pulse_codes = {row["cn8"] for row in self.pulse["scope"]["included_cn_codes"]}
        self.assertEqual(public_codes, pulse_codes)
        self.assertEqual(11, len(pulse_codes))

    def test_source_and_classification(self):
        self.assertEqual("PUBLIC_SAFE", self.pulse["classification"])
        self.assertEqual("Eurostat COMEXT DS-045409", self.pulse["source"])
        self.assertEqual(64, len(self.pulse["source_artifact_sha256"]))

    def test_trade_pulse_is_first_signal_card(self):
        self.assertIn('pulse=carousel.position===0', self.app)
        self.assertIn("EU Seed Trade Pulse", self.app)
        self.assertIn('market.crops.length+1', self.app)

    def test_unit_value_not_labelled_market_price(self):
        self.assertIn("Unit value is trade value ÷ net weight, not a market price", self.app)
        self.assertNotIn("EU Seed Trade Pulse price", self.app)

    def test_marketplace_context_fail_closed(self):
        self.assertIn("if(!context)return null", self.app)
        self.assertIn("context only, not an offer valuation", self.app)

    def test_exact_variety_search_is_listing_specific(self):
        self.assertIn("marketplaceMatches(query,request)", self.app)
        self.assertNotIn("searchSpecies(query,listingSpecies(request),request.variety)", self.app)
        listings = self.rfqs["items"]
        self.assertEqual(2, len([x for x in listings if "ls riviera" in x["variety"].lower()]))
        self.assertEqual(1, len([x for x in listings if "kaolin" in x["variety"].lower()]))

    def test_species_search_still_covers_all_flax(self):
        flax = [x for x in self.rfqs["items"] if x["species_master_id"] == "flax"]
        self.assertEqual(3, len(flax))
        self.assertTrue(all(x["species_botanical_name"] == "Linum usitatissimum" for x in flax))

    def test_footer_has_no_deployment_state(self):
        self.assertNotIn("No public deployment performed", self.app)
        self.assertIn("© 2026 SeedTrade.eu · European Seed Market Intelligence", self.app)

    def test_methodology_has_required_definitions(self):
        for text in ("EU Internal Trade", "EU Imports", "EU Exports", "Trade balance", "HIGH when volume YoY", "mirror import declarations"):
            self.assertIn(text, self.app)


if __name__ == "__main__":
    unittest.main()
