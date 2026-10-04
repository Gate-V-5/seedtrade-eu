import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import {createServer} from 'vite'
import React from 'react'
import {renderToString} from 'react-dom/server'
import {JSDOM} from 'jsdom'
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'))
const catalogue=read('src/generated/market_catalogue_public.json'),input=read('docs/market-catalogue-v2/inputs/PRIORITY_65_CARD_DATA.json')
global.window={location:{pathname:'/'},localStorage:{getItem(){return null}},setInterval(){return 0},clearInterval(){}}
const vite=await createServer({appType:'custom',logLevel:'error',server:{middlewareMode:true}})
const {default:App}=await vite.ssrLoadModule('/src/AppV2.jsx')
const {filterCatalogueCards}=await vite.ssrLoadModule('/src/MarketCatalogue.jsx')
const {translate}=await vite.ssrLoadModule('/src/i18n/index.jsx')
const render=(route,lang='EN')=>{window.location.pathname=route;return new JSDOM(renderToString(React.createElement(App,{initialLanguage:lang}))).window.document}
try {
 await test('65 owner-approved identities preserved and distinct commercial forms reuse biology',()=>{
  assert.equal(catalogue.cards.length,68);assert.deepEqual(catalogue.cards.slice(0,65).map(x=>[x.market_entity_id,x.botanical_display_name]),input.map(x=>[x.market_entity_id,x.botanical_display_name]))
  const by=Object.fromEntries(catalogue.cards.map(x=>[x.market_entity_id,x]));assert.equal(by['turnip-rape'].biological_species_id,by['fodder-turnip'].biological_species_id);assert.equal(by['italian-ryegrass'].biological_species_id,by['westerwold-ryegrass'].biological_species_id);assert.equal(catalogue.homepage_species_kpi,121)
 })
 await test('category-first root and exact membership cover all 65 entities without duplicating observations',()=>{
  const root=render('/market');assert.equal(root.querySelectorAll('.catalogue-category-tile').length,6);assert.ok(!root.querySelector('main').textContent.includes('Evidence for commercial seed decisions'))
  const union=new Set();let multi=0
  for(const c of catalogue.categories){const d=render('/market/'+c.slug),ids=[...d.querySelectorAll('.catalogue-seed-card')].map(x=>x.dataset.entityId);assert.deepEqual(ids,catalogue.cards.filter(x=>c.entity_ids.includes(x.market_entity_id)).map(x=>x.market_entity_id));ids.forEach(x=>union.add(x));assert.equal(new Set(ids).size,ids.length);assert.equal(d.querySelectorAll('.catalogue-summary strong')[0].textContent,String(c.entity_count));assert.equal(c.trade_volume_t,null);assert.equal(c.trade_value_eur,null);assert.ok(!d.querySelector('.catalogue-seed-grid').textContent.includes('CN '));}
  assert.deepEqual([...root.querySelectorAll('.catalogue-category-tile')].map(x=>x.getAttribute('href')),['/market/cereals-pulses','/market/fodder-amenity','/market/catch-crops','/market/oil-fibre','/market/maize-sorghum','/market/vegetables']);assert.ok(root.querySelector('.catalogue-global-kpis').textContent.includes('121'));assert.equal(root.querySelectorAll('a[href="/trade-pulse"]').length,0);assert.ok(catalogue.categories.find(x=>x.id==='VEGETABLES').entity_ids.includes('sugar-beet'));assert.ok(catalogue.categories.find(x=>x.id==='VEGETABLES').entity_ids.includes('seed-potatoes'));
  assert.equal(union.size,68);assert.equal(catalogue.cards.filter(x=>x.secondary_categories.length).length,39);assert.ok(!Object.hasOwn(catalogue,'observations'))
 })
 await test('all stable detail routes display original botanical names and missing values stay absent',()=>{
  for(const c of catalogue.cards){const d=render('/market/seeds/'+c.slug);assert.equal(d.querySelector('main h1').textContent,translate('EN',c.common_name_en));assert.equal(d.querySelector('.catalogue-botanical').textContent,c.botanical_display_name);assert.ok(d.querySelector('.catalogue-provenance'));if(c.trade_volume_t===null){assert.equal(d.querySelectorAll('.catalogue-detail-metrics').length,0);assert.ok(!d.querySelector('main').textContent.includes('0 t'));}assert.ok(!d.querySelector('main').textContent.includes('IMPORT DEPENDENT'));assert.ok(!d.querySelector('main').textContent.includes('IMPORT HEAVY'));}
 })
 await test('broad groups, commercial forms and current wheat/spelt conflict have no allocated quantities',()=>{
  for(const id of ['wheat','white-mustard','brown-mustard','black-mustard','italian-ryegrass','westerwold-ryegrass','sorghum','sudan-grass','sorghum-sudan-hybrid']){const c=catalogue.cards.find(x=>x.market_entity_id===id);assert.equal(c.trade_volume_t,null);assert.equal(c.trade_value_eur,null);assert.equal(c.representative_price_eur_kg,null)}
  assert.equal(catalogue.cards.filter(x=>x.trade_volume_t!==null).length,11);assert.ok(catalogue.cards.every(x=>!Object.hasOwn(x,'owner_market_supply_label')))
 })
 await test('all six categories and 68 detail pages render in five languages and fallback with no raw keys',()=>{
  for(const language of ['EN','DE','FR','ES','IT','ZZ']){const d=render('/market',language);assert.equal(d.querySelector('main h1').textContent,translate(language,'European Seed Market'));for(const category of catalogue.categories){const c=render('/market/'+category.slug,language);assert.equal(c.querySelector('main h1').textContent,translate(language,category.title));}for(const card of catalogue.cards){const c=render('/market/seeds/'+card.slug,language);assert.equal(c.querySelector('.catalogue-botanical').textContent,card.botanical_display_name);assert.ok(!/undefined|\[object Object\]|\{\w+\}/.test(c.querySelector('main').textContent))}}
 })
 await test('lightweight search accepts common, translated and botanical names; absent matches stay empty',()=>{
  const cards=catalogue.cards.filter(x=>catalogue.categories.find(c=>c.id==='FODDER_AMENITY').entity_ids.includes(x.market_entity_id));assert.equal(filterCatalogueCards(cards,'Trifolium pratense').length,1);assert.equal(filterCatalogueCards(cards,'red clover').length,1);assert.equal(filterCatalogueCards(cards,translate('DE','Red clover'),'DE').length,1);assert.equal(filterCatalogueCards(cards,'NO_SUCH_SEED').length,0)
 })
 await test('new category images exist and legacy homepage, production and news remain operational',()=>{
  for(const c of catalogue.categories)assert.ok(fs.statSync('public'+c.image).size>1000)
  const home=render('/');assert.ok(home.querySelector('.hero-coverage strong').textContent==='121');const prod=render('/production-intelligence');assert.ok(prod.querySelector('main'));const news=render('/news');assert.ok(news.querySelector('main'));const pulse=read('src/generated/trade_pulse_public.json');assert.equal(pulse.views.eu_internal_trade.latest.volume_tonnes,251015.10);assert.equal(pulse.views.eu_internal_trade.latest.trade_value_eur,400438328)
 })
}finally{await vite.close()}
