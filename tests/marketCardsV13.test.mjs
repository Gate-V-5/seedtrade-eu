import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import data from '../src/generated/estimated_market_ranges_public.json' with {type:'json'}
import {priceContextCopy,historicalContextCopy,rangePresentation} from '../src/estimatedMarketRange.mjs'
test('corrected V1.3 bounds, root turnip and sorghum remain discovery',()=>{
 for(const [id,low,high] of [['dill','12.80','19.20'],['hemp','7.95','9.40']]){
  assert.equal(data.records[id].lower_eur_kg,low);assert.equal(data.records[id].upper_eur_kg,high)
 }
 assert.equal(data.records.sorghum.state,'DISCOVERY');assert.equal(data.records['fodder-turnip'].state,'DISCOVERY')
})
test('five localized date contexts distinguish estimates from historic evidence',()=>{
 for(const lang of ['EN','DE','FR','ES','IT']){
  assert.ok(priceContextCopy[lang]);assert.ok(historicalContextCopy[lang]);assert.ok(!priceContextCopy[lang].includes('LIVE'))
  assert.equal(rangePresentation('sorghum',lang).state,'DISCOVERY')
 }
 const source=readFileSync(new URL('../src/SnapshotIntelligence.jsx',import.meta.url),'utf8')
 assert.ok(source.includes('historicalContextCopy[language]'))
 assert.ok(!source.includes('!compact&&<p className="snapshot-as-of"'))
})
