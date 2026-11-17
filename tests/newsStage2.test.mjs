import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import {NEWS_STREAMS,isCurrentNews,selectStreamHighlights,filterNewsArchive,newsStream,newsEvent,eventStatus,parseNewsFilters,newsFilterUrl,seedSectorConnectionErrors} from '../src/news.mjs'
import {validatePackage,validateDraftPackage,publicationProjection,packageHash} from '../scripts/validate_news_package.mjs'
import {fingerprint} from '../scripts/validate_daily_news.mjs'
import {newsStage2Rows} from '../src/i18n/newsStage2Messages.js'
const read=p=>JSON.parse(fs.readFileSync(new URL('../'+p,import.meta.url),'utf8')),news=read('src/generated/news.json'),registry=read('src/data/news_sources.json')
test('seven-day freshness cannot be extended by checking or a distant review deadline',()=>{
 const item={publication_date:'2026-11-10',valid_until:'2099-01-01'}
 assert(isCurrentNews(item,'2026-11-16'));assert(!isCurrentNews(item,'2026-11-17'));assert(!isCurrentNews(item,'2026-11-09'))
 assert.equal(selectStreamHighlights(news.items.filter(i=>i.publication_date<'2026-11-16'),'2026-11-16',registry).length,0)
 assert.equal(selectStreamHighlights(news.items,'2026-11-16',registry).length,4)
})
test('all ten permanent articles preserved; four legacy streams and genuine event corrected',()=>{
 assert.equal(news.items.length,14);assert(news.items.every(i=>NEWS_STREAMS.includes(newsStream(i))))
 const item=news.items.find(i=>i.slug==='interpom-2026-exhibitor-profile');assert.equal(newsEvent(item).start_date,'2026-11-29')
 assert(filterNewsArchive(news.items,{stream:'EU Events',period:'UPCOMING'},'2026-11-16',registry).some(i=>i.slug===item.slug))
 assert.equal(eventStatus(item,'2026-12-02'),'COMPLETED');assert(!isCurrentNews(item,'2026-11-16'))
 assert.equal(filterNewsArchive(news.items,{},'2026-11-16',registry).length,14)
})
test('combined category/country/topic/date/search filters and URL round trip preserve language',()=>{
 const f=parseNewsFilters('?lang=fr&stream=EU%20Events&q=INTERPOM&country=BE&from=2026-09-01&to=2026-09-30&page=2')
 assert.equal(filterNewsArchive(news.items,f,'2026-11-16',registry).length,1)
 const url=newsFilterUrl('/news','?lang=fr',f);assert(url.includes('lang=fr'));assert.deepEqual(parseNewsFilters(url.split('?')[1]),f)
 assert.equal(parseNewsFilters('?stream=BAD&page=-5&from=broken').stream,'ALL')
 assert.equal(filterNewsArchive(news.items,{q:'does-not-exist'},'2026-11-16',registry).length,0)
})
test('every Stage 2 label has complete translations and stable interpolation fields',()=>{
 for(const row of newsStage2Rows){assert.equal(row.length,5);for(const text of row){assert(text.trim());assert.deepEqual(text.match(/\{\w+\}/g)||[],row[0].match(/\{\w+\}/g)||[])}}
 for(const key of NEWS_STREAMS){const row=newsStage2Rows.find(r=>r[0]===key);assert(row.slice(1).every(t=>t!==key))}
})
function fixture(){
 const item=structuredClone(news.items.find(i=>i.stream==='EU Agronomist'));item.editorial_type='EDITORIAL_ANALYSIS';item.id='synthetic-review-fixture';item.slug='synthetic-review-fixture';item.canonical_url='https://seedtrade.eu/news/'+item.slug;item.previous_item_id=null;item.related_item_ids=[];item.fingerprint=fingerprint(item)
 const packet={article:item,visual:{kind:'EDITORIAL_PHOTOGRAPH'},references:Object.fromEntries(item.sources.map(s=>[s.url,{title:s.label,verified_at:'2026-11-16'}]))}
 const review={status:'APPROVED',package_sha256:packageHash(packet),approved_by_private_role:'ISOLATED_TEST_ROLE_NOT_A_REAL_APPROVAL',evidence_reference:'synthetic-tests-only',approved_at:'2026-11-16T00:00:00Z',claims_reviewed:true,image_rights_reviewed:true,languages_reviewed:['en','de','fr','es','it']};const auth={action:'AUTHORIZE_PUBLICATION',package_sha256:packageHash(packet),evidence_reference:'synthetic-tests-only'}
 return {packet,review,auth}
}
test('complete package requires exact separate genuine review and publication records',()=>{
 const {packet,review,auth}=fixture();assert.deepEqual(validatePackage(packet,review,auth,{imageValidator:()=>[]}),[])
 assert(validatePackage(packet,{},auth,{imageValidator:()=>[]}).some(e=>e.includes('approval')))
 assert(validatePackage(packet,review,{}, {imageValidator:()=>[]}).some(e=>e.includes('authorization')))
 packet.article.localizations.fr.summary+=' changed';assert(validatePackage(packet,review,auth,{imageValidator:()=>[]}).some(e=>e.includes('approval')))
})
test('missing translation and missing/unlicensed picture fail closed even with matching receipts',()=>{
 const {packet,review,auth}=fixture();delete packet.article.localizations.it;review.package_sha256=auth.package_sha256=packageHash(packet)
 assert(validatePackage(packet,review,auth,{imageValidator:()=>[]}).some(e=>e.includes('language')))
 const f=fixture();assert(validatePackage(f.packet,f.review,f.auth).length>0)
})

