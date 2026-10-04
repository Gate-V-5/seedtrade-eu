import argparse,pathlib,json
P=argparse.ArgumentParser();P.add_argument('--work',required=True);A=P.parse_args();W=pathlib.Path(A.work);R=pathlib.Path(__file__).resolve().parents[2];d=json.load(open(R/'src/generated/market_categories_public.json'));totals=json.load(open(W/'country-customs-totals.json'));observed=set(totals['observed_codes']);scope={e['cn8']:e for e in d['entities']}
for c in d['categories']:
 linked=[e['cn8']for e in d['entities']if c['id']in e['seed_categories']];c['observed_trade_entity_count']=len(set(linked)&observed);periods=[r[3]for r in totals['rows']if r[0]in linked and r[1]=='EU'];c['latest_verified_period']=max(periods)if periods else None
 for s in c['species']:
  eligible=[x for x in s['cn_codes']if x in observed];s['species_trade']=any(scope[x]['granularity']in ['SPECIES_SPECIFIC','PARTIAL']for x in eligible);s['observed_trade_codes']=eligible
(R/'src/generated/market_categories_public.json').write_text(json.dumps(d,indent=2)+'\n')
