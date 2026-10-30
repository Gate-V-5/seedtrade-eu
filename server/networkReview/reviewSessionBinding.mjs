import {createExistingTesterAuthorizer}from'./dispatcher.mjs';
const cookie='__Host-seedtrade_review_access',shape=/^[ma]\.[A-Za-z0-9_-]{43}$/;
const headers={'Content-Type':'application/json; charset=utf-8','Cache-Control':'private, no-store','Vary':'Cookie, Authorization','X-Robots-Tag':'noindex, nofollow','Referrer-Policy':'no-referrer'};
function read(req,name){const a=(req.headers.cookie||'').split(';').map(x=>x.trim()).filter(x=>x.startsWith(name+'='));if(a.length!==1)return '';return a[0].slice(name.length+1)}
export function createReviewSessionBinding({client,allowedSubjects,verifyHttpsRequest,enabled=false,origin='https://seedtrade.eu',now=Date.now}){
 if(!['https://seedtrade.eu','https://staging.seedtrade.eu'].includes(origin))throw Error('EXACT_REVIEW_ORIGIN_REQUIRED');
 if(typeof client?.call!=='function'||typeof verifyHttpsRequest!=='function'||!Array.isArray(allowedSubjects)||!allowedSubjects.length||new Set(allowedSubjects).size!==allowedSubjects.length||allowedSubjects.some(s=>typeof s!=='string'||! /^(member|admin):[A-Za-z0-9_-]{1,100}$/.test(s)))throw Error('REVIEW_BINDING_CONFIGURATION');
 const allow=new Set(allowedSubjects);const verified=v=>v?.authenticated===true&&v.active===true&&v.allowlisted===true&&allow.has(v.subject)&&Number.isFinite(v.expiresAt)&&v.expiresAt>now();
 const https=async req=>req.headers.host===new URL(origin).host&&await verifyHttpsRequest(req)===true;
 const resolveTester=async req=>{
  if(enabled!==true||!await https(req))return null;const raw=read(req,cookie);if(!shape.test(raw))return null;
  try{const out=await client.call('review:introspect',{token:raw},{});return out.status===200&&verified(out.body)?{authenticated:true,active:true,allowlisted:true,subject:out.body.subject,expiresAt:out.body.expiresAt}:null}catch{return null}
 };
 const authorizeTester=createExistingTesterAuthorizer(resolveTester,[...allow]);
 return {resolveTester,authorizeTester,async exchange(req,res){
  const reply=(s,b,c)=>{res.writeHead(s,{...headers,...(c?{'Set-Cookie':c}:{})});res.end(JSON.stringify(b))};
  if(enabled!==true)return reply(404,{error:'NOT_FOUND'});
  try{
   const member=req.url==='/api/network-preview/review-access',admin=req.url==='/api/network-review/review-access';
   if(!member&&!admin)return reply(404,{error:'NOT_FOUND'});
   if(req.method!=='POST'||!await https(req)||req.headers.origin!==origin)return reply(403,{error:'REVIEW_ACCESS_REJECTED'});
   if(!/^application\/json(?:\s*;|$)/i.test(req.headers['content-type']||'')||req.headers['content-encoding'])return reply(400,{error:'INVALID_INPUT'});
   let n=0,chunks=[];for await(const b of req){n+=b.length;if(n>1024)return reply(413,{error:'REQUEST_TOO_LARGE'});chunks.push(b)}
   let body;try{body=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(Buffer.concat(chunks)))}catch{return reply(400,{error:'INVALID_INPUT'})}
   if(!body||Object.getPrototypeOf(body)!==Object.prototype||Object.keys(body).length)return reply(400,{error:'INVALID_INPUT'});
   const raw=read(req,member?'seedtrade_stage_ab_offline':'seedtrade_review_offline'),csrf=req.headers[member?'x-seedtrade-csrf':'x-seedtrade-review-csrf'];
   if(!/^[A-Za-z0-9_-]{43}$/.test(raw)||typeof csrf!=='string'||!/^[A-Za-z0-9_-]{43}$/.test(csrf))return reply(401,{error:'REVIEW_ACCESS_REJECTED'});
   const credentials=member?{member:raw,csrf}:{admin:raw,adminCsrf:csrf};
   const out=await client.call(member?'review:exchange-member':'review:exchange-admin',{},credentials);
   if(out.status!==200||!verified(out.body)||!shape.test(out.body.reviewToken)||!out.body.reviewToken.startsWith(member?'m.':'a.')||!out.body.subject.startsWith(member?'member:':'admin:'))return reply([401,403,429].includes(out.status)?out.status:503,{error:'REVIEW_ACCESS_REJECTED'});
   const maxAge=Math.min(900,Math.floor((out.body.expiresAt-now())/1000));if(maxAge<1)return reply(401,{error:'REVIEW_ACCESS_REJECTED'});
   return reply(200,{enabled:true},`${cookie}=${out.body.reviewToken}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${maxAge}`);
  }catch{return reply(503,{error:'REVIEW_ACCESS_UNAVAILABLE'})}
 }};
}
