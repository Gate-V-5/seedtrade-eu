import fs from 'node:fs'
import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import {catalogueImageProps} from '../src/catalogueImages.mjs'
const registry=JSON.parse(fs.readFileSync('src/data/catalogue_photographs.json'))
const sources=JSON.parse(fs.readFileSync('docs/catalogue-photography/SOURCE_LICENSES.json'))
const visual=JSON.parse(fs.readFileSync('docs/catalogue-photography/VISUAL_REVIEW.json'))
const categories=JSON.parse(fs.readFileSync('src/generated/market_catalogue_public.json')).categories
const sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex')
assert.equal(registry.items.length,6);assert.equal(new Set(registry.items.map(i=>i.slug)).size,6)
for(const category of categories){
 const item=registry.items.find(i=>i.original===category.image),source=sources.find(s=>s.slug===category.slug)
 assert.ok(item&&source);assert.equal(item.classification,'PUBLIC_SAFE');assert.equal(item.documentary_evidence,false)
 assert.deepEqual(visual.items.find(v=>v.slug===item.slug)?.variant_sha256,item.variants.map(v=>v.sha256));assert.equal(visual.items.find(v=>v.slug===item.slug)?.status,'PASS')
 assert.equal(item.rights_status,'VERIFIED');assert.equal(item.visual_review,'PASS');assert.ok(item.author&&item.file_title&&item.alt)
 const license=item.license==='CC0 1.0'?'https://creativecommons.org/publicdomain/zero/1.0/':item.license==='CC BY-SA 3.0'?'https://creativecommons.org/licenses/by-sa/3.0/':null
 assert.ok(license);assert.equal(item.license_url,license);assert.equal(item.license,source.license)
 assert.equal(new URL(item.source_page).origin,'https://commons.wikimedia.org');assert.equal(item.source_page,source.source_page)
 assert.equal(sha('assets/catalogue-photographs-originals/'+item.slug+'.jpg'),source.sha256)
 assert.ok(catalogueImageProps(item.original,registry).srcSet)
 assert.deepEqual(item.variants.map(v=>v.width),[400,800,1200])
 for(const v of item.variants){assert.equal(sha('public'+v.src),v.sha256);assert.ok(v.src.includes(v.sha256.slice(0,12)));assert.equal(fs.statSync('public'+v.src).size,v.bytes);assert.equal(v.height,v.width*9/16)}
}
for(const width of [400,800,1200])assert.ok(registry.items.reduce((sum,i)=>sum+i.variants.find(v=>v.width===width).bytes,0)<=1000000,'Six-photo budget '+width)
const notices=fs.readFileSync('public/catalogue-v3/responsive/LICENSES.txt','utf8')
for(const item of registry.items){assert.ok(notices.includes(item.file_title));assert.ok(notices.includes(item.author));assert.ok(notices.includes(item.source_page));assert.ok(notices.includes(item.license_url))}
console.log('Catalogue photography PASS: six verified sources,18 hashed WebP derivatives,original identity,license notices,<=1MB at each width; real browser selection separate')
if(process.argv.includes('--finalize')){
 // Preserve originals in source/recovery, but do not ship the unverified legacy
 // catalogue PNGs in a newly built release. Only these exact six paths retire.
 for(const item of registry.items){const file='dist'+item.original;if(fs.existsSync(file))fs.unlinkSync(file)}
 function visit(directory){for(const entry of fs.readdirSync(directory,{withFileTypes:true})){const file=directory+'/'+entry.name;if(entry.isDirectory())visit(file);else if(entry.name==='index.html'){const html=fs.readFileSync(file,'utf8');for(const item of registry.items)assert.ok(!html.includes('src="'+item.original+'"'),'Legacy image rendered: '+file)}}}
 visit('dist');console.log('Final artifact: six unverified legacy PNGs withheld; immutable source originals preserved')
}
