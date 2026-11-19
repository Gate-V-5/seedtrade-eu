import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import {execFileSync} from 'node:child_process'
import {NEWS_STREAMS,selectHomepageNews,selectStreamHighlights,isCurrentNews,eventStatus,newsEvent} from '../src/news.mjs'
const read=p=>JSON.parse(fs.readFileSync(p,'utf8')),news=read('src/generated/news.json'),sources=read('src/data/news_sources.json')
const base='298d8d68aaed34d84a7cb575c1a46a1269f2871b'
test('expiry changes presentation honestly without removing any approved category coverage',()=>{
 for(const [day,fresh]of [['2026-11-18',4],['2026-11-19',1],['2026-11-23',0]]){
  const cards=selectHomepageNews(news.items,day,sources)
  assert.deepEqual(cards.map(c=>c.stream),NEWS_STREAMS)
  assert.equal(cards.filter(c=>!c.archived).length,fresh)
  assert.equal(selectStreamHighlights(news.items,day,sources).length,fresh)
  assert(cards.every(c=>c.archived===!isCurrentNews(c.item,day)))
 }
 const past=selectHomepageNews(news.items,'2026-12-02',sources).find(c=>c.stream==='EU Events')
 assert(past.archived);assert.equal(eventStatus(past.item,'2026-12-02'),'COMPLETED')
 assert.equal(newsEvent(past.item).start_date,'2026-11-29')
})
test('fallback never grants approval, changes dates or exposes future/private submissions',()=>{
 const original=JSON.stringify(news.items),draft=structuredClone(news.items.at(-1)),future=structuredClone(draft)
 Object.assign(draft,{slug:'isolated-unapproved-test',publication_status:'DRAFT',publication_eligible:false,review_status:'PENDING'})
 Object.assign(future,{slug:'isolated-future-test',publication_date:'2099-01-01'})
 assert.deepEqual(selectHomepageNews([draft,future],'2026-11-19',sources),[])
 assert.deepEqual(selectHomepageNews([],'2026-11-19',sources),[])
 assert.deepEqual(selectHomepageNews(news.items,'not-a-date',sources),[])
 selectHomepageNews(news.items,'2026-12-20',sources);assert.equal(JSON.stringify(news.items),original)
 for(const path of ['src/generated/news.json','src/data/news_sources.json','src/data/news_visuals.json','src/data/news_image_use_registry.json','scripts/news_pipeline.py','scripts/validate_news_package.mjs'])assert.deepEqual(fs.readFileSync(path),execFileSync('git',['show',base+':'+path]),path)
})
test('frozen Stage5 modules/data/images and shared homepage section remain byte-identical',()=>{
 const files=execFileSync('git',['ls-tree','-r','--name-only',base],{encoding:'utf8'}).trim().split('\n')
 for(const path of files.filter(p=>/^(public\/editorial\/stage5\/|docs\/stage5-insights-v1\/)/.test(p)||/^src\/(PartnerInsights\.|EventsCalendar\.|partnerInsights\.mjs|eventsCalendar\.mjs|data\/(events_calendar|partner_audience|partner_visuals)\.json|generated\/insights\.json|i18n\/(eventsMessages|partnerInsightsMessages)\.js)/.test(p)))assert.deepEqual(fs.readFileSync(path),execFileSync('git',['show',base+':'+path]),path)
 const original=execFileSync('git',['show',base+':src/AppV2.jsx'],{encoding:'utf8'}),current=fs.readFileSync('src/AppV2.jsx','utf8')
 for(const [start,end]of [['const homepageInsightTitles=','// Match the build snapshot'],['      <HomepageEventStrip/>','      <ActiveBuyingRequests/>']])assert.equal(current.slice(current.indexOf(start),current.indexOf(end)),original.slice(original.indexOf(start),original.indexOf(end)))
 for(const path of ['src/generated/kaina_prices_public.json','src/generated/price_evidence_public.json','src/generated/trade_pulse_public.json','server/b2b/legal/registry.json','server/index.mjs','src/legal/analyticsPolicy.mjs'])assert.deepEqual(fs.readFileSync(path),execFileSync('git',['show',base+':'+path]),path)
})
