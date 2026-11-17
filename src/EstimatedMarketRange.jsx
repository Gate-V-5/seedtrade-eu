import {snapshotPriceLabels} from './SnapshotPriceGuide.jsx'
import {useLanguage} from './i18n/index.jsx'
import {rangePresentation,priceContext} from './estimatedMarketRange.mjs'
export default function EstimatedMarketRange({entityId,compact=false}) {
 const {language}=useLanguage(),view=rangePresentation(entityId,language)
 if(!view||compact&&view.state!=='RANGE')return null
 return <div className="catalogue-estimated-range" data-estimated-range={view.state}><dl className="catalogue-metric" style={{margin:0}}><dt>{compact?(snapshotPriceLabels[language]||snapshotPriceLabels.EN):view.label}</dt><dd>{view.value}</dd></dl>{!compact&&view.state==='RANGE'&&<p className="catalogue-note catalogue-price-context">{priceContext(entityId,language)}</p>}</div>
}
