"""Publish official-only provenance and derived audit; never commercial raw evidence."""
import pathlib,json,argparse,shutil,csv
p=argparse.ArgumentParser();p.add_argument('--work',required=True);a=p.parse_args();w=pathlib.Path(a.work);r=pathlib.Path(__file__).resolve().parents[2];d=r/'docs/multisource-trade-v1';d.mkdir(exist_ok=True)
qa=json.load(open(w/'COMEXT_UNIVERSE_QA.json'));assert qa['complete_request_grid'],'Final official evidence requires complete grid'
for name in ['COMEXT_UNIVERSE_QA','FINAL_DATA_QA','TRADE_PULSE_RECALCULATION_AUDIT','PRODUCTION_TRADE_INTERSECTION','CN_HISTORY_EVIDENCE']:
 shutil.copyfile(w/(name+'.json'),d/(name+'.json'))
manifest={'source':'Eurostat COMEXT DS-045409','history':'2024-01 through 2026-06','scope':'40 approved sowing CN8 codes; EU27 reporters; country partners only; no group-to-species allocation','requests':[{k:v for k,v in x.items() if k not in ['dimensions','value_cells']} for x in json.load(open(w/'COMEXT_REQUEST_MANIFEST.json'))],'history_evidence':'docs/multisource-trade-v1/CN_HISTORY_EVIDENCE.json','commercial_records_included':0,'manifest_note':'Raw official JSON files preserved in recovery checkpoint; SHA256 and original official request URL permit reproduction.'}
(r/'public/data/multisource-official-source-manifest-v1.json').write_text(json.dumps(manifest,indent=2)+'\n')
inter=json.load(open(w/'PRODUCTION_TRADE_INTERSECTION.json'))
with (d/'PRODUCTION_TRADE_INTERSECTION.csv').open('w',newline='')as f:
 cols=list(inter['species'][0]);out=csv.DictWriter(f,fieldnames=cols);out.writeheader()
 for row in inter['species']:out.writerow({k:json.dumps(v) if isinstance(v,(dict,list,bool)) or v is None else v for k,v in row.items()})
print('Official provenance, audit and intersection finalized. Commercial raw publication: none.')
