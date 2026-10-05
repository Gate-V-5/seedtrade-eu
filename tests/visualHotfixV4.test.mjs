import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import React from 'react'
import {renderToString} from 'react-dom/server'
import {createServer} from 'vite'
import {JSDOM} from 'jsdom'
const data=JSON.parse(fs.readFileSync('src/generated/market_catalogue_public.json','utf8'))
const css=fs.readFileSync('src/marketCatalogue.css','utf8')
const vite=await createServer({appType:'custom',logLevel:'error',server:{middlewareMode:true}})
const {SeedCard}=await vite.ssrLoadModule('/src/CommercialSeedCard.jsx')
const {default:History}=await vite.ssrLoadModule('/src/CommercialHistory.jsx')
const {LanguageProvider}=await vite.ssrLoadModule('/src/i18n/index.jsx')
const render=(component,props,lang='EN')=>new JSDOM(renderToString(React.createElement(LanguageProvider,{initialLanguage:lang},React.createElement(component,props)))).window.document
try {
 await test('snapshot metric blocks use scoped normal-flow grid and independent stacked definitions',()=>{
  assert.match(css,/\.market-snapshot \.catalogue-card-metrics\{display:grid;grid-template-columns:minmax\(0,1fr\)/)
  assert.match(css,/\.catalogue-seed-card \.catalogue-card-measure>dl>\.catalogue-metric\{display:flex;flex-direction:column/)
  for(const c of data.cards.filter(c=>c.price_observations.length||c.trade_volume_t!==null)){
   const d=render(SeedCard,{card:c,snapshot:true});for(const m of d.querySelectorAll('.catalogue-card-measure'))assert.equal(m.querySelectorAll(':scope>dl>.catalogue-metric>dd').length,1)
  }
 })
 await test('vertical Snapshot retains independent compact dates and concise YoY lines',()=>{
  for(const c of data.cards.filter(c=>c.price_observations.length)){
   const d=render(SeedCard,{card:c,snapshot:true});const price=d.querySelector('.catalogue-price-measure');assert.ok(price.textContent.includes('Observed ·'));assert.equal(price.querySelector('.sr-only'),null);assert.ok(price.querySelector('dd').textContent.endsWith('/kg'));
   const expected=new Intl.DateTimeFormat('en-GB',{month:'short',year:'numeric',timeZone:'UTC'}).format(new Date(c.price_period+'-01T00:00:00Z'));assert.ok(price.textContent.includes(expected))
  }
  assert.match(css,/grid-template-rows:minmax\(100px,auto\) minmax\(70px,auto\)/);assert.match(css,/white-space:nowrap;word-break:normal/)
 })
 await test('snapshot botanical names are semantically italic in all language modes',()=>{
  for(const lang of ['EN','DE','FR','ES','IT','ZZ'])for(const c of data.cards){const d=render(SeedCard,{card:c,snapshot:true},lang);assert.equal(d.querySelector('.catalogue-botanical em').textContent,c.botanical_display_name);assert.equal(d.querySelector('h3 em'),null)}
 })
 await test('both chart measures align axis to plot and retain precise observed periods and gaps',()=>{
  assert.match(css,/\.catalogue-history-chart\{display:grid;grid-template-columns:48px minmax\(0,1fr\)/)
  for(const [field,price,unit] of [['price_eur_kg',true,'€/kg'],['volume_t',false,'t']]){
   const points=[{period:'2025-01',[field]:2},{period:'2025-03',[field]:3}];const d=render(History,{points,field,price,unit,title:price?'Representative seed price history — €/kg':'EU internal trade volume — tonnes'});
   const chart=d.querySelector('.catalogue-history-chart');assert.equal(chart.children.length,2);assert.equal(chart.querySelectorAll('i').length,2);
   for(const slot of chart.querySelectorAll('.catalogue-history-slot')){const label=slot.querySelector('small');assert.equal(label.textContent,label.dataset.period);const bar=slot.querySelector('i');if(bar)assert.ok(bar.title.startsWith(label.dataset.period+':'));else assert.ok(!points.some(p=>p.period===label.dataset.period))}
   assert.equal(chart.querySelector('.catalogue-axis-unit').textContent,unit)
  }
 })
} finally {await vite.close()}
