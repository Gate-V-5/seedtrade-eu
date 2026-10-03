"""Rebuild identity/coverage metadata; never rewrite Production or COMEXT observations."""
import csv, hashlib, json, pathlib, re
from collections import Counter
ROOT=pathlib.Path(__file__).resolve().parents[1]
INPUT=ROOT/'data/crop-master-v1';OUT=ROOT/'docs/crop-master-v1';OUT.mkdir(parents=True,exist_ok=True)
def read(p):return json.loads(p.read_text())
def dump(p,d):p.parent.mkdir(parents=True,exist_ok=True);p.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n')
def artifact(name,rows):
 dump(OUT/(name+'.json'),rows)
 if isinstance(rows,list) and rows:
  fields=list(dict.fromkeys(k for row in rows for k in row))
  with (OUT/(name+'.csv')).open('w',newline='') as f:
   w=csv.DictWriter(f,fieldnames=fields,lineterminator="\n");w.writeheader()
   for r in rows:w.writerow({k:json.dumps(v,ensure_ascii=False,separators=(',',':')) if isinstance(v,(list,dict,bool)) or v is None else v for k,v in r.items()})
prod=read(ROOT/'src/generated/production_public.json');market=read(ROOT/'src/generated/market_public.json')
cn={x['canonical_species_id']:x for x in read(INPUT/'recovered-cn.json')}
sources=read(INPUT/'sources.json');source_by_id={x['id']:x for x in sources}
categories=[('cereals-pseudocereals','Cereals and pseudocereals'),('grain-legumes','Grain legumes and protein crops'),('forage-legumes','Forage legumes'),('grass-seeds','Grass seeds'),('oil-fibre-seeds','Oilseed and fibre crops'),('brassica-seeds','Mustard and radish seeds'),('vegetable-seeds','Vegetable seeds'),('herbs-specialty','Herbs and specialty flowering crops'),('seed-potatoes','Seed potatoes'),('other-propagation','Other propagation material')]
catids={x[0] for x in categories}
cereals={'Avena','Triticum','Hordeum','Secale','Oryza','Zea','Sorghum','Panicum','Setaria','Fagopyrum','Phalaris','Chenopodium','Triticosecale'}
grasses={'Agrostis','Alopecurus','Arrhenatherum','Dactylis','Festuca','Lolium','Phleum','Poa','Trisetum','Festulolium'}
forage={'Trifolium','Medicago','Lotus','Onobrychis','Ornithopus','Galega','Biserrula','Melilotus','Crotalaria'}
grain={'Pisum','Vicia','Lupinus','Lens','Cicer','Lathyrus','Glycine','Phaseolus'}
oil={'Linum','Cannabis','Helianthus','Camelina','Carthamus','Papaver','Guizotia'}
def category(x):
 id=x['id'];genus=(x['botanical'] or '').replace('×','').strip().split(' ')[0]
 if id=='potato':return 'seed-potatoes'
 if id in {'rapeseed','turnip-rape'}:return 'oil-fibre-seeds'
 if id=='swede-seed-group':return 'vegetable-seeds'
 if id in {'beet-chard','pepper','common-bean'}:return 'vegetable-seeds'
 if id in {'common-vetch','winter-vetch','purple-vetch','hungarian-vetch'}:return 'forage-legumes'
 if genus in grasses:return 'grass-seeds'
 if genus in cereals:return 'cereals-pseudocereals'
 if genus in forage:return 'forage-legumes'
 if genus in grain:return 'grain-legumes'
 if genus in oil:return 'oil-fibre-seeds'
 if genus in {'Brassica','Sinapis','Raphanus'} or id=='mustard-seed':return 'brassica-seeds'
 return 'herbs-specialty'
entities=[]
for x in read(INPUT/'recovered-canonical.json'):
 r={'id':x['canonical_species_id'],'name':x['canonical_common_name'],'botanical':x['canonical_botanical_name'],'rank':x['taxonomic_rank'],'synonyms':x.get('synonyms',[]),'aliases':x.get('legacy_aliases',[]),'evidence':['v041'],'official_taxonomy_evidence':x['evidence'],'authority_urls':x.get('additional_taxonomic_authority_urls',[]),'original_source_botanical_names':x.get('source_scope_botanical_names',[]),'kpi_candidate':True,'tags':[]}
 r['category']=category(r)
 if r['id']=='winter-wheat':r['rank']='CROP_USE_GROUP';r['biological_parent_entity']='common-wheat'
 entities.append(r)
