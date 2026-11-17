import {useEffect,useState} from 'react'
import {useT,useLanguage} from './i18n/index.jsx'
import {analysisKeys,analysisHref} from './analyticalContract.mjs'
import {validScenario} from './analysisScenario.mjs'
// Keep measured-weather payloads off Pulse and homepage. The destination applies
// canonical country/species validation; only bounded public analysis state travels.
export default function AnalysisContinuation(){
 const t=useT(),{language}=useLanguage(),[selection,setSelection]=useState({})
 useEffect(()=>{const q=new URLSearchParams(window.location.search),s={};for(const [key,name]of Object.entries(analysisKeys)){if(!q.has(name))continue;const value=q.get(name);if(key==='scenario')s[key]=validScenario(value);else if(key==='year'){const n=Number(value);if(Number.isInteger(n)&&n>=2021&&n<=2026)s[key]=n}else if(key==='weatherSensitivity'){const n=Number(value);if(Number.isFinite(n)&&n>=-100&&n<=100)s[key]=n}else if(value.length<=80&&/^[a-zA-Z0-9 _-]+$/.test(value))s[key]=value}setSelection(s)},[])
 return <nav className="analysis-continuation" aria-label={t('Continue the analysis')}><a href={analysisHref('/production-intelligence#market-pressure',selection,language)}>{t('Continue supply and demand analysis')} <span aria-hidden="true">→</span></a></nav>
}
