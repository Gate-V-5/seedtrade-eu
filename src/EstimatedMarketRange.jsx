import {snapshotPriceLabels} from './SnapshotPriceGuide.jsx'
import {useLanguage,useT} from './i18n/index.jsx'
import {rangePresentation,priceContext} from './estimatedMarketRange.mjs'
import {ownerPriceFor,formatPriceNumber,formatPriceUnit,priceEvidenceLabel} from './marketPricePresentation.mjs'
export default function EstimatedMarketRange({entityId,compact=false}) {
 const {language}=useLanguage(),t=useT(),owner=ownerPriceFor(entityId),view=rangePresentation(entityId,language)
 if(owner){
  const fmt=n=>formatPriceNumber(n,owner.currency,language),unit=formatPriceUnit(owner,language,t('seeds'))
  return <div className="catalogue-estimated-range" data-price-type={owner.type}><dl className="catalogue-metric" style={{margin:0}}><dt>{t(compact?'Owner price reference':priceEvidenceLabel(owner.type))}</dt><dd>{owner.low!=null?`${fmt(owner.low)} – ${fmt(owner.high)}`:fmt(owner.price)} / {unit}</dd></dl>{!compact&&<p className="catalogue-note">{t(owner.type==='OWNER_MODEL_ESTIMATE'?'Owner formula estimate from a dated commodity benchmark; not a supplier quotation.':'Owner-supplied reference; source context and current availability are unverified.')}</p>}</div>
 }
 if(!view||compact&&view.state!=='RANGE')return null
 return <div className="catalogue-estimated-range" data-estimated-range={view.state}><dl className="catalogue-metric" style={{margin:0}}><dt>{compact?(snapshotPriceLabels[language]||snapshotPriceLabels.EN):view.label}</dt><dd>{view.value}</dd></dl>{!compact&&view.state==='RANGE'&&<p className="catalogue-note catalogue-price-context">{priceContext(entityId,language)}</p>}</div>
}
