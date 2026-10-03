import fs from 'node:fs'
import assert from 'node:assert/strict'
import React,{act} from 'react'
import {JSDOM} from 'jsdom'
import {createServer} from 'vite'
const dom=new JSDOM('<html><body><div id="root"></div></body></html>',{url:'https://seedtrade.test/production-intelligence/',pretendToBeVisual:true})
global.window=dom.window;global.document=dom.window.document;global.IS_REACT_ACT_ENVIRONMENT=true
const {hydrateRoot}=await import('react-dom/client'),vite=await createServer({appType:'custom',server:{middlewareMode:true},logLevel:'error'})
let root
try {
 const {default:App}=await vite.ssrLoadModule('/src/AppV2.jsx')
 const html=fs.readFileSync('dist/production-intelligence/index.html','utf8')
 document.getElementById('root').innerHTML=html.split('<div id="root">')[1].split('</div><noscript>')[0]
 const errors=[]
 await act(async()=>{root=hydrateRoot(document.getElementById('root'),React.createElement(App),{onRecoverableError:e=>errors.push(e.message)})})
 const select=async(index,value)=>{await act(async()=>{const s=document.querySelectorAll('.production-filters select')[index];s.value=value;s.dispatchEvent(new window.Event('change',{bubbles:true}))})}
 await select(3,'2021');assert.ok(document.querySelector('.production-kpis').textContent.includes('2021'));assert.equal(document.querySelectorAll('.production-table tbody tr').length,1)
 await select(3,'');await select(0,'browntop');await select(1,'AT');await select(2,'CERTIFIED_SEED_AREA')
 assert.deepEqual([...document.querySelectorAll('.production-table tbody tr td:first-child')].map(c=>c.textContent),['2023','2025'])
 assert.ok(document.querySelector('.production-history-status').textContent.includes('Insufficient'))
 await select(4,'2');assert.ok(document.querySelector('.empty-state'));assert.equal(document.querySelectorAll('.production-table tbody tr').length,0)
 await select(4,'0');await select(1,'');assert.ok(document.querySelector('.production-scope select'))
 await select(0,'mustard-seed');assert.ok(document.querySelector('.production-limitations').textContent.includes('Groups and aggregates'))
 assert.deepEqual(errors,[])
 console.log('Production controls/hydration PASS: filters, latest year, gap preservation, history eligibility, country scopes, groups; no network/email')
} finally {if(root)await act(async()=>root.unmount());await vite.close();dom.window.close()}
