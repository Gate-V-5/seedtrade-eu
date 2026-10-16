import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import {execFileSync} from 'node:child_process'
import React,{act} from 'react'
import {renderToStaticMarkup} from 'react-dom/server'
import {createRoot} from 'react-dom/client'
import {JSDOM} from 'jsdom'
import {createServer} from 'vite'
import {carouselCanAdvance} from '../src/presentationAccessibility.mjs'
const checks=[]
const check=(name,fn)=>{fn();checks.push(name)}
const base={total:6,manualPaused:false,hovered:false,focused:false,reduced:false}
check('motion predicate: manual pause survives hover/focus exit',()=>{
 assert.equal(carouselCanAdvance(base),true)
 for(const key of ['manualPaused','hovered','focused','reduced'])assert.equal(carouselCanAdvance({...base,[key]:true}),false)
 assert.equal(carouselCanAdvance({...base,total:1}),false)
 assert.equal(carouselCanAdvance({...base,manualPaused:true,hovered:false,focused:false}),false)
})
const css=fs.readFileSync('src/styles.css','utf8')
const luminance=hex=>{const a=hex.match(/[a-f\d]{2}/gi).map(x=>parseInt(x,16)/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4);return a[0]*.2126+a[1]*.7152+a[2]*.0722}
const contrast=(a,b)=>{const [x,y]=[luminance(a),luminance(b)].sort((a,b)=>b-a);return(x+.05)/(y+.05)}
check('measured text contrast on actual light backgrounds',()=>{
 assert.ok(contrast('146B49','FFFFFF')>=4.5);assert.ok(contrast('146B49','EEF2F4')>=4.5)
 assert.ok(css.includes('.news-card-body>a{margin-top:auto;padding-top:8px;font-size:14px;font-weight:750;color:#146B49}'))
 assert.ok(css.includes('.news-card .category,.news-card time{font-size:12px}'))
 assert.ok(css.includes(':focus-visible{outline:3px solid #146B49'))
 assert.ok(css.includes('html{scroll-behavior:auto}'))
})
const vite=await createServer({appType:'custom',server:{middlewareMode:true},logLevel:'error'})
try{
 const {default:App}=await vite.ssrLoadModule('/src/AppV2.jsx')
 for(const language of ['EN','DE','FR','ES','IT'])for(const route of ['/','/about','/news','/market']){
  globalThis.window={location:{pathname:route,search:''}}
  const d=new JSDOM(renderToStaticMarkup(React.createElement(App,{initialLanguage:language})))
  check(`${language} ${route}: skip link, one focus target, translated controls`,()=>{
   const doc=d.window.document;assert.equal(doc.querySelectorAll('#main-content').length,1)
   assert.equal(doc.querySelector('#main-content').getAttribute('tabindex'),'-1')
   assert.equal(doc.querySelector('a.skip-link').getAttribute('href'),'#main-content')
   if(language!=='EN')assert.notEqual(doc.querySelector('a.skip-link').textContent,'Skip to main content')
   if(route==='/'){const controls=[...doc.querySelectorAll('.carousel-pause')];assert.equal(controls.length,2);for(const button of controls){assert.equal(button.getAttribute('aria-pressed'),'false');if(language!=='EN')assert.notEqual(button.textContent,'Pause rotation')}}
  });d.window.close()
 }
 const dom=new JSDOM('<div id="test-root"></div>',{url:'https://seedtrade.eu/',pretendToBeVisual:true})
 globalThis.window=dom.window;globalThis.document=dom.window.document;globalThis.IS_REACT_ACT_ENVIRONMENT=true
 dom.window.HTMLElement.prototype.scrollIntoView=()=>{}
 dom.window.matchMedia=()=>({matches:false,addEventListener(){},removeEventListener(){}})
 const root=createRoot(document.getElementById('test-root'))
 await act(async()=>root.render(React.createElement(App)))
 const button=document.querySelector('.carousel-pause')
 await act(async()=>button.dispatchEvent(new dom.window.MouseEvent('click',{bubbles:true})))
 check('real component pause toggle is persistent and accessible',()=>assert.equal(button.getAttribute('aria-pressed'),'true'))
 await act(async()=>{button.dispatchEvent(new dom.window.FocusEvent('focusout',{bubbles:true,relatedTarget:document.body}));button.closest('section').dispatchEvent(new dom.window.MouseEvent('mouseout',{bubbles:true,relatedTarget:document.body}))})
 check('pointer/focus exit does not reset manual pause',()=>assert.equal(button.getAttribute('aria-pressed'),'true'))
 await act(async()=>document.querySelector('.skip-link').dispatchEvent(new dom.window.MouseEvent('click',{bubbles:true})))
 check('skip activation transfers keyboard focus',()=>assert.equal(document.activeElement.id,'main-content'))
 // Exercise the actual hook with controlled timers: no network or real clock waits.
 await act(async()=>root.unmount())
 const timers=new Map();let timerId=0;const media=[]
 dom.window.setInterval=fn=>{timers.set(++timerId,fn);return timerId}
 dom.window.clearInterval=id=>timers.delete(id)
 dom.window.matchMedia=query=>{const m={media:query,matches:query.includes('reduced-motion'),listeners:[],addEventListener(type,fn){this.listeners.push(fn)},removeEventListener(type,fn){this.listeners=this.listeners.filter(x=>x!==fn)}};media.push(m);return m}
 const motionRoot=createRoot(document.getElementById('test-root'))
 await act(async()=>motionRoot.render(React.createElement(App)))
 check('reduced-motion preference prevents both auto-advance timers',()=>assert.equal(timers.size,0))
 await act(async()=>{for(const m of media.filter(m=>m.media.includes('reduced-motion'))){m.matches=false;for(const fn of m.listeners)fn()}})
 check('normal motion creates two independent rotation timers',()=>assert.equal(timers.size,2))
 const pauses=[...document.querySelectorAll('.carousel-pause')]
 await act(async()=>{for(const b of pauses)b.dispatchEvent(new dom.window.MouseEvent('click',{bubbles:true}))})
 check('manual pause cancels both actual rotation timers',()=>assert.equal(timers.size,0))
 const train=document.querySelector('.market-snapshot .snapshot-card-train'),before=train.innerHTML
 await act(async()=>document.querySelector('.market-snapshot button[aria-label="Next market category"]').dispatchEvent(new dom.window.MouseEvent('click',{bubbles:true})))
 check('manual navigation remains available while paused',()=>{assert.notEqual(train.innerHTML,before);assert.equal(timers.size,0)})
 await act(async()=>{for(const b of pauses){b.dispatchEvent(new dom.window.FocusEvent('focusout',{bubbles:true,relatedTarget:document.body}));b.closest('section').dispatchEvent(new dom.window.MouseEvent('mouseout',{bubbles:true,relatedTarget:document.body}))}})
 check('interaction exits cannot silently resume paused timers',()=>assert.equal(timers.size,0))
 await act(async()=>{for(const b of pauses)b.dispatchEvent(new dom.window.MouseEvent('click',{bubbles:true}))})
 check('explicit resume restores both timers',()=>assert.equal(timers.size,2))
 await act(async()=>{for(const m of media.filter(m=>m.media.includes('reduced-motion'))){m.matches=true;for(const fn of m.listeners)fn()}})
 check('live preference change stops rotation without removing controls',()=>{assert.equal(timers.size,0);assert.equal(document.querySelectorAll('.carousel-pause').length,2)})
 await act(async()=>motionRoot.unmount());dom.window.close();delete globalThis.IS_REACT_ACT_ENVIRONMENT
}finally{await vite.close()}
console.log(JSON.stringify({status:'PASS',passed:checks.length,failed:0,checks,contrast:{read_more:contrast('146B49','FFFFFF'),eyebrow:contrast('146B49','EEF2F4')},visual_qa:'NOT_MEASURED_BY_DOM_TESTS'},null,2))
