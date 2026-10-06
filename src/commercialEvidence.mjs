export const metricAvailable = value => value !== null && value !== undefined && Number.isFinite(Number(value))
export function eligiblePrices(observations = []) {
  return observations.filter(p => p.classification === 'PUBLIC_SAFE' && p.eligible === true && p.scope_verified === true && p.species_attribution_verified === true && p.methodology && p.source && /^https:\/\//.test(p.source_url || '') && /^\d{4}-\d{2}(-\d{2})?$/.test(p.period || '') && metricAvailable(p.price_eur_kg) && Number(p.price_eur_kg)>0)
    .slice().sort((a,b)=>a.period.localeCompare(b.period))
}
export function latestValidPrice(observations) { return eligiblePrices(observations).at(-1) || null }
export function snapshotCandidates(cards) { return cards.filter(c => c.public_safe_status === 'PUBLIC_SAFE' && (metricAvailable(c.trade_volume_t) || latestValidPrice(c.price_observations))) }
export function calendarSlots(points, end, count=12, field='volume_t') {
  if(!end)return []
  const [year,month]=end.slice(0,7).split('-').map(Number)
  return Array.from({length:count},(_,i)=>{const period=new Date(Date.UTC(year,month-count+i,1)).toISOString().slice(0,7);return {period,point:points.find(p=>p.period.slice(0,7)===period && metricAvailable(p[field])) || null}})
}
export const rankedExporters = rows => rows.slice().sort((a,b)=>Number(b.share_percent)-Number(a.share_percent)||a.country.localeCompare(b.country)).slice(0,5)
export const rankedCorridors = rows => rows.slice().sort((a,b)=>Number(b.volume_t)-Number(a.volume_t)||`${a.exporter}-${a.importer}`.localeCompare(`${b.exporter}-${b.importer}`)).slice(0,5)

// Presentation semantics; canonical values/eligibility and aggregation stay unchanged.
export const isCustomsUnitValue = p => /customs|COMEXT|net weight/i.test(`${p?.methodology||''} ${p?.source||''}`)
export const eligibleTradeUnitValues = observations => eligiblePrices(observations).filter(isCustomsUnitValue)
export const latestTradeUnitValue = observations => eligibleTradeUnitValues(observations).at(-1)||null
export const eligibleSeedPrices = observations => eligiblePrices(observations).filter(p=>p.metric_type==='COMMERCIAL_SEED_PRICE' && p.commercial_evidence_verified===true && p.publication_rights_verified===true && !isCustomsUnitValue(p))
export const latestSeedPrice = observations => eligibleSeedPrices(observations).at(-1)||null
