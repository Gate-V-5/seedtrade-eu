import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import {listingTrading} from '../src/listingTrading.mjs'
import {eligiblePublicListings} from '../src/stage1Metrics.mjs'
import {marketplaceStage6Rows} from '../src/i18n/marketplaceStage6Messages.js'

test('public read adapter preserves explicit classification and never infers commodity or seed from crop',()=>{
 for(const direction of ['OFFER','BUY_REQUEST'])for(const productType of ['CERTIFIED_SEED','COMMODITY']){
  const view=listingTrading({listingDirection:direction,productType,certificationCategory:'C',price:'3',price_unit:'kg'})
  assert.equal(view.direction,direction);assert.equal(view.productType,productType)
  assert.equal(view.certification,productType==='CERTIFIED_SEED'?'C':null)
 }
 assert.equal(listingTrading({crop:'Wheat'}).productType,null)
 assert.equal(listingTrading({crop:'Wheat',certification_category:'C1'}).productType,'CERTIFIED_SEED')
})
test('missing optional values stay absent, no quantity invention or unsupported unit conversion',()=>{
 const v=listingTrading({listingDirection:'BUY_REQUEST',productType:'COMMODITY',price:'.80',price_unit:'kg'})
 assert.equal(v.quantity,null);assert.equal(v.origin,null);assert.equal(v.organic,null);assert.equal(v.delivery,null);assert.equal(v.packaging,null);assert.equal(v.price,'€0.80/kg')
 assert.equal(listingTrading({price:'134.90',price_unit:'50,000 seeds'}).price,'€134.90/50,000 seeds')
 assert.equal(listingTrading({price:'not-a-number'}).price,null)
})
test('five genuine legacy listings retain terms, authorization and eligibility without owner drafts',()=>{
 const data=JSON.parse(fs.readFileSync(new URL('../src/generated/rfqs_public.json',import.meta.url)))
 const before=structuredClone(data);const eligible=eligiblePublicListings(data,new Date('2026-11-19T12:00:00Z'))
 assert.equal(eligible.length,5);assert.equal(new Set(eligible.map(i=>i.slug)).size,5)
 assert.deepEqual(eligible.map(i=>listingTrading(i).price),['€1.40/kg','€1.60/kg','€1.60/kg','€1.60/kg','€5.50/kg'])
 assert.deepEqual(data,before);assert(!data.items.some(i=>i.species_botanical_name==='Silybum marianum'))
})
test('new commercial and quality labels have all four additional language versions',()=>{
 const required=['FOR SALE · OFFER','TO BUY · DEMAND','CERTIFIED SEED','COMMODITY','Declared Product Quality','Required Product Quality','Minimum','Maximum','Exact','Packaging','Delivery terms','Milk Thistle']
 for(const key of required){const row=marketplaceStage6Rows.find(r=>r[0]===key);assert(row,key);assert.equal(row.length,5);assert(row.every(s=>typeof s==='string'&&s.length>0))}
})
