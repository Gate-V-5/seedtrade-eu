import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import {marketCardNameRows} from '../src/i18n/marketCardNames.js'
import {messages} from '../src/i18n/messages.js'
const catalogue=JSON.parse(fs.readFileSync('src/generated/market_catalogue_public.json'))
const range=JSON.parse(fs.readFileSync('src/generated/estimated_market_ranges_public.json')).records
const scoped=catalogue.cards.filter(c=>Object.hasOwn(range,c.market_entity_id))
await test('new common-name keys belong only to existing scoped market cards; taxonomy stays canonical',()=>{
 assert.equal(marketCardNameRows.length,46);assert.equal(new Set(marketCardNameRows.map(r=>r[0])).size,46)
 for(const row of marketCardNameRows){assert.equal(row.length,5);assert.ok(scoped.some(c=>c.common_name_en===row[0]));assert.ok(row.every(s=>typeof s==='string'&&s.trim()===s&&s.length>0))}
})
await test('all 53 scoped headings have explicit DE FR ES IT translations, including legitimate cognates',()=>{
 assert.equal(scoped.length,53)
 for(const card of scoped)for(const language of ['DE','FR','ES','IT'])assert.ok(Object.hasOwn(messages[language],card.common_name_en),language+':'+card.common_name_en)
})
await test('commercial forms retain distinct localized headings and never replace Latin identities',()=>{
 for(const language of ['DE','FR','ES','IT']){
  assert.notEqual(messages[language]['Fodder turnip'],messages[language]['Turnip rape'])
  assert.notEqual(messages[language]['Italian ryegrass'],messages[language]['Westerwold ryegrass'])
  assert.notEqual(messages[language]['White clover'],messages[language]['White sweet clover'])
 }
 assert.equal(catalogue.cards.find(c=>c.market_entity_id==='fodder-turnip').botanical_display_name,'Brassica rapa')
})
