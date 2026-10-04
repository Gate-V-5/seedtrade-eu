import unittest,json,csv,pathlib,decimal,collections
R=pathlib.Path(__file__).resolve().parents[1];O=R/'docs/trade-pulse-40cn-fail-resolution-v1';D=decimal.Decimal
class Resolution(unittest.TestCase):
 def read(self,n):return json.loads((O/(n+'.json')).read_text())
 def test_scope_partition(self):
  r=self.read('CN_CLASSIFICATION_40');self.assertEqual(len(r),40);self.assertEqual(len(set(x['cn8']for x in r)),40);self.assertEqual(sum(x['baseline_status']=='NEW_CN'for x in r),29);self.assertTrue(all(x['classification']=='CORE_SEED_TRADE'and x['sowing_use_confirmed']and x['public_safe']for x in r))
 def test_exact_aggregates(self):
  a=self.read('SAFE_AGGREGATES');self.assertEqual(sum(D(x['volume_kg_exact'])for x in a),D('251015101'));self.assertEqual(sum(D(x['value_eur_exact'])for x in a),D('400438328'));self.assertEqual([x['cn_count']for x in a],[40,0,0,0]);self.assertEqual(self.read('RECONCILIATION')['partition_residual_kg'],'0')
 def test_original_fail_remains(self):
  self.assertEqual(json.loads((R/'docs/trade-pulse-40cn-audit-v1/RELEASE_GATE.json').read_text())['release_gate'],'FAIL');m=self.read('MODEL_RECOMMENDATION');self.assertEqual(m['release_gate'],'PASS_CORE_ONLY');self.assertFalse(m['ui_changed']);self.assertEqual(m['selected'],'MODEL_A')
 def test_precisions(self):
  r={x['cn8']:x for x in self.read('CN_CLASSIFICATION_40')};self.assertEqual(r['10019110']['measurement_entity_id'],'spelt');self.assertEqual(r['10019120']['precision'],'GROUP_LEVEL');self.assertTrue(all(not x['linked_botanical_species_measured']for x in r.values()if x['botanical_precision']=='GROUP_LEVEL'));self.assertTrue(all(not r[c]['allocated_category']for c in ['12091000','12092960']))
 def test_category_partition_and_missingness(self):
  c=self.read('CATEGORY_ANALYSIS');u=self.read('CATEGORY_RECONCILIATION');self.assertEqual(len(c),10);self.assertEqual(sum(D(str(x['volume_tonnes']or 0))*1000 for x in c)+D(u['unallocated_kg']),D('251015101'));self.assertEqual(sum(D(str(x['trade_value_eur']or 0))for x in c)+D(u['unallocated_eur']),D('400438328'));self.assertTrue(all(x['trade_value_eur']is None for x in c if not x['cn_count']))
 def test_species_counts_are_not_group_measurements(self):
  s=self.read('SPECIES_COVERAGE');self.assertEqual(len(s),121);self.assertEqual(len({x['species_id']for x in s}),121);self.assertEqual(collections.Counter(x['coverage_reporting_bucket']for x in s),{'DIRECT_TRADE_DATA':20,'GROUP_LEVEL_TRADE_EVIDENCE':78,'NO_TRADE_EVIDENCE':23});self.assertTrue(all(not x['group_volume_allocated']and x['botanical']for x in s));self.assertEqual(sum(x['coverage']=='PARTIAL_SPECIES_SCOPE'for x in s),4)
 def test_master_unchanged(self):
  m=json.loads((R/'docs/crop-master-v1/SUMMARY.json').read_text());self.assertEqual(m['DISTINCT_SEED_SPECIES'],121);self.assertEqual(m['CANONICAL_MARKET_ENTITIES'],136);self.assertEqual(m['FINAL_SEED_CATEGORIES'],10);self.assertEqual(m['CATCH_CROP_SPECIES_INCLUDED'],52)
 def test_csv_json_parity(self):
  for p in O.glob('*.csv'):
   j=json.loads(p.with_suffix('.json').read_text())
   with p.open() as f:c=list(csv.DictReader(f))
   self.assertEqual(len(j),len(c))
   for x,y in zip(j,c):
    for k,v in x.items():
     expected=json.dumps(v,ensure_ascii=False,separators=(',',':'))if isinstance(v,(dict,list,bool))or v is None else str(v)
     self.assertEqual(y[k],expected,(p.name,k))
