// V5-compatible original grains only. No pooling, inferred observations or signals.
export const metricLabels = Object.freeze({SEED_PRODUCTION_AREA:'Seed production area',CERTIFIED_SEED_AREA:'Certified seed area',CERTIFIED_QUANTITY:'Certified quantity'})
export function longestHistory(years) {
  let longest=0, run=0, previous=null
  for (const year of [...new Set(years)].sort((a,b)=>a-b)) {run=year===previous+1?run+1:1;longest=Math.max(longest,run);previous=year}
  return longest
}
export function selectEvidence(data, {entity='',country='',metric='',year='',history=0}={}) {
  const byId=new Map(data.observations.map(r=>[r.id,r]))
  return data.series.filter(s=>(!entity||s.entity===entity)&&(!country||s.country===country)&&(!metric||s.metric===metric)).map(s=>{
    const points=s.observations.map(id=>byId.get(id)).filter(r=>!year||r.year===Number(year)).sort((a,b)=>a.year-b.year)
    return {...s,points,history_length:longestHistory(points.map(r=>r.year))}
  }).filter(s=>s.points.length&&s.history_length>=Number(history))
}
export function coverage(groups) {
  const records=groups.flatMap(g=>g.points)
  return {countries:new Set(records.map(r=>r.country)).size,entities:new Set(records.map(r=>r.entity)).size,observations:records.length,comparable:groups.filter(g=>g.history_length>=2).length,latest:records.length?Math.max(...records.map(r=>r.year)):null}
}
export function countryLabel(code,language) {
  return new Intl.DisplayNames([{EN:'en',DE:'de',FR:'fr',ES:'es',IT:'it'}[language]||'en'],{type:'region'}).of(code)
}

// Public view state only. Never serialize arbitrary query parameters, source
// objects, private context or the current location/fragment into shared links.
export const productionViewDefaults=Object.freeze({entity:'alfalfa',country:'CZ',metric:'SEED_PRODUCTION_AREA',year:'',history:'0',scope:''})
const viewKeys=Object.keys(productionViewDefaults)
export function validateProductionView(data,input={}) {
  const entities=new Set(data.entities.map(e=>e.id)),countries=new Set(data.countries)
  const metrics=new Set(data.observations.map(r=>r.metric).filter(m=>Object.hasOwn(metricLabels,m)))
  const fallbackEntity=entities.has(productionViewDefaults.entity)?productionViewDefaults.entity:data.entities[0]?.id??''
  const fallbackMetric=metrics.has(productionViewDefaults.metric)?productionViewDefaults.metric:[...metrics][0]??''
  const raw={...productionViewDefaults,...input},view={...productionViewDefaults}
  let adjusted=false
  const invalid=()=>{adjusted=true}
  if(typeof raw.entity==='string'&&entities.has(raw.entity))view.entity=raw.entity;else{view.entity=fallbackEntity;invalid()}
  if(raw.country==='')view.country=''
  else if(typeof raw.country==='string'&&countries.has(raw.country.toUpperCase())){
    view.country=raw.country.toUpperCase();if(view.country!==raw.country)invalid()
  }else{view.country='';invalid()}
  if(typeof raw.metric==='string'&&metrics.has(raw.metric))view.metric=raw.metric;else{view.metric=fallbackMetric;invalid()}
  if(['0','2','3','4','5'].includes(raw.history))view.history=raw.history;else{view.history='0';invalid()}
  const years=new Set(data.observations.filter(r=>r.entity===view.entity&&r.metric===view.metric&&(!view.country||r.country===view.country)).map(r=>String(r.year)))
  if(raw.year==='')view.year=''
  else if(typeof raw.year==='string'&&/^\d{4}$/.test(raw.year)&&years.has(raw.year))view.year=raw.year
  else{view.year='';invalid()}
  if(raw.scope==='')view.scope=''
  else if(typeof raw.scope==='string'&&selectEvidence(data,view).some(s=>s.id===raw.scope))view.scope=raw.scope
  else{view.scope='';invalid()}
  return {view,adjusted}
}
export function productionViewFromSearch(data,search) {
  const params=new URLSearchParams(search),input={}
  let adjusted=false
  for(const key of viewKeys){
    if(!params.has(key))continue
    const values=params.getAll(key)
    if(values.length!==1){input[key]=undefined;adjusted=true}else input[key]=values[0]
  }
  if([...params.keys()].some(key=>!viewKeys.includes(key)))adjusted=true
  const result=validateProductionView(data,input)
  return {...result,adjusted:adjusted||result.adjusted}
}
export function productionViewLocation(data,input) {
  const {view}=validateProductionView(data,input)
  return productionViewPath({...view,scope:view.scope||selectEvidence(data,view)[0]?.id})
}
// Serialize an already validated public view. Both catalogue navigation and the
// explorer share this allowlist; never copy arbitrary location parameters.
export function productionViewPath(view) {
  const params=new URLSearchParams()
  params.set('entity',view.entity);params.set('country',view.country);params.set('metric',view.metric)
  if(view.year)params.set('year',view.year)
  if(view.history!=='0')params.set('history',view.history)
  // Include the actually selected public source grain, including the default
  // first grain, so a shared view cannot silently point to a different source.
  const scope=view.scope
  if(scope)params.set('scope',scope)
  return '/production-intelligence?'+params.toString()
}
