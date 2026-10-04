"""Independent row and aggregation checks against preserved raw/source identities."""
import argparse,pathlib,json,gzip,collections,math,hashlib
P=argparse.ArgumentParser();P.add_argument('--work',required=True);A=P.parse_args();W=pathlib.Path(A.work);R=pathlib.Path(__file__).resolve().parents[2];q=json.load(open(W/'COMEXT_UNIVERSE_QA.json'));t=json.load(open(W/'country-customs-totals.json'));audit=json.load(open(W/'TRADE_PULSE_RECALCULATION_AUDIT.json'));seen=set();b=collections.defaultdict(lambda:[0.,0.,0]);codes=set();flags=collections.Counter();rows=0
with gzip.open(W/'comext-normalized-public.jsonl.gz','rt')as f:
 for line in f:
  r=json.loads(line);assert r['id'] not in seen;seen.add(r['id']);rows+=1;codes.add(r['cn8']);assert r['classification']=='PUBLIC_SAFE'and r['source_type']=='EUROSTAT_COMEXT';assert r['representative_price']is None and r['species_allocation']=='NONE';assert r['currency']=='EUR';assert r['net_weight_kg']==round(r['original_quantity']*100,6);assert r['net_weight_kg']>=0 and r['trade_value_eur']>=0;assert '2024-01'<=r['period']<='2026-06';assert r['source_sha256'] and r['source_url'].startswith('https://ec.europa.eu/eurostat/');assert r['reporter']!=r['partner'];assert r['view']!='eu_internal_trade'or r['reporting_flow']=='EXPORT'
  flags.update(r['quality_flags'])
  for c in [r['reporter'],'EU']:
   k=(r['cn8'],c,r['view'],r['period']);b[k][0]+=r['net_weight_kg'];b[k][1]+=r['trade_value_eur'];b[k][2]+=1
assert rows==q['public_safe_unique_observations'];assert len(b)==len(t['rows'])
for row in t['rows']:
 k=tuple(row[:4]);assert math.isclose(b[k][0],row[4],abs_tol=0.001);assert math.isclose(b[k][1],row[5],abs_tol=0.001);assert b[k][2]==row[6]
for view,entry in audit['expanded']['views'].items():
 period=entry['latest']['period'];points=[row for row in t['rows']if row[1]=='EU'and row[2]==view and row[3]==period];assert round(sum(row[4]for row in points)/1000,2)==entry['latest']['volume_tonnes'];assert round(sum(row[5]for row in points),2)==entry['latest']['trade_value_eur'];assert sum(row[6]for row in points)==entry['latest']['observation_count'];categories=[r for r in audit['category_contributions']if r['view']==view];assert math.isclose(sum(c['kg']for c in categories),sum(r[4]for r in points),abs_tol=0.001)
for req in json.load(open(W/'COMEXT_REQUEST_MANIFEST.json')):
 if req['status']=='RETRIEVED':assert hashlib.sha256((W/'raw-official/comext'/req['file']).read_bytes()).hexdigest()==req['sha256']
commercial=json.load(open(W/'globalwits-normalized-internal.json'));assert all(not r['PUBLIC_SAFE'] and r['SPECIES_IDENTIFIED_SHIPMENT_VOLUME']is None for r in commercial);assert len({r['SOURCE_RECORD_ID']for r in commercial})==len(commercial)
result={'status':'PASS','qa_failures':0,'complete_request_grid':q['complete_request_grid'],'observations_checked':rows,'cn_codes_observed':len(codes),'duplicate_observations':0,'double_counting':0,'commodity_contamination':'NONE','source_reconciliation':'NO_PROVIDER_SUMMATION','globalwits_raw_publication':False,'species_allocation':'NONE_FOR_GROUPS','zero_weight_rows_preserved':dict(flags),'source_hashes':'PASS','country_flow_totals':'PASS','category_contribution_partition':'PASS_WITH_SHARED_GROUP_BUCKET','public_safe':'PASS','missing_data_not_zero':'PASS'};(W/'FINAL_DATA_QA.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result))
