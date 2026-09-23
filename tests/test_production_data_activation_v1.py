import hashlib
import json
import pathlib
import unittest

ROOT = pathlib.Path(__file__).resolve().parents[1]


class ProductionDataActivationV1(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.manifest = json.loads((ROOT / "src/generated/public_data_manifest.json").read_text())
        cls.market = json.loads((ROOT / "src/generated/market_public.json").read_text())
        cls.weather = json.loads((ROOT / "src/generated/weather_public.json").read_text())
        cls.supply = json.loads((ROOT / "src/generated/supply_public.json").read_text())
        cls.rfqs = json.loads((ROOT / "src/generated/rfqs_public.json").read_text())
        cls.species = json.loads((ROOT / "src/data/species_master_v1_1.json").read_text())

    def test_comext_actual_inventory(self):
        data = self.manifest["datasets"]["comext"]
        self.assertEqual((72046, 56741, 45553), (data["total_observations"], data["public_safe_observations"], data["price_eligible_observations"]))

    def test_period_controls(self):
        data = self.manifest["datasets"]["comext"]
        self.assertEqual("2026-07", data["partial_period"])
        self.assertEqual("2026-06", data["latest_completed_period"])
        self.assertEqual("2026-06", self.market["latest_completed_period"])

    def test_market_public_coverage(self):
        self.assertEqual(11, len(self.market["crops"]))
        self.assertEqual(330, sum(len(crop["history"]) for crop in self.market["crops"]))
        self.assertTrue(all(crop["classification"] == "PUBLIC_SAFE" for crop in self.market["crops"]))

    def test_market_signal_fails_closed(self):
        self.assertTrue(all(crop["market_status"] == "INSUFFICIENT_EVIDENCE" for crop in self.market["crops"]))

    def test_weather_public_layer(self):
        self.assertEqual((23, 46), (self.weather["region_count"], self.weather["analysis_count"]))
        self.assertEqual(23, len(self.weather["regions"]))
        self.assertEqual("PRELIMINARY_RULE_BASED_MODEL", self.weather["model_status"])

    def test_supply_fails_closed(self):
        self.assertEqual("INSUFFICIENT_EVIDENCE", self.supply["evidence_status"])
        self.assertIsNone(self.supply["eu_total"])
        self.assertIsNone(self.supply["directional_signal"])
        self.assertIn("separate", self.supply["separation_rule"])

    def test_marketplace_real_inventory_is_empty(self):
        self.assertEqual([], self.rfqs["items"])
        self.assertEqual(0, self.rfqs["counters"]["total_active"])

    def test_ambiguous_cn_species_is_not_guessed(self):
        mustard = next(item for item in self.species["species"] if item["species_id"] == "mustard-seed")
        self.assertIsNone(mustard["botanical_name"])
        self.assertEqual("AMBIGUOUS_CN_CATEGORY", mustard["status"])

    def test_public_artifact_hashes(self):
        for item in self.manifest["datasets"].values():
            artifact = item.get("artifact")
            digest = item.get("sha256")
            if not artifact or not digest:
                continue
            base = ROOT / "src/generated"
            path = (base / artifact).resolve()
            self.assertEqual(digest, hashlib.sha256(path.read_bytes()).hexdigest())

    def test_public_exports_have_no_internal_paths(self):
        for name in ("public_data_manifest.json", "weather_public.json", "supply_public.json", "rfqs_public.json"):
            text = (ROOT / "src/generated" / name).read_text()
            self.assertNotIn("/workspace/", text)
            self.assertNotIn("Dropbox", text)


if __name__ == "__main__":
    unittest.main()
