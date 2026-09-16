#!/usr/bin/env python3
import json, math
from datetime import datetime
from pathlib import Path

ROOT=Path(__file__).resolve().parents[2]
DATA=ROOT/"data"/"raw"/"copernicus"
V07=DATA/"LT_VALIDATION_season_type_classifier_v07_hybrid_multiyear_validation_2023_5samples_2000ha_2026-09-07.json"
RAW=DATA/"LT_VALIDATION_multiyear_validation_pixel_intelligence_2023_S03_2km_400ha_test_2026-09-07.json"
CROPS={1110:"Wheat",1120:"Barley",1150:"Other cereals",1430:"Rapeseed"}
PATTERNS={
"PRIMARY_FULL_PATTERN":{"emergence_date":"2023-03-28","emergence_uncertainty_days":17,"duration_days":119,"harvest_date":"2023-07-25"},
"SECOND_DATE_UNCERTAINTY":{"emergence_date":"2023-03-31","emergence_uncertainty_days":19}}

def utm(e,n):
 a=6378137.; es=.00669437999014; k=.9996
 e1=(1-math.sqrt(1-es))/(1+math.sqrt(1-es)); x=e-500000.; m=n/k
 mu=m/(a*(1-es/4-3*es**2/64-5*es**3/256))
 p=mu+(3*e1/2-27*e1**3/32)*math.sin(2*mu)+(21*e1**2/16-55*e1**4/32)*math.sin(4*mu)+(151*e1**3/96)*math.sin(6*mu)+(1097*e1**4/512)*math.sin(8*mu)
 ep=es/(1-es); N=a/math.sqrt(1-es*math.sin(p)**2); T=math.tan(p)**2; C=ep*math.cos(p)**2; R=a*(1-es)/(1-es*math.sin(p)**2)**1.5; D=x/(N*k)
 lat=p-(N*math.tan(p)/R)*(D**2/2-(5+3*T+10*C-4*C**2-9*ep)*D**4/24+(61+90*T+298*C+45*T**2-252*ep-3*C**2)*D**6/720)
 lon=(D-(1+2*T+C)*D**3/6+(5-2*C+28*T-3*C**2+8*ep+24*T**2)*D**5/120)/math.cos(p)
 return math.degrees(lat),21+math.degrees(lon)

def match(p,c):
 ph=p.get("phenology_inputs") or {}
 return all(ph.get(k)==v for k,v in c.items())

def main():
 v=json.load(open(V07,encoding="utf-8")); r=json.load(open(RAW,encoding="utf-8"))
 minx,_,_,maxy=r["bbox"]; res=r["resolution_m"]; rec=[]; pc={"PRIMARY_FULL_PATTERN":0,"SECOND_DATE_UNCERTAINTY":0}
 for p in v["samples"]["S03"]["pixels"]:
  c=int(p["cty"])
  if c not in CROPS: continue
  row,col=int(p["row"]),int(p["column"]); lat,lon=utm(minx+(col+.5)*res,maxy-(row+.5)*res)
  pat=None
  if p.get("agronomic_validation_status")=="AGRONOMIC_CONFLICT":
   for name,crit in PATTERNS.items():
    if match(p,crit): pat=name; pc[name]+=1; break
  rec.append([round(lat,7),round(lon,7),CROPS[c],pat])
 if len(rec)!=20991 or pc["PRIMARY_FULL_PATTERN"]!=6115 or pc["SECOND_DATE_UNCERTAINTY"]!=1156: raise RuntimeError((len(rec),pc))
 payload=json.dumps(rec,separators=(",",":"))
 html="""<!doctype html><html><head><meta charset="utf-8"><title>S03 CTY x Event</title>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">
<style>html,body,#map{height:100%;margin:0}.p{position:absolute;z-index:9999;top:12px;right:12px;background:white;padding:12px;border-radius:8px;font:13px Arial;box-shadow:0 1px 8px #777}.r{margin:5px}.s{display:inline-block;width:15px;height:15px;margin-right:6px;vertical-align:middle}</style></head>
<body><div id="map"></div><div class="p"><b>S03 CTY x event</b>
<div class="r"><span class="s" style="background:#2f6db0"></span><input class="c" type="checkbox" value="Wheat" checked>Wheat</div>
<div class="r"><span class="s" style="background:#e0a32f"></span><input class="c" type="checkbox" value="Barley" checked>Barley</div>
<div class="r"><span class="s" style="background:#8b65b0"></span><input class="c" type="checkbox" value="Other cereals" checked>Other cereals</div>
<div class="r"><span class="s" style="background:#55a868"></span><input class="c" type="checkbox" value="Rapeseed" checked>Rapeseed</div><hr>
<div class="r"><span class="s" style="background:#e31a1c"></span><input id="p1" type="checkbox" checked>PRIMARY event</div>
<div class="r"><span class="s" style="background:#ff00c8"></span><input id="p2" type="checkbox" checked>SECOND event</div>
<button onclick="mode('c')">Crops only</button> <button onclick="mode('e')">Events only</button> <button onclick="mode('a')">All</button>
<div style="margin-top:8px;font-size:11px">10 m pixels. PRIMARY 6,115; SECOND 1,156. v0.7 frozen.</div></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script><script>
const R=__DATA__, cc={"Wheat":"#2f6db0","Barley":"#e0a32f","Other cereals":"#8b65b0","Rapeseed":"#55a868"}, ec={"PRIMARY_FULL_PATTERN":"#e31a1c","SECOND_DATE_UNCERTAINTY":"#ff00c8"};
const m=L.map('map',{preferCanvas:true}).setView([55.35,23.85],15); L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'OpenStreetMap'}).addTo(m);
const cv=L.canvas({padding:.5}), ls=[];
for(const r of R){let q=L.rectangle([[r[0]-.000045,r[1]-.000079],[r[0]+.000045,r[1]+.000079]],{renderer:cv,stroke:false,fillColor:cc[r[2]],fillOpacity:.58}).addTo(m);q.d=r;ls.push(q)}
function draw(){let cs=new Set([...document.querySelectorAll('.c:checked')].map(x=>x.value)),a=p1.checked,b=p2.checked;for(const q of ls){let r=q.d,e=(r[3]=="PRIMARY_FULL_PATTERN"&&a)||(r[3]=="SECOND_DATE_UNCERTAINTY"&&b);q.setStyle({fillColor:e?ec[r[3]]:cc[r[2]],fillOpacity:e?.9:(cs.has(r[2])?.58:0)})}}
function mode(x){document.querySelectorAll('.c').forEach(z=>z.checked=x!='e');p1.checked=x!='c';p2.checked=x!='c';draw()}
document.querySelectorAll('input').forEach(x=>x.onchange=draw);m.fitBounds(L.latLngBounds(R.map(r=>[r[0],r[1]])).pad(.08));
</script></body></html>""".replace("__DATA__",payload)
 out=DATA/f"LT_VALIDATION_S03_CTY_x_event_interactive_v01_2023_{datetime.now():%Y-%m-%d}.html";out.write_text(html,encoding="utf-8")
 print("="*90);print("LT 2023 S03 INTERACTIVE CTY x EVENT MAP");print("Integrity PASS: True");print(f"Target crop pixels: {len(rec):,}");print(f"PRIMARY_FULL_PATTERN: {pc['PRIMARY_FULL_PATTERN']:,}");print(f"SECOND_DATE_UNCERTAINTY: {pc['SECOND_DATE_UNCERTAINTY']:,}");print(f"Saved: {out}");print("="*90)
if __name__=="__main__": main()
