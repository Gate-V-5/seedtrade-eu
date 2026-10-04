import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
const d=JSON.parse(fs.readFileSync('src/generated/market_categories_public.json','utf8'))
test('ten canonical categories account for 121 true-seed species and 136 commercial entities',()=>{assert.equal(d.categories.length,10);assert.equal(d.categories.reduce((n,c)=>n+c.species_count,0),121);assert.equal(d.categories.flatMap(c=>c.species).length,136);assert.equal(new Set(d.categories.flatMap(c=>c.species.map(s=>s.id))).size,136)})
test('use tags remain secondary and shared customs groups retain unallocated scope',()=>{assert.equal(d.categories.filter(c=>/catch|cover|pollinator/i.test(c.id)).length,0);const group=d.entities.find(e=>e.cn8==='12092945');assert.equal(group.granularity,'GROUP_LEVEL');assert.ok(group.seed_categories.length>1);assert.ok(d.categories.flatMap(c=>c.species).filter(s=>s.cn_codes.includes('12092945')).length>1)})
