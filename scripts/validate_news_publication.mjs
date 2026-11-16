// Public build receipt contains approved-content digests only. Private review
// identities, candidate queues and authorization inputs are never distributed.
import fs from 'node:fs'
import {packageHash} from './validate_news_package.mjs'
import {seedSectorConnectionErrors} from '../src/news.mjs'
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'))
const news=read('src/generated/news.json'),legacy=read('src/data/news_approved_legacy.json'),receipts=read('src/data/news_publication_receipts.json'),visuals=read('src/data/news_visuals.json'),presentation=read('src/data/news_presentation.json')
for(const item of news.items){
 const policyErrors=seedSectorConnectionErrors(item);if(policyErrors.length)throw Error(policyErrors.join('; '))
 if(legacy[item.slug]){if(packageHash(item)!==legacy[item.slug])throw Error('Historical narrative/localizations changed without revision approval: '+item.slug);continue}
 const receipt=receipts[item.slug],references=Object.fromEntries((item.sources||[]).map(s=>[s.url,presentation.sources[s.url]])),packet={article:item,visual:visuals[item.slug],references}
 if(!receipt||receipt.status!=='APPROVED_AFTER_PRIVATE_VALIDATION'||!receipt.editorial_evidence_reference||!receipt.publication_authorization_reference||receipt.package_sha256!==packageHash(packet))throw Error('Unapproved or modified publication package: '+item.slug)
 for(const language of ['de','fr','es','it']){
  const l=item.localizations?.[language]
  if(!l||!(item.format==='SHORT_NEWS_BRIEF'?['headline','summary']:['headline','summary','why_it_matters']).every(k=>typeof l[k]==='string'&&l[k].trim())||(item.content||[]).some((s,i)=>l.content?.[i]?.id!==s.id||(item.format!=='SHORT_NEWS_BRIEF'&&!l.content[i].heading?.trim())||!l.content[i].body?.trim()))throw Error('Incomplete reviewed language package')
 }
}
console.log('News publication boundary PASS: immutable history; content-bound approved packages only')
