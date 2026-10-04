"""Replace headline totals only after complete official-source grid validation."""
import pathlib,json,gzip,collections,hashlib,argparse,sys
P=argparse.ArgumentParser();P.add_argument('--work',required=True);P.add_argument('--apply',action='store_true');A=P.parse_args();W=pathlib.Path(A.work);R=pathlib.Path(__file__).resolve().parents[2];Q=json.load(open(W/'COMEXT_UNIVERSE_QA.json'));entities=json.load(open(R/'docs/trade-cn-v1/TRADE_MARKET_ENTITIES.json'));scope={e['cn8']:e for e in entities};baseline=json.loads(__import__('subprocess').check_output(['git','show','dbfd99350479044794837269ed7ef2e7b6c2d4ab:src/generated/trade_pulse_public.json'],cwd=R));market=json.load(open(R/'src/generated/market_public.json'));oldcodes={c['cn8'] for c in market['crops']};latest=baseline['latest_completed_period'];M=collections.defaultdict(lambda:dict(kg=0.,eur=0.,rows=0,codes=set()));N=collections.defaultdict(lambda:dict(kg=0.,eur=0.,rows=0));origins=collections.defaultdict(lambda:collections.defaultdict(float));destinations=collections.defaultdict(lambda:collections.defaultdict(float));contrib=collections.defaultdict(lambda:dict(kg=0.,eur=0.,rows=0));old_scope=collections.defaultdict(lambda:dict(kg=0.,eur=0.,rows=0,codes=set()));observed=set()
with gzip.open(W/'comext-normalized-public.jsonl.gz','rt') as f:
 for line in f:
  r=json.loads(line);v,p,c=r['view'],r['period'],r['cn8'];observed.add(c)
  for key in [('ALL',v,p),(c,v,p)]:
   b=M[key];b['kg']+=r['net_weight_kg'];b['eur']+=r['trade_value_eur'];b['rows']+=1;b['codes'].add(c)
  for reporter in [r['reporter'],'EU']:
   n=N[(c,reporter,v,p)];n['kg']+=r['net_weight_kg'];n['eur']+=r['trade_value_eur'];n['rows']+=1
  if c in oldcodes:
   b=old_scope[(v,p)];b['kg']+=r['net_weight_kg'];b['eur']+=r['trade_value_eur'];b['rows']+=1;b['codes'].add(c)
  if p==latest:
   origins[v][r['origin']]+=r['net_weight_kg'];destinations[v][r['destination']]+=r['net_weight_kg'];cats=scope[c]['seed_categories'];bucket=cats[0] if len(cats)==1 else 'SHARED_CUSTOMS_GROUP_UNALLOCATED';b=contrib[(v,bucket)];b['kg']+=r['net_weight_kg'];b['eur']+=r['trade_value_eur'];b['rows']+=1

