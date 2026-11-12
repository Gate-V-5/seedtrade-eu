import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import {createHash} from 'node:crypto'
import {pathToFileURL} from 'node:url'
import React,{act} from 'react'
import {renderToString} from 'react-dom/server'
import {JSDOM,ResourceLoader} from 'jsdom'
import {build} from 'vite'

const output=path.resolve('tmp/analytics-off-checks')
fs.mkdirSync(output,{recursive:true})
const nodeEnvironment=process.env.NODE_ENV
await build({logLevel:'error',build:{ssr:path.resolve('tests/fixtures/analyticsOffEntry.jsx'),outDir:output,emptyOutDir:false,copyPublicDir:false,
  rollupOptions:{external:['react','react/jsx-runtime','react/jsx-dev-runtime'],output:{entryFileNames:'analytics-off.mjs'}}}})
if(nodeEnvironment===undefined)delete process.env.NODE_ENV;else process.env.NODE_ENV=nodeEnvironment
const {AppV2,routeMeta,translate,NON_ESSENTIAL_ANALYTICS_ENABLED,loadGTM,track}=await import(pathToFileURL(path.join(output,'analytics-off.mjs')).href)
const observations=[]

async function browser({route='/market?q=red+clover',consent=null,blockedStorage=false,language='EN'},work){
  const requests=[],tags=[],analyticsStorage=[],events=[]
  class NoNetwork extends ResourceLoader{fetch(url){requests.push(String(url));return null}}
  const dom=new JSDOM('<!doctype html><html><head></head><body><div id="app"></div></body></html>',{url:'http://127.0.0.1:4175'+route,resources:new NoNetwork(),pretendToBeVisual:true})
  if(consent!==null)dom.window.localStorage.setItem('seedtrade_analytics_consent',consent)
  const storage=dom.window.Storage.prototype,read=storage.getItem,write=storage.setItem
  storage.getItem=function(key){if(key==='seedtrade_analytics_consent')analyticsStorage.push(['read',key]);if(blockedStorage)throw new Error('Storage unavailable');return read.call(this,key)}
  storage.setItem=function(key,value){if(key==='seedtrade_analytics_consent')analyticsStorage.push(['write',key]);if(blockedStorage)throw new Error('Storage unavailable');return write.call(this,key,value)}
  dom.window.dataLayer=[];dom.window.dataLayer.push=(...items)=>events.push(...items)
  dom.window.navigator.sendBeacon=url=>{requests.push(String(url));return false}
  dom.window.XMLHttpRequest.prototype.open=function(method,url){requests.push(String(url))}
  dom.window.XMLHttpRequest.prototype.send=function(){}
  dom.window.WebSocket=class{constructor(url){requests.push(String(url))}}
  const append=dom.window.Node.prototype.appendChild
  dom.window.Node.prototype.appendChild=function(node){if(['SCRIPT','IFRAME'].includes(node.tagName))tags.push(node.outerHTML);return append.call(this,node)}
  const previous=Object.fromEntries(['window','document','fetch','IS_REACT_ACT_ENVIRONMENT'].map(key=>[key,globalThis[key]]))
  const noFetch=async url=>{requests.push(String(url));throw Error('No network allowed')}
  Object.assign(globalThis,{window:dom.window,document:dom.window.document,fetch:noFetch,IS_REACT_ACT_ENVIRONMENT:true})
  dom.window.fetch=noFetch
  const app=React.createElement(React.StrictMode,null,React.createElement(AppV2,{initialLanguage:language}))
  let mounted;const errors=[]
  try{
    document.getElementById('app').innerHTML=renderToString(app)
    const {hydrateRoot}=await import('react-dom/client')
    await act(async()=>{mounted=hydrateRoot(document.getElementById('app'),app,{onRecoverableError:e=>errors.push(e.message)})})
    await act(async()=>{await new Promise(resolve=>setTimeout(resolve,10))})
    await work(dom)
    assert.equal(document.querySelector('.consent'),null)
    assert.equal(document.querySelector('#seedtrade-gtm'),null)
    assert.deepEqual(tags,[]);assert.deepEqual(events,[]);assert.deepEqual(analyticsStorage,[])
    assert.deepEqual(requests,[],'No fetch, beacon, XHR, socket or resource-loader requests')
    assert.deepEqual(errors,[],'No hydration repair')
    observations.push({route,language,legacyConsent:consent,blockedStorage,requests:requests.length,injectedTags:tags.length,analyticsStorageAccesses:analyticsStorage.length,dataLayerEvents:events.length,bannerVisible:false})
  }finally{
    if(mounted)await act(async()=>mounted.unmount())
    dom.window.close();Object.assign(globalThis,previous)
  }
}

