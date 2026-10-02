// Computes CSS grid placement and approved desktop style parity; does not claim pixels.
import fs from 'node:fs'
import assert from 'node:assert/strict'
import {execFileSync} from 'node:child_process'
import React from 'react'
import {renderToStaticMarkup} from 'react-dom/server'
import {JSDOM} from 'jsdom'
import {createServer} from 'vite'
const base='3fd521723e3e7ccbecf0dad579c42c86a8e595d1'
const priorCss=execFileSync('git',['show',`${base}:src/styles.css`],{encoding:'utf8'})
const priorApp=execFileSync('git',['show',`${base}:src/AppV2.jsx`],{encoding:'utf8'})
const path='src/__mobile_news_baseline.jsx'
fs.writeFileSync(path,priorApp)
const media=(rules,width)=>[...rules].flatMap(rule=>{
 if(rule.media){const q=rule.conditionText;const min=[...q.matchAll(/min-width\s*:\s*(\d+)px/g)].map(m=>+m[1]);const max=[...q.matchAll(/max-width\s*:\s*(\d+)px/g)].map(m=>+m[1]);return min.every(n=>width>=n)&&max.every(n=>width<=n)&&!q.includes('print')?media(rule.cssRules,width):[]}
 return rule.cssRules?media(rule.cssRules,width):rule.cssText
}).join('\n')
const active=(css,width)=>{const dom=new JSDOM('<style></style>');dom.window.document.querySelector('style').textContent=css;const out=media(dom.window.document.styleSheets[0].cssRules,width);dom.window.close();return out}
const css=fs.readFileSync('src/styles.css','utf8')
const vite=await createServer({appType:'custom',server:{middlewareMode:true},logLevel:'error'})
const render=(App,language,css,width)=>{globalThis.window={location:{pathname:'/'}};const dom=new JSDOM(renderToStaticMarkup(React.createElement(App,{initialLanguage:language})));const style=dom.window.document.createElement('style');style.textContent=active(css,width);dom.window.document.head.append(style);return dom}
const visibleText=(node,win)=>node.nodeType===3?node.textContent:node.nodeType===1&&win.getComputedStyle(node).display==='none'?'':[...node.childNodes].map(n=>visibleText(n,win)).join('')
try{
 const {default:App}=await vite.ssrLoadModule('/src/AppV2.jsx')
 const {default:Baseline}=await vite.ssrLoadModule('/src/__mobile_news_baseline.jsx')
 for(const width of [360,390,430,768,1024,1440])for(const language of ['EN','DE','FR','ES','IT']){
  const before=render(Baseline,language,priorCss,width),after=render(App,language,css,width)
  const cards=after.window.document.querySelectorAll('.top-news .news-card')
  for(const [index,card] of [...cards].entries()){
   const old=before.window.document.querySelectorAll('.top-news .news-card')[index]
   const get=e=>after.window.getComputedStyle(e),oldGet=e=>before.window.getComputedStyle(e)
   const image=card.querySelector('.news-image-link'),body=card.querySelector('.news-card-body')
   assert.equal(card.querySelector('h3').textContent,old.querySelector('h3').textContent,'Full localized headline retained')
   assert.equal(card.querySelector('img').getAttribute('src'),old.querySelector('img').getAttribute('src'),'Approved photo retained')
   if(width<=430){
    assert.equal(oldGet(old.querySelector('.news-card-body')).gridColumn,'1','Reproduce the original placement defect')
    assert.equal(get(image).gridColumn,'1');assert.equal(get(body).gridColumn,'2');assert.equal(get(image).gridRow,get(body).gridRow);assert.equal(get(body).gridRow,'1')
    assert.equal(get(card).gap,'0');assert.equal(get(card).padding,'0px');assert.equal(get(card).minHeight,'0');assert.equal(get(image).minHeight,'0')
    assert.equal(get(body).width,'auto');assert.equal(get(body).maxWidth,'none');assert.equal(get(body).alignItems,'stretch')
    assert.equal(get(card.querySelector('h3')).overflowWrap,'normal');assert.equal(get(card.querySelector('h3')).whiteSpace,'normal')
    assert.equal(card.querySelectorAll('p,small').length,0)
    assert.equal(visibleText(card.querySelector('.geographic-label'),after.window),['EUROPE','LATVIA','NETHERLANDS','SPAIN'][index])
   }else{
    for(const selector of [null,'.news-image-link','img','.news-card-body','h3','.category','time','.geographic-label']){
     const a=selector?card.querySelector(selector):card,b=selector?old.querySelector(selector):old
     for(const property of ['display','width','height','min-height','padding','margin','gap','font-size','line-height','grid-template-columns','grid-column','grid-row','object-fit','aspect-ratio','border-radius','align-items'])assert.equal(get(a).getPropertyValue(property),oldGet(b).getPropertyValue(property),`${width} ${selector} ${property} unchanged`)
    }
    assert.equal(visibleText(card,after.window),visibleText(old,before.window),'Approved desktop visible content unchanged')
   }
  }
  before.window.close();after.window.close()
 }
 console.log('Mobile placement PASS: original column-1 defect reproduced; image column 1 and info column 2 share row 1 at 360/390/430 × five languages; full headlines/photos retained. Desktop computed style and visible content parity at 768/1024/1440 PASS. Browser geometry unverified.')
}finally{await vite.close();fs.unlinkSync(path)}
