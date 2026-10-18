import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import React from 'react'
import {renderToString} from 'react-dom/server'
import {createServer} from 'vite'
import {JSDOM} from 'jsdom'
import {rangePresentation,rangeCopy} from '../src/estimatedMarketRange.mjs'
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'))
const records=read('src/generated/estimated_market_ranges_public.json').records
const catalogue=read('src/generated/market_catalogue_public.json')
const ids=Object.keys(records),categories=catalogue.categories.filter(c=>['CATCH_CROP','FODDER_AMENITY'].includes(c.id))
await test('exactly 53 canonical commercial card records and 19 shared appearances',()=>{
 assert.equal(ids.length,53);assert.equal(new Set(categories.flatMap(c=>c.entity_ids)).size,53)
 assert.equal(categories[0].entity_ids.filter(id=>categories[1].entity_ids.includes(id)).length,19)
 assert.equal(ids.filter(id=>records[id].state==='RANGE').length,51)
 assert.equal(ids.filter(id=>records[id].state==='DISCOVERY').length,2)
})
await test('public projection has only bounds and state, no source asks or internal evidence',()=>{
 for(const record of Object.values(records))assert.deepEqual(Object.keys(record).sort(),['lower_eur_kg','state','upper_eur_kg'])
 assert.equal(rangePresentation('not-scoped'),null)
 assert.equal(rangePresentation('sorghum').value,'Price discovery in progress')
 assert.match(rangePresentation('red-clover').value,/^€\d+\.\d{2} – €\d+\.\d{2}\/kg$/)
})
const vite=await createServer({appType:'custom',logLevel:'error',server:{middlewareMode:true}})
try{
 const {SeedCard}=await vite.ssrLoadModule('/src/CommercialSeedCard.jsx')
 const {default:MarketCatalogue}=await vite.ssrLoadModule('/src/MarketCatalogue.jsx')
 const {LanguageProvider}=await vite.ssrLoadModule('/src/i18n/index.jsx')
 const render=(child,language)=>new JSDOM(renderToString(React.createElement(LanguageProvider,{initialLanguage:language},child))).window.document
 for(const language of ['EN','DE','FR','ES','IT']){
  await test(`all 53 cards render exactly one localized two-state range: ${language}`,()=>{
   for(const id of ids){const card=catalogue.cards.find(c=>c.market_entity_id===id),doc=render(React.createElement(SeedCard,{card}),language)
    const price=doc.querySelector('[data-estimated-range]');assert.ok(price,id);assert.equal(doc.querySelectorAll('[data-estimated-range]').length,1)
    assert.equal(price.querySelector('dt').textContent,rangeCopy[language][0]);assert.equal(price.querySelector('dd').textContent,rangePresentation(id,language).value)
    assert.equal(doc.querySelector('.catalogue-botanical').textContent,card.botanical_display_name)
    assert.ok(!price.textContent.includes('LIVE'));assert.equal(doc.querySelector('.catalogue-seed-price-measure'),null);assert.equal(doc.querySelector('.catalogue-card-cta').getAttribute('href'),`/market/seeds/${card.slug}`)
   }
  })
  await test(`category overlap, complete card count and same price in both appearances: ${language}`,()=>{
   const rendered=categories.map(c=>render(React.createElement(MarketCatalogue,{path:`/market/${c.slug}`}),language))
   categories.forEach((c,i)=>assert.equal(rendered[i].querySelectorAll('[data-estimated-range]').length,c.entity_ids.length))
   for(const id of categories[0].entity_ids.filter(id=>categories[1].entity_ids.includes(id))){const selector=`[data-entity-id="${id}"] [data-estimated-range]`;assert.equal(rendered[0].querySelector(selector).textContent,rendered[1].querySelector(selector).textContent)}
  })
  await test(`all 53 detail pages retain botanical names and show same two-state range: ${language}`,()=>{
   for(const id of ids){const card=catalogue.cards.find(c=>c.market_entity_id===id),doc=render(React.createElement(MarketCatalogue,{path:`/market/seeds/${card.slug}`}),language)
    assert.equal(doc.querySelectorAll('[data-estimated-range]').length,1,id);assert.equal(doc.querySelector('[data-estimated-range] dd').textContent,rangePresentation(id,language).value,id)
    assert.equal(doc.querySelector('.catalogue-botanical').textContent,card.botanical_display_name,id)
   }
  })
 }
}finally{await vite.close()}
