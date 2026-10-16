// News V3 replaces the obsolete side-thumbnail grid with one shared16:9 card.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import React from 'react'
import {renderToStaticMarkup} from 'react-dom/server'
import {JSDOM} from 'jsdom'
import {createServer} from 'vite'
const css=fs.readFileSync('src/styles.css','utf8'),v=await createServer({appType:'custom',server:{middlewareMode:true},logLevel:'error'})
try{
 const {default:App}=await v.ssrLoadModule('/src/AppV2.jsx')
 for(const language of ['EN','DE','FR','ES','IT']){
  globalThis.window={location:{pathname:'/',search:''}};const d=new JSDOM(renderToStaticMarkup(React.createElement(App,{initialLanguage:language})))
  const style=d.window.document.createElement('style');style.textContent=css;d.window.document.head.append(style)
  for(const c of d.window.document.querySelectorAll('.top-news .news-card')){
   assert.equal(d.window.getComputedStyle(c).flexDirection,'column');assert.equal(d.window.getComputedStyle(c.querySelector('.news-image-link')).aspectRatio,'16/9')
   assert.equal(c.querySelectorAll('p,small,.news-photo-attribution').length,0);assert.ok(c.querySelector('h3 a'));assert.ok(c.querySelector('img[width][height][alt]'))
  }
  d.window.close()
 }
 assert.ok(css.includes('.news-list,.news-grid{grid-template-columns:minmax(0,1fr)'))
 console.log('Mobile placement PASS: News V3 shared16:9 media above full headlines, clean cards in five languages. Six-width computed contracts run separately; browser geometry unverified here.')
}finally{await v.close()}
