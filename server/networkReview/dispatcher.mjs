// Shared-site middleware only. No listener, login system, secret, SQL or production activation.
const api='/api/network-preview/',admin='/api/network-review/'
export const isNetworkReviewRequest=url=>{try{const p=decodeURIComponent(new URL(url,'http://review.invalid').pathname);return p==='/network'||p==='/network/review'||p.startsWith('/network/')||p.startsWith(api)||p.startsWith(admin)||p.startsWith('/api/network-entry/')}catch{return false}}
const headers={'Cache-Control':'private, no-store','X-Robots-Tag':'noindex, nofollow, noarchive','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','X-Frame-Options':'DENY','Vary':'Cookie, Authorization'}
function reply(res,status,body){if(res.headersSent){res.destroy();return}res.writeHead(status,{...headers,'Content-Type':'application/json; charset=utf-8'});res.end(JSON.stringify(body))}
async function emptyBody(req){if(!/^application\/json(?:\s*;|$)/i.test(req.headers['content-type']||'')||req.headers['content-encoding'])return false;let n=0,chunks=[];for await(const b of req){n+=b.length;if(n>1024)return false;chunks.push(b)}try{const v=JSON.parse(Buffer.concat(chunks).toString('utf8'));return v&&Object.getPrototypeOf(v)===Object.prototype&&Object.keys(v).length===0}catch{return false}}
function memberCredentials(req){const values=(req.headers.cookie||'').split(';').map(s=>s.trim()).filter(s=>s.startsWith('seedtrade_stage_ab_offline='));return {session:values.length===1?values[0].slice('seedtrade_stage_ab_offline='.length):'',csrf:req.headers['x-seedtrade-csrf']}}
export function createExistingTesterAuthorizer(resolveSession,allowedIds){if(typeof resolveSession!=='function'||!Array.isArray(allowedIds)||allowedIds.some(x=>typeof x!=='string'||!x))throw Error('TESTER_AUTHORIZATION_CONFIGURATION');const allow=new Set(allowedIds);return async req=>{const s=await resolveSession(req);return !!(s&&s.authenticated===true&&s.active===true&&Number.isFinite(s.expiresAt)&&s.expiresAt>Date.now()&&allow.has(s.subject))}}
// Protect only private-exclusive chunks; shared current-site assets stay public.
export function networkReviewAssetPaths(manifest,privateEntry='src/networkReview/NetworkSurface.jsx',publicEntry='index.html'){
 if(!manifest?.[privateEntry]||!manifest?.[publicEntry])throw Error('REVIEW_BUILD_MANIFEST_REQUIRED')
 const walk=(entry,skip,seen=new Set(),files=new Set())=>{if(entry===skip||seen.has(entry))return files;seen.add(entry);const m=manifest[entry];if(!m)throw Error('REVIEW_BUILD_MANIFEST_REQUIRED');for(const f of [m.file,...(m.css||[]),...(m.assets||[])]){if(typeof f!=='string'||!f.startsWith('assets/')||f.includes('..')||f.includes('?'))throw Error('REVIEW_ASSET_PATH_REJECTED');files.add('/'+f)}for(const k of [...(m.imports||[]),...(m.dynamicImports||[])])walk(k,skip,seen,files);return files}
 const privateFiles=walk(privateEntry,null),publicFiles=walk(publicEntry,privateEntry)
 const paths=[...privateFiles].filter(f=>!publicFiles.has(f)).sort();if(!paths.length)throw Error('PRIVATE_REVIEW_ASSETS_NOT_IDENTIFIED');return paths
}
// The compiled build, not feature enablement, determines which files require protection.
export function networkReviewBuildOptions(options,manifest){
 if(!manifest?.['index.html'])throw Error('REVIEW_BUILD_MANIFEST_REQUIRED')
 const privateAssetPaths=manifest['src/networkReview/NetworkSurface.jsx']?networkReviewAssetPaths(manifest):[]
 return {...options,privateAssetPaths}
}
export function createNetworkReviewDispatcher({enabled=false,origin=null,authorizeTester=null,servicesProvider=null,renderAppShell=null,privateAssetPaths=[],renderPrivateAsset=null,reviewSessionBinding=null,entryHandler=null,entryEnabled=false,verifyHttpsRequest=null}={}){
 const assets=new Set(privateAssetPaths.filter(p=>typeof p==='string'&&p.startsWith('/assets/')&&!p.includes('?')&&!p.includes('..')))
 return async(req,res)=>{
  let rawPath;try{rawPath=new URL(req.url,'http://review.invalid').pathname}catch{return false}
  let decodedPath;try{decodedPath=decodeURIComponent(rawPath)}catch{return isNetworkReviewRequest(req.url)?(reply(res,404,{error:'NOT_FOUND'}),true):false}
  const privateAsset=assets.has(decodedPath)
  if(!isNetworkReviewRequest(req.url)&&!privateAsset)return false
  const configured=enabled===true&&typeof authorizeTester==='function'&&typeof servicesProvider==='function'&&typeof renderAppShell==='function'&&typeof origin==='string'&&assets.size>0&&typeof renderPrivateAsset==='function'&&typeof verifyHttpsRequest==='function'
  if(!configured)return reply(res,404,{error:'NOT_FOUND'}),true
  try{
   const url=new URL(req.url,origin);if(url.origin!==origin||req.headers.host!==new URL(origin).host||url.search||url.pathname!==decodeURIComponent(url.pathname))return reply(res,404,{error:'NOT_FOUND'}),true
   // Apply approved HTTPS deployment policy; this never replaces session authorization.
   if(await verifyHttpsRequest(req)!==true)return reply(res,404,{error:'NOT_FOUND'}),true
   if(entryEnabled===true&&typeof entryHandler==='function'&&await entryHandler(req,res)===true)return true
   // Only exact session-exchange endpoints may precede the outer gate. Original auth+CSRF verifies them.
   if(url.pathname==='/api/network-preview/review-access'||url.pathname==='/api/network-review/review-access'){
    if(typeof reviewSessionBinding?.exchange!=='function')return reply(res,404,{error:'NOT_FOUND'}),true
    await reviewSessionBinding.exchange(req,res);return true
   }
   if(await authorizeTester(req)!==true){if(entryEnabled===true&&['/network','/network/review'].includes(url.pathname)&&['GET','HEAD'].includes(req.method)){for(const[k,v]of Object.entries(headers))res.setHeader(k,v);await renderAppShell(req,res);return true}return reply(res,404,{error:'NOT_FOUND'}),true}
   for(const[k,v]of Object.entries(headers))res.setHeader(k,v)
   if(privateAsset){if(!['GET','HEAD'].includes(req.method)||typeof renderPrivateAsset!=='function')return reply(res,404,{error:'NOT_FOUND'}),true;await renderPrivateAsset(req,res);return true}
   if(url.pathname==='/network'||url.pathname==='/network/review'){
    if(req.method!=='GET'&&req.method!=='HEAD')return reply(res,405,{error:'METHOD_NOT_ALLOWED'}),true
    await renderAppShell(req,res);return true
   }
   if(!url.pathname.startsWith(api)&&!url.pathname.startsWith(admin))return reply(res,404,{error:'NOT_FOUND'}),true
   if(req.method!=='POST'||req.headers.origin!==origin)return reply(res,403,{error:'ORIGIN_REJECTED'}),true
   if(url.pathname==='/api/network-preview/access'){
    if(!await emptyBody(req))return reply(res,400,{error:'INVALID_REQUEST'}),true
    return reply(res,200,{enabled:true}),true
   }
   const services=await servicesProvider()
   if(url.pathname==='/api/network-preview/pilot-marketplace'){
    if(!await emptyBody(req))return reply(res,400,{error:'INVALID_REQUEST'}),true
    try{const out=await (services.projectionForRequest?services.projectionForRequest(req,memberCredentials(req)):services.projection(memberCredentials(req)));return reply(res,200,out),true}catch(e){const status=[401,403,429,503].includes(e?.status)?e.status:503;return reply(res,status,{error:status===403?'VERIFIED_COMPANY_REQUIRED':status===401?'UNAUTHORIZED':'PRIVATE_SERVICE_UNAVAILABLE'}),true}
   }
   if(url.pathname.startsWith(api))await services.memberHandler(req,res);else await services.adminHandler(req,res)
   return true
  }catch{return reply(res,503,{error:'PRIVATE_SERVICE_UNAVAILABLE'}),true}
 }
}
