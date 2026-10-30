import fs from 'node:fs';
import path from 'node:path';
import {isIP} from 'node:net';
import {networkReviewOptions} from './config.mjs';
// Only staging may opt in. Hostinger-managed mode uses provider TLS termination.
// The existing callback name is retained for compatibility: it validates approved
// deployment context, NOT cryptographic incoming transport or visitor identity.
// Original genuine session/CSRF/MFA/allowlist checks remain independent.
export function stagingReviewOptions({env=process.env,distRoot}) {
 if(env.SEEDTRADE_PROTECTED_REVIEW!=='true')return networkReviewOptions;
 if(env.SEEDTRADE_DEPLOYMENT_HOST!=='staging.seedtrade.eu'||env.SEEDTRADE_RUNTIME_ENV!=='staging')throw Error('STAGING_ONLY_REVIEW_REQUIRED');
 const list=name=>{let v;try{v=JSON.parse(env[name]||'')}catch{throw Error('REVIEW_CONFIGURATION_REQUIRED')}if(!Array.isArray(v)||!v.length||v.some(x=>typeof x!=='string'||!x)||new Set(v).size!==v.length)throw Error('REVIEW_CONFIGURATION_REQUIRED');return v};
 const allowedSubjects=list('SEEDTRADE_REVIEW_SUBJECTS_JSON');
 if(allowedSubjects.some(x=>!/^(member|admin):[A-Za-z0-9_-]{1,100}$/.test(x)))throw Error('REVIEW_SUBJECTS_REJECTED');
 const invitedEmails=env.SEEDTRADE_REVIEW_ENTRY==='true'?list('SEEDTRADE_REVIEW_INVITED_EMAILS_JSON'):[];
 if(invitedEmails.some(x=>!/^\S+@\S+\.test$/.test(x)))throw Error('SYNTHETIC_ENTRY_ONLY');
 const publicAssetRoots=list('SEEDTRADE_PUBLIC_ROOTS_JSON');
 if(publicAssetRoots.some(x=>!path.isAbsolute(x)))throw Error('EXACT_PUBLIC_ROOTS_REQUIRED');
 const privateAssetRoot=path.resolve(distRoot,'../.seedtrade-private-assets');
 // Legacy B2B_PROXY_MODE belongs to existing staging enquiries/cron.
 // The review namespace must not alter their existing policy or settings.
 const resolveClientIdentity=req=>{
  const peer=typeof req.socket?.remoteAddress==='string'?req.socket.remoteAddress.replace(/^::ffff:/,''):'';
  return env.SEEDTRADE_REVIEW_HTTPS_MODE==='hostinger-managed'&&req.headers.host==='staging.seedtrade.eu'&&isIP(peer)?peer:null;
 };
 return {...networkReviewOptions,enabled:true,origin:'https://staging.seedtrade.eu',entryEnabled:env.SEEDTRADE_REVIEW_ENTRY==='true',invitedEmails,allowedSubjects,
  privateAssetRoot,publicAssetRoots:[path.resolve(distRoot),...publicAssetRoots],
  verifyHttpsRequest:req=>resolveClientIdentity(req)!==null,
  renderAppShell:async(req,res)=>{const b=fs.readFileSync(path.join(distRoot,'index.html'));res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'private, no-store','Vary':'Cookie, Authorization','X-Robots-Tag':'noindex, nofollow'});res.end(req.method==='HEAD'?undefined:b)}
 };
}
