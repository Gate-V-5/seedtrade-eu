// Media-aware CSS/DOM contracts, not browser pixel or overflow measurements.
import fs from 'node:fs'
import assert from 'node:assert/strict'
import {execFileSync} from 'node:child_process'
import React from 'react'
import {renderToStaticMarkup} from 'react-dom/server'
import {JSDOM} from 'jsdom'
import {createServer} from 'vite'
const css=fs.readFileSync('src/styles.css','utf8')
const parser=new JSDOM('<style></style>');parser.window.document.querySelector('style').textContent=css
const matches=(condition,width)=>{
 const minimum=[...condition.matchAll(/min-width\s*:\s*(\d+)px/g)].map(match=>Number(match[1]))
 const maximum=[...condition.matchAll(/max-width\s*:\s*(\d+)px/g)].map(match=>Number(match[1]))
 return minimum.every(value=>width>=value)&&maximum.every(value=>width<=value)&&!condition.includes('print')
}
const active=(rules,width)=>[...rules].flatMap(rule=>rule.media?matches(rule.conditionText,width)?active(rule.cssRules,width):[]:rule.cssRules?active(rule.cssRules,width):rule.cssText).join('\n')
const news=JSON.parse(fs.readFileSync('src/generated/news.json'))
const trade=JSON.parse(fs.readFileSync('src/generated/trade_pulse_public.json'))
const canonical=execFileSync('git',['show','6031f3cc51cca221dcd9070fd3ce53d5df36bbc3:src/AppV2.jsx'],{encoding:'utf8'})
const current=fs.readFileSync('src/AppV2.jsx','utf8')
for(const name of ['Header','TradePulseSignal']){
 const extract=source=>source.split(`function ${name}(`)[1].split('\nfunction ')[0]
 assert.equal(extract(current),extract(canonical),`${name} behavior/data unchanged`)
}
const vite=await createServer({appType:'custom',server:{middlewareMode:true},logLevel:'error'})
try{
 const {default:App}=await vite.ssrLoadModule('/src/AppV2.jsx')
 for(const width of [360,390,430,768,1024,1440])for(const language of ['EN','DE','FR','ES','IT']){
  globalThis.window={location:{pathname:'/'}}
  const dom=new JSDOM(renderToStaticMarkup(React.createElement(App,{initialLanguage:language})))
  const doc=dom.window.document,style=doc.createElement('style');style.textContent=active(parser.window.document.styleSheets[0].cssRules,width);doc.head.append(style)
  const computed=element=>dom.window.getComputedStyle(element)
  assert.equal(doc.querySelectorAll('.top-news .news-card').length,4)
  const expectedColumns=width<=620?'minmax(0,1fr)':width<=1120?'repeat(2,minmax(0,1fr))':'repeat(4,minmax(0,1fr))'
  assert.equal(computed(doc.querySelector('.top-news .news-list')).gridTemplateColumns.replaceAll(' ',''),expectedColumns.replaceAll(' ',''))
  for(const card of doc.querySelectorAll('.top-news .news-card')){
   const link=card.querySelector('.news-image-link'),img=link.querySelector('img')
   assert.equal(computed(link).display,'block');assert.equal(computed(link).minHeight,width<=620?'120px':'150px')
   assert.equal(computed(link).marginTop,'0px');assert.equal(computed(img).height,'100%');assert.equal(computed(img).objectFit,'cover')
   assert.equal(card.querySelectorAll('p,small').length,0,'Discovery cards must not duplicate the article narrative')
   assert.ok(card.querySelector('.geographic-label').textContent.trim());assert.equal(computed(card.querySelector('h3')).wordBreak,'normal');assert.equal(computed(card.querySelector('h3')).overflow,'visible');
   assert.ok(card.querySelector('h3').textContent.trim());assert.equal(computed(card.querySelector('h3')).overflowWrap,'normal')
   assert.equal(computed(card).minWidth,'0')
   assert.equal(computed(card).display,width<=620?'grid':'flex')
   if(width<=620)assert.equal(computed(card).gridTemplateColumns,'96px minmax(0,1fr)')
   assert.equal(fs.existsSync(`public${img.getAttribute('src')}`),true)
  }
  assert.equal(doc.querySelectorAll('.signal-panel .pulse-flow').length,3)
  assert.equal(doc.querySelectorAll('.signal-panel .pulse-flow dd').length,15)
  const amounts=doc.querySelector('.signal-panel').textContent
  for(const view of Object.values(trade.views)){
   assert.ok(amounts.includes(new Intl.NumberFormat('en-GB',{maximumFractionDigits:2}).format(view.latest.volume_tonnes)))
  }
  if(width<=768){
   assert.equal(computed(doc.querySelector('.header-actions')).display,'flex')
   assert.equal(computed(doc.querySelector('.language-select')).display,'block')
   assert.equal(computed(doc.querySelector('.language-select')).minHeight,'40px')
   assert.equal(doc.querySelectorAll('.language-select option').length,5)
   assert.equal(computed(doc.querySelector('.signal-panel .pulse-flow dl')).gridTemplateColumns,'repeat(3,minmax(0,1fr))')
   assert.equal(computed(doc.querySelector('.signal-panel')).minHeight,'0')
   assert.equal(computed(doc.querySelector('.signal-panel .trade-pulse-card')).padding,'10px')
   assert.equal(computed(doc.querySelector('.trade-pulse-card h2')).marginTop,'0px')
   assert.equal(computed(doc.querySelector('.pulse-flow dd')).overflowWrap,'anywhere')
  }
  dom.window.close()
 }
 // Article presentation and complete reference areas are unaffected by discovery changes.
 for(const item of news.items){
  globalThis.window={location:{pathname:`/news/${item.slug}`}}
  const dom=new JSDOM(renderToStaticMarkup(React.createElement(App)))
  assert.ok(dom.window.document.querySelector('.why-panel p').textContent.trim())
  assert.ok(dom.window.document.querySelector('.news-references'))
  dom.window.close()
 }
 parser.window.close()
 console.log('Responsive CSS/DOM PASS: 360/390/430/768/1024/1440 × EN/DE/FR/ES/IT; 4 visible bounded visuals; discovery-only cards; mobile language selector; all 15 Trade Pulse metrics; unchanged article hierarchy. Browser geometry not measured.')
}finally{await vite.close()}
