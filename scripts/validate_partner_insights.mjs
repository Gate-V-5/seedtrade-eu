import fs from 'node:fs'
import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import {featuredInsights,audienceMetrics} from '../src/partnerInsights.mjs'
const read=p=>JSON.parse(fs.readFileSync(p,'utf8')),data=read('src/generated/insights.json'),visuals=read('src/data/partner_visuals.json')
// A recorded owner publication decision is distinct from independent licensing
// evidence. Bind this expressly authorized publication to its exact content and
// original image bytes; never relabel unverified third-party rights as confirmed.
const digest=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex')
const decision=read('docs/stage5-insights-v1/ASSET_RIGHTS.json').ownerPublicationDecision
const ownerPublication=decision?.status==='OWNER_AUTHORIZED_PUBLICATION'&&decision.source==='Explicit owner instruction: STAGE 5 FINAL RELEASE AND BASELINE FREEZE'&&decision.articleDataSha256===digest('src/generated/insights.json')&&decision.visualDataSha256===digest('src/data/partner_visuals.json')&&decision.eventRegisterSha256===digest('src/data/events_calendar.json')
const featured=featuredInsights(data);assert.equal(featured.length,3)
for(const a of featured){
 assert.ok(a.sources?.length&&a.cta&&a.seo?.canonical)
 for(const l of ['en','de','fr','es','it']){const copy=l==='en'?a:a.localizations[l];assert.ok(copy?.title&&copy.summary&&copy.content.length===a.content.length);assert.ok(copy.content.every(s=>s.heading&&s.body))}
 if(process.argv.includes('--publication'))assert.ok(a.editorial_status==='OWNER_APPROVED'||ownerPublication,`Content-specific owner publication decision required: ${a.slug}`)
 if(process.argv.includes('--publication')&&visuals[a.slug]?.required_owner_original){
  assert.equal(visuals[a.slug].owner_original_status,'BYTE_VERIFIED',`Exact owner original file required: ${a.slug}`)
  assert.ok(visuals[a.slug].editorial_reuse_status==='EDITORIAL_REUSE_CONFIRMED'||(ownerPublication&&decision.originals?.some(r=>r.article===a.slug&&r.sha256===visuals[a.slug].sha256&&r.sha256===digest('public'+visuals[a.slug].src))),`Exact image publication decision or established reuse evidence required: ${a.slug}`)
 }
}
for(const v of Object.values(visuals)){assert.ok(v.reuse_basis&&v.creator);assert.equal(createHash('sha256').update(fs.readFileSync('public'+v.src)).digest('hex'),v.sha256)}
assert.ok(audienceMetrics(read('src/data/partner_audience.json')),'LIVE audience statistics require verified data sources')
console.log('Partner Insights PASS: 3 featured articles, 5 languages, asset provenance/hash checks, honest audience mode. Publication approval and image reuse remain gated.')
