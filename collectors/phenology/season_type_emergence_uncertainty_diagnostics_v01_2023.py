#!/usr/bin/env python3
import json, math, statistics
from collections import Counter, defaultdict
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / "data" / "raw" / "copernicus"
INPUT = DATA / "LT_VALIDATION_season_type_classifier_v07_hybrid_multiyear_validation_2023_5samples_2000ha_2026-09-07.json"
STATUSES = ("AGRONOMIC_CONFLICT", "AGRONOMIC_AGREE")
BINS = (("1-5",1,5),("6-10",6,10),("11-20",11,20),("21-30",21,30),("31-40",31,40))

def pct(n,d): return round(100*n/d,2) if d else 0.0
def avg(v): return round(statistics.mean(v),2) if v else None
def med(v): return round(statistics.median(v),2) if v else None
def percentile(v,p):
    if not v: return None
    s=sorted(v); x=(len(s)-1)*p; a=math.floor(x); b=math.ceil(x)
    return round(float(s[a] if a==b else s[a]+(s[b]-s[a])*(x-a)),2)
def ubin(x):
    if not isinstance(x,(int,float)): return "MISSING"
    for label,lo,hi in BINS:
        if lo <= x <= hi: return label
    return "OUTSIDE_1_40"
def month(s):
    try: return f"{datetime.fromisoformat(s).month:02d}"
    except (TypeError,ValueError): return "MISSING"

def summarize(rows):
    vals=[r["uncertainty"] for r in rows if isinstance(r["uncertainty"],(int,float))]
    bc=Counter(ubin(r["uncertainty"]) for r in rows)
    return {
        "records":len(rows),
        "valid_uncertainty_values":len(vals),
        "uncertainty_days":{
            "mean":avg(vals),"median":med(vals),
            "min":min(vals) if vals else None,"max":max(vals) if vals else None,
            "p10":percentile(vals,.10),"p25":percentile(vals,.25),
            "p75":percentile(vals,.75),"p90":percentile(vals,.90)},
        "uncertainty_bins":{k:{"count":bc[k],"percent":pct(bc[k],len(rows))}
            for k in ["1-5","6-10","11-20","21-30","31-40","OUTSIDE_1_40","MISSING"]}
    }

def grouped(rows,field):
    g=defaultdict(lambda:{s:[] for s in STATUSES})
    for r in rows: g[str(r[field])][r["status"]].append(r)
    return {k:{s:summarize(g[k][s]) for s in STATUSES} for k in sorted(g)}

def main():
    if not INPUT.exists(): raise FileNotFoundError(INPUT)
    with INPUT.open(encoding="utf-8") as f: d=json.load(f)
    if not isinstance(d.get("samples"),dict): raise ValueError("samples must be dict")

    rows=[]; source_counts=Counter()
    for sid,sample in d["samples"].items():
        for p in sample.get("pixels",[]):
            status=p.get("agronomic_validation_status"); source_counts[status]+=1
            if status not in STATUSES: continue
            ph=p.get("phenology_inputs") or {}
            rows.append({
                "sample":sid,"crop":p.get("crop") or str(p.get("cty")),
                "status":status,"month":month(ph.get("emergence_date")),
                "uncertainty":ph.get("emergence_uncertainty_days")
            })

    c=[r for r in rows if r["status"]=="AGRONOMIC_CONFLICT"]
    a=[r for r in rows if r["status"]=="AGRONOMIC_AGREE"]
    cs,as_=summarize(c),summarize(a)
    integrity={"conflict":len(c),"agree":len(a),
               "expected_conflict":17372,"expected_agree":52841,
               "pass":len(c)==17372 and len(a)==52841,
               "source_status_counts":dict(source_counts)}
    cm,am=cs["uncertainty_days"]["mean"],as_["uncertainty_days"]["mean"]
    cmed,amed=cs["uncertainty_days"]["median"],as_["uncertainty_days"]["median"]

    out={
      "dataset":"SeedTrade.eu LT 2023 CPMCE emergence uncertainty diagnostics",
      "version":"0.1","diagnostic_only":True,"classifier_v07_status":"FROZEN",
      "source_file":str(INPUT),"integrity":integrity,
      "overall":{"AGRONOMIC_CONFLICT":cs,"AGRONOMIC_AGREE":as_},
      "comparison":{
        "conflict_minus_agree_mean_days":round(cm-am,2) if cm is not None and am is not None else None,
        "conflict_minus_agree_median_days":round(cmed-amed,2) if cmed is not None and amed is not None else None,
        "note":"Descriptive diagnostic only; no causal claim and no v0.7 tuning."
      },
      "by_sample":grouped(rows,"sample"),
      "by_crop":grouped(rows,"crop"),
      "by_emergence_month":grouped(rows,"month"),
      "generated_at":datetime.now().astimezone().isoformat(timespec="seconds")
    }
    outfile=DATA/f"LT_VALIDATION_emergence_uncertainty_diagnostics_v01_2023_5samples_2000ha_{datetime.now():%Y-%m-%d}.json"
    with outfile.open("w",encoding="utf-8") as f: json.dump(out,f,indent=2,ensure_ascii=False)

    print("="*72)
    print("LT 2023 CPMCE EMERGENCE UNCERTAINTY DIAGNOSTICS")
    print("v0.7 remains FROZEN")
    print("="*72)
    print(f"Integrity PASS: {integrity['pass']}")
    print(f"CONFLICT: {len(c):,} / expected 17,372")
    print(f"AGREE:    {len(a):,} / expected 52,841")
    print()
    print(f"CONFLICT uncertainty mean/median: {cm} / {cmed} days")
    print(f"AGREE    uncertainty mean/median: {am} / {amed} days")
    print(f"Mean difference (conflict-agree): {out['comparison']['conflict_minus_agree_mean_days']} days")
    print()
    for label in ["1-5","6-10","11-20","21-30","31-40","OUTSIDE_1_40","MISSING"]:
        x=cs["uncertainty_bins"][label]; y=as_["uncertainty_bins"][label]
        print(f"{label:>12}: CONFLICT {x['count']:>6,} ({x['percent']:>6.2f}%) | AGREE {y['count']:>6,} ({y['percent']:>6.2f}%)")
    print()
    print(f"Saved: {outfile}")

if __name__=="__main__":
    main()
