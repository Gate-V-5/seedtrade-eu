import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import {createHash} from 'node:crypto'
import {JSDOM} from 'jsdom'
import {validateVisualAssets,INVENTORY_SHA256} from '../scripts/validate_visual_assets.mjs'

const root=process.cwd(),sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex')
const inventory=JSON.parse(fs.readFileSync('docs/visual-policy/CANONICAL_VISUAL_INVENTORY.json'))
const compatibility=['AppV2-DMDzLkFX.js','MarketCatalogue-oWbuu2vY.js','MarketCategories-uQOA9Nxx.js','ProductionIntelligence-DV4OIR8N.js','TradeCoverage-h5T_2TQB.js','i18n-OGx0jO2p.js','index-Dl5h7D5k.js','trade_pulse_public-BpRoQVLO.js']

test('reviewed CSS inventory and independently pinned checksum pass the complete existing guard',()=>{
  assert.equal(sha('docs/visual-policy/CANONICAL_VISUAL_INVENTORY.json'),INVENTORY_SHA256)
  assert.equal(inventory.protected_mapping_files.find(v=>v.path==='src/marketCatalogue.css').sha256,sha('src/marketCatalogue.css'))
  const result=validateVisualAssets()
  assert.equal(result.groups,4);assert.equal(result.gate_originals,6);assert.equal(result.derivatives,18)
})
test('the existing guard still rejects unreviewed inventory, CSS and image mutations',()=>{
  for(const [target,pattern]of [['docs/visual-policy/CANONICAL_VISUAL_INVENTORY.json',/Unreviewed protected inventory/],['src/marketCatalogue.css',/Protected mapping/],[inventory.groups.EUROPEAN_SEED_MARKET[0].path,/Protected visual/]]){
    assert.throws(()=>validateVisualAssets(root,{readFile:p=>p===target?Buffer.from('UNAPPROVED'):fs.readFileSync(path.join(root,p))}),pattern)
  }
})
test('full CSS cascade retains contain framing and the approved discovery/evidence focus rules',()=>{
  const css=fs.readFileSync('src/marketCatalogue.css','utf8')
  const dom=new JSDOM('<style>'+css+'</style><a class="catalogue-category-tile"><img></a><div class="catalogue-category-head"><img></div>')
  try{for(const img of dom.window.document.querySelectorAll('img'))assert.equal(dom.window.getComputedStyle(img).objectFit,'contain')}
  finally{dom.window.close()}
  assert.match(css,/\.catalogue-production-link:focus-visible/)
  assert.match(css,/\.catalogue-clear-search:focus-visible/)
})
test('all eight required cached chunks are source inputs and survive the ordinary build byte-for-byte',()=>{
  for(const name of compatibility)assert.equal(sha('dist/assets/'+name),sha('public/assets/'+name),name)
  assert.equal(compatibility.length,8)
})
test('normal finalization omits six original PNGs while retaining originals and reviewed derivatives',()=>{
  const registry=JSON.parse(fs.readFileSync('src/data/catalogue_gate_visuals.json'))
  assert.equal(registry.items.length,6)
  for(const item of registry.items){
    assert.equal(sha('public'+item.original),item.original_sha256)
    assert.equal(fs.existsSync('dist'+item.original),false,item.original)
    for(const variant of item.variants)assert.equal(sha('dist'+variant.src),variant.sha256)
  }
})
test('existing install/build lifecycle keeps every validation and finalization command',()=>{
  const scripts=JSON.parse(fs.readFileSync('package.json')).scripts
  assert.equal(scripts.postinstall,'npm run build');assert.equal(scripts.build,'npm run build:vite')
  assert.equal(scripts['build:vite'],'node scripts/validate_editorial_assets.mjs && node scripts/validate_catalogue_photographs.mjs && node scripts/validate_visual_assets.mjs && vite build --manifest && node scripts/prerender_seo.mjs && node scripts/prerender_static_first.mjs && node scripts/validate_news_presentation.mjs && node scripts/validate_catalogue_photographs.mjs --finalize && node scripts/generate_sitemap.mjs && node scripts/validate_visual_assets.mjs --finalize')
  assert.equal(fs.existsSync('dist/.seedtrade-ssr'),false)
})
