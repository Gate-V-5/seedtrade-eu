// Structural/computed CSS QA only. Browser pixels and screenshots are not claimed.
import fs from 'node:fs'
import assert from 'node:assert/strict'
import React from 'react'
import {renderToStaticMarkup} from 'react-dom/server'
import {JSDOM} from 'jsdom'
import {createServer} from 'vite'
const css=fs.readFileSync('src/styles.css','utf8'),parser=new JSDOM('<style></style>')
parser.window.document.querySelector('style').textContent=css
const matches=(s,w)=>[...s.matchAll(/min-width\s*:\s*(\d+)px/g)].every(m=>w>=Number(m[1]))&&[...s.matchAll(/max-width\s*:\s*(\d+)px/g)].every(m=>w<=Number(m[1]))&&!s.includes('print')
const active=(rules,w)=>[...rules].flatMap(r=>r.media?matches(r.conditionText,w)?active(r.cssRules,w):[]:r.cssRules?active(r.cssRules,w):r.cssText).join('\n')
const vite=await createServer({appType:'custom',server:{middlewareMode:true},logLevel:'error'})
try {
 const {default:App}=await vite.ssrLoadModule('/src/AppV2.jsx')
 for(const width of [360,390,430,768,1024,1440])for(const lang of ['EN','DE','FR','ES','IT']) {
  global.window={location:{pathname:'/production-intelligence/'}}
  const dom=new JSDOM(renderToStaticMarkup(React.createElement(App,{initialLanguage:lang})))
  const style=dom.window.document.createElement('style');style.textContent=active(parser.window.document.styleSheets[0].cssRules,width);dom.window.document.head.append(style)
  const q=s=>dom.window.document.querySelector(s),computed=s=>dom.window.getComputedStyle(q(s))
  assert.equal(computed('.production-filters').gridTemplateColumns,width<=620?'repeat(2,minmax(0,1fr))':width<=1024?'repeat(3,minmax(0,1fr))':'2fr 1fr 1.4fr 1fr 1.3fr')
  assert.equal(computed('.production-comparison-grid').gridTemplateColumns,width<=620?'1fr':width<=1024?'repeat(2,minmax(0,1fr))':'repeat(3,minmax(0,1fr))')
  assert.equal(computed('.production-filters select').minHeight,'44px')
  assert.equal(computed('.production-filters select').maxWidth,'100%')
  assert.equal(q('.production-chart svg').getAttribute('viewBox'),'0 0 600 220')
  assert.equal(q('.production-chart svg').querySelectorAll('polyline,path').length,0)
  assert.equal(computed('.production-table').tableLayout,'fixed')
  assert.equal(computed('.production-comparison-grid article').minWidth,'0')
  dom.window.close()
 }
 console.log('Production CSS/DOM 6 widths × 5 languages PASS; browser geometry/visuals NOT VERIFIED')
} finally {await vite.close();parser.window.close()}
