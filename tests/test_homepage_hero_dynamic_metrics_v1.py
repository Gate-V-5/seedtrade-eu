import json
import re
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
APP = (ROOT / "src/AppV2.jsx").read_text(encoding="utf-8")
CSS = (ROOT / "src/styles.css").read_text(encoding="utf-8")


class HomepageHeroDynamicMetricsV1(unittest.TestCase):
    def test_one_hero_coverage_summary_without_separate_strip(self):
        home = APP[APP.index("function Home()"):APP.index("function IntelligenceOverview")]
        self.assertEqual(home.count("<HeroCoverageMetrics/>"), 1)
        self.assertNotIn('className="platform-kpis"', home)
        self.assertLess(home.index("<HeroCoverageMetrics/>"), home.index("<SignalPanel/>"))
        self.assertLess(home.index("<SignalPanel/>"), home.index('className="top-news"'))

    def test_metrics_reuse_canonical_data_and_completed_period(self):
        metrics = APP[APP.index("function HeroCoverageMetrics()"):APP.index("function Home()")]
        for expression in (
            "countDistinctSeedSpecies(cropMasterSummary.entities)",
            "publicData.datasets.comext.public_safe_observations",
            "weather.region_count",
            "market.latest_completed_period",
        ):
            self.assertIn(expression, metrics)
        self.assertNotIn("2026-06", metrics)
        self.assertNotIn("2026-07", metrics)

    def test_compact_responsive_metrics_and_tighter_news_transition(self):
        self.assertIn(".dashboard-hero .hero-intro{display:flex;flex-direction:column;align-items:stretch;justify-content:center;gap:26px}", CSS)
        self.assertIn(".hero-coverage{display:grid;grid-template-columns:repeat(3,minmax(0,1fr))", CSS)
        self.assertIn(".hero-coverage{grid-template-columns:repeat(5,minmax(0,1fr))}", CSS)
        self.assertIn(".hero-coverage{grid-template-columns:repeat(2,minmax(0,1fr))}", CSS)
        self.assertIn("main .top-news{margin-top:12px!important}", CSS)
        self.assertIn(".dashboard-hero .hero-copy{margin:0}", CSS)
        hero_css = CSS[CSS.index("/* Homepage Hero + Dynamic Metrics V1") : CSS.index("/* UI Completion V1")]
        self.assertNotRegex(hero_css, re.compile(r"overflow-x:auto"))

    def test_static_homepage_contains_one_summary(self):
        page = (ROOT / "dist/index.html").read_text(encoding="utf-8")
        market = json.loads((ROOT / "src/generated/market_public.json").read_text(encoding="utf-8"))
        weather = json.loads((ROOT / "src/generated/weather_public.json").read_text(encoding="utf-8"))
        manifest = json.loads((ROOT / "src/generated/public_data_manifest.json").read_text(encoding="utf-8"))
        self.assertEqual(page.count('class="hero-coverage"'), 1)
        self.assertNotIn('class="platform-kpis"', page)
        for text in (
            str(json.loads((ROOT / "src/generated/crop_master_summary.json").read_text())["distinct_seed_species"]),
            f'{manifest["datasets"]["comext"]["public_safe_observations"]:,}',
            str(weather["region_count"]),
            market["latest_completed_period"],
            "Top News",
        ):
            self.assertIn(text, page)
        self.assertNotIn('<div id="root"></div>', page)


if __name__ == "__main__":
    unittest.main()
