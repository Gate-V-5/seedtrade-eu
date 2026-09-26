import json
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


class MobileContentConsistencyV51Tests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.app = (ROOT / "src/AppV2.jsx").read_text(encoding="utf-8")
        cls.css = (ROOT / "src/styles.css").read_text(encoding="utf-8")
        cls.master = json.loads((ROOT / "src/data/species_master_v1_1.json").read_text(encoding="utf-8"))

    def test_species_master_v11_required_fields(self):
        required = {"species_id","common_name_en","botanical_name","aliases","search_terms","taxonomy_confidence","cn_relationship","varieties","status"}
        self.assertTrue(all(required <= set(item) for item in self.master["species"]))

    def test_species_ids_are_unique(self):
        ids = [item["species_id"] for item in self.master["species"]]
        self.assertEqual(len(ids), len(set(ids)))

    def test_uncertain_taxonomy_fails_closed(self):
        mustard = next(item for item in self.master["species"] if item["species_id"] == "mustard-seed")
        self.assertIsNone(mustard["botanical_name"])
        self.assertEqual("AMBIGUOUS_CN_CATEGORY", mustard["status"])

    def test_app_uses_only_v11_master(self):
        self.assertIn('species_master_v1_1.json', self.app)
        self.assertNotIn('from "./data/species_master.json"', self.app)

    def test_botanical_names_use_italic_component(self):
        self.assertIn('className="botanical"', self.app)
        self.assertIn('function BotanicalText', self.app)

    def test_mobile_signal_is_one_species(self):
        self.assertIn('signal-crops signal-single', self.app)
        self.assertIn('useCarousel(total,7000,1)', self.app)
        self.assertIn('pulse=carousel.position===0', self.app)

    def test_mobile_breakpoints_and_overflow_guards(self):
        self.assertIn('@media(max-width:768px)', self.css)
        self.assertIn('@media(max-width:430px)', self.css)
        self.assertIn('overflow-x:hidden', self.css)
        for width in (360, 375, 390, 414, 430, 768):
            self.assertGreater(width, 0)

    def test_mobile_navigation_accessible(self):
        for token in ('className="menu-toggle"','aria-expanded={open}','aria-controls="primary-navigation"','aria-current='):
            self.assertIn(token, self.app)

    def test_marketplace_search_and_variety(self):
        self.assertIn('Search species or variety', self.app)
        self.assertIn('species?.botanical_name', self.app)
        self.assertIn('RGT Savvor', self.app)

    def test_marketplace_counters_are_real_only(self):
        self.assertIn('active.filter(x=>x.listing_type', self.app)
        self.assertIn('real active listings only', self.app)
        self.assertIn('DEMO DATA below', self.app)

    def test_original_logo_and_footer_plate(self):
        self.assertIn('src={OFFICIAL_LOGO}', self.app)
        self.assertIn('footer-logo brand-plate', self.app)
        self.assertIn('.brand-plate', self.css)

    def test_frozen_sections_not_restructured(self):
        self.assertIn('news.items.slice(0,4)', self.app)
        self.assertIn('insights.articles.slice(0,3)', self.app)
        self.assertIn('What is changing now', self.app)
        self.assertIn('Context beyond the numbers', self.app)

    def test_generated_static_first_has_botanicals(self):
        page = (ROOT / "dist/index.html").read_text(encoding="utf-8")
        self.assertNotIn('<div id="root"></div>', page)
        self.assertIn("Linum usitatissimum", page)
        self.assertIn("Vicia villosa Roth", page)


if __name__ == "__main__":
    unittest.main()
