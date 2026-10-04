import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'))
test('customs groups retain one measured series rather than species allocations',()=>{
 const d=read('src/generated/trade_cn_public.json'),rows=read('data/trade-cn-v1/comext-normalized.json'),links=read('docs/trade-cn-v1/SPECIES_CN_TRADE_MAP.json')
 const e=d.entities.find(x=>x.cn8==='12092280');assert.equal(e.granularity,'GROUP_LEVEL');assert.ok(e.species_ids.length>1)
 assert.equal(e.periods.length,rows.filter(x=>x.cn8===e.cn8).length)
 assert.ok(links.filter(x=>x.cn8===e.cn8).every(x=>x.mapping_status==='GROUP_LEVEL'))
 assert.ok(e.periods.every(x=>x.representative_price_eur_kg===null))
})
test('partial and missing coverage are kept explicit without modifying baseline KPIs',()=>{
 const d=read('src/generated/trade_cn_public.json'),a=read('docs/trade-cn-v1/CN_AUDIT_121.json')
 assert.equal(d.summary.DISTINCT_SEED_SPECIES,121);assert.equal(d.summary.CATCH_CROP_SPECIES,52)
 assert.equal(a.find(x=>x.canonical_species_id==='maize').proposed_cn_status,'PARTIAL')
 assert.equal(a.find(x=>x.canonical_species_id==='chickpea').sowing_status,'NOT_SOWING_SPECIFIC')
 assert.equal(a.find(x=>x.canonical_species_id==='phacelia').proposed_cn_status,'REVIEW_REQUIRED')
 assert.equal(d.summary.SPECIES_WITH_TRADE_DATA_AFTER,20);assert.equal(d.summary.FULL_SPECIES_SPECIFIC_TRADE,16);assert.equal(d.summary.PARTIAL_SPECIES_SCOPE,4);assert.equal(d.summary.GROUP_LEVEL_ONLY,78);assert.equal(d.summary.NO_COMPATIBLE_TRADE_DATA,23)
})
