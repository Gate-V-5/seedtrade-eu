import assert from 'node:assert/strict'
import fs from 'node:fs'
import {execFileSync} from 'node:child_process'
import React,{act} from 'react'
import {createRoot} from 'react-dom/client'
import {renderToStaticMarkup} from 'react-dom/server'
import {JSDOM} from 'jsdom'
import {createServer} from 'vite'
import {listingTitle} from '../src/listingMetadata.mjs'
const offers=JSON.parse(fs.readFileSync('src/generated/rfqs_public.json')).items
assert.deepEqual(fs.readFileSync('src/generated/rfqs_public.json'),execFileSync('git',['show','HEAD:src/generated/rfqs_public.json']))
const vite=await createServer({appType:'custom',server:{middlewareMode:true},logLevel:'error'}),checks=[]
try{
 const {default:App,routeMeta}=await vite.ssrLoadModule('/src/AppV2.jsx'),{translate}=await vite.ssrLoadModule('/src/i18n/index.jsx')
 for(const language of ['EN','DE','FR','ES','IT']){
  const unique=new Set()
  for(const offer of offers){
   const route='/buying-requests/'+offer.slug,t=key=>translate(language,key),expected=listingTitle(offer,t),dom=new JSDOM('<html><head></head><body><div id="test-root"></div></body></html>',{url:'https://seedtrade.eu'+route,pretendToBeVisual:true})
   globalThis.window=dom.window;globalThis.document=dom.window.document;globalThis.IS_REACT_ACT_ENVIRONMENT=true
   dom.window.HTMLElement.prototype.scrollIntoView=()=>{}
   const ssr=new JSDOM(renderToStaticMarkup(React.createElement(App,{initialLanguage:language})))
   assert.equal(ssr.window.document.querySelector('h1').textContent,expected)
   const root=createRoot(document.querySelector('#test-root'))
   await act(async()=>root.render(React.createElement(App,{initialLanguage:language})))
   assert.equal(document.title,expected+' | SeedTrade.eu');assert.equal(document.querySelector('h1').textContent,expected)
   assert.equal(document.querySelector('meta[property="og:title"]').content,document.title)
   assert.equal(document.querySelector('link[rel="canonical"]').href,'https://seedtrade.eu'+route)
   assert.equal(document.querySelector('.skip-link').getAttribute('href'),'#main-content')
   assert.ok([...document.querySelectorAll('button[disabled]')].some(b=>b.textContent.includes('—')))
   for(const value of [offer.variety,offer.certification_category,offer.species_botanical_name,String(offer.quantity),t(offer.location)])assert.ok(document.title.includes(value))
   unique.add(document.title);checks.push({language,route,title:document.title,ssr_h1:'PASS',client_title_h1:'PASS',canonical:'UNCHANGED',private_gate:'DISABLED'})
   await act(async()=>root.unmount());dom.window.close();ssr.window.close()
  }
  assert.equal(unique.size,5)
 }
 console.log(JSON.stringify({status:'PASS',variants:checks.length,checks,visual_qa:'NOT_A_BROWSER_OR_DEVICE_TEST'},null,2))
}finally{await vite.close();delete globalThis.IS_REACT_ACT_ENVIRONMENT}
