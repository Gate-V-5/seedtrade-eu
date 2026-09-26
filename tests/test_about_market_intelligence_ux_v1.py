import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
APP = (ROOT / "src" / "AppV2.jsx").read_text()
CSS = (ROOT / "src" / "styles.css").read_text()


class AboutMarketIntelligenceUxV1Tests(unittest.TestCase):
    def test_about_has_clear_value_proposition(self):
        for phrase in (
            "independent European seed-market intelligence and B2B marketplace platform",
            "what is moving, where activity is changing",
            "European seed market intelligence for better commercial decisions",
        ):
            self.assertIn(phrase, APP)

    def test_about_value_blocks_and_workflow(self):
        for phrase in (
            "See market movement",
            "Connect trade and supply",
            "Identify market timing",
            "Discover B2B opportunities",
            "Official and verified evidence",
            "SeedTrade intelligence",
            "Marketplace opportunities",
        ):
            self.assertIn(phrase, APP)

    def test_about_positioning_is_fail_closed(self):
        for phrase in (
            "not a commodity trading terminal",
            "investment advice",
            "price forecasting",
            "unsupported prediction engine",
        ):
            self.assertIn(phrase, APP)

    def test_market_overview_is_commercially_framed(self):
        for phrase in (
            "What is moving, where and when?",
            "EU Market Pulse",
            "Conditions worth monitoring",
            "Is supply tightening or expanding?",
            "Where could supply matter?",
        ):
            self.assertIn(phrase, APP)

    def test_weather_does_not_claim_production_loss(self):
        self.assertIn("Production effects remain unclaimed without supporting evidence", APP)
        self.assertNotIn("production will fall", APP.lower())

    def test_supply_separation_and_evidence_limit(self):
        self.assertIn("Certified-seed and multiplication evidence is kept separate from commodity crop area", APP)
        self.assertIn("Evidence is currently insufficient for an EU-wide supply direction", APP)

    def test_decorative_coverage_percentage_removed_from_prominent_ui(self):
        self.assertNotIn("supply.verified_country_coverage_percent", APP)
        self.assertNotIn("verified country coverage", APP)

    def test_numbers_before_paragraphs(self):
        self.assertIn("market.latest_completed_period", APP)
        self.assertIn("weather.region_count", APP)
        self.assertIn("market.crops.length", APP)
        self.assertIn("internal.volume_tonnes", APP)

    def test_about_route_is_dedicated(self):
        self.assertIn('if(path === "/about") return <AboutPage/>', APP)

    def test_responsive_layouts_exist(self):
        self.assertIn("@media(max-width:1050px)", CSS)
        self.assertIn("@media(max-width:680px)", CSS)
        self.assertIn(".intelligence-commercial,.about-value-grid,.about-audience{grid-template-columns:1fr}", CSS)


if __name__ == "__main__":
    unittest.main()
