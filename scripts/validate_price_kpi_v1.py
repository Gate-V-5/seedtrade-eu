"""QA compares presentation evidence with preserved official rows and starting Git contents."""
import collections,gzip,hashlib,json,subprocess
from pathlib import Path
R=Path(__file__).resolve().parents[1];D=R/'docs/price-kpi-audit-v1';E=R/'docs/market-commercial-v4';base='8f83dd7e1f6d0f97e7f7f3fa1c70c83a4a9ec101'
load=lambda p:json.loads(p.read_text());checks=[]
def check(name,condition):
 checks.append({'check':name,'status':'PASS' if condition else 'FAIL'})
check('starting HEAD preserved',subprocess.check_output(['git','rev-parse','HEAD'],cwd=R,text=True).strip()==base)
data=load(R/'src/generated/market_catalogue_public.json');old=json.loads(subprocess.check_output(['git','show',base+':src/generated/market_catalogue_public.json'],cwd=R))
check('68 identities and memberships preserved',[(c['market_entity_id'],c['botanical_display_name'],c['use_tags']) for c in data['cards']]==[(c['market_entity_id'],c['botanical_display_name'],c['use_tags']) for c in old['cards']])
check('approved categories/visual paths preserved',data['categories']==old['categories'])
check('global KPIs preserved',data['eu_summary']==old['eu_summary'])
check('existing trade metrics unchanged',all([c.get(k) for k in ['trade_volume_t','trade_value_eur','trade_volume_yoy','latest_trade_period','trade_history']]==[o.get(k) for k in ['trade_volume_t','trade_value_eur','trade_volume_yoy','latest_trade_period','trade_history']] for c,o in zip(data['cards'],old['cards'])))
files=subprocess.check_output(['git','ls-files'],cwd=R,text=True).splitlines()
protected=[f for f in files if f.startswith(('data/','public/','src/data/')) or (f.startswith('src/generated/') and f!='src/generated/market_catalogue_public.json')]
check('all canonical observations/taxonomy/news/visuals unchanged',all((R/f).read_bytes()==subprocess.check_output(['git','show',base+':'+f],cwd=R) for f in protected))
manifest=load(E/'evidence/COMEXT_REQUEST_MANIFEST.json')
check('1080 raw official sources retain original SHA256',len(manifest)==1080 and all(hashlib.sha256((E/'evidence/raw-comext'/r['file']).read_bytes()).hexdigest()==r['sha256'] for r in manifest))
with gzip.open(E/'evidence/comext-normalized-public.jsonl.gz','rt') as f:rows=[json.loads(line) for line in f]
check('153838 unique PUBLIC_SAFE official observations preserved',len(rows)==153838 and len({r['id'] for r in rows})==len(rows) and all(r['classification']=='PUBLIC_SAFE' and r['source']=='Eurostat COMEXT DS-045409' and r['net_weight_kg']>=0 and r['trade_value_eur']>=0 for r in rows))
source_hashes={m['file']:m['sha256'] for m in manifest}
check('every raw source reference and observation source hash preserved',all(source_hashes.get(r['source_file'])==r['source_sha256'] for r in rows))
for c in data['cards']:
 if c['trade_volume_t'] is None:
  check(c['market_entity_id']+' no invented/group metrics',not c['external_trade'] and not c['leading_exporters'] and not c['major_corridors'] and (not c['price_observations'] or c['commercial_entity_type']=='SPECIES_MARKET_ENTITY'));continue
 subset=[r for r in rows if r['cn8'] in c['CN_codes'] and r['period']==c['latest_trade_period']]
 internal=[r for r in subset if r['view']=='eu_internal_trade'];origins=collections.defaultdict(float);corridors=collections.defaultdict(float)
 for r in internal:origins[r['origin']]+=r['net_weight_kg'];corridors[(r['origin'],r['destination'])]+=r['net_weight_kg']
 check(c['market_entity_id']+' actual top5 origins',[(x['country'],x['volume_t']) for x in c['leading_exporters']]==[(a,b/1000) for a,b in sorted(origins.items(),key=lambda x:(-x[1],x[0]))[:5]])
 check(c['market_entity_id']+' actual top5 corridors',[(x['exporter'],x['importer'],x['volume_t']) for x in c['major_corridors']]==[(a,b,v/1000) for (a,b),v in sorted(corridors.items(),key=lambda x:(-x[1],x[0]))[:5]])
 if c['external_trade']:
  for view,key in [('eu_exports','exports'),('eu_imports','imports')]:
   source=[r for r in subset if r['view']==view];metric=c['external_trade'][key];check(c['market_entity_id']+' '+view+' same official scope',len(source)==metric['observations'] and abs(sum(r['net_weight_kg'] for r in source)/1000-metric['volume_t'])<1e-7 and sum(r['trade_value_eur'] for r in source)==metric['value_eur'])
