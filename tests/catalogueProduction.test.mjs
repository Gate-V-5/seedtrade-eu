import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import {createHash} from 'node:crypto'
import {pathToFileURL} from 'node:url'
import React,{act} from 'react'
import {renderToString} from 'react-dom/server'
import {JSDOM} from 'jsdom'
import {build} from 'vite'
import data from '../src/productionCoverageData.mjs'
import index from '../src/generated/catalogue_production_links.json' with {type:'json'}
import catalogue from '../src/generated/market_catalogue_public.json' with {type:'json'}
import master from '../public/data/crop-master-v1.json' with {type:'json'}
import {catalogueProductionLink,catalogueSeedLocation} from '../src/catalogueProduction.mjs'
import {productionViewFromSearch,selectEvidence,longestHistory} from '../src/productionEvidence.mjs'

const output=path.resolve('tmp/catalogue-production-checks')
fs.mkdirSync(output,{recursive:true})
await build({logLevel:'error',build:{ssr:path.resolve('tests/fixtures/catalogueProductionEntry.jsx'),outDir:output,emptyOutDir:false,copyPublicDir:false,
  rollupOptions:{external:['react','react/jsx-runtime','react/jsx-dev-runtime'],output:{entryFileNames:'catalogue-production.mjs'}}}})
const {MarketCatalogue,SeedCard,LanguageProvider,translate}=await import(pathToFileURL(path.join(output,'catalogue-production.mjs')).href)
const card=id=>catalogue.cards.find(c=>c.market_entity_id===id)
const page=(route,language='EN')=>React.createElement(LanguageProvider,{initialLanguage:language},React.createElement(MarketCatalogue,{path:route}))
const search=href=>href.slice(href.indexOf('?'))

test('availability index is current and every indexed source grain matches the existing explorer loader',()=>{
  for(const [file,hash] of Object.entries(index.inputs))assert.equal(createHash('sha256').update(fs.readFileSync(file)).digest('hex'),hash,file)
  assert.equal(Object.keys(index.entries).length,68)
  for(const [id,entry] of Object.entries(index.entries)){
    if(!entry.entity)continue
    const canonical=master.entities.find(e=>e.id===entry.entity)
    assert.ok(canonical,id)
    if(entry.scope==='GROUP')assert.equal(canonical.botanical,card(id).botanical_display_name)
    else assert.ok(entry.entity===id||entry.entity===card(id).biological_species_id,id)
    const groups=selectEvidence(data,{entity:entry.entity})
    for(const [scope,country,metric,years] of entry.series){
      const group=groups.find(s=>s.id===scope)
      assert.ok(group,id);assert.equal(group.country,country);assert.equal(group.metric,metric)
      assert.deepEqual(years,[...new Set(group.points.map(p=>p.year))].sort((a,b)=>a-b))
    }
  }
})

test('all 48 supported destinations restore nonempty exact-identity evidence without a default-crop substitution',()=>{
  const counts={EXACT:0,GROUP:0,RELATED_ONLY:0,NONE:0}
  for(const c of catalogue.cards){
    const link=catalogueProductionLink(c.market_entity_id);counts[link.scope]++
    if(!link.href)continue
    const restored=productionViewFromSearch(data,search(link.href))
    assert.equal(restored.adjusted,false,c.market_entity_id)
    assert.equal(restored.view.entity,index.entries[c.market_entity_id].entity)
    assert.equal(restored.view.country,'')
    assert.ok(selectEvidence(data,restored.view).some(s=>s.id===restored.view.scope))
  }
  assert.deepEqual(counts,{EXACT:46,GROUP:2,RELATED_ONLY:7,NONE:13})
  assert.equal(catalogueProductionLink('wheat').view.entity,'common-wheat')
  assert.equal(catalogueProductionLink('winter-vetch').view.entity,'winter-vetch')
  assert.ok(catalogueProductionLink('carrot').href,'Use actual explorer coverage even where the legacy summary is empty')
})