test('draft content inspection never grants approval, eligibility or public visibility',()=>{
 const {packet}=fixture();Object.assign(packet.article,{review_status:'PENDING_OWNER_APPROVAL',publication_status:'DRAFT',publication_eligible:false});packet.article.fingerprint=fingerprint(packet.article)
 const before=JSON.stringify(packet)
 assert.deepEqual(validateDraftPackage(packet,{imageValidator:()=>[]}),[])
 assert.equal(validatePackage(packet,null,null,{imageValidator:()=>[]}).length,2)
 assert.equal(selectStreamHighlights([packet.article],'2026-10-01',registry).length,0)
 const projected=publicationProjection(packet);assert.equal(projected.article.review_status,'APPROVED');assert.notEqual(packageHash(projected),packageHash(packet));assert.equal(projected.article.fingerprint,fingerprint(projected.article))
 assert.equal(JSON.stringify(packet),before)
})

test('draft state conflicts and incomplete localized paragraphs remain blocked',()=>{
 const {packet}=fixture();Object.assign(packet.article,{review_status:'PENDING_OWNER_APPROVAL',publication_status:'DRAFT',publication_eligible:false});packet.article.fingerprint=fingerprint(packet.article)
 delete packet.article.localizations.de.content[0].body
 assert(validateDraftPackage(packet,{imageValidator:()=>[]}).some(x=>x.includes('language')))
 packet.article.publication_eligible=true
 assert(validateDraftPackage(packet,{imageValidator:()=>[]}).some(x=>x.includes('unpublished')))
})

test('unverified measurement windows stay null only with an explicit editorial-analysis basis',()=>{
 const {packet}=fixture();Object.assign(packet.article,{review_status:'PENDING_OWNER_APPROVAL',publication_status:'DRAFT',publication_eligible:false,observation_period:null,observation_period_basis:'SOURCE_OBSERVATION_WINDOW_NOT_VERIFIED'});packet.article.fingerprint=fingerprint(packet.article)
 assert.deepEqual(validateDraftPackage(packet,{imageValidator:()=>[]}),[])
 packet.article.editorial_type='OFFICIAL_UPDATE';packet.article.fingerprint=fingerprint(packet.article)
 assert(validateDraftPackage(packet,{imageValidator:()=>[]}).some(x=>x.includes('scope/time')))
 packet.article.editorial_type='EDITORIAL_ANALYSIS';delete packet.article.observation_period_basis;packet.article.fingerprint=fingerprint(packet.article)
 assert(validateDraftPackage(packet,{imageValidator:()=>[]}).some(x=>x.includes('scope/time')))
})

test('ordinary short regional news needs no essay, measured period or multiple primary sources',()=>{
 const {packet}=fixture(),a=packet.article
 Object.assign(a,{format:'SHORT_NEWS_BRIEF',editorial_type:'OFFICIAL_UPDATE',review_status:'PENDING_OWNER_APPROVAL',publication_status:'DRAFT',publication_eligible:false,observation_period:null,observation_period_basis:'NO_MEASURED_PERIOD_NEWS_BRIEF',why_it_matters:''})
 const paragraphs=['Isolated source-based paragraph for testing news brief length. '.repeat(7),'Second isolated paragraph used only in this local test fixture. '.repeat(7),'Third isolated paragraph explains the practical relevance in this local fixture. '.repeat(5)]
 a.content=paragraphs.map((body,i)=>({id:String(i+1),heading:'',body,claim_ids:[a.claims[0].id]}))
 for(const locale of Object.values(a.localizations)){locale.why_it_matters='';locale.content=a.content.map(({id,heading,body})=>({id,heading,body}))}
 a.fingerprint=fingerprint(a);assert.deepEqual(validateDraftPackage(packet,{imageValidator:()=>[]}),[])
 assert.equal(validatePackage(packet,null,null,{imageValidator:()=>[]}).length,2)
 a.localizations.fr.content[0].body='short';a.localizations.fr.content[1].body='short'
 assert(validateDraftPackage(packet,{imageValidator:()=>[]}).some(e=>e.includes('characters: fr')))
})

test('Trade Market requires source-backed seed relevance, not an editorial commodity inference',()=>{
 const item={stream:'EU Trade Market',headline:'Seed businesses should watch grain prices',sources:[{id:'regional','public_access':'VERIFIED_PUBLIC',scope:'Regional commodity grain prices','evidence_locator':'November market bulletin'}]}
 assert(seedSectorConnectionErrors(item).some(e=>e.startsWith('SEED_SECTOR_CONNECTION_REQUIRED')))
 item.sources[0].scope='Commodity prices, not seed prices';assert(seedSectorConnectionErrors(item).length)
 item.seed_sector_connection={kind:'WIDER_AGRICULTURE_LINK',explanation:'The source explicitly discusses energy costs in seed-cleaning operations.',source_ids:['regional'],evidence_locator:'Seed-cleaning energy section',source_evidence:'The report describes energy consumption at a seed-cleaning plant.'}
 assert.deepEqual(seedSectorConnectionErrors(item),[])
 item.seed_sector_connection.source_ids=['unrelated'];assert(seedSectorConnectionErrors(item).length)
 assert.deepEqual(seedSectorConnectionErrors({...item,stream:'EU Weather'}),[])
})
