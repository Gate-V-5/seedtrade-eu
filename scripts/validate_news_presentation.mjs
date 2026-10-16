import assert from 'node:assert/strict'
import fs from 'node:fs'
const news=JSON.parse(fs.readFileSync('src/generated/news.json')),presentation=JSON.parse(fs.readFileSync('src/data/news_presentation.json'))
for(const item of news.items){
 for(const source of item.sources||[{url:item.source_url}]){
  if(!source.url)continue
  assert.ok(/^https:\/\//.test(source.url),'Only verified HTTPS references')
  const ref=presentation.sources[source.url];assert.ok(ref,`Reference presentation requires source review: ${item.slug}`)
  assert.ok(/^\d{4}-\d{2}-\d{2}$/.test(ref.verified_at));assert.ok(ref.title===null||typeof ref.title==='string')
  assert.ok(ref.publication_date===null||(/^\d{4}-\d{2}-\d{2}$/.test(ref.publication_date)&&!isNaN(Date.parse(ref.publication_date))))
 }
}
// Run after prerender: validate the visible public editorial output, not internal datasets.
for(const item of news.items){
 const html=fs.readFileSync(`dist/news/${item.slug}/index.html`,'utf8').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'')
 const main=html.match(/<main\b[^>]*>[\s\S]*?<\/main>/)?.[0]||'';assert.ok(main)
 const visible=main.replace(/<[^>]+>/g,'')
 assert.ok(!/PUBLIC_SAFE|OFFICIAL_DATA|OFFICIAL_SOURCE|PUBLIC_SOURCE|Checked \d|Market Signal|quantitative engine/.test(visible),`Internal code in editorial UI: ${item.slug}`)
 assert.ok(main.includes('news-references'));assert.ok(!main.includes('evidence-labels'))
}
console.log('News presentation build gate PASS: reviewed reference records and all10 clean editorial pages; data/provenance remains internal.')
