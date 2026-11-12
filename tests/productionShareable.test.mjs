import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import {pathToFileURL} from 'node:url'
import React,{act} from 'react'
import {renderToString} from 'react-dom/server'
import {JSDOM} from 'jsdom'
import {build} from 'vite'
import data from '../src/productionCoverageData.mjs'
import {productionViewDefaults,validateProductionView,productionViewFromSearch,productionViewLocation,selectEvidence} from '../src/productionEvidence.mjs'

const root=process.cwd(),output=path.join(root,'tmp/production-shareable-checks')
fs.mkdirSync(output,{recursive:true})
await build({root,logLevel:'error',build:{ssr:path.join(root,'tests/fixtures/productionShareEntry.jsx'),outDir:output,
 emptyOutDir:false,copyPublicDir:false,rollupOptions:{external:['react','react/jsx-runtime','react/jsx-dev-runtime'],output:{entryFileNames:'production.mjs'}}}})
const {ProductionIntelligence,LanguageProvider,translate}=await import(pathToFileURL(path.join(output,'production.mjs')).href)
const page=(language='EN')=>React.createElement(React.StrictMode,null,React.createElement(LanguageProvider,{initialLanguage:language},React.createElement(ProductionIntelligence)))
const searchOf=location=>location.slice(location.indexOf('?'))
const shared='?entity=browntop&country=AT&metric=CERTIFIED_SEED_AREA&year=2025'

test('missing parameters preserve existing defaults and round-trip the displayed source grain',()=>{
 const result=productionViewFromSearch(data,'')
 assert.deepEqual(result,{view:{...productionViewDefaults},adjusted:false})
 const restored=productionViewFromSearch(data,searchOf(productionViewLocation(data,result.view)))
 for(const key of ['entity','country','metric','year','history'])assert.equal(restored.view[key],result.view[key])
 assert.equal(restored.view.scope,selectEvidence(data,result.view)[0].id)
 assert.equal(restored.adjusted,false)
})
test('all-country and valid selected years survive shared-link restoration without changing datasets',()=>{
 const before=JSON.stringify(data)
 const view=productionViewFromSearch(data,'?entity=browntop&country=&metric=CERTIFIED_SEED_AREA&year=2025').view
 assert.equal(view.country,'');assert.equal(view.year,'2025')
 const restored=productionViewFromSearch(data,searchOf(productionViewLocation(data,view)))
 assert.equal(restored.view.country,'');assert.equal(restored.view.year,'2025')
 assert.equal(JSON.stringify(data),before)
})
test('invalid, duplicate, unrelated and outdated parameters fall back without being echoed into share links',()=>{
 const result=productionViewFromSearch(data,'?entity=not-a-crop&country=../../private&metric=secret&year=1900&history=100&scope=internal/config&token=NEVER_SHARE')
 assert.equal(result.adjusted,true)
 assert.deepEqual(result.view,{...productionViewDefaults,country:''})
 const location=productionViewLocation(data,result.view)
 assert.doesNotMatch(location,/private|secret|1900|internal|token|NEVER_SHARE/)
 assert.equal(productionViewFromSearch(data,'?entity=browntop&entity=alfalfa').adjusted,true)
 const oldYear=productionViewFromSearch(data,'?entity=browntop&country=AT&metric=CERTIFIED_SEED_AREA&year=2024')
 assert.equal(oldYear.view.year,'');assert.equal(oldYear.adjusted,true)
 assert.equal(productionViewFromSearch(data,'?country=at').view.country,'AT')
})
test('valid filters with no compatible observations remain explicit empty views, not invented evidence',()=>{
 const view=validateProductionView(data,{...productionViewDefaults,entity:'browntop',country:'CZ',metric:'CERTIFIED_QUANTITY'}).view
 assert.equal(view.entity,'browntop');assert.equal(view.country,'CZ');assert.equal(view.metric,'CERTIFIED_QUANTITY')
 assert.equal(selectEvidence(data,view).length,0)
})
test('only compatible public scope IDs and supported history lengths are restored',()=>{
 const base=productionViewFromSearch(data,shared).view,groups=selectEvidence(data,base)
 assert.ok(groups.length)
 const selected={...base,scope:groups.at(-1).id}
 assert.equal(productionViewFromSearch(data,searchOf(productionViewLocation(data,selected))).view.scope,selected.scope)
 const other=data.series.find(s=>s.entity!==base.entity).id
 assert.equal(validateProductionView(data,{...base,scope:other}).view.scope,'')
 assert.equal(productionViewFromSearch(data,'?history=2').view.history,'2')
 assert.equal(productionViewFromSearch(data,'?history=1').view.history,'0')
})
test('static initial rendering preserves existing defaults, source citations and five-language labels',()=>{
 for(const language of ['EN','DE','FR','ES','IT']){
  const document=new JSDOM(renderToString(page(language))).window.document
  assert.equal(document.querySelector('[name=entity]').value,'alfalfa')
  assert.equal(document.querySelector('[name=country]').value,'CZ')
  assert.equal(document.querySelector('[name=metric]').value,'SEED_PRODUCTION_AREA')
  assert.equal(document.querySelector('h1').textContent,translate(language,'Seed Production Intelligence'))
  assert.equal(document.querySelector('a[href^="/production-intelligence?"]').textContent,translate(language,'Share this evidence view'))
  assert.ok(document.querySelector('.production-table a[href^="https://"]'))
 }
})

