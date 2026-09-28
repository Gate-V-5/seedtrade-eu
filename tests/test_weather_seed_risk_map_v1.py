import json
import re
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
WEATHER = json.loads((ROOT / "src/generated/weather_public.json").read_text())
MAP = json.loads((ROOT / "src/generated/europe_country_map_public.json").read_text())
PAGE = (ROOT / "src/WeatherEvidence.jsx").read_text()
APP = (ROOT / "src/AppV2.jsx").read_text()
CSS = (ROOT / "src/styles.css").read_text()


class WeatherSeedRiskMapV1(unittest.TestCase):
    def test_canonical_region_inventory_and_country_map_agree(self):
        regions = WEATHER["regions"]
        self.assertEqual(23, WEATHER["region_count"])
        self.assertEqual(23, len(regions))
        self.assertEqual(23, len({item["code"] for item in regions}))
        self.assertEqual(23, len({(item["country"], item["name"]) for item in regions}))
        country_counts = {}
        for region in regions:
            code = region["code"].split("_")[0]
            country_counts[code] = country_counts.get(code, 0) + 1
        self.assertEqual(country_counts, MAP["monitored_country_counts"])
        self.assertEqual(6, len(country_counts))
        self.assertEqual(country_counts.keys(), {item["code"] for item in MAP["countries"] if item["code"] in country_counts})
        self.assertTrue(all(item["path"].startswith("M") for item in MAP["countries"]))
        self.assertTrue(all(item["label"] for item in MAP["countries"] if item["code"] in country_counts))

    def test_public_region_list_and_methodology_are_static(self):
        for token in ("weather.regions.reduce", "region.name", "region.country", "weather.observed_date", "weather.methodology_note", "No region-level crop or phenology", "do not establish a change"):
            self.assertIn(token, PAGE)
        self.assertIn("<svg", PAGE)
        self.assertIn("<title>", PAGE)
        self.assertIn('role="img"', PAGE)
        self.assertIn("shaded national territory does not mean", PAGE)
        self.assertNotIn("fetch(", PAGE)
        self.assertNotIn("useEffect", PAGE)

    def test_route_prerender_sitemap_and_responsive_guards(self):
        self.assertIn('href="/weather-evidence">View weather evidence', APP)
        self.assertIn('path === "/weather-evidence"', APP)
        self.assertIn('if(path === "/weather-evidence") return <WeatherEvidence/>', APP)
        self.assertIn("['weather-evidence'", (ROOT / "scripts/prerender_seo.mjs").read_text())
        self.assertEqual(1, (ROOT / "public/sitemap.xml").read_text().count("https://seedtrade.eu/weather-evidence"))
        self.assertRegex(CSS, r"\.europe-weather-map\{[^}]*width:100%")
        self.assertIn("@media(max-width:980px){.weather-coverage-layout{grid-template-columns:1fr}", CSS)
        self.assertIn("@media(max-width:620px){.weather-map-panel", CSS)
        self.assertIn("minmax(0,1fr)", CSS)

    def test_every_region_is_in_pre_javascript_html(self):
        markup = (ROOT / "dist/weather-evidence/index.html").read_text()
        self.assertIn('<h1>Where SeedTrade monitors weather exposure</h1>', markup)
        self.assertNotIn('<div id="root"></div>', markup)
        self.assertEqual(23, markup.count("shared weather snapshot</small></li>"))
        for region in WEATHER["regions"]:
            with self.subTest(region=region["code"]):
                self.assertIn(f"<span>{region['name']}</span>", markup)
        self.assertIn("Weather exposure and preliminary crop-stage context do not establish", markup)

    def test_geometry_provenance_and_publication_safety(self):
        self.assertRegex(MAP["source_sha256"], r"^[0-9a-f]{64}$")
        self.assertIn("natural-earth-vector", MAP["source"])
        self.assertIn("public domain", MAP["license"])
        self.assertEqual("PUBLIC_SAFE", WEATHER["classification"])
        self.assertNotIn("PRIVATE_DATA", PAGE)
        self.assertNotIn("Globalwits", PAGE)
        self.assertNotIn("REVIEW_REQUIRED", PAGE)


if __name__ == "__main__":
    unittest.main()
