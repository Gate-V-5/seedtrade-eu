#!/usr/bin/env python3
"""Public projection of approved entities; rejects incompatible current customs scope."""
import json,hashlib
from pathlib import Path
R=Path(__file__).resolve().parents[1];I=R/'docs/market-catalogue-v2/inputs'
load=lambda p:json.loads(p.read_text())
raw=load(I/'PRIORITY_65_CARD_DATA.json');mapping=load(I/'PRIORITY_65_CATEGORY_MAPPING.json')['category_views'];sums=load(I/'PRIORITY_65_CATEGORY_SUMMARIES.json');cn={x['cn8']:x for x in load(R/'src/generated/trade_cn_public.json')['entities']}
prod=load(R/'src/generated/production_public.json');adds=load(R/'src/generated/production_coverage_additions.json');sources={**prod['sources'],**adds['sources']}
categories=[('CEREALS_PULSES','cereals-pulses','Cereals & Pulses','Browse cereal, pseudocereal and grain legume seed markets.'),('VEGETABLES','vegetables','Vegetables','Explore vegetable seeds, sugar beet seed and seed potatoes.'),('OIL_FIBRE','oil-fibre','Oil & Fibre Seeds','Explore oilseed, fibre and specialist seed markets.'),('MAIZE_SORGHUM','maize-sorghum','Maize & Sorghum','Browse maize and sorghum seed markets.'),('FODDER_AMENITY','fodder-amenity','Fodder Plants & Amenity Grasses','Find forage, pasture and grass seed markets.'),('CATCH_CROP','catch-crops','Catch / Cover Crops','Discover component seed types for cover and green manure crops.')]
cat=[]
for id,slug,title,description in categories:
 legacy_ids=['CEREALS','PULSES_LEGUMES'] if id=='CEREALS_PULSES' else [id]
 ids=list(dict.fromkeys(v for x in mapping if x['category_id'] in legacy_ids for v in x['commercial_entity_ids']));s=next(x for x in sums if x['category_id'] in legacy_ids)
 cat.append({'id':id,'slug':slug,'title':title,'description':description,'image':'/catalogue-v3/'+slug+'.png','image_alt':title+' owner-supplied category visual','entity_ids':ids,'entity_count':len(ids),'countries_observed_count':s['countries_observed_count'],'trade_volume_t':None,'trade_value_eur':None,'summary_status':'WITHHELD'})
fields=['market_entity_id','slug','common_name_en','botanical_display_name','accepted_taxon','commercial_entity_type','biological_species_id','primary_category','secondary_categories','use_tags','CN_status','CN_codes','customs_scope_type','trade_data_status','latest_trade_period','trade_volume_t','trade_value_eur','representative_price_eur_kg','trade_volume_yoy','representative_price_yoy','production_data_status','countries_observed_count','card_data_status']
cards=[];flags=[]
for x in raw:
 c={k:x[k] for k in fields}
 convert=lambda v:'CEREALS_PULSES' if v in ['CEREALS','PULSES_LEGUMES'] else v
 c['primary_category']=convert(c['primary_category']);c['secondary_categories']=list(dict.fromkeys(convert(v) for v in c['secondary_categories'] if convert(v)!=c['primary_category']));c['use_tags']=list(dict.fromkeys(convert(v) for v in c['use_tags']))
 p=x['production_evidence_summary'];c['production_evidence']={k:p[k] for k in ['strict_entity_records','years','metrics','source_ids']}
 c['production_detail_url']='/production-intelligence';c['sources']=[]
 for sid in p['source_ids']:
  s=sources.get(sid,{})
  url=s.get('url') or s.get('source_url')
  if url and url.startswith('https://'):c['sources'].append({'organisation':s.get('organisation') or s.get('source_organisation') or 'Official seed authority','title':s.get('title') or s.get('source_title') or sid,'url':url})
 if c['CN_codes']:c['sources'].append({'organisation':'Eurostat','title':'COMEXT DS-045409','url':'https://ec.europa.eu/eurostat/web/international-trade-in-goods/database'})
 c['customs_descriptions']=[{'code':n,'description':cn[n]['official_description']} for n in c['CN_codes'] if n in cn];c['public_safe_status']='PUBLIC_SAFE'
 # The approved older modelling input linked common wheat to a code now verified as spelt.
 # Do not modify input or observations; fail closed in this public projection.
 if c['trade_volume_t'] is not None and any(c['biological_species_id'] not in cn[n]['species_ids'] for n in c['CN_codes']):
  flags.append({'entity':c['market_entity_id'],'codes':c['CN_codes'],'reason':'CURRENT_CANONICAL_CN_TAXON_CONFLICT; quantities withheld in projection only'})
  for k in ['latest_trade_period','trade_volume_t','trade_value_eur','representative_price_eur_kg','trade_volume_yoy','representative_price_yoy']:c[k]=None
  c['countries_observed_count']=len(p['countries']) if p['countries'] else None
  c['trade_data_status']='CUSTOMS_SCOPE_REVIEW_REQUIRED';c['CN_status']='REVIEW_REQUIRED';c['customs_scope_type']='UNCONFIRMED_ENTITY_ATTRIBUTION';c['card_data_status']='PARTIAL' if p['strict_entity_records'] else 'LIMITED'
 cards.append(c)
