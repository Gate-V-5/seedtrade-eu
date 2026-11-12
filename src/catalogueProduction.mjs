import index from './generated/catalogue_production_links.json' with {type:'json'}
import {longestHistory,productionViewPath} from './productionEvidence.mjs'

// The catalogue imports availability only; the full explorer data remains
// route-loaded. Unknown cards never inherit the explorer's default crop.
export function catalogueProductionLink(cardId,search=''){
  const entry=index.entries[cardId]
  if(!entry?.entity||!entry.series.length)return {href:null,scope:entry?.scope||'NONE'}
  const params=new URLSearchParams(search)
  const one=key=>params.getAll(key).length===1?params.get(key):null
  const rawCountry=one('country'),country=rawCountry&&entry.series.some(s=>s[1]===rawCountry.toUpperCase())?rawCountry.toUpperCase():''
  const local=entry.series.filter(s=>!country||s[1]===country)
  const selectedScope=local.find(s=>s[0]===one('scope'))
  const rawMetric=one('metric'),metric=local.some(s=>s[2]===rawMetric)?rawMetric:selectedScope?.[2]||local[0][2]
  const metricSeries=local.filter(s=>s[2]===metric)
  const rawYear=one('year'),year=rawYear&&/^\d{4}$/.test(rawYear)&&metricSeries.some(s=>s[3].some(y=>String(y)===rawYear))?rawYear:''
  const points=s=>s[3].filter(y=>!year||String(y)===year)
  const rawHistory=one('history'),history=['2','3','4','5'].includes(rawHistory)&&metricSeries.some(s=>longestHistory(points(s))>=Number(rawHistory))?rawHistory:'0'
  const available=metricSeries.filter(s=>points(s).length&&longestHistory(points(s))>=Number(history))
  const rawScope=one('scope'),scope=available.find(s=>s[0]===rawScope)?.[0]||available[0][0]
  const view={entity:entry.entity,country,metric,year,history,scope}
  return {href:productionViewPath(view),scope:entry.scope,view}
}

export function catalogueSeedLocation(card,search=''){
  const base=`/market/seeds/${card.slug}`,params=new URLSearchParams(search)
  if(!['country','metric','year','history','scope'].some(key=>params.has(key)))return base
  const link=catalogueProductionLink(card.market_entity_id,search)
  return link.href?base+link.href.slice(link.href.indexOf('?')):base
}
