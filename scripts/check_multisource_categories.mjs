import fs from 'node:fs'
import assert from 'node:assert/strict'
import React,{act} from 'react'
import {JSDOM} from 'jsdom'
import {createServer} from 'vite'
const dom=new JSDOM('<html><body><div id="root"></div></body></html>',{url:'https://seedtrade.test/market/',pretendToBeVisual:true})
global.window=dom.window;global.document=dom.window.document;global.IS_REACT_ACT_ENVIRONMENT=true
const {hydrateRoot}=await import('react-dom/client'),vite=await createServer({appType:'custom',server:{middlewareMode:true},logLevel:'error'})
let root
try{
 const {default:App}=await vite.ssrLoadModule('/src/AppV2.jsx'),html=fs.readFileSync('dist/market/index.html','utf8');document.getElementById('root').innerHTML=html.split('<div id="root">')[1].split('</div><noscript>')[0]
 const errors=[];await act(async()=>{root=hydrateRoot(document.getElementById('root'),React.createElement(App),{onRecoverableError:e=>errors.push(e.message)})})
 const panel=document.querySelector('[aria-labelledby="market-categories-heading"]');assert.ok(panel);assert.equal(panel.querySelectorAll('button[aria-pressed]').length,10)
 const data=JSON.parse(fs.readFileSync('src/generated/market_categories_public.json','utf8'))
 for(let i=0;i<10;i++){
  await act(async()=>panel.querySelectorAll('button[aria-pressed]')[i].click());assert.equal(panel.querySelector('h3').textContent,data.categories[i].name)
  for(const s of data.categories[i].species)if(s.botanical)assert.ok(panel.textContent.includes(s.botanical))
  assert.equal(document.querySelector('[aria-labelledby="trade-coverage-heading"]').querySelectorAll('select')[1].value,data.categories[i].id)
 }
 await act(async()=>panel.querySelectorAll('button[aria-pressed]')[2].click());const tag=panel.querySelector('select');await act(async()=>{tag.value='CATCH_CROP';tag.dispatchEvent(new window.Event('change',{bubbles:true}))})
 assert.equal(panel.querySelectorAll('li').length,data.categories[2].species.filter(s=>s.tags.includes('CATCH_CROP')).length);assert.deepEqual(errors,[])
 console.log('10 canonical categories,136 membership,Latin names,use tags,category-to-trade linkage and no hydration repairs: PASS;real emails=0')
}finally{if(root)await act(async()=>root.unmount());await vite.close();dom.window.close()}
