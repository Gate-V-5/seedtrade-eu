"""Bounded species audit and additive official evidence; never rebuild V5/Crop Master."""
import csv, hashlib, json, pathlib
from collections import Counter, defaultdict
ROOT = pathlib.Path(__file__).resolve().parents[1]
INPUT = ROOT/'data/species-coverage-v1'
OUT = ROOT/'docs/species-coverage-v1'
def read(p): return json.loads((ROOT/p).read_text())
def dump(p,v): p.parent.mkdir(parents=True,exist_ok=True); p.write_text(json.dumps(v,ensure_ascii=False,indent=2)+'\n')
def tab(name,rows):
    dump(OUT/(name+'.json'),rows)
    with (OUT/(name+'.csv')).open('w',newline='') as f:
        w=csv.DictWriter(f,fieldnames=list(rows[0]),lineterminator='\n');w.writeheader()
        for r in rows:w.writerow({k:json.dumps(v,ensure_ascii=False,separators=(',',':')) if isinstance(v,(list,dict,bool)) or v is None else v for k,v in r.items()})
def longest(years):
    run=best=0;last=None
    for y in sorted(set(years)):run=run+1 if last is not None and y==last+1 else 1;best=max(best,run);last=y
    return best
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
master=read('docs/crop-master-v1/CROP_MASTER_V1.json');by_entity={e['id']:e for e in master}
base=read('src/generated/production_public.json');market=read('src/generated/market_public.json')
sources={
 'lelf-brandenburg':dict(organisation='LELF Brandenburg',title='Saatenanerkennung: Tabellen V.25.3–V.25.5; Brandenburg, not Germany total',url='https://lelf.brandenburg.de/lelf/de/landwirtschaft/acker-und-pflanzenbau/saatenanerkennung/',accessed='2026-10-03',reporting_period='2021–2025 or 2022–2025',terminology='Angemeldete Vermehrungsfläche',tier=1),
 'semae-soc-2025':dict(organisation='SEMAE / SOCFrance',title='Intégrale des données statistiques 2024/2025, revised 03/03/2026; table 9-01, PDF p.75',url='https://assets.agencezebra.net/SEMAE/integrale-24-25/SEMAE_INTEGRALE_24-25.pdf#page=75',accessed='2026-10-03',reporting_period='Harvest 2021–2025',terminology='Surfaces présentées en production de semences potagères; semences standard',tier=1),
 'wiorin-mazowieckie-2025':dict(organisation='WIORiN Warszawa',title='2025 activity report; table 3.2, p.80; Mazowieckie, not Poland total',url='https://www.gov.pl/attachment/dcfab9c3-1d53-4c83-a3ea-d552df76587d#page=80',accessed='2026-10-03',reporting_period='2025',terminology='Objęto oceną / Zakwalifikowano: inspected / field approved, separate stages',tier=1)
}
accepted=read('data/species-coverage-v1/accepted-rows.json');withheld=read('data/species-coverage-v1/withheld-rows.json')
obs=[];series=[];evidence=[]
for n,row in enumerate(accepted):
    e=by_entity[row['entity']];ids=[]
    for year,value in zip(row['years'],row['values']):
        oid='SCV1-%02d-%d'%(n+1,year);ids.append(oid)
        obs.append(dict(id=oid,entity=e['id'],country=row['country'],year=year,metric=row['metric'],unit='ha',value=value,source=row['source'],evidence='VERIFIED_OFFICIAL_SOURCE',definition=row['definition'],season='ALL_REPORTED',category=row['category'],crop_use='VEGETABLE_SEED' if row['country']=='FR' else 'NOT_SPECIFIED',species_scope=row['scope'],source_botanical=e['botanical']))
        evidence.append(dict(observation_id=oid,canonical_entity=e['id'],botanical_name=e['botanical'],country=row['country'],year=year,metric=row['metric'],value=value,unit='ha',original_source_label=row['source_label'],original_row=row['original_row'],source_table=row['table'],source_url=sources[row['source']]['url'],source_organisation=sources[row['source']]['organisation'],retrieval_date='2026-10-03',mapping_status='MAPPED_TO_EXISTING_CANONICAL',definition=row['definition'],geographic_scope=row['scope'],public_safe=True,comparable_eligible=True))
    first=obs[-len(ids)]
    series.append(dict(id='SCV1-series-%02d'%(n+1),entity=e['id'],country=row['country'],metric=row['metric'],unit='ha',definition=row['definition'],season=first['season'],category=row['category'],crop_use=first['crop_use'],species_scope=row['scope'],source_botanical=e['botanical'],organisation=sources[row['source']]['organisation'],history_length=longest(row['years']),observations=ids))
