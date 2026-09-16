"""Portable inventory and complete recovery ZIP; standard-library only."""
import argparse,hashlib,json,os,zipfile
from pathlib import Path

EXCLUDE_DIRS={'.git','node_modules','dist','__pycache__','.venv','venv'}
MANIFESTS={'FILE_INVENTORY.json','SHA256SUMS.txt'}

def sha256(path):
    h=hashlib.sha256()
    with Path(path).open('rb') as f:
        for block in iter(lambda:f.read(1024*1024),b''): h.update(block)
    return h.hexdigest()

def payload(root):
    for parent,dirs,files in os.walk(root):
        dirs[:]=sorted(d for d in dirs if d not in EXCLUDE_DIRS)
        for name in sorted(files):
            p=Path(parent)/name
            rel=p.relative_to(root).as_posix()
            if p.is_symlink(): raise ValueError('Symlink rejected: '+rel)
            if name=='.env' or name.startswith('.env.') and name!='.env.example':
                raise ValueError('Credentials file rejected: '+rel)
            if rel not in MANIFESTS: yield rel,p

def inventory(root):
    original=root/'docs/recovery/RECOVERED_BASELINE.json'
    old={r['path']:r['sha256'] for r in json.loads(original.read_text(encoding='utf-8'))['files']} if original.exists() else {}
    rows=[]
    for rel,p in payload(root):
        digest=sha256(p)
        rows.append(dict(path=rel,bytes=p.stat().st_size,sha256=digest,status='RECOVERED' if old.get(rel)==digest else 'REBUILT'))
    result=dict(schema_version=1,hash_algorithm='SHA256',excluded_directories=sorted(EXCLUDE_DIRS),excluded_self_referential_manifests=sorted(MANIFESTS),files=rows)
    (root/'FILE_INVENTORY.json').write_text(json.dumps(result,indent=2)+'\n',encoding='utf-8')
    sums=[r['sha256']+'  '+r['path'] for r in rows]
    sums.append(sha256(root/'FILE_INVENTORY.json')+'  FILE_INVENTORY.json')
    (root/'SHA256SUMS.txt').write_text('\n'.join(sums)+'\n',encoding='utf-8')
    return result

def verify(root):
    rows=json.loads((root/'FILE_INVENTORY.json').read_text(encoding='utf-8'))['files']
    expected={r['path'] for r in rows}
    actual={rel for rel,p in payload(root)}
    if actual!=expected: raise ValueError('File set mismatch')
    for r in rows:
        p=root/r['path']
        if p.stat().st_size!=r['bytes'] or sha256(p)!=r['sha256']: raise ValueError('Hash mismatch: '+r['path'])
    sums=(root/'SHA256SUMS.txt').read_text(encoding='utf-8').splitlines()
    expected_sums=[r['sha256']+'  '+r['path'] for r in rows]+[sha256(root/'FILE_INVENTORY.json')+'  FILE_INVENTORY.json']
    if sums!=expected_sums: raise ValueError('Checksum manifest mismatch')
    return len(rows)

def snapshot(root,destination):
    destination=destination.resolve()
    if destination.is_relative_to(root.resolve()): raise ValueError('Archive must be outside project')
    verify(root)
    destination.parent.mkdir(parents=True,exist_ok=True)
    with zipfile.ZipFile(destination,'x',zipfile.ZIP_DEFLATED,compresslevel=3,allowZip64=True) as z:
        for rel,p in payload(root): z.write(p,rel)
        for rel in sorted(MANIFESTS): z.write(root/rel,rel)
    verify_zip(destination)
    digest=sha256(destination)
    destination.with_suffix(destination.suffix+'.sha256').write_text(digest+'  '+destination.name+'\n',encoding='utf-8')
    return digest

def verify_zip(path):
    with zipfile.ZipFile(path) as z:
        names=z.namelist()
        if len(set(names))!=len(names): raise ValueError('Duplicate archive member')
        for name in names:
            if name.startswith(('/','\\')) or ':' in name or '..' in Path(name).parts or '\\' in name:
                raise ValueError('Unsafe archive member')
        manifest=z.read('FILE_INVENTORY.json')
        rows=json.loads(manifest)['files']
        if set(names)!={r['path'] for r in rows}|MANIFESTS: raise ValueError('Archive file set mismatch')
        for r in rows:
            h=hashlib.sha256(); size=0
            with z.open(r['path']) as f:
                for b in iter(lambda:f.read(1024*1024),b''):h.update(b);size+=len(b)
            if h.hexdigest()!=r['sha256'] or size!=r['bytes']:raise ValueError('Archive hash mismatch: '+r['path'])
        sums=[r['sha256']+'  '+r['path'] for r in rows]+[hashlib.sha256(manifest).hexdigest()+'  FILE_INVENTORY.json']
        if z.read('SHA256SUMS.txt').decode().splitlines()!=sums:raise ValueError('Archive checksum manifest mismatch')
    return len(rows)

if __name__=='__main__':
    ap=argparse.ArgumentParser();ap.add_argument('action',choices=['inventory','verify','snapshot','verify-zip']);ap.add_argument('--root',type=Path,default=Path(__file__).resolve().parents[1]);ap.add_argument('--zip',type=Path)
    a=ap.parse_args()
    if a.action=='inventory': print('Inventoried',len(inventory(a.root)['files']))
    elif a.action=='verify':print('Verified',verify(a.root))
    elif a.action=='snapshot':print('ZIP SHA256',snapshot(a.root,a.zip))
    else:print('ZIP verified',verify_zip(a.zip))
