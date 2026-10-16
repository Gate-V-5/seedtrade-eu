"""Reproducible, licensed category-photo optimization. No original replacement."""
from pathlib import Path
import hashlib,json
from PIL import Image,ImageOps
ROOT=Path(__file__).resolve().parents[1]
records=json.loads((ROOT/'docs/catalogue-photography/SOURCE_LICENSES.json').read_text())
alt={'cereals-pulses':'Wheat ears in a field; illustrative cereal photograph','fodder-amenity':'Grassland near the Trubizh River; illustrative grass photograph','catch-crops':'Flowering phacelia field in Ehrenbach; illustrative cover crop photograph','oil-fibre':'Flowering rapeseed field in Ehrenbach; illustrative oilseed photograph','maize-sorghum':'Rows of young maize at Simselwitz; illustrative maize photograph','vegetables':'Rows of young white cabbage in Schülp; illustrative vegetable photograph'}
items=[]
for obsolete in (ROOT/"public/catalogue-v3/responsive").glob("*.webp"): obsolete.unlink()
for r in records:
 assert r['license'] in ('CC0 1.0','CC BY-SA 3.0')
 p=ROOT/'assets/catalogue-photographs-originals'/f"{r['slug']}.jpg";assert hashlib.sha256(p.read_bytes()).hexdigest()==r['sha256']
 im=ImageOps.exif_transpose(Image.open(p)).convert('RGB');variants=[]
 for width in (400,800,1200):
  framed=ImageOps.fit(im,(width,width*9//16),method=Image.Resampling.LANCZOS,centering=(.5,.5))
  target=ROOT/'public/catalogue-v3/responsive';target.mkdir(parents=True,exist_ok=True)
  import io
  out=io.BytesIO();framed.save(out,format='WEBP',quality=80 if width<1200 else 76,method=6);b=out.getvalue();sha=hashlib.sha256(b).hexdigest();name=f"{r['slug']}-{width}.{sha[:12]}.webp";(target/name).write_bytes(b)
  variants.append({'src':'/catalogue-v3/responsive/'+name,'width':width,'height':width*9//16,'bytes':len(b),'sha256':sha})
 items.append({'original':'/catalogue-v3/'+r['slug']+'.png','slug':r['slug'],'rights_status':'VERIFIED','visual_review':'PENDING','rights_evidence':r['source_page'],'file_title':r['file_title'],'source_page':r['source_page'],'original_download_url':r['download_url'],'author':r['author'],'license':r['license'],'license_url':r['license_url'],'attribution_required':r['attribution_required'],'verified_date':r['verified_date'],'alt':alt[r['slug']],'classification':'PUBLIC_SAFE','documentary_evidence':False,'changes':'Cropped to 16:9, resized and converted to WebP','variants':variants})
(ROOT/'src/data/catalogue_photographs.json').write_text(json.dumps({'schema':'CATALOGUE_PHOTOGRAPHS_V1','items':items},indent=2,ensure_ascii=False)+'\n')
print(json.dumps({str(w):sum(v['bytes'] for i in items for v in i['variants'] if v['width']==w)for w in [400,800,1200]},indent=2))
