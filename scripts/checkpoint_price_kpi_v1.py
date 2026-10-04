"""Durable V4 checkpoint: source, public build, official evidence, QA and publication diff."""
import hashlib,json,os,subprocess,sys,tempfile,zipfile
from pathlib import Path
R=Path(__file__).resolve().parents[1];D=R/'docs/price-kpi-audit-v1';BASE='8f83dd7e1f6d0f97e7f7f3fa1c70c83a4a9ec101'
DEST=Path(sys.argv[1]).resolve();DEST.mkdir(exist_ok=True,parents=True)
NAME='SeedTrade-price-evidence-resolution-global-trade-kpi-audit-v1-20261004'
sha=lambda b:hashlib.sha256(b).hexdigest()
assert json.loads((D/'QA_RESULT.json').read_text())['failures']==0
assert 'Ran 269 tests' in (D/'python-tests.log').read_text() and (D/'python-tests.log').read_text().rstrip().endswith('OK')
assert 'pass 67' in (D/'node-tests.log').read_text()
assert 'fail 0' in (D/'node-tests.log').read_text()
# A temporary index creates a complete added/modified diff without staging or committing.
changed=subprocess.check_output(['git','diff','--name-only'],cwd=R,text=True).splitlines()
added=subprocess.check_output(['git','ls-files','--others','--exclude-standard'],cwd=R,text=True).splitlines()
publication=[p for p in changed+added if not p.startswith('docs/market-commercial-v4/evidence/') and p!='node_modules' and not p.endswith('.log') and not p.endswith('PUBLICATION_READY.patch') and not p.endswith('CHECKPOINT_MANIFEST.json')]
with tempfile.TemporaryDirectory() as temp:
 env={**os.environ,'GIT_INDEX_FILE':str(Path(temp)/'index')}
 subprocess.run(['git','read-tree',BASE],cwd=R,env=env,check=True)
 subprocess.run(['git','add','--',*publication],cwd=R,env=env,check=True)
 (D/'PUBLICATION_READY.patch').write_bytes(subprocess.check_output(['git','diff','--cached','--binary',BASE],cwd=R,env=env))
(D/'PUBLICATION_MANIFEST.json').write_text(json.dumps({'base':BASE,'publication_files':[{'path':p,'sha256':sha((R/p).read_bytes())} for p in publication],'evidence_sources':'checkpoint only; not deployment assets','commit':None,'push':'NOT_PUSHED'},indent=2)+'\n')
files=[p for p in sorted(R.rglob('*')) if p.is_file() and not p.is_symlink() and not any(x in {'.git','node_modules','__pycache__','.vite'} for x in p.relative_to(R).parts) and not p.name.startswith('.env') and p.suffix not in {'.pyc','.pem','.key','.zip'} and p!=D/'CHECKPOINT_MANIFEST.json']
manifest={'starting_head':BASE,'entries':[{'path':str(p.relative_to(R)),'size':p.stat().st_size,'sha256':sha(p.read_bytes())}for p in files]}
mp=D/'CHECKPOINT_MANIFEST.json';mp.write_text(json.dumps(manifest,indent=2)+'\n');files.append(mp)
archive=DEST/(NAME+'.zip');assert not archive.exists(),'Never overwrite checkpoints'
with zipfile.ZipFile(archive,'w',zipfile.ZIP_DEFLATED,compresslevel=6) as z:
 for p in files:z.write(p,str(p.relative_to(R)))
with zipfile.ZipFile(archive) as z:
 assert z.testzip() is None
 for e in manifest['entries']:assert sha(z.read(e['path']))==e['sha256']
h=hashlib.sha256()
with archive.open('rb') as stream:
 while block:=stream.read(4*1024*1024):h.update(hashlib.sha256(block).digest())
metadata={'name':archive.name,'size':archive.stat().st_size,'sha256':sha(archive.read_bytes()),'dropbox_content_hash':h.hexdigest(),'manifest_files':len(files),'manifest_sha256':sha(mp.read_bytes()),'local_crc_and_per_file_readback':'PASS','remote_readback':'PENDING','starting_head':BASE,'new_commit':None,'push':'NOT_PUSHED','deployment':'NONE','python_tests':269,'node_tests':67,'targeted_qa_checks':450,'targeted_qa_failures':0,'price_candidates':8,'prices_publishable':7,'snapshot_candidates':12}
(DEST/(NAME+'.zip.sha256')).write_text(metadata['sha256']+'  '+archive.name+'\n')
(DEST/(NAME+'.manifest.json')).write_bytes(mp.read_bytes())
(DEST/(NAME+'.metadata.json')).write_text(json.dumps(metadata,indent=2)+'\n')
print(json.dumps(metadata))