async function browser(search,work){
 const dom=new JSDOM('<div id="app">'+renderToString(page())+'</div>',{url:'https://seedtrade.eu/production-intelligence'+search})
 const previous={window:globalThis.window,document:globalThis.document,fetch:globalThis.fetch,IS_REACT_ACT_ENVIRONMENT:globalThis.IS_REACT_ACT_ENVIRONMENT}
 globalThis.window=dom.window;globalThis.document=dom.window.document;globalThis.IS_REACT_ACT_ENVIRONMENT=true
 let requests=0;globalThis.fetch=async()=>{requests++;throw Error('No external request allowed')}
 const {hydrateRoot}=await import('react-dom/client');let app;const errors=[]
 try{
  await act(async()=>{app=hydrateRoot(document.getElementById('app'),page(),{onRecoverableError:e=>errors.push(e.message)})})
  await act(async()=>{await new Promise(resolve=>setTimeout(resolve,10))})
  await work(dom)
  assert.deepEqual(errors,[]);assert.equal(requests,0)
 }finally{if(app)await act(async()=>app.unmount());dom.window.close();Object.assign(globalThis,previous)}
}
test('opening a shared link restores all four filters and exact observation/source evidence after hydration',async()=>{
 await browser(shared,async()=>{
  for(const [name,value] of Object.entries({entity:'browntop',country:'AT',metric:'CERTIFIED_SEED_AREA',year:'2025'}))assert.equal(document.querySelector(`[name=${name}]`).value,value)
  const view=productionViewFromSearch(data,window.location.search).view,active=selectEvidence(data,view).find(s=>s.id===view.scope)
  assert.ok(active)
  assert.equal(document.querySelectorAll('.production-table tbody tr').length,1)
  const point=active.points[0],source=data.sources[point.source]
  assert.equal(document.querySelector('.production-table tbody tr td:first-child').textContent,'2025')
  assert.equal(document.querySelector('.production-table tbody a').getAttribute('href'),source.url)
  assert.match(document.querySelector('.production-table tbody').textContent,new RegExp(source.organisation.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')))
  assert.equal(document.querySelector('[name=scope]').value,view.scope)
 })
})
test('invalid-link notice survives StrictMode and unknown/private URL fields are removed',async()=>{
 await browser('?entity=OLD_DELETED_CROP&year=1900&token=NEVER_SHARE#private',async()=>{
  assert.match(document.querySelector('[role=status]').textContent,/unavailable/)
  assert.equal(document.querySelector('[name=entity]').value,'alfalfa')
  assert.equal(document.querySelector('[name=year]').value,'')
  const href=document.querySelector('a[href^="/production-intelligence?"]').getAttribute('href')
  assert.doesNotMatch(href,/NEVER_SHARE|token|private|1900|OLD_DELETED/)
  assert.doesNotMatch(window.location.href,/NEVER_SHARE|token|private|1900|OLD_DELETED/)
  assert.doesNotMatch(document.body.textContent,/NEVER_SHARE|OLD_DELETED/)
 })
})
test('changing filters replaces the current URL entry and resets incompatible dependent selections',async()=>{
 await browser(shared,async()=>{
  const state={existing:'navigation'};window.history.replaceState(state,'');const length=window.history.length
  await act(async()=>{const input=document.querySelector('[name=entity]');input.value='alfalfa';input.dispatchEvent(new window.Event('change',{bubbles:true}))})
  const params=new URLSearchParams(window.location.search)
  assert.equal(params.get('entity'),'alfalfa');assert.equal(params.has('year'),false)
  assert.equal(document.querySelector('[name=year]').value,'')
  assert.equal(window.history.length,length);assert.deepEqual(window.history.state,state)
 })
})
test('back/forward restoration updates filters, keeps empty-year gaps absent and clears obsolete notices',async()=>{
 await browser('?entity=old-crop',async()=>{
  await act(async()=>{window.history.pushState({},'',shared);window.dispatchEvent(new window.PopStateEvent('popstate'))})
  assert.equal(document.querySelector('[name=entity]').value,'browntop')
  assert.equal(document.querySelector('[name=year]').value,'2025');assert.equal(document.querySelector('[role=status]'),null)
  await act(async()=>{window.history.replaceState({},'',shared.replace('2025','2024'));window.dispatchEvent(new window.PopStateEvent('popstate'))})
  assert.equal(document.querySelector('[name=year]').value,'')
  assert.match(document.querySelector('[role=status]').textContent,/unavailable/)
  assert.deepEqual([...document.querySelectorAll('.production-table tbody tr td:first-child')].map(e=>e.textContent),['2023','2025'])
 })
})
