import json
import pathlib
import unittest

ROOT = pathlib.Path(__file__).resolve().parents[1]


class MarketplaceLiveBatch1Tests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.data = json.loads((ROOT / "src/generated/rfqs_public.json").read_text())
        cls.master = json.loads((ROOT / "src/data/species_master_v1_1.json").read_text())
        cls.app = (ROOT / "src/AppV2.jsx").read_text()

    def test_five_real_active_offers(self):
        self.assertEqual(5, len(self.data["items"]))
        self.assertTrue(all(x["status"] == "ACTIVE" and x["classification"] == "PUBLIC_SAFE" and not x["is_demo"] for x in self.data["items"]))
        self.assertEqual({"total_active": 5, "buy_requests": 0, "offers": 5}, self.data["counters"])

    def test_exact_quantities_prices_and_units(self):
        actual = [(x["quantity"], x["quantity_unit"], x["price"], x["currency"], x["price_unit"]) for x in self.data["items"]]
        expected = [(100,"t",1.40,"EUR","kg"),(50,"t",1.60,"EUR","kg"),(50,"t",1.60,"EUR","kg"),(30,"t",1.60,"EUR","kg"),(20,"t",5.50,"EUR","kg")]
        self.assertEqual(expected, actual)

    def test_shared_commercial_fields(self):
        for item in self.data["items"]:
            self.assertEqual(("EU", "EXW", "Lithuania", "1,000 kg Big Bag"), (item["origin_country"], item["incoterm"], item["location"], item["packaging"]))
            self.assertIsNone(item["expiry_date"])
            self.assertEqual("2026-09-23", item["publication_date"])

    def test_exact_varieties_and_categories(self):
        self.assertEqual([("LS Riviera","C2"),("LS Riviera","C1"),("Kaolin","C1"),("REA","C1"),("RGT Savvor","C")], [(x["variety"],x["category"]) for x in self.data["items"]])

    def test_owner_confirmed_winter_vetch(self):
        rea = next(x for x in self.data["items"] if x["variety"] == "REA")
        self.assertEqual("Winter vetch", rea["species_common_name"])
        self.assertEqual("Vicia villosa Roth", rea["species_botanical_name"])
        self.assertTrue(rea["organic"])
        self.assertEqual("Organic / ECO", rea["organic_display"])

    def test_species_master_resolution(self):
        master = {x["species_id"]: x for x in self.master["species"]}
        expected = {"flax":"Linum usitatissimum","winter-vetch":"Vicia villosa Roth","red-clover":"Trifolium pratense"}
        for species_id, botanical in expected.items():
            self.assertEqual(botanical, master[species_id]["botanical_name"])

    def test_variety_is_separate_from_species(self):
        for item in self.data["items"]:
            self.assertNotEqual(item["variety"], item["species_common_name"])
            self.assertNotEqual(item["variety"], item["species_botanical_name"])

    def test_search_terms_cover_all_required_queries(self):
        master = {x["species_id"]: x for x in self.master["species"]}
        for species_id, terms in {"flax":["linum usitatissimum","LS Riviera","Kaolin"],"winter-vetch":["vicia villosa","REA"],"red-clover":["trifolium pratense","RGT Savvor"]}.items():
            searchable = " ".join([master[species_id]["common_name_en"], master[species_id]["botanical_name"], *master[species_id]["aliases"], *master[species_id]["search_terms"]]).lower()
            self.assertTrue(all(term.lower() in searchable for term in terms))

    def test_demo_excluded_from_active_filter(self):
        self.assertIn("item.is_demo !== true", self.app)
        self.assertIn('x.listing_type==="BUY_REQUEST"', self.app)

    def test_card_displays_approved_fields(self):
        for marker in ("request.category", "request.organic_display", "request.incoterm", "request.location", "request.packaging", "request.price"):
            self.assertIn(marker, self.app)

    def test_no_private_seller_or_contact_fields(self):
        payload = json.dumps(self.data).lower()
        for forbidden in ('"seller_name"','"company"','"email"','"phone"','"certificate"'):
            self.assertNotIn(forbidden, payload)

    def test_schema_fields_and_unique_ids(self):
        required = {"listing_id","listing_type","species_common_name","species_botanical_name","species_master_id","variety","quantity","quantity_unit","category","origin_country","incoterm","location","packaging","price","currency","price_unit","status","classification","publication_date","expiry_date"}
        self.assertTrue(required.issubset(set(self.data["schema_fields"])))
        self.assertEqual(5, len({x["listing_id"] for x in self.data["items"]}))

    def test_static_detail_routes_declared(self):
        seo = (ROOT / "scripts/prerender_seo.mjs").read_text()
        sitemap = (ROOT / "public/sitemap.xml").read_text()
        self.assertIn("marketplace.items", seo)
        for item in self.data["items"]:
            self.assertIn(f"buying-requests/{item['slug']}", sitemap)


if __name__ == "__main__":
    unittest.main()
