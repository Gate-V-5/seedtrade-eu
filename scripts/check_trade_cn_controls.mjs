import fs from 'node:fs'
import assert from 'node:assert/strict'
import React,{act} from 'react'
import {JSDOM} from 'jsdom'
import {createServer} from 'vite'
const dom=new JSDOM('<html><body><div id="root"></div></body></html>',{url:'https://seedtrade.test/market/',pretendToBeVisual:true})
global.window=dom.window;global.document=dom.window.document;global.IS_REACT_ACT_ENVIRONMENT=true
const {hydrateRoot}=await import('react-dom/client'),vite=await createServer({appType:'custom',server:{middlewareMode:true},logLevel:'error'})
let root
try {
 const {default:App}=await vite.ssrLoadModule('/src/AppV2.jsx'),html=fs.readFileSync('dist/market/index.html','utf8')
 document.getElementById('root').innerHTML=html.split('<div id="root">')[1].split('</div><noscript>')[0]
 const errors=[];await act(async()=>{root=hydrateRoot(document.getElementById('root'),React.createElement(App),{onRecoverableError:e=>errors.push(e.message)})})
 const panel=()=>document.querySelector('[aria-labelledby="trade-coverage-heading"]'),sel=async(i,value)=>{await act(async()=>{const s=panel().querySelectorAll('select')[i];s.value=value;s.dispatchEvent(new window.Event('change',{bubbles:true}))})}
 await sel(0,'GROUP');assert.ok(panel().textContent.includes('Trade group'))
 await sel(1,'vegetable-seeds');assert.ok(panel().textContent.includes('12099180'));assert.ok(panel().textContent.includes('Daucus carota'))
 await sel(1,'ALL');await sel(0,'SPECIES');await sel(2,'CN-12011000');assert.ok(panel().textContent.includes('Glycine max'))
 const data=JSON.parse(fs.readFileSync('src/generated/trade_cn_public.json','utf8'));let gap
 for(const e of data.entities.filter(e=>e.periods.length&&e.granularity!=='GROUP_LEVEL'))for(const period of new Set(e.periods.map(r=>r.period)))for(const c of ['DE','FR','NL','PL'])if(!e.periods.some(r=>r.country===c&&r.period===period))gap={e:e.id,c,period}
 assert.ok(gap);await sel(2,gap.e);await sel(3,gap.c);await sel(4,gap.period)
 assert.ok(panel().textContent.includes('Missing data is not zero'));assert.equal(panel().querySelector('dl'),null);assert.deepEqual(errors,[])
 console.log('Trade/CN control hydration PASS: category, species/group filters, botanical scope, missing observations withheld, no hydration repairs; no emails.')
}finally{if(root)await act(async()=>root.unmount());await vite.close();dom.window.close()}
