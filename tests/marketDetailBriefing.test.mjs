import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import React from 'react'
import {renderToString} from 'react-dom/server'
import {createServer} from 'vite'
import {JSDOM} from 'jsdom'
const catalogue=JSON.parse(fs.readFileSync('src/generated/market_catalogue_public.json'))
const projection=JSON.parse(fs.readFileSync('src/generated/snapshot_intelligence_public.json'))
const original=fs.readFileSync('src/generated/snapshot_intelligence_public.json')
const vite=await createServer({appType:'custom',logLevel:'error',server:{middlewareMode:true}})
const {default:Catalogue}=await vite.ssrLoadModule('/src/MarketCatalogue.jsx')
const {LanguageProvider,translate}=await vite.ssrLoadModule('/src/i18n/index.jsx')
const {detailPilotIds,briefingLabel}=await vite.ssrLoadModule('/src/MarketDetailBriefing.jsx')
const render=(c,lang)=>new JSDOM(renderToString(React.createElement(LanguageProvider,{initialLanguage:lang},React.createElement(Catalogue,{path:'/market/seeds/'+c.slug})))).window.document
try{
await test('exactly twelve approved markets use one reusable architecture, other routes remain unchanged',()=>{
 assert.equal(projection.records.filter(r=>detailPilotIds.includes(r.entity_id)&&r.presentation==='MARKET_WATCH').length,11);assert.equal(projection.records.filter(r=>detailPilotIds.includes(r.entity_id)&&r.presentation==='MARKET_SITUATION').length,1);
 assert.deepEqual(detailPilotIds,['barley','red-clover','flax','sunflower','rye','italian-ryegrass','perennial-ryegrass','meadow-fescue','field-pea','alfalfa','soybean','fodder-beet'])
 for(const c of catalogue.cards)assert.equal(Boolean(render(c,'EN').querySelector('.market-detail-briefing')),detailPilotIds.includes(c.market_entity_id))
})
await test('pilot briefing preserves all approved Intelligence, dates, botanical names and translations',()=>{
 for(const lang of ['EN','DE','FR','ES','IT','ZZ'])for(const id of detailPilotIds){
 const c=catalogue.cards.find(c=>c.market_entity_id===id),r=projection.records.find(r=>r.entity_id===id),d=render(c,lang)
 assert.equal(d.querySelector('.catalogue-botanical em').textContent,c.botanical_display_name)
 assert.equal(d.querySelector('.snapshot-situation').textContent,translate(lang,r.market_situation))
 assert.deepEqual([...d.querySelectorAll('.snapshot-watch li')].map(n=>n.textContent),r.market_watch.map(k=>translate(lang,k)))
 assert.equal(d.querySelector('.snapshot-b2b p')?.textContent??null,r.b2b_view?translate(lang,r.b2b_view):null)
 assert.equal(d.querySelector('header time').getAttribute('datetime'),r.as_of)
 assert.equal(d.querySelector('.snapshot-intelligence').dataset.presentation,r.presentation)
 assert.equal(d.querySelector('.briefing-evidence summary').textContent,briefingLabel('Evidence & sources',lang))
 for(const key of ['Market briefing','Trade & value','Supply evidence','Evidence & sources']){assert.ok(d.body.textContent.includes(briefingLabel(key,lang)));if(!['EN','ZZ'].includes(lang))assert.notEqual(briefingLabel(key,lang),key)}
 if(id==='sunflower'){assert.equal(d.querySelector('.snapshot-watch'),null);assert.equal(d.querySelector('.snapshot-b2b'),null);assert.ok(d.querySelector('.snapshot-latest'))}
 assert.ok(!/Tier [ABCD]|GlobalWits|Market pressure|Market outlook|Representative price|Seed price/.test(d.body.textContent))
 }
})
await test('pilot status, as-of and primary KPIs occur once; limitations stay secondary',()=>{
 for(const lang of ['EN','DE','FR','ES','IT'])for(const id of detailPilotIds){
 const c=catalogue.cards.find(c=>c.market_entity_id===id),d=render(c,lang),r=projection.records.find(r=>r.entity_id===id)
 assert.equal(d.querySelectorAll('.briefing-status-label').length,1)
 assert.equal(d.querySelectorAll('.snapshot-intelligence-badge').length,0)
 assert.equal(d.querySelectorAll('.snapshot-as-of').length,1)
 assert.equal([...d.querySelectorAll('.catalogue-metric dt')].filter(n=>n.textContent===translate(lang,'Trade unit value')).length,c.price_observations.some(p=>p.eligible&&p.classification==='PUBLIC_SAFE')?1:0)
 assert.equal([...d.querySelectorAll('.catalogue-metric dt')].filter(n=>n.textContent===translate(lang,'Trade volume')).length,c.trade_volume_t==null?0:1)
 assert.equal(d.querySelectorAll('.snapshot-intelligence time').length,0)
 const driver=d.querySelector('.briefing-drivers');if(id==='sunflower'){assert.ok(driver);assert.equal(driver.querySelectorAll('dt').length,1);assert.equal(driver.querySelector('dd').textContent,translate(lang,r.market_situation).split('. ')[0]+'.')}else assert.equal(driver,null)
 for(const key of ['Historical seed evidence; not available stock.','Customs shipment value, not a seed offer.']){assert.ok(d.querySelector('.briefing-evidence').textContent.includes(briefingLabel(key,lang)));assert.ok(!driver?.textContent.includes(briefingLabel(key,lang)))}
 assert.equal(d.querySelector('.briefing-evidence').hasAttribute('open'),false)
 }
})
await test('verified trade histories, source links and independent periods remain available without weather inventions',()=>{
 for(const id of detailPilotIds){const c=catalogue.cards.find(c=>c.market_entity_id===id),d=render(c,'EN');assert.ok(d.querySelector('#briefing-trade'));assert.ok(d.querySelector('#briefing-supply'));if(c.price_observations.some(p=>p.eligible&&p.classification==='PUBLIC_SAFE')){assert.ok(d.body.textContent.includes('Trade unit value'));assert.ok(d.body.textContent.includes('Trade unit value history — €/kg'));}assert.ok(d.querySelector('.briefing-evidence a[href="/methodology"]'));for(const s of c.sources)assert.ok([...d.querySelectorAll('.briefing-evidence a')].some(a=>a.getAttribute('href')===s.url));assert.ok(!d.body.textContent.includes('Weather / Crop'));assert.ok(!d.body.textContent.includes('N/A'))}
 assert.deepEqual(fs.readFileSync('src/generated/snapshot_intelligence_public.json'),original)
})
}finally{await vite.close()}
