import csv,hashlib,json,pathlib,subprocess,unittest
R=pathlib.Path(__file__).resolve().parents[1]
def read(p):return json.loads((R/p).read_text())
class TradeCNCoverage(unittest.TestCase):
 def test_complete_species_and_scope(self):
  a=read('docs/trade-cn-v1/CN_AUDIT_121.json');e=read('docs/trade-cn-v1/TRADE_MARKET_ENTITIES.json');rows=read('data/trade-cn-v1/comext-normalized.json')
  self.assertEqual(len(a),121);self.assertEqual(len({r['canonical_species_id'] for r in a}),121);self.assertTrue(all(r['botanical_name'] and r['taxonomy_provenance'] for r in a))
  self.assertEqual(len({r['cn8'] for r in e}),len(e));self.assertEqual(len({r['id'] for r in rows}),len(rows))
  official={r['cn8']:r for r in read('data/trade-cn-v1/official-cn-extract.json') if r['year']==2026}
  for x in e:
   self.assertEqual(x['sowing_status'],'SOWING_SPECIFIC');self.assertIn('for sowing',official[x['cn8']]['description']);self.assertNotIn('excl. for sowing',official[x['cn8']]['description']);self.assertFalse(x['contains_non_seed_material'])
   if len(x['species_ids'])>1:self.assertEqual(x['granularity'],'GROUP_LEVEL')
  baseline={r['cn8'] for r in read('src/generated/market_public.json')['crops']}
  for x in rows:
   self.assertNotIn(x['cn8'],baseline);self.assertEqual(x['net_weight_kg'],round(x['original_quantity']*100,6));self.assertGreaterEqual(x['trade_value_eur'],0);self.assertIsNone(x['representative_price']);self.assertTrue(x['source_url'].startswith('https://ec.europa.eu/eurostat/'));self.assertIn(x['period'][:4],['2025','2026'])
  clover=next(x for x in e if x['cn8']=='12092280');self.assertGreater(len(clover['species_ids']),1)
  for name in ['ANNUAL_REPORTED_TRADE','CN_AUDIT_121','TRADE_MARKET_ENTITIES','SPECIES_CN_TRADE_MAP','TRADE_COVERAGE','PRODUCTION_TRADE_INTERSECTION','UNRESOLVED_MAPPINGS']:
   with (R/f'docs/trade-cn-v1/{name}.csv').open() as f:c=list(csv.DictReader(f))
   j=read(f'docs/trade-cn-v1/{name}.json');self.assertEqual(len(c),len(j))
   for x,y in zip(c,j):
    for k,v in y.items():self.assertEqual(json.loads(x[k]) if isinstance(v,(list,dict,bool)) or v is None else x[k],v if isinstance(v,(list,dict,bool)) or v is None else str(v))
 def test_baseline_unchanged_and_no_leakage(self):
  for p in ['src/generated/market_public.json','src/generated/trade_pulse_public.json','src/generated/production_public.json','src/generated/production_coverage_additions.json','src/generated/crop_master_summary.json','docs/crop-master-v1/CROP_MASTER_V1.json','src/styles.css','src/ProductionIntelligence.jsx']:
   old=subprocess.check_output(['git','show','9e52d03c7a761fcbc0d802451c95a147d0583bca:'+p],cwd=R);self.assertEqual((R/p).read_bytes(),old,p)
  raw=(R/'public/data/trade-cn-coverage-v1.json').read_text()
  for forbidden in ['PRIVATE_DATA','/workspace/','C:\\Users\\','api_key','access_token']:self.assertNotIn(forbidden,raw)
  s=read('docs/trade-cn-v1/SUMMARY.json');self.assertEqual(sum(s['CN_STATUS_COUNTS'].values()),121);self.assertEqual(sum(s['INTERSECTION'].values()),121);self.assertEqual(s['SPECIES_WITH_PRODUCTION_DATA'],82)
