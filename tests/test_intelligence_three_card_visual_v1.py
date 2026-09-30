import json
import re
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
APP = (ROOT / "src/AppV2.jsx").read_text()
CSS = (ROOT / "src/styles.css").read_text()
MAP = json.loads((ROOT / "src/generated/europe_country_map_public.json").read_text())
WEATHER = json.loads((ROOT / "src/generated/weather_public.json").read_text())
SECTION = APP[APP.index("function IntelligenceOverview"):APP.index("function NetworkInterest")]


class ThreeCardVisualV1(unittest.TestCase):
    def test_exactly_three_topics_and_no_category_card(self):
        self.assertEqual(SECTION.count("<article>"), 3)
        for topic in ("EU Market Pulse", "Weather & Seed Risk", "Seed Production"):
            self.assertIn(topic, SECTION)
        self.assertNotIn("Supply / Crop Intelligence", SECTION)
        self.assertNotIn("tracked seed categories", SECTION)

    def test_visuals_are_distinct_static_inline_svg_and_preserve_data(self):
        for theme in ("trade", "weather", "production"):
            self.assertIn(f'intelligence-topic-visual {theme}', SECTION)
        self.assertEqual(SECTION.count("<svg "), 3)
        self.assertIn("tradePulse.views.eu_internal_trade.latest", SECTION)
        self.assertIn("market.latest_completed_period", SECTION)
        self.assertIn("weather.region_count", SECTION)
        self.assertIn("Production effects remain unclaimed without supporting evidence", SECTION)
        self.assertIn("Evidence is currently insufficient for an EU-wide supply direction", SECTION)
        self.assertNotRegex(SECTION, re.compile(r"fetch\(|Math\.random|Date\("))

    def test_weather_visual_uses_existing_country_geography_with_caveat(self):
        self.assertIn('europeMap.countries.map', SECTION)
        self.assertIn('europeMap.monitored_country_counts[country.code]', SECTION)
        self.assertIn('country shading does not mean nationwide monitoring', SECTION)
        self.assertEqual(WEATHER["region_count"], 23)
        self.assertEqual(len(MAP["monitored_country_counts"]), 6)

    def test_responsive_three_two_one_and_safe_containment(self):
        self.assertIn(".intelligence-grid.intelligence-commercial{grid-template-columns:repeat(3,minmax(0,1fr))", CSS)
        self.assertIn("@media(max-width:1050px){.intelligence-grid.intelligence-commercial{grid-template-columns:repeat(2,minmax(0,1fr))}}", CSS)
        self.assertIn("@media(max-width:680px){.intelligence-grid.intelligence-commercial{grid-template-columns:1fr}", CSS)
        self.assertIn(".intelligence-commercial .intelligence-topic-visual{position:relative;isolation:isolate;height:156px;min-height:156px", CSS)
        self.assertIn("overflow:hidden", CSS)


if __name__ == "__main__":
    unittest.main()
