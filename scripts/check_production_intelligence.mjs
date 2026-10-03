import fs from 'node:fs'
import assert from 'node:assert/strict'
import React from 'react'
import {renderToString} from 'react-dom/server'
import {JSDOM} from 'jsdom'
import {createServer} from 'vite'
const vite=await createServer({appType:'custom',server:{middlewareMode:true},logLevel:'error'})
try {
 const {default:App,publicRoute,routeMeta}=await vite.ssrLoadModule('/src/AppV2.jsx')
 const {translate}=await vite.ssrLoadModule('/src/i18n/index.jsx')
 assert.ok(publicRoute('/production-intelligence'));assert.ok(routeMeta('/production-intelligence').index)
 for(const language of ['EN','DE','FR','ES','IT']) {
  global.window={location:{pathname:'/production-intelligence/'}}
  const doc=new JSDOM(renderToString(React.createElement(App,{initialLanguage:language}))).window.document
  assert.ok(doc.querySelector('h1').textContent===translate(language,'Seed Production Intelligence'))
  assert.equal(doc.querySelectorAll('.production-filters select').length,5)
  assert.ok(doc.querySelector('h2').textContent.includes('Medicago sativa'))
  assert.ok(doc.querySelectorAll('.production-table tbody tr').length>=5)
  assert.ok(doc.querySelector('.production-chart svg').getAttribute('aria-label'))
  assert.ok(doc.querySelector('.production-kpis').textContent.includes('2025'))
  assert.ok(!doc.querySelector('.production-filters').textContent.includes('Luxembourg'))
  for(const a of doc.querySelectorAll('.production-table a'))assert.ok(a.href.startsWith('https://'))
  assert.equal(doc.querySelector('.production-history-status').textContent,translate(language,'{count}-year comparable history available',{count:5}))
 }
 global.window={location:{pathname:'/'}}
 const doc=new JSDOM(renderToString(React.createElement(App))).window.document
 assert.equal(doc.querySelector('.intelligence-topic-visual.production').closest('article').querySelector('a').getAttribute('href'),'/production-intelligence')
 const current=fs.readFileSync('src/AppV2.jsx','utf8')
 assert.ok(current.includes('<FixedEvidenceImage name="production"/>'))
 assert.equal(translate('UNKNOWN','Seed Production Intelligence'),'Seed Production Intelligence')
 console.log('Production Intelligence SSR: five languages, route, botanical names, provenance, homepage link and fallback PASS')
} finally {await vite.close()}
