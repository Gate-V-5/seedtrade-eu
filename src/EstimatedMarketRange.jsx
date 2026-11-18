import {useLanguage,useT} from './i18n/index.jsx'
import {indicativeAssessment,formatPriceNumber,formatPriceUnit} from './marketPricePresentation.mjs'
export default function EstimatedMarketRange({entityId,compact=false}){
 const {language}=useLanguage(),t=useT(),a=indicativeAssessment(entityId)
 if(!a)return null
 const fmt=n=>formatPriceNumber(n,a.currency,language),unit=formatPriceUnit(a,language,t('seeds'))
 return <div className="catalogue-estimated-range" data-assessment-crop={entityId} data-assessment-low={a.low} data-assessment-high={a.high} data-assessment-currency={a.currency} data-assessment-unit={a.unit} data-assessment-count={a.unitCount||undefined}>
 <dl className="catalogue-metric" style={{margin:0}}><dt>{t('INDICATIVE SEED MARKET PRICE')}</dt><dd>{a.low===a.high?fmt(a.low):`${fmt(a.low)}–${fmt(a.high)}`}<span style={compact?{fontSize:'.8em',fontWeight:500}:undefined}>/{unit}</span></dd></dl>
 {a.midpoint!==null&&a.high>a.low&&<p className="catalogue-note" aria-label={`${t('Midpoint')}: ${fmt(a.midpoint)}/${unit}`} style={compact?{margin:'4px 0 0',fontSize:'.85rem'}:undefined}>{t('Midpoint')}: {fmt(a.midpoint)}{!compact&&<>/{unit}</>}</p>}
 {!compact&&a.date&&<p className="catalogue-period">{t(a.dateLabel)}: <time dateTime={a.date}>{a.date}</time></p>}
 {!compact&&<p className="catalogue-note">{t(a.qualification)}</p>}
 </div>
}
