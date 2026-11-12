import EstimatedMarketRange from './EstimatedMarketRange.jsx'
import {CataloguePhoto,CataloguePhotoCredits} from './CataloguePhotography.jsx'
import { useEffect, useRef, useState } from 'react'
import { useT, useLanguage, translate } from './i18n/index.jsx'
import data from './generated/market_catalogue_public.json'
import routes from './generated/market_catalogue_routes.json'
import pulse from './generated/trade_pulse_public.json'
import './marketCatalogue.css'
import {compactTonnes,exactTonnes} from './tradeKpiDisplay.mjs'
import EvidenceHistory from './CommercialHistory.jsx'
import SnapshotIntelligence from './SnapshotIntelligence.jsx'
import MarketDetailBriefing,{detailPilotRecord} from './MarketDetailBriefing.jsx'
import {SeedCard,Tags} from './CommercialSeedCard.jsx'
import CatalogueProductionLink from './CatalogueProductionLink.jsx'
import {catalogueProductionLink} from './catalogueProduction.mjs'
import {latestTradeUnitValue,eligibleTradeUnitValues,calendarSlots,rankedExporters,rankedCorridors} from './commercialEvidence.mjs'

export const catalogueRouteMeta = path => {
  const route=routes.find(x=>x.path===path)
  return route ? {title:`${route.title} | SeedTrade.eu`,description:route.description,index:true} : null
}
export const cataloguePath = path => routes.some(x=>x.path===path)
const categoryById=id=>data.categories.find(x=>x.id===id)
const locale=code=>({EN:'en-GB',DE:'de-DE',FR:'fr-FR',ES:'es-ES',IT:'it-IT'}[code]||'en-GB')
const available=value=>value!==null&&value!==undefined&&Number.isFinite(Number(value))
const normalize=value=>String(value).normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase()
export function filterCatalogueCards(cards,query,language='EN') {
  const terms=normalize(query.trim()).split(/\s+/).filter(Boolean)
  return cards.filter(c=>{
    const names=normalize([c.common_name_en,translate(language,c.common_name_en),c.botanical_display_name,c.accepted_taxon].filter(Boolean).join(' '))
    return terms.every(term=>names.includes(term))
  })
}
export const catalogueQueryFrom=search=>(new URLSearchParams(search).get('q')||'').slice(0,120)
export function catalogueSearchLocation(location,query) {
  const params=new URLSearchParams(location.search),term=query.trim().slice(0,120)
  if(term)params.set('q',term);else params.delete('q')
  const search=params.toString()
  return location.pathname+(search?'?'+search:'')+(location.hash||'')
}
function useCatalogueSearch() {
  // Empty on the server and first client render, preserving static hydration.
  // Read navigation state only after mount; no cookies, storage or requests.
  const [query,setQuery]=useState('')
  useEffect(()=>{
    const restore=()=>setQuery(catalogueQueryFrom(window.location.search))
    restore();window.addEventListener('popstate',restore)
    return ()=>window.removeEventListener('popstate',restore)
  },[])
  const change=value=>{
    const next=value.slice(0,120);setQuery(next)
    window.history.replaceState(window.history.state,'',catalogueSearchLocation(window.location,next))
  }
  return [query,change]
}
function CatalogueSearch({query,onChange,count,all=false}) {
  const t=useT(),input=useRef(null)
  return <div className="catalogue-browse">
    <label htmlFor="catalogue-search">{t(all?'Search all seed types':'Find a seed type')}
      <input ref={input} id="catalogue-search" type="search" maxLength={120} placeholder={t('Common or botanical name')} value={query} onChange={event=>onChange(event.target.value)} aria-controls="catalogue-search-results"/>
    </label>
    {query&&<button type="button" className="catalogue-clear-search" onClick={()=>{onChange('');input.current?.focus()}}>{t('Clear search')}</button>}
    <p role="status" aria-live="polite">{(!all||query.trim())?t('{count} seed types',{count}):''}</p>
  </div>
}
function Metric({label,value,unit='',money=false,trend=false,compact=false}) {
  const t=useT(),{language}=useLanguage()
  if(!available(value))return null
  const number=Number(value),formatted=new Intl.NumberFormat(locale(language),{minimumFractionDigits:unit===' €/kg'?2:0,maximumFractionDigits:money?0:2,...(money?{style:'currency',currency:'EUR'}:{})}).format(number)
  return <div className="catalogue-metric"><dt>{t(label)}</dt><dd title={compact?t('{value} tonnes',{value:exactTonnes(number,locale(language))}):undefined} aria-label={compact?t('{value} tonnes',{value:exactTonnes(number,locale(language))}):undefined}>{trend&&number>0?'+':''}{unit===' €/kg'?'€':''}{compact?compactTonnes(number,locale(language)):formatted}{compact?'':unit===' €/kg'?'/kg':unit}</dd></div>
}
function CategoryTile({category}) {
  const t=useT()
  return <a className="catalogue-category-tile" href={`/market/${category.slug}`}>
    <CataloguePhoto category={category} lazy/>
    <div><p className="eyebrow">{t('{count} seed types',{count:category.entity_count})}</p><h2>{t(category.title)}</h2><p>{t(category.description)}</p><span className="catalogue-category-cta">{t('Browse seed types →')}</span></div>
  </a>
}
function EuMarketSummary() {
  const t=useT(),{language}=useLanguage(),s=data.eu_summary,period=pulse.latest_completed_period,cnCount=pulse.scope.included_cn_codes.length
  const [year,month]=period.split('-').map(Number),periodName=new Intl.DateTimeFormat(locale(language),{month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(Date.UTC(year,month-1,1)))
  return <section className="catalogue-eu-summary" aria-label={t('EU market summary')}><dl className="catalogue-global-kpis"><Metric label="Seed species" value={s.seed_species}/><Metric label="Commercial market entities" value={s.commercial_market_entities}/><Metric label="Monthly trade volume" value={s.trade_volume_t} compact/><Metric label="Trade value" value={s.trade_value_eur} money/><Metric label="Sowing CN codes" value={cnCount}/></dl><p>{t('EU internal seed trade · {count} sowing CN codes · {period}',{count:cnCount,period:periodName})}</p></section>
}
function CatalogueHome({productionSearch}) {
  const t=useT(),{language}=useLanguage(),[query,setQuery]=useCatalogueSearch(),order=['CEREALS_PULSES','FODDER_AMENITY','CATCH_CROP','OIL_FIBRE','MAIZE_SORGHUM','VEGETABLES']
  const searching=Boolean(query.trim()),filtered=searching?filterCatalogueCards(data.cards,query,language):[]
  return <main className="market-catalogue"><header className="catalogue-page-head"><p className="eyebrow">{t('European seed market')}</p><h1>{t('European Seed Market')}</h1><p>{t('Choose a category to explore commercial seed types and market intelligence.')}</p></header><EuMarketSummary/><section className="catalogue-category-grid" aria-label={t('Seed market categories')}>{order.map(id=><CategoryTile key={id} category={categoryById(id)}/>)}</section><CataloguePhotoCredits/>
    <section className="catalogue-global-search" aria-labelledby="catalogue-search-title"><h2 id="catalogue-search-title">{t('Search all seed types')}</h2>
      <CatalogueSearch query={query} onChange={setQuery} count={filtered.length} all/>
      <div id="catalogue-search-results">{searching&&(filtered.length?<section className="catalogue-seed-grid" aria-label={t('Search results')}>{filtered.map(card=><SeedCard key={card.market_entity_id} card={card} productionSearch={productionSearch}/>)}</section>:<p className="catalogue-empty">{t('No seed types match your search.')}</p>)}</div>
    </section>
  </main>
}
function CategoryPage({category,productionSearch}) {
  const t=useT(),{language}=useLanguage(),[query,setQuery]=useCatalogueSearch()
  const cards=data.cards.filter(x=>category.entity_ids.includes(x.market_entity_id)),filtered=filterCatalogueCards(cards,query,language)
  return <main className="market-catalogue"><a className="catalogue-back" href="/market">{t('← All categories')}</a><header className="catalogue-page-head catalogue-category-head"><div><p className="eyebrow">{t('European seed market')}</p><h1>{t(category.title)}</h1><p>{t(category.description)}</p></div><CataloguePhoto category={category}/></header><CataloguePhotoCredits category={category}/><div className="catalogue-summary"><div><span>{t('Seed types')}</span><strong>{category.entity_count}</strong></div>{category.countries_observed_count!=null&&<div><span>{t('Countries observed')}</span><strong>{category.countries_observed_count}</strong></div>}</div><CatalogueSearch query={query} onChange={setQuery} count={filtered.length}/><div id="catalogue-search-results">{filtered.length ? <section className="catalogue-seed-grid" aria-label={t('Seed market cards')}>{filtered.map(c=><SeedCard key={c.market_entity_id} card={c} productionSearch={productionSearch}/>)}</section> : <p className="catalogue-empty">{t('No seed types match your search.')}</p>}</div></main>
}
function MarketEvidence({card,briefing=false}) {
 const t=useT(),{language}=useLanguage(),price=latestTradeUnitValue(card.price_observations),prices=eligibleTradeUnitValues(card.price_observations),external=card.external_trade
 const fmt=value=>new Intl.NumberFormat(locale(language),{maximumFractionDigits:2}).format(Number(value))
 return <>
 {price&&<section className="catalogue-detail-panel"><h2>{t(briefing?'Trade unit value YoY':'Trade unit value')}</h2><dl>{!briefing&&<Metric label="Trade unit value" value={price.price_eur_kg} unit=" €/kg"/>}<Metric label="Trade unit value YoY" value={price.yoy_percent} unit="%" trend/></dl><p>{t('Observed · {period}',{period:price.period})}</p>{!briefing&&<><p className="catalogue-note">{t(price.scope)}</p><a href={price.source_url}>{price.source}</a></>}</section>}
 {prices.length>0&&<EvidenceHistory points={prices} field="price_eur_kg" title="Trade unit value history — €/kg" unit="€/kg" price/>}
 {card.trade_history?.length>0&&<EvidenceHistory points={card.trade_history} field="volume_t" title="EU internal trade volume — tonnes" unit="t"/>}
 {(card.leading_exporters?.length>0||card.major_corridors?.length>0)&&<div className="catalogue-detail-grid">
 {card.leading_exporters?.length>0&&<section className="catalogue-detail-panel"><h2>{t('Leading exporters')}</h2><ol>{rankedExporters(card.leading_exporters).map(x=><li key={x.country}>{x.country} <b>{fmt(x.share_percent)}%</b></li>)}</ol><p className="catalogue-period">{t('Completed {period}',{period:card.latest_trade_period})}</p></section>}
 {card.major_corridors?.length>0&&<section className="catalogue-detail-panel"><h2>{t('Major corridors')}</h2><ol>{rankedCorridors(card.major_corridors).map(x=><li key={`${x.exporter}-${x.importer}`}>{x.exporter} → {x.importer} <b>{fmt(x.volume_t)} t</b></li>)}</ol></section>}</div>}
 {external&&<section className="catalogue-detail-panel catalogue-external"><h2>{t('EU external trade')}</h2><p className="catalogue-period">{external.period?t('Completed {period}',{period:external.period}):<>{t('Exports outside EU')}: {external.exports.period} · {t('Imports from outside EU')}: {external.imports.period}</>}</p><dl className="catalogue-detail-metrics"><Metric label="Exports outside EU" value={external.exports.volume_t} unit=" t"/><Metric label="Imports from outside EU" value={external.imports.volume_t} unit=" t"/><Metric label="Trade balance" value={external.balance_t} unit=" t" trend/></dl><p className="catalogue-note">{t('EU-27 as a whole; reported third-country partners. Special territories excluded. Missing observations are not zero.')}</p></section>}
 </>
}
function SeedDetail({card,productionSearch}) {
  const t=useT(),primary=categoryById(card.primary_category),hasTrade=available(card.trade_volume_t),production=card.production_evidence
  if(detailPilotRecord(card.market_entity_id))return <MarketDetailBriefing card={card} productionSearch={productionSearch} primary={primary} Metric={Metric} Tags={Tags} pricePresentation={<EstimatedMarketRange entityId={card.market_entity_id}/>} tradeEvidence={<MarketEvidence card={card} briefing/>}/>
  return <main className="market-catalogue catalogue-detail"><nav className="catalogue-breadcrumb" aria-label={t('Breadcrumb')}><a href="/market">{t('All categories')}</a><span aria-hidden="true">/</span><a href={`/market/${primary.slug}`}>{t(primary.title)}</a></nav><header className="catalogue-page-head"><p className="eyebrow">{t('Seed market')}</p><h1>{t(card.common_name_en)}</h1><p className="catalogue-botanical">{card.botanical_display_name}</p><Tags card={card}/><EstimatedMarketRange entityId={card.market_entity_id}/></header><div className="catalogue-detail-intelligence"><SnapshotIntelligence entityId={card.market_entity_id}/></div><div className="catalogue-detail-grid"><section className="catalogue-detail-panel"><h2>{t('EU trade')}</h2>{hasTrade?<><p className="catalogue-period">{t('Completed {period}',{period:card.latest_trade_period})}</p><dl className="catalogue-detail-metrics"><Metric label="Trade volume" value={card.trade_volume_t} unit=" t"/><Metric label="Trade value" value={card.trade_value_eur} money/><Metric label="Volume YoY" value={card.trade_volume_yoy} unit="%" trend/></dl><p className="catalogue-note">{t('Observed intra-EU dispatches. YoY compares the same completed month one year earlier.')}</p>{card.CN_status==='PARTIAL'&&<p className="catalogue-note">{t('This customs scope covers only part of the seed market.')}</p>}</>:<p>{t('Trade data not yet species-specific')}</p>}</section></div><MarketEvidence card={card}/><div className="catalogue-detail-grid"><section className="catalogue-detail-panel"><h2>{t('Seed production evidence')}</h2>{production.strict_entity_records>0?<><p>{t('Official seed-production evidence available.')}</p><dl className="catalogue-evidence-summary"><div><dt>{t('Years covered')}</dt><dd>{production.years.join(', ')}</dd></div><div><dt>{t('Reported metrics')}</dt><dd>{production.metrics.map(m=>t({'SEED_PRODUCTION_AREA':'Seed production area','CERTIFIED_SEED_AREA':'Certified seed area','CERTIFIED_QUANTITY':'Certified seed quantity','CERTIFIED_SEED_QUANTITY':'Certified seed quantity'}[m]||'Official seed evidence')).join(' · ')}</dd></div></dl><p className="catalogue-note">{t('National definitions remain separate; no combined EU production total is inferred.')}</p></>:!catalogueProductionLink(card.market_entity_id).href&&<p>{t('Production evidence for this commercial seed type is developing.')}</p>}<CatalogueProductionLink card={card} search={productionSearch}/></section></div><details className="catalogue-provenance"><summary>{t('Customs scope, coverage & sources')}</summary><div><h2>{t('CN / TARIC customs scope')}</h2>{card.customs_scope_type==='GROUP_LEVEL_CUSTOMS_SCOPE'?<p>{t('Group-level customs scope')}</p>:<p>{t('Customs precision varies by commercial seed type.')}</p>}<p>{t('Customs-group and parent-taxon quantities are not assigned to individual commercial forms.')}</p>{card.CN_status==='REVIEW_REQUIRED'&&<p>{t('Customs attribution remains under review; no trade amount is shown.')}</p>}<ul>{card.customs_descriptions.map(x=><li key={x.code}><b>{x.code}</b> — {x.description}</li>)}</ul><h2>{t('Sources / provenance')}</h2>{card.sources.length?<ul>{card.sources.map((s,i)=><li key={`${s.url}-${i}`}><a href={s.url} target="_blank" rel="noopener noreferrer">{s.organisation} — {s.title}</a></li>)}</ul>:<p>{t('Additional source coverage is developing.')}</p>}<p>{t('Missing evidence is not zero. No interpolation or customs-group allocation.')}</p><a href="/methodology">{t('Full methodology →')}</a></div></details></main>
}
export default function MarketCatalogue({path}) {
  const [productionSearch,setProductionSearch]=useState('')
  useEffect(()=>{
    const restore=()=>setProductionSearch(window.location.search)
    restore();window.addEventListener('popstate',restore)
    return ()=>window.removeEventListener('popstate',restore)
  },[])
  if(path==='/market')return <CatalogueHome productionSearch={productionSearch}/>
  const resolved=routes.find(x=>x.path===path)?.alias_of||path
  const category=data.categories.find(x=>resolved===`/market/${x.slug}`)
  if(category)return <CategoryPage key={category.id} category={category} productionSearch={productionSearch}/>
  const card=data.cards.find(x=>path===`/market/seeds/${x.slug}`)
  return card?<SeedDetail card={card} productionSearch={productionSearch}/>:null
}
