#!/usr/bin/env python3
"""
SeedTrade.eu — LT 2023 S03 interactive CTY x event map v0.2

Changes vs v0.1:
- no external basemap tiles -> no OSM 403 problem;
- PRIMARY / SECOND are drawn as outlines over crop colours;
- layer switches: Crops only / Events only / All;
- event membership is preserved exactly from frozen v0.7.

Diagnostic only. v0.7 is NOT modified.
"""

import json
import math
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / "data" / "raw" / "copernicus"

V07 = DATA / (
    "LT_VALIDATION_season_type_classifier_v07_hybrid_multiyear_validation_"
    "2023_5samples_2000ha_2026-09-07.json"
)
RAW = DATA / (
    "LT_VALIDATION_multiyear_validation_pixel_intelligence_"
    "2023_S03_2km_400ha_test_2026-09-07.json"
)

CROPS = {
    1110: "Wheat",
    1120: "Barley",
    1150: "Other cereals",
    1430: "Rapeseed",
}

PATTERNS = {
    "PRIMARY_FULL_PATTERN": {
        "emergence_date": "2023-03-28",
        "emergence_uncertainty_days": 17,
        "duration_days": 119,
        "harvest_date": "2023-07-25",
    },
    "SECOND_DATE_UNCERTAINTY": {
        "emergence_date": "2023-03-31",
        "emergence_uncertainty_days": 19,
    },
}


def utm34n_to_wgs84(easting, northing):
    a = 6378137.0
    es = 0.00669437999014
    k0 = 0.9996
    e1 = (1 - math.sqrt(1 - es)) / (1 + math.sqrt(1 - es))
    x = easting - 500000.0
    m = northing / k0
    mu = m / (a * (1 - es/4 - 3*es**2/64 - 5*es**3/256))
    p = (
        mu
        + (3*e1/2 - 27*e1**3/32) * math.sin(2*mu)
        + (21*e1**2/16 - 55*e1**4/32) * math.sin(4*mu)
        + (151*e1**3/96) * math.sin(6*mu)
        + (1097*e1**4/512) * math.sin(8*mu)
    )
    ep = es / (1-es)
    n = a / math.sqrt(1-es*math.sin(p)**2)
    t = math.tan(p)**2
    c = ep*math.cos(p)**2
    r = a*(1-es)/(1-es*math.sin(p)**2)**1.5
    d = x/(n*k0)
    lat = p - (n*math.tan(p)/r) * (
        d**2/2
        - (5+3*t+10*c-4*c**2-9*ep)*d**4/24
        + (61+90*t+298*c+45*t**2-252*ep-3*c**2)*d**6/720
    )
    lon = (
        d
        - (1+2*t+c)*d**3/6
        + (5-2*c+28*t-3*c**2+8*ep+24*t**2)*d**5/120
    ) / math.cos(p)
    return math.degrees(lat), 21 + math.degrees(lon)


def matches(pixel, criteria):
    ph = pixel.get("phenology_inputs") or {}
    return all(ph.get(k) == v for k, v in criteria.items())


def event_name(pixel):
    if pixel.get("agronomic_validation_status") != "AGRONOMIC_CONFLICT":
        return None
    for name, criteria in PATTERNS.items():
        if matches(pixel, criteria):
            return name
    return None


