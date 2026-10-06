import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import {createServer} from 'vite'
import React from 'react'
import {renderToString} from 'react-dom/server'
import {JSDOM} from 'jsdom'
const data=JSON.parse(fs.readFileSync('src/generated/market_catalogue_public.json','utf8'))
global.window={location:{pathname:'/'},localStorage:{getItem(){return null}},setInterval(){return 0},clearInterval(){}}
const vite=await createServer({appType:'custom',logLevel:'error',server:{middlewareMode:true}})
const {default:App}=await vite.ssrLoadModule('/src/AppV2.jsx')
const render=(route,lang='EN')=>{window.location.pathname=route;return new JSDOM(renderToString(React.createElement(App,{initialLanguage:lang}))).window.document}
try {
 await test('monthly KPI exposes compact number and exact accessible value in six language modes',()=>{
  for(const lang of ['EN','DE','FR','ES','IT','ZZ']){const d=render('/market',lang),dd=d.querySelectorAll('.catalogue-global-kpis dd')[2];assert.ok(dd.textContent.includes('k t'));assert.ok(dd.getAttribute('title').includes('251'));assert.ok(dd.getAttribute('aria-label').includes('251'));assert.ok(!d.querySelector('main').textContent.includes('undefined'));assert.ok(d.querySelector('.catalogue-eu-summary>p').textContent.includes('40'))}
  const d=render('/market');assert.equal(d.querySelectorAll('.catalogue-global-kpis dd')[2].textContent,'251.0k t');assert.equal(d.querySelectorAll('.catalogue-global-kpis dd')[2].title,'251,015.1 tonnes');assert.equal(d.querySelectorAll('.catalogue-global-kpis dt')[2].textContent,'Monthly trade volume');assert.equal(d.querySelector('.catalogue-eu-summary>p').textContent,'EU internal seed trade · 40 sowing CN codes · June 2026')
 })
 await test('older price dates, no form price, histories and Latin names remain explicit',()=>{
  for(const c of data.cards.filter(c=>c.price_observations.length)){const d=render('/market/seeds/'+c.slug);assert.ok(d.body.textContent.includes(c.price_period));assert.ok(d.body.textContent.includes(c.botanical_display_name));assert.ok(d.body.textContent.includes('Trade unit value history — €/kg'));assert.ok(d.body.textContent.includes('not a seller quotation'))}
  const d=render('/market/seeds/westerwold-ryegrass');assert.ok(!d.body.textContent.includes('Trade unit value history — €/kg'));assert.ok(!d.body.textContent.includes('€0.00'))
 })
} finally {await vite.close()}
