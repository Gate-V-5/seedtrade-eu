"""Apply recovered approved scope/attribution without new acquisition or production changes."""
from pathlib import Path
import json,hashlib
R=Path(__file__).resolve().parents[1];A=R/'docs/trade-pulse-40cn-fail-resolution-v1';G=R/'src/generated'
def read(p):return json.loads(p.read_text())
def write(p,d):p.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n')
audit={x['cn8']:x for x in read(A/'CN_CLASSIFICATION_40.json')};coverage={x['species_id']:x for x in read(A/'SPECIES_COVERAGE.json')};cat={x['category_id']:x for x in read(A/'CATEGORY_ANALYSIS.json')}
p=read(G/'trade_pulse_public.json');assert p['views']['eu_internal_trade']['latest']['volume_tonnes']==251015.1 and p['views']['eu_internal_trade']['latest']['trade_value_eur']==400438328
p['period_semantics']={'type':'MONTH_ONLY','start':'2026-06-01','end':'2026-06-30','period':'2026-06','selection':'eu_internal_trade;period==2026-06','scope':'40 seed-for-sowing CN codes;gross intra-EU exporter dispatches;not a 121-species measured total'}
p['scope']['taxonomic_precision']={'SPECIES_SPECIFIC':16,'PARTIAL':11,'GROUP_LEVEL':13}
p['scope']['no_species_allocation']=True
for x in p['customs_entity_rankings']:x['granularity']=audit[x['crop']['slug'].replace('CN-','')]['audited_granularity']
write(G/'trade_pulse_public.json',p)
# Derived publication objects only. Original official/raw evidence and original audits remain immutable.
for file in ['trade_cn_public.json','market_categories_public.json']:
 d=read(G/file)
 for e in d['entities']:
  a=audit[e['cn8']];e['granularity']=a['audited_granularity'];e['allocated_category']=a['allocated_category'];e['precision']=a['precision'];e['category_allocation']='DIRECT_CN_CATEGORY'if a['allocated_category']else'UNALLOCATED';e['period_scope']='MONTH_ONLY';e['species_volume_allocation']='NONE_FOR_GROUPS'
  if e['cn8']=='10019110':e['species_ids']=['spelt'];e['botanical_names']=['Triticum aestivum subsp. spelta'];e['biological_species']='Triticum aestivum';e['direct_commercial_entity_id']='spelt'
 if 'categories'in d:
  for c in d['categories']:
   c['audited_latest_trade']=cat[c['id']]
   for s in c['species']:
    cov=coverage.get(s['id']);s['evidence_precision']={'SPECIES_SPECIFIC':'DIRECT','PARTIAL_SPECIES_SCOPE':'PARTIAL','GROUP_LEVEL_ONLY':'GROUP_LEVEL','NO_COMPATIBLE_TRADE_DATA':'NO_TRADE_EVIDENCE'}.get(cov['coverage']if cov else '', 'NO_TRADE_EVIDENCE')
    if s['id']=='spelt':s['evidence_precision']='PARTIAL';s['cn_codes']=['10019110'];s['observed_trade_codes']=['10019110']
    s['species_trade']=s['evidence_precision']in['DIRECT','PARTIAL'];s['trade_status']='GROUP_LEVEL'if s['evidence_precision']=='GROUP_LEVEL'else s['evidence_precision'];s['group_volume_allocated']=False
  d['coverage_summary']={'DIRECT':16,'PARTIAL':4,'GROUP_LEVEL':78,'NO_TRADE_EVIDENCE':23,'direct_total':20,'biological_species':121,'commercial_entities':136}
  d['category_unallocated']=read(A/'CATEGORY_RECONCILIATION.json');d['source_period']='2026-06'
 else:
  d['historical_summary']=d['summary'];d['summary']={**d['summary'],'SPECIES_WITH_TRADE_DATA_AFTER':20,'FULL_SPECIES_SPECIFIC_TRADE':16,'PARTIAL_SPECIES_SCOPE':4,'GROUP_LEVEL_ONLY':78,'NO_COMPATIBLE_TRADE_DATA':23,'TRADE_MARKET_ENTITIES_WITH_DATA':40,'TOTAL_TRADE_OBSERVATIONS':153838,'OBSERVATION_COUNT_SCOPE':'Recovered official normalized rows; no commercial source values included'}
 write(G/file,d)
# Current corrected downloadable coverage; historical download remains evidence, not current coverage.
public={'classification':'PUBLIC_SAFE','source':'Eurostat COMEXT DS-045409;official CN evidence','period':p['period_semantics'],'model':'MODEL_A','scope':'40 seed-for-sowing CN8 codes','cn':[{'cn8':a['cn8'],'description':a['official_cn_description'],'precision':a['precision'],'botanical_precision':a['audited_granularity'],'category':a['allocated_category'],'commercial_entity':a['measurement_entity_id'],'volume_tonnes':a['volume_tonnes'],'value_eur':a['trade_value_eur'],'source_evidence':a['source_evidence']}for a in audit.values()],'species':read(A/'SPECIES_COVERAGE.json'),'category':list(cat.values()),'unallocated':read(A/'CATEGORY_RECONCILIATION.json'),'missing':'ABSENT_NOT_ZERO','group_species_allocation':'NONE','interpolation':'NONE','commercial_values':0}
write(R/'public/data/trade-40cn-approved-coverage-v1.json',public)
# Keep multisource audit's expanded object equal to final derived pulse, preserve its prior object explicitly.
a=read(R/'docs/multisource-trade-v1/TRADE_PULSE_RECALCULATION_AUDIT.json');a['expanded_before_attribution_resolution']=a['expanded'];a['expanded']=p;a['approved_attribution_resolution']='docs/trade-pulse-40cn-fail-resolution-v1';a['category_contributions_original_not_current']=a.pop('category_contributions');a['category_contributions']=public['category'];write(R/'docs/multisource-trade-v1/TRADE_PULSE_RECALCULATION_AUDIT.json',a)
m=read(G/'public_data_manifest.json');m['datasets']['trade_pulse']['sha256']=hashlib.sha256((G/'trade_pulse_public.json').read_bytes()).hexdigest();m['datasets']['trade_pulse']['period_semantics']=p['period_semantics'];write(G/'public_data_manifest.json',m)
print('Approved scope applied;20 direct including4 partial;78 group;23 gaps;production unchanged')
