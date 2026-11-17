import {useLanguage} from './i18n/index.jsx'
import {rangePresentation,priceContext} from './estimatedMarketRange.mjs'
export default function EstimatedMarketRange({entityId}) {
 const {language}=useLanguage(),view=rangePresentation(entityId,language)
 if(!view)return null
 return <div className="catalogue-estimated-range" data-estimated-range={view.state}><dl className="catalogue-metric" style={{margin:0}}><dt>{view.label}</dt><dd>{view.value}</dd></dl>{view.state==='RANGE'&&<p className="catalogue-note catalogue-price-context">{priceContext(entityId,language)}</p>}</div>
}
