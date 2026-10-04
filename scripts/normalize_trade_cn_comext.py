"""Normalize filtered JSON-stat 2.0 official bilateral rows without filling missing values."""
import json,pathlib,hashlib,itertools
R=pathlib.Path(__file__).resolve().parents[1]
raw=R/'data/trade-cn-v1/raw-comext';rows=[];audit=[]
requests={r['file']:r for r in json.loads((R/'data/trade-cn-v1/COMEXT_REQUESTS.json').read_text()) if r.get('file')}
for p in sorted(raw.glob('comext-*.json')):
 d=json.loads(p.read_text());ids=d.get('id',[]);sizes=d.get('size',[]);cats={k:{v:x for x,v in d['dimension'][k]['category']['index'].items()} for k in ids};values=d.get('value',{});groups={}
 for idx,text in enumerate(itertools.product(*(range(n) for n in sizes))):
  value=values.get(str(idx)) if isinstance(values,dict) else values[idx]
  if value is None:continue
  key={k:cats[k][pos] for k,pos in zip(ids,text)};ind=key.pop('indicators');g=tuple(key[k] for k in ids if k!='indicators');groups.setdefault(g,{'key':key,'measures':{}})['measures'][ind]=value
 accepted=0
 for group in groups.values():
  k=group['key'];v=group['measures'];kg=v.get('QUANTITY_IN_100KG');eur=v.get('VALUE_IN_EUROS')
  if kg is None or eur is None:continue
  assert k['freq']=='M' and k['flow']=='2' and k['reporter']in ['DE','FR','NL','PL'] and k['partner']in ['DE','PL'] and k['reporter']!=k['partner']
  assert 0<=kg and 0<=eur and '2025-01'<=k['time']<='2026-06'
  rows.append(dict(id='COMEXT-CNV1-'+k['reporter']+'-'+k['partner']+'-'+k['product']+'-'+k['time'],reporter=k['reporter'],partner=k['partner'],flow='EXPORT_DISPATCH',trade_scope='INTRA_EU_BILATERAL',period=k['time'],cn8=k['product'],net_weight_kg=round(kg*100,6),trade_value_eur=eur,original_quantity=kg,original_quantity_unit='100KG',source='Eurostat COMEXT DS-045409',source_url=requests[p.name]['url'],source_file=p.name,source_sha256=hashlib.sha256(p.read_bytes()).hexdigest(),retrieval_date='2026-10-04',classification='PUBLIC_SAFE',mapping_status='VERIFIED_CUSTOMS_SCOPE',representative_price=None,quality_flags=['SOURCE_REPORTED_ZERO_NET_WEIGHT; NO_PRICE'] if kg==0 else [],official_status_metadata=d.get('status')));accepted+=1
 audit.append(dict(file=p.name,accepted=accepted,value_cells=len(values),dimension_sizes=sizes,source_updated=d.get('updated'),unpaired_measure_groups=len(groups)-accepted))
assert len(rows)==len({r['id'] for r in rows})
(R/'data/trade-cn-v1/comext-normalized.json').write_text(json.dumps(rows,indent=2)+'\n');(R/'docs/trade-cn-v1/COMEXT_EXTRACTION_QA.json').write_text(json.dumps(audit,indent=2)+'\n');print('Accepted paired bilateral monthly observations:',len(rows))
