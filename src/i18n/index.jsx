import { createContext, useContext, useEffect, useState } from "react"
import { messages } from "./messages.js"
import {languageFromUrl,languageHref,uiLanguage} from './languageState.mjs'

export const languages = Object.freeze([
  { code: "EN", flag: "🇬🇧" },
  { code: "DE", flag: "🇩🇪" },
  { code: "FR", flag: "🇫🇷" },
  { code: "ES", flag: "🇪🇸" },
  { code: "IT", flag: "🇮🇹" },
])

const STORAGE_KEY = "seedtrade_language"
const LanguageContext = createContext({ language: "EN", setLanguage: () => {} })

export function translate(language, english, values = {}) {
  const catalog = Object.hasOwn(messages, language) ? messages[language] : null
  const phrase = catalog && Object.hasOwn(catalog, english) && catalog[english] ? catalog[english] : english
  return phrase.replace(/\{(\w+)\}/g, (match, key) => Object.hasOwn(values, key) ? String(values[key]) : match)
}

export function LanguageProvider({ children, initialLanguage = "EN" }) {
  // The server and the first client render both use EN, matching static prerender.
  const [language, setLanguage] = useState(uiLanguage(initialLanguage)??'EN')
  useEffect(() => {
    const restore=()=>{
      let saved;try{saved=window.localStorage.getItem(STORAGE_KEY)}catch{}
      const code=languageFromUrl(window.location.href)??uiLanguage(window.history.state?.seedtradeLanguage)??uiLanguage(saved)??'EN'
      setLanguage(code)
      try{window.localStorage.setItem(STORAGE_KEY,code)}catch{}
      window.history.replaceState({...window.history.state,seedtradeLanguage:code},'',window.location.pathname+window.location.search+window.location.hash)
    }
    restore();window.addEventListener('popstate',restore)
    return()=>window.removeEventListener('popstate',restore)
  }, [])
  const selectLanguage = code => {
    if (!languages.some(item => item.code === code)) return
    setLanguage(code)
    try { window.localStorage.setItem(STORAGE_KEY, code) } catch { /* Continue in memory. */ }
    const url=new URL(window.location.href);url.searchParams.set('lang',code.toLowerCase())
    window.history.replaceState({...window.history.state,seedtradeLanguage:code},'',url.pathname+url.search+url.hash)
  }
  useEffect(()=>{
    // Carry the selected language across full-page navigation, including when storage is blocked.
    const navigate=event=>{
      const anchor=event.target?.closest?.('a[href]');if(!anchor||anchor.hasAttribute('download')||anchor.getAttribute('href').startsWith('#'))return
      const url=new URL(anchor.href,window.location.href)
      if(url.origin!==window.location.origin||/\.[a-z0-9]+$/i.test(url.pathname))return
      anchor.setAttribute('href',languageHref(anchor.getAttribute('href'),language,window.location.origin,window.location.href))
    }
    document.addEventListener('click',navigate,true)
    return()=>document.removeEventListener('click',navigate,true)
  },[language])
  useEffect(() => { document.documentElement.lang = language.toLowerCase() }, [language])
  return <LanguageContext.Provider value={{ language, setLanguage: selectLanguage }}>{children}</LanguageContext.Provider>
}

export function useLanguage() { return useContext(LanguageContext) }
export function LanguageSelector({disabled=false}) {
  const {language,setLanguage}=useLanguage();const t=useT()
  return <select className="language-select" aria-label={t('Language')} value={language} onChange={event=>setLanguage(event.target.value)} disabled={disabled}>
    {languages.map(({code,flag})=><option key={code} value={code}>{flag} {code}</option>)}
  </select>
}
export function useT() { const { language } = useLanguage(); return (value, values) => translate(language, value, values) }
export function T({ children }) { const t = useT(); return t(children) }
export function I18n({ text, values }) { const t = useT(); return t(text, values) }
