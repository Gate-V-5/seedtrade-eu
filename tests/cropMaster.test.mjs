import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import {countDistinctSeedSpecies, cropEntityForProduction, cropEntitiesForTrade} from "../src/cropMasterModel.mjs"
const load = path => JSON.parse(fs.readFileSync(new URL(path, import.meta.url), "utf8"))
const summary = load("../src/generated/crop_master_summary.json")
const master = load("../public/data/crop-master-v1.json")
const production = load("../src/generated/production_public.json")

test("KPI counts biological identities once and excludes groups, synonyms and review records", () => {
 const a={id:"a",rank:"SPECIES",classification:"PUBLIC_SAFE",kpi_eligible:true,biological_species_key:"Lolium multiflorum"}
 assert.equal(countDistinctSeedSpecies([a,{...a,id:"alias"},{...a,id:"subspecies",rank:"SUBSPECIES"},{...a,id:"group",rank:"GENUS_GROUP",biological_species_key:"Lupinus spp."},{...a,classification:"REVIEW_ONLY",biological_species_key:"Unresolved identity"}]),1)
 assert.equal(countDistinctSeedSpecies(summary.entities),summary.distinct_seed_species)
 assert.equal(countDistinctSeedSpecies(master.entities.map(e=>({...e,biological_species_key:e.species}))),summary.distinct_seed_species)
})
test("All 1669 public production records resolve by stable ID without allocating group data", () => {
 assert.equal(production.observations.length,1669)
 const seen=[]
 for(const r of production.observations){const e=cropEntityForProduction(r,master);assert.ok(e);assert.equal(e.id,r.entity);seen.push(r.id)}
 assert.equal(new Set(seen).size,1669)
 const group=master.entities.find(e=>e.id==="lupins")
 assert.equal(group.rank,"GENUS_GROUP")
 for(const id of ["narrow-leaved-lupin","yellow-lupin","white-lupin"]){const e=master.entities.find(e=>e.id===id);assert.deepEqual(e.production_mapping.observation_ids,[])}
 assert.equal(cropEntityForProduction({...production.observations[0],id:"nonexistent"},master),null)
})
test("COMEXT genus/mustard totals remain group-level and are never species values",()=>{
 for(const code of ["12092950","12075010"]){const matches=cropEntitiesForTrade(code,master);assert.ok(matches.length>=4);assert.ok(matches.every(x=>x.resolution==="GROUP_LEVEL"&&!x.speciesValuesAvailable))}
 assert.equal(cropEntitiesForTrade("12092100",master)[0].resolution,"SPECIES_SPECIFIC")
 assert.deepEqual(cropEntitiesForTrade("99999999",master),[])
})
test("Unresolved taxonomy and vegetative propagation never enter biological seed KPI",()=>{
 assert.ok(!master.entities.some(e=>e.taxonomy_status==="REVIEW_REQUIRED"))
 for(const id of ["potato","garlic","sorghum-sudan-hybrid-group"]){const e=master.entities.find(e=>e.id===id);assert.equal(e.kpi_eligible,false)}
})
