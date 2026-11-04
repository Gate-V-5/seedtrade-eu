import React from 'react'
import {createRoot, hydrateRoot} from 'react-dom/client'
import './styles.css'

// Keep private B2B pages outside the public app's analytics, hash navigation,
// metadata and consent initialization. This does not activate the B2B API.
const pathname = window.location.pathname.replace(/\/$/, '') || '/'
const privateRoute = pathname === '/b2b/verify-email' || pathname === '/b2b/register'
const App = privateRoute
  ? (pathname === '/b2b/verify-email'
      ? (await import('./b2b/B2bVerifyEmail.jsx')).default
      : (await import('./b2b/B2bRegister.jsx')).default)
  : (await import('./AppV2')).default

const root = document.getElementById('root')
const application = <React.StrictMode><App /></React.StrictMode>

if (root) {
  // Private pages have no pre-rendered HTML. Do not hydrate unrelated SSR markup.
  if (!privateRoute && root.hasChildNodes()) hydrateRoot(root, application)
  else createRoot(root).render(application)
} else {
  console.error('SeedTrade bootstrap failed: #root was not found')
}
