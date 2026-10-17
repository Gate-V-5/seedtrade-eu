"""Reproduce only the reviewed full-frame GATE derivatives;never generate artwork."""
from pathlib import Path
import json,hashlib,io
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
registry=json.loads((ROOT/'src/data/catalogue_gate_visuals.json').read_text())
settings=json.loads((ROOT/'docs/visual-policy/GATE_ENCODING.json').read_text())['encodings']
for item in registry['items']:
    source=ROOT/'public'/item['original'].lstrip('/')
    assert hashlib.sha256(source.read_bytes()).hexdigest()==item['original_sha256']
    image=Image.open(source).convert('RGB')
    for variant in item['variants']:
        config=next(x for x in settings if x['slug']==item['slug'] and x['width']==variant['width'])
        assert variant['height']==round(image.height*variant['width']/image.width)
        resized=image.resize((variant['width'],variant['height']),Image.Resampling.LANCZOS)
        output=io.BytesIO();resized.save(output,format='WEBP',quality=config['quality'],method=6)
        data=output.getvalue();assert hashlib.sha256(data).hexdigest()==variant['sha256'],'Unreviewed encoding change'
        target=ROOT/'public'/variant['src'].lstrip('/');target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(data)
print('PASS:18 reviewed full-frame derivatives reproduced;originals,registry and approval records unchanged')