for x in read(INPUT/'extensions.json'):
 x['official_taxonomy_evidence']=[];x['authority_urls']=[];x['original_source_botanical_names']=x['synonyms']+[x['botanical']];x['aliases']=[]
 if x['id']=='garlic':x['category']='other-propagation'
 entities.append(x)
byid={x['id']:x for x in entities}
byid['cultivated-radish']['authority_urls']=byid['oilseed-radish-group']['authority_urls']
byid['cultivated-radish']['evidence'].append('v041')
# Official LfL bounded species list, supplemented by Defra cover-crop examples.
lfl_ids='hybrid-ryegrass perennial-ryegrass italian-ryegrass annual-ryegrass cocksfoot sorghum black-oat festulolium-group ethiopian-mustard faba-bean berseem-clover arrowleaf-clover narrow-leaved-lupin fenugreek borage dill subterranean-clover safflower field-pea garden-cress yellow-lupin black-medick birdsfoot-trefoil sunn-hemp crimson-clover coriander caraway flax camelina lentil alfalfa beet-chard balansa-clover oilseed-radish-group cultivated-radish hungarian-vetch persian-clover parsley phacelia niger rapeseed common-vetch brown-mustard black-mustard alsike-clover serradella soybean sunflower trifolium-squarrosum ribwort-plantain white-lupin white-mustard white-clover winter-vetch turnip-rape'.split()
defra_ids='barley common-wheat winter-wheat rye oat red-clover buckwheat triticale-group cabbage'.split()
for id in lfl_ids:
 byid[id]['tags']+=['CATCH_CROP','COVER_CROP'];byid[id]['evidence'].append('lfl')
for id in defra_ids:
 # Wheat/oat are not resolved by the Defra table; not automatically tagged.
 if id not in {'common-wheat','winter-wheat','oat'}:byid[id]['tags'].append('COVER_CROP');byid[id]['evidence'].append('defra')
for id in 'alfalfa red-clover white-clover birdsfoot-trefoil sainfoin common-vetch winter-vetch black-medick cocksfoot meadow-fescue perennial-ryegrass kentucky-bluegrass tall-fescue timothy ribwort-plantain chicory'.split():
 byid[id]['tags'].append('FORAGE');byid[id]['evidence'].append('defra')
byid['chicory']['tags'].append('COVER_CROP');byid['chicory']['evidence'].append('quinoa-cover')
# Only identity-level relationships; broad customs category values are never allocated.
group_rel={**{id:'lupins' for id in ['narrow-leaved-lupin','yellow-lupin','white-lupin']},**{id:'mustard-seed' for id in ['white-mustard','brown-mustard','black-mustard']}}
parent_overrides={'durum-wheat':'Triticum turgidum','cultivated-radish':'Raphanus raphanistrum'}
def biological_key(e):
 b=(e['botanical'] or '').replace(' Roth','').strip();parts=b.split()
 if e['id'] in parent_overrides:return parent_overrides[e['id']]
 if e['rank']=='HYBRID_SPECIES':return ' '.join(parts[:3])
 if len(parts)>=2:return ' '.join(parts[:2])
 return None
