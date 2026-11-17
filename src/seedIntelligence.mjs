// Pure calculation layer. Facts, historical sensitivities and user scenarios never merge implicitly.
export const MISSING = new Set(['NOT_REPORTED','NOT_AVAILABLE'])
export function valueState(value,status='OBSERVED') {
  if(value===null||value===undefined||MISSING.has(status))return {value:null,status:MISSING.has(status)?status:'NOT_AVAILABLE'}
  if(typeof value!=='number'||!Number.isFinite(value)||value<0)throw Error('INVALID_VALUE')
  if(value===0&&status!=='VERIFIED_ZERO')return {value:0,status:'REPORTED_ZERO_UNVERIFIED'}
  if(status==='VERIFIED_ZERO'&&value!==0)throw Error('ZERO_STATUS_MISMATCH')
  return {value,status}
}
export function range(low,base=low,high=base) {
  if(![low,base,high].every(x=>typeof x==='number'&&Number.isFinite(x))||low>base||base>high)throw Error('INVALID_RANGE')
  return {low,base,high}
}
const nonnegative=r=>{range(r.low,r.base,r.high);if(r.low<0)throw Error('NEGATIVE_INPUT');return r}
const fraction=r=>{nonnegative(r);if(r.high>1)throw Error('FRACTION_OUT_OF_RANGE');return r}
const multiply=(...rs)=>range(...['low','base','high'].map(k=>rs.reduce((v,r)=>v*r[k],1)))
export function productionScenario({areaHa,yieldKgHa,harvestShare,cleaningRecovery,marketableShare,weatherMultiplier=range(1),incrementalFarmSavedTonnes=null,incrementalConfirmed=false}) {
  if(!areaHa||!yieldKgHa||!harvestShare||!cleaningRecovery||!marketableShare)return {status:'NOT_AVAILABLE',harvested:null,cleaned:null,marketable:null}
  nonnegative(areaHa);nonnegative(yieldKgHa);fraction(harvestShare);fraction(cleaningRecovery);fraction(marketableShare);nonnegative(weatherMultiplier)
  const seedHarvestedHa=multiply(areaHa,harvestShare),harvested=multiply(seedHarvestedHa,yieldKgHa,weatherMultiplier,range(.001)),cleaned=multiply(harvested,cleaningRecovery)
  let marketable=multiply(cleaned,marketableShare)
  if(incrementalFarmSavedTonnes){if(!incrementalConfirmed)throw Error('NON_CERTIFIED_OVERLAP_NOT_EXCLUDED');nonnegative(incrementalFarmSavedTonnes);marketable=range(...['low','base','high'].map(k=>marketable[k]+incrementalFarmSavedTonnes[k]))}
  return {status:'SCENARIO',seedHarvestedHa,harvested,cleaned,marketable,certifiedQuantityAdded:false}
}
export function potentialSeedArea(cropAreaHa,share,basis) {
  if(basis!=='POTENTIAL_REALLOCATION')throw Error('TOTAL_CROP_AREA_IS_NOT_SEED_AREA')
  return {status:'SCENARIO',area:multiply(nonnegative(cropAreaHa),fraction(share)),basis,additiveToExistingSeedArea:false}
}
export function seedUseDemand(areaHa,renewalShare,sowingKgHa) {
  return {status:'ESTIMATED',tonnes:multiply(nonnegative(areaHa),fraction(renewalShare),nonnegative(sowingKgHa),range(.001))}
}
export function historicalYieldRange(rows,entity,country,throughYear=Infinity) {
  const points=rows.filter(r=>r.entity===entity&&r.country===country&&r.year<=throughYear&&r.metric==='REPORTED_SEED_YIELD'&&r.unit==='kg/ha'&&Number.isFinite(r.value)),values=points.map(r=>r.value).sort((a,b)=>a-b)
  if(!values.length)return null
  const n=values.length,median=n%2?values[(n-1)/2]:(values[n/2-1]+values[n/2])/2
  return {...range(values[0],median,values.at(-1)),status:'HISTORICAL_SENSITIVITY_NOT_FORECAST',references:points.map(r=>r.id),years:points.map(r=>r.year)}
}
export function reconcileCommercialBalance(row,shockPercent=0) {
 if(!row||row.unit!=='t'||row.status!=='REPORTED_COMMERCIAL_BALANCE')throw Error('REPORTED_BALANCE_REQUIRED')
 for(const key of ['opening','production','imports','domesticSales','exports','closing'])if(!Number.isFinite(row[key])||row[key]<0)throw Error('INVALID_REPORTED_BALANCE')
 if(!row.source||!row.period||!row.entity||!row.country)throw Error('BALANCE_PROVENANCE_REQUIRED')
 if(!Number.isFinite(shockPercent)||shockPercent<0||shockPercent>100)throw Error('INVALID_PRODUCTION_SHOCK')
 const calculated=row.opening+row.production+row.imports-row.domesticSales-row.exports,residual=row.closing-calculated
 if(Math.abs(residual)>(row.rounding_tolerance_t??0)+1e-8)throw Error('BALANCE_DOES_NOT_RECONCILE')
 return {status:'RECONCILED_REPORTED_BALANCE',calculatedClosing:calculated,reportedClosing:row.closing,residual,scenarioClosing:range(calculated-row.production*shockPercent/100,calculated,calculated+row.production*shockPercent/100),stockChange:row.closing-row.opening,shockPercent,interpretation:'REMAINING_COMMERCIAL_STOCK_NOT_SURPLUS_OR_TOTAL_BIOLOGICAL_SUPPLY',assumptions:shockPercent?['Symmetric production shock; all other commercial inputs held constant; no calibrated weather attribution']:[]}
}
export function balance({production,stocks,imports,exports,demand,context}) {
  const items={production,stocks,imports,exports,demand},missing=Object.keys(items).filter(k=>!items[k]||items[k].amount===null||MISSING.has(items[k].status))
  const evidenceCoverage=Object.entries(items).filter(([k,r])=>r&&!missing.includes(k)&&r.status!=='SCENARIO'&&r.reference).length/5
  if(missing.length)return {status:'INSUFFICIENT_EVIDENCE',missing,net:null,inputCoverage:(5-missing.length)/5,evidenceCoverage}
  for(const item of Object.values(items)){
    for(const k of ['entity','geography','period','unit'])if(item[k]!==context[k])throw Error('INCOMPATIBLE_'+k.toUpperCase())
    if(item.status==='SCENARIO'&&!item.assumption)throw Error('SCENARIO_ASSUMPTION_REQUIRED')
    if(item.status!=='SCENARIO'&&!item.reference)throw Error('PROVENANCE_REQUIRED')
    nonnegative(item.amount)
  }
  if(context.unit!=='t')throw Error('TONNES_REQUIRED')
  const p=production.amount,s=stocks.amount,i=imports.amount,e=exports.amount,d=demand.amount
  const net=range(p.low+s.low+i.low-e.high-d.high,p.base+s.base+i.base-e.base-d.base,p.high+s.high+i.high-e.low-d.low),tolerance=d.base*.05
  const signal=net.low>tolerance?'POTENTIAL_SURPLUS':net.high<-tolerance?'POTENTIAL_SHORTAGE':net.low>=-tolerance&&net.high<=tolerance?'BROADLY_BALANCED':'BALANCE_UNCERTAIN'
  return {status:Object.values(items).some(r=>r.status==='SCENARIO')?'CONDITIONAL_SCENARIO':'ESTIMATED_BALANCE',signal,net,inputCoverage:1,evidenceCoverage,drivers:Object.entries(items).map(([key,r])=>({key,base:r.amount.base,status:r.status,reference:r.reference??null,assumption:r.assumption??null})),confidence:'LIMITED',toleranceRule:'5% of base demand; exploratory convention, not calibrated forecast'}
}
// Only boundary-crossing records count in EU-wide balances; never add internal dispatches to EU supply.
export function boundaryTrade(rows,{geography,period,entity,euCountries}) {
  const seen=new Set(),selected=[]
  for(const row of rows){
    if(row.period!==period||row.entity!==entity)continue
    if(row.unit!=='t'||row.scope!=='SPECIES_SPECIFIC')throw Error('TRADE_SCOPE_OR_UNIT_MISMATCH')
    if(row.reporter===row.partner)throw Error('SELF_TRADE')
    const reporterEU=euCountries.includes(row.reporter),partnerEU=euCountries.includes(row.partner)
    if(geography==='EU27'){if(!reporterEU||partnerEU)continue}else if(row.reporter!==geography)continue
    if(!['IMPORT','EXPORT'].includes(row.direction))throw Error('TRADE_DIRECTION')
    const key=[row.reporter,row.partner,row.direction,row.period,row.cn8].join('|')
    if(seen.has(key))throw Error('DUPLICATE_TRADE_GRAIN');seen.add(key)
    valueState(row.value,row.status);if(!row.reference)throw Error('PROVENANCE_REQUIRED');selected.push(row)
  }
  const total=direction=>{
    const entries=selected.filter(r=>r.direction===direction)
    if(!entries.length||entries.some(r=>r.value==null||MISSING.has(r.status)))return null
    return entries.reduce((a,r)=>a+r.value,0)
  }
  return {imports:total('IMPORT'),exports:total('EXPORT'),records:selected,coverage:'PARTIAL_COVERAGE_UNLESS_INDEPENDENTLY_CONFIRMED'}
}
export const stageNames=['Sowing','Emergence','Vegetative growth','Flowering','Seed filling','Maturity','Harvest']
export function cropCalendar(entity) {
  const grass=['perennial-ryegrass','annual-ryegrass','italian-ryegrass','meadow-fescue','red-fescue','tall-fescue','cocksfoot'].includes(entity)
  const spring=['phacelia','oilseed-radish-group'].includes(entity)
  return {Sowing:spring?[3,4]:[8,9],Emergence:spring?[4,5]:[9,10],'Vegetative growth':[3,4],Flowering:grass?[5,6]:[6,7],'Seed filling':grass?[6,7]:[7,8],Maturity:grass?[7]:[8],Harvest:grass?[7,8]:[8,9]}
}
function aggregate(rows) {
  if(!rows.length)return null
  const valid=key=>rows.map(r=>r[key]).filter(v=>typeof v==='number'&&Number.isFinite(v)),sum=a=>a.reduce((x,y)=>x+y,0)
  const full=key=>valid(key).length===rows.length
  return {days:rows.length,precipitation:full('PRECTOTCORR')?sum(valid('PRECTOTCORR')):null,temperature:full('T2M')?sum(valid('T2M'))/rows.length:null,soil:full('GWETROOT')?sum(valid('GWETROOT'))/rows.length:null,heatDays:full('T2M_MAX')?valid('T2M_MAX').filter(v=>v>=30).length:null,frostDays:full('T2M_MIN')?valid('T2M_MIN').filter(v=>v<0).length:null,wetDays:full('PRECTOTCORR')?valid('PRECTOTCORR').filter(v=>v>=5).length:null}
}
export function weatherStages(data,{region,entity,year}) {
  const r=data.regions.find(r=>r.id===region);if(!r||!r.crops.includes(entity))return []
  const rows=data.weather.filter(r=>r.region===region),calendar=cropCalendar(entity),last=rows.filter(r=>r.date.startsWith(String(year))).at(-1)?.date
  return stageNames.map(stage=>{
    const months=calendar[stage],target=rows.filter(r=>r.date.startsWith(String(year))&&months.includes(Number(r.date.slice(5,7)))),observed=aggregate(target)
    const expected=months.reduce((n,m)=>n+new Date(Date.UTC(year,m,0)).getUTCDate(),0)
    if(!observed||observed.days!==expected)return {stage,months,status:'NOT_AVAILABLE',observed:null,baseline:null,impact:'UNVALIDATED',yieldImpact:null,lastDate:last}
    const years=[]
    // Matched calendar dates; leap-day excluded from historical normal for consistency.
    const dates=new Set(target.map(r=>r.date.slice(5)).filter(d=>d!=='02-29'))
    for(let y=2015;y<=2023;y++){
      const baselineRows=rows.filter(r=>r.date.startsWith(String(y))&&dates.has(r.date.slice(5)))
      if(baselineRows.length===dates.size){const a=aggregate(baselineRows);if(a&&Object.values(a).every(v=>v!==null))years.push(a)}
    }
    const baseline=years.length===9?Object.fromEntries(['precipitation','temperature','soil'].map(k=>[k,years.reduce((s,r)=>s+r[k],0)/years.length])):null
    const flags=[]
    if(observed.heatDays>0)flags.push('Heat exposure')
    if(observed.frostDays>0)flags.push('Frost exposure')
    if(baseline&&baseline.precipitation>0&&observed.precipitation!==null&&observed.soil!==null&&observed.precipitation/baseline.precipitation<.6&&observed.soil<baseline.soil)flags.push('Dryness proxy')
    if(stage==='Harvest'&&observed.wetDays>=5)flags.push('Harvest rain exposure')
    return {stage,months,status:'OBSERVED_GRIDDED_WEATHER',observed,baseline,baselineYears:years.length,flags,impact:'UNVALIDATED',yieldImpact:null,calendar:'INDICATIVE_ASSUMPTION_NOT_FIELD_PHENOLOGY',lastDate:last}
  })
}
export function forecastDays(snapshot,asOf) {
  if(!snapshot||snapshot.status==='NOT_AVAILABLE')return {status:'NOT_AVAILABLE',days:[]}
  if(!asOf||!Number.isFinite(Date.parse(asOf)))throw Error('FORECAST_REFERENCE_TIME_REQUIRED')
  if(Date.parse(snapshot.valid_until)<=Date.parse(asOf))return {status:'STALE',days:[]}
  const byDay=new Map();let previousEnd=-Infinity
  for(const point of snapshot.points){
    if(point.durationHours==null)continue
    const start=Date.parse(point.time),end=start+point.durationHours*3600000
    if(!Number.isFinite(start)||![1,6].includes(point.durationHours)||start<previousEnd)throw Error('FORECAST_PERIOD_OVERLAP_OR_INVALID')
    previousEnd=end
    if(new Date(end-1).toISOString().slice(0,10)!==point.time.slice(0,10))continue
    const key=point.time.slice(0,10),row=byDay.get(key)||{date:key,hours:0,precipitation:0,temperatures:[],complete:true};row.hours+=point.durationHours
    if(point.precipitation==null||point.temperature==null||point.precipitation<0)row.complete=false
    else{row.precipitation+=point.precipitation;row.temperatures.push(point.temperature)}
    byDay.set(key,row)
  }
  const days=[...byDay.values()].filter(r=>r.complete&&r.hours===24&&r.date>=asOf.slice(0,10)).slice(0,7).map(r=>({date:r.date,precipitation:r.precipitation,sampledMinimum:Math.min(...r.temperatures),sampledMaximum:Math.max(...r.temperatures),hours:24,status:'FORECAST_NOT_OBSERVED'}))
  return {status:'FORECAST_NOT_OBSERVED',days,issued_at:snapshot.issued_at,valid_until:snapshot.valid_until,provider:snapshot.source.provider}
}
