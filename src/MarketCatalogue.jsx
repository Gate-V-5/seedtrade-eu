import { useState } from 'react'
import { useT, useLanguage, translate } from './i18n/index.jsx'
import data from './generated/market_catalogue_public.json'
import routes from './generated/market_catalogue_routes.json'
import './marketCatalogue.css'

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
  const q=normalize(query.trim())
  return cards.filter(c=>[c.common_name_en,translate(language,c.common_name_en),c.botanical_display_name,c.accepted_taxon].some(x=>normalize(x||'').includes(q)))
}
function Metric({label,value,unit='',money=false,trend=false}) {
  const t=useT(),{language}=useLanguage()
  if(!available(value))return null
  const number=Number(value),formatted=new Intl.NumberFormat(locale(language),{maximumFractionDigits:money?0:2,...(money?{style:'currency',currency:'EUR'}:{})}).format(number)
  return <div className="catalogue-metric"><dt>{t(label)}</dt><dd>{trend&&number>0?'+':''}{formatted}{unit}</dd></div>
}
function Tags({card}) {
  const t=useT()
  return <div className="catalogue-tags">{card.use_tags.map(id=><span key={id}>{t(categoryById(id)?.title||id)}</span>)}</div>
}
function SeedCard({card}) {
  const t=useT(),hasTrade=available(card.trade_volume_t),hasProduction=card.production_evidence.strict_entity_records>0
  const group=card.customs_scope_type==='GROUP_LEVEL_CUSTOMS_SCOPE'
  return <article className="catalogue-seed-card" data-entity-id={card.market_entity_id}>
    <div className="catalogue-seed-heading"><h3>{t(card.common_name_en)}</h3><p className="catalogue-botanical">{card.botanical_display_name}</p></div>
    <Tags card={card}/>
    {hasTrade ? <dl className="catalogue-card-metrics"><Metric label="Trade volume" value={card.trade_volume_t} unit=" t"/><Metric label="Representative price" value={card.representative_price_eur_kg} unit=" €/kg"/><Metric label="Volume YoY" value={card.trade_volume_yoy} unit="%" trend/><Metric label="Price YoY" value={card.representative_price_yoy} unit="%" trend/></dl> : <p className="catalogue-developing">{t('Market data developing')}</p>}
    <div className="catalogue-card-status">{hasProduction&&<span>{t('Production data available')}</span>}{hasTrade&&<span>{t('Trade data available')}</span>}{group&&<span>{t('Group-level customs scope')}</span>}</div>
    <a className="catalogue-card-cta" href={`/market/seeds/${card.slug}`}>{t('Explore market →')}</a>
  </article>
}
function CategoryTile({category}) {
  const t=useT()
  return <a className="catalogue-category-tile" href={`/market/${category.slug}`}>
    <img src={category.image} alt={t(category.title)} width="2048" height="1143" loading="lazy" decoding="async"/>
    <div><p className="eyebrow">{t('{count} seed types',{count:category.entity_count})}</p><h2>{t(category.title)}</h2><p>{t(category.description)}</p><span className="catalogue-category-cta">{t('Browse seed types →')}</span></div>
  </a>
}
function EuMarketSummary() {
  const t=useT(),s=data.eu_summary
  return <section className="catalogue-eu-summary" aria-label={t('EU market summary')}><dl className="catalogue-global-kpis"><Metric label="Seed species" value={s.seed_species}/><Metric label="Commercial market entities" value={s.commercial_market_entities}/><Metric label="Trade volume" value={s.trade_volume_t} unit=" t"/><Metric label="Trade value" value={s.trade_value_eur} money/><Metric label="Sowing CN codes" value={s.cn_codes}/></dl><p>{t('EU internal trade')} · {s.period}</p></section>
}
function CatalogueHome() {
  const t=useT(),order=['CEREALS_PULSES','FODDER_AMENITY','CATCH_CROP','OIL_FIBRE','MAIZE_SORGHUM','VEGETABLES']
  return <main className="market-catalogue"><header className="catalogue-page-head"><p className="eyebrow">{t('European seed market')}</p><h1>{t('European Seed Market')}</h1><p>{t('Choose a category to explore commercial seed types and market intelligence.')}</p></header><EuMarketSummary/><section className="catalogue-category-grid" aria-label={t('Seed market categories')}>{order.map(id=><CategoryTile key={id} category={categoryById(id)}/>)}</section></main>
}
function CategoryPage({category}) {
  const t=useT(),{language}=useLanguage(),[query,setQuery]=useState('')
  const cards=data.cards.filter(x=>category.entity_ids.includes(x.market_entity_id)),filtered=filterCatalogueCards(cards,query,language)
  return <main className="market-catalogue"><a className="catalogue-back" href="/market">{t('← All categories')}</a><header className="catalogue-page-head catalogue-category-head"><div><p className="eyebrow">{t('European seed market')}</p><h1>{t(category.title)}</h1><p>{t(category.description)}</p></div><img src={category.image} alt={t(category.title)} width="2048" height="1143" decoding="async"/></header><div className="catalogue-summary"><div><span>{t('Seed types')}</span><strong>{category.entity_count}</strong></div>{category.countries_observed_count!=null&&<div><span>{t('Countries observed')}</span><strong>{category.countries_observed_count}</strong></div>}<p>{t('EU trade aggregate developing')}</p></div><div className="catalogue-browse"><label htmlFor="catalogue-search">{t('Find a seed type')}<input id="catalogue-search" type="search" placeholder={t('Common or botanical name')} value={query} onChange={event=>setQuery(event.target.value)}/></label><p role="status">{t('{count} seed types',{count:filtered.length})}</p></div>{filtered.length ? <section className="catalogue-seed-grid" aria-label={t('Seed market cards')}>{filtered.map(c=><SeedCard key={c.market_entity_id} card={c}/>)}</section> : <p className="catalogue-empty">{t('No seed types match your search.')}</p>}</main>
}
function SeedDetail({card}) {
  const t=useT(),primary=categoryById(card.primary_category),hasTrade=available(card.trade_volume_t),production=card.production_evidence
  return <main className="market-catalogue catalogue-detail"><nav className="catalogue-breadcrumb" aria-label={t('Breadcrumb')}><a href="/market">{t('All categories')}</a><span aria-hidden="true">/</span><a href={`/market/${primary.slug}`}>{t(primary.title)}</a></nav><header className="catalogue-page-head"><p className="eyebrow">{t('Seed market')}</p><h1>{t(card.common_name_en)}</h1><p className="catalogue-botanical">{card.botanical_display_name}</p><Tags card={card}/></header><div className="catalogue-detail-grid"><section className="catalogue-detail-panel"><h2>{t('EU trade')}</h2>{hasTrade?<><p className="catalogue-period">{t('Completed {period}',{period:card.latest_trade_period})}</p><dl className="catalogue-detail-metrics"><Metric label="Trade volume" value={card.trade_volume_t} unit=" t"/><Metric label="Trade value" value={card.trade_value_eur} money/><Metric label="Representative price" value={card.representative_price_eur_kg} unit=" €/kg"/><Metric label="Volume YoY" value={card.trade_volume_yoy} unit="%" trend/><Metric label="Price YoY" value={card.representative_price_yoy} unit="%" trend/></dl><p className="catalogue-note">{t('Observed intra-EU dispatches. YoY compares the same completed month one year earlier.')}</p>{card.CN_status==='PARTIAL'&&<p className="catalogue-note">{t('This customs scope covers only part of the seed market.')}</p>}{card.representative_price_eur_kg==null&&<p className="catalogue-note">{t('Comparable price evidence is developing.')}</p>}</>:<p>{t('Trade data not yet species-specific')}</p>}</section><section className="catalogue-detail-panel"><h2>{t('Seed production evidence')}</h2>{production.strict_entity_records>0?<><p>{t('Official seed-production evidence available.')}</p><dl className="catalogue-evidence-summary"><div><dt>{t('Years covered')}</dt><dd>{production.years.join(', ')}</dd></div><div><dt>{t('Reported metrics')}</dt><dd>{production.metrics.map(m=>t({'SEED_PRODUCTION_AREA':'Seed production area','CERTIFIED_SEED_AREA':'Certified seed area','CERTIFIED_QUANTITY':'Certified seed quantity','CERTIFIED_SEED_QUANTITY':'Certified seed quantity'}[m]||'Official seed evidence')).join(' · ')}</dd></div></dl><p className="catalogue-note">{t('National definitions remain separate; no combined EU production total is inferred.')}</p><a href={card.production_detail_url}>{t('Explore production evidence →')}</a></>:<p>{t('Production evidence for this commercial seed type is developing.')}</p>}</section></div><details className="catalogue-provenance"><summary>{t('Customs scope, coverage & sources')}</summary><div><h2>{t('CN / TARIC customs scope')}</h2>{card.customs_scope_type==='GROUP_LEVEL_CUSTOMS_SCOPE'?<p>{t('Group-level customs scope')}</p>:<p>{t('Customs precision varies by commercial seed type.')}</p>}<p>{t('Customs-group and parent-taxon quantities are not assigned to individual commercial forms.')}</p>{card.CN_status==='REVIEW_REQUIRED'&&<p>{t('Customs attribution remains under review; no trade amount is shown.')}</p>}<ul>{card.customs_descriptions.map(x=><li key={x.code}><b>{x.code}</b> — {x.description}</li>)}</ul><h2>{t('Sources / provenance')}</h2>{card.sources.length?<ul>{card.sources.map((s,i)=><li key={`${s.url}-${i}`}><a href={s.url} target="_blank" rel="noopener noreferrer">{s.organisation} — {s.title}</a></li>)}</ul>:<p>{t('Additional source coverage is developing.')}</p>}<p>{t('Missing evidence is not zero. No interpolation or customs-group allocation.')}</p><a href="/methodology">{t('Full methodology →')}</a></div></details></main>
}
export default function MarketCatalogue({path}) {
  if(path==='/market')return <CatalogueHome/>
  const resolved=routes.find(x=>x.path===path)?.alias_of||path
  const category=data.categories.find(x=>resolved===`/market/${x.slug}`)
  if(category)return <CategoryPage key={category.id} category={category}/>
  const card=data.cards.find(x=>path===`/market/seeds/${x.slug}`)
  return card?<SeedDetail card={card}/>:null
}
