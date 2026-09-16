#!/usr/bin/env python3
"""
SeedTrade.eu — Lithuania CPMCE emergence uncertainty multi-year diagnostics v0.1
Years: 2021, 2022, 2023

Diagnostic only. Does NOT modify/tune v0.7.

Compares AGRONOMIC_CONFLICT vs AGRONOMIC_AGREE using
phenology_inputs.emergence_uncertainty_days in the frozen v0.7 outputs.
"""

import json
import math
import statistics
from collections import Counter, defaultdict
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / "data" / "raw" / "copernicus"

FILES = {
    2021: DATA / "LT_VALIDATION_season_type_classifier_v07_hybrid_multiyear_validation_2021_5samples_2000ha_2026-09-07.json",
    2022: DATA / "LT_VALIDATION_season_type_classifier_v07_hybrid_multiyear_validation_2022_5samples_2000ha_2026-09-07.json",
    2023: DATA / "LT_VALIDATION_season_type_classifier_v07_hybrid_multiyear_validation_2023_5samples_2000ha_2026-09-07.json",
}

EXPECTED = {
    2021: {"conflict": 3476, "directional": 63738},
    2022: {"conflict": 90, "directional": 52133},
    2023: {"conflict": 17372, "directional": 70213},
}

STATUSES = ("AGRONOMIC_CONFLICT", "AGRONOMIC_AGREE")
BINS = (("1-5",1,5),("6-10",6,10),("11-20",11,20),("21-30",21,30),("31-40",31,40))

def pct(n,d):
    return round(100*n/d,2) if d else 0.0

def avg(v):
    return round(statistics.mean(v),2) if v else None

def med(v):
    return round(statistics.median(v),2) if v else None

def percentile(v,p):
    if not v:
        return None
    s=sorted(v)
    x=(len(s)-1)*p
    a=math.floor(x)
    b=math.ceil(x)
    val=s[a] if a==b else s[a]+(s[b]-s[a])*(x-a)
    return round(float(val),2)

def ubin(x):
    if not isinstance(x,(int,float)):
        return "MISSING"
    for label,lo,hi in BINS:
        if lo <= x <= hi:
            return label
    return "OUTSIDE_1_40"

def month(date_string):
    try:
        return f"{datetime.fromisoformat(date_string).month:02d}"
    except (TypeError,ValueError):
        return "MISSING"

def summarize(rows):
    vals=[r["uncertainty"] for r in rows if isinstance(r["uncertainty"],(int,float))]
    bc=Counter(ubin(r["uncertainty"]) for r in rows)
    return {
        "records": len(rows),
        "valid_uncertainty_values": len(vals),
        "uncertainty_days": {
            "mean": avg(vals),
            "median": med(vals),
            "min": min(vals) if vals else None,
            "max": max(vals) if vals else None,
            "p10": percentile(vals,.10),
            "p25": percentile(vals,.25),
            "p75": percentile(vals,.75),
            "p90": percentile(vals,.90),
        },
        "uncertainty_bins": {
            k: {"count": bc[k], "percent": pct(bc[k],len(rows))}
            for k in ["1-5","6-10","11-20","21-30","31-40","OUTSIDE_1_40","MISSING"]
        }
    }

def grouped(rows, field):
    g=defaultdict(lambda:{s:[] for s in STATUSES})
    for r in rows:
        if r["status"] in STATUSES:
            g[str(r[field])][r["status"]].append(r)
    return {
        key:{status:summarize(g[key][status]) for status in STATUSES}
        for key in sorted(g)
    }

def load_year(year, path):
    if not path.exists():
        raise FileNotFoundError(f"Missing {year} v0.7 file:\n{path}")

    with path.open(encoding="utf-8") as f:
        d=json.load(f)

    samples=d.get("samples")
    if not isinstance(samples,dict):
        raise ValueError(f"{year}: source['samples'] must be dict")

    rows=[]
    counts=Counter()

    for sid,sample in samples.items():
        pixels=sample.get("pixels",[])
        if not isinstance(pixels,list):
            raise ValueError(f"{year} {sid}: pixels must be list")

        for p in pixels:
            status=p.get("agronomic_validation_status")
            counts[status]+=1

            if status not in STATUSES:
                continue

            ph=p.get("phenology_inputs") or {}
            ed=ph.get("emergence_date")
            rows.append({
                "year":year,
                "sample":sid,
                "crop":p.get("crop") or str(p.get("cty")),
                "status":status,
                "month":month(ed),
                "uncertainty":ph.get("emergence_uncertainty_days"),
            })

    conflict=[r for r in rows if r["status"]=="AGRONOMIC_CONFLICT"]
    agree=[r for r in rows if r["status"]=="AGRONOMIC_AGREE"]

    expected=EXPECTED[year]
    integrity={
        "conflict":len(conflict),
        "agree":len(agree),
        "directional_compared":len(conflict)+len(agree),
        "expected_conflict":expected["conflict"],
        "expected_directional_compared":expected["directional"],
        "conflict_matches":len(conflict)==expected["conflict"],
        "directional_matches":len(conflict)+len(agree)==expected["directional"],
        "source_status_counts":dict(counts),
    }
    integrity["pass"]=integrity["conflict_matches"] and integrity["directional_matches"]

    cs=summarize(conflict)
    ag=summarize(agree)
    cm=cs["uncertainty_days"]["mean"]
    am=ag["uncertainty_days"]["mean"]
    cmed=cs["uncertainty_days"]["median"]
    amed=ag["uncertainty_days"]["median"]

    return rows,{
        "integrity":integrity,
        "conflict_rate_percent":pct(len(conflict),len(conflict)+len(agree)),
        "overall":{"AGRONOMIC_CONFLICT":cs,"AGRONOMIC_AGREE":ag},
        "comparison":{
            "conflict_minus_agree_mean_days":round(cm-am,2) if cm is not None and am is not None else None,
            "conflict_minus_agree_median_days":round(cmed-amed,2) if cmed is not None and amed is not None else None,
        },
        "by_sample":grouped(rows,"sample"),
        "by_crop":grouped(rows,"crop"),
        "by_emergence_month":grouped(rows,"month"),
    }

