// Availability index only: reuse the explorer's public loader, never allocate
// group/parent observations to a catalogue species or commercial form.
import fs from 'node:fs'
import {createHash} from 'node:crypto'
import data from '../src/productionCoverageData.mjs'
import {selectEvidence,metricLabels} from '../src/productionEvidence.mjs'

const catalogue=JSON.parse(fs.readFileSync('src/generated/market_catalogue_public.json','utf8'))
const master=JSON.parse(fs.readFileSync('public/data/crop-master-v1.json','utf8'))
const canonical=new Map(master.entities.map(e=>[e.id,e]))
const entities=new Map(data.entities.map(e=>[e.id,e]))
const groups={triticale:'triticale-group',festulolium:'festulolium-group'}
const entries={}
for(const card of catalogue.cards){
  const id=card.market_entity_id,group=canonical.get(groups[id])
  // These two catalogue entries explicitly describe the same hybrid genus
  // groups. This is not a species-level alias and is labelled in the UI.
  const groupMatch=card.commercial_entity_type==='INTERGENERIC_HYBRID_GROUP'&&group?.rank==='HYBRID_GENUS_GROUP'&&group.botanical===card.botanical_display_name
  const target=groupMatch?group.id:
    entities.has(id)&&canonical.has(id)?id:
    card.commercial_entity_type==='SPECIES_MARKET_ENTITY'&&canonical.has(card.biological_species_id)?card.biological_species_id:null
  const series=target?selectEvidence(data,{entity:target}).filter(s=>Object.hasOwn(metricLabels,s.metric)):[]
  if(series.length){
    entries[id]={entity:target,scope:groupMatch?'GROUP':'EXACT',
      series:series.map(s=>[s.id,s.country,s.metric,[...new Set(s.points.map(p=>p.year))].sort((a,b)=>a-b)])}
  }else{
    const parent=card.biological_species_id
    const broader=parent&&parent!==id&&selectEvidence(data,{entity:parent}).length>0
    entries[id]={entity:null,scope:broader?'RELATED_ONLY':'NONE',series:[]}
  }
}
const inputs=['src/generated/market_catalogue_public.json','public/data/crop-master-v1.json','src/generated/production_public.json','src/generated/production_coverage_additions.json']
const index={version:1,inputs:Object.fromEntries(inputs.map(p=>[p,createHash('sha256').update(fs.readFileSync(p)).digest('hex')])),entries}
const output='src/generated/catalogue_production_links.json',text=JSON.stringify(index)+'\n'
if(process.argv.includes('--check')){
  if(!fs.existsSync(output)||fs.readFileSync(output,'utf8')!==text)throw Error('Catalogue production availability index is stale; regenerate it locally.')
}else fs.writeFileSync(output,text)
console.log(JSON.stringify({output,bytes:Buffer.byteLength(text),coverage:Object.fromEntries(['EXACT','GROUP','RELATED_ONLY','NONE'].map(scope=>[scope,Object.values(entries).filter(e=>e.scope===scope).length]))}))
