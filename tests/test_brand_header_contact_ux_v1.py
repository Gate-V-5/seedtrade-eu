import struct
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
APP = (ROOT / "src/AppV2.jsx").read_text()
CSS = (ROOT / "src/styles.css").read_text()
INDEX = (ROOT / "index.html").read_text()


class BrandHeaderContactUXV1(unittest.TestCase):
    def test_favicon_static_discovery(self):
        for name in ("favicon.ico", "favicon-16x16.png", "favicon-32x32.png", "apple-touch-icon.png"):
            self.assertIn(f"/{name}?v=brand-v1", INDEX)
            self.assertTrue((ROOT / "public" / name).is_file())

    def test_favicon_png_validity(self):
        expected = {"favicon-16x16.png": (16, 16), "favicon-32x32.png": (32, 32), "apple-touch-icon.png": (180, 180)}
        for name, dimensions in expected.items():
            raw = (ROOT / "public" / name).read_bytes()
            self.assertEqual(raw[:8], b"\x89PNG\r\n\x1a\n")
            self.assertEqual(struct.unpack(">II", raw[16:24]), dimensions)
        self.assertEqual((ROOT / "public/favicon.ico").read_bytes()[:4], b"\x00\x00\x01\x00")

    def test_sticky_global_header_all_viewports(self):
        self.assertIn("position:sticky", CSS)
        self.assertNotIn(".topbar{position:relative;display:grid", CSS)
        self.assertIn("z-index:100", CSS)
        self.assertIn("html,body,#root{max-width:100%;overflow-x:clip}", CSS)
        self.assertNotIn("html,body,#root{max-width:100%;overflow-x:hidden}", CSS)

    def test_contact_navigation_and_anchor_offset(self):
        self.assertGreaterEqual(APP.count('href="/about/#contact"'), 2)
        self.assertIn('id="contact"', APP)
        self.assertIn("#contact{scroll-margin-top:100px}", CSS)

    def test_contact_copy_and_email(self):
        self.assertIn("Questions about SeedTrade, market intelligence, partnerships or cooperation? Send us a message.", APP)
        self.assertIn("General enquiries:", APP)
        self.assertIn('href="mailto:info@seedtrade.eu"', APP)
        self.assertNotIn("network@seedtrade.eu", APP)

    def test_contact_form_is_non_submitting_and_non_storing(self):
        self.assertIn("Contact form activation coming next.", APP)
        self.assertIn("No information entered here is submitted or stored.", APP)
        self.assertIn("onSubmit={event=>event.preventDefault()}", APP)
        self.assertGreaterEqual(APP.count("disabled required"), 5)
        self.assertIn('<button type="submit" disabled>Send message</button>', APP)
        for forbidden in ("fetch(", "axios", "smtp", "formData", "localStorage.setItem"):
            self.assertNotIn(forbidden, APP[APP.index('id="contact"'):APP.index('function InfoPage')])

    def test_subject_options_and_responsive_structure(self):
        for option in ("Market Intelligence", "Data &amp; Methodology", "Partnership", "Media &amp; General Enquiry", "Other"):
            self.assertIn(f"<option>{option}</option>", APP)
        self.assertIn("@media(max-width:900px){.contact-section{grid-template-columns:1fr}", CSS)
        self.assertIn("@media(max-width:620px){#contact{scroll-margin-top:86px}", CSS)
        self.assertIn("@media(max-width:1050px){", CSS)
        self.assertIn(".topbar.menu-open nav{display:grid}", CSS)


if __name__ == "__main__":
    unittest.main()
