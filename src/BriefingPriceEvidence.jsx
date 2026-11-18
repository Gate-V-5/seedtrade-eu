import {useT,useLanguage} from './i18n/index.jsx'
import {supplierEvidence} from './marketBriefingEvidence.mjs'
import {formatPriceNumber} from './marketPricePresentation.mjs'
export default function BriefingPriceEvidence({entityId}){
 const t=useT(),{language}=useLanguage(),records=supplierEvidence(entityId)
 if(!records.length)return null
 return <details className="catalogue-provenance briefing-evidence"><summary>{t('Additional supplier observations')}</summary><div><p>{t('Individual offers; not a market average.')}</p>{records.map(r=><p key={r.id}><a href={r.sourceUrl} target="_blank" rel="noopener noreferrer">{r.source}</a>: {formatPriceNumber(r.price,r.currency,language)}/kg · {r.packKg} kg · {t(r.vatBasis==='INCLUDED'?'VAT included':r.vatBasis==='EXCLUDED'?'VAT excluded':'Confirm commercial terms')}{r.observationDate&&<> · {r.observationDate}</>}</p>)}</div></details>
}
