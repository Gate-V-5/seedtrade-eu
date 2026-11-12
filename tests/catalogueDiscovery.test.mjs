import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import {pathToFileURL} from 'node:url'
import React,{act} from 'react'
import {renderToString} from 'react-dom/server'
import {JSDOM} from 'jsdom'
import {build} from 'vite'

const root=process.cwd(),output=path.join(root,'tmp/catalogue-discovery-checks')
fs.mkdirSync(output,{recursive:true})
await build({root,logLevel:'error',build:{ssr:path.join(root,'tests/fixtures/catalogueDiscoveryEntry.jsx'),outDir:output,
 emptyOutDir:false,copyPublicDir:false,rollupOptions:{external:['react','react/jsx-runtime','react/jsx-dev-runtime'],output:{entryFileNames:'catalogue.mjs'}}}})
const {MarketCatalogue,LanguageProvider,useLanguage,translate,filterCatalogueCards,catalogueQueryFrom,catalogueSearchLocation,catalogueRouteMeta}=await import(pathToFileURL(path.join(output,'catalogue.mjs')).href)
const data=JSON.parse(fs.readFileSync('src/generated/market_catalogue_public.json','utf8'))
const page=(route,language='EN')=>React.createElement(LanguageProvider,{initialLanguage:language},React.createElement(MarketCatalogue,{path:route}))
const categories=['/market/cereals-pulses','/market/fodder-amenity','/market/catch-crops','/market/oil-fibre','/market/maize-sorghum','/market/vegetables']

test('search supports mixed common/botanical terms, translated names and accent-insensitive matching without modifying records',()=>{
 const before=JSON.stringify(data.cards)
 assert.deepEqual(filterCatalogueCards(data.cards,'RED Trifolium').map(v=>v.market_entity_id),['red-clover'])
 assert.deepEqual(filterCatalogueCards(data.cards,translate('DE','Red clover'),'DE').map(v=>v.market_entity_id),['red-clover'])
 assert.equal(filterCatalogueCards([{common_name_en:'Café seed',botanical_display_name:'Testus species'}],'cafe SPECIES').length,1)
 assert.equal(filterCatalogueCards(data.cards,'NO_SUCH_SEED').length,0)
 assert.equal(filterCatalogueCards(data.cards,'   ').length,68)
 assert.equal(JSON.stringify(data.cards),before)
})
test('query URLs preserve path, other parameters and fragment while encoding input and bounding length',()=>{
 assert.equal(catalogueQueryFrom('?q=red+clover'),'red clover')
 assert.equal(catalogueQueryFrom('?q='+('a'.repeat(200))).length,120)
 assert.equal(catalogueSearchLocation({pathname:'/market/fodder-amenity',search:'?lang=DE&q=old',hash:'#seeds'},'red & clover'),'/market/fodder-amenity?lang=DE&q=red+%26+clover#seeds')
 assert.equal(catalogueSearchLocation({pathname:'/market',search:'?q=old&lang=DE',hash:'#seeds'},'   '),'/market?lang=DE#seeds')
})
test('default static catalogue retains six-category order, KPI content and canonical metadata in all five languages',()=>{
 const meta=catalogueRouteMeta('/market')
 for(const language of ['EN','DE','FR','ES','IT']){
  const document=new JSDOM(renderToString(page('/market',language))).window.document
  assert.deepEqual([...document.querySelectorAll('.catalogue-category-tile')].map(v=>v.getAttribute('href')),categories)
  assert.match(document.querySelector('.catalogue-global-kpis').textContent,/121/)
  assert.equal(document.querySelectorAll('.catalogue-seed-card').length,0)
  assert.equal(document.querySelector('#catalogue-search').getAttribute('aria-controls'),'catalogue-search-results')
  assert.equal(document.querySelector('main h1').textContent,translate(language,'European Seed Market'))
  assert.equal(document.querySelector('#catalogue-search-title').textContent,translate(language,'Search all seed types'))
 }
 assert.deepEqual(catalogueRouteMeta('/market'),meta)
 assert.equal(meta.index,true)
})