def metric(b):return {'volume_tonnes':round(b['kg']/1000,2),'trade_value_eur':round(b['eur'],2),'unit_value_eur_kg':round(b['eur']/b['kg'],4)if b['kg']>0 else None,'observation_count':b['rows'],'cn_code_count':len(b['codes'])}
def yoy(a,b):return round((a/b-1)*100,2)if b is not None and b>0 else None
new=json.loads(json.dumps(baseline));new['generated_at']=__import__('datetime').datetime.now(__import__('datetime').timezone.utc).isoformat();new['source_artifact_sha256']=hashlib.sha256((W/'comext-normalized-public.jsonl.gz').read_bytes()).hexdigest();new['accepted_observations']=Q['public_safe_unique_observations'];new['excluded_partial_observations']=0;new['scope'].update(rule='40 verified sowing CN8 codes. Unique reporter-partner-flow-month grain. No species allocation. Comparable 2024–2026 definitions confirmed by official yearly nomenclature evidence.',included_cn_codes=[{'cn8':e['cn8'],'crop':e['official_description'],'slug':e.get('existing_market_slug')}for e in entities],request_grid_complete=Q['complete_request_grid'],geographic_scope='EU27 reporting countries; reported country partners only; special territories excluded',northern_ireland_excluded=True)
for v in new['views']:
 for point in new['views'][v]['history']:
  p=point['period'];b=M[('ALL',v,p)];prior=M[('ALL',v,str(int(p[:4])-1)+p[4:])];point.update(metric(b),volume_yoy_percent=yoy(b['kg'],prior['kg']),value_yoy_percent=yoy(b['eur'],prior['eur']))
 b=M[('ALL',v,latest)];prior=M[('ALL',v,str(int(latest[:4])-1)+latest[4:])];cur=metric(b);cur.update(period=latest,volume_yoy_percent=yoy(b['kg'],prior['kg']),value_yoy_percent=yoy(b['eur'],prior['eur']),unit_value_yoy_percent=yoy(cur['unit_value_eur_kg'],metric(prior)['unit_value_eur_kg']));new['views'][v]['latest']=cur
 change=cur['volume_yoy_percent'];new['views'][v]['trade_activity']={'state':'INSUFFICIENT_EVIDENCE'if prior['rows']<20 or b['rows']<20 or len(prior['codes'])<6 or len(b['codes'])<6 or change is None else'HIGH'if change>=15 else'LOW'if change<=-15 else'NORMAL','rule':baseline['views'][v]['trade_activity']['rule']}
 # Preserve established price eligibility but recompute only species-specific CN scope.
 eligible=[]
 for c in market['crops']:
  s=scope[c['cn8']];b=M[(c['cn8'],v,latest)];val=metric(b)
  if s['granularity']=='SPECIES_SPECIFIC' and val['volume_tonnes']>=100 and b['rows']>=2 and val['unit_value_eur_kg'] is not None and val['unit_value_eur_kg']>0:eligible.append({'slug':c['slug'],'category':c['crop'],'volume_tonnes':val['volume_tonnes'],'observation_count':b['rows'],'unit_value_eur_kg':val['unit_value_eur_kg']})
 eligible.sort(key=lambda x:(x['unit_value_eur_kg'],x['slug']));rng={'status':'VERIFIED'if len(eligible)>=2 else'INSUFFICIENT_EVIDENCE','period':latest,'eligible_category_count':len(eligible),'rule':baseline['views'][v]['unit_value_range']['rule']+' Species-specific customs scope only; broad groups excluded. Expanded codes withheld pending established representative-price engine validation.'}
 if len(eligible)>=2:rng.update(low=eligible[0],high=eligible[-1])
 new['views'][v]['unit_value_range']=rng
# Every ranked customs entity uses declared official value, never volume x representative price.
new['customs_entity_rankings']=[]
for e in entities:
 b=M[(e['cn8'],'eu_internal_trade',latest)];prior=M[(e['cn8'],'eu_internal_trade',str(int(latest[:4])-1)+latest[4:])]
 if b['rows']:
  new['customs_entity_rankings'].append({'crop':{'slug':e['id'],'crop':'CN '+e['cn8']},'volume':round(b['kg']/1000,2),'value':b['eur'],'volumeYoy':yoy(b['kg'],prior['kg']),'valueYoy':yoy(b['eur'],prior['eur']),'granularity':e['granularity'],'definition':e['official_description'],'species_allocation':'NONE'})
new['extra_eu_balance'].update(volume_tonnes=round(new['views']['eu_exports']['latest']['volume_tonnes']-new['views']['eu_imports']['latest']['volume_tonnes'],2),trade_value_eur=round(new['views']['eu_exports']['latest']['trade_value_eur']-new['views']['eu_imports']['latest']['trade_value_eur'],2))
new['market_context']['text']=f"Extra-EU seed trade balance: EUR {new['extra_eu_balance']['trade_value_eur']:,.0f} in {latest}. Scope expanded to verified sowing customs groups. Verified trade evidence confirms the balance and flow changes, but does not support a specific supply, price or weather explanation."
periods=[p['period']for p in new['views']['eu_internal_trade']['history']];peaks=[]
for p in periods:
 kg=sum(M[('ALL',v,p)]['kg']for v in new['views']);prior=sum(M[('ALL',v,str(int(p[:4])-1)+p[4:])]['kg']for v in new['views']);peaks.append({'period':p,'volume_tonnes':round(sum(metric(M[('ALL',v,p)])['volume_tonnes']for v in new['views']),2),'volume_yoy_percent':yoy(kg,prior)})