coverage=[];production_mapping=[];trade_mapping=[]
for e in entities:
 id=e['id'];obs=[r for r in prod['observations'] if r['entity']==id]
 eseries=[s for s in prod['series'] if s['entity']==id]
 e['genus']=(e['botanical'] or '').replace('×','').strip().split(' ')[0] or None
 e['species']=biological_key(e)
 e['infraspecific_name']=e['botanical'] if e['rank']=='SUBSPECIES' else None
 e['taxonomy_status']='REVIEW_REQUIRED' if e['rank']=='SOURCE_MARKET_TAXON' else 'VERIFIED_BOUNDED_IDENTITY'
 e['nomenclature_scope']='Official seed-market nomenclature; source names and authority synonyms retained; not a blanket global accepted-name assertion'
 e['propagation_kind']='SEED_POTATO' if id=='potato' else 'VEGETATIVE_PROPAGATION' if id=='garlic' else 'TRUE_SEED'
 e['kpi_eligible']=bool(e['kpi_candidate'] and e['rank'] in {'SPECIES','SUBSPECIES','HYBRID_SPECIES'} and e['taxonomy_status']!='REVIEW_REQUIRED' and e['propagation_kind']=='TRUE_SEED')
 e['classification']='PUBLIC_SAFE' if e['taxonomy_status']!='REVIEW_REQUIRED' else 'REVIEW_ONLY'
 e['tags']=sorted(set(e['tags']+(['SEED_PRODUCTION'] if obs else [])))
 e['use_evidence']={tag:sorted(set(e['evidence'])) if tag!='SEED_PRODUCTION' else ['existing-public-production-records'] for tag in e['tags']}
 for tag,field in [('CATCH_CROP','catch_crop_status'),('COVER_CROP','cover_crop_status'),('FORAGE','forage_status'),('AMENITY','amenity_status')]:e[field]='CONFIRMED_USE' if tag in e['tags'] else 'NOT_CONFIRMED'
 e['seed_production_relevance']='OFFICIAL_SEED_METRIC_OBSERVED' if obs else 'IDENTIFIED_SEED_MARKET_ENTITY; NO_PRODUCTION_DATA'
 e['eu_production_evidence']='EU_PRODUCTION_CONFIRMED' if obs and e['propagation_kind']=='TRUE_SEED' else 'INSUFFICIENT_EVIDENCE'
 e['supply_origin']='INSUFFICIENT_EVIDENCE';e['import_only']=None
 c=cn.get(id)
 if not c and id in group_rel:
  base=cn[group_rel[id]];c={**base,'canonical_species_id':id,'mapping_status':'CN_MAPPING_NOT_SPECIES_SPECIFIC','notes':['Identity membership only; broad customs category never allocated to this species'],'sowing_seed':{'usage':'SOWING_SEED','verified_cn8':base['sowing_seed']['verified_cn8'],'limitation':'GROUP_SCOPE_ONLY'}}
 if not c:c={'canonical_species_id':id,'mapping_status':'CN_MAPPING_NOT_AVAILABLE','cn4':[],'cn6':[],'cn8':[],'hs6':[],'sowing_seed':{'usage':'SOWING_SEED','verified_cn8':[]},'non_sowing_commodity':{'usage':'NON_SOWING_COMMODITY','codes':[]},'source_url':None,'notes':['No species-specific CN mapping invented']}
 e['cn']=c
 e['evidence']=sorted(set(e['evidence']))
 e['provenance']=[source_by_id[k] for k in e['evidence']]
 if obs:e['production_sources']=sorted(set(r['source'] for r in obs))
 rows=[x for x in market['crops'] if x.get('species_id')==id]
 if not rows and id in group_rel:rows=[x for x in market['crops'] if x.get('species_id')==group_rel[id]]
 trade_status='NOT_AVAILABLE'
 if rows:trade_status='SPECIES_SPECIFIC' if c['mapping_status']=='CN_MAPPING_CONFIRMED' and id not in group_rel else 'GROUP_LEVEL'
 # Biological wheat seasons share identity but numeric source rows are not merged.
 e['production_mapping']={'entity_id':id,'observation_ids':[r['id'] for r in obs],'status':'DIRECT_ENTITY_ID' if obs else 'NOT_AVAILABLE','aggregate_allocation':'NONE'}
 e['trade_mapping']={'status':trade_status,'market_slugs':[r['slug'] for r in rows],'cn8':[str(r['cn8']) for r in rows],'species_values_allocated':False if trade_status!='SPECIES_SPECIFIC' else True,'source':'Eurostat COMEXT DS-045409','existing_public_artifact':'market_public.json','history_concordance':'Existing accepted dataset only; 2026 nomenclature not projected backwards'}
 e['confidence']='HIGH_FOR_BOUNDED_IDENTITY' if e['taxonomy_status']!='REVIEW_REQUIRED' else 'REVIEW_REQUIRED'
 years=sorted(set(r['year'] for r in obs));countries=sorted(set(r['country'] for r in obs));depth=max([s['history_length'] for s in eseries],default=0)
 direct_trade=trade_status=='SPECIES_SPECIFIC'
 readiness='STRONG' if obs and direct_trade and depth>=3 and len(countries)>=2 else 'MODERATE' if obs and depth>=3 else 'LIMITED' if obs or direct_trade else 'DATA_GAP'
 row={'id':id,'species':e['name'],'botanical_name':e['botanical'],'rank':e['rank'],'biological_species_key':e['species'],'kpi_eligible':e['kpi_eligible'],'primary_category':e['category'],'use_tags':e['tags'],'production_data':e['production_mapping']['status'],'production_record_count':len(obs),'trade_data':trade_status,'cn_mapping':c['mapping_status'],'history_depth':depth,'history_years':years,'country_coverage':countries,'country_coverage_scope':'PRODUCTION_ONLY; trade geography stays in original COMEXT view','latest_trade_period':max([r['latest_completed_period'] for r in rows],default=None),'latest_year':max(years,default=None),'public_safe':e['classification']=='PUBLIC_SAFE','confidence':e['confidence'],'data_coverage':readiness,'scope_note':'History depth is maximum compatible source series; distinct definitions, units, seasons and market groups are never summed or allocated'}
 coverage.append(row);production_mapping.append({'id':id,'botanical_name':e['botanical'],**e['production_mapping']});trade_mapping.append({'id':id,'botanical_name':e['botanical'],**e['trade_mapping']})
