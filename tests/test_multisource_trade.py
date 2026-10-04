import importlib.util,pathlib,json,unittest,subprocess
R=pathlib.Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('evidence',R/'scripts/multisource/evidence.py');ev=importlib.util.module_from_spec(spec);spec.loader.exec_module(ev)
class MultiSource(unittest.TestCase):
 def row(self,source='GLOBALWITS'):
  r={k:None for k in ev.REQUIRED};r.update(SOURCE=source,SOURCE_TYPE=source,SOURCE_RECORD_ID='ABC',PROVENANCE={'source_file_sha256':'verified'},PUBLIC_SAFE=True,DATA_PERIOD='2026-06',REPORTER='DE',PARTNER='PL',FLOW='2',CN_CODE='12011000');return r
 def test_licensing(self):
  r=self.row();self.assertFalse(ev.may_publish(r));r.update(LICENCE_PERMISSIONS=['PUBLIC_SAFE_COMPANY_NAME'],LICENCE_EVIDENCE='owner-verified-right');self.assertFalse(ev.may_publish(r));self.assertTrue(ev.may_publish(r,'COMPANY_NAME'));r['PERSONAL_CONTACT_INFORMATION']=True;self.assertFalse(ev.may_publish(r,'COMPANY_NAME'))
 def test_separate_sources_and_no_raw_merge(self):
  a=self.row('EUROSTAT_COMEXT');b=self.row('GLOBALWITS');self.assertNotEqual(ev.identity(a),ev.identity(b));self.assertFalse(ev.reconcile(a,b)['merge_allowed']);self.assertFalse(ev.reconcile(a,b)['allocation_allowed']);b['CURRENCY']='USD';a['CURRENCY']='EUR';self.assertIn('CURRENCY',ev.reconcile(a,b)['mismatches'])
 def test_dedup_source_grain_not_species(self):
  a=self.row('EUROSTAT_COMEXT');b=dict(a,SPECIES_MAPPING='other-linked-species');self.assertEqual(ev.identity(a),ev.identity(b));b['FLOW']='1';self.assertNotEqual(ev.identity(a),ev.identity(b))
 def test_canonical_categories(self):
  d=json.loads((R/'src/generated/market_categories_public.json').read_text());self.assertEqual(len(d['categories']),10);self.assertEqual(sum(c['species_count'] for c in d['categories']),121);members=[s for c in d['categories'] for s in c['species']];self.assertEqual(len(members),136);self.assertEqual(len({s['id'] for s in members}),136);self.assertTrue(all(s['botanical'] for s in members if s.get('true_seed_kpi_eligible',True)));self.assertEqual(sum('CATCH_CROP'in s['tags'] for s in members if s.get('true_seed_kpi_eligible',True)),52)
 def test_commercial_not_public(self):
  for folder in ['src/generated','public/data']:
   for p in (R/folder).glob('*.json'):
    self.assertNotIn('KUTAS EUROPE',p.read_text());self.assertNotIn('NORDIC CARAWAY OY',p.read_text());self.assertNotIn('globalwits-normalized-internal',p.read_text())
 def test_protected_baseline(self):
  for p in ['src/generated/production_public.json','src/generated/production_coverage_additions.json','docs/crop-master-v1/CROP_MASTER_V1.json','src/generated/market_public.json','src/generated/news.json','src/styles.css']:
   self.assertEqual((R/p).read_bytes(),subprocess.check_output(['git','show','dbfd99350479044794837269ed7ef2e7b6c2d4ab:'+p],cwd=R))
 def test_complete_country_universe_and_no_missing_zero(self):
  d=json.loads((R/'src/generated/country_customs_totals.json').read_text());self.assertTrue(d['complete']);self.assertTrue(set(d['observed_codes']) <= {e['cn8'] for e in json.loads((R/'docs/trade-cn-v1/TRADE_MARKET_ENTITIES.json').read_text())});self.assertEqual(len(d['reporters']),28);self.assertEqual(d['periods'][0],'2024-01');self.assertEqual(d['periods'][-1],'2026-06')
  keys=[tuple(r[:4])for r in d['rows']];self.assertEqual(len(keys),len(set(keys)));self.assertTrue(all(r[6]>0 and r[4]>=0 and r[5]>=0 for r in d['rows']))
  sums={};eu={}
  for code,reporter,view,period,kg,eur,count in d['rows']:
   k=(code,view,period)
   if reporter=='EU':eu[k]=(kg,eur,count)
   else:
    b=sums.setdefault(k,[0,0,0]);b[0]+=kg;b[1]+=eur;b[2]+=count
  self.assertEqual(set(sums),set(eu))
  for k,b in sums.items():self.assertAlmostEqual(b[0],eu[k][0],places=3);self.assertEqual(b[1:],list(eu[k][1:]))
 def test_authorized_pulse_scope_baseline_and_sources(self):
  p=json.loads((R/'src/generated/trade_pulse_public.json').read_text());a=json.loads((R/'docs/multisource-trade-v1/TRADE_PULSE_RECALCULATION_AUDIT.json').read_text());old=json.loads(subprocess.check_output(['git','show','dbfd99350479044794837269ed7ef2e7b6c2d4ab:src/generated/trade_pulse_public.json'],cwd=R));self.assertEqual(a['baseline'],old);self.assertEqual(a['expanded'],p);self.assertTrue(p['scope']['request_grid_complete']);self.assertEqual(len(p['scope']['included_cn_codes']),40);self.assertEqual(a['source_grain_double_counting'],0)
  for view in p['views'].values():
   for x in view['history']:self.assertGreater(x['cn_code_count'],0);self.assertLessEqual(x['cn_code_count'],40);self.assertGreater(x['observation_count'],0)
  registry=json.loads((R/'public/data/multisource-official-source-manifest-v1.json').read_text());self.assertEqual(len(registry['requests']),1080);self.assertTrue(all(r['status']=='RETRIEVED' and len(r['sha256'])==64 for r in registry['requests']))
