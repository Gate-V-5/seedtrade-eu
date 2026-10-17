import fs from 'node:fs'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {createHash} from 'node:crypto'
import assert from 'node:assert/strict'
import {catalogueImageProps} from '../src/catalogueImages.mjs'
const project=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..')
// Updating this reviewed pin is a deliberate source review,not a runtime override.
export const INVENTORY_SHA256='deacee4f2f4486e50faa658b6ab995ea0b6cd0b2c48daa508265a18909505811'
const digest=b=>createHash('sha256').update(b).digest('hex')
function webpSize(b){
 assert.equal(b.toString('ascii',0,4),'RIFF');assert.equal(b.toString('ascii',8,12),'WEBP')
 for(let i=12;i+8<=b.length;){const type=b.toString('ascii',i,i+4),n=b.readUInt32LE(i+4),start=i+8;assert.ok(start+n<=b.length)
  if(type==='VP8 ')return [b.readUInt16LE(start+6)&0x3fff,b.readUInt16LE(start+8)&0x3fff]
  if(type==='VP8X')return [b.readUIntLE(start+4,3)+1,b.readUIntLE(start+7,3)+1]
  i=start+n+(n%2)
 }
 throw new Error('Unsupported derivative dimensions')
}
export function validateVisualAssets(root=project,{readFile=p=>fs.readFileSync(path.join(root,p))}={}){
 const cache=new Map(),read=p=>{if(!cache.has(p))cache.set(p,readFile(p));return cache.get(p)},hash=p=>digest(read(p))
 const inventoryBytes=read('docs/visual-policy/CANONICAL_VISUAL_INVENTORY.json');assert.equal(digest(inventoryBytes),INVENTORY_SHA256,'Unreviewed protected inventory change')
 const inv=JSON.parse(inventoryBytes);assert.deepEqual(Object.keys(inv.groups),['TOP_NEWS','EVIDENCE_FOR_COMMERCIAL_SEED_DECISIONS','RESEARCH_PARTNER_INSIGHTS_EVENTS','EUROPEAN_SEED_MARKET'])
 for(const f of inv.protected_mapping_files)assert.equal(hash(f.path),f.sha256,'Protected mapping/renderer/policy changed: '+f.path)
 for(const group of Object.values(inv.groups))for(const item of group){assert.equal(hash(item.path),item.sha256,'Protected visual changed: '+item.path);if(item.source_original)assert.equal(hash(item.source_original.path),item.source_original.sha256);for(const v of item.derivatives||[])assert.equal(hash(v.path),v.sha256)}
 assert.equal(inv.groups.EVIDENCE_FOR_COMMERCIAL_SEED_DECISIONS.length,3);assert.equal(inv.groups.RESEARCH_PARTNER_INSIGHTS_EVENTS.length,3)
 const registry=JSON.parse(read('src/data/catalogue_gate_visuals.json')),history=JSON.parse(read('docs/visual-policy/HISTORICAL_GATE_SOURCES.json')).items,categories=JSON.parse(read('src/generated/market_catalogue_public.json')).categories,review=JSON.parse(read('docs/visual-policy/GATE_VISUAL_REVIEW.json'))
 assert.equal(registry.items.length,6);assert.equal(new Set(registry.items.map(i=>i.slug)).size,6)
 for(const c of categories){const item=registry.items.find(i=>i.original===c.image),source=history.find(i=>i.category===c.slug);assert.ok(item&&source);assert.equal(item.slug,c.slug);assert.equal(item.category_title,c.title);assert.equal(item.original_sha256,source.sha256);assert.equal(hash('public'+item.original),source.sha256)
  assert.equal(item.kind,'GATE_OWNER_AI_VISUAL');assert.equal(item.owner_approval,'PACKAGE1E3A_20261017');assert.equal(item.rights_scope,'OWNER_AUTHORIZED_SITE_USE_ONLY');assert.equal(item.license,'OWNER_AUTHORIZED_NOT_A_PUBLIC_LICENSE');assert.equal(item.classification,'PUBLIC_SAFE');assert.equal(item.documentary_evidence,false);assert.equal(item.visual_review,'PASS');assert.ok(catalogueImageProps(item.original,registry).srcSet)
  assert.deepEqual(review.items.find(v=>v.slug===item.slug).variant_sha256,item.variants.map(v=>v.sha256));assert.deepEqual(item.variants.map(v=>v.width),[400,800,1200])
  for(const v of item.variants){const b=read('public'+v.src);assert.equal(digest(b),v.sha256);assert.ok(v.src.includes(v.sha256.slice(0,12)));assert.equal(b.length,v.bytes);assert.equal(v.height,Math.round(item.original_height*v.width/item.original_width));assert.deepEqual(webpSize(b),[v.width,v.height])}
 }
 for(const w of [400,800,1200])assert.ok(registry.items.reduce((sum,i)=>sum+i.variants.find(v=>v.width===w).bytes,0)<1000000,'Six-visual budget '+w)
 const css=read('src/marketCatalogue.css').toString();assert.ok(css.includes('.catalogue-category-tile>img{display:block;width:100%;height:auto;aspect-ratio:16/9;object-fit:contain}'));assert.ok(css.includes('.catalogue-category-head img{width:100%;height:auto;aspect-ratio:16/9;object-fit:contain;'))
 const app=read('src/AppV2.jsx').toString();for(const name of ['market','weather','production'])assert.equal(app.split('<FixedEvidenceImage name="'+name+'"/>').length-1,1,'Evidence placement contract')
 return {status:'PASS',groups:4,gate_originals:6,derivatives:18,six_image_bytes:Object.fromEntries([400,800,1200].map(w=>[w,registry.items.reduce((n,i)=>n+i.variants.find(v=>v.width===w).bytes,0)])),composition:'FULL_FRAME_CONTAIN',protected_files:cache.size}
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 console.log(JSON.stringify(validateVisualAssets()))
 if(process.argv.includes('--finalize')){const registry=JSON.parse(fs.readFileSync(path.join(project,'src/data/catalogue_gate_visuals.json')));function visit(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){const f=path.join(dir,e.name);if(e.isDirectory())visit(f);else if(e.name==='index.html'){const html=fs.readFileSync(f,'utf8');for(const i of registry.items)assert.ok(!html.includes('src="'+i.original+'"'),'High-resolution fallback rendered')}}}visit(path.join(project,'dist'))}
}