async function browser(url,route,work){
 const dom=new JSDOM('<div id="app">'+renderToString(page(route))+'</div>',{url})
 const previous={window:globalThis.window,document:globalThis.document,fetch:globalThis.fetch,IS_REACT_ACT_ENVIRONMENT:globalThis.IS_REACT_ACT_ENVIRONMENT}
 globalThis.window=dom.window;globalThis.document=dom.window.document;globalThis.IS_REACT_ACT_ENVIRONMENT=true
 let requests=0;globalThis.fetch=async()=>{requests++;throw Error('No external requests allowed in catalogue discovery')}
 const {hydrateRoot}=await import('react-dom/client')
 const errors=[];let app
 try{
  await act(async()=>{app=hydrateRoot(document.getElementById('app'),page(route),{onRecoverableError:error=>errors.push(error.message)})})
  await act(async()=>{await new Promise(resolve=>setTimeout(resolve,10))})
  await work(dom,app)
  assert.deepEqual(errors,[],'Static and first-client markup must hydrate without repair')
  assert.equal(requests,0)
 }finally{
  if(app)await act(async()=>app.unmount())
  dom.window.close();Object.assign(globalThis,previous)
 }
}
test('a shared market URL hydrates then finds a seed across categories with its canonical detail link',async()=>{
 await browser('https://seedtrade.eu/market?q=Trifolium+pratense','/market',async()=>{
  assert.equal(document.querySelector('#catalogue-search').value,'Trifolium pratense')
  assert.equal(document.querySelectorAll('.catalogue-seed-card').length,1)
  assert.equal(document.querySelector('.catalogue-seed-card').dataset.entityId,'red-clover')
  assert.equal(document.querySelector('.catalogue-card-cta').getAttribute('href'),'/market/seeds/red-clover')
  assert.equal(document.querySelectorAll('.catalogue-category-tile').length,6)
  assert.match(document.querySelector('[role=status]').textContent,/1 seed types/)
 })
})
test('clearing search preserves unrelated navigation state and returns to category browsing',async()=>{
 await browser('https://seedtrade.eu/market?q=red+clover&lang=DE#seeds','/market',async()=>{
  const state={retained:'existing-navigation-state'};window.history.replaceState(state,'')
  const length=window.history.length
  await act(async()=>document.querySelector('.catalogue-clear-search').click())
  assert.equal(document.querySelector('#catalogue-search').value,'')
  assert.equal(window.location.search,'?lang=DE');assert.equal(window.location.hash,'#seeds')
  assert.deepEqual(window.history.state,state);assert.equal(window.history.length,length)
  assert.equal(document.querySelectorAll('.catalogue-seed-card').length,0)
  assert.equal(document.querySelectorAll('.catalogue-category-tile').length,6)
  assert.equal(document.activeElement,document.querySelector('#catalogue-search'))
 })
})
test('typing filters live and updates one shareable history entry without sending requests',async()=>{
 await browser('https://seedtrade.eu/market?lang=EN','/market',async()=>{
  const input=document.querySelector('#catalogue-search'),length=window.history.length
  const setValue=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set
  await act(async()=>{setValue.call(input,'red clover');input.dispatchEvent(new window.Event('input',{bubbles:true}))})
  assert.equal(document.querySelectorAll('.catalogue-seed-card').length,1)
  assert.equal(new URLSearchParams(window.location.search).get('q'),'red clover')
  assert.equal(new URLSearchParams(window.location.search).get('lang'),'EN')
  assert.equal(window.history.length,length)
 })
})
test('category deep links and back/forward restore searches, including zero results',async()=>{
 const category=data.categories.find(v=>v.slug==='fodder-amenity')
 await browser('https://seedtrade.eu/market/fodder-amenity?q=red+clover','/market/fodder-amenity',async()=>{
  assert.equal(document.querySelectorAll('.catalogue-seed-card').length,1)
  await act(async()=>{window.history.pushState({},'','?q=NO_SUCH_SEED');window.dispatchEvent(new window.PopStateEvent('popstate'))})
  assert.equal(document.querySelectorAll('.catalogue-seed-card').length,0)
  assert.match(document.querySelector('.catalogue-empty').textContent,/No seed types match/)
  await act(async()=>{window.history.replaceState({},'','?q=Trifolium+pratense');window.dispatchEvent(new window.PopStateEvent('popstate'))})
  assert.equal(document.querySelectorAll('.catalogue-seed-card').length,1)
  await act(async()=>document.querySelector('.catalogue-clear-search').click())
  assert.equal(document.querySelectorAll('.catalogue-seed-card').length,category.entity_count)
 })
})
test('language changes recompute translated-name matches while retaining the query',async()=>{
 function Choice(){const {setLanguage}=useLanguage();return React.createElement('button',{id:'test-language',onClick:()=>setLanguage('DE')},'DE')}
 await browser('https://seedtrade.eu/market?q=Rotklee','/market',async(_dom,app)=>{
  assert.equal(document.querySelectorAll('.catalogue-seed-card').length,0)
  await act(async()=>app.render(React.createElement(LanguageProvider,null,React.createElement(React.Fragment,null,React.createElement(Choice),React.createElement(MarketCatalogue,{path:'/market'})))))
  await act(async()=>{await new Promise(resolve=>setTimeout(resolve,10))})
  await act(async()=>document.getElementById('test-language').click())
  assert.equal(document.querySelector('#catalogue-search').value,'Rotklee')
  assert.equal(document.querySelector('.catalogue-seed-card').dataset.entityId,'red-clover')
  assert.equal(document.querySelector('.catalogue-seed-heading h3').textContent,'Rotklee')
 })
})