def main():
    print("="*82)
    print("LT 2021-2023 CPMCE EMERGENCE UNCERTAINTY MULTI-YEAR DIAGNOSTICS")
    print("v0.7 remains FROZEN")
    print("="*82)

    all_rows=[]
    years={}
    for year,path in FILES.items():
        rows,result=load_year(year,path)
        all_rows.extend(rows)
        years[str(year)]=result

    all_conflict=[r for r in all_rows if r["status"]=="AGRONOMIC_CONFLICT"]
    all_agree=[r for r in all_rows if r["status"]=="AGRONOMIC_AGREE"]

    output={
        "dataset":"SeedTrade.eu LT CPMCE emergence uncertainty multi-year diagnostics",
        "version":"0.1",
        "years":[2021,2022,2023],
        "diagnostic_only":True,
        "classifier_v07_status":"FROZEN",
        "years_results":years,
        "all_years_combined":{
            "AGRONOMIC_CONFLICT":summarize(all_conflict),
            "AGRONOMIC_AGREE":summarize(all_agree),
        },
        "cross_year_by_crop":grouped(all_rows,"crop"),
        "cross_year_by_emergence_month":grouped(all_rows,"month"),
        "scientific_note":[
            "Descriptive association only; no causal claim.",
            "No v0.7 rules, thresholds, calendars, weights, or classifications are modified.",
            "CPCSY is not used for classification.",
            "CPMCDCL/duration confidence is not used for weighting.",
            "Pixel percentages are descriptive proportions, not probabilities."
        ],
        "generated_at":datetime.now().astimezone().isoformat(timespec="seconds")
    }

    outfile=DATA/f"LT_VALIDATION_emergence_uncertainty_multiyear_diagnostics_v01_2021_2022_2023_5samples_2000ha_{datetime.now():%Y-%m-%d}.json"
    with outfile.open("w",encoding="utf-8") as f:
        json.dump(output,f,indent=2,ensure_ascii=False)

    print()
    print("YEAR   PASS   CONFLICT RATE   CONFLICT UNC. mean/median   AGREE UNC. mean/median   DELTA mean")
    print("-"*82)

    for year in (2021,2022,2023):
        r=years[str(year)]
        c=r["overall"]["AGRONOMIC_CONFLICT"]["uncertainty_days"]
        a=r["overall"]["AGRONOMIC_AGREE"]["uncertainty_days"]
        delta=r["comparison"]["conflict_minus_agree_mean_days"]
        print(
            f"{year}   {str(r['integrity']['pass']):<5}  "
            f"{r['conflict_rate_percent']:>7.2f}%        "
            f"{str(c['mean']):>5}/{str(c['median']):<5} days       "
            f"{str(a['mean']):>5}/{str(a['median']):<5} days       "
            f"{str(delta):>6}"
        )

    print()
    print("UNCERTAINTY BINS BY YEAR — CONFLICT vs AGREE")
    for year in (2021,2022,2023):
        r=years[str(year)]["overall"]
        print(f"\n{year}")
        for label in ["1-5","6-10","11-20","21-30","31-40","OUTSIDE_1_40","MISSING"]:
            c=r["AGRONOMIC_CONFLICT"]["uncertainty_bins"][label]
            a=r["AGRONOMIC_AGREE"]["uncertainty_bins"][label]
            print(
                f"  {label:>12}: "
                f"CONFLICT {c['count']:>6,} ({c['percent']:>6.2f}%) | "
                f"AGREE {a['count']:>6,} ({a['percent']:>6.2f}%)"
            )

    print()
    print(f"Saved: {outfile}")
    print("="*82)

if __name__=="__main__":
    main()
