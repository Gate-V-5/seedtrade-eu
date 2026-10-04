import unittest,json,pathlib,subprocess,decimal
R=pathlib.Path(__file__).resolve().parents[1];D=decimal.Decimal
def read(p):return json.loads((R/p).read_text())
class Trade40Release(unittest.TestCase):
 def test_month_only_aggregate_from_country_rows(self):
  p=read('src/generated/trade_pulse_public.json');self.assertEqual(p['period_semantics']['type'],'MONTH_ONLY');self.assertEqual(p['period_semantics']['start'],'2026-06-01');self.assertEqual(p['period_semantics']['end'],'2026-06-30')
  r=[x for x in read('src/generated/country_customs_totals.json')['rows']if x[1]=='EU'and x[2]=='eu_internal_trade'and x[3]=='2026-06'];self.assertEqual(len(r),40);self.assertEqual(sum(D(str(x[4]))for x in r),D('251015101'));self.assertEqual(sum(D(str(x[5]))for x in r),D('400438328'));self.assertEqual(p['views']['eu_internal_trade']['latest']['volume_tonnes'],251015.1)
 def test_corrected_attribution_is_public(self):
  d=read('src/generated/trade_cn_public.json');e={x['cn8']:x for x in d['entities']};self.assertEqual(e['10019110']['species_ids'],['spelt']);self.assertEqual(e['10019110']['botanical_names'],['Triticum aestivum subsp. spelta']);self.assertEqual(e['10019120']['granularity'],'GROUP_LEVEL');self.assertTrue(all(e[x]['allocated_category']is None for x in ['12091000','12092960','12092945','12092980','12099180']));self.assertTrue(all(x['sowing_status']=='SOWING_SPECIFIC'and not x['contains_non_seed_material']for x in e.values()))
 def test_species_category_reconciliation_without_allocation(self):
  d=read('src/generated/market_categories_public.json');self.assertEqual(d['coverage_summary'],{'DIRECT':16,'PARTIAL':4,'GROUP_LEVEL':78,'NO_TRADE_EVIDENCE':23,'direct_total':20,'biological_species':121,'commercial_entities':136});self.assertEqual(len(d['categories']),10)
  metrics=[x['audited_latest_trade']for x in d['categories']];u=d['category_unallocated'];self.assertEqual(sum(D(str(x['trade_value_eur']or 0))for x in metrics)+D(u['unallocated_eur']),D('400438328'));self.assertTrue(all(x['volume_tonnes']is None for x in metrics if not x['cn_count']));self.assertTrue(all(not s['group_volume_allocated']for c in d['categories']for s in c['species']))
 def test_protected_production_editorial_and_visual_bytes(self):
  for f in ['src/generated/production_public.json','src/generated/production_coverage_additions.json','src/ProductionIntelligence.jsx','src/styles.css','src/generated/news.json','src/generated/market_public.json','docs/crop-master-v1/CROP_MASTER_V1.json']:
   self.assertEqual((R/f).read_bytes(),subprocess.check_output(['git','show','dbfd99350479044794837269ed7ef2e7b6c2d4ab:'+f],cwd=R),f)
