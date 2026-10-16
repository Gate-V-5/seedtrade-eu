import fs from 'node:fs'
import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import {validateNewsImage} from './news_image_policy.mjs'
const news=JSON.parse(fs.readFileSync('src/generated/news.json'))
const visuals=JSON.parse(fs.readFileSync('src/data/news_visuals.json'))
const fixed=JSON.parse(fs.readFileSync('src/data/fixed_editorial_visuals.json'))
const legacy=JSON.parse(fs.readFileSync('src/data/news_image_legacy_v1.json'))
const rights=JSON.parse(fs.readFileSync('docs/news-photography-v1/LICENSE_EVIDENCE.json'))
const used=new Set()
for(const item of news.items)assert.deepEqual(validateNewsImage(item,visuals[item.slug],legacy),[],`Image policy: ${item.slug}`)
for(const item of news.items.filter(item=>item.stream)){
 const v=visuals[item.slug]
 if(v?.image_policy_version===1){
  assert.ok(rights[item.slug],`Independent rights review required: ${item.slug}`)
  for(const [key,value] of Object.entries(rights[item.slug]))assert.deepEqual(v[key],value,`Rights evidence mismatch: ${item.slug} ${key}`)
 }
 assert.ok(v,`New Daily News article requires its own photograph: ${item.slug}`)
 assert.equal(v.classification,'PUBLIC_SAFE')
 assert.equal(v.article_mapping,item.slug)
 assert.ok(!used.has(v.src),'Each new article requires a new image');used.add(v.src)
 assert.ok(v.width>0 && v.height>0 && v.alt && v.creator && v.reuse_basis)
 assert.deepEqual(validateNewsImage(item,v,legacy),[],`News photography policy: ${item.slug}`)
 assert.ok(fs.existsSync(`public${v.src}`))
}
assert.equal(Object.keys(fixed).length,6)
for(const [key,v] of Object.entries(fixed)){
 assert.equal(v.fixed,true);assert.equal(v.classification,'PUBLIC_SAFE')
 assert.ok(v.src.startsWith('/editorial/') && fs.existsSync(`public${v.src}`));assert.ok(v.alt && v.width && v.height)
 assert.equal(createHash('sha256').update(fs.readFileSync(`assets/owner-approved/${key}.png`)).digest('hex'),v.source_sha256,'Owner originals must remain byte-identical')
}
console.log(`Editorial assets PASS: ${used.size} unique attributed article visuals (verified photographs; immutable historical exceptions), 6 immutable owner originals, local assets and meaningful alt text`)
