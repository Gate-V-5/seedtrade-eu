import {useState,useEffect,useMemo} from 'react'
import {useT,useLanguage} from './i18n/index.jsx'
import data from './generated/seed_intelligence_v1.json'
import legacy from './productionCoverageData.mjs'
import models from './generated/market_analysis_v2.json'
import pilot from './generated/red_clover_fr_current.json'
import {supportedCoverage} from './multiCropAnalysis.mjs'
import {selectionFromSearch,validSelection,analyticalContract,analysisHref} from './analyticalContract.mjs'
import MarketPressureSummary from './MarketPressureSummary.jsx'
const coverage=supportedCoverage(data,legacy)
export function briefingCoverage(entity){return coverage.countries.filter(country=>coverage.crops(country).includes(entity))}
export default function BriefingStage3({card,search=''}){
 const t=useT(),{language}=useLanguage(),entity=card.market_entity_id,countries=briefingCoverage(entity)
 const [requested,setRequested]=useState('')
 useEffect(()=>setRequested(search),[search])
 const selection=useMemo(()=>{if(!countries.length)return null;const query=new URLSearchParams(requested),country=countries.includes(query.get('analysis_country'))?query.get('analysis_country'):countries.includes('FR')?'FR':countries[0],initial=selectionFromSearch(requested,data,legacy);return validSelection({...initial,country,entity,...(initial.entity!==entity?{scenario:{},weatherSensitivity:0}:{})},data,legacy)},[requested,entity])
 const contract=useMemo(()=>selection?analyticalContract({data,legacy,catalogue:models,pilot,selection}):null,[selection])
 if(!contract)return null
 const href=path=>analysisHref(path,selection,language),fmt=n=>new Intl.NumberFormat(language.toLowerCase(),{maximumFractionDigits:2}).format(n)
 const latest=new Map();for(const r of contract.production.filter(r=>r.value!=null)) {const key=r.metric+'|'+r.source?.id+'|'+r.definition+'|'+r.region;const old=latest.get(key);if(!old||r.referenceYear>old.referenceYear)latest.set(key,r)}
 const observations=[...latest.values()].sort((a,b)=>b.referenceYear-a.referenceYear).slice(0,3),metricName=r=>t(({CERTIFIED_SEED_AREA:'Certified seed area',SEED_PRODUCTION_AREA:'Seed production area',REPORTED_SEED_AREA:'Reported seed area',REPORTED_SEED_YIELD:'Reported seed yield',REPORTED_SEED_HARVEST:'Reported seed harvest',CERTIFIED_QUANTITY:'Certified seed quantity',CERTIFIED_SEED_QUANTITY:'Certified seed quantity',CARRY_IN_STOCK:'Carry-in stock'}[r.metric])||'Official seed evidence')
 return <section className="briefing-stage3" id="briefing-stage3"><h2>{t('Production, weather and supply pressure')}</h2><div className="briefing-selection"><label>{t('Country')}<select aria-label={t('Country')} value={selection.country} onChange={e=>{const q=new URLSearchParams(requested);q.set('analysis_country',e.target.value);q.delete('analysis_scenario');q.delete('analysis_weather');setRequested(q.toString())}}>{countries.map(c=><option key={c}>{c}</option>)}</select></label><label>{t('Campaign')}<select aria-label={t('Campaign')} value={selection.year} onChange={e=>{const q=new URLSearchParams(requested);q.set('analysis_year',e.target.value);q.delete('analysis_scenario');q.delete('analysis_weather');setRequested(q.toString())}}>{[2024,2025,2026].map(y=><option key={y} value={y}>{y}/{String(y+1).slice(-2)}</option>)}</select></label></div>
 {observations.length>0&&<><ul className="briefing-production-observations">{observations.map(r=><li key={r.id}><strong>{fmt(r.value)} {r.unit}</strong> · {r.referenceYear} · {metricName(r)} {r.source?.url&&<a href={r.source.url}>{t('Source')}</a>}</li>)}</ul><details className="briefing-definitions"><summary>{t('Scope and definitions')}</summary><p>{t('Accepted or certified area is not necessarily harvested seed area.')}</p>{observations.map(r=><p key={r.id}>{r.referenceYear} · {r.definition}</p>)}</details></>}
 {contract.weather&&<p className="catalogue-note">{t('Weather sample')}: {t(data.regions.find(r=>r.id===selection.region)?.name||selection.country)} · {t(selection.stage)} · {contract.weather.observationPeriod.start} / {contract.weather.observationPeriod.end}. {t('Sampling-cell observations, not nationwide conditions or measured yield losses.')}</p>}
 <MarketPressureSummary contract={contract}/><p className="briefing-analysis-links"><a href={href('/production-intelligence#market-pressure')}>{t('Explore the integrated supply model')} →</a><a href={href('/weather-evidence')}>{t('Weather & Seed Risk')} →</a><a href={href('/trade-pulse')}>{t('EU Market Pulse')} →</a></p>
 </section>
}
