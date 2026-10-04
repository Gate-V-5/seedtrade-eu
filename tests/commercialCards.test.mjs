import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import {createServer} from 'vite'
import React from 'react'
import {renderToString} from 'react-dom/server'
import {JSDOM} from 'jsdom'
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'))
const data=read('src/generated/market_catalogue_public.json'),pulse=read('src/generated/trade_pulse_public.json')
global.window={location:{pathname:'/'},localStorage:{getItem(){return null}},setInterval(){return 0},clearInterval(){}}
const vite=await createServer({appType:'custom',logLevel:'error',server:{middlewareMode:true}})
const {default:App}=await vite.ssrLoadModule('/src/AppV2.jsx')
const render=(route,lang='EN')=>{window.location.pathname=route;return new JSDOM(renderToString(React.createElement(App,{initialLanguage:lang}))).window.document}
try {
 await test('global scope uses canonical completed month and count in every language',()=>{
  for(const lang of ['EN','DE','FR','ES','IT','ZZ']){
   const d=render('/market',lang),s=d.querySelector('.catalogue-eu-summary')
   assert.equal(s.querySelectorAll('dt').length,5)
   assert.ok(s.textContent.includes('400'))
   assert.ok(s.querySelector('p').textContent.includes(String(pulse.scope.included_cn_codes.length)))
   assert.ok(s.querySelector('p').textContent.includes(pulse.latest_completed_period.slice(0,4)))
   assert.ok(!s.textContent.includes('undefined'))
  }
 })
 await test('primary cards contain no status placeholders and group metrics are absent',()=>{
  for(const category of data.categories){
   const d=render('/market/'+category.slug),grid=d.querySelector('.catalogue-seed-grid')
   assert.ok(!/Market data developing|Group-level customs scope|Production data available|Data gap|N\/A/.test(grid.textContent))
   assert.ok(!d.querySelector('main').textContent.includes('EU trade aggregate developing'))
   for(const article of grid.querySelectorAll('article')){
    const c=data.cards.find(c=>c.market_entity_id===article.dataset.entityId)
    if(c.trade_volume_t===null){assert.equal(article.querySelector('.catalogue-card-metrics'),null);assert.equal(article.querySelector('.catalogue-card-history'),null)}
    else {assert.equal(article.querySelector('.catalogue-card-history').children.length,12);assert.equal(article.querySelector('.catalogue-period').textContent,'Completed '+pulse.latest_completed_period)}
   }
  }
 })
 await test('monthly series are exact same customs scope and no missing cells are invented',()=>{
  const totals=read('src/generated/country_customs_totals.json'),rows=totals.rows.map(row=>Object.fromEntries(totals.columns.map((c,i)=>[c,row[i]])))
  for(const card of data.cards){
   const expected=rows.filter(r=>r.reporter==='EU'&&r.view==='eu_internal_trade'&&card.CN_codes.includes(r.cn8)&&r.period<=pulse.latest_completed_period)
   if(card.trade_volume_t===null){assert.deepEqual(card.trade_history,[]);continue}
   assert.ok(['SPECIES_SPECIFIC','COMMERCIAL_ENTITY_SPECIFIC'].includes(card.customs_scope_type))
   assert.equal(card.representative_price_eur_kg,null,'incompatible legacy price is not relabelled from customs unit value')
   for(const point of card.trade_history){const source=expected.filter(r=>r.period===point.period);assert.ok(source.length>0);assert.ok(Math.abs(point.volume_t-source.reduce((s,r)=>s+r.net_weight_kg/1000,0))<0.000001)}
   assert.ok(Math.abs(card.trade_history.at(-1).volume_t-Number(card.trade_volume_t))<0.000001)
  }
 })
 await test('priority identities, multi-category routes, global master and totals remain unchanged',()=>{
  const priority=read('docs/market-catalogue-v2/inputs/PRIORITY_65_CARD_DATA.json')
  assert.equal(data.cards.length,68);assert.equal(data.categories.length,6)
  assert.deepEqual(data.cards.slice(0,65).map(c=>[c.market_entity_id,c.common_name_en,c.botanical_display_name]),priority.map(c=>[c.market_entity_id,c.common_name_en,c.botanical_display_name]))
  assert.equal(data.cards.filter(c=>c.secondary_categories.length).length,39)
  assert.equal(data.eu_summary.trade_volume_t,251015.10);assert.equal(data.eu_summary.trade_value_eur,400438328)
  assert.equal(data.eu_summary.seed_species,121);assert.equal(data.eu_summary.commercial_market_entities,136)
 })
} finally {await vite.close()}
