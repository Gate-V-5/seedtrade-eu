import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
APP = (ROOT / "src/AppV2.jsx").read_text(encoding="utf-8")
CSS = (ROOT / "src/styles.css").read_text(encoding="utf-8")


class FinalV5RefinementTests(unittest.TestCase):
    def test_market_signal_is_one_card_platform_wide(self):
        self.assertIn('signal-crops signal-single', APP)
        self.assertIn('useCarousel(market.crops.length,7000,1)', APP)

    def test_market_snapshot_advances_one_record(self):
        self.assertIn('useCarousel(market.crops.length,2500,4)', APP)
        self.assertIn('circularSlice(market.crops,marketCarousel.position,marketCarousel.visible)', APP)

    def test_marketplace_carousel_advances_one_record(self):
        self.assertIn('useCarousel(display.length,2500,4)', APP)
        self.assertIn('circularSlice(display,carousel.position,carousel.visible)', APP)

    def test_carousels_are_interaction_and_motion_safe(self):
        for token in ('onTouchStart','onTouchEnd','onMouseEnter','onFocus'):
            self.assertIn(token, APP)
        self.assertIn('prefers-reduced-motion:reduce', CSS)

    def test_mobile_single_card_carousels(self):
        self.assertIn('setVisible(mobile?.matches?1:desktopCount)', APP)
        self.assertIn('@media(max-width:620px){.homepage-crops,.request-grid{grid-template-columns:1fr}', CSS)

    def test_mobile_context_caps_at_two(self):
        self.assertIn('.visual-insights .article-card:nth-child(n+3){display:none}', CSS)

    def test_homepage_mobile_news_has_four_compact_items(self):
        self.assertIn('news.items.slice(0,4)', APP)
        self.assertIn('grid-template-columns:88px minmax(0,1fr)', CSS)

    def test_news_archive_is_compact_two_columns(self):
        self.assertIn('.news-grid{grid-template-columns:repeat(2,minmax(0,1fr))', CSS)
        self.assertIn('.news-grid .news-card{display:grid;grid-template-columns:142px', CSS)

    def test_news_batch_rule_and_permanent_archive(self):
        self.assertIn('Permanent PUBLIC_SAFE archive', APP)
        self.assertIn('complete batches of four', APP)

    def test_insights_archive_three_columns(self):
        self.assertIn('article-grid insights-grid', APP)
        self.assertIn('.insights-grid{grid-template-columns:repeat(3,minmax(0,1fr))', CSS)

    def test_footer_logo_has_dark_background_safe_plate(self):
        self.assertIn('footer-logo brand-plate', APP)
        self.assertIn('.brand-plate{background:var(--sand)!important', CSS)
        self.assertIn('mix-blend-mode:multiply', CSS)

    def test_search_and_marketplace_integrity(self):
        for token in ('species?.common_name_en','species?.botanical_name','variety','active.filter(x=>x.listing_type'):
            self.assertIn(token, APP)


if __name__ == "__main__":
    unittest.main()
