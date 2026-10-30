import https from 'node:https';
import tls from 'node:tls';
import {readFile,lstat,realpath} from 'node:fs/promises';
import {randomBytes,X509Certificate,createPrivateKey} from 'node:crypto';
import {operations,ORIGIN,MAX,MAX_RESPONSE,validCredentials,safeTree,plain,approvedCookie,publicHeaders} from './protocol.mjs';
export function materialFromEnvironment(env=process.env){
 if(env.MTLS_SERVER_NAME!=='b2b-api.seedtrade.eu')throw Error('MTLS_SERVER_IDENTITY_REQUIRED');
 const decode=n=>{const x=env[n];if(typeof x!=='string'||!x.length||x.length>90000||x.length%4||!/^[A-Za-z0-9+/]+={0,2}$/.test(x))throw Error('MTLS_ENV_CONFIGURATION_REJECTED');const b=Buffer.from(x,'base64');if(b.toString('base64')!==x||b.length>65536)throw Error('MTLS_ENV_CONFIGURATION_REJECTED');return b};
 try{const ca=decode('MTLS_CA_B64'),cert=decode('MTLS_CLIENT_CERT_B64'),key=decode('MTLS_CLIENT_KEY_B64');const leaf=new X509Certificate(cert);new X509Certificate(ca);if(!leaf.checkPrivateKey(createPrivateKey(key))||Date.parse(leaf.validFrom)>Date.now()||Date.parse(leaf.validTo)<=Date.now())throw Error();return {ca,cert,key}}catch{throw Error('MTLS_ENV_CONFIGURATION_REJECTED')}
}
export async function clientFromEnvironment(env=process.env){
 if(['MTLS_CA_B64','MTLS_CLIENT_CERT_B64','MTLS_CLIENT_KEY_B64','MTLS_SERVER_NAME'].some(k=>env[k]!==undefined))return createMtlsClient({endpoint:'https://b2b-api.seedtrade.eu',...materialFromEnvironment(env)});

 const values=[];
 for(const [name,secret]of [['SEEDTRADE_B2B_CA_FILE',false],['SEEDTRADE_B2B_CERT_FILE',false],['SEEDTRADE_B2B_KEY_FILE',true]]){
  const path=env[name];if(!path)throw Error('MTLS_CONFIGURATION_REQUIRED');const s=await lstat(path);if(!s.isFile()||s.isSymbolicLink()||await realpath(path)!==path||s.size>65536||(s.mode&0o022)!==0||(secret&&((s.mode&0o077)!==0||s.uid!==process.getuid())))throw Error('MTLS_CUSTODY_REJECTED');values.push(await readFile(path));
 }
 return createMtlsClient({endpoint:env.SEEDTRADE_B2B_API_ORIGIN,ca:values[0],cert:values[1],key:values[2]});
}
export function createMtlsClient({endpoint,ca,cert,key}){
 let u;try{u=new URL(endpoint)}catch{throw Error('MTLS_CONFIGURATION_REQUIRED')}
 if(u.protocol!=='https:'||u.port&&u.port!=='443'||u.pathname!=='/'||u.search||u.hash||u.username||u.password||!u.hostname.includes('.')||!/[a-z]/i.test(u.hostname)||![ca,cert,key].every(x=>Buffer.isBuffer(x)&&x.length))throw Error('MTLS_CONFIGURATION_REQUIRED');
 const agent=new https.Agent({ca,cert,key,rejectUnauthorized:true,checkServerIdentity:tls.checkServerIdentity,minVersion:'TLSv1.2',keepAlive:false,maxSockets:4,maxTotalSockets:4});
 return {close:()=>agent.destroy(),async call(op,body,credentials){
  if(!Object.hasOwn(operations,op)||!plain(body)||!safeTree(body)||!validCredentials(credentials))throw Error('INVALID_OPERATION');
  const raw=Buffer.from(JSON.stringify({v:1,op,body,credentials,nonce:randomBytes(24).toString('hex'),issuedAt:Date.now()}));if(raw.length>MAX)throw Error('REQUEST_TOO_LARGE');
  return new Promise((resolve,reject)=>{
   const req=https.request(new URL('/v1/b2b',u),{method:'POST',agent,headers:{'content-type':'application/json','content-length':raw.length}},res=>{
    let size=0,chunks=[];res.on('data',b=>{size+=b.length;if(size>MAX_RESPONSE)req.destroy(Error('RESPONSE_REJECTED'));else chunks.push(b)});res.on('aborted',()=>req.destroy(Error('REMOTE_UNAVAILABLE')));res.on('error',()=>req.destroy(Error('REMOTE_UNAVAILABLE')));
    res.on('end',()=>{try{if(res.statusCode<200||res.statusCode>599||res.headers['content-encoding']||!String(res.headers['content-type']).startsWith('application/json'))throw Error();const body=JSON.parse(Buffer.concat(chunks).toString('utf8'));if(!plain(body)||!safeTree(body))throw Error();const cookies=res.headers['set-cookie']||[];if(cookies.some(c=>!approvedCookie(c)))throw Error();resolve({status:res.statusCode,body,cookies})}catch{reject(Error('REMOTE_UNAVAILABLE'))}});
   });
   const timer=setTimeout(()=>req.destroy(Error('OUTCOME_UNKNOWN_DO_NOT_RETRY')),17000);timer.unref?.();req.on('close',()=>clearTimeout(timer));req.on('error',()=>reject(Error('REMOTE_UNAVAILABLE_DO_NOT_RETRY')));req.end(raw);
  });
 }};
}
export function createHostingerHandler({client,resolveTester,verifyHttpsRequest,origin=ORIGIN}){
 if(!['https://seedtrade.eu','https://staging.seedtrade.eu'].includes(origin))throw Error('EXACT_HOST_ORIGIN_REQUIRED');
 if(typeof client?.call!=='function'||typeof resolveTester!=='function'||typeof verifyHttpsRequest!=='function')throw Error('HOST_BINDING_REQUIRED');
 const reverse=new Map(Object.entries(operations).filter(([op])=>!op.startsWith('review:')).map(([op,p])=>[p,op]));
 return async(req,res)=>{
  const reply=(s,b,cookies)=>{res.writeHead(s,{...publicHeaders(),...(cookies?.length?{'Set-Cookie':cookies}:{})});res.end(JSON.stringify(b))};
  try{
   // resolveTester MUST verify real server-owned session AND allowlist, never a request flag.
   const t=await resolveTester(req);if(!(t?.authenticated===true&&t.active===true&&t.allowlisted===true&&typeof t.subject==='string'&&t.subject&&Number.isFinite(t.expiresAt)&&t.expiresAt>Date.now()))return reply(404,{error:'NOT_FOUND'});
   if(await verifyHttpsRequest(req)!==true||req.headers.host!==new URL(origin).host||req.headers.origin!==origin)return reply(403,{error:'ORIGIN_REJECTED'});
   const op=reverse.get(req.url);if(!op||req.method!=='POST')return reply(404,{error:'NOT_FOUND'});
   if(!/^application\/json(?:\s*;|$)/i.test(req.headers['content-type']||'')||req.headers['content-encoding'])return reply(415,{error:'JSON_REQUIRED'});
   let size=0,chunks=[];for await(const b of req){size+=b.length;if(size>MAX)return reply(413,{error:'REQUEST_TOO_LARGE'});chunks.push(b)}
   let body;try{body=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(Buffer.concat(chunks)))}catch{return reply(400,{error:'INVALID_INPUT'})}if(!plain(body)||!safeTree(body))return reply(400,{error:'INVALID_INPUT'});
   const cookies=(req.headers.cookie||'').split(';').map(x=>x.trim());const one=name=>{const a=cookies.filter(x=>x.startsWith(name+'='));if(a.length>1)throw Error();return a.length?a[0].slice(name.length+1):''};
   const credentials={member:one('seedtrade_stage_ab_offline'),admin:one('seedtrade_review_offline'),csrf:req.headers['x-seedtrade-csrf']||'',adminCsrf:req.headers['x-seedtrade-review-csrf']||''};if(!validCredentials(credentials))return reply(400,{error:'INVALID_INPUT'});
   const out=await client.call(op,body,credentials);reply(out.status,out.body,out.cookies);
  }catch{reply(503,{error:'PRIVATE_SERVICE_UNAVAILABLE_DO_NOT_RETRY'})}
 };
}
// Fits the existing dispatcher service contract. No mount or feature flag is changed.
export function remoteServices({client,resolveTester,verifyHttpsRequest,origin=ORIGIN}){
 const handler=createHostingerHandler({client,resolveTester,verifyHttpsRequest,origin});
 return {memberHandler:handler,adminHandler:handler,async projectionForRequest(req,credentials){
  const t=await resolveTester(req);if(!(t?.authenticated===true&&t.active===true&&t.allowlisted===true&&typeof t.subject==='string'&&t.subject&&Number.isFinite(t.expiresAt)&&t.expiresAt>Date.now())||await verifyHttpsRequest(req)!==true||req.headers.host!==new URL(origin).host||req.headers.origin!==origin)throw Object.assign(Error('UNAUTHORIZED'),{status:401});
  const out=await client.call('marketplace',{}, {member:credentials.session||'',csrf:credentials.csrf||''});if(out.status!==200)throw Object.assign(Error('PRIVATE_SERVICE_UNAVAILABLE'),{status:[401,403,409,429].includes(out.status)?out.status:503});return out.body;
 }};
}
