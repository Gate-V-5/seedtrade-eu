import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
APP = (ROOT / "src/AppV2.jsx").read_text()
CSS = (ROOT / "src/styles.css").read_text()
V2_CSS = CSS[CSS.index("/* Homepage Visual Refinement V2"):]


class HomepageVisualRefinementV2Tests(unittest.TestCase):
    def test_market_signal_single_card_layout(self):
        self.assertIn("signal-crops signal-single", APP)
        self.assertIn(".signal-crops{flex:1}", V2_CSS)

    def test_top_news_four_card_desktop_row(self):
        self.assertIn("news.items.slice(0,4)", APP)
        self.assertIn(".news-list{display:grid;grid-template-columns:repeat(4,minmax(0,1fr))", V2_CSS)

    def test_intelligence_three_card_desktop_row(self):
        self.assertIn("Weather & Seed Risk", APP)
        self.assertIn("Seed Production Monitor", APP)
        self.assertIn("Supply / Crop Intelligence", APP)
        self.assertIn(".intelligence-grid{gap:14px}", V2_CSS)

    def test_market_snapshot_four_card_desktop_row(self):
        self.assertIn("useCarousel(market.crops.length,2500,4)", APP)
        self.assertIn(".homepage-crops{grid-template-columns:repeat(4,minmax(0,1fr))", V2_CSS)

    def test_insights_three_card_desktop_row(self):
        self.assertIn("insights.articles.slice(0,3)", APP)
        self.assertIn(".visual-insights{grid-template-columns:repeat(3,minmax(0,1fr))", V2_CSS)

    def test_rfq_four_card_desktop_row(self):
        self.assertIn("useCarousel(display.length,2500,4)", APP)
        self.assertIn(".request-grid{grid-template-columns:repeat(4,minmax(0,1fr))", V2_CSS)

    def test_editorial_visuals_are_data_driven(self):
        self.assertIn("function EditorialVisual", APP)
        self.assertIn("visualKind(item.slug)", APP)
        self.assertNotIn("http", APP[APP.index("function EditorialVisual"):APP.index("function ArticleCard")])

    def test_status_and_numbers_are_visually_separate(self):
        self.assertIn("Verified data available", APP)
        self.assertIn("Directional signal is withheld — not yet supported", APP)

    def test_mobile_does_not_force_four_columns(self):
        self.assertIn(".signal-crops,.news-list,.homepage-crops,.request-grid{grid-template-columns:1fr}", V2_CSS)


if __name__ == "__main__":
    unittest.main()
