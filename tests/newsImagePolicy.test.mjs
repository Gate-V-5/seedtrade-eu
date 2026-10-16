import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
import {execFileSync} from 'node:child_process'
import {validateNewsImage} from '../scripts/news_image_policy.mjs'
const news=JSON.parse(fs.readFileSync('src/generated/news.json')),visuals=JSON.parse(fs.readFileSync('src/data/news_visuals.json')),legacy=JSON.parse(fs.readFileSync('src/data/news_image_legacy_v1.json'))
const items=news.items.slice(-2),copy=x=>structuredClone(x)
test('two exact licensed originals and derivatives; legacy data untouched',()=>{
 for(const item of news.items)assert.deepEqual(validateNewsImage(item,visuals[item.slug],legacy),[])
 assert.equal(Object.keys(legacy).length,8)
 assert.deepEqual(fs.readFileSync('src/generated/news.json'),execFileSync('git',['show','e4f88102af0b762adc10c484b2528f94e8b6714b:src/generated/news.json']))
 const old=JSON.parse(execFileSync('git',['show','e4f88102af0b762adc10c484b2528f94e8b6714b:src/data/news_visuals.json']))
 for(const slug of Object.keys(legacy))assert.deepEqual(visuals[slug],old[slug])
})
for(const [name,mutate] of Object.entries({
 schematic:v=>v.kind='EDITORIAL_ILLUSTRATION',AI:v=>v.ai_generated=true,unverified:v=>v.commercial_use_verified=false,
 redistribution:v=>v.redistribution_verified=false,relevance:v=>v.relevance_verified=false,private:v=>v.classification='PRIVATE',
 editorialOnly:v=>v.licence='Editorial only',untrustedLicenseLink:v=>v.licence_url='https://example.invalid/license',
 noAuthor:v=>delete v.creator,missingCaption:v=>delete v.localizations.de.caption,missingAlt:v=>delete v.localizations.it.alt,
 hotlink:v=>v.src='https://example.invalid/photo.webp',traversal:v=>v.src='/editorial/../secret.webp',
 badRatio:v=>v.height=500,badHash:v=>v.asset_sha256='0'.repeat(64),originalTamper:v=>v.original_sha256='0'.repeat(64),
 falseDocumentary:v=>v.documentary_evidence=true,missingEvidence:v=>delete v.license_evidence_sha256,
 grantRights:v=>v.derivative_licence='All rights reserved',wrongArticle:v=>v.article_mapping='another'
}))test(`fails closed: ${name}`,()=>{const v=copy(visuals[items[1].slug]);mutate(v);assert.ok(validateNewsImage(items[1],v,legacy).length)})
test('future item cannot use legacy exception; missing photo and bytes rejected',()=>{
 assert.ok(validateNewsImage({...items[0],slug:'future'},visuals[items[0].slug],legacy).length)
 assert.ok(validateNewsImage(items[0],null,legacy).length)
 assert.ok(validateNewsImage(items[0],visuals[items[0].slug],legacy,()=>Buffer.alloc(700000)).length)
 const old=news.items[0];assert.ok(validateNewsImage({...old,headline:'Changed'},visuals[old.slug],legacy).length)
})
