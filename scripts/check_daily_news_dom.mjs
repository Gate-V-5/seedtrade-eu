// Integration only: no external fetches or mail.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import React,{act} from 'react'
import {JSDOM} from 'jsdom'
import {createServer} from 'vite'
import {localizedContentText} from '../src/i18n/content.mjs'
const species=JSON.parse(fs.readFileSync('src/data/species_master_v1_1.json','utf8')).species
const plain=value=>species.reduce((text,item)=>item.botanical_name?text.replaceAll(` (${item.botanical_name})`,''):text,value)
const data=JSON.parse(fs.readFileSync('src/generated/news.json','utf8')),records=data.items.filter(item=>item.stream)
const dom=new JSDOM('<html><head><title></title></head><body><div id="root"></div></body></html>',{url:'https://seedtrade.test/news',pretendToBeVisual:true})
globalThis.window=dom.window;globalThis.document=dom.window.document;globalThis.IS_REACT_ACT_ENVIRONMENT=true
window.HTMLElement.prototype.scrollIntoView=()=>{}
const originalFetch=globalThis.fetch;globalThis.fetch=async()=>{throw Error('External request forbidden')}
const {createRoot}=await import('react-dom/client')
const vite=await createServer({appType:'custom',server:{middlewareMode:true},logLevel:'error'})
let root
const change=async(element,value)=>{await act(async()=>{
 if(element.tagName==='SELECT')element.value=value
 else Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set.call(element,value)
 element.dispatchEvent(new window.Event(element.tagName==='SELECT'?'change':'input',{bubbles:true}))
})}
try {
 const {default:liveNews}=await vite.ssrLoadModule('/src/generated/news.json')
 // Simulate rejected submissions without touching repository content.
 for(const [slug,changes] of [['private-fixture',{classification:'PRIVATE_DATA'}],['draft-fixture',{review_status:'PENDING'}],['future-fixture',{publication_date:'2099-01-01',updated_at:'2099-01-01',checked_at:'2099-01-01',valid_until:'2099-01-02'}]]){
  const record={...structuredClone(records[0]),...changes,id:slug,slug,headline:'DO_NOT_PUBLISH_FIXTURE',canonical_url:`https://seedtrade.eu/news/${slug}`}
  liveNews.items.push(record)
 }
 const {default:App}=await vite.ssrLoadModule('/src/AppV2.jsx')
 const load=async path=>{if(root)await act(async()=>root.unmount());dom.reconfigure({url:`https://seedtrade.test${path}`});root=createRoot(document.getElementById('root'));await act(async()=>root.render(React.createElement(App)))}
 await load('/news')
 const cards=()=>[...document.querySelectorAll('.news-grid .news-card')]
 assert.equal(cards().length,8)
 await change(document.querySelector('select[aria-label="Filter news by date"]'),'RECENT');assert.ok(cards().length<8&&cards().length>=4)
 await change(document.querySelector('select[aria-label="Filter news by date"]'),'ALL')
 await act(async()=>[...document.querySelectorAll('.filters button')].find(button=>button.textContent==='EU Agronomist').click())
 assert.equal(cards().length,1);assert.ok(cards()[0].textContent.includes(records[1].headline))
 await change(document.querySelector('select[aria-label="Filter news by country or region"]'),'NL');assert.equal(cards().length,0);assert.ok(document.querySelector('.empty-state'))
 await change(document.querySelector('select[aria-label="Filter news by country or region"]'),'LV');assert.equal(cards().length,1)
 await change(document.querySelector('select[aria-label="Filter news by crop"]'),'winter wheat');assert.equal(cards().length,1)
 await change(document.querySelector('input[type="date"]'),'2026-10-02');assert.equal(cards().length,0)
 await change(document.querySelector('input[type="date"]'),'');assert.equal(cards().length,1)
 for(const code of ['EN','DE','FR','ES','IT','EN']){
  await change(document.querySelector('.language-select'),code)
  assert.equal(window.localStorage.getItem('seedtrade_language'),code)
  assert.ok(document.querySelector('.news-grid').textContent.includes(localizedContentText(records[1],code,'headline')))
  const languageLabels={EN:'🇬🇧 EN',DE:'🇩🇪 DE',FR:'🇫🇷 FR',ES:'🇪🇸 ES',IT:'🇮🇹 IT'}
  assert.ok(document.querySelector('.language-select').selectedOptions[0].textContent.includes(languageLabels[code]))
 }
 await change(document.querySelector('.language-select'),'DE')
 await load('/');assert.equal(document.querySelector('.language-select').value,'DE');assert.equal(document.querySelectorAll('.top-news .news-card').length,4)
 for(const item of records)assert.ok(plain(document.querySelector('.top-news').textContent).includes(plain(localizedContentText(item,'DE','headline'))))
 await load(`/news/${records[0].slug}`);assert.equal(document.querySelector('.language-select').value,'DE');assert.ok(plain(document.querySelector('main').textContent).includes(plain(localizedContentText(records[0],'DE','content.0.body'))))
 await load(`/news/${records[0].slug}`);assert.equal(document.querySelector('.language-select').value,'DE')
 for(const slug of ['private-fixture','draft-fixture','future-fixture']){
  await load(`/news/${slug}`)
  assert.equal(document.querySelector('meta[name="robots"]').content,'noindex,nofollow')
  assert.ok(!document.querySelector('main').textContent.includes('DO_NOT_PUBLISH_FIXTURE'))
  assert.equal(document.querySelectorAll('.news-section').length,0)
 }
 console.log('Daily News DOM PASS: stream/country/crop/date/period controls, empty state, EN → DE → FR → ES → IT → EN, flags, navigation and refresh persistence; external requests=0')
}finally{if(root)await act(async()=>root.unmount());await vite.close();dom.window.close();globalThis.fetch=originalFetch}
