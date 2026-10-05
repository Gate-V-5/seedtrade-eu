import {useT,useLanguage} from './i18n/index.jsx'
import {calendarSlots} from './commercialEvidence.mjs'
const available=value=>value!==null&&value!==undefined&&Number.isFinite(Number(value))
const locale=code=>({EN:'en-GB',DE:'de-DE',FR:'fr-FR',ES:'es-ES',IT:'it-IT'}[code]||'en-GB')
export default function EvidenceHistory({points,field,title,unit,price=false,source=null}) {
  const t=useT(),{language}=useLanguage(),usable=points.filter(p=>available(p[field]))
  if(!usable.length)return null
  const last=usable.at(-1),slots=price&&usable.some(p=>p.period.length>7)?usable.slice(-12).map(point=>({period:point.period,point})):calendarSlots(usable,last.period,12,field),max=Math.max(...usable.map(p=>Number(p[field])))||1
  const format=value=>new Intl.NumberFormat(locale(language),{minimumFractionDigits:price?2:0,maximumFractionDigits:2}).format(Number(value))
  return <section className="catalogue-detail-panel catalogue-history-panel"><h2>{t(title)}</h2><div className="catalogue-history-chart"><div className="catalogue-history-axis"><span className="catalogue-axis-unit">{unit}</span><span>{format(max)}</span><span>0</span></div><div className="catalogue-evidence-history" style={{gridTemplateColumns:`repeat(${slots.length},minmax(0,1fr))`}} aria-label={t(title)}>{slots.map(({period,point})=><div key={period} className="catalogue-history-slot">{point&&<i tabIndex="0" title={`${period}: ${price?'€':''}${format(point[field])}${price?'/kg':' t'}`} aria-label={`${period}: ${price?'€':''}${format(point[field])}${price?'/kg':' t'}`} style={{height:`${Number(point[field])/max*100}%`}}/>}<small data-period={period}>{period}</small></div>)}</div></div>{price&&<><p>{t('Latest available: €{value}/kg · {period}',{value:format(last[field]),period:last.period})}</p><p className="catalogue-note">{t('Representative price uses eligible evidence for this seed and its stated market scope; it is not an official EU average.')}</p></>}{source&&<p className="catalogue-note">{t("Source:")} {source}</p>}</section>
}
