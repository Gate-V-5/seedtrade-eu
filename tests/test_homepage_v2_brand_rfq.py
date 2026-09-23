import hashlib, json, struct, unittest
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]

class HomepageV2BrandRFQTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.app=(ROOT/"src/AppV2.jsx").read_text()
        cls.css=(ROOT/"src/styles.css").read_text()
        cls.rfqs=json.loads((ROOT/"src/generated/rfqs_public.json").read_text())
        cls.logo=ROOT/"public/seedtrade-official-logo.png"

    def test_official_logo_exact_hash(self):
        self.assertEqual(hashlib.sha256(self.logo.read_bytes()).hexdigest(),"4698ad58b6d85ac6aea508cff72afa8e99b7b3e4a1e36d0891b93482e993e3de")

    def test_official_logo_dimensions_preserved(self):
        raw=self.logo.read_bytes(); self.assertEqual(raw[:8],b"\x89PNG\r\n\x1a\n")
        self.assertEqual(struct.unpack(">II",raw[16:24]),(750,118))

    def test_logo_used_by_header_and_footer(self):
        self.assertIn('const OFFICIAL_LOGO = "/seedtrade-official-logo.png"',self.app)
        self.assertIn("<Logo/>",self.app); self.assertIn("<Logo footer/>",self.app)

    def test_no_css_or_text_logo_recreation_in_app(self):
        self.assertNotIn("GlobeMark",self.app); self.assertNotIn("logo-mark",self.app)

    def test_active_only_filter(self):
        self.assertIn('item.status === "ACTIVE"',self.app)
        self.assertIn('item.classification === "PUBLIC_SAFE"',self.app)

    def test_expiry_filter(self): self.assertIn("new Date(item.expires_at) > now",self.app)
    def test_rfq_rotation(self): self.assertIn("useCarousel(display.length,2500,4)",self.app); self.assertIn("circularSlice(display,carousel.position,carousel.visible)",self.app)
    def test_rfq_group_size(self): self.assertIn("desktopCount = 4",self.app); self.assertIn("mobile?.matches?1:desktopCount",self.app)
    def test_rfq_detail_route(self): self.assertIn('path.startsWith("/buying-requests/")',self.app)
    def test_rfq_view_all_route(self): self.assertIn('href="/buying-requests"',self.app)

    def test_demo_rfq_is_unmistakably_labelled(self):
        self.assertIn("DEMO — NOT REAL DEMAND",self.app)
        self.assertIn("Illustrative TEST card",self.app)
        self.assertIn("these cards are not actual demand",self.app)

    def test_no_public_private_contact_fields(self):
        self.assertEqual(self.rfqs["items"],[])
        for key in ("company","contact","email","phone","document"):
            self.assertNotIn(f'"{key}"',json.dumps(self.rfqs["items"]).lower())

    def test_real_rfq_source_remains_empty(self): self.assertEqual(self.rfqs["items"],[])
    def test_responsive_request_layout(self):
        self.assertIn("grid-template-columns:repeat(4",self.css)
        self.assertIn(".request-grid,.rfq-filter-architecture{grid-template-columns:1fr}",self.css)

    def test_homepage_module_order(self):
        self.assertLess(self.app.index("<ActiveBuyingRequests/>"),self.app.index("<NetworkInterest/>"))
        self.assertLess(self.app.index("Research & Partner Insights"),self.app.index("<ActiveBuyingRequests/>"))

    def test_market_signal_fail_closed(self): self.assertIn("Directional signal is withheld",self.app)
    def test_market_signal_rotation_disclaimer(self): self.assertIn("this is not a data-refresh interval",self.app.lower())
    def test_disabled_join_submission(self): self.assertIn('onSubmit={event => event.preventDefault()}',self.app); self.assertIn("Register interest",self.app)
    def test_verified_homepage_observation_count(self): self.assertIn("37,667+",self.app)

if __name__=="__main__": unittest.main()
