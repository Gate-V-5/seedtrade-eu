import {useT,useLanguage} from './i18n/index.jsx'
import intelligence from './generated/snapshot_intelligence_public.json'
import {compactIntelligence} from './i18n/snapshotCompactCopy.js'
import {supplierEvidence} from './marketBriefingEvidence.mjs'
export default function CatalogueCardObservation({card}){
 const t=useT(),{language}=useLanguage(),record=intelligence.records.find(r=>r.entity_id===card.market_entity_id&&r.classification==='PUBLIC_SAFE'),years=card.production_evidence?.years||[],asks=supplierEvidence(card.market_entity_id)
 const text=record?compactIntelligence(record,language):years.length?t('Reported seed evidence covers {years}. National and regional definitions remain separate.',{years:years.join(', ')}):asks.length?t('Supplier-source price evidence is available; validity and commercial terms remain offer-specific.'):t('No comparable species-specific trade balance or current seed-price observation is established.')
 return <p className="catalogue-card-observation">{text}{record&&<small>{t('Evidence as of')}: {record.as_of}</small>}</p>
}
