import assert from 'node:assert/strict'
import fs from 'node:fs'
import React,{act} from 'react'
import {createRoot} from 'react-dom/client'
import {JSDOM} from 'jsdom'
import {createServer} from 'vite'
const dom=new JSDOM('<html><head></head><body><div id="root"></div></body></html>',{url:'https://seedtrade.test/',pretendToBeVisual:true})
globalThis.window=dom.window;globalThis.document=dom.window.document;globalThis.IS_REACT_ACT_ENVIRONMENT=true
window.HTMLElement.prototype.scrollIntoView=()=>{}
const originalFetch=globalThis.fetch;globalThis.fetch=async()=>{throw Error('External requests forbidden in DOM QA')}
const OriginalDateTimeFormat=Intl.DateTimeFormat
Intl.DateTimeFormat=function(locale,options){const formatter=new OriginalDateTimeFormat(locale,options);if(options?.timeZone==='Europe/Vilnius')formatter.formatToParts=()=>[{type:'year',value:'2026'},{type:'month',value:'10'},{type:'day',value:'16'}];return formatter}
const vite=await createServer({appType:'custom',server:{middlewareMode:true},logLevel:'error'})
let root
try{
 const {default:data}=await vite.ssrLoadModule('/src/generated/news.json')
 const {default:visuals}=await vite.ssrLoadModule('/src/data/news_visuals.json')
 const {default:App}=await vite.ssrLoadModule('/src/AppV2.jsx')
 const load=async path=>{if(root)await act(async()=>root.unmount());dom.reconfigure({url:`https://seedtrade.test${path}`});root=createRoot(document.getElementById('root'));await act(async()=>root.render(React.createElement(App)))}
 const cards=()=>[...document.querySelectorAll('.top-news .news-card')]
 await load('/');assert.equal(cards().length,4);assert.equal(document.querySelectorAll('.news-empty').length,0)
 const links=[...document.querySelectorAll('.news-stream-links a')]
 assert.equal(links.length,4)
 for(const link of links){assert.ok(new URL(link.href).searchParams.get('stream'));await load(new URL(link.href).pathname+new URL(link.href).search);assert.ok([...document.querySelectorAll('.filters button.active')].some(button=>button.textContent===new URL(link.href).searchParams.get('stream')))}
 const latest=data.items.slice(-2)
 await load('/')
 const weatherCard=cards().find(card=>card.textContent.includes(latest[0].headline))
 const img=weatherCard.querySelector('img');assert.ok(img)
 await act(async()=>img.dispatchEvent(new window.Event('error')))
 assert.ok(weatherCard.querySelector('[role="img"]'));assert.equal(weatherCard.querySelectorAll('img').length,0)
 assert.ok(weatherCard.querySelector('h3 a'));assert.equal(cards().length,4)
 const originalSrc=visuals[latest[1].slug].src;delete visuals[latest[1].slug].src
 await load('/');assert.ok(cards().some(card=>card.querySelector('[role="img"]')&&card.textContent.includes(latest[1].headline)))
 visuals[latest[1].slug].src=originalSrc
 const weather=data.items.filter(row=>row.stream==='EU Weather'),dates=weather.map(row=>row.valid_until)
 weather.forEach(row=>row.valid_until='2026-10-01')
 await load('/');assert.equal(cards().length,3);assert.equal(document.querySelector('.news-list').style.getPropertyValue('--news-count'),'3');assert.equal(document.querySelectorAll('.news-empty').length,0);assert.equal(document.querySelectorAll('.news-stream-links a').length,4)
 weather.forEach((row,i)=>row.valid_until=dates[i])
 const saved=data.items.filter(row=>row.stream).map(row=>[row,row.valid_until])
 saved.forEach(([row])=>row.valid_until='2026-10-01')
 await load('/');assert.equal(cards().length,0);assert.equal(document.querySelectorAll('.news-list').length,0);assert.equal(document.querySelectorAll('.news-stream-links a').length,4)
 saved.forEach(([row,date])=>row.valid_until=date)
 const css=fs.readFileSync('src/styles.css','utf8')
 assert.ok(css.includes('repeat(var(--news-count,4),minmax(0,1fr))'))
 assert.ok(css.includes('repeat(auto-fit,minmax(min(100%,260px),1fr))'))
 assert.ok(css.includes('@media(max-width:620px)'))
 const html=fs.readFileSync('dist/index.html','utf8');assert.ok(html.includes(latest[0].slug)&&html.includes(latest[1].slug));assert.ok(!html.includes('news-empty'))
 console.log('Homepage restoration DOM PASS: four populated cards; 3/0-card collapse; category navigation; missing/broken image fallback; static-first new articles; desktop/tablet/mobile CSS rules. External requests=0. Pixel rendering SKIP: no control-browser skill.')
}finally{if(root)await act(async()=>root.unmount());await vite.close();dom.window.close();Intl.DateTimeFormat=OriginalDateTimeFormat;globalThis.fetch=originalFetch}