new['peak_activity'].update(max(peaks,key=lambda x:x['volume_tonnes']))
# Existing category market context stays explicit customs grain; broadened groups never species allocations.
new['species_market_context']={}
for c in market['crops']:
 b=M[(c['cn8'],'eu_internal_trade',latest)];prior=M[(c['cn8'],'eu_internal_trade',str(int(latest[:4])-1)+latest[4:])];val=metric(b)
 if scope[c['cn8']]['granularity']=='SPECIES_SPECIFIC' and b['rows']>=2 and b['kg']>0:new['species_market_context'][c['slug']]={'view':'EU_INTERNAL_TRADE','period':latest,'volume_tonnes':val['volume_tonnes'],'volume_yoy_percent':yoy(b['kg'],prior['kg']),'unit_value_eur_kg':val['unit_value_eur_kg'],'unit_value_yoy_percent':yoy(val['unit_value_eur_kg'],metric(prior)['unit_value_eur_kg']),'evidence_status':'VERIFIED'if prior['rows']>=2 else'INSUFFICIENT_EVIDENCE','customs_scope':scope[c['cn8']]['granularity'],'species_allocation':'NONE_FOR_GROUPS'}
audit={'complete_request_grid':Q['complete_request_grid'],'baseline':baseline,'expanded':new,'reasons':['NEW_VERIFIED_CN_CODES','ADDITIONAL_COUNTRY_CORRIDORS','CURRENT_OFFICIAL_SOURCE_RELEASE','SPECIAL_TERRITORY_EXCLUSION;BASELINE_RAW_DIFFERENCE_NOT_ATTRIBUTABLE_WITHOUT_OLD_ROWS'],'same_11_code_current_release':{v:metric(old_scope[(v,latest)])for v in new['views']},'source_grain_double_counting':0,'category_allocation':'Single-category codes assigned once; cross-category customs groups remain SHARED_CUSTOMS_GROUP_UNALLOCATED','top_origins':{v:sorted(d.items(),key=lambda x:-x[1])[:10]for v,d in origins.items()},'top_destinations':{v:sorted(d.items(),key=lambda x:-x[1])[:10]for v,d in destinations.items()},'category_contributions':[{'view':v,'category':c,'kg':b['kg'],'eur':b['eur'],'observations':b['rows']}for(v,c),b in contrib.items()]}
(W/'TRADE_PULSE_RECALCULATION_AUDIT.json').write_text(json.dumps(audit,indent=2)+'\n');totals={'schema':'COUNTRY_CUSTOMS_TOTALS_V1','complete':Q['complete_request_grid'],'periods':sorted({k[3]for k in N}), 'reporters':sorted({k[1]for k in N}),'observed_codes':sorted(observed),'rows':[[*k,round(b['kg'],6),b['eur'],b['rows']]for k,b in sorted(N.items())],'columns':['cn8','reporter','view','period','net_weight_kg','trade_value_eur','observation_count'],'source':'Eurostat COMEXT DS-045409','source_grain':'Unique country-partner-flow-CN8-month. EU dispatches only internally; country partners only; missing cells absent.','price_status':'WITHHELD_FOR_EXPANDED_CODES'}
(W/'country-customs-totals.json').write_text(json.dumps(totals,separators=(',',':'))+'\n')
if A.apply:
 assert Q['complete_request_grid'],'Incomplete extraction: headline replacement prohibited'
 (R/'src/generated/trade_pulse_public.json').write_text(json.dumps(new,indent=2)+'\n');(R/'src/generated/country_customs_totals.json').write_text(json.dumps(totals,separators=(',',':'))+'\n')
print('Complete',Q['complete_request_grid'],'Accepted',Q['public_safe_unique_observations'],'intra',new['views']['eu_internal_trade']['latest'])
