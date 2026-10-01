import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import {createHash} from 'node:crypto'
import {execFileSync} from 'node:child_process'
import {NEWS_STREAMS,validateNewsRecord,validateSourceRegistry,publicNewsItems,selectStreamHighlights,filterNewsArchive,eventStatus} from '../src/news.mjs'
import {validateDailyNews,fingerprint} from '../scripts/validate_daily_news.mjs'
import {localizedContentText} from '../src/i18n/content.mjs'
const read=file=>JSON.parse(fs.readFileSync(file,'utf8'))
const news=read('src/generated/news.json'),registry=read('src/data/news_sources.json'),initial=news.items.filter(item=>item.stream)
const clone=item=>structuredClone(item),asOf='2026-10-01'

test('reviewed collection and 19 active public source families validate',()=>{
 assert.deepEqual(validateDailyNews(news,registry),[])
 assert.equal(registry.sources.filter(source=>source.active).length,19)
 assert.deepEqual(validateSourceRegistry({...registry,sources:[...registry.sources,registry.sources[0]]}).length>0,true)
 const restricted=clone(registry);restricted.sources[0].access_type='SUBSCRIPTION';assert.ok(validateSourceRegistry(restricted).length)
 assert.ok(validateSourceRegistry({sources:[null]}).length)
})
test('homepage selects four distinct streams in fixed order, independent of record order',()=>{
 for(const records of [news.items,[...news.items].reverse(),[...news.items,...news.items]]){
  const slots=selectStreamHighlights(records,asOf,registry)
  assert.deepEqual(slots.map(slot=>slot.stream),NEWS_STREAMS)
  assert.equal(new Set(slots.map(slot=>slot.item.id)).size,4)
  assert.ok(slots.every(slot=>slot.item.stream===slot.stream))
 }
})
test('no new information retains original dates; expired assessment produces an empty slot',()=>{
 const slots=selectStreamHighlights(news.items,'2026-10-02',registry)
 assert.ok(slots.every(slot=>slot.item.publication_date===asOf))
 assert.equal(selectStreamHighlights(news.items,'2026-10-10',registry)[0].item,null)
})
test('unpublished, private, future and secret-bearing records cannot become highlights',()=>{
 for(const changes of [{classification:'PRIVATE_DATA'},{publication_status:'DRAFT'},{publication_eligible:false},{review_status:'PENDING'},{market_engine_input:true},{token:'test-fixture-only'}]){
  const record={...clone(initial[0]),...changes}
  assert.equal(publicNewsItems([record],registry).length,0)
  assert.equal(selectStreamHighlights([record],asOf,registry)[0].item,null)
 }
 const future={...clone(initial[0]),publication_date:'2026-10-02',updated_at:'2026-10-02',checked_at:'2026-10-02'}
 assert.equal(selectStreamHighlights([future],asOf,registry)[0].item,null)
 assert.equal(filterNewsArchive([future],{period:'ALL'},asOf,registry).length,0)
})
test('malformed records fail closed without a rendering exception',()=>{
 for(const record of [null,{}, {...clone(initial[0]),countries:null},{...clone(initial[0]),claims:[null]},{...clone(initial[0]),content:[null]}])assert.ok(validateNewsRecord(record,registry).length)
 assert.deepEqual(publicNewsItems({},registry),[])
})
test('company and media observations cannot establish confirmed market facts',()=>{
 const record=clone(initial[2]);registry.sources.push({source_id:'test-company',source_type:'COMPANY_SIGNAL',streams:['EU Trade Market'],public_url:record.sources[0].url})
 record.sources[0].source_id='test-company';record.sources[0].source_type='COMPANY_SIGNAL'
 assert.ok(validateNewsRecord(record,registry).some(error=>error.includes('confirmed market fact')))
 registry.sources.pop()
})
test('repeated original press releases are not independent support',()=>{
 const record=clone(initial[2]);record.sources[0].source_id='dlf';record.sources[0].source_type='COMPANY_SIGNAL';record.sources[0].url='https://www.dlf.com/test-fixture'
 record.sources.push({...record.sources[0],id:'same-origin-copy'})
 record.claims=[{id:'limited',statement:'A limited company observation.',evidence_class:'SUPPORTED',source_ids:[record.sources[0].id,'same-origin-copy'],scope:'Company only',limitations:'Same underlying release',publish_conclusion:true}]
 record.content.forEach(section=>section.claim_ids=['limited'])
 assert.ok(validateNewsRecord(record,registry).some(error=>error.includes('independent corroboration')))
})
test('insufficient conclusions and unsupported section references are rejected',()=>{
 const record=clone(initial[2]);record.claims.find(claim=>claim.evidence_class==='INSUFFICIENT').publish_conclusion=true
 assert.ok(validateNewsRecord(record,registry).some(error=>error.includes('Insufficient')))
 record.content[0].claim_ids=['invented'];assert.ok(validateNewsRecord(record,registry).some(error=>error.includes('claim references')))
})
test('current weather baseline has no invented predecessor or regional measurements',()=>{
 const weather=initial[0];assert.equal(weather.previous_item_id,null);assert.deepEqual(weather.related_item_ids,[])
 assert.equal(weather.region_codes.length,23);assert.equal(weather.assessment_outcome,'BASELINE')
 assert.ok(weather.coverage_limitations.includes('No statistically representative EU average'))
 assert.ok(!Object.hasOwn(weather,'regional_measurements'))
})
test('continuity references require an earlier public record in the same series',()=>{
 const copy=clone(news);copy.items[4].previous_item_id='missing';copy.items[4].fingerprint=fingerprint(copy.items[4])
 assert.ok(validateDailyNews(copy,registry).some(error=>error.includes('continuity')))
 const next=clone(initial[0]);next.id='next-weather';next.slug='next-weather';next.canonical_url='https://seedtrade.eu/news/next-weather';next.previous_item_id=initial[0].id;next.publication_date='2026-10-02';next.updated_at='2026-10-02';next.checked_at='2026-10-02';next.fingerprint=fingerprint(next)
 assert.deepEqual(validateDailyNews({...news,as_of:'2026-10-02',items:[...news.items,next]},registry),[])
})
test('cancelled and completed events never occupy the upcoming homepage slot',()=>{
 const event=initial[3];assert.equal(eventStatus(event,'2026-10-28'),'CONFIRMED');assert.equal(eventStatus(event,'2026-10-29'),'COMPLETED')
 assert.equal(selectStreamHighlights(news.items,'2026-10-29',registry)[3].item,null)
 for(const status of ['CANCELLED','COMPLETED']){
  const changed={...clone(event),event:{...event.event,status}}
  assert.equal(selectStreamHighlights([changed],asOf,registry)[3].item,null)
  assert.deepEqual(filterNewsArchive([changed],{period:'UPCOMING'},asOf,registry),[])
  assert.equal(filterNewsArchive([changed],{period:'ALL'},asOf,registry).length,1)
 }
})
test('archive recent window, permanent history and combined stream/country/crop/date filters',()=>{
 assert.equal(filterNewsArchive(news.items,{period:'ALL'},asOf,registry).length,8)
 const recent=filterNewsArchive(news.items,{period:'RECENT'},asOf,registry)
 assert.ok(recent.length<8);assert.ok(recent.every(item=>item.publication_date>='2026-09-12'))
 assert.equal(filterNewsArchive(news.items,{stream:'EU Agronomist',country:'LV',crop:'winter wheat',from:asOf,to:asOf},asOf,registry)[0].id,initial[1].id)
 assert.deepEqual(filterNewsArchive(news.items,{stream:'EU Agronomist',country:'NL'},asOf,registry),[])
 assert.deepEqual(filterNewsArchive(news.items,{period:'UPCOMING'},asOf,registry).map(item=>item.id),[initial[3].id])
})
test('all four historical News records including localization and URLs remain byte-equivalent objects',()=>{
 const original=JSON.parse(execFileSync('git',['show','802c515ec3c6b10dc3eb06e145ecf74d9d2dc12e:src/generated/news.json'],{encoding:'utf8'}))
 assert.deepEqual(news.items.filter(item=>!item.stream),original.items)
})
test('fingerprint detects factual edits and localization cannot override metadata',()=>{
 const copy=clone(news);copy.items[4].summary+=' Altered fact.'
 assert.ok(validateDailyNews(copy,registry).some(error=>error.includes('fingerprint')))
 const metadata=clone(news);metadata.items[4].localizations.de.source_url='https://wrong.test'
 assert.ok(validateDailyNews(metadata,registry).some(error=>error.includes('metadata')))
})
test('four new articles have complete translations, numeric and botanical invariants',()=>{
 assert.equal(initial.length,4)
 for(const record of initial)for(const code of ['EN','DE','FR','ES','IT']){
  const fields=['headline','summary','why_it_matters',...record.content.flatMap((_,i)=>[`content.${i}.heading`,`content.${i}.body`])]
  for(const field of fields){
   const english=localizedContentText(record,'EN',field),local=localizedContentText(record,code,field)
   assert.ok(local.trim());assert.deepEqual(local.match(/\d+(?:[.,/]\d+)*/g)||[],english.match(/\d+(?:[.,/]\d+)*/g)||[])
   if(code!=='EN'){assert.notEqual(local,english);for(const sentence of english.split(/(?<=[.!?])\s+/).filter(value=>value.length>45))assert.ok(!local.includes(sentence))}
   for(const latin of ['Zea mays','Solanum tuberosum','Triticum aestivum'])if(english.includes(latin))assert.ok(local.includes(latin))
  }
 }
})
test('missing one localized narrative field falls back to EN without changing adjacent fields',()=>{
 for(const language of ['de','fr','es','it']){
  const record=clone(initial[0]);delete record.localizations[language].content[0].body
  assert.equal(localizedContentText(record,language,'content.0.body'),record.content[0].body)
  assert.equal(localizedContentText(record,language,'content.1.body'),record.localizations[language].content[1].body)
 }
})
test('manifest checksums and canonical sitemap include exactly the eight public News URLs',()=>{
 const manifest=read('src/generated/public_data_manifest.json').datasets.daily_news
 assert.equal(manifest.public_records,8)
 assert.equal(manifest.sha256,createHash('sha256').update(fs.readFileSync('src/generated/news.json')).digest('hex'))
 assert.equal(manifest.source_registry_sha256,createHash('sha256').update(fs.readFileSync('src/data/news_sources.json')).digest('hex'))
 const sitemap=fs.readFileSync('public/sitemap.xml','utf8')
 assert.equal((sitemap.match(/<loc>https:\/\/seedtrade.eu\/news\//g)||[]).length,8)
 for(const item of news.items)assert.ok(sitemap.includes(item.canonical_url))
})

test('registered source identity cannot lend authority to an unrelated URL',()=>{
 const record=clone(initial[0]);record.sources[0].url='https://unrelated.test/fake-official'
 assert.ok(validateNewsRecord(record,registry).some(error=>error.includes('evidence source')))
})

test('new records cannot bypass review by omitting their stream',()=>{
 const record=clone(initial[0]);delete record.stream
 assert.ok(validateNewsRecord(record,registry).some(error=>error.includes('reviewed editorial stream')))
})
