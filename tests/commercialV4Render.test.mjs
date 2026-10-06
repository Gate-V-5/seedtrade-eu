import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import React from 'react'
import {createServer} from 'vite'
import {renderToString} from 'react-dom/server'
import {JSDOM} from 'jsdom'
const data=JSON.parse(fs.readFileSync('src/generated/market_catalogue_public.json','utf8'))
global.window={location:{pathname:'/'},localStorage:{getItem(){return null}},setInterval(){return 0},clearInterval(){}}
const vite=await createServer({appType:'custom',logLevel:'error',server:{middlewareMode:true}})
const {default:App}=await vite.ssrLoadModule('/src/AppV2.jsx')
const {SeedCard}=await vite.ssrLoadModule('/src/CommercialSeedCard.jsx')
const {default:EvidenceHistory}=await vite.ssrLoadModule('/src/CommercialHistory.jsx')
const {LanguageProvider}=await vite.ssrLoadModule('/src/i18n/index.jsx')
const render=(route,lang='EN')=>{window.location.pathname=route;return new JSDOM(renderToString(React.createElement(App,{initialLanguage:lang}))).window.document}
try {
await test('all seed routes, categories and translations retain safe market hierarchy',()=>{
 for(const lang of ['EN','DE','FR','ES','IT','ZZ']) {
 for(const cat of data.categories) { const d=render('/market/'+cat.slug,lang);assert.equal(d.querySelectorAll('.catalogue-seed-card').length,cat.entity_count);assert.ok(!/N\/A|€0\.00|Market data developing/.test(d.querySelector('main').textContent)) }
 for(const c of data.cards) { const d=render('/market/seeds/'+c.slug,lang);assert.ok(d.querySelector('h1').textContent.length>0);assert.equal(d.querySelector('.catalogue-botanical').textContent,c.botanical_display_name);assert.ok(d.querySelector('.catalogue-provenance'));assert.equal(d.querySelectorAll('.catalogue-external').length,c.external_trade?1:0);if(c.trade_history.length)assert.ok(d.querySelector('.catalogue-evidence-history')); }
 }
})
await test('price-only card displays its independent date and missing volume remains absent',()=>{
 const card={...data.cards[0],trade_volume_t:null,latest_trade_period:null,trade_history:[],price_observations:[{period:'2025-11',price_eur_kg:2.45,classification:'PUBLIC_SAFE',eligible:true,scope_verified:true,species_attribution_verified:true,methodology:'Official customs net weight unit-value fixture',scope:'Independent fixture scope',source:'Fixture',source_url:'https://example.org/fixture'}]}
 const html=renderToString(React.createElement(LanguageProvider,{initialLanguage:'EN'},React.createElement(SeedCard,{card})))
 assert.ok(html.includes('2.45'));assert.ok(html.includes('2025-11'));assert.ok(!html.includes('Trade volume'));assert.ok(!html.includes('Completed null'))
 const absent=renderToString(React.createElement(LanguageProvider,{initialLanguage:'EN'},React.createElement(SeedCard,{card:{...card,price_observations:[]}})))
 assert.ok(!absent.includes('Representative price'));assert.ok(!absent.includes('N/A'));assert.ok(!absent.includes('€0.00'))
})
await test('price chart names measure/unit, preserves absent months and actual daily dates',()=>{
 const chart=points=>new JSDOM(renderToString(React.createElement(LanguageProvider,{initialLanguage:'EN'},React.createElement(EvidenceHistory,{points,field:'price_eur_kg',title:'Trade unit value history — €/kg',unit:'€/kg',price:true})))).window.document
 const d=chart([{period:'2025-01',price_eur_kg:2},{period:'2025-03',price_eur_kg:3}]);assert.ok(d.querySelector('h2').textContent.includes('€/kg'));assert.equal(d.querySelectorAll('i').length,2);assert.ok(d.querySelector('i').title.includes('/kg'));assert.ok(d.body.textContent.includes('Latest available'));assert.ok(d.body.textContent.includes('not a seller quotation'))
 const daily=chart([{period:'2025-03-01',price_eur_kg:2},{period:'2025-03-15',price_eur_kg:3}]);assert.equal(daily.querySelectorAll('i').length,2);assert.ok(daily.body.textContent.includes('2025-03-15'))
})
await test('snapshot links to canonical seed routes and clearly labels trade bars',()=>{
 const d=render('/');const section=d.querySelector('.market-snapshot');assert.equal(section.querySelectorAll('.carousel-train>.catalogue-seed-card').length,4)
 for(const a of section.querySelectorAll('.catalogue-card-cta'))assert.ok(data.cards.some(c=>a.getAttribute('href')==='/market/seeds/'+c.slug))
 assert.ok(section.textContent.includes('EU internal trade volume — tonnes'))
})
} finally {await vite.close()}
