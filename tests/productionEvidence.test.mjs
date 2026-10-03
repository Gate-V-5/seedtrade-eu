import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import {selectEvidence,coverage,longestHistory,metricLabels,countryLabel} from '../src/productionEvidence.mjs'
const data=JSON.parse(fs.readFileSync('src/generated/production_public.json'))
test('missing years remain missing; exact scopes, units and metrics stay separate',()=>{
 const series=selectEvidence(data,{entity:'browntop',country:'AT',metric:'CERTIFIED_SEED_AREA'})
 assert.deepEqual(series[0].points.map(p=>p.year),[2023,2025]);assert.equal(series[0].history_length,1)
 assert.equal(selectEvidence(data,{entity:'browntop',country:'AT',metric:'CERTIFIED_SEED_AREA',history:2}).length,0)
 assert.equal(selectEvidence(data,{entity:'browntop',country:'AT',metric:'CERTIFIED_SEED_AREA',year:2024}).length,0)
 assert.equal(longestHistory([2021,2023,2024,2025]),3)
 for(const g of selectEvidence(data))assert.equal(new Set(g.points.map(r=>r.metric+'|'+r.unit+'|'+r.definition+'|'+r.source_botanical+'|'+r.season+'|'+r.category)).size,1)
})
test('coverage is calculated from the selected records, not hard coded',()=>{
 const selected=selectEvidence(data,{entity:'alfalfa',country:'CZ',metric:'SEED_PRODUCTION_AREA'})
 assert.equal(coverage(selected).countries,1)
 assert.equal(coverage(selectEvidence(data,{year:2021})).latest,2021)
 assert.deepEqual(coverage([]),{countries:0,entities:0,observations:0,comparable:0,latest:null})
 assert.equal(Object.keys(metricLabels).length,3)
})
test('public exposure, canonical identities and provenance fail closed',()=>{
 assert.equal(data.source_records,1835);assert.equal(data.observations.length,1669)
 assert.ok(!data.countries.some(c=>['CY','LU','MT'].includes(c)))
 const entityIds=new Set(data.entities.map(e=>e.id)); const ids=new Set(data.observations.map(r=>r.id))
 assert.equal(ids.size,data.observations.length)
 for(const r of data.observations){assert.ok(entityIds.has(r.entity));assert.ok(data.sources[r.source].url.startsWith('https://'));assert.equal(r.evidence,'VERIFIED_OFFICIAL_SOURCE');assert.ok(Object.hasOwn(metricLabels,r.metric))}
 assert.equal(countryLabel('DE','FR'),'Allemagne')
 for(const e of data.entities.filter(e=>['SPECIES','SUBSPECIES','HYBRID_SPECIES'].includes(e.rank)))assert.ok(e.botanical)
 assert.ok(!JSON.stringify(data).includes('research_v'))
})
