// Loopback-only isolated acceptance fixture. No live DB, SMTP or real identities.
import http from 'node:http';import fs from 'node:fs/promises';import path from 'node:path';
import {tradingFixture} from '../tests/fixtures/tradingFixture.mjs';
import {offerInput} from '../tests/fixtures/b2bPortalFixture.mjs';
import {createB2bPortalHttp} from '../server/b2b/portalHttp.mjs';
import {createAdminHttp} from '../server/b2b/adminHttp.mjs';
import {csrfForSession,SESSION_COOKIE} from '../server/b2b/portalService.mjs';
import {ADMIN_COOKIE} from '../server/b2b/adminService.mjs';
const f=await tradingFixture();
await f.service.saveOffer(f.s.sessionToken,{...offerInput,quantity:20,unit:'t',priceAmount:500,listingDirection:'OFFER',productType:'COMMODITY',commercialInformation:'Isolated synthetic acceptance lot. Not a real offer.'});
const root=path.resolve('dist');let portal,admin,origin;
const mime={'.html':'text/html;charset=utf-8','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.svg':'image/svg+xml','.webp':'image/webp','.woff2':'font/woff2'};
const server=http.createServer(async(req,res)=>{try{
 const u=new URL(req.url,origin);if(!['127.0.0.1','localhost'].includes(u.hostname)){res.writeHead(403).end();return;}
 if(u.pathname==='/__fixture'){res.writeHead(200,{'Content-Type':'application/json'}).end(JSON.stringify({operatorCompanyId:f.operatorCompanyId,offers:f.h.state.offers.size,transactions:[...f.h.state.trades.values()],notifications:[...f.h.state.listingJobs.values()].map(j=>({status:j.status})),fakeMailCount:f.delivered.length,production:false}));return;}
 if(u.pathname.startsWith('/api/')){
  const actor=req.headers['x-fixture-actor']==='buyer'?f.b:f.s;
  req.headers.cookie=`${SESSION_COOKIE}=${actor.sessionToken}; ${ADMIN_COOKIE}=${f.brokerToken}`;
  // This fixture injects session context only on loopback. The production handlers are unchanged.
  req.headers.origin=origin;
  if(u.pathname==='/api/b2b/v1/status'){res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'}).end(JSON.stringify({memberSignInAvailable:true,sellerOffersAvailable:true,buyerDiscoveryAvailable:true,enquiriesAvailable:true,tradingAvailable:true}));return;}
  if(await admin(req,res)||await portal(req,res))return;res.writeHead(404).end();return;
 }
 let target=path.resolve(root,'.'+decodeURIComponent(u.pathname));if(target!==root&&!target.startsWith(root+path.sep)){res.writeHead(403).end();return;}if((await fs.stat(target)).isDirectory())target=path.join(target,'index.html');let bytes=await fs.readFile(target);
 if(path.extname(target)==='.html'){
  // Test-helper-only handoff: ordinary local browser use also remains entirely on loopback.
  const script=`<script>(()=>{const role=new URL(location.href).searchParams.get('fixture');if(role)sessionStorage.setItem('fixtureRole',role);const original=fetch.bind(window);window.fetch=(input,options={})=>{const u=new URL(typeof input==='string'?input:input.url,location.href),headers=new Headers(options.headers);if(u.origin==='https://api.seedtrade.eu'){headers.set('X-Fixture-Actor',sessionStorage.getItem('fixtureRole')??'seller');return original(${JSON.stringify(origin)}+u.pathname+u.search,{...options,headers});}if(u.origin!==location.origin)throw Error('External network forbidden in synthetic preview');return original(input,options);};})();</script>`;
  bytes=Buffer.from(bytes.toString('utf8').replace('<head>','<head>'+script));
 }
 res.writeHead(200,{'Content-Type':mime[path.extname(target)]??'application/octet-stream','Cache-Control':'no-store'}).end(bytes);
}catch{res.writeHead(404).end('Local fixture unavailable');}});
server.listen(0,'127.0.0.1',()=>{
 origin='http://127.0.0.1:'+server.address().port;
 portal=createB2bPortalHttp({service:f.service,allowedOrigin:origin,resolveClient:()=> '127.0.0.1',enabled:true,discoveryOnly:true,communications:true,tradingEnabled:true});
 const auth={...f.auth,me:async token=>{await f.auth.authenticate(null,token);return {permissions:['company:review'],csrfToken:csrfForSession(token)};}};
 admin=createAdminHttp({auth,review:{reviewQueue:async()=>({items:[],next:null})},trading:f.admin,enabled:true,resolveClient:()=> '127.0.0.1',allowedOrigins:[origin]});
 console.log(JSON.stringify({url:origin+'/b2b/account/?view=seller&lang=en',pid:process.pid,syntheticOnly:true}));
});
