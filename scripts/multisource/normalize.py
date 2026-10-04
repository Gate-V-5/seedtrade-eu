"""Normalize bounded official JSONstat requests; no allocation or missing-value fill."""
import pathlib,json,hashlib,gzip,collections,math,argparse
P=argparse.ArgumentParser();P.add_argument('--work',required=True);A=P.parse_args();W=pathlib.Path(A.work);R=pathlib.Path(__file__).resolve().parents[2]
EU=set('AT BE BG HR CY CZ DE DK EE ES FI FR GR HU IE IT LT LU LV MT NL PL PT RO SE SI SK'.split())
COUNTRIES={c.get('PartnerCodeIsoAlpha2') for c in json.load(open(W/'raw-official/un-partner-areas.json'))['results'] if not c.get('isGroup') and len(c.get('PartnerCodeIsoAlpha2',''))==2}|{'XK'}
COUNTRIES-= {'XI','ZZ','EU','QP','QQ','QR','QS','QT','QU','QV','QW','QX','QY','QZ','XA','XB','XC','XD','XE','XF','XG','XH','XJ','XK_OLD','XL','XM','XN','XO','XP','XQ','XR','XS','XT','XU','XV','XW','XX','XY','XZ'}
entities=json.load(open(R/'docs/trade-cn-v1/TRADE_MARKET_ENTITIES.json'));scope={x['cn8']:x for x in entities};requests=json.load(open(W/'COMEXT_REQUEST_MANIFEST.json'));history=json.load(open(W/'CN_HISTORY_EVIDENCE.json'));verified_history={c['cn8']for c in history['code_decisions']if c['status']=='COMPATIBLE_EXACT_HIERARCHY'};assert len(verified_history)==40;seen=set();rows=[];reject=collections.Counter();coverage=[]
for req in requests:
 if req['status']!='RETRIEVED':coverage.append(dict(req,status='FAILED'));continue
 p=W/'raw-official/comext'/req['file'];d=json.loads(p.read_text());ids=d['id'];sizes=d['size'];cats=[{v:k for k,v in d['dimension'][i]['category']['index'].items()} for i in ids];groups={};labels=d['dimension']['partner']['category'].get('label',{})
 for flat,v in d.get('value',{}).items():
  k=int(flat);positions=[0]*len(sizes)
  for pos in range(len(sizes)-1,-1,-1):positions[pos]=k%sizes[pos];k//=sizes[pos]
  dim={name:cat[n] for name,cat,n in zip(ids,cats,positions)};ind=dim.pop('indicators');grain=tuple(dim[n] for n in ids if n!='indicators');g=groups.setdefault(grain,{'dims':dim,'measures':{},'statuses':{}});g['measures'][ind]=v
  st=d.get('status',{});g['statuses'][ind]=st.get(flat) if isinstance(st,dict) else None
 accepted=0
 for g in groups.values():
  k=g['dims'];v=g['measures'];partner=k['partner'];year=k['time'][:4]
  if k['reporter']not in EU or partner not in COUNTRIES:reject['AGGREGATE_OR_SPECIAL_PARTNER']+=1;continue
  if k['reporter']==partner:reject['SELF_FLOW']+=1;continue
  if k['flow']not in ['1','2']:reject['OTHER_FLOW']+=1;continue
  kg=v.get('QUANTITY_IN_100KG');eur=v.get('VALUE_IN_EUROS')
  if kg is None or eur is None:reject['UNPAIRED_MEASURE']+=1;continue
  if any(not isinstance(n,(int,float)) or not math.isfinite(n) or n<0 for n in [kg,eur]):reject['INVALID_MEASURE']+=1;continue
  if year=='2024' and k['product']not in verified_history:reject['2024_CLASSIFICATION_NOT_VERIFIED']+=1;continue
  if k['flow']=='1' and partner in EU:reject['INTRA_MIRROR_IMPORT']+=1;continue
  view='eu_internal_trade' if partner in EU else 'eu_imports' if k['flow']=='1' else 'eu_exports';identity='COMEXT:M:'+':'.join(k[n] for n in ['reporter','partner','product','flow','time'])
  if identity in seen:reject['DUPLICATE_SOURCE_GRAIN']+=1;continue
  seen.add(identity);origin=partner if k['flow']=='1' else k['reporter'];destination=k['reporter']if k['flow']=='1' else partner
  row=dict(id=identity,source='Eurostat COMEXT DS-045409',source_type='EUROSTAT_COMEXT',source_record_id=identity,source_record_id_kind='DERIVED_STATISTICAL_GRAIN',hs6=k['product'][:6],product_description=scope[k['product']]['official_description'],importer=None,exporter=None,shipment_count=None,confidence='OFFICIAL_CUSTOMS_SCOPE;NO_SPECIES_ALLOCATION',reporter=k['reporter'],partner=partner,origin=origin,destination=destination,reporting_flow='IMPORT' if k['flow']=='1'else'EXPORT',view=view,cn8=k['product'],period=k['time'],net_weight_kg=round(kg*100,6),trade_value_eur=eur,currency='EUR',original_quantity=kg,original_quantity_unit='100KG',classification='PUBLIC_SAFE',mapping_status='VERIFIED_CUSTOMS_SCOPE',species_allocation='NONE',representative_price=None,source_url=req['url'],source_file=req['file'],source_sha256=req['sha256'],source_updated=d.get('updated'),retrieval_date=req['retrieval_date'],official_status=g['statuses'],quality_flags=['SOURCE_REPORTED_ZERO_NET_WEIGHT;NO_PRICE'] if kg==0 else [])
  rows.append(row);accepted+=1
 coverage.append({'reporter':req['reporter'],'cn8':req['cn8'],'status':'RETRIEVED','paired_accepted_rows':accepted,'dimension_reporters':list(d['dimension']['reporter']['category']['index']),'periods_returned':list(d['dimension']['time']['category']['index']),'source_sha256':req['sha256']})
rows.sort(key=lambda r:r['id']);out=W/'comext-normalized-public.jsonl.gz'
with gzip.open(out.with_suffix('.working'),'wt')as f:
 for r in rows:f.write(json.dumps(r,separators=(',',':'))+'\n')
out.with_suffix('.working').replace(out)
complete=len(requests)==1080 and all(r['status']=='RETRIEVED' and r['dimensions'][1]==1 for r in requests) and len({(r['reporter'],r['cn8'])for r in requests})==1080
qa={'requests_expected':1080,'requests_processed':len(requests),'requests_retrieved':sum(r['status']=='RETRIEVED' for r in requests),'complete_request_grid':complete,'public_safe_unique_observations':len(rows),'source_duplicate_observations':reject['DUPLICATE_SOURCE_GRAIN'],'rejections':dict(reject),'scope':'40 verified sowing CN codes;27 reporters;all reported country partners;2024-01 through 2026-06;2024/2025/2026 definitions confirmed','suppression':'Missing cells absent;no zeros inferred','northern_ireland':'XI special trade territory excluded;not treated as a non-EU country','coverage':coverage}
(W/'COMEXT_UNIVERSE_QA.json').write_text(json.dumps(qa,indent=2)+'\n');print(json.dumps({k:v for k,v in qa.items()if k!='coverage'}))
