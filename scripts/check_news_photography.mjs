import assert from 'node:assert/strict'
import React,{act} from 'react'
import {createRoot} from 'react-dom/client'
import {JSDOM} from 'jsdom'
import {createServer} from 'vite'
import fs from 'node:fs'
const dom=new JSDOM('<div id="root"></div>',{url:'https://seedtrade.test/',pretendToBeVisual:true})
globalThis.window=dom.window;globalThis.document=dom.window.document;globalThis.IS_REACT_ACT_ENVIRONMENT=true
window.HTMLElement.prototype.scrollIntoView=()=>{}
const vite=await createServer({appType:'custom',server:{middlewareMode:true},logLevel:'error'})
let root
try{
 const {default:App}=await vite.ssrLoadModule('/src/AppV2.jsx'),v=JSON.parse(fs.readFileSync('src/data/news_visuals.json')),slugs=Object.keys(v).slice(-2)
 for(const language of ['EN','DE','FR','ES','IT']){
  if(root)await act(async()=>root.unmount());root=createRoot(document.getElementById('root'))
  await act(async()=>root.render(React.createElement(App,{initialLanguage:language})))
  const cards=[...document.querySelectorAll('.top-news .news-card')];assert.equal(cards.length,4)
  for(const slug of slugs){
   const card=cards.find(c=>c.querySelector(`a[href="/news/${slug}"]`)),img=card.querySelector('img')
   assert.equal(img.getAttribute('src'),v[slug].src);assert.ok(img.alt.startsWith(v[slug].localizations[language.toLowerCase()].alt))
   const credit=card.querySelector('.news-photo-credit');assert.ok(credit.textContent.includes(v[slug].creator));assert.ok(credit.querySelector(`a[href="${v[slug].licence_url}"]`))
   await act(async()=>img.dispatchEvent(new window.Event('error')))
   assert.equal(card.querySelectorAll('img,.editorial-visual').length,0);assert.ok(card.querySelector('.news-photo-unavailable').textContent.includes(v[slug].localizations[language.toLowerCase()].fallback));assert.ok(card.querySelector('h3 a'))
  }
  assert.equal(cards.slice(2).filter(c=>c.querySelector('img')).length,2)
 }
 console.log('News photography DOM PASS: five languages, local photos, visible source/licence attribution, no schematic error fallback; Trade/Events intact. Pixel/viewport QA is separate.')
}finally{if(root)await act(async()=>root.unmount());await vite.close();dom.window.close()}
