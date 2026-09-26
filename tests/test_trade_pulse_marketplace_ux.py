import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
APP = (ROOT / "src/AppV2.jsx").read_text()
CSS = (ROOT / "src/styles.css").read_text()


class TradePulseMarketplaceUxTests(unittest.TestCase):
    def test_homepage_pulse_is_fixed(self):
        panel = APP.split("function SignalPanel()", 1)[1].split("function TradePulseSignal()", 1)[0]
        self.assertIn("<TradePulseSignal/>", panel)
        self.assertNotIn("carousel", panel)
        self.assertNotIn("Previous Market Signal", panel)

    def test_dashboard_has_required_verified_sections(self):
        for text in ("Trade activity over time", "Monthly volume, tonnes", "Monthly trade value, EUR", "Seasonality", "Top verified seed categories", "Biggest verified volume movers", "Extra-EU trade balance", "Market observations", "Methodology in brief"):
            self.assertIn(text, APP)
        self.assertIn("Evidence insufficient for a robust seasonality claim", APP)
        self.assertIn("categories below 100 tonnes are excluded", APP)

    def test_dashboard_route_is_public_and_prerendered(self):
        self.assertIn('path === "/trade-pulse"', APP)
        prerender = (ROOT / "scripts/prerender_seo.mjs").read_text()
        sitemap = (ROOT / "public/sitemap.xml").read_text()
        self.assertIn("['trade-pulse'", prerender)
        self.assertIn("https://seedtrade.eu/trade-pulse", sitemap)

    def test_marketplace_commercial_hierarchy(self):
        self.assertIn('className="commercial-primary"', APP)
        self.assertIn('className="commercial-detail organic-detail"', APP)
        self.assertIn(".request-card .commercial-primary dd{font-size:20px", CSS)
        self.assertIn(".request-card .commercial-detail dd{font-size:15px", CSS)

    def test_responsive_dashboard_and_cards(self):
        self.assertIn("@media(max-width:900px)", CSS)
        self.assertIn("@media(max-width:620px)", CSS)
        self.assertIn(".pulse-kpis{grid-template-columns:1fr}", CSS)


if __name__ == "__main__":
    unittest.main()
