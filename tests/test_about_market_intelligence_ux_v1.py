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

    def test_about_value_blocks_and_contact(self):
        for phrase in (
            "From scattered evidence to commercial context",
            "See market movement",
            "Connect trade and supply",
            "Identify market timing",
            "Discover B2B opportunities",
            "Contact SeedTrade",
            "info@seedtrade.eu",
        ):
            self.assertIn(phrase, APP)

    def test_about_detail_removed_and_contact_fields_grouped(self):
        about = APP.split("function AboutPage()", 1)[1].split("function InfoPage(", 1)[0]
        self.assertNotIn("Evidence becomes useful context", about)
        self.assertNotIn("European seed-market participants", about)
        self.assertNotIn("unsupported prediction engine", about)
        self.assertEqual(about.count('className="contact-field'), 5)

    def test_market_overview_is_commercially_framed(self):
        for phrase in (
            "What is moving, where and when?",
            "EU Market Pulse",
            "Conditions worth monitoring",
            "Is supply tightening or expanding?",
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
        self.assertIn(".intelligence-commercial,.about-value-grid{grid-template-columns:1fr}", CSS)
        self.assertIn(".contact-field-wide,.contact-form button{grid-column:auto}", CSS)


if __name__ == "__main__":
    unittest.main()
