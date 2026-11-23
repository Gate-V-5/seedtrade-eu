import {timingSafeEqual,createHash} from 'node:crypto';
import {B2bError,csrfForSession} from './portalService.mjs';
import {ADMIN_COOKIE,ADMIN_SESSION_SECONDS} from './adminService.mjs';
import {createB2bRateLimiter} from './rateLimiter.mjs';
const headers={'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff','X-Frame-Options':'DENY','X-Robots-Tag':'noindex, nofollow'};
const cookie=(token='')=>`${ADMIN_COOKIE}=${token}; Path=/; Secure; HttpOnly; SameSite=Strict; Max-Age=${token?ADMIN_SESSION_SECONDS:0}`;
function token(req){const raw=req.headers.cookie;if(typeof raw!=='string'||raw.length>4096)return null;const all=raw.split(';').map(s=>s.trim()).filter(s=>s.startsWith(ADMIN_COOKIE+'='));if(all.length!==1)return null;const t=all[0].slice(ADMIN_COOKIE.length+1);return /^[a-f0-9]{64}$/.test(t)?t:null;}
export function createAdminHttp({auth,review,enabled=false,resolveClient,allowedOrigins,trading=null,now=()=>Date.now()}){
 const rate=createB2bRateLimiter({limit:60,now}),loginRate=createB2bRateLimiter({limit:5,windowMs:900000,now});
 return async(req,res)=>{
  const u=new URL(req.url,'http://local.invalid');if(!u.pathname.startsWith('/api/b2b/v1/admin/'))return false;
  const route=u.pathname.slice('/api/b2b/v1/admin/'.length),get={session:async()=>({...await auth.me(token(req)),...(trading?{tradingAvailable:await trading.available(token(req))}:{})}),'review-queue':()=>review.reviewQueue(token(req),{after:Number(u.searchParams.get('after')??0),scope:u.searchParams.get('scope')??'ACTIVE'})};
  if(trading)get['trading/detail']=()=>trading.detail(token(req),{id:Number(u.searchParams.get('id'))});
  get.members=()=>auth.managedMembers(token(req),{query:u.searchParams.get('query')??'',after:Number(u.searchParams.get('after')??0)});
  const send=(s,b,extra={})=>{res.writeHead(s,{...headers,...extra});res.end(JSON.stringify(b));return true;};
  if(!enabled)return send(404,{error:'NOT_FOUND'});
  try{
   const client=resolveClient(req);if(!client||!allowedOrigins.includes(req.headers.origin)||req.headers['sec-fetch-site']==='cross-site')return send(403,{error:'REQUEST_REJECTED'});
   if(!['GET','POST'].includes(req.method)||!(req.method==='GET'?Object.hasOwn(get,route):['login','logout','companies/review','members/access','members/action',...(trading?['trading/action']:[])].includes(route)))return send(404,{error:'NOT_FOUND'});
   for(const k of u.searchParams.keys())if(req.method!=='GET'||!['review-queue','trading/detail','members'].includes(route)||!(route==='members'?['query','after','scope']:route==='review-queue'?['after']:['id']).includes(k)||u.searchParams.getAll(k).length!==1||(route==='members'&&k==='scope'?!['ACTIVE','ARCHIVED'].includes(u.searchParams.get(k)):route==='members'&&k==='query'?(u.searchParams.get(k).length>100||(u.searchParams.get(k).length===1)):!/^\d+$/.test(u.searchParams.get(k))))return send(400,{error:'INVALID_REQUEST'});
   if(!await rate({url:'/admin',socket:{remoteAddress:client}}))return send(429,{error:'RATE_LIMITED'});
   if(req.method==='GET')return send(200,await get[route]());
   if(!/^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(req.headers['content-type']??''))return send(403,{error:'REQUEST_REJECTED'});
   if(route!=='login'){
    const t=token(req),c=req.headers['x-seedtrade-csrf'];if(!t||typeof c!=='string'||!/^[a-f0-9]{64}$/.test(c)||!timingSafeEqual(Buffer.from(c),Buffer.from(csrfForSession(t))))return send(403,{error:'REQUEST_REJECTED'});
   }
   const chunks=[];let size=0;for await(const c of req){size+=c.length;if(size>16384)return send(400,{error:'INVALID_REQUEST'});chunks.push(c);}
   let body;try{body=JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{return send(400,{error:'INVALID_REQUEST'});}
   if(!body||typeof body!=='object'||Array.isArray(body))return send(400,{error:'INVALID_REQUEST'});
   if(route==='login'){
    const account=createHash('sha256').update(String(body.email??'').trim().toLowerCase()).digest('hex');
    for(const address of [client,account])if(!await loginRate({url:'/admin-login',socket:{remoteAddress:address}}))return send(429,{error:'RATE_LIMITED'});
    const {sessionToken,...safe}=await auth.login(body);return send(200,{...safe,...(trading?{tradingAvailable:await trading.available(sessionToken)}:{})},{'Set-Cookie':cookie(sessionToken)});
   }
   if(route==='logout')return send(200,await auth.logout(token(req)),{'Set-Cookie':cookie()});
   if(route==='trading/action')return send(200,await trading.action(token(req),body));
   if(route==='members/action')return send(200,await auth.manageCompany(token(req),body));
   if(route==='members/access')return send(200,await auth.setCompanyAccess(token(req),body));
   return send(200,await review.reviewCompany(token(req),body));
  }catch(e){if(e instanceof B2bError)return send(e.status,{error:e.message},e.status===401?{'Set-Cookie':cookie()}:{});if(e?.code==='B2B_VERSION_CONFLICT')return send(409,{error:'RELOAD_REQUIRED'});return send(503,{error:'TEMPORARILY_UNAVAILABLE'});}
 };
}
