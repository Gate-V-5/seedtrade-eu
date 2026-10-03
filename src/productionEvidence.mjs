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
