import re
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DIST = ROOT / "dist"


class HostingerStaticFirstV4Tests(unittest.TestCase):
    def test_homepage_root_is_not_empty(self):
        page = (DIST / "index.html").read_text(encoding="utf-8")
        self.assertNotIn('<div id="root"></div>', page)
        self.assertGreater(len(re.search(r'<div id="root">([\s\S]+)</div><noscript>', page).group(1)), 10000)

    def test_homepage_static_sections_present(self):
        page = (DIST / "index.html").read_text(encoding="utf-8")
        for text in ("European seed market intelligence", "Market Signal", "Top News", "Current market numbers", "Research &amp; Partner Insights / Events", "Active Buying Requests"):
            self.assertIn(text, page)

    def test_official_logo_is_in_static_html(self):
        page = (DIST / "index.html").read_text(encoding="utf-8")
        self.assertIn('src="/seedtrade-official-logo.png"', page)
        self.assertTrue((DIST / "seedtrade-official-logo.png").is_file())

    def test_demo_rfq_disclosure_is_static(self):
        page = (DIST / "index.html").read_text(encoding="utf-8")
        self.assertGreaterEqual(page.count("DEMO — NOT REAL DEMAND"), 4)

    def test_javascript_and_css_are_physical(self):
        page = (DIST / "index.html").read_text(encoding="utf-8")
        refs = re.findall(r'(?:src|href)="(/assets/[^"]+)"', page)
        self.assertEqual(len(refs), 2)
        for ref in refs:
            self.assertTrue((DIST / ref.lstrip("/")).is_file(), ref)

    def test_nested_public_routes_are_static_first(self):
        for route in ("market", "market/red-clover", "news", "insights"):
            page = (DIST / route / "index.html").read_text(encoding="utf-8")
            self.assertNotIn('<div id="root"></div>', page)
            self.assertIn("seedtrade-official-logo.png", page)

    def test_noscript_explanation_is_present(self):
        page = (DIST / "index.html").read_text(encoding="utf-8")
        self.assertIn("SeedTrade public market intelligence is available without JavaScript", page)

    def test_client_uses_hydration_for_static_markup(self):
        source = (ROOT / "src/main.jsx").read_text(encoding="utf-8")
        self.assertIn("hydrateRoot(root, application)", source)
        self.assertIn("root.hasChildNodes()", source)

    def test_geography_object_is_formatted_before_render(self):
        source = (ROOT / "src/AppV2.jsx").read_text(encoding="utf-8")
        self.assertIn("function geographyLabel(item)", source)
        self.assertIn("item.geography?.region", source)
        self.assertNotIn("<b>{item.geography ||", source)


if __name__ == "__main__":
    unittest.main()
