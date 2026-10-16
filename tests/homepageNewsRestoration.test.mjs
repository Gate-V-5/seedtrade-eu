import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import {execFileSync} from 'node:child_process'
import {selectStreamHighlights,validateNewsRecord} from '../src/news.mjs'
import {localizedContentText} from '../src/i18n/content.mjs'
const news=JSON.parse(fs.readFileSync('src/generated/news.json'))
const registry=JSON.parse(fs.readFileSync('src/data/news_sources.json'))
const fresh=news.items.slice(-2),asOf='2026-10-16',clone=structuredClone
const pick=(items,date=asOf)=>selectStreamHighlights(items,date,registry)
test('current reviewed reports restore both categories; original publication dates are retained',()=>{
 const selected=pick(news.items)
 assert.equal(selected.length,4)
 for(const item of fresh){assert.ok(selected.some(row=>row.item.id===item.id));assert.equal(item.publication_date,asOf)}
 const before=JSON.parse(execFileSync('git',['show','origin/main:src/generated/news.json'],{encoding:'utf8'}))
 assert.deepEqual(news.items.slice(0,before.items.length),before.items)
 assert.deepEqual(pick(before.items).map(row=>row.stream),['EU Trade Market','EU Events'])
})
test('latest valid report wins; an older still-reviewed report survives a newer expired report',()=>{
 const older=clone(fresh[0]),newer=clone(older)
 older.publication_date='2026-10-15';older.id='older';older.slug='older';older.canonical_url='https://seedtrade.eu/news/older'
 newer.valid_until='2026-10-15'
 assert.equal(pick([newer,older])[0].item.id,'older')
 assert.equal(pick([older])[0].item.publication_date,'2026-10-15')
 older.valid_until='2026-10-15';assert.deepEqual(pick([newer,older]),[])
})
test('stale weather, future reports, invalid dates and no eligible records produce no card selection',()=>{
 assert.deepEqual(pick(fresh,'2026-10-31'),[])
 assert.deepEqual(pick(fresh,'2026-10-15'),[])
 assert.deepEqual(pick(fresh,'not-a-date'),[])
 assert.deepEqual(pick([]),[])
})
test('unverified evidence and incomplete provenance fail closed',()=>{
 for(const change of [row=>row.review_status='PENDING',row=>row.sources[0].public_access='UNVERIFIED',row=>row.sources[0].url='https://unverified.invalid/article',row=>row.claims[0].source_ids=['missing'],row=>row.classification='PRIVATE_DATA']){
  const row=clone(fresh[0]);change(row);assert.ok(validateNewsRecord(row,registry).length);assert.deepEqual(pick([row]),[])
 }
})
test('duplicate arrays and conflicting cross-stream identities cannot repeat a homepage article',()=>{
 const selected=pick([...news.items,...news.items].reverse())
 assert.equal(new Set(selected.map(row=>row.item.canonical_url)).size,selected.length)
 const row=clone(fresh[0]),copy=clone(row),reg=clone(registry)
 copy.stream='EU Agronomist';reg.sources.find(row=>row.source_id==='copernicus-c3s').streams.push('EU Agronomist')
 assert.deepEqual(validateNewsRecord(copy,reg),[])
 assert.equal(selectStreamHighlights([row,copy],asOf,reg).length,1)
})
test('new reports have translated narrative, stable numbers and botanical names in every language',()=>{
 for(const row of fresh)for(const code of ['EN','DE','FR','ES','IT'])for(const field of ['headline','summary','why_it_matters',...row.content.flatMap((_,i)=>[`content.${i}.heading`,`content.${i}.body`])]){
  const en=localizedContentText(row,'EN',field),local=localizedContentText(row,code,field)
  assert.ok(local.trim());assert.deepEqual(local.match(/\d+(?:[.,/]\d+)*/g)||[],en.match(/\d+(?:[.,/]\d+)*/g)||[])
  if(code!=='EN')assert.notEqual(en,local)
  for(const latin of ['Triticum aestivum','Hordeum vulgare','Brassica napus','Pisum sativum','Lens culinaris','Cicer arietinum','Lolium perenne','Trifolium repens'])if(en.includes(latin))assert.ok(local.includes(latin))
 }
})
test('missing translations fall back field-by-field without changing dates or neighbouring text',()=>{
 for(const language of ['de','fr','es','it']){
  const row=clone(fresh[1]);delete row.localizations[language].content[0].body
  assert.equal(localizedContentText(row,language,'content.0.body'),row.content[0].body)
  assert.equal(localizedContentText(row,language,'headline'),row.localizations[language].headline)
  assert.equal(row.publication_date,asOf)
 }
})
test('dated weather analysis and source-date uncertainty remain explicit',()=>{
 assert.ok(fresh[0].summary.includes('not a current forecast'))
 assert.equal(fresh[0].observation_period.end,'2026-09-30')
 assert.equal(fresh[0].sources[1].published_at,null)
 assert.ok(fresh[0].sources[0].date_basis.includes('discrepancy'))
 assert.equal(fresh[1].sources.find(row=>row.id==='forage').published_at,null)
})
test('server, B2B and Weather/Phenology calculations remain byte-identical to approved staging baseline',()=>{
 for(const path of ['server/index.mjs','src/generated/weather_public.json','src/generated/market_public.json','src/generated/supply_public.json','src/generated/rfqs_public.json','src/data/species_master_v1_1.json'])assert.deepEqual(fs.readFileSync(path),execFileSync('git',['show',`600b91835a8832c29e6dd2772acc0d715401f7bb:${path}`]),path)
})
