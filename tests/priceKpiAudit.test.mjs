import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import {latestValidPrice,snapshotCandidates,calendarSlots} from '../src/commercialEvidence.mjs'
import {compactTonnes,exactTonnes} from '../src/tradeKpiDisplay.mjs'
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'))
const data=read('src/generated/market_catalogue_public.json'),audit=read('docs/price-kpi-audit-v1/PRICE_CANDIDATE_AUDIT.json'),kpi=read('docs/price-kpi-audit-v1/GLOBAL_KPI_AUDIT.json')
test('all eight price candidates have explicit decisions; form-level allocation is rejected',()=>{
 assert.equal(audit.length,8);assert.equal(new Set(audit.map(a=>a.commercial_entity)).size,8)
 assert.equal(audit.filter(a=>a.decision==='PUBLISHABLE').length,7)
 const form=audit.find(a=>a.commercial_entity==='westerwold-ryegrass');assert.equal(form.decision,'NOT PUBLISHABLE')
 assert.equal(latestValidPrice(data.cards.find(c=>c.market_entity_id===form.commercial_entity).price_observations),null)
})
test('latest independently validated prices retain older dates instead of forcing trade month',()=>{
 for(const a of audit.filter(a=>a.decision==='PUBLISHABLE')){
  const c=data.cards.find(c=>c.market_entity_id===a.commercial_entity);const p=latestValidPrice(c.price_observations)
  assert.equal(p.period,a.latest_publishable_period);assert.equal(p.price_eur_kg,a.latest_publishable_price)
  assert.ok(c.price_observations.every(p=>p.classification==='PUBLIC_SAFE'&&p.scope_verified&&p.species_attribution_verified&&p.source_witness_id&&p.unit==='EUR_PER_KG'))
 }
 const alfalfa=data.cards.find(c=>c.market_entity_id==='alfalfa'),ryegrass=data.cards.find(c=>c.market_entity_id==='perennial-ryegrass')
 assert.equal(latestValidPrice(alfalfa.price_observations).period,'2024-12');assert.equal(latestValidPrice(ryegrass.price_observations).period,'2025-02')
 assert.equal(alfalfa.latest_trade_period,'2026-06');assert.equal(ryegrass.latest_trade_period,'2026-06')
})
test('snapshot derives from resolved catalogue and includes verified price-only species',()=>{
 assert.equal(snapshotCandidates(data.cards).length,12)
 const italian=data.cards.find(c=>c.market_entity_id==='italian-ryegrass');assert.equal(italian.trade_volume_t,null);assert.ok(latestValidPrice(italian.price_observations));assert.ok(snapshotCandidates(data.cards).includes(italian))
})
test('only witnessed observations enter histories; missing points are not invented',()=>{
 const witnesses=read('docs/price-kpi-audit-v1/PRICE_OBSERVATION_WITNESSES.json');let points=0
 for(const c of data.cards){for(const p of c.price_observations){points++;const w=witnesses.find(w=>w.id===p.source_witness_id);assert.ok(w);assert.ok(Math.abs(Number(w.value_basis_eur)/Number(w.quantity_basis_kg)-p.price_eur_kg)<1e-9);assert.ok(w.source_observation_ids.length>0)} }
 assert.equal(points,110)
 const c=data.cards.find(c=>c.market_entity_id==='alfalfa'),p=latestValidPrice(c.price_observations);const slots=calendarSlots(c.price_observations,p.period,12,'price_eur_kg');assert.ok(slots.some(s=>s.point===null))
})
test('251015.10 headline is monthly, directly sourced and double-counting-free',()=>{
 assert.equal(kpi.period_type,'SINGLE_LATEST_COMPLETED_MONTH');assert.equal(kpi.period,'2026-06');assert.equal(kpi.start,'2026-06-01');assert.equal(kpi.end,'2026-06-30')
 assert.equal(kpi.observation_count,3246);assert.equal(kpi.cn_count,40);assert.equal(kpi.double_counting_audit,'PASS');assert.equal(kpi.catalogue_card_summation,false)
 assert.equal(new Set(kpi.source_observation_ids).size,kpi.observation_count)
 assert.ok(Math.abs(Number(kpi.raw_tonnes)-data.eu_summary.trade_volume_t)<=0.005)
 assert.equal(data.eu_summary.trade_volume_t,251015.1)
})
test('compact display never modifies exact underlying tonnes',()=>{
 assert.equal(compactTonnes(data.eu_summary.trade_volume_t),'251.0k t');assert.equal(exactTonnes(data.eu_summary.trade_volume_t),'251,015.1')
 assert.equal(data.eu_summary.trade_volume_t,251015.1)
 assert.ok(fs.readFileSync('src/MarketCatalogue.jsx','utf8').includes('label="Monthly trade volume"'))
})
test('EU external blocks and safe trade evidence are preserved',()=>{
 assert.equal(data.cards.filter(c=>c.external_trade).length,10);assert.equal(data.cards.filter(c=>c.trade_volume_t!==null).length,11)
 assert.equal(data.categories.length,6);assert.equal(data.cards.length,68);assert.equal(data.eu_summary.seed_species,121);assert.equal(data.eu_summary.commercial_market_entities,136)
})
