import unittest
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
APP=(ROOT/"src/AppV2.jsx").read_text()
CSS=(ROOT/"src/styles.css").read_text()

class MasterHomepageDesignTests(unittest.TestCase):
    def test_single_market_signal(self): self.assertIn("signal-crops signal-single",APP); self.assertIn("<TradePulseSignal/>",APP); self.assertNotIn("useCarousel(total,7000,1)",APP); self.assertNotIn("pulse=carousel.position===0",APP)
    def test_market_signal_numbers_visible(self): self.assertIn("view.latest.volume_tonnes",APP)
    def test_direction_colours(self): self.assertIn('up?"▲":"▼"',APP); self.assertIn(".trend.down{color:#ff8181}",CSS)
    def test_signal_mini_chart(self): self.assertIn('className="mini-chart trade-pulse-chart"',APP)
    def test_hero_data_rotation_removed(self): self.assertNotIn("Previous Market Signal",APP)
    def test_kpi_strip(self):
        for value in ("publicData.datasets.comext.public_safe_observations","weather.region_count","latest completed period"): self.assertIn(value,APP)
    def test_top_news_is_four_card_row(self):
        self.assertIn('news.items.slice(0,4)',APP)
        self.assertIn('grid-template-columns:repeat(4,minmax(0,1fr))',CSS)
    def test_three_intelligence_cards(self):
        for label in ("Weather & Seed Risk","Seed Production Monitor","Supply / Crop Intelligence"): self.assertIn(label,APP)
    def test_four_crop_snapshot(self): self.assertIn("useCarousel(market.crops.length,2500,4)",APP); self.assertIn("circularSlice(market.crops",APP)
    def test_visual_insights(self):
        self.assertIn("visual-insights",APP)
        self.assertIn("EditorialVisual",APP)
        self.assertIn(".visual-insights .article-card:before,.visual-insights .article-card:after{content:none}",CSS)
    def test_demo_requests_are_not_links(self): self.assertIn('request.demo?<span className="demo-link">',APP)
    def test_join_fields_present(self):
        for label in ("Company name","Business email","Role","Country","Register interest"): self.assertIn(label,APP)
    def test_homepage_summary_to_detail(self):
        for route in ('href="/market"','href="/news"','href="/insights"','href="/buying-requests"'): self.assertIn(route,APP)

if __name__=="__main__": unittest.main()
