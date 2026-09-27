#!/usr/bin/env node
import fs from 'node:fs/promises'
import path from 'node:path'
import React from 'react'
import { renderToString } from 'react-dom/server'
import { createServer } from 'vite'

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..')
const routes = []
async function collect(directory) {
  for (const item of await fs.readdir(directory, { withFileTypes: true })) {
    const full = path.join(directory, item.name)
    if (item.isDirectory()) await collect(full)
    else if (item.name === 'index.html') {
      const relative = path.relative(path.join(root, 'dist'), path.dirname(full)).split(path.sep).join('/')
      routes.push(relative ? `/${relative}/` : '/')
    }
  }
}
await collect(path.join(root, 'dist'))
global.window = { location: { pathname: '/' }, localStorage: { getItem() { return null } } }
const vite = await createServer({ root, appType: 'custom', logLevel: 'error', server: { middlewareMode: true } })
try {
  const { default: App } = await vite.ssrLoadModule('/src/AppV2.jsx')
  for (const route of routes.sort()) {
    const html = await fs.readFile(path.join(root, 'dist', route.slice(1), 'index.html'), 'utf8')
    const staticMarkup = html.split('<div id="root">', 2)[1]?.split('</div><noscript>', 1)[0]
    if (staticMarkup == null) throw new Error(`${route}: static-first root missing`)
    window.location.pathname = route // actual browser URL includes the trailing slash
    const clientInitialMarkup = renderToString(React.createElement(App))
    if (staticMarkup !== clientInitialMarkup) {
      let at = 0
      while (staticMarkup[at] === clientInitialMarkup[at] && at < staticMarkup.length && at < clientInitialMarkup.length) at++
      throw new Error(`${route}: first render differs at character ${at}; static=${JSON.stringify(staticMarkup.slice(at, at + 100))}; client=${JSON.stringify(clientInitialMarkup.slice(at, at + 100))}`)
    }
    process.stdout.write(`${route} static/client initial markup MATCH\n`)
  }
  process.stdout.write(`${routes.length} routes: static/client initial render MATCH\n`)
} finally {
  await vite.close()
}
