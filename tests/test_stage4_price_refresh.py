import importlib.util,hashlib,json,shutil,tempfile,unittest
from pathlib import Path
from unittest.mock import patch
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('price_refresh',ROOT/'scripts/refresh_price_evidence.py');module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
class PriceRefresh(unittest.TestCase):
 def setUp(self):
  self.temp=tempfile.TemporaryDirectory(dir=ROOT/'tmp');self.root=Path(self.temp.name)
  for name in ['data/price-evidence','src/generated']:(self.root/name).mkdir(parents=True,exist_ok=True)
  shutil.copytree(ROOT/'data/price-evidence',self.root/'data/price-evidence',dirs_exist_ok=True)
  for name in ['price_evidence_public.json','market_catalogue_public.json']:shutil.copyfile(ROOT/'src/generated'/name,self.root/'src/generated'/name)
  (self.root/'scripts').mkdir();shutil.copyfile(ROOT/'scripts/validate_price_evidence.mjs',self.root/'scripts/validate_price_evidence.mjs')
  self.ledger=self.root/'data/price-evidence/observations.json';self.public=self.root/'src/generated/price_evidence_public.json';self.before=(self.ledger.read_bytes(),self.public.read_bytes())
 def tearDown(self):self.temp.cleanup()
 def candidate(self,data):
  f=self.root/'reviewed.json';f.write_text(json.dumps(data),encoding='utf8');return f,hashlib.sha256(f.read_bytes()).hexdigest()
 def test_exact_content_review_and_idempotency(self):
  f,h=self.candidate(json.loads(self.ledger.read_bytes()));result=module.promote(self.root,f,h);self.assertEqual(result['observations'],3);self.assertFalse(result['deployed'])
 def test_unreviewed_hash_cannot_replace_existing_data(self):
  f,h=self.candidate({'records':[]})
  with self.assertRaisesRegex(ValueError,'CONTENT_BOUND'):module.promote(self.root,f,'0'*64)
  self.assertEqual((self.ledger.read_bytes(),self.public.read_bytes()),self.before)
 def test_history_is_immutable(self):
  d=json.loads(self.ledger.read_bytes());d['records'][0]['price']=1;f,h=self.candidate(d)
  with self.assertRaisesRegex(ValueError,'OVERWRITE_FORBIDDEN'):module.promote(self.root,f,h)
  self.assertEqual((self.ledger.read_bytes(),self.public.read_bytes()),self.before)
 def test_tampered_or_incomplete_new_record_restores_last_good(self):
  d=json.loads(self.ledger.read_bytes());r=dict(d['records'][0]);r['id']='invalid-new';r['evidenceSha256']='0'*64;d['records']=[r];f,h=self.candidate(d)
  with self.assertRaisesRegex(ValueError,'VALIDATION_FAILED'):module.promote(self.root,f,h)
  self.assertEqual((self.ledger.read_bytes(),self.public.read_bytes()),self.before)
 def test_source_failure_cannot_publish_or_lose_history(self):
  with patch.object(module.urllib.request,'urlopen',side_effect=OSError('source unavailable')):rows=module.discover(self.root,self.root/'discovery.json')
  self.assertTrue(all(r['status']=='SOURCE_UNAVAILABLE_LAST_GOOD_RETAINED' for r in rows));self.assertEqual((self.ledger.read_bytes(),self.public.read_bytes()),self.before)
if __name__=='__main__':unittest.main()
