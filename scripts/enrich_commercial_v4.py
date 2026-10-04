"""Presentation-only evidence projection. Does not modify observations or Trade Pulse."""
import collections,gzip,hashlib,json
from pathlib import Path
R=Path(__file__).resolve().parents[1]
D=R/'docs/market-commercial-v4'; E=D/'evidence'
load=lambda p:json.loads(p.read_text())
pulse=load(R/'src/generated/trade_pulse_public.json');data=load(R/'src/generated/market_catalogue_public.json')
p=E/'comext-normalized-public.jsonl.gz';digest=hashlib.sha256(p.read_bytes()).hexdigest()
assert digest==pulse['source_artifact_sha256']
qa=load(E/'COMEXT_UNIVERSE_QA.json');assert qa['complete_request_grid']
with gzip.open(p,'rt') as f:rows=[json.loads(line) for line in f]
assert len(rows)==pulse['accepted_observations']==qa['public_safe_unique_observations']
assert len({r['id'] for r in rows})==len(rows)
cn={c['cn8']:c for c in load(R/'src/generated/trade_cn_public.json')['entities']}
EU=set('AT BE BG HR CY CZ DE DK EE ES FI FR GR HU IE IT LT LU LV MT NL PL PT RO SE SI SK'.split())
legacy=load(R/'src/generated/market_public.json');price_audit=[]
for c in data['cards']:
 c.update(price_observations=[],price_history=[],price_period=None,price_scope=None,leading_exporters=[],major_corridors=[],external_trade=None)
 # Existing published prices lack an independently declared price geography/methodology
 # compatible with this projection; do not infer one from their volume or publication flag.
 old=next((x for x in legacy['crops'] if x.get('species_id')==c['biological_species_id'] and str(x['cn8']) in c['CN_codes']),None)
 if old:price_audit.append({'entity':c['market_entity_id'],'candidate_file':'src/generated/market_public.json','latest_period':old['history'][-1]['period'],'decision':'WITHHELD_SCOPE_NOT_INDEPENDENTLY_ESTABLISHED','reason':'Different volume scope is not itself a price exclusion; independent geographic and price-methodology evidence must be established first.'})
 if c['trade_volume_t'] is None:continue
 assert c['customs_scope_type'] in ['SPECIES_SPECIFIC','COMMERCIAL_ENTITY_SPECIFIC']
 assert all(c['biological_species_id'] in cn[code]['species_ids'] for code in c['CN_codes'])
 current=[r for r in rows if r['cn8'] in c['CN_codes'] and r['period']==c['latest_trade_period']]
 internal=[r for r in current if r['view']=='eu_internal_trade']
 assert all(r['origin'] in EU and r['destination'] in EU and r['reporting_flow']=='EXPORT' for r in internal)
 total=sum(r['net_weight_kg'] for r in internal);assert abs(total/1000-float(c['trade_volume_t']))<1e-5
 origins=collections.defaultdict(float);corridors=collections.defaultdict(float)
 for r in internal:origins[r['origin']]+=r['net_weight_kg'];corridors[(r['origin'],r['destination'])]+=r['net_weight_kg']
 c['leading_exporters']=[{'country':country,'share_percent':value/total*100,'volume_t':value/1000} for country,value in sorted(origins.items(),key=lambda x:(-x[1],x[0]))[:5]] if total else []
 c['major_corridors']=[{'exporter':a,'importer':b,'volume_t':value/1000} for (a,b),value in sorted(corridors.items(),key=lambda x:(-x[1],x[0]))[:5]]
 external={}
 for view in ['eu_exports','eu_imports']:
  subset=[r for r in current if r['view']==view]
  assert all(r['reporter'] in EU and r['partner'] not in EU for r in subset)
  if subset:external[view]={'volume_t':sum(r['net_weight_kg'] for r in subset)/1000,'value_eur':sum(r['trade_value_eur'] for r in subset),'observations':len(subset)}
 if len(external)==2:
  c['external_trade']={'exports':external['eu_exports'],'imports':external['eu_imports'],'balance_t':external['eu_exports']['volume_t']-external['eu_imports']['volume_t'],'period':c['latest_trade_period'],'scope':'EU27_REPORTERS_REPORTED_THIRD_COUNTRY_PARTNERS;SPECIAL_TERRITORIES_EXCLUDED','source':'Eurostat COMEXT DS-045409','source_sha256':digest,'coverage':'COMPLETE_REQUEST_GRID;UNREPORTED_CELLS_ABSENT_NOT_ZERO'}
 c['market_evidence_provenance']={'source':'Eurostat COMEXT DS-045409','source_url':'https://ec.europa.eu/eurostat/web/international-trade-in-goods/database','source_sha256':digest,'grain':'unique reporter-partner-flow-CN8-month','period':c['latest_trade_period']}
data['version']='MARKET_CATALOGUE_V4'
(R/'src/generated/market_catalogue_public.json').write_text(json.dumps(data,ensure_ascii=False,separators=(',',':'))+'\n')
(D/'PRICE_EVIDENCE_AUDIT.json').write_text(json.dumps(price_audit,indent=2)+'\n')
(D/'PROVENANCE.json').write_text(json.dumps({'official_rows':len(rows),'source_sha256':digest,'extra_eu_scope':'EU27 reporters;reported third-country partners;XI and special territories excluded;paired weight/value;no mirror intra-EU imports','external_entities':sum(c['external_trade'] is not None for c in data['cards']),'canonical_observations_modified':False,'raw_evidence':'evidence/comext-normalized-public.jsonl.gz','price_rule':'Independent latest eligible price per entity, scope and methodology mandatory; no COMEXT month equality condition'},indent=2)+'\n')
print('External entities',sum(c['external_trade'] is not None for c in data['cards']))

# Small homepage projection; candidate membership always derives from the evolving catalogue.
snapshot_cards=[{k:v for k,v in c.items() if k in ['market_entity_id','slug','common_name_en','botanical_display_name','use_tags','public_safe_status','trade_volume_t','trade_volume_yoy','latest_trade_period','CN_status','trade_history','price_observations']} for c in data['cards'] if c['trade_volume_t'] is not None or c['price_observations']]
(R/'src/generated/market_snapshot_public.json').write_text(json.dumps({'source':'CANONICAL_CATALOGUE','cards':snapshot_cards,'categories':[{'id':c['id'],'title':c['title']} for c in data['categories']]},ensure_ascii=False,separators=(',',':'))+'\n')

(R/'src/generated/commercial_rankings_public.json').write_text(json.dumps({c['CN_codes'][0]:{'period':c['latest_trade_period'],'exporters':c['leading_exporters'],'corridors':c['major_corridors']} for c in data['cards'] if len(c['CN_codes'])==1 and c['trade_volume_t'] is not None},separators=(',',':'))+'\n')
