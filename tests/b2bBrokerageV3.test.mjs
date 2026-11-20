import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {JSDOM} from 'jsdom';
import {transformWithOxc} from 'vite';
import {simpleFullTerms,simpleTerms} from '../shared/simpleBrokerageTerms.mjs';
import {digest,currentLegalRegistry} from '../server/b2b/legalAcceptance.mjs';

test('downloadable V3 is exactly the hash-bound accepted text in all five languages',async()=>{
 const snapshot=JSON.parse(await readFile(new URL('../public/legal/brokerage/v3.json',import.meta.url),'utf8'));
 assert.deepEqual(snapshot.terms,simpleTerms);assert.equal(snapshot.canonicalSha256,digest(simpleTerms));
 const doc=new JSDOM(await readFile(new URL('../public/legal/brokerage/v3.html',import.meta.url),'utf8')).window.document;
 for(const [language,paragraphs] of Object.entries(simpleFullTerms))assert.deepEqual([...doc.querySelectorAll(`#${language.toLowerCase()} h1,#${language.toLowerCase()} h2,#${language.toLowerCase()} p`)].map(n=>n.textContent),paragraphs);
 assert(!/Draft V3|For Owner Review|proposed payment|To be confirmed/.test(doc.body.textContent));
});

test('B2B Terms show the complete separate V3 and retain the original accepted snapshot; Privacy is unchanged',async()=>{
 const source=await readFile(new URL('../src/legal/LegalPage.jsx',import.meta.url),'utf8');
 const transformed=await transformWithOxc(source,'src/legal/LegalPage.jsx',{jsx:{runtime:'classic'}});
 assert.equal(transformed.warnings.length,0);
 const code=transformed.code.replace(/^import .*;\r?\n/gm,'').replace('export default function LegalPage','function LegalPage');
 const registry=JSON.parse(await readFile(new URL('../src/legal/registry.json',import.meta.url),'utf8'));
 for(const language of Object.keys(simpleFullTerms)){
  const Component=new Function('React','registry','simpleFullTerms','simpleTerms','useT','useLanguage',code+'\nreturn LegalPage;')(React,registry,simpleFullTerms,simpleTerms,()=>k=>k,()=>({language}));
  const doc=new JSDOM(renderToStaticMarkup(React.createElement(Component,{kind:'terms'}))).window.document;
  const section=doc.querySelector('#brokerage');assert(section);
  assert.deepEqual([...section.querySelectorAll('h2,h3,p')].slice(0,-1).map(n=>n.textContent),simpleFullTerms[language]);
  assert(doc.querySelector(`a[href="${registry.documents.terms.path}"]`));
  const privacy=new JSDOM(renderToStaticMarkup(React.createElement(Component,{kind:'privacy'}))).window.document;
  assert.equal(privacy.querySelector('#brokerage'),null);
 }
 assert.deepEqual(registry,currentLegalRegistry);
});
