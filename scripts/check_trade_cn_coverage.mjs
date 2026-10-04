import assert from 'node:assert/strict'
import fs from 'node:fs'
import React from 'react'
import {renderToString} from 'react-dom/server'
import {JSDOM} from 'jsdom'
import {createServer} from 'vite'
const v=await createServer({appType:'custom',server:{middlewareMode:true},logLevel:'error'})
try {
 const {default:App}=await v.ssrLoadModule('/src/AppV2.jsx'),{translate}=await v.ssrLoadModule('/src/i18n/index.jsx')
 for(const lang of ['EN','DE','FR','ES','IT','UNKNOWN']){
  global.window={location:{pathname:'/market'}}
  const doc=new JSDOM(renderToString(React.createElement(App,{initialLanguage:lang}))).window.document
  const panel=doc.querySelector('[aria-labelledby="trade-coverage-heading"]');assert.ok(panel)
  assert.equal(panel.querySelector('h2').textContent,translate(lang,'Species and trade groups'))
  assert.equal(panel.querySelectorAll('select').length,5);assert.ok(panel.textContent.includes('12092280'))
  assert.ok(panel.textContent.includes(translate(lang,'A customs group includes multiple species. Its trade is never allocated to individual species.')))
  assert.ok(panel.textContent.includes('Trifolium repens'));assert.ok(doc.querySelector('.intelligence-number'))
  global.window={location:{pathname:'/'}}
  const home=new JSDOM(renderToString(React.createElement(App,{initialLanguage:lang}))).window.document
  assert.equal(home.querySelector('.hero-coverage strong').textContent,'121');assert.equal(home.querySelector('.intelligence-number'),null)
 }
 console.log('Trade/CN panel, customs group disclosure, scope and homepage guards: six language/fallback SSR PASS; no rendered-width assertion.')
}finally{await v.close()}
