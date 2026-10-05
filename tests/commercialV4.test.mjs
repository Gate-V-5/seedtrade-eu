import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import {latestValidPrice,eligiblePrices,snapshotCandidates,calendarSlots,rankedExporters,rankedCorridors} from '../src/commercialEvidence.mjs'
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'))
const data=read('src/generated/market_catalogue_public.json')
const sample=(period,value=2)=>({period,price_eur_kg:value,classification:'PUBLIC_SAFE',eligible:true,scope_verified:true,species_attribution_verified:true,methodology:'Verified existing price engine',scope:'Declared market scope',source:'Official evidence',source_url:'https://example.org/evidence'})
test('latest eligible prices are selected independently, never forced to global trade month',()=>{
 const a=[sample('2025-11'),sample('2025-09'),{...sample('2026-06'),eligible:false}],b=[sample('2026-05')]
 assert.equal(latestValidPrice(a).period,'2025-11');assert.equal(latestValidPrice(b).period,'2026-05')
 assert.equal(latestValidPrice([{...sample('2026-06'),scope_verified:false}]),null)
 assert.equal(latestValidPrice([sample('2026-06',null)]),null)
})
test('gaps remain empty and prices never interpolated',()=>{
 const slots=calendarSlots([sample('2025-01'),sample('2025-03')],'2025-03',3,'price_eur_kg')
 assert.equal(slots[1].point,null);assert.equal(slots.filter(x=>x.point).length,2)
})
test('snapshot evolves from catalogue, including safe price-only entities',()=>{
 const baseline=snapshotCandidates(data.cards);assert.equal(baseline.length,12)
 const future={market_entity_id:'future',public_safe_status:'PUBLIC_SAFE',trade_volume_t:null,price_observations:[sample('2025-11')]}
 assert.equal(snapshotCandidates([...data.cards,future]).length,baseline.length+1)
 assert.ok(!snapshotCandidates([...data.cards,{...future,price_observations:[]}]).includes(future))
})
test('every exporter and corridor ranking is numeric descending with top five',()=>{
 for(const c of data.cards){
 const e=rankedExporters(c.leading_exporters),r=rankedCorridors(c.major_corridors)
 assert.ok(e.length<=5&&r.length<=5)
 for(let i=1;i<e.length;i++)assert.ok(e[i-1].share_percent>=e[i].share_percent)
 for(let i=1;i<r.length;i++)assert.ok(r[i-1].volume_t>=r[i].volume_t)
 }
})
test('group scopes never acquire individual metrics or external totals',()=>{
 for(const c of data.cards.filter(c=>!['SPECIES_SPECIFIC','COMMERCIAL_ENTITY_SPECIFIC'].includes(c.customs_scope_type))){assert.equal(c.trade_volume_t,null);assert.equal(c.external_trade,null);assert.deepEqual(c.leading_exporters,[])}
})
test('external totals require verified complete evidence, missing stays absent',()=>{
 assert.equal(data.cards.filter(c=>c.external_trade).length,12)
 for(const c of data.cards){if(!c.external_trade)continue;const x=c.external_trade;assert.equal(x.source_sha256,'523fbd268bf01dd27c46a957c73c19585363a2d0ae07354453cbec91e56277d3');assert.ok(x.coverage.startsWith('COMPLETE_REQUEST_GRID'));if(x.exports.period===x.imports.period)assert.ok(Math.abs(x.balance_t-x.exports.volume_t+x.imports.volume_t)<1e-7);else{assert.equal(x.balance_t,null);assert.equal(x.period,null)}}
})
test('canonical categories, observations and KPI retained; source data not rewritten',()=>{
 assert.equal(data.cards.length,68);assert.equal(data.categories.length,6)
 assert.equal(data.eu_summary.seed_species,121);assert.equal(data.eu_summary.commercial_market_entities,136)
 assert.equal(data.eu_summary.trade_volume_t,251015.10);assert.equal(data.eu_summary.trade_value_eur,400438328)
 assert.ok(data.cards.every(c=>c.public_safe_status==='PUBLIC_SAFE'))
 assert.deepEqual(data.categories.map(c=>c.entity_count).sort((a,b)=>a-b),[3,4,12,16,29,43])
})
