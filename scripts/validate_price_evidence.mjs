import fs from 'node:fs'
import path from 'node:path'
import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import {fileURLToPath} from 'node:url'
import {isDeepStrictEqual} from 'node:util'
import {validOwnerPrice,ownerPriceTypes} from '../src/marketPricePresentation.mjs'
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..')
export function validatePriceEvidence(base=root){
 const read=p=>JSON.parse(fs.readFileSync(path.join(base,p),'utf8')),ledger=read('data/price-evidence/observations.json'),projection=read('src/generated/price_evidence_public.json'),ids=new Set(read('src/generated/market_catalogue_public.json').cards.map(c=>c.market_entity_id)),seen=new Set()
 const required=['species','country','type','price','currency','unit','packKg','source','sourceUrl','publicationDate','observationDate','retrievedAt','validUntil','vatBasis','deliveryTerms','certification','qualityContext','variety','status','currentAvailabilityConfirmed','evidenceFile','evidenceSha256','evidenceKind']
 const published=read('src/generated/kaina_prices_public.json'),publishedSpecies=new Set()
 assert.equal(published.workflow,'KAINA_UNIFIED_V1','Unified pricing installation marker required')
 for(const r of published.records){assert(ids.has(r.species)&&r.commandVersion===1&&validOwnerPrice(r),'Invalid published KAINA assessment');assert(!publishedSpecies.has(r.species),'Duplicate published assessment');for(const d of [r.receivedDate,r.observationDate])if(d!==null)assert(/^\d{4}-\d{2}-\d{2}$/.test(d)&&!Number.isNaN(Date.parse(d)),'Invalid published assessment date');publishedSpecies.add(r.species)}
 for(const r of ledger.records){
  for(const k of required)assert(Object.hasOwn(r,k),'Missing price attribute: '+k)
  assert(!seen.has(r.id),'Duplicate price identity');seen.add(r.id);assert(ids.has(r.species))
  const f=path.resolve(base,'data/price-evidence/evidence',r.evidenceFile)
  assert(f.startsWith(path.resolve(base,'data/price-evidence/evidence')+path.sep))
  assert.equal(createHash('sha256').update(fs.readFileSync(f)).digest('hex'),r.evidenceSha256,'Price source capture mismatch')
  if(r.commandVersion!==undefined){
   assert(validOwnerPrice(r),'Invalid KAINA owner reference')
   const proof=JSON.parse(fs.readFileSync(f,'utf8')),entry=proof.entries.find(e=>e.species===r.species)
   assert.equal(proof.version,1);assert(/^KAINA(?:\s|$)/i.test(proof.input.trimStart()));assert(entry)
   assert.equal(r.id,`kaina-${String(proof.sequence).padStart(6,'0')}-${r.species}`)
   assert.equal(r.retrievedAt,proof.timestampUTC);assert.equal(r.receivedDate,proof.timestampUTC.slice(0,10))
   const md=entry.metadata
   for(const k of ['vatBasis','packKg','certification','variety','declaredSupplier','packaging'])assert.equal(r[k],md[k]??null,'Owner metadata mismatch: '+k)
   for(const k of ['publicationDate','validUntil','country','deliveryTerms','qualityContext'])assert.equal(r[k],null)
   assert.equal(r.unit,entry.unit)
   if(entry.kind==='FORMULA'){
    assert.equal(r.type,'OWNER_MODEL_ESTIMATE');assert.equal(r.model.premiumEURt,entry.premiumEURt);assert.equal(r.model.multiplier,entry.multiplier)
    assert(ledger.records.some(old=>old.commandVersion===undefined&&old.evidenceKind==='DATED_BENCHMARK_AND_OWNER_FORMULA'&&isDeepStrictEqual(old.benchmark,r.benchmark)),'KAINA requires existing verified benchmark evidence')
    assert.equal(r.sourceUrl,r.benchmark.sourceUrl);assert.equal(r.observationDate,r.benchmark.observationDate)
   }else{
    assert.equal(entry.kind,'RANGE');for(const k of ['low','high','midpoint','unitCount'])assert.equal(r[k],entry[k])
    assert.equal(r.sourceUrl,md.sourceUrl??null);assert.equal(r.observationDate,md.observationDate??null)
   }
  }else if(ownerPriceTypes.includes(r.type)){
   assert(validOwnerPrice(r),'Invalid owner price reference')
   assert.equal(r.country,null);assert.equal(r.packKg,null)
   for(const k of ['publicationDate','validUntil','deliveryTerms','certification','qualityContext','variety'])assert.equal(r[k],null,'Unknown owner context must remain null: '+k)
   const evidence=JSON.parse(fs.readFileSync(f,'utf8'))
   if(r.type==='OWNER_MODEL_ESTIMATE'){
    assert(['wheat','triticale','barley'].includes(r.species));assert.equal(r.evidenceKind,'DATED_BENCHMARK_AND_OWNER_FORMULA')
    assert.deepEqual(r.benchmark,evidence);assert.equal(r.observationDate,evidence.observationDate);assert.equal(r.sourceUrl,evidence.sourceUrl)
    const capture=path.resolve(path.dirname(f),evidence.captureFile);assert(capture.startsWith(path.dirname(f)+path.sep))
    assert.equal(createHash('sha256').update(fs.readFileSync(capture)).digest('hex'),evidence.captureSha256)
   }else{
    assert.equal(r.evidenceKind,'OWNER_INSTRUCTION');assert.equal(r.sourceUrl,null);assert.equal(r.observationDate,null)
    assert.deepEqual([r.species,r.low,r.high,r.midpoint,r.unit,r.unitCount,r.type],evidence.records.find(row=>row[0]===r.species),'Owner endpoints and units must match instruction')
    assert.equal(r.seedSegment,null,'Ordinary / SMART scope is not established')
    if(r.species==='soybean'){assert.equal(r.type,'OWNER_ESTIMATE');assert.equal(r.ownerSeedDescription,'CERTIFIED_SEED');assert.deepEqual(r.tonneEquivalent,{low:r.low*1000,high:r.high*1000,unit:'t'});assert.deepEqual(evidence.soybeanEquivalentEURt,[r.tonneEquivalent.low,r.tonneEquivalent.high])}
   }
  }else{
   assert(['SUPPLIER_ASK','PUBLISHED_PRICE_LIST'].includes(r.type));assert(Number.isFinite(r.price)&&r.price>0&&r.unit==='kg'&&r.packKg>0)
   assert(/^[A-Z]{3}$/.test(r.currency)&&/^[A-Z]{2}$/.test(r.country)&&/^https:\/\//.test(r.sourceUrl));assert.equal(r.status,'VERIFIED_SOURCE_FACTS')
   assert(!r.currentAvailabilityConfirmed||r.observationDate&&r.evidenceKind==='DIRECT_PROVIDER_HTML')
  }
  assert(['EXCLUDED','INCLUDED',null].includes(r.vatBasis))
  for(const value of [r.observationDate,r.publicationDate,r.validUntil])if(value!==null)assert(/^\d{4}-\d{2}-\d{2}$/.test(value)&&!Number.isNaN(Date.parse(value)))
  assert(Date.parse(r.retrievedAt)<=Date.now()+300000);assert(!r.observationDate||r.observationDate<=r.retrievedAt.slice(0,10))
 }
 const expected=ledger.records.map(r=>Object.fromEntries(Object.entries(r).filter(([k])=>!['evidenceFile','sourceLocator'].includes(k))));assert.deepEqual(projection.records,expected,'Price projection must match verified ledger');return {status:'PASS',observations:seen.size,datedDirect:ledger.records.filter(r=>r.observationDate&&r.evidenceKind==='DIRECT_PROVIDER_HTML').length}
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))console.log(JSON.stringify(validatePriceEvidence()))
