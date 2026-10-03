import fs from 'node:fs'
import assert from 'node:assert/strict'
import React from 'react'
import {renderToString} from 'react-dom/server'
import {JSDOM} from 'jsdom'
import {createServer} from 'vite'
const vite=await createServer({appType:'custom',server:{middlewareMode:true},logLevel:'error'})
try {
 const {default:App}=await vite.ssrLoadModule('/src/AppV2.jsx')
 const {translate}=await vite.ssrLoadModule('/src/i18n/index.jsx')
 for(const language of ['EN','DE','FR','ES','IT','UNKNOWN']){
  global.window={location:{pathname:'/'}}
  const doc=new JSDOM(renderToString(React.createElement(App,{initialLanguage:language}))).window.document
  const cards=doc.querySelectorAll('.intelligence-commercial > article');assert.equal(cards.length,3)
  assert.equal(cards[0].querySelector('.intelligence-number'),null)
  assert.match(cards[0].querySelector('h3').textContent,/30.932|30,932|30 932|30 932/)
  assert.equal(cards[0].querySelector('a').getAttribute('href'),'/trade-pulse')
  assert.equal(doc.querySelector('.hero-coverage strong').textContent,'121')
  global.window={location:{pathname:'/market'}}
  const market=new JSDOM(renderToString(React.createElement(App,{initialLanguage:language}))).window.document
  assert.equal(market.querySelector('.intelligence-number b').textContent,'2026-06')
  global.window={location:{pathname:'/methodology'}}
  const method=new JSDOM(renderToString(React.createElement(App,{initialLanguage:language}))).window.document
  const link=method.querySelector('a[href="/data/species-coverage-v1.json"]');assert.ok(link)
  assert.equal(link.textContent,translate(language,'Download species data coverage audit'))
 }
 console.log('Homepage-only period removal, preserved market-page context, dynamic tonnage, KPI and coverage download: six language/fallback SSR PASS. Rendered viewport QA not asserted.')
}finally{await vite.close()}
