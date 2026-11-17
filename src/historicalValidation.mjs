// Expanding-window evaluation. Dataset reference years are NEVER availability dates.
// First independently recorded vintage availability is required; later revisions cannot leak backwards.
const finite=v=>typeof v==='number'&&Number.isFinite(v)
const knownAt=(r,cutoff)=>r.availableAt&&r.vintageCapturedAt&&Date.parse(r.availableAt)<=Date.parse(cutoff)&&Date.parse(r.vintageCapturedAt)<=Date.parse(cutoff)&&r.sourceUrl&&r.snapshotHash&&r.classification==='OBSERVED'&&finite(r.value)
const direction=(value,reference)=>value<reference*.95?'DOWN':value>reference*1.05?'UP':'STABLE'
export function historicalValidation({observations,folds,predict}){
 const results=[]
 for(const fold of folds){
  if(!Number.isFinite(Date.parse(fold.cutoff)))throw Error('INVALID_AS_OF_DATE')
  const history=observations.filter(r=>r.country===fold.country&&r.entity===fold.entity&&r.metric===fold.metric&&r.unit===fold.unit&&r.scope===fold.scope&&r.campaign<fold.targetCampaign&&knownAt(r,fold.cutoff)).sort((a,b)=>a.campaign.localeCompare(b.campaign)||Date.parse(a.availableAt)-Date.parse(b.availableAt))
  // Keep exactly one vintage per campaign, most recently available before cutoff.
  const unique=[...new Map(history.map(r=>[r.campaign,r])).values()]
  const target=observations.filter(r=>r.country===fold.country&&r.entity===fold.entity&&r.metric===fold.metric&&r.unit===fold.unit&&r.scope===fold.scope&&r.campaign===fold.targetCampaign&&knownAt(r,fold.evaluatedAt)).sort((a,b)=>Date.parse(a.availableAt)-Date.parse(b.availableAt)||Date.parse(a.vintageCapturedAt)-Date.parse(b.vintageCapturedAt)).at(-1)
  if(unique.length<2||!target||Date.parse(fold.evaluatedAt)<=Date.parse(fold.cutoff)||knownAt(target,fold.cutoff)){results.push({...fold,status:'NOT_EVALUABLE',reason:unique.length<2?'INSUFFICIENT_PRE_CUTOFF_VINTAGES':target&&knownAt(target,fold.cutoff)?'TARGET_ALREADY_AVAILABLE_AT_CUTOFF':'INDEPENDENT_TARGET_NOT_AVAILABLE'});continue}
  const previous=unique.at(-1).value,mean=unique.reduce((s,r)=>s+r.value,0)/unique.length,predicted=predict(unique.map(r=>({...r})),{...fold})
  if(!finite(predicted)){results.push({...fold,status:'NOT_EVALUABLE',reason:'MODEL_WITHHELD'});continue}
  results.push({...fold,status:'EVALUATED',observedDirection:direction(target.value,previous),modelDirection:direction(predicted,previous),previousCampaignDirection:'STABLE',historicalAverageDirection:direction(mean,previous),modelCorrect:direction(predicted,previous)===direction(target.value,previous),previousCorrect:direction(target.value,previous)==='STABLE',averageCorrect:direction(mean,previous)===direction(target.value,previous),inputSnapshotHashes:unique.map(r=>r.snapshotHash),targetSnapshotHash:target.snapshotHash})
 }
 const usable=results.filter(r=>r.status==='EVALUATED'),rate=key=>usable.length?usable.filter(r=>r[key]).length/usable.length:null
 return {status:usable.length?'EVALUATED':'NOT_EVALUABLE',folds:results,evaluatedFolds:usable.length,directionalAccuracy:{model:rate('modelCorrect'),previousCampaign:rate('previousCorrect'),historicalAverage:rate('averageCorrect')},threshold:'±5% vs previous campaign, exploratory not statistically calibrated',limitation:'Archived point-in-time vintages and independent outcomes required. Weather baselines also must be available before each cutoff; current 2015–2023 normals cannot enter earlier forecasts.'}
}
