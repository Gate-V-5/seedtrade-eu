// Fixed deployment policy. No credential-bearing resources are initialized here.
export const PRODUCTION_BROWSER_ORIGINS=Object.freeze(['https://seedtrade.eu','https://www.seedtrade.eu']);
export const PRODUCTION_DB_SOCKET='/run/seedtrade-production-db/mariadb.sock';
export const PRODUCTION_API_HOST='api.seedtrade.eu';
const prefix='/api/b2b/v1';
const get=new Set(['/status','/session','/catalogue','/offers','/offers/detail','/enquiries','/messages','/review-queue','/admin/session','/admin/review-queue']);
const publicGet=new Set(['/public/offers','/public/catalogue']);
const post=new Set(['/register','/verify-email','/login','/password-reset/request','/password-reset/confirm','/resend-verification','/logout','/profile','/companies/review','/offers/save','/offers/publish','/offers/close','/enquiries/send','/enquiries/reply','/enquiries/close','/admin/login','/admin/logout','/admin/companies/review']);
const allowedHeaders=new Set(['content-type','x-seedtrade-csrf']);
// Handlers retain activation, session, Origin and CSRF checks. No financial action routes.
for(const route of ['/trading/policy','/trading/preferences','/admin/members'])get.add(route);
for(const route of ['/trading/preferences','/enquiries/confirmation-summary','/enquiries/confirm','/admin/members/access'])post.add(route);
export function withProductionCors(handle) {
  if(typeof handle!=='function')throw TypeError('INVALID_API_HANDLER');
  return async(req,res)=>{
    const fail=(status)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','X-Robots-Tag':'noindex, nofollow'});res.end(JSON.stringify({error:status===404?'NOT_FOUND':'REQUEST_REJECTED'}));return true;};
    if(![PRODUCTION_API_HOST,PRODUCTION_API_HOST+':443'].includes(req.headers.host))return fail(404);
    let url;try{url=new URL(req.url,'https://'+PRODUCTION_API_HOST);}catch{return fail(400);}
    if(!url.pathname.startsWith(prefix+'/'))return fail(404);
    const route=url.pathname.slice(prefix.length);
    if(!get.has(route)&&!post.has(route)&&!publicGet.has(route))return fail(404);
    if(publicGet.has(route)){
      const origin=req.headers.origin;if(origin&&!PRODUCTION_BROWSER_ORIGINS.includes(origin))return fail(403);
      if(origin){res.setHeader('Access-Control-Allow-Origin',origin);res.setHeader('Vary','Origin');}
      if(req.method!=='GET')return fail(404);
      return await handle(req,res);
    }
    const origin=req.headers.origin;
    if(!PRODUCTION_BROWSER_ORIGINS.includes(origin)||req.headers['sec-fetch-site']==='cross-site')return fail(403);
    res.setHeader('Access-Control-Allow-Origin',origin);
    res.setHeader('Access-Control-Allow-Credentials','true');
    res.setHeader('Vary','Origin, Access-Control-Request-Method, Access-Control-Request-Headers');
    res.setHeader('Cache-Control','no-store');
    res.setHeader('X-Robots-Tag','noindex, nofollow');
    res.setHeader('Referrer-Policy','no-referrer');
    if(req.method==='OPTIONS') {
      const method=req.headers['access-control-request-method'];
      const requested=(req.headers['access-control-request-headers']??'').split(',').map(h=>h.trim().toLowerCase()).filter(Boolean);
      if(!(method==='GET'&&get.has(route)||method==='POST'&&post.has(route))||
        requested.some(h=>!allowedHeaders.has(h))||new Set(requested).size!==requested.length)return fail(403);
      res.writeHead(204,{'Access-Control-Allow-Methods':method,'Access-Control-Allow-Headers':'Content-Type, X-SeedTrade-CSRF'});res.end();return true;
    }
    if(!(req.method==='GET'&&get.has(route)||req.method==='POST'&&post.has(route))||(req.method==='POST'&&url.search))return fail(404);
    const handled=await handle(req,res);
    if(handled===false&&!res.writableEnded)return fail(404);
    return handled;
  };
}