snapshot=load(R/'src/generated/market_snapshot_public.json')
check('snapshot candidates derive from catalogue',set(c['market_entity_id'] for c in snapshot['cards'])==set(c['market_entity_id'] for c in data['cards'] if c['trade_volume_t'] is not None or c['price_observations']))
check('no source binaries in deployment',not any(p.suffix in ['.gz','.xlsx'] and 'market-commercial-v4' in str(p) for p in (R/'dist').rglob('*')))
# Independently compare against the exact recovered V4, not just the published V3 base.
from decimal import Decimal
V4=R.parent/'seedtrade-commercial-v4'
before=load(V4/'src/generated/market_catalogue_public.json')
price_fields={'price_observations','price_history','price_period','price_scope','representative_price_eur_kg','price_yoy','price_scope_status','representative_price_yoy'}
check('V4 presentation fields outside price resolution preserved',all({k:v for k,v in c.items() if k not in price_fields}=={k:v for k,v in o.items() if k not in price_fields} for c,o in zip(data['cards'],before['cards'])))
check('V4 approved category owner images byte identical',all(p.read_bytes()==(V4/p.relative_to(R)).read_bytes() for p in (R/'public').rglob('*') if p.is_file()))
check('V4 source and production/trade datasets byte identical',all(p.read_bytes()==(V4/p.relative_to(R)).read_bytes() for p in (R/'src/generated').glob('*.json') if p.name not in {'market_catalogue_public.json','market_snapshot_public.json'}))
by_id={r['id']:r for r in rows};witnesses=load(D/'PRICE_OBSERVATION_WITNESSES.json');witness_ids={w['id']:w for w in witnesses}
for w in witnesses:
 selected=[by_id[i] for i in w['source_observation_ids']]
 expected=[r for r in rows if r['cn8']==w['cn8'] and r['period']==w['period'] and r['reporting_flow']=='EXPORT' and r['view'] in {'eu_internal_trade','eu_exports'}]
 check(w['id']+' complete unique original scope',len(set(w['source_observation_ids']))==len(selected) and {r['id'] for r in selected}=={r['id'] for r in expected})
 check(w['id']+' exact original value and quantity',sum(Decimal(str(r['net_weight_kg'])) for r in selected)==Decimal(w['quantity_basis_kg']) and sum(Decimal(str(r['trade_value_eur'])) for r in selected)==Decimal(w['value_basis_eur']))
 check(w['id']+' raw provenance',all(source_hashes.get(f)==h for f,h in w['source_file_sha256'].items()))
points=[p for c in data['cards'] for p in c['price_observations']]
check('110 restored points all PUBLIC_SAFE independently witnessed',len(points)==110 and all(p['classification']=='PUBLIC_SAFE' and p['scope_verified'] and p['species_attribution_verified'] and p['source_witness_id'] in witness_ids for p in points))
check('no group/form allocation',not data['cards'][[c['market_entity_id'] for c in data['cards']].index('westerwold-ryegrass')]['price_observations'])
kpi=load(D/'GLOBAL_KPI_AUDIT.json');selected=[by_id[i] for i in kpi['source_observation_ids']]
check('KPI monthly grain unique and exporter-only',len(selected)==3246 and len({(r['reporter'],r['partner'],r['reporting_flow'],r['cn8'],r['period']) for r in selected})==3246 and all(r['view']=='eu_internal_trade' and r['period']=='2026-06' and r['reporting_flow']=='EXPORT' and r['reporter']!=r['partner'] for r in selected))
check('KPI complete month selected exactly once',{r['id'] for r in selected}=={r['id'] for r in rows if r['view']=='eu_internal_trade' and r['period']=='2026-06'})
check('KPI exact quantity/value reconciliation',sum(Decimal(str(r['net_weight_kg'])) for r in selected)==Decimal('251015101') and sum(Decimal(str(r['trade_value_eur'])) for r in selected)==Decimal('400438328'))
check('40 sowing CN codes represented without catalogue joins',len({r['cn8'] for r in selected})==40 and not kpi['catalogue_card_summation'])
check('8 candidates accounted and snapshot12 derived',len(load(D/'PRICE_CANDIDATE_AUDIT.json'))==8 and len(snapshot['cards'])==12)
result={'checks':checks,'failures':sum(c['status']=='FAIL' for c in checks),'price_evidence':'RESTORED_ONLY_AFTER_INDEPENDENT_OFFICIAL_WITNESS_RECONCILIATION;NO_SYNTHETIC_PRICES','visual_qa':'BLOCKED_ENVIRONMENT: CLOUD_BROWSER_LOCALHOST_ERR_BLOCKED_BY_CLIENT','protected_files_checked':len(protected)}
(D/'QA_RESULT.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps({'checks':len(checks),'failures':result['failures']}));raise SystemExit(bool(result['failures']))
