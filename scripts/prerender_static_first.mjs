#!/usr/bin/env node
import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createServer } from 'vite'

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..')
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

const vite = await createServer({
  root,
  appType: 'custom',
  logLevel: 'error',
  server: { middlewareMode: true },
})

try {
  const { default: AppV2 } = await vite.ssrLoadModule('/src/AppV2.jsx')
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
    window.location.pathname = route
    const markup = renderToStaticMarkup(React.createElement(AppV2))
    let html = await fs.readFile(file, 'utf8')
    html = html.replace(
      /<div id="root">[\s\S]*?<\/div>\s*(?=<\/body>)/,
      `<div id="root">${markup}</div><noscript><div class="static-runtime-note">SeedTrade public market intelligence is available without JavaScript. Interactive rotation and filters require JavaScript.</div></noscript>`,
    )
    await fs.writeFile(file, html, 'utf8')
  }
  process.stdout.write(`static-first prerendered ${files.length} routes\n`)
} finally {
  await vite.close()
}