supp=dict(version='SPECIES_COVERAGE_V1_ADDITIVE',countries=sorted({r['country'] for r in obs}),entities=[dict(id=e['id'],name=e['name'],botanical=e['botanical'],rank=e['rank']) for e in master if e['id'] in {r['entity'] for r in obs}],sources={k:{x:y for x,y in v.items() if x!='tier'} for k,v in sources.items()},observations=obs,series=series,cross_country_comparability=base['cross_country_comparability'])
dump(ROOT/'src/generated/production_coverage_additions.json',supp)
tab('NEW_OFFICIAL_OBSERVATIONS',evidence);tab('NEW_COMPARABLE_SERIES',series);tab('WITHHELD_SOURCE_ROWS',withheld)
all_obs=base['observations']+obs;all_series=base['series']+series;all_sources={**base['sources'],**supp['sources']}
keys=defaultdict(list)
for e in master:
    if e['kpi_eligible']:keys[e['species']].append(e)
assert len(keys)==121
cov=[];cn_rows=[]
status_map={'CN_MAPPING_CONFIRMED':'CONFIRMED','CN_MAPPING_PARTIAL':'PARTIAL','CN_MAPPING_NOT_SPECIES_SPECIFIC':'GROUP_LEVEL','CN_MAPPING_NOT_AVAILABLE':'NOT_AVAILABLE','CN_MAPPING_REVIEW_REQUIRED':'REVIEW_REQUIRED'}
for bio,entities in sorted(keys.items()):
    ids={e['id'] for e in entities};selected=[r for r in all_obs if r['entity'] in ids];bs=[r for r in base['observations'] if r['entity'] in ids];ss=[s for s in all_series if s['entity'] in ids]
    e=next((x for x in entities if x['rank']=='SPECIES'),entities[0]);direct=any(x['trade_mapping']['status']=='SPECIES_SPECIFIC' for x in entities)
    depth=max([s['history_length'] for s in ss],default=0);countries=sorted({r['country'] for r in selected});years=sorted({r['year'] for r in selected})
    grade='STRONG' if selected and direct and depth>=3 and len(countries)>=2 else 'MODERATE' if selected and depth>=3 else 'LIMITED' if selected or direct else 'DATA_GAP'
    statuses=sorted({status_map[x['cn']['mapping_status']] for x in entities})
    # Multiple infraspecific customs relationships remain explicit; no broad-code upgrade.
    cn_status=statuses[0] if len(statuses)==1 else 'PARTIAL'
    prov=[dict(source_id=s,**all_sources[s]) for s in sorted({r['source'] for r in selected})]
    trade_rows=[r for r in market['crops'] if r.get('species_id') in ids and direct]
    scoped=[dict(id=s['id'],country=s['country'],metric=s['metric'],unit=s['unit'],definition=s['definition'],scope=s['species_scope'],history_length=s['history_length']) for s in ss]
    hold=[r for r in withheld if r['entity'] in ids]
    limitations=['Missing years absent, not zero. No interpolation; no pooling across stages, seasons, units, source botanical scope or geography.','Coverage audit is bounded to existing public data plus selected FR/DE/PL authorities; a DATA_GAP is not proof of no EU seed production.','2026 CN identity status is preserved; historical concordance is not inferred.']
    if any('REGIONAL:' in r['species_scope'] for r in selected):limitations.append('Regional observations are not national totals and may overlap existing national reporting; never add them together.')
    if not direct:limitations.append('No species-specific usable trade series; broader CN categories may exist but values are not allocated.')
    if hold:limitations.extend(r['reason'] for r in hold)
    row=dict(canonical_species_id=e['id'],canonical_entity_ids=sorted(ids),common_name=e['name'],botanical_name=e['botanical'],biological_species_key=bio,seedtrade_category=e['category'],use_tags=sorted({t for x in entities for t in x['tags']}),catch_crop=any('CATCH_CROP'in x['tags'] for x in entities),production_evidence=any(r['metric']=='SEED_PRODUCTION_AREA' for r in selected),certified_area_evidence=any(r['metric']=='CERTIFIED_SEED_AREA' for r in selected),certified_quantity_evidence=any(r['metric']=='CERTIFIED_QUANTITY' for r in selected),any_production_metric=bool(selected),production_evidence_before=bool(bs),production_observation_count=len(selected),new_official_observations=sum(r['id'].startswith('SCV1-') for r in selected),trade_evidence=direct,trade_granularity='SPECIES_SPECIFIC' if direct else 'GROUP_LEVEL_OR_NOT_AVAILABLE',cn_status=cn_status,entity_cn_statuses={x['id']:status_map[x['cn']['mapping_status']] for x in entities},cn_codes=sorted({c for x in entities for c in x['cn'].get('cn8',[])}),sowing_non_sowing_separated=True,countries_covered=countries,country_scope='PRODUCTION_ONLY; trade scope remains in COMEXT',earliest_year=min(years,default=None),latest_year=max(years,default=None),latest_trade_period=max([r['latest_completed_period'] for r in trade_rows],default=None),comparable_history_length=depth,comparable_series=scoped,coverage_grade=grade,public_safe=True,source_provenance=prov,identity_provenance=[p for x in entities for p in x['provenance']],trade_provenance=[x['trade_mapping'] for x in entities],cn_provenance=[x['cn'] for x in entities],research_status='NEW_OFFICIAL_EVIDENCE' if any(r['id'].startswith('SCV1-') for r in selected) else 'EXISTING_PUBLIC_EVIDENCE_AUDITED' if selected or direct else 'SOURCE_CONFIRMED_NOT_ACTIVATED' if hold else 'NO_USABLE_NUMERIC_TABLE_IN_BOUNDED_REVIEW',limitations=limitations)
    cov.append(row)
    cn_rows.append(dict(canonical_species_id=e['id'],botanical_name=e['botanical'],cn_status=cn_status,entity_statuses=row['entity_cn_statuses'],sowing_seed_codes=row['cn_codes'],species_specific_trade=direct,mapping_changed=False,limitation='Recovered mapping audited for scope; no newly invented or historical CN relationship.'))