test('no parent taxon, alternate crop or default alfalfa link for unavailable commercial forms and missing identities',()=>{
  for(const id of ['oil-radish','fodder-turnip','sudan-grass','westerwold-ryegrass','fodder-beet','sugar-beet','seed-potatoes','yellow-lupin','sorghum-sudan-hybrid','unknown','__proto__']){
    assert.equal(catalogueProductionLink(id,'?entity=alfalfa').href,null,id)
  }
  assert.equal(catalogueProductionLink('oil-radish').scope,'RELATED_ONLY')
  assert.equal(catalogueProductionLink('triticale').scope,'GROUP')
  assert.equal(catalogueProductionLink('festulolium').view.entity,'festulolium-group')
})

test('valid country, indicator, year and public source grain survive both direct and detail navigation',()=>{
  for(const id of ['red-clover','wheat','triticale','carrot']){
    const [scope,country,metric,years]=index.entries[id].series.at(-1),year=String(years.at(-1))
    const query=new URLSearchParams({country:country.toLowerCase(),metric,year,scope,entity:'WRONG',q:'private search',token:'DO_NOT_SHARE'})
    const link=catalogueProductionLink(id,query.toString())
    assert.deepEqual(link.view,{entity:index.entries[id].entity,country,metric,year,history:'0',scope})
    assert.doesNotMatch(link.href,/WRONG|private|token|DO_NOT_SHARE/)
    const detail=catalogueSeedLocation(card(id),query.toString())
    assert.equal(search(detail),search(link.href))
    assert.equal(catalogueProductionLink(id,search(detail)).href,link.href)
  }
  assert.equal(catalogueSeedLocation(card('red-clover'),'?q=red+clover'),'/market/seeds/red-clover')
  assert.equal(catalogueSeedLocation(card('oil-radish'),'?country=AT'),'/market/seeds/oil-radish')
})

test('invalid, duplicate, outdated or incompatible filters fall back to available evidence for the same identity',()=>{
  const query='?entity=alfalfa&country=ZZ&country=AT&metric=PRIVATE&year=1900&history=100&scope=private/config&token=secret#private'
  for(const id of ['red-clover','carrot','triticale']){
    const link=catalogueProductionLink(id,query)
    assert.equal(link.view.entity,index.entries[id].entity)
    assert.equal(link.view.country,'');assert.equal(link.view.year,'');assert.equal(link.view.history,'0')
    assert.doesNotMatch(link.href,/PRIVATE|1900|private|token|secret|ZZ/)
    assert.equal(productionViewFromSearch(data,search(link.href)).adjusted,false)
    assert.ok(selectEvidence(data,link.view).length)
  }
  const incompatible=catalogueProductionLink('carrot','?country=LT&metric=CERTIFIED_QUANTITY&year=9999')
  assert.ok(selectEvidence(data,incompatible.view).length)
})

test('history and scope are retained only for a compatible real source series',()=>{
  const entry=index.entries['red-clover'],series=entry.series.find(s=>longestHistory(s[3])>=3)
  assert.ok(series)
  const [scope,country,metric]=series,query=new URLSearchParams({country,metric,history:'3',scope})
  assert.equal(catalogueProductionLink('red-clover',query.toString()).view.history,'3')
  assert.equal(catalogueProductionLink('red-clover',query.toString()).view.scope,scope)
  query.set('year',String(series[3][0]))
  assert.equal(catalogueProductionLink('red-clover',query.toString()).view.history,'0')
  assert.equal(catalogueProductionLink('carrot',query.toString()).view.history,'0')
})

