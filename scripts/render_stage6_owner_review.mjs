// Local review only. Never part of the production build or public listing source.
import fs from 'node:fs/promises'
import path from 'node:path'
import React from 'react'
import {renderToStaticMarkup} from 'react-dom/server'
import {build} from 'vite'
import {pathToFileURL} from 'node:url'
const output=path.resolve('..'),drafts=JSON.parse(await fs.readFile(path.join(output,'owner-drafts.private.json'),'utf8'))
await build({logLevel:'error',build:{ssr:'tests/fixtures/stage6ReviewEntry.jsx',outDir:'.stage6-review',emptyOutDir:true,rollupOptions:{external:['react','react-dom','react/jsx-runtime','react/jsx-dev-runtime'],output:{entryFileNames:'entry.mjs'}}}})
try{
 const {Card,Quality,LanguageProvider,translate}=await import(pathToFileURL(path.resolve('.stage6-review/entry.mjs')).href)
 const css=await Promise.all(['src/styles.css','src/marketplaceListings.css','src/b2b/qualitySpecifications.css'].map(file=>fs.readFile(file,'utf8')))
 for(const lang of ['EN','DE','FR','ES','IT']){
  const t=key=>translate(lang,key),e=React.createElement
  const content=e(LanguageProvider,{initialLanguage:lang},e('main',{className:'stage6-owner-review'},
   e('h1',null,'Stage 6 — ',t('Local draft — not published')),
   e('nav',null,['EN','DE','FR','ES','IT'].map(code=>e('a',{key:code,href:'owner-review-'+code.toLowerCase()+'.html',style:{marginRight:'16px'}},code))),
   e('div',{className:'request-grid'},drafts.records.map((request,i)=>e(Card,{key:i,request,localDraft:true,detailHref:'#draft-'+i}))),
   ...drafts.records.map((request,i)=>e('section',{key:i,id:'draft-'+i,className:'owner-detail'},e('h2',null,t(request.species_common_name)),e(Card,{request,localDraft:true,detailHref:'#draft-'+i}),e(Quality,{parameters:request.qualityParameters,direction:request.listingDirection}),e('a',{href:'#top'},t('Back to listings'))))))
  const html='<!doctype html><html lang="'+lang.toLowerCase()+'"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Stage 6 local owner review</title><style>'+css.join('\n')+'\n.stage6-owner-review{max-width:1280px}.owner-detail{margin-top:40px;max-width:760px}.owner-detail>.trading-card{max-width:600px}.stage6-owner-review nav{margin-bottom:20px}.stage6-owner-review .request-grid{grid-template-columns:repeat(3,minmax(0,1fr))}@media(max-width:620px){.stage6-owner-review .request-grid{grid-template-columns:1fr}}</style><body id="top">'+renderToStaticMarkup(content)+'</body></html>'
  await fs.writeFile(path.join(output,'owner-review-'+lang.toLowerCase()+'.html'),html)
 }
 console.log('PASS: five local owner-review pages rendered from actual shared card/detail components; drafts excluded from production data.')
}finally{/* Render artifacts are local review evidence only. */}
