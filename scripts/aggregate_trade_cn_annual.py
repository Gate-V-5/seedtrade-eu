"""Sum reported compatible bilateral months; partial years remain explicitly partial."""
import json,pathlib,csv,collections
R=pathlib.Path(__file__).resolve().parents[1];O=R/'docs/trade-cn-v1';rows=json.loads((R/'data/trade-cn-v1/comext-normalized.json').read_text());groups=collections.defaultdict(list)
for r in rows:groups[(r['reporter'],r['partner'],r['cn8'],r['period'][:4])].append(r)
a=[dict(reporter=k[0],partner=k[1],cn8=k[2],year=int(k[3]),reported_months=len(v),coverage='COMPLETE_12_REPORTED_MONTHS' if len(v)==12 else 'PARTIAL_REPORTED_MONTHS_ONLY',net_weight_kg=sum(r['net_weight_kg'] for r in v),trade_value_eur=sum(r['trade_value_eur'] for r in v),source_observations=[r['id'] for r in v],limitation='Sum of reported same-code bilateral months only; no zero filling, annualization or species allocation.') for k,v in sorted(groups.items())]
(O/'ANNUAL_REPORTED_TRADE.json').write_text(json.dumps(a,indent=2)+'\n')
with (O/'ANNUAL_REPORTED_TRADE.csv').open('w',newline='') as f:
 w=csv.DictWriter(f,fieldnames=list(a[0]),lineterminator='\n');w.writeheader();w.writerows([{**r,'source_observations':json.dumps(r['source_observations'])} for r in a])
print('Annual reported-month segments:',len(a))
