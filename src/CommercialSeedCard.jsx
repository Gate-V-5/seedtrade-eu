import {useT,useLanguage} from './i18n/index.jsx'
import snapshot from './generated/market_snapshot_public.json'
import {latestValidPrice} from './commercialEvidence.mjs'
import './marketCatalogue.css'
const displayMonth=(period,language)=>new Intl.DateTimeFormat(locale(language),{month:'short',year:'numeric',timeZone:'UTC'}).format(new Date(`${period}-01T00:00:00Z`))
const categoryById=id=>snapshot.categories.find(c=>c.id===id)
const available=value=>value!==null&&value!==undefined&&Number.isFinite(Number(value))
const locale=code=>({EN:'en-GB',DE:'de-DE',FR:'fr-FR',ES:'es-ES',IT:'it-IT'}[code]||'en-GB')
function Metric({label,value,unit='',money=false,trend=false}) {
  const t=useT(),{language}=useLanguage()
  if(!available(value))return null
  const number=Number(value),formatted=new Intl.NumberFormat(locale(language),{minimumFractionDigits:unit===' €/kg'?2:0,maximumFractionDigits:money?0:2,...(money?{style:'currency',currency:'EUR'}:{})}).format(number)
  return <div className="catalogue-metric"><dt>{t(label)}</dt><dd>{trend&&number>0?'+':''}{unit===' €/kg'?'€':''}{formatted}{unit===' €/kg'?'/kg':unit}</dd></div>
}
export function Tags({card}) {
  const t=useT()
  return <div className="catalogue-tags">{card.use_tags.map(id=><span key={id}>{t(categoryById(id)?.title||id)}</span>)}</div>
}
function CardTrend({label,value,compact=false}) {
  const t=useT(),{language}=useLanguage()
  if(!available(value))return null
  const n=Number(value)
  return <p className={`catalogue-yoy ${n<0?'down':'up'}`}><span aria-hidden="true">{n<0?'▼':'▲'}</span> {n>0?'+':''}{new Intl.NumberFormat(locale(language),{maximumFractionDigits:2}).format(n)}% {t('YoY')}{!compact&&<span className="sr-only"> · {t(label)}</span>}</p>
}
function CardHistory({card}) {
  const t=useT(),{language}=useLanguage(),[year,month]=card.latest_trade_period.split('-').map(Number)
  const slots=Array.from({length:12},(_,i)=>{
    const date=new Date(Date.UTC(year,month-12+i,1)),period=date.toISOString().slice(0,7)
    return {period,point:(card.trade_history||[]).find(x=>x.period===period)}
  })
  const values=slots.filter(x=>available(x.point?.volume_t))
  if(values.length<2)return null
  const maximum=Math.max(...values.map(x=>Number(x.point.volume_t)))
  if(maximum<=0)return null
  return <div className="catalogue-card-history" role="img" aria-label={t('Completed monthly trade volume history')}>
    {slots.map(({period,point})=><span key={period} title={point?`${period}: ${new Intl.NumberFormat(locale(language),{maximumFractionDigits:2}).format(point.volume_t)} t`:period}>{available(point?.volume_t)&&<i style={{height:`${Number(point.volume_t)/maximum*100}%`}}/>}</span>)}
  </div>
}
export function SeedCard({card,snapshot=false}) {
  const t=useT(),{language}=useLanguage(),hasTrade=available(card.trade_volume_t),price=latestValidPrice(card.price_observations)
  return <article className={`catalogue-seed-card${snapshot?" crop-card":""}`} data-entity-id={card.market_entity_id}>
    <div className="catalogue-seed-heading"><h3>{t(card.common_name_en)}</h3><p className="catalogue-botanical"><em>{card.botanical_display_name}</em></p></div>
    <Tags card={card}/>
    {(hasTrade||price)&&<>
      <div className="catalogue-card-metrics">
        {price&&<div className="catalogue-card-measure catalogue-price-measure" title={t(price.scope)}><dl><Metric label="Representative price" value={price.price_eur_kg} unit=" €/kg"/></dl><CardTrend label="Price YoY" value={price.yoy_percent} compact={snapshot}/><p className="catalogue-period">{snapshot?t("Observed · {period}",{period:displayMonth(price.period,language)}):t("Price observed {period}",{period:price.period})}</p></div>}
        {hasTrade&&<div className="catalogue-card-measure catalogue-volume-measure"><dl><Metric label="Trade volume" value={card.trade_volume_t} unit=" t"/></dl><CardTrend label="Volume YoY" value={card.trade_volume_yoy} compact={snapshot}/></div>}
      </div>
      <div className="catalogue-card-trade-history">{hasTrade&&<><p className="catalogue-history-label">{t("EU internal trade volume — tonnes")}</p><CardHistory card={card}/><p className="catalogue-period catalogue-trade-period">{snapshot?t('Completed · {period}',{period:displayMonth(card.latest_trade_period,language)}):t('Completed {period}',{period:card.latest_trade_period})}</p></>}</div>
      {snapshot?<div className="catalogue-card-scope">{card.CN_status==='PARTIAL'&&<p className="catalogue-note">{t('This customs scope covers only part of the seed market.')}</p>}</div>:card.CN_status==='PARTIAL'&&<p className="catalogue-note">{t('This customs scope covers only part of the seed market.')}</p>}
    </>}
    <a className="catalogue-card-cta" href={`/market/seeds/${card.slug}`}>{t('Explore market →')}</a>
  </article>
}
