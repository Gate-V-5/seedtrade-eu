import assert from 'node:assert/strict'
import fs from 'node:fs'
import {execFileSync} from 'node:child_process'
import React,{act} from 'react'
import {renderToStaticMarkup} from 'react-dom/server'
import {createRoot} from 'react-dom/client'
import {JSDOM} from 'jsdom'
import {createServer} from 'vite'
import {localizedContentText} from '../src/i18n/content.mjs'
const baseline='87d60c30ba7187b4c3222906531dc0dc50a57fdc'
const css=fs.readFileSync('src/styles.css','utf8'),oldCss=execFileSync('git',['show',`${baseline}:src/styles.css`],{encoding:'utf8'})
const styleRules=css=>{const d=new JSDOM('<style></style>');d.window.document.querySelector('style').textContent=css;return[d,d.window.document.styleSheets[0].cssRules]}
const nonNews=(rules,context='')=>[...rules].flatMap(r=>r.media?nonNews(r.cssRules,context+r.conditionText):r.cssRules?nonNews(r.cssRules,context+r.name):r.selectorText?r.selectorText.split(/,(?![^()]*\))/).filter(s=>!/\.(?:news[\w-]*|top-news)\b/.test(s)).map(s=>context+s.trim()+r.style.cssText):[context+r.cssText])
const [bd,br]=styleRules(oldCss),[ad,ar]=styleRules(css)
assert.deepEqual(nonNews(ar),nonNews(br),'All unrelated CSS declarations and media conditions preserved');bd.window.close();ad.window.close()
const active=(rules,width)=>[...rules].flatMap(r=>r.media?([...r.conditionText.matchAll(/min-width\s*:\s*(\d+)px/g)].every(m=>width>=+m[1])&&[...r.conditionText.matchAll(/max-width\s*:\s*(\d+)px/g)].every(m=>width<=+m[1])?active(r.cssRules,width):[]):r.cssRules?active(r.cssRules,width):r.cssText).join('\n')
const news=JSON.parse(fs.readFileSync('src/generated/news.json')),visuals=JSON.parse(fs.readFileSync('src/data/news_visuals.json'))
assert.deepEqual(fs.readFileSync('src/generated/news.json'),execFileSync('git',['show',`${baseline}:src/generated/news.json`]))
assert.deepEqual(fs.readFileSync('src/data/news_visuals.json'),execFileSync('git',['show',`${baseline}:src/data/news_visuals.json`]))
const v=await createServer({appType:'custom',server:{middlewareMode:true},logLevel:'error'})
const conflicts=[]
const forbidden=/OFFICIAL_DATA|OFFICIAL_SOURCE|PUBLIC_SOURCE|PUBLIC_SAFE|Checked \d|Market Signal|quantitative engine/
try{
 const {default:App,NewsReferences}=await v.ssrLoadModule('/src/AppV2.jsx')
 for(const width of [360,390,620,768,1024,1440])for(const lang of ['EN','DE','FR','ES','IT'])for(const path of ['/','/news']){
  globalThis.window={location:{pathname:path,search:''}}
  const d=new JSDOM(renderToStaticMarkup(React.createElement(App,{initialLanguage:lang}))),doc=d.window.document,[parser,rules]=styleRules(css),style=doc.createElement('style');style.textContent=active(rules,width);doc.head.append(style)
  const cards=[...doc.querySelectorAll(path==='/'?'.top-news .news-card':'.news-grid .news-card')]
  assert.equal(cards.length,path==='/'?4:10)
  for(const c of cards){const get=e=>d.window.getComputedStyle(e),media=c.querySelector('.news-image-link'),img=c.querySelector('img')
   assert.equal(get(c).display,'flex');assert.equal(get(c).flexDirection,'column');assert.equal(get(media).aspectRatio,'16/9');assert.equal(get(img).objectFit,'cover');assert.equal(get(img).width,'100%');assert.equal(get(img).height,'100%')
   assert.equal(c.querySelectorAll('p,small,.news-photo-credit,.news-photo-attribution,.linked-species').length,0)
   assert.equal(get(c.querySelector('.news-card-body>a')).marginTop,'auto');assert.ok(!forbidden.test(c.textContent));assert.ok(img.alt&&img.width&&img.height)
   assert.equal(c.querySelectorAll('.news-card-body>div').length,1);assert.ok(c.querySelector('time[datetime]'));assert.ok(c.querySelector('h3 a'))
  }
  if(path==='/news')assert.equal(d.window.getComputedStyle(doc.querySelector('.news-grid')).gridTemplateColumns,width<=620?'minmax(0,1fr)':'repeat(2,minmax(0,1fr))')
  d.window.close();parser.window.close()
 }
 for(const lang of ['EN','DE','FR','ES','IT'])for(const item of news.items){
  globalThis.window={location:{pathname:`/news/${item.slug}`,search:''}}
  const d=new JSDOM(renderToStaticMarkup(React.createElement(App,{initialLanguage:lang}))),doc=d.window.document
  assert.equal(doc.querySelector('h1').textContent.replace(/\s*\([^)]*\)/g,''),localizedContentText(item,lang,'headline').replace(/\s*\([^)]*\)/g,''))
  assert.ok(doc.querySelector('.article-meta').textContent.includes(item.publication_date));if(forbidden.test(doc.querySelector('.news-article').textContent))conflicts.push({slug:item.slug,language:lang,field:'existing why_it_matters',reason:'Unchanged article text contains Market Signal'})
  const paragraphs=[...doc.querySelectorAll('.news-section>p')];assert.equal(paragraphs.length,(item.content||[]).length)
  for(const [i,p]of paragraphs.entries())assert.equal(p.textContent.replace(/\s*\([^)]*\)/g,'').replace(/\s+/g,' ').trim(),localizedContentText(item,lang,`content.${i}.body`).replace(/\s*\([^)]*\)/g,'').replace(/\s+/g,' ').trim())
  const ref=doc.querySelector('.news-references');assert.ok(ref);assert.equal(ref.querySelectorAll('li').length,(item.sources||[{}]).length)
  for(const src of item.sources||[{url:item.source_url}])if(src.url)assert.ok(ref.querySelector(`a[href="${src.url}"]`))
  const image=visuals[item.slug];if(image.kind==='EDITORIAL_PHOTOGRAPH'){
   const credit=doc.querySelector('.news-photo-attribution');assert.ok(credit.textContent.includes(image.creator));assert.ok(credit.querySelector(`a[href="${image.original_source_url}"]`));assert.ok(credit.querySelector(`a[href="${image.licence_url}"]`));assert.ok(credit.querySelector('details>summary'));assert.equal(credit.querySelector('details').hasAttribute('open'),false)
   assert.ok(!credit.textContent.includes('Cropped to 16:9'));assert.ok(!credit.textContent.includes('WebP'))
  }
  d.window.close()
 }
 const {default:liveNews}=await v.ssrLoadModule('/src/generated/news.json');const fixture=liveNews.items.at(-1),originalSources=fixture.sources
 for(const source of [{label:'Verified organization',title:'Verified document',url:null},{label:'No invented title',url:null},{label:'Unsafe reference',url:'javascript:alert(1)'},{label:'No credential URL',url:'https://user:secret@example.com/'},{label:'<script>unsafe</script>',title:'<img onerror=alert(1)>',url:null}]){
  fixture.sources=[source];globalThis.window={location:{pathname:`/news/${fixture.slug}`,search:''}};const d=new JSDOM(renderToStaticMarkup(React.createElement(App))),ref=d.window.document.querySelector('.news-references');assert.equal(ref.querySelectorAll('a,script,img,time').length,0);assert.ok(ref.textContent.includes(source.label));d.window.close()
 }
 fixture.sources=originalSources
 // The same media container must remain on image error, with no unrelated/schematic substitution.
 const dom=new JSDOM('<div id="root"></div>',{url:'https://seedtrade.test/news',pretendToBeVisual:true});globalThis.window=dom.window;globalThis.document=dom.window.document;globalThis.IS_REACT_ACT_ENVIRONMENT=true
 dom.window.HTMLElement.prototype.scrollIntoView=()=>{}
 const root=createRoot(document.querySelector('#root'));await act(async()=>root.render(React.createElement(App)))
 const card=document.querySelector('.news-card'),img=card.querySelector('img');await act(async()=>img.dispatchEvent(new window.Event('error')))
 assert.equal(card.querySelectorAll('img,.editorial-visual').length,0);assert.ok(card.querySelector('.news-photo-unavailable'));assert.ok(card.querySelector('h3 a'))
 await act(async()=>root.unmount());dom.window.close()
 console.log('News Experience V3 structural checks PASS:10 articles;4 streams/7 category values;6 widths ×5 languages ×2 discovery routes;50 article variants;16:9 media/attribution/references/clean presentation fields;unrelated CSS,data,image identities preserved;neutral missing-image fallback. Pixel QA separate.')
 assert.deepEqual(conflicts,[],'Unexpected internal provenance in public article presentation')
}finally{await v.close()}
