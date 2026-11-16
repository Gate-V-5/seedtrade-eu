import fs from 'node:fs'
import path from 'node:path'
import {createHash} from 'node:crypto'
import {fileURLToPath} from 'node:url'
import {validateDailyNews,fingerprint} from './validate_daily_news.mjs'
import {validateNewsImage} from './news_image_policy.mjs'
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..')
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'))
const stable=v=>Array.isArray(v)?v.map(stable):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,stable(v[k])])):v
export const packageHash=p=>createHash('sha256').update(JSON.stringify(stable(p))).digest('hex')
// Pure projection for structural inspection. This is never an approval record.
// Only the guarded CLI/prepare-publication path may persist this projection.
export function publicationProjection(packet){
 const out=structuredClone(packet),item=out.article
 item.review_status='APPROVED';item.publication_eligible=true;item.publication_status='PUBLIC_SAFE';item.classification='PUBLIC_SAFE';item.fingerprint=fingerprint(item)
 return out
}
export function validateDraftPackage(packet,options={}){
 if(packet?.article?.review_status!=='PENDING_OWNER_APPROVAL'||packet.article.publication_eligible!==false||packet.article.publication_status!=='DRAFT')return ['Explicit unpublished draft state required']
 return contentErrors(packet,options)
}
export function validatePackage(packet,approval,authorization,{imageValidator=validateNewsImage}={}){
 const errors=contentErrors(packet,{imageValidator}),hash=packageHash(packet)
 if(approval?.status!=='APPROVED'||approval.package_sha256!==hash||!approval.approved_by_private_role||!approval.evidence_reference||!/^\d{4}-\d{2}-\d{2}T/.test(approval.approved_at||'')||approval.claims_reviewed!==true||approval.image_rights_reviewed!==true||JSON.stringify([...(approval.languages_reviewed||[])].sort())!==JSON.stringify(['de','en','es','fr','it']))errors.push('Real content-bound editorial/language/image approval required')
 if(authorization?.action!=='AUTHORIZE_PUBLICATION'||authorization.package_sha256!==hash||!authorization.evidence_reference)errors.push('Separate exact publication authorization required')
 return errors
}
function contentErrors(packet,{imageValidator=validateNewsImage}={}){
 const errors=[],item=packet.article,visual=packet.visual,hash=packageHash(packet)
 if(!item||!visual)return ['Article and real photograph required']
 if(!['OFFICIAL_UPDATE','RESEARCH_BRIEFING','PRELIMINARY_RESEARCH','COMPANY_ANNOUNCEMENT','EDITORIAL_ANALYSIS'].includes(item.editorial_type))errors.push('Reviewed editorial type required')
 if(Object.keys(packet).some(k=>!['article','visual','references'].includes(k)))errors.push('Unexpected publication package field')
 if(!['APPROVED','PENDING_OWNER_APPROVAL'].includes(item.review_status))errors.push('Invalid review state')
 if(item.review_status==='PENDING_OWNER_APPROVAL'&&(item.publication_eligible!==false||item.publication_status!=='DRAFT'))errors.push('Pending content must remain ineligible and unpublished')
 for(const lang of ['de','fr','es','it']){
  const l=item.localizations?.[lang]
  if(!l||!(item.format==='SHORT_NEWS_BRIEF'?['headline','summary']:['headline','summary','why_it_matters']).every(k=>typeof l[k]==='string'&&l[k].trim())||item.content?.some((s,i)=>l.content?.[i]?.id!==s.id||(item.format!=='SHORT_NEWS_BRIEF'&&!l.content[i].heading?.trim())||!l.content[i].body?.trim()))errors.push('Complete reviewed language required: '+lang)
 }
 if(item.fingerprint!==fingerprint(item))errors.push('Canonical article fingerprint mismatch')
 const news=read(path.join(root,'src/generated/news.json')),registry=read(path.join(root,'src/data/news_sources.json'))
 if(news.items.some(x=>x.slug===item.slug))errors.push('Existing immutable article replacement requires separate revision review')
 const existingVisuals=read(path.join(root,'src/data/news_visuals.json'))
 if(visual.src&&Object.values(existingVisuals).some(v=>v.src===visual.src))errors.push('Distinct article photograph derivative required by existing build gate')
 errors.push(...validateDailyNews({...news,as_of:new Date().toISOString().slice(0,10),items:[...news.items,publicationProjection(packet).article]},registry))
 const safeRead=p=>{const resolved=path.resolve(root,p);if(!resolved.startsWith(root+path.sep))throw Error('IMAGE_PATH_OUTSIDE_CHECKOUT');return fs.readFileSync(resolved)}
 try{errors.push(...imageValidator(item,visual,{},safeRead))}catch{errors.push('Photograph assets unavailable')}
 for(const source of item.sources||[]){const ref=packet.references?.[source.url];if(!ref?.title||!ref.verified_at)errors.push('Reviewed human-readable reference required')}
 return errors
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 try{
  const args=process.argv.slice(2),draft=args[0]==='--draft',inputs=(draft?args.slice(1):args).map(read),[packet,review,auth]=inputs
  const errors=draft?validateDraftPackage(packet):validatePackage(packet,review,auth)
  if(errors.length)throw Error(errors.join('; '))
  console.log(JSON.stringify({status:draft?'CONTENT_READY_PENDING_OWNER_APPROVAL':'PASS_APPROVED_PACKAGE',packageSha256:packageHash(packet),...(draft?{}:{approvedPackage:publicationProjection(packet)}),publication:'NOT_EXECUTED'}))
 }
 catch(error){console.error(error.message);process.exitCode=1}
}
