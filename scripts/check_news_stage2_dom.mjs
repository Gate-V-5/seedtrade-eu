import assert from 'node:assert/strict'
import React,{act} from 'react'
import {JSDOM} from 'jsdom'
import {createServer} from 'vite'
const dom=new JSDOM('<html><head><title></title></head><body><div id="root"></div></body></html>',{url:'https://seedtrade.test/news?lang=fr',pretendToBeVisual:true})
globalThis.window=dom.window;globalThis.document=dom.window.document;globalThis.IS_REACT_ACT_ENVIRONMENT=true
window.HTMLElement.prototype.scrollIntoView=()=>{};globalThis.fetch=async()=>{throw Error('Network forbidden in DOM test')}
const {createRoot}=await import('react-dom/client'),vite=await createServer({appType:'custom',server:{middlewareMode:true},logLevel:'error'});let root
try{
 const {default:App}=await vite.ssrLoadModule('/src/AppV2.jsx');root=createRoot(document.getElementById('root'));await act(async()=>root.render(React.createElement(App)))
 assert.equal(document.querySelectorAll('.news-browse button').length,5)
 assert.equal(document.querySelectorAll('#news-archive .news-card').length,6)
 assert(document.querySelector('.news-browse').compareDocumentPosition(document.querySelector('.news-search-filters'))&4)
 await act(async()=>document.querySelector('.news-browse button:last-child').click());assert.equal(document.querySelectorAll('#news-archive .news-card').length,2);assert(locationSafe().includes('stream='))
 const select=document.querySelector('.news-search-filters>label:nth-child(2) select');await act(async()=>{select.value='BE';select.dispatchEvent(new window.Event('change',{bubbles:true}))});assert.equal(document.querySelectorAll('#news-archive .news-card').length,1)
 await act(async()=>document.querySelector('.news-search-filters>button').click());assert.equal(document.querySelectorAll('#news-archive .news-card').length,6);assert(locationSafe().includes('lang=fr'))
 await act(async()=>document.querySelector('.news-pagination button:last-child').click());assert.equal(document.querySelectorAll('#news-archive .news-card').length,4)
 console.log('Daily News DOM PASS: Stage 2 Browse order, combined filters, URL/language, archive and pagination')
}finally{if(root)await act(async()=>root.unmount());await vite.close();dom.window.close()}
function locationSafe(){return window.location.search}
