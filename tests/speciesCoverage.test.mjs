import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import data from '../src/productionCoverageData.mjs'
import {selectEvidence} from '../src/productionEvidence.mjs'
const read=p=>JSON.parse(fs.readFileSync(new URL('../'+p,import.meta.url)))
const base=read('src/generated/production_public.json')
const additions=read('src/generated/production_coverage_additions.json')
test('additive evidence preserves every original numeric row and isolates regional scopes',()=>{
 assert.equal(data.observations.length,1715)
 const all=new Map(data.observations.map(r=>[r.id,r]));assert.equal(all.size,1715)
 for(const r of base.observations)assert.deepEqual(all.get(r.id),r)
 const de=selectEvidence(data,{entity:'white-mustard',country:'DE',metric:'SEED_PRODUCTION_AREA'})
 assert.equal(de.length,1);assert.match(de[0].species_scope,/Brandenburg.*not Germany total/)
 assert.deepEqual(de[0].points.map(p=>p.value),[427,441,355,265])
 const inspected=selectEvidence(data,{entity:'tall-fescue',country:'PL',metric:'SEED_PRODUCTION_AREA'})
 const approved=selectEvidence(data,{entity:'tall-fescue',country:'PL',metric:'CERTIFIED_SEED_AREA'})
 assert.equal(inspected[0].points[0].value,28.36);assert.equal(approved[0].points[0].value,26.31)
 assert.notEqual(inspected[0].definition,approved[0].definition)
})
test('withheld and missing species cannot acquire fabricated histories or values',()=>{
 for(const entity of ['onion','coriander','chicory','leek','melon','lettuce','tomato'])assert.ok(!additions.observations.some(r=>r.entity===entity))
 assert.deepEqual(selectEvidence(data,{entity:'yellow-lupin',country:'PL'}),[])
 assert.deepEqual(selectEvidence(data,{entity:'carrot',country:'FR',year:2020}),[])
 const ids=new Set(data.observations.map(r=>r.id));const seen=[]
 for(const s of data.series){const points=s.observations.map(i=>{assert.ok(ids.has(i));return data.observations.find(r=>r.id===i)})
  assert.equal(new Set(points.map(r=>r.year)).size,points.length)
  for(const r of points)for(const key of ['entity','country','metric','unit','definition','season','category','crop_use','species_scope','source_botanical'])assert.equal(r[key],s[key])
  seen.push(...s.observations)
 }
 assert.equal(new Set(seen).size,ids.size);assert.equal(seen.length,ids.size)
})
