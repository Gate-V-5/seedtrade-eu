import {useMemo} from 'react'
import {useT,useLanguage} from './i18n/index.jsx'
import data from './generated/seed_intelligence_v1.json'
import legacy from './productionCoverageData.mjs'
import catalogue from './generated/market_analysis_v2.json'
import pilot from './generated/red_clover_fr_current.json'
import {analyticalContract} from './analyticalContract.mjs'
export default function ProductionEvidenceGroups({selection}){
 const t=useT(),{language}=useLanguage(),c=useMemo(()=>analyticalContract({data,legacy,catalogue,pilot,selection}),[selection.country,selection.entity,selection.year,selection.region,selection.stage]),fmt=n=>new Intl.NumberFormat(language.toLowerCase(),{maximumFractionDigits:2}).format(n)
 const groups=[['Reported crop area',c.broaderArea.filter(r=>r.value!=null).map(r=>({id:r.id,value:r.value,unit:r.unit,year:r.year,definition:r.definition,url:r.source_url}))],['Reported seed-production area',c.production.filter(r=>r.unit==='ha').map(r=>({...r,year:r.campaignOrYear,url:r.source?.url}))],['Reported seed harvest',c.production.filter(r=>r.metric==='REPORTED_SEED_HARVEST').map(r=>({...r,year:r.campaignOrYear,url:r.source?.url}))],['Certification and marketed quantities',c.production.filter(r=>r.unit!=='ha'&&!['CARRY_IN_STOCK','REPORTED_SEED_YIELD','REPORTED_SEED_HARVEST'].includes(r.metric)).map(r=>({...r,year:r.campaignOrYear,url:r.source?.url}))]]
 return <div className="production-evidence-groups"><p>{t('Reported crop area, seed fields and commercial quantities remain separate. Source stages, overlapping categories and regions are never added together.')}</p>{groups.filter(([,rows])=>rows.length).map(([label,rows])=><details key={label}><summary>{t(label)}</summary><ul>{rows.map(r=><li key={r.id}><strong>{r.year} · {fmt(r.value)} {r.unit}</strong> · {r.definition} · <a href={r.url}>{t('Source evidence')}</a></li>)}</ul></details>)}<p className="s3-note">{t('Estimated harvested area and output appear only in explicit sensitivity controls. Historical stocks and balances follow below; comparable trends remain in the production archive.')}</p></div>
}
