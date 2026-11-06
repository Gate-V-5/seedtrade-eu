import {timingSafeEqual,createHash} from 'node:crypto';
import {B2bError,SESSION_COOKIE,SESSION_SECONDS,csrfForSession} from './portalService.mjs';
import {createB2bRateLimiter} from './rateLimiter.mjs';

const headers={'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store',
  'X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','X-Frame-Options':'DENY','X-Robots-Tag':'noindex, nofollow'};
const cookie=(token,clear=false)=>`${SESSION_COOKIE}=${clear?'':token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${clear?0:SESSION_SECONDS}`;
export function sessionCookie(req) {
  const value=req.headers.cookie;
  if(typeof value!=='string'||value.length>4096)return null;
  const matches=value.split(';').map(p=>p.trim()).filter(p=>p.startsWith(SESSION_COOKIE+'='));
  if(matches.length!==1)return null;
  const token=matches[0].slice(SESSION_COOKIE.length+1);
  return /^[a-f0-9]{64}$/.test(token)?token:null;
}
const equal=(a,b)=>typeof a==='string'&&typeof b==='string'&&a.length===b.length&&a.length===64&&
  /^[a-f0-9]{64}$/.test(a)&&timingSafeEqual(Buffer.from(a),Buffer.from(b));
async function json(req) {
  const chunks=[];let size=0;
  for await(const chunk of req){const bytes=Buffer.from(chunk);size+=bytes.length;if(size>16384)throw new B2bError(400,'INVALID_REQUEST');chunks.push(bytes);}
  let body;try{body=JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{throw new B2bError(400,'INVALID_REQUEST');}
  if(!body||typeof body!=='object'||Array.isArray(body))throw new B2bError(400,'INVALID_REQUEST');
  return body;
}
export function createB2bPortalHttp({service,allowedOrigin,resolveClient,enabled=false,now=()=>Date.now()}) {
  const limit=createB2bRateLimiter({limit:60,now}),authLimit=createB2bRateLimiter({limit:5,windowMs:15*60_000,now});
  const get={'/session':'me','/catalogue':'catalogue','/offers':'offers','/enquiries':'enquiries','/messages':'messages','/review-queue':'reviewQueue'};
  const post={'/login':'login','/resend-verification':'resendVerification','/logout':'logout','/profile':'saveProfile',
    '/offers/save':'saveOffer','/offers/publish':'publishOffer','/offers/close':'closeOffer',
    '/enquiries/send':'sendEnquiry','/enquiries/reply':'reply','/enquiries/close':'closeEnquiry','/companies/review':'reviewCompany'};
  return async(req,res)=>{
    let url;try{url=new URL(req.url,'http://localhost');}catch{return false;}
    const prefix='/api/b2b/v1';if(!url.pathname.startsWith(prefix+'/'))return false;
    const route=url.pathname.slice(prefix.length);
    if(!Object.hasOwn(get,route)&&!Object.hasOwn(post,route))return false;
    const respond=(status,body,extra={})=>{res.writeHead(status,{...headers,...extra});res.end(JSON.stringify(body));return true;};
    if(!enabled)return respond(404,{error:'NOT_FOUND'});
    try {
      const method=req.method,client=resolveClient(req);
      if(!client||req.headers['sec-fetch-site']==='cross-site'||
          (req.headers.origin&&req.headers.origin!==allowedOrigin))return respond(403,{error:'REQUEST_REJECTED'});
      if(!['GET','POST'].includes(method)||!Object.hasOwn(method==='GET'?get:post,route))return respond(404,{error:'NOT_FOUND'});
      if(!await limit({url:req.url,socket:{remoteAddress:client}}))return respond(429,{error:'RATE_LIMITED'});
      let input={};const token=sessionCookie(req);
      if(method==='POST') {
        if(req.headers.origin!==allowedOrigin||!/^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(req.headers['content-type']??''))return respond(403,{error:'REQUEST_REJECTED'});
        // Authenticate cookies with the service as well; the CSRF check alone is not authorization.
        if(!['/login','/resend-verification'].includes(route)&&(!token||!equal(req.headers['x-seedtrade-csrf'],csrfForSession(token))))return respond(403,{error:'REQUEST_REJECTED'});
        input=await json(req);
      } else {
        for(const key of ['after','id'])if(url.searchParams.has(key))input[key]=Number(url.searchParams.get(key));
        input.own=url.searchParams.get('own')==='true';
      }
      if(['/login','/resend-verification'].includes(route)) {
        const address=client+':auth',account='account:'+createHash('sha256').update(String(input.email??'').trim().toLowerCase()).digest('hex');
        // One shared login/resend budget prevents route switching from bypassing the account/IP limit.
        for(const remoteAddress of [address,account])if(!await authLimit({url:'/auth',socket:{remoteAddress}}))return respond(429,{error:'RATE_LIMITED'});
      }
      if(route==='/login') {
        const result=await service.login(input,token);const {sessionToken,...safe}=result;
        return respond(200,safe,{'Set-Cookie':cookie(sessionToken)});
      }
      if(route==='/resend-verification')return respond(202,await service.resendVerification(input));
      if(!token)return respond(401,{error:'SIGN_IN_REQUIRED'},{'Set-Cookie':cookie('',true)});
      const operation=(method==='GET'?get:post)[route],result=await service[operation](token,input);
      return respond(200,result,route==='/logout'?{'Set-Cookie':cookie('',true)}:{});
    } catch(error) {
      if(error instanceof B2bError)return respond(error.status,{error:error.message},error.status===401?{'Set-Cookie':cookie('',true)}:{});
      if(error instanceof TypeError&&/^INVALID_/.test(error.message))return respond(400,{error:'INVALID_REQUEST'});
      if(error?.code==='ER_DUP_ENTRY')return respond(409,{error:'ALREADY_EXISTS'});
      return respond(503,{error:'TEMPORARILY_UNAVAILABLE'});
    }
  };
}
