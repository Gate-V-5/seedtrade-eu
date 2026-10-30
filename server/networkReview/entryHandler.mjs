import {operations,plain,safeTree,validCredentials,approvedCookie}from'../networkTransport/protocol.mjs';
const pre=new Set(['member:bootstrap','member:register','member:resend','member:profile-link','member:confirm','member:profile/exchange','admin:bootstrap','admin:login']);
export function createEntryHandler({client,origin,verifyHttpsRequest,enabled=false,invitedEmails=[]}){
 if(!['https://seedtrade.eu','https://staging.seedtrade.eu'].includes(origin)||typeof verifyHttpsRequest!=='function'||typeof client?.call!=='function'||!Array.isArray(invitedEmails)||invitedEmails.some(x=>typeof x!=='string'||!x.endsWith('.test')))throw Error('SYNTHETIC_ENTRY_CONFIGURATION_REQUIRED');
 const invited=new Set(invitedEmails.map(x=>x.toLowerCase())),reverse=new Map(Object.entries(operations).filter(([op])=>pre.has(op)).map(([op,p])=>[p,op]));
 return async(req,res)=>{
  const reply=(s,b,cookies=[])=>{res.writeHead(s,{'Content-Type':'application/json','Cache-Control':'private, no-store','Vary':'Cookie, Authorization','X-Robots-Tag':'noindex, nofollow','Referrer-Policy':'no-referrer',...(cookies.length?{'Set-Cookie':cookies}:{})});res.end(JSON.stringify(b))};
  if(!enabled)return false;
  const access=req.url==='/api/network-entry/access',op=reverse.get(req.url);if(!access&&!op)return false;
  if(req.method!=='POST'||req.headers.host!==new URL(origin).host||req.headers.origin!==origin||await verifyHttpsRequest(req)!==true){reply(403,{error:'ENTRY_ORIGIN_REJECTED'});return true}
  if(!/^application\/json(?:\s*;|$)/i.test(req.headers['content-type']||'')||req.headers['content-encoding']){reply(400,{error:'INVALID_INPUT'});return true}
  try{let n=0,parts=[];for await(const b of req){n+=b.length;if(n>8192)throw Error();parts.push(b)}const body=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(Buffer.concat(parts)));if(!plain(body)||!safeTree(body))throw Error();if(access){if(Object.keys(body).length)throw Error();reply(200,{entryEnabled:true,syntheticOnly:true});return true}
   if(['member:register','member:resend','member:profile-link'].includes(op)&&!invited.has(String(body.email||'').toLowerCase())){reply(200,{message:'If this address can receive our message, a confirmation link will arrive shortly.'});return true}
   const cookie=name=>{const a=(req.headers.cookie||'').split(';').map(x=>x.trim()).filter(x=>x.startsWith(name+'='));if(a.length>1)throw Error();return a.length?a[0].slice(name.length+1):''};
   const credentials={member:cookie('seedtrade_stage_ab_offline'),admin:cookie('seedtrade_review_offline'),csrf:req.headers['x-seedtrade-csrf']||'',adminCsrf:req.headers['x-seedtrade-review-csrf']||''};if(!validCredentials(credentials))throw Error();
   const out=await client.call(op,body,credentials);if(out.cookies?.some(x=>!approvedCookie(x)))throw Error();reply(out.status,out.body,out.cookies||[]);return true;
  }catch{reply(503,{error:'ENTRY_UNAVAILABLE'});return true}
 };
}