def summary_count(condition):return len({e['species'] for e in entities if e['kpi_eligible'] and condition(e)})
cnt=summary_count(lambda e:True)
summary={'version':'CROP_MASTER_V1','species_count_rule':'Distinct biological keys for PUBLIC_SAFE identified true-seed species, named hybrid species and parent species of commercial subspecies. Synonyms, seasons, cultivar groups, genus/customs/hybrid formula groups, unresolved identities, seed potatoes and vegetative garlic excluded. Subspecies count once per parent biological species; no fabricated parent production observations.','entities':[{'id':e['id'],'biological_species_key':e['species'],'rank':e['rank'],'classification':e['classification'],'kpi_eligible':e['kpi_eligible']} for e in sorted(entities,key=lambda e:e['id'])],'distinct_seed_species':cnt,'canonical_market_entities':len(entities),'public_master_url':'/data/crop-master-v1.json'}
artifact('CROP_MASTER_V1',sorted(entities,key=lambda e:e['id']))
artifact('SPECIES_COVERAGE_V1',coverage)
artifact('CATEGORY_TAXONOMY_V1',[{'id':id,'name':name,'kind':'PRIMARY_SEED_CATEGORY','rationale':'Commercial model decision; one primary category, separate crop uses and customs market views'} for id,name in categories])
tags=sorted({t for e in entities for t in e['tags']})
artifact('USE_TAG_TAXONOMY_V1',[{'id':t,'kind':'USE_SEGMENT','not_primary_category':True} for t in tags])
artifact('CATEGORY_AUDIT_V1',[{'current_category':r['crop'],'current_cn8':r['cn8'],'proposed_category':byid[r['species_id']]['category'],'action':'MERGE','rationale':'Current card is a CN market view/entity, not a high-level seed category. Retain existing trade card and its values unchanged; classify identity under commercial primary category.'} for r in market['crops']]+[{'current_category':None,'proposed_category':id,'action':'ADD','rationale':'Add extensible primary commercial category in model only; existing approved navigation/cards unchanged.'} for id,name in categories])
artifact('CN_MAPPINGS_V1',[{'id':e['id'],'botanical_name':e['botanical'],**e['cn']} for e in entities])
artifact('PRODUCTION_MAPPINGS_V1',production_mapping);artifact('TRADE_MAPPINGS_V1',trade_mapping)
artifact('SOURCE_TAXONOMY_MAPPINGS_V1',read(INPUT/'recovered-source-taxa.json'))
label_alias={e['botanical']:e['id'] for e in entities if e['botanical']}
label_alias.update({syn:e['id'] for e in entities for syn in e['synonyms'] if '→' not in syn})
label_alias.update({'Vicia villosa':'winter-vetch','Raphanus sativus var. oleiformis':'cultivated-radish','Brassica oleracea var. viridis / acephala':'cabbage','Brassica rapa subsp. rapa':'turnip-rape','× Triticosecale':'triticale-group','× Festulolium':'festulolium-group','Lolium multiflorum var. westerwoldicum':'annual-ryegrass','Sorghum bicolor subsp. drummondii':'sudan-grass','Sorghum bicolor × Sorghum bicolor subsp. drummondii':'sorghum-sudan-hybrid-group'})
catch=[]
for i,label in enumerate(read(INPUT/'recovered-catch-discovery.json')['labels'],1):
 id=label_alias.get(label);e=byid.get(id)
 catch.append({'prior_index':i,'source_label':label,'canonical_id':id,'botanical_name':e['botanical'] if e else None,'recovery_status':'RECOVERED_DISCOVERY_LABEL','identity_status':e['taxonomy_status'] if e else 'REVIEW_REQUIRED','catch_use_status':e['catch_crop_status'] if e else 'NOT_CONFIRMED','cover_use_status':e['cover_crop_status'] if e else 'NOT_CONFIRMED','import_only_status':'INSUFFICIENT_EVIDENCE','scope':'Prior 65 labels contain duplicates, crop types and hybrids; not 65 distinct biological species. Unsupported prior use/import claims not activated.'})
