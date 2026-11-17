import {range} from './seedIntelligence.mjs'
const keys=['low','base','high']
function physical(r,{fraction=false}={}){range(r.low,r.base,r.high);if(r.low<0||(fraction&&r.high>1))throw Error('INVALID_SCENARIO_INPUT');return r}
export function classifySupplyPressure(r,reference,tolerance=.05){
 range(r.low,r.base,r.high);if(!Number.isFinite(reference)||reference<=0||!Number.isFinite(tolerance)||tolerance<0)throw Error('INVALID_REFERENCE')
 const lower=reference*(1-tolerance),upper=reference*(1+tolerance)
 return r.high<lower?'SUPPLY_TIGHTENING':r.low>upper?'SUPPLY_EASING':r.low>=lower&&r.high<=upper?'BROADLY_BALANCED':'INSUFFICIENT_EVIDENCE'
}
export function currentRedCloverSignal(data,options={}){
 if(data.entity!=='red-clover'||data.country!=='FR')throw Error('PILOT_SCOPE_MISMATCH')
 const settings={...data.defaults,...options},baseline=data.historical_baseline,prior=data.trade_campaigns['2025/26'],old=data.trade_campaigns.baseline_customs
 const blocked=(reason,campaigns=[],extra={})=>({schema:'STAGE3_CURRENT_MARKET_SIGNAL_V1',asOf:data.as_of,country:'FR',entity:'red-clover',campaign:'2026/27',status:'INSUFFICIENT_EVIDENCE',currentObservationSignal:'INSUFFICIENT_EVIDENCE',confidence:'LOW',priceForecast:null,weatherYieldConversionApplied:false,reason,campaigns,...extra})
 if(baseline.period!=='2024/2025'||baseline.country!=='FR'||baseline.entity!=='red-clover'||baseline.unit!=='t')throw Error('BASELINE_SCOPE_MISMATCH')
 for(const r of [old,prior])if(r.reported_months!==12||r.months_expected!==12||[r.imports_t,r.exports_t].some(v=>!Number.isFinite(v)||v<0))return blocked('COMPLETE_MATCHED_TRADE_REQUIRED')
 if(!settings.useScopeBridge)return blocked('CROSS_SOURCE_SCOPE_BRIDGE_NOT_APPLIED')
 const harvest=physical(settings.harvestShare,{fraction:true}),yield_=physical(settings.marketableYieldKgHa),domestic=physical(settings.domesticUseMultiplier),remaining=physical(settings.remainingTradeMultiplier)
 const area25=data.multiplication_areas.find(r=>r.year===2025),area26=data.multiplication_areas.find(r=>r.year===2026)
 if(!area25||!area26||!Number.isFinite(area25.value_ha)||!Number.isFinite(area26.value_ha)||area25.value_ha<0||area26.value_ha<0)throw Error('AREA_EVIDENCE_REQUIRED')
 const scopeOffset=baseline.imports-baseline.exports-(old.imports_t-old.exports_t),priorAdjustedNet=prior.imports_t-prior.exports_t+scopeOffset
 const production=area=>range(...keys.map(k=>area*harvest[k]*yield_[k]/1000)),demand=range(...keys.map(k=>baseline.domesticSales*domestic[k]))
 const continuity=options.stockContinuity??1;if(!Number.isFinite(continuity)||continuity<0)throw Error('INVALID_STOCK_CONTINUITY')
 const prod25=production(area25.value_ha),opening25=range(baseline.closing*continuity),closing25=range(opening25.low+prod25.low+priorAdjustedNet-demand.high,opening25.base+prod25.base+priorAdjustedNet-demand.base,opening25.high+prod25.high+priorAdjustedNet-demand.low)
 // A negative unfinanced prior scenario cannot silently become a negative physical opening stock.
 if(closing25.low<0)return blocked('PRIOR_CAMPAIGN_FUNDING_GAP_REQUIRES_EXPLICIT_RESOLUTION',[{campaign:'2025/26',closing:closing25}],{scopeOffset})
 if(new Set(data.trade_months.map(r=>r.period)).size!==data.trade_months.length)throw Error('DUPLICATE_TRADE_PERIOD')
 const imported=new Map(data.trade_months.map(r=>[r.period,r])),seen=new Set();let currentImports=0,currentExports=0,remainingImports=0,remainingExports=0;const provenance=[]
 for(let n=0;n<12;n++){
  const month=n<6?n+7:n-5,year=n<6?2026:2027,period=`${year}-${String(month).padStart(2,'0')}`,previous=`${year-1}-${String(month).padStart(2,'0')}`
  if(seen.has(period))throw Error('DUPLICATE_PERIOD');seen.add(period)
  const now=imported.get(period),last=imported.get(previous)
  for(const flow of ['imports','exports']){
   if(now?.[flow]!=null){if(!Number.isFinite(now[flow])||now[flow]<0)throw Error('INVALID_TRADE_VALUE');if(flow==='imports')currentImports+=now[flow];else currentExports+=now[flow];provenance.push({period,flow,value:now[flow],status:'OBSERVED_CUSTOMS'})}
   else{if(last?.[flow]==null)return blocked('MATCHED_SEASONAL_REFERENCE_MISSING',[],{scopeOffset});if(flow==='imports')remainingImports+=last[flow];else remainingExports+=last[flow];provenance.push({period,flow,referencePeriod:previous,value:last[flow],status:period.slice(0,7)<=data.as_of.slice(0,7)?'UNREPORTED_MONTH_SCENARIO':'FUTURE_MONTH_SCENARIO'})}
  }
 }
 const importScale=options.importScale??1,exportScale=options.exportScale??1;if(![importScale,exportScale].every(v=>Number.isFinite(v)&&v>=0))throw Error('INVALID_FLOW_SCALE')
 const net26=range(currentImports-currentExports+remainingImports*remaining.low*importScale-remainingExports*remaining.high*exportScale+scopeOffset,currentImports-currentExports+remainingImports*remaining.base*importScale-remainingExports*remaining.base*exportScale+scopeOffset,currentImports-currentExports+remainingImports*remaining.high*importScale-remainingExports*remaining.low*exportScale+scopeOffset),prod26=production(area26.value_ha)
 const closing26=range(closing25.low+prod26.low+net26.low-demand.high,closing25.base+prod26.base+net26.base-demand.base,closing25.high+prod26.high+net26.high-demand.low)
 const reference=options.referenceStock??baseline.closing,conditionalSignal=classifySupplyPressure(closing26,reference),baseCaseSignal=classifySupplyPressure(range(closing26.base),reference)
 return {schema:'STAGE3_CURRENT_MARKET_SIGNAL_V1',asOf:data.as_of,country:'FR',entity:'red-clover',campaign:'2026/27',status:'CONDITIONAL_SCENARIO',currentObservationSignal:'INSUFFICIENT_EVIDENCE',conditionalSignal,baseCaseSignal,confidence:'LOW',referenceStock:reference,scopeOffset,customsNetChange:prior.imports_t-prior.exports_t-(old.imports_t-old.exports_t),observedCurrentTrade:{imports:currentImports,exports:currentExports},seasonalReferenceRemainder:{imports:remainingImports,exports:remainingExports},tradeProvenance:provenance,campaigns:[{campaign:'2025/26',opening:opening25,production:prod25,netTrade:range(priorAdjustedNet),domesticUse:demand,closing:closing25,status:'CONDITIONAL_SCOPE_AND_CONTINUITY_BRIDGE'},{campaign:'2026/27',opening:closing25,production:prod26,netTrade:net26,domesticUse:demand,closing:closing26,status:'CONDITIONAL_SCENARIO'}],priceForecast:null,weatherYieldConversionApplied:false,assumptions:settings.assumptions,interpretationRule:'Compare the whole conditional closing-stock interval with historical 608 t ±5%. Reference threshold is exploratory, not a confirmed reserve requirement. Negative remainder means a funding/supply gap, not negative physical stock.'}
}
