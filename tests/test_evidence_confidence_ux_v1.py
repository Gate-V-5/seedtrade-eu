import json
import pathlib
import subprocess
import unittest

ROOT = pathlib.Path(__file__).resolve().parents[1]
APP = (ROOT / "src/AppV2.jsx").read_text()


class EvidenceConfidenceUX(unittest.TestCase):
    def test_binary_mapping_preserves_eligibility_and_does_not_invent_moderate(self):
        program = """import {priceConfidence,marketSignalConfidence} from './src/evidenceConfidence.mjs';
        console.log(JSON.stringify({eligible:priceConfidence('EVIDENCE_ELIGIBLE'),limited:priceConfidence('REVIEW_REQUIRED'),signal:marketSignalConfidence('INSUFFICIENT_EVIDENCE','INSUFFICIENT_EVIDENCE','EXPOSURE_ONLY_NO_VALIDATED_IMPACT')}));"""
        result = subprocess.run(["node", "--input-type=module", "-e", program], cwd=ROOT, check=True, capture_output=True, text=True)
        data = json.loads(result.stdout)
        self.assertEqual("Eligible", data["eligible"]["level"])
        self.assertEqual("Limited", data["limited"]["level"])
        self.assertEqual("Limited", data["signal"]["level"])
        self.assertIn("not market prices", data["eligible"]["explanation"])
        self.assertIn("No directional Market Signal", data["signal"]["explanation"])
        self.assertIn("weather exposure", data["signal"]["explanation"])

    def test_public_data_and_eligibility_unchanged(self):
        market = json.loads((ROOT / "src/generated/market_public.json").read_text())
        self.assertTrue(all(c["classification"] == "PUBLIC_SAFE" and c["quality_status"] == "EVIDENCE_ELIGIBLE" for c in market["crops"]))
        self.assertTrue(all(c["market_status"] == "INSUFFICIENT_EVIDENCE" for c in market["crops"]))
        self.assertEqual("2026-06", market["latest_completed_period"])

    def test_explanation_prerendered_on_market_and_crop_page(self):
        for path in (ROOT / "dist/market/index.html", ROOT / "dist/market/red-clover/index.html"):
            html = path.read_text()
            self.assertIn("Market Signal<!-- -->: <!-- -->Limited", html)
            self.assertIn("Why this level?", html)
            self.assertIn("Price evidence<!-- -->: <!-- -->Eligible", html)
            self.assertIn("Verified trade observations remain available", html)
            self.assertNotIn("PRIVATE_DATA", html)

    def test_trade_pulse_marketplace_and_methodology_unaltered(self):
        self.assertIn("Category-level unit values are derived indicators, not market prices", APP)
        self.assertIn("partial and excluded from trends", APP)
        self.assertIn("marketplaceMatches", APP)
        self.assertIn("Vicia villosa", (ROOT / "src/data/species_master_v1_1.json").read_text())


if __name__ == "__main__":
    unittest.main()
