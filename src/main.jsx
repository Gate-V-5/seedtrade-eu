import React from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import App from './AppV2'
import './styles.css'

const root = document.getElementById('root')
const application = (
  <React.StrictMode>
    <App />
  </React.StrictMode>
)

if (root) {
  if (root.hasChildNodes()) hydrateRoot(root, application)
  else createRoot(root).render(application)
} else {
  console.error('SeedTrade bootstrap failed: #root was not found')
}
