import {createHash} from 'node:crypto'
import fs from 'node:fs'
const canonical=value=>Array.isArray(value)?value.map(canonical):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(key=>[key,canonical(value[key])])):value
export const digest=value=>createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex')
export function validateNewsImage(item,v,legacy={},read=path=>fs.readFileSync(path)){
 const errors=[],require=(ok,message)=>{if(!ok)errors.push(message)}
 if(legacy[item.slug]){
  require(digest(item)===legacy[item.slug].article_sha256,'Legacy article changed: image review required')
  require(digest(v)===legacy[item.slug].visual_sha256,'Legacy visual changed: image review required')
  return errors
 }
 require(!!v,'Missing photograph');if(!v)return errors
 require(v.image_policy_version===1&&v.kind==='EDITORIAL_PHOTOGRAPH','Real photograph required')
 require(v.classification==='PUBLIC_SAFE'&&v.article_mapping===item.slug,'PUBLIC_SAFE mapping required')
 require(v.ai_generated===false&&v.documentary_evidence===false,'Documentary/AI representation must be explicit')
 require(v.commercial_use_verified===true&&v.redistribution_verified===true&&v.relevance_verified===true,'Unverified licence or relevance')
 require(v.width>=960&&v.width<=1600&&v.height*16===v.width*9,'Optimized 16:9 dimensions required')
 require(/^\/editorial\/[a-z0-9-]+\.webp$/.test(v.src||''),'Local WebP required')
 const licenses={'CC BY-SA 2.0':'https://creativecommons.org/licenses/by-sa/2.0/','CC BY-SA 3.0':'https://creativecommons.org/licenses/by-sa/3.0/','CC BY-SA 4.0':'https://creativecommons.org/licenses/by-sa/4.0/','CC BY 4.0':'https://creativecommons.org/licenses/by/4.0/','Public domain (author dedication)':v.original_source_url+'#file'}
 require(Object.hasOwn(licenses,v.licence)&&v.licence_url===licenses[v.licence],'Licence not approved; independent rights review required')
 require(v.derivative_licence===v.licence,'Derivative licence mismatch')
 require(typeof v.attribution_required==='boolean'&&(!v.licence?.startsWith('CC ')||v.attribution_required),'Attribution requirements missing')
 for(const key of ['title','creator','source_platform','original_source_url','original_file_url','reuse_basis','changes','relevance_note'])require(typeof v[key]==='string'&&v[key].trim().length>0,`Missing ${key}`)
 for(const key of ['original_source_url','original_file_url','licence_url'])require(/^https:\/\//.test(v[key]||''),`Unsafe ${key}`)
 for(const key of ['retrieval_date','license_verified_at'])require(/^\d{4}-\d{2}-\d{2}$/.test(v[key]||'')&&!isNaN(Date.parse(v[key])),`Missing verification date: ${key}`)
 for(const key of ['original_sha256','asset_sha256','license_evidence_sha256'])require(/^[a-f0-9]{64}$/.test(v[key]||''),`Missing evidence digest: ${key}`)
 for(const lang of ['en','de','fr','es','it'])for(const key of ['alt','caption','changes','fallback'])require(typeof v.localizations?.[lang]?.[key]==='string'&&v.localizations[lang][key].trim().length>0,`Missing ${lang} ${key}`)
 require(/^assets\/licensed-news-originals\/[a-z0-9-]+\.jpg$/.test(v.original_local_path||''),'Unsafe original path')
 try{if(!/^assets\/licensed-news-originals\/[a-z0-9-]+\.jpg$/.test(v.original_local_path||''))throw Error();require(createHash('sha256').update(read(v.original_local_path)).digest('hex')===v.original_sha256,'Original SHA256 mismatch')}catch{require(false,'Original unavailable')}
 if(/^\/editorial\/[a-z0-9-]+\.webp$/.test(v.src||''))try{
  const b=read(`public${v.src}`);require(b.length<600000&&b.toString('ascii',0,4)==='RIFF'&&b.toString('ascii',8,12)==='WEBP','Invalid/oversized WebP')
  require(createHash('sha256').update(b).digest('hex')===v.asset_sha256,'Asset SHA256 mismatch')
 }catch{require(false,'Asset unavailable')}
 return errors
}
