"""Measure the built initial static import closure, excluding conditional imports."""
import gzip,hashlib,json,pathlib,re
ROOT=pathlib.Path(__file__).resolve().parents[1];dist=ROOT/'dist'
html=(dist/'index.html').read_text();entries=re.findall(r'<script[^>]+type="module"[^>]+src="([^"]+)"',html)
assert entries
seen=set()
def walk(url):
 p=dist/url.lstrip('/')
 if p in seen:return
 seen.add(p);text=p.read_text()
 for ref in re.findall(r'(?:from|import)\s*["\'](\./[^"\']+\.js)["\']',text):walk('/'+str((p.parent/ref).relative_to(dist)))
for url in entries:walk(url)
production=list((dist/'assets').glob('ProductionIntelligence-*.js'));assert len(production)==1
assert production[0] not in seen
for p in seen:assert 'V05N0012' not in p.read_text()
assert 'V05N0012' in production[0].read_text()
assert any(re.search(r'import\(["\'`]\./ProductionIntelligence-',p.read_text()) for p in seen)
data=ROOT/'src/generated/production_public.json';chunks=list((dist/'assets').glob('*.js'))
size=lambda p:p.stat().st_size
gz=lambda p:len(gzip.compress(p.read_bytes(),compresslevel=6,mtime=0))
r={'MAIN_INITIAL_JS_BYTES':sum(size(p) for p in seen),'MAIN_INITIAL_JS_GZIP_BYTES':sum(gz(p) for p in seen),'MAIN_ENTRY_JS_BYTES':size(dist/entries[0].lstrip('/')),'PRODUCTION_DATA_BYTES':size(data),'PRODUCTION_DATA_GZIP_BYTES':gz(data),'LARGEST_CHUNK_BYTES':max(size(p) for p in chunks),'PRODUCTION_DATA_LOADING':'LAZY_ROUTE_ONLY','INITIAL_CHUNKS':[p.name for p in sorted(seen)],'PRODUCTION_CHUNK':production[0].name,'BUNDLE_WARNING_STATUS':'REMAINS;LARGE_LAZY_PRODUCTION_CHUNK_AND_EXISTING_MAIN_CHUNK','GZIP_METHOD':'level6;mtime0;sum_individual_responses'}
(ROOT/'docs/production-intelligence/qa/performance-after.json').write_text(json.dumps(r,indent=2)+'\n');print(json.dumps(r))
