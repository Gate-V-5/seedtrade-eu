import React from 'react'
import {createRoot, hydrateRoot} from 'react-dom/client'
import './styles.css'
import {LanguageProvider,LanguageSelector} from './i18n/index.jsx'
import './b2b/registration.css'
import B2bNavigation from './b2b/B2bNavigation.jsx'

// Keep private B2B pages outside the public app's analytics, hash navigation,
// metadata and consent initialization. This does not activate the B2B API.
const pathname = window.location.pathname.replace(/\/$/, '') || '/'
const privateRoute = ['/b2b/verify-email','/b2b/register','/b2b/account','/b2b/reset-password'].includes(pathname)
const App = privateRoute
  ? (pathname === '/b2b/verify-email'
      ? (await import('./b2b/B2bVerifyEmail.jsx')).default
      : ['/b2b/account','/b2b/reset-password'].includes(pathname)
        ? (await import('./b2b/B2bMemberPage.jsx')).default
        : (await import('./b2b/B2bRegister.jsx')).default)
  : (await import('./AppV2')).default

const root = document.getElementById('root')
const application = <React.StrictMode>{privateRoute?<LanguageProvider><div className="b2b-private-shell"><header className="b2b-site-header"><a className="b2b-brand" href="/">SEEDTRADE.EU</a><div className="header-actions"><B2bNavigation/><LanguageSelector/></div></header><App/></div></LanguageProvider>:<App/>}</React.StrictMode>

if (root) {
  // Private pages have no pre-rendered HTML. Do not hydrate unrelated SSR markup.
  if (!privateRoute && root.hasChildNodes()) hydrateRoot(root, application)
  else createRoot(root).render(application)
} else {
  console.error('SeedTrade bootstrap failed: #root was not found')
}
