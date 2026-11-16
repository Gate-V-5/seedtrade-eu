import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import {createHash} from 'node:crypto'
import {stage1Summary,authorizedOfferCount,eligiblePublicListings,verifiedFreshUpdate} from '../src/stage1Metrics.mjs'
import {stage1Rows} from '../src/i18n/stage1Messages.js'
import {messages} from '../src/i18n/messages.js'
const read=name=>JSON.parse(fs.readFileSync(new URL('../src/generated/'+name,import.meta.url),'utf8'))
const pulse=read('trade_pulse_public.json'),species=read('crop_master_summary.json'),weather=read('weather_public.json'),listings=read('rfqs_public.json')
test('canonical species and actual supported regions; all three values share Pulse period',()=>{
  const s=stage1Summary({pulse,species,weather,listings})
  assert.equal(s.species,121);assert.equal(s.weatherRegions,new Set(weather.regions.map(x=>x.code)).size)
  assert.equal(s.tradeValue,Object.values(pulse.views).reduce((a,v)=>a+v.latest.trade_value_eur,0))
  assert.equal(s.internalVolume,pulse.views.eu_internal_trade.latest.volume_tonnes)
  assert.equal(s.offers,eligiblePublicListings(listings).filter(row=>row.listing_type==='OFFER').length)
})
test('mixed reporting windows are unavailable, never combined',()=>{
  const bad=structuredClone(pulse);bad.views.eu_imports.latest.period='1900-01'
  const s=stage1Summary({pulse:bad,species,weather,listings})
  assert.equal(s.tradeValue,null);assert.equal(s.internalVolume,null);assert.equal(s.countries,null)
})
test('offer count excludes demos, unapproved sources, future/expired/withdrawn and duplicate records',()=>{
  const genuine={listing_id:'synthetic-only',listing_type:'OFFER',status:'ACTIVE',classification:'PUBLIC_SAFE',is_demo:false,quantity:1,quantity_unit:'t',publication_date:'2026-11-01',expiry_date:'2026-12-01',publication_authorization:{status:'APPROVED',evidence_reference:'isolated-fixture'},genuine_source:{status:'VERIFIED'}}
  const source={items:[genuine,{...genuine},...[
    {is_demo:true},{listing_type:'BUY_REQUEST'},{status:'WITHDRAWN'},{classification:'INTERNAL'},
    {publication_date:'2026-12-01'},{expiry_date:'invalid'},{expiry_date:'2026-11-15'},
    {publication_authorization:{status:'APPROVED'}},{genuine_source:null},
    {status:'DRAFT'},{quantity:0},{quantity:-1},{quantity:'1'},{quantity_unit:1},
    {expires_at:'2026-11-15'},{publication_authorization:{status:'REVOKED',evidence_reference:'isolated-fixture'}},
  ].map((change,i)=>({...genuine,listing_id:'fixture-'+i,...change}))]}
  assert.equal(authorizedOfferCount(source,new Date('2026-11-16T00:00:00Z')),1)
  assert.equal(authorizedOfferCount({items:[]}),0);assert.equal(authorizedOfferCount({}),null)
})

test('owner-confirmed legacy records share display eligibility, respect withdrawal/expiry, and never use cached counters',()=>{
  const now=new Date('2026-11-16T12:00:00Z'),rows=eligiblePublicListings(listings,now)
  assert.deepEqual(rows.map(r=>r.listing_id),Array.from({length:5},(_,i)=>`ST-OFFER-20260923-${String(i+1).padStart(3,'0')}`))
  assert(rows.every(r=>r.publication_authorization.evidence_reference==='OWNER_STAGE1_LEGACY_OFFERS_2026_11_16' && r.genuine_source.verification_method==='OWNER_CONFIRMATION'))
  const changed=structuredClone(listings);changed.counters.offers=999
  changed.items[0].status='WITHDRAWN';changed.items[1].expiry_date=now.toISOString()
  changed.items.push({...changed.items[2]}, {...changed.items[3],listing_id:'marketplace-v1-draft',status:'DRAFT'}, null)
  assert.equal(authorizedOfferCount(changed,now),3)
  assert.equal(eligiblePublicListings(changed,now).length,3)
  changed.items[2].publication_authorization.status='REVOKED'
  assert.equal(authorizedOfferCount(changed,now),2)
  assert.equal(authorizedOfferCount({items:[]},now),0)
})

test('public listing snapshot is hash-bound; existing fields and canonical species remain intact',()=>{
  const manifest=read('public_data_manifest.json')
  assert.equal(manifest.datasets.marketplace.sha256,createHash('sha256').update(fs.readFileSync(new URL('../src/generated/rfqs_public.json',import.meta.url))).digest('hex'))
  for(const item of listings.items){assert(item.species_id===item.species_master_id);assert(['flax','winter-vetch','red-clover'].includes(item.species_master_id))}
})
test('freshness requires independently sourced timestamp, not generation or check time',()=>{
  const now=new Date('2026-11-16T00:00:00Z')
  const p={generated_at:now.toISOString(),refresh:{last_check_at:now.toISOString(),source_timestamp_verified:true,source_updated_at:'2026-11-13T00:00:00Z'}}
  assert.equal(verifiedFreshUpdate(p,now),true)
  for(const change of [{source_timestamp_verified:false},{source_updated_at:'2026-11-17T00:00:00Z'},{source_updated_at:'2026-11-08T23:59:59Z'},{source_updated_at:'invalid'}])assert.equal(verifiedFreshUpdate({...p,refresh:{...p.refresh,...change}},now),false)
})
test('all Stage 1 phrases have explicit DE FR ES IT translations and preserve placeholders',()=>{
  for(const row of stage1Rows){assert.equal(row.length,5);for(const [i,lang] of ['DE','FR','ES','IT'].entries()){assert(Object.hasOwn(messages[lang],row[0]));const t=messages[lang][row[0]];assert(t);assert.equal(t,row[i+1]);assert.deepEqual(t.match(/\{\w+\}/g)||[],row[0].match(/\{\w+\}/g)||[])}}
})
