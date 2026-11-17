"""Bounded discovery only; reviewed append-only promotion is explicit and local.
No FX conversion, range recalculation, schedule installation or deployment.
"""
from pathlib import Path
import argparse,datetime,hashlib,json,urllib.request,subprocess,tempfile,os,copy
ROOT=Path(__file__).resolve().parents[1]
def discover(root,output):
 registry=json.loads((root/'data/price-evidence/observations.json').read_text(encoding='utf8'));results=[]
 for url in dict.fromkeys(r['sourceUrl'] for r in registry['records']):
  row={'url':url,'checkedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'status':'REVIEW_REQUIRED'}
  try:
   with urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'SeedTrade-PriceEvidence/1.0'}),timeout=25) as response:body=response.read(2000000)
   capture=output.parent/(hashlib.sha256(body).hexdigest()+'.html');capture.write_bytes(body);row.update(capture=str(capture),sha256=hashlib.sha256(body).hexdigest(),bytes=len(body))
  except Exception as e:row.update(status='SOURCE_UNAVAILABLE_LAST_GOOD_RETAINED',error=type(e).__name__)
  results.append(row)
 output.write_text(json.dumps({'status':'DISCOVERY_ONLY_NOT_PUBLISHED','records':results},indent=2),encoding='utf8');return results
def promote(root,candidates,review_hash):
 payload=candidates.read_bytes()
 if hashlib.sha256(payload).hexdigest()!=review_hash:raise ValueError('CONTENT_BOUND_FACTUAL_REVIEW_REQUIRED')
 incoming=json.loads(payload);ledger=root/'data/price-evidence/observations.json';public=root/'src/generated/price_evidence_public.json';old_ledger=ledger.read_bytes();old_public=public.read_bytes();data=json.loads(old_ledger);by_id={r['id']:r for r in data['records']}
 for record in incoming['records']:
  if record['id'] in by_id:
   if by_id[record['id']]!=record:raise ValueError('HISTORICAL_OBSERVATION_OVERWRITE_FORBIDDEN')
  else:data['records'].append(record);by_id[record['id']]=record
 projection={'schema':data['schema'],'records':[{k:v for k,v in r.items() if k not in ['evidenceFile','sourceLocator']} for r in data['records']]}
 try:
  ledger.write_text(json.dumps(data,ensure_ascii=False,indent=2),encoding='utf8');public.write_text(json.dumps(projection,ensure_ascii=False,indent=2),encoding='utf8')
  check=subprocess.run(['node',str(root/'scripts/validate_price_evidence.mjs')],cwd=root,capture_output=True,text=True)
  if check.returncode:raise ValueError('PRICE_VALIDATION_FAILED: '+check.stderr[:500])
 except Exception:
  ledger.write_bytes(old_ledger);public.write_bytes(old_public);raise
 return {'status':'LOCAL_REVIEWED_APPEND_ONLY','observations':len(data['records']),'deployed':False}
if __name__=='__main__':
 parser=argparse.ArgumentParser();parser.add_argument('--discover',action='store_true');parser.add_argument('--output',default='.cache/price-evidence/candidates.json');parser.add_argument('--apply');parser.add_argument('--review-sha256');args=parser.parse_args()
 if args.discover:
  output=Path(args.output);output.parent.mkdir(parents=True,exist_ok=True);print(json.dumps(discover(ROOT,output)))
 elif args.apply and args.review_sha256:print(json.dumps(promote(ROOT,Path(args.apply),args.review_sha256)))
 else:parser.error('Use --discover, or --apply <reviewed-file> --review-sha256 <exact reviewed digest>')
