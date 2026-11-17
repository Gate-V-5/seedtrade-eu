"""Reuse the validated Stage1 extraction, without changing Pulse or its calculations."""
from pathlib import Path
from decimal import Decimal
import sys,json,hashlib,collections
import argparse
parser=argparse.ArgumentParser();parser.add_argument('--work',required=True);args=parser.parse_args()
SRC=Path(__file__).resolve().parents[1];WORK=Path(args.work).resolve()
sys.path.insert(0,str(SRC/'scripts'))
from refresh_trade_pulse import normalize,validate_month,EU
load=lambda p:json.loads(p.read_text(encoding='utf8'))
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
state=load(WORK/'refresh-state.json');assert state['status']=='VALIDATED'
manifest=load(WORK/'source-manifest.json');assert hashlib.sha256(json.dumps(manifest,sort_keys=True).encode()).hexdigest()==state['source_manifest_sha256']
assert sha(WORK/'partner-areas.json')==manifest['partner_reference_sha256']
partners={c.get('PartnerCodeIsoAlpha2') for c in load(WORK/'partner-areas.json')['results'] if not c.get('isGroup') and len(c.get('PartnerCodeIsoAlpha2',''))==2}|{'XK'}
partners -= {'XI','ZZ','EU','QP','QQ','QR','QS','QT','QU','QV','QW','QX','QY','QZ','XA','XB','XC','XD','XE','XF','XG','XH','XJ','XK_OLD','XL','XM','XN','XO','XP','XQ','XR','XS','XT','XU','XV','XW','XX','XY','XZ'}
# Same country filter as the existing accepted source collector.
from refresh_trade_pulse import read
import inspect

rows=[]
for request in manifest['requests']:
 f=next((WORK/'raw').glob('*/'+request['cn8']+'_'+request['start']+'_'+request['end']+'.json'));assert sha(f)==request['sha256']
 rows+=normalize(load(f),request['cn8'],request['start'],request['end'],partners)
codes={r['cn8'] for r in manifest['requests']};period=state['source_period'];assert validate_month(rows,period,codes) is None
assert len({tuple(r[k] for k in ('reporter','partner','flow','period','cn8')) for r in rows})==len(rows),'DUPLICATE_SOURCE_GRAIN'
pulse=load(SRC/'src/generated/trade_pulse_public.json')
assert period==pulse['latest_completed_period'],'VALIDATED_PULSE_PERIOD_MISMATCH'
for view in ['eu_internal_trade','eu_imports','eu_exports']:
 r=[x for x in rows if x['period']==period and x['view']==view]
 assert abs(sum(x['kg'] for x in r)/1000-Decimal(str(pulse['views'][view]['latest']['volume_tonnes'])))<Decimal('.01'),view
catalogue=load(SRC/'src/generated/market_catalogue_public.json');overlay={}
for c in catalogue['cards']:
 if c['trade_volume_t'] is None:continue
 assert c['customs_scope_type'] in ['SPECIES_SPECIFIC','COMMERCIAL_ENTITY_SPECIFIC']
 eligible=[r for r in rows if r['cn8'] in c['CN_codes'] and r['period']<=period];internal=[r for r in eligible if r['view']=='eu_internal_trade'];history=[]
 for month in sorted({r['period'] for r in internal}):
  r=[x for x in internal if x['period']==month];history.append({'period':month,'volume_t':float(sum(x['kg'] for x in r)/1000),'value_eur':float(sum(x['eur'] for x in r))})
 last=next(h for h in history if h['period']==period);previous=next((h for h in history if h['period']=='2025-08'),None);r=[x for x in internal if x['period']==period];origins=collections.defaultdict(Decimal);corridors=collections.defaultdict(Decimal)
 for x in r:origins[x['reporter']]+=x['kg'];corridors[(x['reporter'],x['partner'])]+=x['kg']
 total=sum(origins.values());external={}
 for view in ['eu_exports','eu_imports']:
  rr=[x for x in eligible if x['period']==period and x['view']==view]
  if rr:external[view]={'volume_t':float(sum(x['kg'] for x in rr)/1000),'value_eur':float(sum(x['eur'] for x in rr))}
 overlay[c['market_entity_id']]={'latest_trade_period':period,'trade_volume_t':last['volume_t'],'trade_value_eur':last['value_eur'],'trade_volume_yoy':(last['volume_t']/previous['volume_t']-1)*100 if previous and previous['volume_t'] else None,'trade_history':history,'leading_exporters':[{'country':k,'volume_t':float(v/1000),'share_percent':float(v/total*100)} for k,v in sorted(origins.items(),key=lambda p:(-p[1],p[0]))[:3]],'major_corridors':[{'exporter':k[0],'importer':k[1],'volume_t':float(v/1000)} for k,v in sorted(corridors.items(),key=lambda p:(-p[1],p[0]))[:3]],'external_trade':{'exports':external['eu_exports'],'imports':external['eu_imports'],'balance_t':external['eu_exports']['volume_t']-external['eu_imports']['volume_t'],'period':period} if len(external)==2 else None}
result={'schema':'STAGE4_VERIFIED_TRADE_OVERLAY_V1','period':period,'source':'Eurostat COMEXT DS-045409','source_url':'https://ec.europa.eu/eurostat/web/international-trade-in-goods/database','source_updated':state['source_updated_at'],'validated_manifest_sha256':state['source_manifest_sha256'],'scope':'EU27 internal exporter dispatches; external flows separate; no species allocation of grouped codes','records':overlay}
(SRC/'src/generated/market_briefing_trade_public.json').write_text(json.dumps(result,ensure_ascii=False,separators=(',',':'))+'\n',encoding='utf8')
receipt={'status':'PASS','period':period,'source_manifest_sha256':state['source_manifest_sha256'],'requests_hash_verified':len(manifest['requests']),'PulseAllThreeFlowTotalsReconciled':True,'speciesUpdated':len(overlay),'rejectedPeriods':state['rejected_periods'],'originalCatalogueAndCustomsPriceHistory':'UNCHANGED'}
(WORK/'market-briefing-receipt.json').write_text(json.dumps(receipt,indent=2),encoding='utf8');print(json.dumps(receipt))
