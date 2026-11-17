import {useT,useLanguage} from './i18n/index.jsx'
import {languageHref} from './i18n/languageState.mjs'
export default function MarketBriefingNavigation({category}){
 const t=useT(),{language}=useLanguage(),href=p=>languageHref(p,language)
 return <nav className="briefing-bottom-nav" aria-label={t('Market navigation')}><a href={href(category?'/market/'+category.slug:'/market')}><svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><path d="M15 9H3m5-5-5 5 5 5" fill="none" stroke="currentColor" strokeWidth="1.8"/></svg>{t(category?'Back to category':'European Seed Market')}</a>{category&&<a href={href('/market')}>{t('European Seed Market')}</a>}<a href={href('/#market-intelligence-sections')}>{t('Back to Market Intelligence')}</a></nav>
}
