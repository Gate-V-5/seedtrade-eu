import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import {stage1Summary,authorizedOfferCount,verifiedFreshUpdate} from '../src/stage1Metrics.mjs'
import {stage1Rows} from '../src/i18n/stage1Messages.js'
import {messages} from '../src/i18n/messages.js'
const read=name=>JSON.parse(fs.readFileSync(new URL('../src/generated/'+name,import.meta.url),'utf8'))
const pulse=read('trade_pulse_public.json'),species=read('crop_master_summary.json'),weather=read('weather_public.json'),listings=read('rfqs_public.json')
test('canonical species and actual supported regions; all three values share Pulse period',()=>{
  const s=stage1Summary({pulse,species,weather,listings})
  assert.equal(s.species,121);assert.equal(s.weatherRegions,new Set(weather.regions.map(x=>x.code)).size)
  assert.equal(s.tradeValue,Object.values(pulse.views).reduce((a,v)=>a+v.latest.trade_value_eur,0))
  assert.equal(s.internalVolume,pulse.views.eu_internal_trade.latest.volume_tonnes)
  assert.equal(s.offers,0)
})
test('mixed reporting windows are unavailable, never combined',()=>{
  const bad=structuredClone(pulse);bad.views.eu_imports.latest.period='1900-01'
  const s=stage1Summary({pulse:bad,species,weather,listings})
  assert.equal(s.tradeValue,null);assert.equal(s.internalVolume,null);assert.equal(s.countries,null)
})
test('offer count excludes demos, unapproved sources, future/expired/withdrawn and duplicate records',()=>{
  const genuine={listing_id:'synthetic-only',listing_type:'OFFER',status:'ACTIVE',classification:'PUBLIC_SAFE',is_demo:false,publication_date:'2026-11-01',expiry_date:'2026-12-01',publication_authorization:{status:'APPROVED',evidence_reference:'isolated-fixture'},genuine_source:{status:'VERIFIED'}}
  const source={items:[genuine,{...genuine},...[
    {is_demo:true},{listing_type:'BUY_REQUEST'},{status:'WITHDRAWN'},{classification:'INTERNAL'},
    {publication_date:'2026-12-01'},{expiry_date:'invalid'},{expiry_date:'2026-11-15'},
    {publication_authorization:{status:'APPROVED'}},{genuine_source:null},
  ].map((change,i)=>({...genuine,listing_id:'fixture-'+i,...change}))]}
  assert.equal(authorizedOfferCount(source,new Date('2026-11-16T00:00:00Z')),1)
  assert.equal(authorizedOfferCount({items:[]}),0);assert.equal(authorizedOfferCount({}),null)
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
