import re
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
APP = (ROOT / "src/AppV2.jsx").read_text(encoding="utf-8")
CSS = (ROOT / "src/styles.css").read_text(encoding="utf-8")


class UICompletionV1(unittest.TestCase):
    def test_sticky_header_has_no_overflow_ancestor_regression(self):
        self.assertIn("position:sticky", CSS)
        self.assertIn("top:0", CSS)
        self.assertIn("z-index:100", CSS)
        self.assertIn("html,body,#root{max-width:100%;overflow-x:clip}", CSS)
        self.assertNotIn("html,body,#root{max-width:100%;overflow-x:hidden}", CSS)

    def test_intelligence_layout_breakpoints(self):
        self.assertIn(".intelligence-grid{grid-template-columns:repeat(4,minmax(0,1fr))}", CSS)
        self.assertIn("@media(max-width:1050px){.intelligence-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}", CSS)
        self.assertIn("@media(max-width:620px){.intelligence-grid{grid-template-columns:1fr}}", CSS)
        self.assertIn(".intelligence-grid article>a{margin-top:auto", CSS)
        section = APP[APP.index("function IntelligenceOverview"):APP.index("function NetworkInterest")]
        self.assertEqual(section.count("<article>"), 3)

    def test_contact_is_general_and_non_collecting(self):
        section = APP[APP.index('id="contact"'):APP.index("function InfoPage")]
        self.assertIn("Questions about SeedTrade, market intelligence, partnerships or cooperation?", section)
        self.assertIn("General enquiries:", section)
        self.assertIn("mailto:info@seedtrade.eu", section)
        self.assertNotRegex(section, re.compile(r"buy(?:ing)? seed|sell(?:ing)? seed|marketplace offer|buying request", re.I))
        self.assertNotIn("network@seedtrade.eu", APP)
        self.assertIn("No information entered here is submitted or stored.", section)
        self.assertNotIn("fetch(", section)


if __name__ == "__main__":
    unittest.main()
