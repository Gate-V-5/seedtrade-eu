#!/usr/bin/env node
import fs from 'node:fs/promises'
import path from 'node:path'
import {fileURLToPath,pathToFileURL} from 'node:url'
import process from 'node:process'
import React from 'react'
import { renderToString } from 'react-dom/server'
import { build } from 'vite'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const dist = path.join(root, 'dist')
const renderDate=process.env.SEEDTRADE_NEWS_RENDER_DATE || new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Vilnius',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())
if(!/^\d{4}-\d{2}-\d{2}$/.test(renderDate)||Number.isNaN(Date.parse(renderDate)))throw Error('INVALID_NEWS_RENDER_DATE')
globalThis.__SEEDTRADE_NEWS_DATE__=renderDate

const storage = {
  getItem() { return null },
  setItem() {},
  removeItem() {},
}

global.window = {
  location: { pathname: '/' },
  localStorage: storage,
  setInterval() { return 0 },
  clearInterval() {},
  dataLayer: [],
}
global.localStorage = storage

// Build the SSR module once; native Node resolves external CommonJS dependencies.
// This also avoids development module-runner path handling on Windows.
const ssrDirectory = path.join(root, '.legal-ssr')
await build({root, logLevel:'error', build:{
  ssr:path.join(root,'src/AppV2.jsx'), outDir:ssrDirectory,
  emptyOutDir:false, copyPublicDir:false,
  rollupOptions:{external:['react','react-dom','react/jsx-runtime','react/jsx-dev-runtime'],output:{entryFileNames:'AppV2.mjs'}},
}})

try {
  const { default: AppV2 } = await import(pathToFileURL(path.join(ssrDirectory,'AppV2.mjs')).href)
  const files = []
  async function walk(directory) {
    for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
      const full = path.join(directory, entry.name)
      if (entry.isDirectory() && !(directory === dist && entry.name === 'legal')) await walk(full)
      else if (entry.name === 'index.html') files.push(full)
    }
  }
  await walk(dist)

  for (const file of files.sort()) {
    const relative = path.relative(dist, path.dirname(file)).split(path.sep).join('/')
    const route = relative ? `/${relative}` : '/'
    if (['/b2b/register','/b2b/verify-email','/b2b/account','/b2b/reset-password','/b2b/admin'].includes(route)) continue
    window.location.pathname = route
    // hydrateRoot requires React's hydratable text-boundary markers. Static
    // markup deliberately omits them and caused production errors #418/#423/#425.
    const markup = renderToString(React.createElement(AppV2))
    let html = await fs.readFile(file, 'utf8')
    html = html.replace(
      /<div id="root">[\s\S]*?<\/div>\s*(?=<\/body>)/,
      `<div id="root">${markup}</div><noscript><div class="static-runtime-note">SeedTrade public market intelligence is available without JavaScript. Interactive rotation and filters require JavaScript.</div></noscript>`,
    )
    if(route==='/'||route==='/news'||route.startsWith('/news/'))html=html.replace('</head>',`<meta name="seedtrade-news-render-date" content="${renderDate}"></head>`)
    await fs.writeFile(file, html, 'utf8')
  }
  process.stdout.write(`static-first prerendered ${files.length} routes\n`)
} finally {
  // No server or watcher was started.
}
