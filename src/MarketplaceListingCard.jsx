import {useT,useLanguage} from './i18n/index.jsx'
import {listingTrading} from './listingTrading.mjs'
import './marketplaceListings.css'

export default function MarketplaceListingCard({request,species,detailHref,localDraft=false}) {
  const t=useT(),{language}=useLanguage(),view=listingTrading(request)
  const href=detailHref || (request.slug?`/buying-requests/${request.slug}?lang=${language.toLowerCase()}`:null)
  const rows=[
    [view.direction==='OFFER'?'Available quantity':'Requested quantity',view.quantity],
    ['Price',view.price],['Origin',view.origin],
    ['Category',view.certification],['Terms',view.delivery],
    ['Packaging',view.packaging],['Organic status',view.organic],
    ['Delivery',request.delivery_period || request.availability],
  ].filter(([,value])=>value!=null&&value!=='')
  return <article className={`request-card trading-card ${request.demo?'demo':''}`}>
    <div className="trading-badges"><strong>{t(view.direction==='OFFER'?'FOR SALE · OFFER':'TO BUY · DEMAND')}</strong>{view.productType&&<span>{t(view.productType==='COMMODITY'?'COMMODITY':'CERTIFIED SEED')}</span>}{!localDraft&&!request.demo&&request.status&&<span>{t(request.status)}</span>}</div>
    <h3>{t(view.commonName || species?.common_name_en || 'Species')}</h3>
    {(view.botanicalName || species?.botanical_name)&&<p className="trading-botanical"><i>{view.botanicalName || species.botanical_name}</i></p>}
    {request.variety&&<p className="variety">{t('Variety:')} {request.variety}</p>}
    {(localDraft||request.demo)&&<p className="trading-draft">{t(localDraft?'Local draft — not published':'Illustrative TEST card')}</p>}
    <dl>{rows.map(([label,value])=><div key={label} className={label==='Price'||label.includes('quantity')?'commercial-primary':'commercial-detail'}><dt>{t(label)}</dt><dd>{t(String(value))}</dd></div>)}</dl>
    {href&&!request.demo&&<a href={href}>{t(view.direction==='OFFER'?'View Offer →':'View Demand →')}</a>}
  </article>
}