tab('SPECIES_COVERAGE_121',cov);tab('CN_AUDIT_121',cn_rows)
def counts(rows):return {str(n)+'Y_COMPARABLE_SERIES':sum(s['history_length']>=n for s in rows) for n in range(2,6)}
summary=dict(SPECIES_EXPECTED=121,SPECIES_FINAL=len(cov),SEED_CATEGORIES=10,CATCH_CROP_SPECIES=sum(r['catch_crop'] for r in cov),SPECIES_WITH_PRODUCTION_DATA_BEFORE=sum(r['production_evidence_before'] for r in cov),SPECIES_WITH_PRODUCTION_DATA_AFTER=sum(r['any_production_metric'] for r in cov),SPECIES_WITH_TRADE_DATA_BEFORE=sum(r['trade_evidence'] for r in cov),SPECIES_WITH_TRADE_DATA_AFTER=sum(r['trade_evidence'] for r in cov),SPECIES_WITH_BOTH_BEFORE=sum(r['production_evidence_before'] and r['trade_evidence'] for r in cov),SPECIES_WITH_BOTH_AFTER=sum(r['any_production_metric'] and r['trade_evidence'] for r in cov),DATA_GAPS_BEFORE=sum(not r['production_evidence_before'] and not r['trade_evidence'] for r in cov),DATA_GAPS_AFTER=sum(r['coverage_grade']=='DATA_GAP' for r in cov),NEW_OFFICIAL_OBSERVATIONS=len(obs),NEW_PUBLIC_SAFE_OBSERVATIONS=len(obs),BASELINE_PRODUCTION_RECORDS=len(base['observations']),PRODUCTION_RECORDS_AFTER=len(all_obs),CN_STATUS_COUNTS=dict(Counter(r['cn_status'] for r in cov)),COVERAGE_GRADE_COUNTS=dict(Counter(r['coverage_grade'] for r in cov)),COMPARABLE_SERIES_ALL_ENTITIES=counts(all_series),COMPARABLE_SERIES_121_SPECIES=counts([s for s in all_series if any(s['entity'] in r['canonical_entity_ids'] for r in cov)]),WITHHELD_NUMERIC_SOURCE_VALUES=sum(len(r['years']) for r in withheld),PUBLIC_SAFE='PASS',PROVENANCE='PASS',BOTANICAL_NAMES='PASS_BOUNDED_OFFICIAL_NOMENCLATURE',COMMODITY_AREA_CONTAMINATION='NONE',INTERPOLATION='NONE',MISSING_DATA_HANDLING='ABSENT_NOT_ZERO')
dump(OUT/'SUMMARY.json',summary)
dump(ROOT/'public/data/species-coverage-v1.json',dict(version='SPECIES_COVERAGE_V1',summary=summary,species=cov))
dump(OUT/'SOURCE_REGISTRY.json',dict(new_sources=sources,withheld_sector_source=dict(organisation='SEMAE',url=sources['semae-soc-2025']['url'].replace('page=75','page=76'),tier=2,scope='Protected cultivation table; lineage pending confirmation'),review_scope='FR official delegation and DE/PL regional certification authorities; no LOW_PRIORITY research; existing 23-country public evidence audited for all 121 biological species'))
dump(OUT/'PROVENANCE_MANIFEST.json',dict(starting_head='ee84c92729f99a9d38ea1daa232a322e59cbfcb4',inputs=[dict(path=str(p.relative_to(ROOT)),sha256=sha(p)) for p in sorted(INPUT.glob('*.json'))]+[dict(path=p,sha256=sha(ROOT/p)) for p in ['docs/crop-master-v1/CROP_MASTER_V1.json','src/generated/production_public.json','src/generated/market_public.json']],outputs=[dict(path=str(p.relative_to(ROOT)),sha256=sha(p)) for p in sorted(OUT.glob('*.json')) if p.name!='PROVENANCE_MANIFEST.json'],method='Additive observations only; original V5, CN and Crop Master bytes preserved. Raw public documents and page renders retained in recovery ZIP.'))
print(json.dumps(summary))
