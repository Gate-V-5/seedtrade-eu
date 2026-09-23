import json
import re
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


class HomepageMarketplaceV5Tests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.app = (ROOT / "src/AppV2.jsx").read_text(encoding="utf-8")
        cls.css = (ROOT / "src/styles.css").read_text(encoding="utf-8")
        cls.master = json.loads((ROOT / "src/data/species_master.json").read_text(encoding="utf-8"))
        cls.market = json.loads((ROOT / "src/generated/market_public.json").read_text(encoding="utf-8"))
        cls.rfq = json.loads((ROOT / "src/generated/rfqs_public.json").read_text(encoding="utf-8"))

    def test_species_master_has_stable_unique_ids(self):
        ids = [x["id"] for x in self.master["species"]]
        self.assertEqual(len(ids), len(set(ids)))
        self.assertTrue(all(x.get("common_name") and x.get("taxonomy_status") for x in self.master["species"]))

    def test_no_uncertain_taxonomy_is_guessed(self):
        mustard = next(x for x in self.master["species"] if x["id"] == "mustard-seed")
        self.assertIsNone(mustard["botanical_name"])
        self.assertEqual(mustard["taxonomy_status"], "AMBIGUOUS_CN_CATEGORY")

    def test_public_market_crops_resolve_through_master(self):
        mapped = {cn for item in self.master["species"] for cn in item.get("cn_codes", [])}
        self.assertEqual([], [x["cn8"] for x in self.market["crops"] if x["cn8"] not in mapped])

    def test_botanical_names_are_italicized_by_shared_component(self):
        self.assertIn('className="botanical"', self.app)
        self.assertIn("<SpeciesName species={species}", self.app)
        self.assertIn("font-family:Georgia", self.css)

    def test_market_search_supports_common_latin_and_future_variety(self):
        for text in ("Search the market", "Latin botanical name", "Variety-level records"):
            self.assertIn(text, self.app)
        self.assertIn("species?.botanical_name", self.app)

    def test_marketplace_species_and_variety_are_separate(self):
        self.assertIn("species_id", self.rfq["schema_fields"])
        self.assertIn("variety", self.rfq["schema_fields"])
        self.assertIn('variety:"RGT Savvor"', self.app)
        self.assertNotIn('species_id:"red-clover-RGT-Savvor"', self.app)

    def test_marketplace_buy_sell_semantics(self):
        self.assertIn("I want to buy", self.app)
        self.assertIn('setIntent("OFFER")', self.app)
        self.assertIn("I want to sell", self.app)
        self.assertIn('setIntent("BUY")', self.app)

    def test_marketplace_real_counters_exclude_demo(self):
        self.assertIn("active.filter(x=>x.listing_type", self.app)
        self.assertIn("real active listings", self.app)
        self.assertIn("DEMO DATA below", self.app)

    def test_footer_preserves_original_official_asset(self):
        self.assertIn('footer ? "footer-logo brand-plate"', self.app)
        self.assertNotIn('footer ? "/seedtrade-official-logo-footer.png"', self.app)
        self.assertTrue((ROOT / "public/seedtrade-official-logo.png").is_file())

    def test_static_first_v5_contains_botanical_and_marketplace_controls(self):
        page = (ROOT / "dist/index.html").read_text(encoding="utf-8")
        self.assertIn("Trifolium pratense", page)
        self.assertNotIn('<div id="root"></div>', page)
        market = (ROOT / "dist/market/index.html").read_text(encoding="utf-8")
        self.assertIn("Search the market", market)
        marketplace = (ROOT / "dist/buying-requests/index.html").read_text(encoding="utf-8")
        self.assertIn("I want to buy", marketplace)
        self.assertIn("RGT Savvor", marketplace)

    def test_frozen_sections_remain_declared(self):
        self.assertIn("What is changing now", self.app)
        self.assertIn("Context beyond the numbers", self.app)


if __name__ == "__main__":
    unittest.main()
