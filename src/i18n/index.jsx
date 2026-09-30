import { createContext, useContext, useEffect, useState } from "react"
import { messages } from "./messages.js"

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
  const phrase = messages[language]?.[english] || english
  return phrase.replace(/\{(\w+)\}/g, (match, key) => Object.hasOwn(values, key) ? String(values[key]) : match)
}

export function LanguageProvider({ children, initialLanguage = "EN" }) {
  // The server and the first client render both use EN, matching static prerender.
  const [language, setLanguage] = useState(initialLanguage)
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY)
      if (languages.some(item => item.code === saved)) setLanguage(saved)
    } catch { /* Storage can be unavailable in private browsing. */ }
  }, [])
  const selectLanguage = code => {
    if (!languages.some(item => item.code === code)) return
    setLanguage(code)
    try { window.localStorage.setItem(STORAGE_KEY, code) } catch { /* Continue in memory. */ }
  }
  useEffect(() => { document.documentElement.lang = language.toLowerCase() }, [language])
  return <LanguageContext.Provider value={{ language, setLanguage: selectLanguage }}>{children}</LanguageContext.Provider>
}

export function useLanguage() { return useContext(LanguageContext) }
export function useT() { const { language } = useLanguage(); return (value, values) => translate(language, value, values) }
export function T({ children }) { const t = useT(); return t(children) }
export function I18n({ text, values }) { const t = useT(); return t(text, values) }
