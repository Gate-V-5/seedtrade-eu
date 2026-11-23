import {marketplacePresentation,isActivePublicListing} from './marketplacePresentation.mjs'
import {offerOriginLabel} from '../server/b2b/offerOptions.mjs'
import {useT,useLanguage} from './i18n/index.jsx'
import {listingTrading} from './listingTrading.mjs'
import './marketplaceListings.css'

export default function MarketplaceListingCard({request,species,detailHref,localDraft=false,interestHref,interestLabel}) {
  const t=useT(),{language}=useLanguage(),view=listingTrading(request),words=marketplacePresentation(language),active=isActivePublicListing(request,{localDraft})
  const href=detailHref || (request.slug?`/buying-requests/${request.slug}?lang=${language.toLowerCase()}`:null)
  const rows=[
    [view.direction==='OFFER'?'Available quantity':'Requested quantity',view.quantity],
    ['Price',view.price],['Origin',offerOriginLabel(view.origin,language)],
    ['Category',view.certification],['Terms',view.delivery],
    ['Packaging',view.packaging],['Organic status',view.organic],
    ['Delivery',request.delivery_period || request.availability],
  ].filter(([,value])=>value!=null&&value!=='')
  return <article className={`request-card trading-card direction-${view.direction==='BUY_REQUEST'?'buy':'sell'} ${request.demo?'demo':''}`}>
    <div className="trading-badges"><strong className="direction-badge">{words[view.direction==='OFFER'?0:1]}</strong>{view.productType&&<span className="product-badge">{words[view.productType==='COMMODITY'?3:2]}</span>}{active&&<span className="active-badge">{words[4]}</span>}</div>
    <h3>{t(view.commonName || species?.common_name_en || 'Species')}</h3>
    {(view.botanicalName || species?.botanical_name)&&<p className="trading-botanical"><i>{view.botanicalName || species.botanical_name}</i></p>}
    {request.variety&&<p className="variety">{t('Variety:')} {request.variety}</p>}
    {(localDraft||request.demo)&&<p className="trading-draft">{t(localDraft?'Local draft — not published':'Illustrative TEST card')}</p>}
    <dl>{rows.map(([label,value])=><div key={label} className={label==='Price'||label.includes('quantity')?'commercial-primary':'commercial-detail'}><dt>{t(label)}</dt><dd>{t(String(value))}</dd></div>)}</dl>
    {href&&!request.demo&&<a href={href}>{words[view.direction==='OFFER'?5:6]}</a>}
    {interestHref&&<a className="button broker-interest" href={interestHref}>{interestLabel??t("I'm interested")}</a>}
  </article>
}
