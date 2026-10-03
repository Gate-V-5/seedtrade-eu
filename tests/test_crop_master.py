import csv,hashlib,json,subprocess,unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
def load(path):return json.loads((ROOT/path).read_text())
class CropMasterTests(unittest.TestCase):
 def test_identity_category_and_provenance(self):
  master=load('docs/crop-master-v1/CROP_MASTER_V1.json');categories={x['id'] for x in load('docs/crop-master-v1/CATEGORY_TAXONOMY_V1.json')}
  self.assertEqual(len(master),len({x['id'] for x in master}))
  for e in master:
   self.assertIn(e['category'],categories);self.assertTrue(e['provenance']);self.assertIsNone(e['import_only'])
   if e['rank'] in ['SPECIES','SUBSPECIES','HYBRID_SPECIES']:
    self.assertTrue(e['botanical']);self.assertTrue(e['genus']);self.assertTrue(e['species'])
   if e['kpi_eligible']:self.assertEqual(e['classification'],'PUBLIC_SAFE');self.assertEqual(e['propagation_kind'],'TRUE_SEED')
  self.assertEqual(len(load('docs/crop-master-v1/CATCH_CROP_RECOVERY_AUDIT_V1.json')),65)
  self.assertTrue(all(x['canonical_id'] for x in load('docs/crop-master-v1/CATCH_CROP_RECOVERY_AUDIT_V1.json')))
  self.assertEqual(len(load('docs/crop-master-v1/SOURCE_TAXONOMY_MAPPINGS_V1.json')),126)
 def test_cn_and_coverage_guards(self):
  for e in load('docs/crop-master-v1/CROP_MASTER_V1.json'):
   self.assertIn(e['trade_mapping']['status'],['SPECIES_SPECIFIC','GROUP_LEVEL','NOT_AVAILABLE','PARTIAL','REVIEW_REQUIRED'])
   if e['trade_mapping']['status']=='SPECIES_SPECIFIC':self.assertEqual(e['cn']['mapping_status'],'CN_MAPPING_CONFIRMED')
   self.assertEqual(e['cn']['sowing_seed']['usage'],'SOWING_SEED')
   self.assertEqual(e['cn']['non_sowing_commodity']['usage'],'NON_SOWING_COMMODITY')
  prod=load('src/generated/production_public.json');self.assertEqual(len(prod['observations']),1669)
  self.assertEqual({x['metric'] for x in prod['observations']},{'SEED_PRODUCTION_AREA','CERTIFIED_SEED_AREA','CERTIFIED_QUANTITY'})
  for item in load('docs/crop-master-v1/PROVENANCE_MANIFEST.json')['inputs']:
   self.assertEqual(hashlib.sha256((ROOT/item['path']).read_bytes()).hexdigest(),item['sha256'])
 def test_csv_json_parity(self):
  for p in (ROOT/'docs/crop-master-v1').glob('*.csv'):
   original=json.loads(p.with_suffix('.json').read_text())
   with p.open(newline='') as f:rows=list(csv.DictReader(f))
   self.assertEqual(len(rows),len(original))
   for a,b in zip(original,rows):
    for k,v in a.items():self.assertEqual(b[k],json.dumps(v,ensure_ascii=False,separators=(',',':')) if isinstance(v,(list,dict,bool)) or v is None else str(v))
 def test_behavioral_model(self):
  subprocess.run(['node','--test','tests/cropMaster.test.mjs'],cwd=ROOT,check=True,capture_output=True)