for category in cat:
 matched=[(c,x) for c,x in zip(cards,raw) if c['market_entity_id'] in category['entity_ids']]
 countries=set(y for c,x in matched for y in x['production_evidence_summary']['countries'])
 countries.update(y for c,x in matched if c['trade_volume_t'] is not None for y in x['trade_countries_observed'])
 category['countries_observed_count']=len(countries) if countries else None
assert len(cards)==65 and len({x['market_entity_id'] for x in cards})==65
# Existing biological entities, distinct commercial use forms; no master or observation edits.
master=load(R/'src/generated/crop_master_summary.json')
for id,name,taxon,bio,codes in [('sugar-beet','Sugar beet','Beta vulgaris','beet-chard',['12091000']),('seed-potatoes','Seed potatoes','Solanum tuberosum','potato',[]),('carrot','Carrot','Daucus carota','carrot',['12099180'])]:
 assert any(e['id']==bio and e['biological_species_key']==taxon for e in master['entities'])
 c={k:None for k in fields};c.update({'market_entity_id':id,'slug':id,'common_name_en':name,'botanical_display_name':taxon,'accepted_taxon':taxon,'commercial_entity_type':'EXISTING_SPECIES_COMMERCIAL_USE','biological_species_id':bio,'primary_category':'VEGETABLES','secondary_categories':[],'use_tags':['VEGETABLES'],'CN_status':('GROUP_LEVEL' if id=='carrot' else 'PARTIAL') if codes else 'DATA_GAP','CN_codes':codes,'customs_scope_type':('GROUP_LEVEL_CUSTOMS_SCOPE' if id=='carrot' else 'COMMERCIAL_USE_SCOPE') if codes else 'NOT_MAPPED','trade_data_status':'DATA_GAP','production_data_status':'COMMERCIAL_SCOPE_NOT_VALIDATED','card_data_status':'DATA_GAP','production_evidence':{'strict_entity_records':0,'years':[],'metrics':[],'source_ids':[]},'production_detail_url':'/production-intelligence','sources':[{'organisation':'SeedTrade canonical master','title':'Existing public commercial entity master','url':'https://seedtrade.eu'+master['public_master_url']}],'customs_descriptions':[{'code':n,'description':cn[n]['official_description']} for n in codes],'public_safe_status':'PUBLIC_SAFE'})
 cards.append(c)
vegetables=next(c for c in cat if c['id']=='VEGETABLES');vegetables['entity_ids']+=['sugar-beet','seed-potatoes','carrot'];vegetables['entity_count']=len(vegetables['entity_ids'])
pulse=load(R/'src/generated/trade_pulse_public.json');latest=pulse['views']['eu_internal_trade']['latest']
summary={'seed_species':master['distinct_seed_species'],'commercial_market_entities':master['canonical_market_entities'],'trade_volume_t':latest['volume_tonnes'],'trade_value_eur':latest['trade_value_eur'],'cn_codes':len(pulse['scope']['included_cn_codes']),'period':pulse['latest_completed_period'],'trade_definition':'EU_INTERNAL_EXPORTER_REPORTED_DISPATCHES','classification':'PUBLIC_SAFE'}
out={'version':'MARKET_CATALOGUE_V3','eu_summary':summary,'classification':'PUBLIC_SAFE','source_checkpoint_sha256':'08d8abeca5947c9985dbf36e1b1ee857e62508c490524b0e1533e460759c39b7','homepage_species_kpi':121,'categories':cat,'cards':cards}
(R/'src/generated/market_catalogue_public.json').write_text(json.dumps(out,ensure_ascii=False,separators=(',',':'))+'\n')
routes=[{'path':'/market','title':'European Seed Market Catalogue','description':'Browse European commercial seed categories and individual seed markets.'}]+[{'path':'/market/'+x['slug'],'title':x['title'],'description':x['description']} for x in cat]+[{'path':'/market/seeds/'+x['slug'],'title':x['common_name_en']+' ('+x['botanical_display_name']+') seed market','description':'Seed market coverage, trade and production evidence for '+x['common_name_en']+' ('+x['botanical_display_name']+').'} for x in cards]
for alias,target in [('cereals','cereals-pulses'),('pulses-legumes','cereals-pulses'),('fodder-grasses','fodder-amenity')]:
 r=next(x for x in routes if x['path']=='/market/'+target);routes.append({**r,'path':'/market/'+alias,'alias_of':'/market/'+target})
(R/'src/generated/market_catalogue_routes.json').write_text(json.dumps(routes,ensure_ascii=False,separators=(',',':'))+'\n')
(R/'docs/market-catalogue-v3/PUBLIC_PROJECTION_QA.json').write_text(json.dumps({'input_entities':len(raw),'output_entities':len(cards),'withheld_current_taxonomy_conflicts':flags,'source_sha256':hashlib.sha256((I/'PRIORITY_65_CARD_DATA.json').read_bytes()).hexdigest(),'no_observations_modified':True,'no_supply_labels_exposed':True,'no_legacy_price_conflicts_exposed':True,'no_category_trade_totals_exposed':True},indent=2)+'\n')
print('65 priority + 3 existing vegetable entities; 6 categories; 68 detail routes; current taxonomy conflicts withheld:',flags)
