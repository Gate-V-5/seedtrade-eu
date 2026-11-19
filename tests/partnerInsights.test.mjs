import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import {createHash} from 'node:crypto'
import {featuredInsights,audienceMetrics,insightEvent,insightEventSchema} from '../src/partnerInsights.mjs'
import {localizedContentText} from '../src/i18n/content.mjs'
import {partnerInsightsRows} from '../src/i18n/partnerInsightsMessages.js'
import {NON_ESSENTIAL_ANALYTICS_ENABLED} from '../src/legal/analyticsPolicy.mjs'
import {languageHref} from '../src/i18n/languageState.mjs'
const json=p=>JSON.parse(fs.readFileSync(p,'utf8'))
const data=json('src/generated/insights.json'),visuals=json('src/data/partner_visuals.json'),original=json('docs/stage5-insights-v1/ORIGINAL_INSIGHTS.json'),audience=json('src/data/partner_audience.json'),featured=featuredInsights(data)
test('Three requested features, canonical Lagrenas route and archived event records preserved',()=>{
 assert.equal(featured.length,3);assert.equal(new Set(data.articles.map(a=>a.slug)).size,data.articles.length)
 assert.match(featured[0].slug,/ista/);assert.match(featured[1].slug,/isf/);assert.equal(featured[2].slug,original.articles[2].slug)
 for(const prior of original.articles.slice(0,2))assert.deepEqual(data.articles.find(a=>a.slug===prior.slug),prior)
 assert.equal(featured[2].publication_date,original.articles[2].publication_date)
})
test('All 15 substantive original translations, disclosures, real sources and secure CTA destinations',()=>{
 for(const a of featured){
  assert.equal(a.editorial_status,'OWNER_REVIEW');assert.equal(a.market_engine_input,false)
  assert.equal(a.seo.canonical,'https://seedtrade.eu/insights/'+a.slug)
  for(const lang of ['en','de','fr','es','it']){
   const title=localizedContentText(a,lang,'title'),copy=a.localizations?.[lang]||a
   assert.ok(title.length>25);assert.equal(copy.content.length,5)
   assert.ok(copy.content.reduce((n,s)=>n+s.body.length,0)>1800)
   if(lang!=='en')assert.notEqual(copy.title,a.title)
   if(a.partner_disclosure)assert.ok(localizedContentText(a,lang,'partner_disclosure'))
   assert.ok(languageHref('/insights',lang).includes('lang='+lang))
  }
  assert.ok(a.sources.every(s=>new URL(s.url).protocol==='https:'))
  assert.ok(['https:','mailto:'].includes(new URL(a.cta.url).protocol))
 }
 for(const row of partnerInsightsRows){assert.equal(row.length,5);assert.ok(row.every(x=>typeof x==='string'&&x.length))}
 assert.equal(featured[2].cta.url,'mailto:info@lagren.lt')
})
test('Event facts and schema are date-specific; no inherited Lisbon agenda, invented start times or fee offers',()=>{
 const [ista,isf]=featured
 assert.equal(ista.event.startDate,'2026-12-14');assert.equal(ista.event.isAccessibleForFree,true)
 assert.equal(isf.event.startDate,'2027-05-17');assert.equal(isf.event.endDate,'2027-05-19')
 assert.match(isf.content[2].body,/1,650/);assert.match(isf.content[2].body,/15 January 2027/)
 for(const a of [ista,isf]){const s=insightEventSchema(a,visuals[a.slug]);assert.equal(s['@type'],'Event');assert.equal(s.startDate,a.event.startDate);assert.equal(s.offers,undefined)}
 assert.equal(insightEventSchema(featured[2]),null)
})
test('Local hash-bound visuals, byte-identical owner originals and explicit stock-photo context',()=>{
 for(const v of Object.values(visuals)){
  assert.equal(createHash('sha256').update(fs.readFileSync('public'+v.src)).digest('hex'),v.sha256)
  assert.ok(v.width>0&&v.height>0&&v.reuse_basis&&v.creator)
  for(const lang of ['de','fr','es','it'])assert.ok(v.localizations[lang].alt)
 }
 assert.equal(visuals['seed-cleaning'].license,'CC BY-SA 3.0')
 assert.match(visuals.harvest.caption,/not a Lagrenas/)
 assert.match(visuals['seed-cleaning'].caption,/not a Lagrenas/)
 const provenance=json('docs/stage5-insights-v1/ASSET_RIGHTS.json').finalOwnerOriginals.records
 assert.equal(provenance.length,3)
 for(const a of featured){
  const v=visuals[a.slug],record=provenance.find(r=>r.article===a.slug)
  assert.equal(v.kind,'OWNER_SUPPLIED_ORIGINAL');assert.equal(v.owner_original_status,'BYTE_VERIFIED')
  assert.doesNotMatch(v.alt+v.caption,/\?/,'Image text must retain its original Unicode characters')
  for(const lang of ['de','fr','es','it'])assert.doesNotMatch(v.localizations[lang].alt,/\?/)
  assert.equal(v.sha256,record.sourceSha256);assert.equal(v.sha256,record.copiedSha256)
  assert.equal(record.byteForByteEqual,true);assert.equal(record.imageTransforms,'NONE')
  const b=fs.readFileSync('public'+v.src);assert.equal(b.toString('hex',0,8),'89504e470d0a1a0a')
  assert.equal(b.readUInt32BE(16),v.width);assert.equal(b.readUInt32BE(20),v.height)
  assert.notEqual(v.editorial_reuse_status,'EDITORIAL_REUSE_CONFIRMED','Supplying a file does not establish public reuse rights')
 }
})
test('DEMO metrics stay honest and LIVE fails closed without all verified definitions and provenance',()=>{
 assert.deepEqual(audienceMetrics(audience),{mode:'DEMO',values:{businessMembers:124,activeUsers30Days:256,activeUsers30Minutes:7}})
 assert.equal(audienceMetrics({...audience,mode:'LIVE'}),null)
 assert.equal(audienceMetrics({...audience,mode:'LIVE',live:{verified:true,values:audience.demo}}),null)
 assert.throws(()=>audienceMetrics({mode:'AUTO'}))
})
test('Existing analytics policy stays OFF; event hooks remove email, tokens, referrers and query parameters',()=>{
 assert.equal(NON_ESSENTIAL_ANALYTICS_ENABLED,false)
 assert.equal(insightEvent('article_view',featured[0],'EN'),false)
 let captured;insightEvent('registration_cta_click',featured[0],'fr','https://example.org/register?token=secret&utm_source=private',(...args)=>{captured=args;return true})
 assert.equal(captured[1].target,'example.org');assert.doesNotMatch(JSON.stringify(captured),/secret|private|token|utm_/)
 insightEvent('partner_contact_click',featured[2],'it','mailto:info@lagren.lt',(...args)=>{captured=args;return true});assert.equal(captured[1].target,'email');assert.doesNotMatch(JSON.stringify(captured),/info@/)
 assert.equal(insightEvent('unknown',featured[0],'en','',()=>{throw Error('unexpected')}),false)
})