artifact('CATCH_CROP_RECOVERY_AUDIT_V1',catch)
dump(ROOT/'src/generated/crop_master_summary.json',summary)
dump(ROOT/'public/data/crop-master-v1.json',{'schema':'CROP_MASTER_V1','classification':'PUBLIC_SAFE','counting_rule':summary['species_count_rule'],'categories':[{'id':id,'name':name} for id,name in categories],'entities':[e for e in entities if e['classification']=='PUBLIC_SAFE'],'coverage':[r for r in coverage if r['public_safe']],'production_source_catalogue':prod['sources']})
counts=Counter(x['cn']['mapping_status'] for x in entities)
report={'CURRENT_SEED_CATEGORIES':len(market['crops']),'FINAL_SEED_CATEGORIES':len(categories),'PREVIOUS_MARKET_ENTITIES':86,'CANONICAL_MARKET_ENTITIES':len(entities),'DISTINCT_SEED_SPECIES':cnt,'HOMEPAGE_SEED_SPECIES_KPI':cnt,'CATCH_CROP_SPECIES_INCLUDED':summary_count(lambda e:'CATCH_CROP' in e['tags']),'USE_TAGS_TOTAL':len(tags),'SPECIES_WITH_PRODUCTION_DATA':summary_count(lambda e:bool(e['production_mapping']['observation_ids'])),'SPECIES_WITH_TRADE_DATA':summary_count(lambda e:e['trade_mapping']['status']=='SPECIES_SPECIFIC'),'SPECIES_WITH_BOTH':summary_count(lambda e:bool(e['production_mapping']['observation_ids']) and e['trade_mapping']['status']=='SPECIES_SPECIFIC'),'SPECIES_DATA_GAPS':summary_count(lambda e:not e['production_mapping']['observation_ids'] and e['trade_mapping']['status']!='SPECIES_SPECIFIC'),'CN_MAPPING_COUNTS':dict(counts),'COVERAGE_ENTITY_COUNTS':dict(Counter(r['data_coverage'] for r in coverage)),'CATCH_DISCOVERY_LABELS_RECOVERED':len(catch),'CATCH_DISCOVERY_LABELS_ACCOUNTED_FOR':sum(bool(r['canonical_id']) for r in catch),'PRODUCTION_RECORDS_UNCHANGED':len(prod['observations'])}
priority={'DATA_GAP':0,'LIMITED':1,'MODERATE':2,'STRONG':3}
biological_readiness={}
for r in coverage:
 if r['kpi_eligible']:
  key=r['biological_species_key'];status=r['data_coverage']
  if priority[status]>priority.get(biological_readiness.get(key),-1):biological_readiness[key]=status
report['COVERAGE_DISTINCT_SPECIES_COUNTS']=dict(Counter(biological_readiness.values()))
dump(OUT/'SUMMARY.json',report)
provenance={'schema':'CROP_MASTER_PROVENANCE_V1','starting_head':'fa5f3ec800918272c52dcc1342171297eb569ab5','sources':sources,'inputs':[{'path':str(p.relative_to(ROOT)),'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in sorted(INPUT.glob('*.json'))]+[{'path':'src/generated/'+n,'sha256':hashlib.sha256((ROOT/'src/generated'/n).read_bytes()).hexdigest()} for n in ['production_public.json','market_public.json','trade_pulse_public.json']],'methodology':'Identity and coverage metadata only. No raw seed-production/COMEXT observations modified. Historical CN concordance not inferred; unconfirmed catch uses/import-only claims withheld.'}
dump(OUT/'PROVENANCE_MANIFEST.json',provenance)
print(json.dumps(report,indent=2))
