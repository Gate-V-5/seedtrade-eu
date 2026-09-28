import re
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
APP = (ROOT / "src/AppV2.jsx").read_text(encoding="utf-8")
CSS = (ROOT / "src/styles.css").read_text(encoding="utf-8")


class UIFixV1(unittest.TestCase):
    def test_commercial_grid_has_final_three_column_rule(self):
        three = ".intelligence-grid.intelligence-commercial{grid-template-columns:repeat(3,minmax(0,1fr))"
        self.assertIn(three, CSS)
        self.assertGreater(CSS.rfind(three), CSS.rfind(".intelligence-commercial{grid-template-columns:repeat(4,minmax(0,1fr))"))

    def test_final_grid_breakpoints_are_two_then_one(self):
        tablet = "@media(max-width:1050px){.intelligence-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}"
        mobile = "@media(max-width:620px){.intelligence-grid,.signal-crops,.news-list,.homepage-crops,.request-grid{grid-template-columns:1fr}"
        self.assertIn(tablet, CSS)
        self.assertIn(mobile, CSS)
        self.assertGreater(CSS.rfind(tablet), CSS.rfind("@media(max-width:820px){.intelligence-grid,.visual-insights{grid-template-columns:1fr}"))

    def test_contact_hash_navigation_is_deterministic(self):
        hook = APP[APP.index("function useHashNavigation"):APP.index("function Logo")]
        self.assertIn('window.location.hash.slice(1)', hook)
        self.assertIn('document.getElementById(id)', hook)
        self.assertIn('target.scrollIntoView({ block: "start" })', hook)
        self.assertIn('window.addEventListener("hashchange", scheduleScroll)', hook)
        self.assertIn('window.removeEventListener("hashchange", scheduleScroll)', hook)
        self.assertIn("useHashNavigation(path)", APP)

    def test_contact_target_and_sticky_offset_remain_present(self):
        self.assertGreaterEqual(APP.count('href="/about/#contact"'), 2)
        self.assertIn('id="contact"', APP)
        self.assertIn("#contact{scroll-margin-top:100px}", CSS)
        self.assertIn("@media(max-width:620px){#contact{scroll-margin-top:86px}", CSS)

    def test_contact_safety_properties_are_unchanged(self):
        section = APP[APP.index('id="contact"'):APP.index("function InfoPage")]
        self.assertIn('href="mailto:info@seedtrade.eu"', section)
        self.assertIn("onSubmit={event=>event.preventDefault()}", section)
        self.assertNotRegex(section, re.compile(r"fetch\(|axios|formData|network@seedtrade\.eu", re.I))


if __name__ == "__main__":
    unittest.main()
