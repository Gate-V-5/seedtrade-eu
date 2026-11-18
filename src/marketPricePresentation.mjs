import supplierPrices from './generated/price_evidence_public.json' with {type:'json'}
import publishedOwnerPrices from './generated/kaina_prices_public.json' with {type:'json'}
const prices={records:[...supplierPrices.records,...publishedOwnerPrices.records]}
import ranges from './generated/estimated_market_ranges_public.json' with {type:'json'}
import {supplierEvidence} from './marketBriefingEvidence.mjs'
import {latestTradeUnitValue} from './commercialEvidence.mjs'

const locales={EN:'en-GB',DE:'de-DE',FR:'fr-FR',ES:'es-ES',IT:'it-IT'}
export const ownerPriceTypes=Object.freeze(['OWNER_ESTIMATE','OWNER_SOURCE_RANGE','OWNER_MODEL_ESTIMATE'])
const positive=n=>typeof n==='number'&&Number.isFinite(n)&&n>0
// Work in currency cents, and round half up to match the supplied reference values.
export const arithmeticMidpoint=(low,high)=>positive(low)&&positive(high)&&high>=low?Math.round((Math.round(low*100)+Math.round(high*100))/2)/100:null
export function benchmarkSeedEstimate(benchmark,model){
 if(!benchmark||!model||benchmark.currency!=='EUR'||benchmark.unit!=='t'||!positive(benchmark.value)||!/^\d{4}-\d{2}-\d{2}$/.test(benchmark.observationDate||'')||Number.isNaN(Date.parse(benchmark.observationDate))||!/^\d{4}-\d{2}$/.test(benchmark.contract||'')||!/^https:\/\//.test(benchmark.sourceUrl||'')||!((model.premiumEURt===200&&model.multiplier===1.30)||(model.premiumEURt===300&&model.multiplier===1)||(model.kind==='OWNER_FORMULA_V1'&&positive(model.premiumEURt)&&model.premiumEURt<=10000000&&positive(model.multiplier)&&model.multiplier<=100)))return null
 return Math.round((Math.round(benchmark.value*100)+Math.round(model.premiumEURt*100))*Math.round(model.multiplier*100)/100)/100
}
export function validOwnerPrice(r){
 if(r&&Object.hasOwn(r,'commandVersion'))return validCommandPrice(r)
 if(!ownerPriceTypes.includes(r?.type)||r.currency!=='EUR'||!['kg','t','seed-count'].includes(r.unit)||r.currentAvailabilityConfirmed!==false||r.vatBasis!==null||!r.source||!r.receivedDate||!/^[a-f0-9]{64}$/.test(r.evidenceSha256||''))return false
 if(r.type==='OWNER_MODEL_ESTIMATE')return ['wheat','triticale','barley'].includes(r.species)&&(r.species==='barley'?r.model?.premiumEURt===300&&r.model?.multiplier===1:r.model?.premiumEURt===200&&r.model?.multiplier===1.30)&& r.status==='MODELLED_FROM_DATED_BENCHMARK'&&r.unit==='t'&&r.model?.wheatProxy===['triticale','barley'].includes(r.species)&&benchmarkSeedEstimate(r.benchmark,r.model)===r.price&&positive(r.price)
 return r.status==='OWNER_SUPPLIED_UNVERIFIED'&&positive(r.low)&&positive(r.high)&&r.high>=r.low&&arithmeticMidpoint(r.low,r.high)===r.midpoint&&(r.unit!=='seed-count'||Number.isSafeInteger(r.unitCount)&&r.unitCount>0)
}
export function validCommandPrice(r){
 if(r.commandVersion!==1||!ownerPriceTypes.includes(r.type)||r.currency!=='EUR'||!['kg','t','seed-count'].includes(r.unit)||r.currentAvailabilityConfirmed!==false||!['INCLUDED','EXCLUDED',null].includes(r.vatBasis)||r.evidenceKind!=='KAINA_OWNER_INSTRUCTION'||!/^kaina-\d{6}-[a-z0-9-]+$/.test(r.id||'')||!/^[a-f0-9]{64}$/.test(r.evidenceSha256||'')||!r.receivedDate)return false
 if(r.packKg!==null&&!positive(r.packKg))return false
 if(r.type==='OWNER_MODEL_ESTIMATE')return r.status==='MODELLED_FROM_DATED_BENCHMARK'&&r.unit==='t'&&r.model?.kind==='OWNER_FORMULA_V1'&&r.model.wheatProxy===(r.species!=='wheat')&&positive(r.price)&&benchmarkSeedEstimate(r.benchmark,r.model)===r.price
 if(r.type!=='OWNER_ESTIMATE'||r.status!=='OWNER_SUPPLIED_UNVERIFIED'||!positive(r.low)||!positive(r.high)||r.high<r.low||arithmeticMidpoint(r.low,r.high)!==r.midpoint)return false
 if(r.unit==='seed-count')return Number.isSafeInteger(r.unitCount)&&r.unitCount>0&&!r.massEquivalent
 const factor=r.unit==='kg'?1000:.001
 return r.massEquivalent?.unit===(r.unit==='kg'?'t':'kg')&&Math.abs(r.massEquivalent.low-r.low*factor)<1e-9&&Math.abs(r.massEquivalent.high-r.high*factor)<1e-9
}
export function priceEvidenceFor(card,registry=prices.records){
 const entity=card.market_entity_id
 const owner=registry.filter(r=>r.species===entity&&validOwnerPrice(r)).slice(-1)
 const supplier=supplierEvidence(entity,registry)
 const historical=ranges.records[entity],history=historical?.state==='RANGE'&&historical.lower_eur_kg!=null&&historical.upper_eur_kg!=null&&positive(Number(historical.lower_eur_kg))&&positive(Number(historical.upper_eur_kg))?[{id:entity+'-historical',type:'MODELLED_RANGE',low:Number(historical.lower_eur_kg),high:Number(historical.upper_eur_kg),midpoint:arithmeticMidpoint(Number(historical.lower_eur_kg),Number(historical.upper_eur_kg)),unit:'kg',currency:'EUR',vatBasis:entity==='dill'?null:'EXCLUDED',observationDate:null,sourceUrl:null}]:[]
 const trade=latestTradeUnitValue(card.price_observations)
 const customs=trade?[{id:entity+'-customs',type:'CUSTOMS_UNIT_VALUE',price:trade.price_eur_kg,currency:'EUR',unit:'kg',observationDate:trade.period,sourceUrl:card.sources.find(s=>/eurostat|comext/i.test(s.organisation+' '+s.title))?.url||'https://ec.europa.eu/eurostat/web/international-trade-in-goods/database',source:'Eurostat COMEXT',vatBasis:null}]:[]
 return {records:[...owner,...supplier,...history,...customs],hasSeedIndication:!!(owner.length||supplier.length||history.length),customsOnly:!owner.length&&!supplier.length&&!history.length&&!!customs.length}
}
export const ownerPriceFor=entity=>prices.records.filter(r=>r.species===entity&&validOwnerPrice(r)).at(-1)||null
export function formatPriceNumber(value,currency='EUR',language='EN'){
 return positive(value)?new Intl.NumberFormat(locales[language]||locales.EN,{style:'currency',currency,minimumFractionDigits:2,maximumFractionDigits:2}).format(value):null
}
export function formatPriceUnit(r,language='EN',seeds='seeds'){
 if(r.unit==='seed-count')return `${new Intl.NumberFormat(locales[language]||locales.EN).format(r.unitCount)} ${seeds}`
 return r.unit
}
export function priceEvidenceLabel(type){return {OWNER_ESTIMATE:'Owner indicative estimate',OWNER_SOURCE_RANGE:'Owner-supplied source range',OWNER_MODEL_ESTIMATE:'Benchmark-based seed estimate',MODELLED_RANGE:'Historical modelled range',CUSTOMS_UNIT_VALUE:'Customs trade unit value',SUPPLIER_ASK:'Supplier asking price',PUBLISHED_PRICE_LIST:'Published price list'}[type]}
