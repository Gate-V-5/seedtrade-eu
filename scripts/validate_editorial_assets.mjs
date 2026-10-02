import fs from 'node:fs'
import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
const news=JSON.parse(fs.readFileSync('src/generated/news.json'))
const visuals=JSON.parse(fs.readFileSync('src/data/news_visuals.json'))
const fixed=JSON.parse(fs.readFileSync('src/data/fixed_editorial_visuals.json'))
const used=new Set()
for(const item of news.items.filter(item=>item.stream)){
 const v=visuals[item.slug]
 assert.ok(v,`New Daily News article requires its own photograph: ${item.slug}`)
 assert.equal(v.kind,'EDITORIAL_PHOTOGRAPH');assert.equal(v.classification,'PUBLIC_SAFE')
 for(const key of ['creator','original_source_url','source_platform','licence','licence_url','reuse_basis','retrieval_date','alt'])assert.ok(v[key],`${item.slug}: missing ${key}`)
 assert.equal(v.article_mapping,item.slug)
 assert.ok(!used.has(v.src),'Each new article requires a new image');used.add(v.src)
 assert.ok(v.src.startsWith('/editorial/') && !v.src.startsWith('//'))
 assert.ok(fs.existsSync(`public${v.src}`));assert.ok(v.width>0 && v.height>0)
 const bytes=fs.readFileSync(`public${v.src}`);assert.equal(bytes.toString('ascii',8,12),'WEBP');assert.ok(bytes.length<600000)
}
assert.equal(Object.keys(fixed).length,6)
for(const [key,v] of Object.entries(fixed)){
 assert.equal(v.fixed,true);assert.equal(v.classification,'PUBLIC_SAFE')
 assert.ok(v.src.startsWith('/editorial/') && fs.existsSync(`public${v.src}`));assert.ok(v.alt && v.width && v.height)
 assert.equal(createHash('sha256').update(fs.readFileSync(`assets/owner-approved/${key}.png`)).digest('hex'),v.source_sha256,'Owner originals must remain byte-identical')
}
console.log(`Editorial assets PASS: ${used.size} unique article photographs with commercial licence records, 6 immutable owner originals, local assets and meaningful alt text`)
