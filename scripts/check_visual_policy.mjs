import assert from 'node:assert/strict'
import fs from 'node:fs'
import React from 'react'
import {renderToStaticMarkup} from 'react-dom/server'
import {JSDOM} from 'jsdom'
import {createServer} from 'vite'
const fixed=JSON.parse(fs.readFileSync('src/data/fixed_editorial_visuals.json')),news=JSON.parse(fs.readFileSync('src/data/news_visuals.json')),registry=JSON.parse(fs.readFileSync('src/data/catalogue_gate_visuals.json'))
const vite=await createServer({appType:'custom',server:{middlewareMode:true},logLevel:'error'});let checks=0
try{const{default:App}=await vite.ssrLoadModule('/src/AppV2.jsx');for(const language of ['EN','DE','FR','ES','IT']){
 globalThis.window={location:{pathname:'/',search:''}};const dom=new JSDOM(renderToStaticMarkup(React.createElement(App,{initialLanguage:language}))),d=dom.window.document
 assert.deepEqual([...d.querySelectorAll('.intelligence-overview .fixed-evidence-image')].map(e=>e.getAttribute('src')),[fixed.market.src,fixed.weather.src,fixed.production.src])
 const expectedPartners=Object.entries(fixed).filter(([key])=>!['market','weather','production'].includes(key)).map(([,v])=>v.src)
 assert.deepEqual([...d.querySelectorAll('.insights-teaser img.context-image')].map(e=>e.getAttribute('src')),expectedPartners)
 const top=[...d.querySelectorAll('.top-news img')].map(e=>e.getAttribute('src'));assert.equal(top.length,4);for(const src of top)assert.ok(Object.values(news).some(v=>v.src===src&&v.kind==='EDITORIAL_PHOTOGRAPH'))
 assert.equal(d.querySelectorAll('.carousel-pause').length,2);assert.equal(d.querySelectorAll('.skip-link').length,1);checks++;dom.window.close()
 for(const route of ['/market',...registry.items.map(i=>'/market/'+i.slug)]){globalThis.window={location:{pathname:route,search:''}};const dom=new JSDOM(renderToStaticMarkup(React.createElement(App,{initialLanguage:language}))),d=dom.window.document,images=[...d.querySelectorAll('img[data-visual-group="EUROPEAN_SEED_MARKET"]')];assert.equal(images.length,route==='/market'?6:1);for(const image of images){assert.equal(image.getAttribute('data-visual-kind'),'GATE_OWNER_AI_VISUAL');assert.ok(image.getAttribute('src').includes('/gate-'));assert.equal(image.width,1200);assert.equal(image.height,670)};checks++;dom.window.close()}
 }}finally{await vite.close()}
console.log(JSON.stringify({status:'PASS',checks,real_browser:'SEPARATE',mobile:'NOT_MEASURED'}))