def main():
    with V07.open(encoding="utf-8") as f:
        v07 = json.load(f)
    with RAW.open(encoding="utf-8") as f:
        raw = json.load(f)

    minx, _, _, maxy = raw["bbox"]
    res = raw["resolution_m"]

    records = []
    counts = {"PRIMARY_FULL_PATTERN": 0, "SECOND_DATE_UNCERTAINTY": 0}

    for p in v07["samples"]["S03"]["pixels"]:
        cty = int(p["cty"])
        if cty not in CROPS:
            continue

        row = int(p["row"])
        col = int(p["column"])
        x = minx + (col + 0.5) * res
        y = maxy - (row + 0.5) * res
        lat, lon = utm34n_to_wgs84(x, y)
        ev = event_name(p)
        if ev:
            counts[ev] += 1

        records.append([
            row, col, round(lat, 7), round(lon, 7), CROPS[cty], ev
        ])

    if len(records) != 20991:
        raise RuntimeError(f"Target count failed: {len(records)}")
    if counts["PRIMARY_FULL_PATTERN"] != 6115:
        raise RuntimeError(f"PRIMARY failed: {counts}")
    if counts["SECOND_DATE_UNCERTAINTY"] != 1156:
        raise RuntimeError(f"SECOND failed: {counts}")

    payload = json.dumps(records, separators=(",", ":"))

    html = """<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>SeedTrade.eu S03 CTY x Event v0.2</title>
<style>
html,body{height:100%;margin:0;font-family:Arial,sans-serif;background:#f4f4f1}
#wrap{height:100%;display:flex;align-items:center;justify-content:center}
#map{position:relative;background:white;border:1px solid #aaa;box-shadow:0 2px 12px #999}
canvas{display:block}
#panel{position:fixed;right:18px;top:18px;background:white;padding:14px 16px;border-radius:9px;
box-shadow:0 2px 12px #999;z-index:10;min-width:270px;font-size:13px}
#panel h3{margin:0 0 9px}.row{margin:6px 0}.sw{display:inline-block;width:17px;height:17px;
vertical-align:middle;margin-right:7px;border:1px solid #555}.line{height:4px;width:24px;display:inline-block;
vertical-align:middle;margin-right:7px}.buttons{margin-top:10px}.buttons button{margin-right:5px;padding:5px 8px}
.small{font-size:11px;color:#555;margin-top:10px;line-height:1.4}
#tip{position:fixed;display:none;background:#111;color:white;padding:6px 8px;border-radius:5px;
font-size:12px;pointer-events:none;z-index:20}
</style>
</head>
<body>
<div id="wrap"><div id="map"><canvas id="cv"></canvas></div></div>
<div id="panel">
<h3>S03 CTY x event — v0.2</h3>
<div class="row"><span class="sw" style="background:#2f6db0"></span>Wheat</div>
<div class="row"><span class="sw" style="background:#e0a32f"></span>Barley</div>
<div class="row"><span class="sw" style="background:#8b65b0"></span>Other cereals</div>
<div class="row"><span class="sw" style="background:#55a868"></span>Rapeseed</div>
<hr>
<div class="row"><span class="line" style="background:#e31a1c"></span>PRIMARY event outline</div>
<div class="row"><span class="line" style="background:#ff00c8"></span>SECOND event outline</div>
<div class="buttons">
<button onclick="mode='crops';draw()">Crops only</button>
<button onclick="mode='events';draw()">Events only</button>
<button onclick="mode='all';draw()">All</button>
</div>
<div class="small">
Each cell = 10 m pixel.<br>
PRIMARY: 6,115 px / 61.15 ha.<br>
SECOND: 1,156 px / 11.56 ha.<br>
No external basemap. v0.7 frozen.
</div>
</div>
<div id="tip"></div>
<script>
const R=__DATA__;
const cropColor={"Wheat":"#2f6db0","Barley":"#e0a32f","Other cereals":"#8b65b0","Rapeseed":"#55a868"};
const eventColor={"PRIMARY_FULL_PATTERN":"#e31a1c","SECOND_DATE_UNCERTAINTY":"#ff00c8"};
let mode="all";
const scale=4, W=200*scale, H=200*scale;
const cv=document.getElementById("cv"), ctx=cv.getContext("2d");
cv.width=W;cv.height=H;cv.style.width=W+"px";cv.style.height=H+"px";
document.getElementById("map").style.width=W+"px";
document.getElementById("map").style.height=H+"px";

const lookup=new Map();
for(const r of R) lookup.set(r[0]+","+r[1],r);

function hasSameEvent(row,col,ev){
 const q=lookup.get(row+","+col);
 return q && q[5]===ev;
}
function draw(){
 ctx.clearRect(0,0,W,H);
 ctx.fillStyle="#ffffff";ctx.fillRect(0,0,W,H);

 if(mode!=="events"){
  for(const r of R){
   ctx.fillStyle=cropColor[r[4]];
   ctx.fillRect(r[1]*scale,r[0]*scale,scale,scale);
  }
 }

 if(mode!=="crops"){
  for(const r of R){
   const ev=r[5]; if(!ev) continue;
   const row=r[0],col=r[1],x=col*scale,y=row*scale;
   ctx.strokeStyle=eventColor[ev];ctx.lineWidth=2;
   ctx.beginPath();
   if(!hasSameEvent(row-1,col,ev)){ctx.moveTo(x,y);ctx.lineTo(x+scale,y)}
   if(!hasSameEvent(row+1,col,ev)){ctx.moveTo(x,y+scale);ctx.lineTo(x+scale,y+scale)}
   if(!hasSameEvent(row,col-1,ev)){ctx.moveTo(x,y);ctx.lineTo(x,y+scale)}
   if(!hasSameEvent(row,col+1,ev)){ctx.moveTo(x+scale,y);ctx.lineTo(x+scale,y+scale)}
   ctx.stroke();
   if(mode==="events"){
    ctx.fillStyle=ev==="PRIMARY_FULL_PATTERN"?"rgba(227,26,28,.18)":"rgba(255,0,200,.22)";
    ctx.fillRect(x,y,scale,scale);
   }
  }
 }
 // grid border + north arrow
 ctx.strokeStyle="#333";ctx.lineWidth=1;ctx.strokeRect(.5,.5,W-1,H-1);
 ctx.fillStyle="#111";ctx.font="14px Arial";ctx.fillText("N ↑",10,20);
}
draw();

const tip=document.getElementById("tip");
cv.addEventListener("mousemove",e=>{
 const b=cv.getBoundingClientRect();
 const col=Math.floor((e.clientX-b.left)/(b.width/200));
 const row=Math.floor((e.clientY-b.top)/(b.height/200));
 const r=lookup.get(row+","+col);
 if(!r){tip.style.display="none";return}
 tip.innerHTML="row "+row+", col "+col+"<br>"+r[4]+(r[5]?"<br>"+r[5]:"");
 tip.style.left=(e.clientX+12)+"px";tip.style.top=(e.clientY+12)+"px";tip.style.display="block";
});
cv.addEventListener("mouseleave",()=>tip.style.display="none");
</script>
</body></html>""".replace("__DATA__", payload)

    out = DATA / (
        f"LT_VALIDATION_S03_CTY_x_event_interactive_v02_2023_"
        f"{datetime.now():%Y-%m-%d}.html"
    )
    out.write_text(html, encoding="utf-8")

    print("=" * 92)
    print("LT 2023 S03 INTERACTIVE CTY x EVENT MAP v0.2")
    print("No external basemap tiles")
    print("v0.7 remains FROZEN")
    print("=" * 92)
    print("Integrity PASS: True")
    print(f"Target crop pixels: {len(records):,}")
    print(f"PRIMARY_FULL_PATTERN: {counts['PRIMARY_FULL_PATTERN']:,}")
    print(f"SECOND_DATE_UNCERTAINTY: {counts['SECOND_DATE_UNCERTAINTY']:,}")
    print(f"Saved: {out}")
    print("=" * 92)


if __name__ == "__main__":
    main()
