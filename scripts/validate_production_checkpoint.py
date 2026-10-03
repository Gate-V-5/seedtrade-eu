"""Validate a recovery ZIP without extracting or modifying it."""
import hashlib,json,pathlib,sys,zipfile
p=pathlib.Path(sys.argv[1]);expected=pathlib.Path(str(p)+'.sha256').read_text().split()[0]
assert hashlib.sha256(p.read_bytes()).hexdigest()==expected
with zipfile.ZipFile(p) as z:
 assert z.testzip() is None
 manifest=json.loads(z.read('MANIFEST.json'))
 assert set(z.namelist())==set(f['path'] for f in manifest['files'])|{'MANIFEST.json'}
 for f in manifest['files']:
  b=z.read(f['path']);assert len(b)==f['bytes'];assert hashlib.sha256(b).hexdigest()==f['sha256']
 d=json.loads(z.read('repository/src/generated/production_public.json'))
 assert len(d['observations'])==1669
 assert hashlib.sha256(z.read('dependencies/SeedTrade-eu-seed-production-V05-20261003.zip')).hexdigest()=='12a5c499789336c69c280d6117b8ca6e73ed36d3111a8c2789957f3ce0a65b79'
 assert 'repository/dist/production-intelligence/index.html' in z.namelist()
 print(json.dumps({'checkpoint_validation':'PASS','files_hashed':len(manifest['files']),'crc':'PASS','sha256':expected,'records':1669}))
