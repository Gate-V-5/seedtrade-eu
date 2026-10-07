import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import React from 'react'
import {renderToString} from 'react-dom/server'
import {createServer} from 'vite'
import {JSDOM} from 'jsdom'
import {snapshotCandidates,latestTradeUnitValue,latestSeedPrice,eligibleTradeUnitValues} from '../src/commercialEvidence.mjs'
const catalogue=JSON.parse(fs.readFileSync('src/generated/market_catalogue_public.json'))
const projection=JSON.parse(fs.readFileSync('src/generated/snapshot_intelligence_public.json'))
const cards=snapshotCandidates(catalogue.cards),langs=['EN','DE','FR','ES','IT','ZZ']
const vite=await createServer({appType:'custom',logLevel:'error',server:{middlewareMode:true}})
const {SeedCard}=await vite.ssrLoadModule('/src/CommercialSeedCard.jsx')
const {default:Train}=await vite.ssrLoadModule('/src/SnapshotCardTrain.jsx')
const {default:Catalogue}=await vite.ssrLoadModule('/src/MarketCatalogue.jsx')
const {LanguageProvider,translate}=await vite.ssrLoadModule('/src/i18n/index.jsx')
const {snapshotIntelligenceRows}=await vite.ssrLoadModule('/src/i18n/snapshotIntelligence.js')
const {snapshotCompactCopy}=await vite.ssrLoadModule('/src/i18n/snapshotCompactCopy.js')
const render=(component,props,lang='EN')=>new JSDOM(renderToString(React.createElement(LanguageProvider,{initialLanguage:lang},React.createElement(component,props)))).window.document
try {
await test('automatic eligibility and approved 11 Watch / 1 Situation distribution are preserved',()=>{
 assert.equal(cards.length,12);assert.deepEqual(cards.map(c=>c.market_entity_id),projection.records.map(r=>r.entity_id));assert.equal(projection.records.filter(r=>r.presentation==='MARKET_WATCH').length,11)
 for(const c of cards){const d=render(SeedCard,{card:c,snapshot:true}),r=projection.records.find(r=>r.entity_id===c.market_entity_id),intel=d.querySelector('.snapshot-intelligence');assert.equal(intel.dataset.presentation,r.presentation);assert.equal(intel.querySelectorAll('li').length,0);assert.equal(intel.querySelectorAll('.snapshot-b2b,.snapshot-watch,.snapshot-latest,.snapshot-as-of').length,0);assert.equal(intel.querySelectorAll('.snapshot-situation').length,1)}
})
await test('all entity identities, evidence dates and Explore URLs are correct in all languages and fallback',()=>{
 for(const lang of langs)for(const c of cards){const d=render(SeedCard,{card:c,snapshot:true},lang),r=projection.records.find(r=>r.entity_id===c.market_entity_id);assert.equal(d.querySelector('.catalogue-botanical em').textContent,c.botanical_display_name);const detail=render(Catalogue,{path:'/market/seeds/'+c.slug},lang);const time=detail.querySelector('.snapshot-as-of time');assert.equal(time.getAttribute('datetime'),r.as_of);assert.equal(time.dataset.precision,r.as_of_precision);if(r.as_of_precision==='YEAR')assert.equal(time.textContent,r.as_of);assert.equal(d.querySelector('.catalogue-card-cta').getAttribute('href'),'/market/seeds/'+c.slug)}
})
await test('primary copy excludes tiers, confidence, methodological states, pressure, outlook and private evidence',()=>{
 for(const lang of langs)for(const c of cards){const d=render(SeedCard,{card:c,snapshot:true},lang),text=d.querySelector('.snapshot-intelligence').textContent;assert.ok(!/Tier [ABCD]|INSUFFICIENT|LOW CONFIDENCE|Market pressure|Market outlook|GlobalWits|INTERNAL_ONLY|REVIEW_REQUIRED/.test(text));assert.ok(!/N\/A|€0\.00/.test(d.querySelector('article').textContent));}
})
await test('all original 62 intelligence source keys have four translations and English fallback',()=>{
 assert.equal(snapshotIntelligenceRows.length,62)
 for(const row of snapshotIntelligenceRows){assert.equal(row.length,5);for(const [i,lang] of ['DE','FR','ES','IT'].entries())assert.equal(translate(lang,row[0]),row[i+1]);assert.equal(translate('ZZ',row[0]),row[0])}
})
await test('CUV is never presented as a commercial seed price, values and independent dates are unchanged',()=>{
 for(const c of cards){const d=render(SeedCard,{card:c,snapshot:true}),p=latestTradeUnitValue(c.price_observations);assert.equal(latestSeedPrice(c.price_observations),null);assert.equal(d.querySelector('.catalogue-seed-price-measure'),null);assert.ok(!/Representative price|Seed price|Market price/.test(d.body.textContent));if(p){assert.equal(d.querySelector('.catalogue-price-measure dt').textContent,'Trade unit value');assert.ok(d.querySelector('.catalogue-price-measure dd').textContent.endsWith('/kg'));assert.equal(Number(p.price_eur_kg),Number(c.price_observations.find(x=>x.period===p.period).price_eur_kg));const expected=new Intl.DateTimeFormat('en-GB',{month:'short',year:'numeric',timeZone:'UTC'}).format(new Date(p.period+'-01T00:00:00Z'));assert.ok(d.querySelector('.catalogue-price-measure .catalogue-period').textContent.includes(expected));assert.ok(d.querySelector('abbr').title.includes('not a seller quotation'))}}
})
await test('commercial seed price requires explicit independent evidence and public rights; missing remains absent',()=>{
 const fixture={period:'2026-07-30',price_eur_kg:3.25,classification:'PUBLIC_SAFE',eligible:true,scope_verified:true,species_attribution_verified:true,methodology:'Verified sowing-seed seller quotation',source:'Seller fixture',source_url:'https://example.org/offer',metric_type:'COMMERCIAL_SEED_PRICE',commercial_evidence_verified:true,publication_rights_verified:true}
 assert.equal(latestSeedPrice([fixture]),fixture);assert.equal(eligibleTradeUnitValues([fixture]).length,0)
 for(const changed of [{publication_rights_verified:false},{commercial_evidence_verified:false},{classification:'INTERNAL_ONLY'},{methodology:'Customs net weight quotient'},{price_eur_kg:0}])assert.equal(latestSeedPrice([{...fixture,...changed}]),null)
 const d=render(SeedCard,{card:{...cards[0],price_observations:[...cards[0].price_observations,fixture]},snapshot:true});assert.ok(d.querySelector('.catalogue-seed-price-measure').textContent.includes('3.25'));assert.ok(d.querySelector('.catalogue-seed-price-measure').textContent.includes('2026-07-30'));assert.ok(d.querySelector('.catalogue-price-measure'))
})
await test('all 68 detail and category cards retain numbers and correct CUV terminology in all language modes',()=>{
 for(const lang of langs)for(const c of catalogue.cards){const d=render(Catalogue,{path:'/market/seeds/'+c.slug},lang),price=latestTradeUnitValue(c.price_observations);if(price){assert.ok(d.body.textContent.includes(translate(lang,'Trade unit value')));assert.ok(d.body.textContent.includes(translate(lang,'Trade unit value history — €/kg')));assert.ok(!d.body.textContent.includes(translate(lang,'Representative price')))}if(c.leading_exporters.length)assert.ok(d.body.textContent.includes(translate(lang,'Leading exporters')));if(c.external_trade)assert.ok(d.querySelector('.catalogue-external'))}
})
await test('full approved Intelligence is accessible on all twelve Explore detail routes',()=>{
 for(const lang of langs)for(const c of cards){const d=render(Catalogue,{path:'/market/seeds/'+c.slug},lang),r=projection.records.find(r=>r.entity_id===c.market_entity_id),intel=d.querySelector('.catalogue-detail-intelligence .snapshot-intelligence');assert.ok(intel);assert.equal(intel.querySelector('.snapshot-situation').textContent,translate(lang,r.market_situation));assert.deepEqual([...intel.querySelectorAll('.snapshot-watch li')].map(e=>e.textContent),r.market_watch.map(k=>translate(lang,k)));if(r.b2b_view)assert.equal(intel.querySelector('.snapshot-b2b p').textContent,translate(lang,r.b2b_view));if(r.latest_market_evidence)assert.equal(d.querySelector('.snapshot-latest p').textContent,translate(lang,r.latest_market_evidence));assert.ok(d.querySelector('.snapshot-as-of time'));}
})
await test('compact volume formatting retains exact underlying amounts in accessible detail',()=>{
 for(const c of cards){const d=render(SeedCard,{card:c,snapshot:true}),value=d.querySelector('.catalogue-volume-measure dd');if(c.trade_volume_t===null)assert.equal(value,null);else{assert.ok(value.title.endsWith(' t'));assert.equal(value.getAttribute('aria-label'),value.title);assert.ok(value.textContent.endsWith(' t'));assert.equal(d.querySelectorAll('.snapshot-intelligence .snapshot-situation').length,1)}}
})
await test('one concise translated summary per homepage card with English fallback and no hidden detailed blocks',()=>{
 for(const lang of langs)for(const c of cards){const d=render(SeedCard,{card:c,snapshot:true},lang),intel=d.querySelector('.snapshot-intelligence'),expected=snapshotCompactCopy[c.market_entity_id][{EN:0,DE:1,FR:2,ES:3,IT:4}[lang]??0];assert.equal(intel.querySelector('.snapshot-situation').textContent,expected);assert.ok(expected.length<=90);assert.equal(intel.children.length,2);assert.equal(intel.querySelectorAll('h4,ul,time,.snapshot-b2b,.snapshot-latest').length,0);assert.ok(d.querySelector('.catalogue-card-cta'));}
})
await test('all 12 rotations retain four visible cards, hidden inert measurement probe and canonical URLs',()=>{
 for(let position=0;position<12;position++){const d=render(Train,{cards,position,visible:4}),visible=d.querySelector('.carousel-train'),probe=d.querySelector('.snapshot-card-measurement');assert.equal(visible.children.length,4);assert.equal(probe.children.length,12);assert.equal(probe.getAttribute('aria-hidden'),'true');assert.ok(probe.hasAttribute('inert'));assert.equal(visible.firstElementChild.dataset.entityId,cards[position].market_entity_id)}
})
} finally {await vite.close()}