test('the product candidate reuses the reviewed immutable-off policy, with no fallback tracker loader',()=>{
  assert.equal(NON_ESSENTIAL_ANALYTICS_ENABLED,false)
  assert.equal(createHash('sha256').update(fs.readFileSync('src/legal/analyticsPolicy.mjs')).digest('hex'),'815af42076095f581d632164eeb36eceaf4f50eb20aef20e4ba7ffeb72d00e7f')
  const app=fs.readFileSync('src/AppV2.jsx','utf8'),entry=fs.readFileSync('index.html','utf8')
  assert.match(app,/import \{track,loadGTM\} from '\.\/legal\/analyticsPolicy\.mjs'/)
  for(const text of [app,entry])assert.doesNotMatch(text,/googletagmanager\.com|google-analytics\.com|GTM-K9SVZHR7|dataLayer|seedtrade_analytics_consent/)
})

test('fresh, denied, granted, malformed and unavailable legacy storage cannot activate analytics or display an opt-in',async()=>{
  for(const consent of [null,'denied','granted','unknown-value'])await browser({consent},async()=>{
    assert.equal(loadGTM(),false);assert.equal(track('test',{page_path:'/market'}),false)
    assert.equal(document.querySelectorAll('.catalogue-seed-card').length,1)
    assert.equal(document.querySelector('.catalogue-seed-card').dataset.entityId,'red-clover')
    assert.match(document.querySelector('.catalogue-production-link').getAttribute('href'),/entity=red-clover&/)
    assert.equal(document.querySelectorAll('.catalogue-category-tile').length,6)
  })
  await browser({consent:'granted',blockedStorage:true},async()=>{assert.equal(loadGTM(),false);assert.equal(track('test'),false)})
})

test('legacy storage and consent-change events plus ordinary catalogue interaction cannot re-enable tracking',async()=>{
  await browser({consent:'granted'},async dom=>{
    await act(async()=>{
      window.dispatchEvent(new dom.window.StorageEvent('storage',{key:'seedtrade_analytics_consent',newValue:'granted'}))
      window.dispatchEvent(new dom.window.CustomEvent('consentchange',{detail:{analytics:'granted'}}))
      document.querySelector('.catalogue-clear-search').click()
    })
    assert.equal(document.querySelector('#catalogue-search').value,'')
    assert.equal(document.querySelectorAll('.catalogue-category-tile').length,6)
    assert.equal(loadGTM(),false);assert.equal(track('manual_legacy_attempt'),false)
  })
})

test('the privacy notice describes disabled analytics in all five existing languages without changing SEO identity',async()=>{
  const key='Personal data is processed only for stated platform purposes and subject to applicable data-protection rights. Non-essential analytics is disabled. REQUIRES_QUALIFIED_LEGAL_REVIEW.'
  for(const language of ['EN','DE','FR','ES','IT'])await browser({route:'/privacy',consent:'granted',language},async()=>{
    assert.equal(document.querySelector('main .lead').textContent,translate(language,key))
    assert.equal(document.title,routeMeta('/privacy').title)
    assert.equal(document.querySelector('link[rel=canonical]').href,'https://seedtrade.eu/privacy')
    assert.equal(document.querySelector('meta[name=robots]').content,'index,follow')
  })
})

test('the global disabled policy covers production evidence, news and home page views with legacy opt-in',async()=>{
  for(const route of ['/production-intelligence?entity=red-clover&country=LT&metric=CERTIFIED_SEED_AREA&year=2025','/news','/'])await browser({route,consent:'granted'},async()=>{
    assert.ok(document.querySelector('main'))
    assert.ok(document.querySelector('footer'))
  })
})

test.after(()=>fs.writeFileSync(path.join(output,'runtime-observations.json'),JSON.stringify({method:'Instrumented local JSDOM SSR/hydration; no live browser or external requests',observations},null,2)+'\n'))
