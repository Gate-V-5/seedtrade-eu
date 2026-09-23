import json,re,unittest
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]

class PreLaunchRC1Tests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.app=(ROOT/"src/AppV2.jsx").read_text()
        cls.index=(ROOT/"index.html").read_text()
        cls.dist=ROOT/"dist"
        cls.market=json.loads((ROOT/"src/generated/market_public.json").read_text())

    def test_gtm_not_unconditionally_in_head(self):
        self.assertNotIn("googletagmanager.com/gtm.js",self.index)
    def test_gtm_noscript_not_unconditional(self):
        self.assertNotIn("googletagmanager.com/ns.html",self.index)
    def test_gtm_loader_requires_granted_consent(self):
        loader=self.app[self.app.index("function loadGTM"):self.app.index("function useMetadata")]
        self.assertIn('!== "granted"',loader)
    def test_gtm_loader_is_singleton(self):
        self.assertIn('document.getElementById("seedtrade-gtm")',self.app)
    def test_decline_does_not_load_gtm(self):
        self.assertIn('if(v==="granted") loadGTM()',self.app)
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
    def test_gtm_id_is_existing_not_invented(self):
        self.assertIn('GTM-K9SVZHR7',self.app)
    def test_private_routes_absent_from_sitemap(self):
        sitemap=(ROOT/"public/sitemap.xml").read_text()
        for route in ("rfq","offer","account","admin"):
            self.assertNotIn(f"https://seedtrade.eu/{route}</loc>",sitemap)

if __name__=="__main__": unittest.main()
