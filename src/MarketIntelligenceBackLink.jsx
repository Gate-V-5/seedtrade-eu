import {useT,useLanguage} from './i18n/index.jsx'
import {languageHref} from './i18n/languageState.mjs'
import './MarketIntelligenceBackLink.css'

// Shared footer navigation follows the existing article-navigation pattern and
// uses the site's language-aware link helper instead of separate routing state.
export default function MarketIntelligenceBackLink(){
 const t=useT(),{language}=useLanguage()
 return <nav className="market-intelligence-back" aria-label={t('Back to Market Intelligence')}>
  <a href={languageHref('/#market-intelligence-sections',language)}>
   <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true" focusable="false"><path d="M15 9H3m5-5-5 5 5 5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
   <span>{t('Back to Market Intelligence')}</span>
  </a>
 </nav>
}