test('cards, ordinary details and briefing details expose exact links, label groups and suppress unsupported links in all languages',()=>{
  for(const language of ['EN','DE','FR','ES','IT']){
    for(const id of ['red-clover','carrot','triticale','festulolium','oil-radish','fodder-beet','yellow-lupin']){
      const document=new JSDOM(renderToString(page('/market/seeds/'+card(id).slug,language))).window.document
      const anchor=document.querySelector('.catalogue-production-link'),link=catalogueProductionLink(id)
      assert.equal(anchor?.getAttribute('href')||null,link.href,id)
      assert.equal(document.querySelector('h1').textContent,translate(language,card(id).common_name_en))
      assert.ok(document.querySelector('.catalogue-botanical').textContent.includes(card(id).botanical_display_name))
      assert.equal(document.querySelectorAll('a[href="/production-intelligence"]').length,0)
      if(link.scope==='GROUP')assert.ok(anchor.textContent.includes(translate(language,'Production evidence — hybrid group, not an individual species')))
      if(link.scope==='RELATED_ONLY')assert.ok(document.body.textContent.includes(translate(language,'Only broader taxon evidence is available; not specific to this commercial form.')))
      if(id==='carrot')assert.doesNotMatch(document.body.textContent,/Production evidence for this commercial seed type is developing/)
    }
  }
  const snapshot=React.createElement(LanguageProvider,{initialLanguage:'EN'},React.createElement(SeedCard,{card:card('red-clover'),snapshot:true}))
  assert.equal(new JSDOM(renderToString(snapshot)).window.document.querySelector('.catalogue-production-link'),null)
})

test('shared catalogue search hydrates without repair, preserves filters, then restores navigation state without requests',async()=>{
  const id='red-clover',[scope,country,metric,years]=index.entries[id].series[0]
  const query=new URLSearchParams({q:'red clover',country,metric,year:String(years[0]),scope})
  const dom=new JSDOM('<div id="app">'+renderToString(page('/market'))+'</div>',{url:'http://127.0.0.1:4175/market?'+query})
  const previous={window:globalThis.window,document:globalThis.document,fetch:globalThis.fetch,IS_REACT_ACT_ENVIRONMENT:globalThis.IS_REACT_ACT_ENVIRONMENT}
  Object.assign(globalThis,{window:dom.window,document:dom.window.document,IS_REACT_ACT_ENVIRONMENT:true})
  let requests=0,app;const errors=[]
  globalThis.fetch=async()=>{requests++;throw Error('No requests allowed')}
  try{
    const {hydrateRoot}=await import('react-dom/client')
    await act(async()=>{app=hydrateRoot(document.getElementById('app'),page('/market'),{onRecoverableError:e=>errors.push(e.message)})})
    await act(async()=>{await new Promise(resolve=>setTimeout(resolve,10))})
    assert.equal(document.querySelectorAll('.catalogue-seed-card').length,1)
    const link=document.querySelector('.catalogue-production-link')
    assert.equal(link.tagName,'A');assert.equal(link.tabIndex,0)
    assert.equal(link.getAttribute('href'),catalogueProductionLink(id,query.toString()).href)
    link.focus();assert.equal(document.activeElement,link)
    assert.equal(search(document.querySelector('.catalogue-card-cta').getAttribute('href')),search(link.getAttribute('href')))
    await act(async()=>{window.history.pushState({},'','/market?q=oil+radish');window.dispatchEvent(new window.PopStateEvent('popstate'))})
    assert.equal(document.querySelector('.catalogue-seed-card').dataset.entityId,'oil-radish')
    assert.equal(document.querySelector('.catalogue-production-link'),null)
    await act(async()=>{window.history.pushState({},'','/market?'+query);window.dispatchEvent(new window.PopStateEvent('popstate'))})
    assert.equal(document.querySelector('.catalogue-production-link').getAttribute('href'),catalogueProductionLink(id,query.toString()).href)
    assert.deepEqual(errors,[]);assert.equal(requests,0)
  }finally{
    if(app)await act(async()=>app.unmount())
    dom.window.close();Object.assign(globalThis,previous)
  }
})
