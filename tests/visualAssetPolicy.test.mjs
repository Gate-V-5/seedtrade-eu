import {test} from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import {execFileSync} from 'node:child_process'
import {validateVisualAssets} from '../scripts/validate_visual_assets.mjs'
const root=process.cwd(),inv=JSON.parse(fs.readFileSync('docs/visual-policy/CANONICAL_VISUAL_INVENTORY.json'))
test('four independent rights groups,exact originals and eighteen full-frame derivatives',()=>{const result=validateVisualAssets();assert.equal(result.groups,4);assert.equal(result.gate_originals,6);assert.equal(result.derivatives,18);for(const bytes of Object.values(result.six_image_bytes))assert.ok(bytes<1000000)})
for(const name of Object.keys(inv.groups))test('unauthorized image bytes rejected: '+name,()=>{const target=inv.groups[name][0].path;assert.throws(()=>validateVisualAssets(root,{readFile:p=>p===target?Buffer.from('UNAUTHORIZED'):fs.readFileSync(path.join(root,p))}),/Protected visual|Protected mapping/)})
for(const file of ['src/data/fixed_editorial_visuals.json','src/data/news_visuals.json','src/data/catalogue_gate_visuals.json','docs/visual-policy/HISTORICAL_GATE_SOURCES.json'])test('unauthorized protected mapping rejected: '+file,()=>assert.throws(()=>validateVisualAssets(root,{readFile:p=>p===file?Buffer.from('{}'):fs.readFileSync(path.join(root,p))}),/Protected mapping/))
test('unreviewed inventory edit rejected independently',()=>assert.throws(()=>validateVisualAssets(root,{readFile:p=>p==='docs/visual-policy/CANONICAL_VISUAL_INVENTORY.json'?Buffer.from('{}'):fs.readFileSync(path.join(root,p))}),/Unreviewed protected inventory/))
test('wrong category assignment rejected',()=>{const name='src/generated/market_catalogue_public.json',data=JSON.parse(fs.readFileSync(name));data.categories[0].image=data.categories[1].image;assert.throws(()=>validateVisualAssets(root,{readFile:p=>p===name?Buffer.from(JSON.stringify(data)):fs.readFileSync(path.join(root,p))}))})
test('Evidence placement replacement rejected without changing image bytes',()=>{const name='src/AppV2.jsx',data=fs.readFileSync(name,'utf8').replace('<FixedEvidenceImage name="market"/>','<FixedEvidenceImage name="weather"/>');assert.throws(()=>validateVisualAssets(root,{readFile:p=>p===name?Buffer.from(data):fs.readFileSync(path.join(root,p))}),/Evidence placement/)})
test('five-language actual catalogue and protected homepage group placements',()=>{execFileSync(process.execPath,['scripts/check_visual_policy.mjs'],{stdio:'pipe',timeout:120000})})

// Exercise the complete stylesheet cascade, not merely an earlier matching declaration.
test('final catalogue CSS cascade preserves full-frame card and header composition',async()=>{const {JSDOM}=await import('jsdom');const css=fs.readFileSync('src/marketCatalogue.css','utf8');const dom=new JSDOM('<style>'+css+'</style><a class="catalogue-category-tile"><img></a><div class="catalogue-category-head"><img></div>');try{for(const img of dom.window.document.querySelectorAll('img'))assert.equal(dom.window.getComputedStyle(img).objectFit,'contain')}finally{dom.window.close()}})
