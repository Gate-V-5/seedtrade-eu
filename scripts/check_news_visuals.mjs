import assert from 'node:assert/strict'
import fs from 'node:fs'
import React from 'react'
import {renderToStaticMarkup} from 'react-dom/server'
import {JSDOM} from 'jsdom'
import {createServer} from 'vite'
import {selectStreamHighlights} from '../src/news.mjs'
import registry from '../src/data/news_sources.json' with {type:'json'}
import {messages} from '../src/i18n/messages.js'
import {localizedContentText} from '../src/i18n/content.mjs'
const news=JSON.parse(fs.readFileSync('src/generated/news.json'))
const visuals=JSON.parse(fs.readFileSync('src/data/news_visuals.json'))
const css=fs.readFileSync('src/styles.css','utf8')
const vite=await createServer({appType:'custom',server:{middlewareMode:true},logLevel:'error'})
try {
 const {default:App}=await vite.ssrLoadModule('/src/AppV2.jsx')
 const render=(path,code)=>{globalThis.window={location:{pathname:path}};return new JSDOM(renderToStaticMarkup(React.createElement(App,{initialLanguage:code})))}
 for(const code of ['EN','DE','FR','ES','IT']){
  const home=render('/',code),archive=render('/news',code)
  assert.equal(home.window.document.querySelectorAll('.top-news .news-editorial-image').length,4)
  const fixed=JSON.parse(fs.readFileSync('src/data/fixed_editorial_visuals.json'))
  for(const key of ['market','weather','production'])assert.equal(home.window.document.querySelector(`.fixed-evidence-image[src="${fixed[key].src}"]`).getAttribute('data-fixed-editorial'),'true')
  for(const key of Object.keys(fixed).filter(key=>!['market','weather','production'].includes(key)))assert.ok(home.window.document.querySelector(`.visual-insights img[src="${fixed[key].src}"]`))
  assert.deepEqual([...home.window.document.querySelectorAll('.visual-insights .geographic-label')].map(el=>el.textContent),['VALENCIA / SPAIN','BELGIUM','LITHUANIA'])
  assert.deepEqual([...home.window.document.querySelectorAll('.top-news .geographic-label')].map(el=>el.getAttribute('data-geography')),['EU','EU','NETHERLANDS','SPAIN'])
  for(const img of home.window.document.querySelectorAll('.top-news img,.intelligence-commercial img,.visual-insights img')){assert.ok(img.getAttribute('src').startsWith('/') && !img.getAttribute('src').startsWith('//'));assert.ok(img.getAttribute('alt'));assert.ok(img.getAttribute('width') && img.getAttribute('height'))}

  assert.equal(archive.window.document.querySelectorAll('.news-editorial-image').length,news.items.length)
  for(const item of news.items){
   const visual=visuals[item.slug];assert.equal(visual.classification,'PUBLIC_SAFE');assert.equal(visual.documentary_evidence,false)
   assert.ok(fs.existsSync(`public${visual.src}`))
   if(visual.kind==='EDITORIAL_PHOTOGRAPH'){assert.ok(visual.original_source_url && visual.creator && visual.licence_url && visual.retrieval_date);assert.equal(visual.article_mapping,item.slug);assert.ok(visual.src.endsWith('.webp'))}else{const svg=fs.readFileSync(`public${visual.src}`,'utf8');assert.ok(!/<text|<script|<image|https?:\/\//.test(svg.replace('http://www.w3.org/2000/svg','')))}
   const page=render(`/news/${item.slug}`,code),doc=page.window.document
   const style=doc.createElement('style');style.textContent=css;doc.head.append(style)
   const computed=element=>page.window.getComputedStyle(element)
   assert.equal(computed(doc.querySelector('.why-panel')).paddingTop,'14px')
   assert.equal(computed(doc.querySelector('.news-references')).fontSize,'13px')
   if(item.content?.length){assert.equal(computed(doc.querySelector('.news-section')).marginTop,'24px');assert.equal(computed(doc.querySelector('.news-section')).paddingTop,'20px');assert.equal(doc.querySelectorAll('.evidence-labels').length,0)}
   const img=doc.querySelector('.news-hero img');assert.equal(computed(img).width,'100%');assert.equal(computed(img).height,'auto');assert.equal(img.getAttribute('src'),visual.src)
   assert.ok(img.getAttribute('alt').includes(localizedContentText(item,code,'headline')))
   assert.ok(doc.querySelector('h1').compareDocumentPosition(img)&4)
   assert.ok(img.compareDocumentPosition(doc.querySelector('.lead'))&4)
   assert.ok(doc.querySelector('.why-panel'))
   assert.ok(!doc.querySelector('.news-article .editorial-visual'))
   for(const source of item.sources||[{url:item.source_url}])assert.ok(doc.querySelector(`.news-references a[href="${source.url}"]`))
   assert.equal(doc.querySelectorAll('.news-section').length,(item.content||[]).length);assert.equal(doc.querySelectorAll('.evidence-labels').length,0)
   const card=archive.window.document.querySelector(`a[href="/news/${item.slug}"] img`);assert.equal(card.getAttribute('src'),img.getAttribute('src'))
   if(selectStreamHighlights(news.items,news.as_of,registry).some(slot=>slot.item.slug===item.slug))assert.equal(home.window.document.querySelector(`a[href="/news/${item.slug}"] img`).getAttribute('src'),visual.src)
   page.window.close()
  }
  home.window.close();archive.window.close()
 }
 assert.ok(css.includes('@media(max-width:620px)'));assert.ok(css.includes('aspect-ratio:16/9'))
 assert.equal(new Set(Object.values(visuals).map(v=>v.src)).size,news.items.length)
 console.log('News visuals PASS: 10 archive/detail and 4 homepage canonical editorial visuals, all five languages, ordered hero, sources, PUBLIC_SAFE and licensed photographs and archived SVGs')
}finally{await vite.close()}
