import {range,reconcileCommercialBalance} from './seedIntelligence.mjs'
import {currentRedCloverSignal,classifySupplyPressure} from './currentMarketSignal.mjs'
export const campaignForYear=year=>`${year}/${String(year+1).slice(-2)}`
export const campaignKey=value=>{const match=/^(\d{4})\/(\d{2}|\d{4})$/.exec(value);if(!match)throw Error('INVALID_CAMPAIGN');return `${match[1]}/${match[2].slice(-2)}`}
export const priorities=['red-clover','italian-ryegrass','tall-fescue','perennial-ryegrass','red-fescue','meadow-fescue','phacelia','oilseed-radish-group','alfalfa','crimson-clover','berseem-clover','white-clover','cocksfoot']
export function supportedCoverage(data,legacy){
 const rows=[...legacy.observations,...data.production],countries=[...new Set(rows.map(r=>r.country))].sort()
 const crops=country=>[...new Set(rows.filter(r=>r.country===country).map(r=>r.entity).concat(data.published_balances.filter(r=>r.country===country).map(r=>r.entity)))].sort((a,b)=>(priorities.indexOf(a)<0?999:priorities.indexOf(a))-(priorities.indexOf(b)<0?999:priorities.indexOf(b))||a.localeCompare(b))
 return {countries,crops,rows}
}
export function summarizeTrade(months,startYear){
 const periods=Array.from({length:12},(_,n)=>`${n<6?startYear:startYear+1}-${String(n<6?n+7:n-5).padStart(2,'0')}`),seen=new Set()
 for(const row of months){if(seen.has(row.period))throw Error('DUPLICATE_TRADE_PERIOD');seen.add(row.period)}
 const selected=periods.map(period=>months.find(r=>r.period===period)||{period,imports:null,exports:null})
 const total=key=>selected.every(r=>r[key]!=null&&Number.isFinite(r[key])&&r[key]>=0)?selected.reduce((n,r)=>n+r[key],0):null
 return {periods,months:selected,imports:total('imports'),exports:total('exports'),reportedMonths:selected.filter(r=>r.imports!=null&&r.exports!=null).length,complete:selected.every(r=>r.imports!=null&&r.exports!=null)}
}
const valid=(v,name)=>{if(!Number.isFinite(v)||v<0)throw Error('INVALID_'+name);return v}
const multiply=(r,n)=>range(r.low*n,r.base*n,r.high*n)
export function analyzeSelection(catalogue,pilot,{country,entity,year},options={}){
 if(!Number.isInteger(year)||year<2021||year>2026)throw Error('UNSUPPORTED_CAMPAIGN')
 const campaign=campaignForYear(year),profile=catalogue.profiles.find(r=>r.country===country&&r.entity===entity),meta={schema:'SEEDTRADE_ANALYSIS_OUTPUT_V2',asOf:catalogue.as_of,country,entity,campaign,priceForecast:null,verifiedCurrentSignal:'INSUFFICIENT_EVIDENCE'}
 if(!profile)return {...meta,status:'EVIDENCE_ONLY',signal:'INSUFFICIENT_EVIDENCE',confidence:'PARTIAL_COVERAGE',reason:'NO_COMPARABLE_COMMERCIAL_BALANCE',controls:[],closing:null}
 const b=profile.baseline;if(b.country!==country||b.entity!==entity||b.unit!=='t')throw Error('BASELINE_SCOPE_MISMATCH')
 if(campaignKey(b.period)===campaign){const historical=reconcileCommercialBalance(b);return {...meta,status:'HISTORICAL_OBSERVED',signal:'INSUFFICIENT_EVIDENCE',confidence:'REPORTED_HISTORICAL_SCOPE',baseline:b,historical,closing:range(b.closing),controls:[],reason:'CLOSING_STOCKS_ARE_NOT_A_CURRENT_MARKET_SIGNAL'}}
 if(year<2025)return {...meta,status:'EVIDENCE_ONLY',signal:'INSUFFICIENT_EVIDENCE',confidence:'PARTIAL_COVERAGE',closing:null,controls:[],reason:'NO_MATCHED_CAMPAIGN_BALANCE'}
 const settings={...catalogue.defaults,...options},weather=1+(options.weatherSensitivity??0)/100
 if(!Number.isFinite(weather)||weather<0)throw Error('INVALID_WEATHER_SENSITIVITY')
 const stock=valid(settings.stockContinuity,'STOCK_CONTINUITY'),im=valid(settings.importScale,'IMPORT_SCALE'),ex=valid(settings.exportScale,'EXPORT_SCALE'),variation=valid(settings.seasonalVariation,'FLOW_VARIATION');if(variation>1)throw Error('INVALID_FLOW_VARIATION')
 const demandMultiplier=settings.domesticUseMultiplier;range(demandMultiplier.low,demandMultiplier.base,demandMultiplier.high);if(demandMultiplier.low<0)throw Error('INVALID_DEMAND')
 const controls=['demand','stock','weather']
 if(entity==='red-clover'&&country==='FR'){
  const original=currentRedCloverSignal(pilot,{useScopeBridge:settings.useScopeBridge,stockContinuity:stock,importScale:im,exportScale:ex,harvestShare:options.harvestShare||pilot.defaults.harvestShare,marketableYieldKgHa:multiply(options.marketableYieldKgHa||pilot.defaults.marketableYieldKgHa,weather),domesticUseMultiplier:demandMultiplier,remainingTradeMultiplier:range(1-variation,1,1+variation)})
  const selected=original.campaigns.find(r=>r.campaign===campaign)
  return {...meta,status:selected?.opening?'CURRENT_CONDITIONAL':'WITHHELD',signal:selected?.opening?classifySupplyPressure(selected.closing,b.closing):'INSUFFICIENT_EVIDENCE',baseCaseSignal:selected?.opening?classifySupplyPressure(range(selected.closing.base),b.closing):'INSUFFICIENT_EVIDENCE',confidence:'LOW',baseline:b,closing:selected?.opening?selected.closing:null,steps:original.campaigns,reason:original.reason,controls:[...controls,'harvest','marketableYield',...(year===2026?['imports','exports','tradeVariation']:[]) ,'scopeBridge'],productionBasis:profile.production_basis,tradeMethod:'REUSED_VERIFIED_PILOT_ENGINE',originalPilot:original,assumptions:['Existing pilot scope/date bridge and stock continuity remain assumptions.','Marketable yield includes the user sensitivity; no extra processing loss is added.'],weatherAutoImpact:false}
 }
 const pm=settings.productionMultiplier;range(pm.low,pm.base,pm.high);if(pm.low<0)throw Error('INVALID_PRODUCTION_MULTIPLIER')
 const production=multiply(pm,b.production*weather),demand=multiply(demandMultiplier,b.domesticSales),rows=profile.trade?.months,baseTrade=rows?summarizeTrade(rows,2024):null,priorTrade=rows?summarizeTrade(rows,2025):null
 const matched=baseTrade?.complete&&priorTrade?.complete,offset=matched?b.imports-b.exports-(baseTrade.imports-baseTrade.exports):null
 if(matched&&!settings.useScopeBridge)return {...meta,status:'WITHHELD',signal:'INSUFFICIENT_EVIDENCE',confidence:'LOW',closing:null,reason:'SOURCE_SCOPE_BRIDGE_REQUIRED',controls:[...controls,'production',...(year===2026?['imports','exports','tradeVariation']:[]),'scopeBridge'],baseline:b}
 const opening=range(b.closing*stock)
 // Same-source commercial flows remain whole-year assumptions when exact customs coverage is unavailable.
 const priorImports=matched?range(priorTrade.imports):multiply(range(1-variation,1,1+variation),b.imports*im)
 const priorExports=matched?range(priorTrade.exports):multiply(range(1-variation,1,1+variation),b.exports*ex)
 const netOffset=matched?offset:0
 // Preserve both signs of the explicitly assumed scope offset without inventing negative physical imports.
 const priorNet=range(priorImports.low-priorExports.high+netOffset,priorImports.base-priorExports.base+netOffset,priorImports.high-priorExports.low+netOffset)
 const close25=range(opening.low+production.low+priorNet.low-demand.high,opening.base+production.base+priorNet.base-demand.base,opening.high+production.high+priorNet.high-demand.low)
 const steps=[{campaign:'2025/26',opening,production,netTrade:priorNet,domesticUse:demand,closing:close25}]
 let provenance=[],method=matched?'EXACT_CUSTOMS_WITH_ASSUMED_SCOPE_BRIDGE':'HISTORICAL_COMMERCIAL_FLOW_CONTINUITY_SCENARIO'
 if(year===2026){
  if(close25.low<0)return {...meta,status:'WITHHELD',signal:'INSUFFICIENT_EVIDENCE',confidence:'LOW',closing:null,steps,reason:'PRIOR_CAMPAIGN_GAP_NOT_RESOLVED',controls:[...controls,'production','imports','exports','tradeVariation'],baseline:b}
  let net
  if(matched){
   const current=summarizeTrade(rows,2026);let observedI=0,observedE=0,remainingI=0,remainingE=0
   for(const row of current.months){const prev=priorTrade.months.find(p=>p.period.slice(5)===row.period.slice(5));for(const key of ['imports','exports']){
    if(row[key]!=null){if(key==='imports')observedI+=row[key];else observedE+=row[key];provenance.push({period:row.period,flow:key,value:row[key],classification:'OBSERVED'})}
    else{if(key==='imports')remainingI+=prev[key];else remainingE+=prev[key];provenance.push({period:row.period,flow:key,referencePeriod:prev.period,value:prev[key],classification:'SCENARIO'})}
   }}
   net=range(observedI-observedE+remainingI*im*(1-variation)-remainingE*ex*(1+variation)+offset,observedI-observedE+remainingI*im-remainingE*ex+offset,observedI-observedE+remainingI*im*(1+variation)-remainingE*ex*(1-variation)+offset)
  }else net=range(priorImports.low-priorExports.high,priorImports.base-priorExports.base,priorImports.high-priorExports.low)
  const closing=range(close25.low+production.low+net.low-demand.high,close25.base+production.base+net.base-demand.base,close25.high+production.high+net.high-demand.low);steps.push({campaign:'2026/27',opening:close25,production,netTrade:net,domesticUse:demand,closing})
 }
 const closing=steps.at(-1).closing
 return {...meta,status:'CURRENT_CONDITIONAL',signal:classifySupplyPressure(closing,b.closing),baseCaseSignal:classifySupplyPressure(range(closing.base),b.closing),confidence:'LOW',closing,steps,baseline:b,controls:[...controls,'production',...(!matched||year===2026?['imports','exports','tradeVariation']:[]),...(matched?['scopeBridge']:[])],tradeMethod:method,tradeProvenance:provenance,scopeOffset:offset,productionBasis:'REPORTED_COMMERCIAL_QUANTITY_NOT_RAW_HARVEST',assumptions:['Commercial production is the historical reported quantity multiplied by explicit low/base/high scenario factors, not a current harvest observation.','Demand and opening-stock continuity are assumptions; weather sensitivity is user-entered, never an automatic loss estimate.',matched?'Historical customs/commercial scope and campaign-date bridge is explicitly assumed.':'No exact comparable full-year customs basis: whole-year historical commercial imports/exports are carried as assumptions. Partial customs evidence is not added.','No certified quantity, organic subset or cleaning loss is added to an already-commercial quantity.'],weatherAutoImpact:false}
}
