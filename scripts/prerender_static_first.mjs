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

// Use production SSR loading inside the existing prerender step. The dev
// runner incorrectly inlines CommonJS React on Windows. This build-only bundle
// is outside dist/public and resolves the same installed React as this script.
const ssrDirectory = path.join(root, '.seedtrade-ssr')
await build({
  root,
  logLevel: 'error',
  build: {
    ssr: path.join(root, 'src/AppV2.jsx'),
    outDir: ssrDirectory,
    emptyOutDir: false,
    copyPublicDir: false,
    rollupOptions: {
      external: ['react', 'react/jsx-runtime', 'react/jsx-dev-runtime'],
      output: { entryFileNames: 'AppV2.mjs' },
    },
  },
})

{
  const { default: AppV2 } = await import(pathToFileURL(path.join(ssrDirectory, 'AppV2.mjs')).href)
  const files = []
  async function walk(directory) {
    for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
      const full = path.join(directory, entry.name)
      if (entry.isDirectory()) await walk(full)
      else if (entry.name === 'index.html') files.push(full)
    }
  }
  await walk(dist)

  for (const file of files.sort()) {
    const relative = path.relative(dist, path.dirname(file)).split(path.sep).join('/')
    const route = relative ? `/${relative}` : '/'
    if (['/b2b/register','/b2b/verify-email','/b2b/account'].includes(route)) continue
    window.location.pathname = route
    // hydrateRoot requires React's hydratable text-boundary markers. Static
    // markup deliberately omits them and caused production errors #418/#423/#425.
    const markup = renderToString(React.createElement(AppV2))
    let html = await fs.readFile(file, 'utf8')
    html = html.replace(
      /<div id="root">[\s\S]*?<\/div>\s*(?=<\/body>)/,
      `<div id="root">${markup}</div><noscript><div class="static-runtime-note">SeedTrade public market intelligence is available without JavaScript. Interactive rotation and filters require JavaScript.</div></noscript>`,
    )
    await fs.writeFile(file, html, 'utf8')
  }
  process.stdout.write(`static-first prerendered ${files.length} routes\n`)
}
