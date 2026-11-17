import {useState,useEffect} from 'react'
import data from './generated/seed_intelligence_v1.json'
import legacy from './productionCoverageData.mjs'
import {analysisDefaults,selectionFromSearch,validSelection,analysisHref} from './analyticalContract.mjs'
export function useAnalysisSelection(language){
 const [selection,setSelection]=useState(analysisDefaults)
 useEffect(()=>{const restore=()=>setSelection(selectionFromSearch(window.location.search,data,legacy));restore();window.addEventListener('popstate',restore);return()=>window.removeEventListener('popstate',restore)},[])
 const update=patch=>setSelection(old=>{const changed=['country','entity','year'].some(key=>patch[key]!=null&&patch[key]!==old[key]);const scenario=changed?{}:{...old.scenario,...patch.scenario};const next=validSelection({...old,...patch,scenario,weatherSensitivity:changed?0:patch.weatherSensitivity??old.weatherSensitivity},data,legacy);window.history.replaceState(window.history.state,'',analysisHref(window.location.pathname+window.location.search+window.location.hash,next,language));return next})
 return {selection,update,href:path=>analysisHref(path,selection,language)}
}
