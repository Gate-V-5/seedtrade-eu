import json,re,unittest
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]

class PreLaunchRC1Tests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.app=(ROOT/"src/AppV2.jsx").read_text()
        cls.analytics=(ROOT/"src/legal/analyticsPolicy.mjs").read_text()
        cls.index=(ROOT/"index.html").read_text()
        cls.dist=ROOT/"dist"
        cls.market=json.loads((ROOT/"src/generated/market_public.json").read_text())

    def test_gtm_not_unconditionally_in_head(self):
        self.assertNotIn("googletagmanager.com/gtm.js",self.index)
    def test_gtm_noscript_not_unconditional(self):
        self.assertNotIn("googletagmanager.com/ns.html",self.index)
    def test_analytics_policy_is_unconditionally_off(self):
        self.assertIn('NON_ESSENTIAL_ANALYTICS_ENABLED=false',self.analytics)
        self.assertIn('function loadGTM(){return false;}',self.analytics)
        self.assertIn('function track(){return false;}',self.analytics)
    def test_app_has_no_tracker_injection(self):
        self.assertIn("import {track,loadGTM} from './legal/analyticsPolicy.mjs'",self.app)
        self.assertNotIn('googletagmanager.com',self.app)
        self.assertNotIn('dataLayer',self.app)
    def test_no_analytics_opt_in_banner_or_legacy_consent_read(self):
        self.assertIn('function Consent() { return null }',self.app)
        self.assertNotIn('seedtrade_analytics_consent',self.app)
        self.assertNotIn('Allow analytics',self.app)
    def test_private_routes_have_static_noindex(self):
        for route in ("rfq","offer","account","admin"):
            page=(self.dist/route/"index.html").read_text()
            self.assertIn('content="noindex,nofollow"',page)
    def test_public_routes_do_not_duplicate_description(self):
        for page in self.dist.rglob("index.html"):
            if any(x in page.parts for x in ("rfq","offer","account","admin")): continue
            self.assertEqual(len(re.findall(r'<meta\s+name="description"',page.read_text(),re.I)),1,str(page))
    def test_public_routes_do_not_duplicate_canonical(self):
        for page in self.dist.rglob("index.html"):
            self.assertEqual(len(re.findall(r'<link\s+rel="canonical"',page.read_text(),re.I)),1,str(page))
    def test_public_routes_do_not_duplicate_og_title(self):
        for page in self.dist.rglob("index.html"):
            self.assertEqual(len(re.findall(r'<meta\s+property="og:title"',page.read_text(),re.I)),1,str(page))
    def test_market_has_dataset_jsonld(self):
        self.assertIn('"@type": "Dataset"',(self.dist/"market/index.html").read_text())
    def test_crop_pages_have_dataset_jsonld(self):
        for crop in self.market["crops"]:
            self.assertIn('"@type": "Dataset"',(self.dist/"market"/crop["slug"]/"index.html").read_text())
    def test_dataset_jsonld_uses_completed_period(self):
        page=(self.dist/"market/index.html").read_text()
        self.assertIn(f'"temporalCoverage": "{self.market["latest_completed_period"]}"',page)
        self.assertNotIn(f'"temporalCoverage": "{self.market["latest_available_period"]}"',page)
    def test_dataset_jsonld_attributes_eurostat(self):
        self.assertIn("Eurostat COMEXT DS-045409",(self.dist/"market/index.html").read_text())
    def test_disabled_analytics_has_no_tag_id(self):
        self.assertNotIn('GTM-K9SVZHR7',self.app)
    def test_private_routes_absent_from_sitemap(self):
        sitemap=(ROOT/"public/sitemap.xml").read_text()
        for route in ("rfq","offer","account","admin"):
            self.assertNotIn(f"https://seedtrade.eu/{route}</loc>",sitemap)

if __name__=="__main__": unittest.main()
