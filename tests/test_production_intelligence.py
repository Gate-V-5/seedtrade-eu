import hashlib, json, subprocess, unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
class ProductionIntelligenceTests(unittest.TestCase):
    def test_public_approval_manifest_and_minimal_fields(self):
        raw=(ROOT/'src/generated/production_public.json').read_bytes();d=json.loads(raw);p=json.loads((ROOT/'docs/production-intelligence/PROVENANCE.json').read_text())
        self.assertEqual(hashlib.sha256(raw).hexdigest(),p['public_artifact_sha256'])
        for r in d['observations']:
            signature=hashlib.sha256(json.dumps(r,ensure_ascii=False,sort_keys=True,separators=(',',':')).encode()).hexdigest()
            self.assertEqual(signature,p['projected_record_hashes'][r['id']])
            self.assertNotIn(r['metric'],['COMMODITY_CROP_AREA','SEED_STOCK'])
            self.assertEqual(set(r),{'id','entity','country','year','metric','unit','value','source','evidence','definition','season','category','crop_use','species_scope','source_botanical'})
        self.assertEqual(len(d['observations']),len(p['projected_record_hashes']))
        text=raw.decode()
        for forbidden in ['PRIVATE_DATA','/workspace/','raw_evidence_files','comparison_exclusion_reason','credentials','REVIEW_REQUIRED']:
            self.assertNotIn(forbidden,text)
    def test_behavioral_evidence_contracts(self):
        subprocess.run(['node','--test','tests/productionEvidence.test.mjs'],cwd=ROOT,check=True,capture_output=True)
    def test_rendering_languages_routes_and_public_evidence(self):
        subprocess.run(['node','scripts/check_production_intelligence.mjs'],cwd=ROOT,check=True,capture_output=True)

    def test_responsive_css_dom_contracts(self):
        subprocess.run(["node","scripts/check_production_responsive.mjs"],cwd=ROOT,check=True,capture_output=True)

    def test_built_production_data_is_route_only(self):
        subprocess.run(["python3","scripts/check_production_bundle.py"],cwd=ROOT,check=True,capture_output=True)
