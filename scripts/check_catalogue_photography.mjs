import assert from 'node:assert/strict'
import fs from 'node:fs'
import React,{act} from 'react'
import {createRoot} from 'react-dom/client'
import {renderToStaticMarkup} from 'react-dom/server'
import {JSDOM} from 'jsdom'
import {createServer} from 'vite'
import {catalogueImageProps} from '../src/catalogueImages.mjs'
const registry=JSON.parse(fs.readFileSync('src/data/catalogue_gate_visuals.json'))
const categoryPaths=registry.items.map(i=>'/market/'+i.slug)
const aliases=JSON.parse(fs.readFileSync('src/generated/market_catalogue_routes.json')).filter(r=>categoryPaths.includes(r.alias_of)).map(r=>r.path)
const checks=[];const check=(name,fn)=>{fn();checks.push(name)}
check('All six original GATE visuals have exact owner restoration authority',()=>{
 assert.equal(registry.items.length,6)
 for(const item of registry.items){assert.equal(item.kind,'GATE_OWNER_AI_VISUAL');assert.equal(item.owner_approval,'PACKAGE1E3A_20261017');assert.ok(item.original_sha256&&item.rights_evidence);assert.equal(item.documentary_evidence,false);assert.equal(item.classification,'PUBLIC_SAFE')}
})
check('Responsive helper rejects unknown rights and unsafe variant paths',()=>{
 const item=registry.items[0];assert.ok(catalogueImageProps(item.original,registry).srcSet)
 assert.ok(!catalogueImageProps(item.original,{items:[{...item,rights_status:'UNKNOWN'}]}).srcSet)
 assert.ok(!catalogueImageProps(item.original,{items:[{...item,variants:[{src:'https://untrusted.invalid/photo.webp',width:400}]}]}).srcSet)
})
check('Image sizes follow the existing grid and header layout without changing catalogue layout',()=>{
 const css=fs.readFileSync('src/marketCatalogue.css','utf8')
 assert.ok(css.includes('@media(max-width:900px){.catalogue-category-grid,.catalogue-seed-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}'))
 assert.ok(css.includes('@media(max-width:600px){.market-catalogue{padding:26px 16px 36px}'))
 assert.ok(css.includes('grid-template-columns:minmax(0,1fr) 280px'))
 const item=registry.items[0],card=catalogueImageProps(item.original,registry),hero=catalogueImageProps(item.original,registry,{hero:true})
 assert.equal(card.sizes,'(max-width: 600px) calc(100vw - 34px), (max-width: 900px) calc((100vw - 74px) / 2), (max-width: 1200px) calc((100vw - 98px) / 3), 367.34px')
 assert.equal(hero.sizes,'(max-width: 600px) calc(100vw - 32px), 280px')
})
const vite=await createServer({appType:'custom',server:{middlewareMode:true},logLevel:'error'})
try{
 const {default:App}=await vite.ssrLoadModule('/src/AppV2.jsx')
 for(const language of ['EN','DE','FR','ES','IT'])for(const route of ['/market',...categoryPaths,...aliases]){
  globalThis.window={location:{pathname:route,search:''}}
  const d=new JSDOM(renderToStaticMarkup(React.createElement(App,{initialLanguage:language}))),doc=d.window.document
  check(`${language} ${route}: responsive imagery, credits and language`,()=>{
   const images=[...doc.querySelectorAll('.catalogue-category-tile>img,.catalogue-category-head>img')]
   assert.equal(images.length,route==='/market'?6:1)
   for(const img of images){assert.ok(img.src.endsWith('.webp'));assert.equal(img.getAttribute('srcset').split(',').length,3);assert.equal(img.getAttribute('sizes'),catalogueImageProps(registry.items[0].original,registry,{hero:route!=='/market'}).sizes);assert.equal(img.width,1200);assert.equal(img.height,670);assert.ok(img.alt);if(language!=='EN')assert.ok(!img.alt.startsWith('Original GATE AI illustration'));if(route==='/market')assert.equal(img.getAttribute('loading'),'lazy')}
   const credits=doc.querySelector('.catalogue-photo-credits');assert.ok(credits);assert.equal(credits.querySelectorAll('li').length,route==='/market'?6:1)
   if(language!=='EN')assert.notEqual(credits.querySelector('summary').textContent,'Catalogue visual provenance')
   assert.ok(credits.textContent.includes('GATE'));assert.equal(credits.querySelectorAll('a[href*="creativecommons"]').length,0)
  });d.window.close()
 }
 const {CataloguePhoto}=await vite.ssrLoadModule('/src/CataloguePhotography.jsx');const {LanguageProvider}=await vite.ssrLoadModule('/src/i18n/index.jsx')
 const d=new JSDOM('<div id="root"></div>',{pretendToBeVisual:true,url:'https://seedtrade.test/market'});globalThis.window=d.window;globalThis.document=d.window.document;globalThis.IS_REACT_ACT_ENVIRONMENT=true
 const category={image:registry.items[0].original,title:'Cereals & Pulses'},root=createRoot(document.getElementById('root'))
 await act(async()=>root.render(React.createElement(LanguageProvider,null,React.createElement(CataloguePhoto,{category}))))
 await act(async()=>document.querySelector('img').dispatchEvent(new d.window.Event('error')))
 check('Image load failure keeps a neutral frame without original/unrelated substitution',()=>{assert.equal(document.querySelectorAll('img').length,0);assert.ok(document.querySelector('.catalogue-photo-placeholder[role="img"]'))})
 await act(async()=>root.unmount());d.window.close();delete globalThis.IS_REACT_ACT_ENVIRONMENT
}finally{await vite.close()}
check('All variant sets meet six-image payload budget',()=>{
 for(const width of [400,800,1200])assert.ok(registry.items.reduce((sum,item)=>sum+item.variants.find(v=>v.width===width).bytes,0)<=1000000)
})
console.log(JSON.stringify({status:'PASS',passed:checks.length,checks,browser_layout:'UNVERIFIED',real_device:'UNVERIFIED'},null,2))
