import json
import re
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PACKAGE = json.loads((ROOT / "package.json").read_text(encoding="utf-8"))
NODE_SCRIPT = (ROOT / "scripts/prerender_seo.mjs").read_text(encoding="utf-8")
DIST = ROOT / "dist"


class HostingerNodeBuildFixTests(unittest.TestCase):
    def test_production_build_uses_node_prerender(self):
        build = PACKAGE["scripts"]["build:vite"]
        self.assertIn("node scripts/prerender_seo.mjs", build)
        self.assertNotRegex(build, r"(?:^|\s)(?:python|python3|py)(?:\s|$)")

    def test_node_prerender_is_real_implementation(self):
        for marker in ("canonical", "og:title", "application/ld+json", "noindex,nofollow", "Dataset", "NewsArticle"):
            self.assertIn(marker, NODE_SCRIPT)

    def test_old_python_prerender_is_absent(self):
        self.assertFalse((ROOT / "scripts/prerender_seo.py").exists())

    def test_homepage_remains_static_first(self):
        page = (DIST / "index.html").read_text(encoding="utf-8")
        self.assertNotIn('<div id="root"></div>', page)
        self.assertIn("Market Signal", page)

    def test_public_route_metadata(self):
        for route in ("market", "news", "insights", "buying-requests"):
            page = (DIST / route / "index.html").read_text(encoding="utf-8")
            self.assertEqual(len(re.findall(r'<link\s+rel="canonical"', page, re.I)), 1)
            self.assertIn('content="index,follow"', page)

    def test_private_routes_are_noindex(self):
        for route in ("rfq", "offer", "account", "admin"):
            page = (DIST / route / "index.html").read_text(encoding="utf-8")
            self.assertIn('content="noindex,nofollow"', page)

    def test_structured_data_types(self):
        market = (DIST / "market/index.html").read_text(encoding="utf-8")
        news = next((DIST / "news").glob("*/index.html")).read_text(encoding="utf-8")
        insight = next((DIST / "insights").glob("*/index.html")).read_text(encoding="utf-8")
        self.assertIn('"@type": "Dataset"', market)
        self.assertIn('"@type": "NewsArticle"', news)
        self.assertRegex(insight, r'"@type": "(?:Article|Event)"')

    def test_sitemap_and_robots_are_present(self):
        self.assertTrue((DIST / "sitemap.xml").is_file())
        self.assertTrue((DIST / "robots.txt").is_file())


if __name__ == "__main__":
    unittest.main()
