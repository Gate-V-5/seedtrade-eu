import test from'node:test';import assert from'node:assert/strict';import fs from'node:fs';import{execFileSync}from'node:child_process';import{Readable}from'node:stream';
import{stagingReviewOptions}from'../server/networkReview/stagingBindings.mjs';
import{createProxyPolicy}from'../server/networkProxyPolicy.mjs';
import{composeRemoteReviewOptions,createRemoteNetworkReview}from'../server/networkReview/remoteRuntime.mjs';
import{createNetworkReviewDispatcher}from'../server/networkReview/dispatcher.mjs';
import{runConfiguredTransportAcceptance}from'../server/networkTransport/managedAcceptance.mjs';
import{messages}from'../src/i18n/messages.js';
import{networkText}from'../src/networkReview/copy.mjs';
import{createHash}from'node:crypto';
const base='005a194df2f1f30242b0244ddf588979dfb8f2b2',origin='https://staging.seedtrade.eu';
const baseline=p=>execFileSync('git',['show',base+':'+p]);
const env={SEEDTRADE_RUNTIME_ENV:'staging',SEEDTRADE_DEPLOYMENT_HOST:'staging.seedtrade.eu',SEEDTRADE_PROTECTED_REVIEW:'true',SEEDTRADE_REVIEW_HTTPS_MODE:'hostinger-managed',SEEDTRADE_REVIEW_SUBJECTS_JSON:'["member:synthetic"]',SEEDTRADE_PUBLIC_ROOTS_JSON:'["/synthetic/public"]',B2B_PROXY_MODE:'trusted',B2B_PROXY_VERIFIED:'true',B2B_TRUSTED_PROXY_IPS:'127.0.0.9'};
const q=(url,cookie='')=>Object.assign(Readable.from([Buffer.from('{}')]),{url,method:'GET',headers:{host:'staging.seedtrade.eu',origin,'content-type':'application/json',cookie,'x-forwarded-proto':'https','x-forwarded-for':'192.0.2.10','x-real-ip':'192.0.2.11','x-tester-id':'member:synthetic','x-admin-role':'security_administrator'},socket:{remoteAddress:'127.0.0.9',encrypted:false}});
const response=()=>({headers:{},setHeader(k,v){this.headers[k]=v},writeHead(s,h={}){this.status=s;Object.assign(this.headers,h)},end(b){this.body=b?.toString()}});
test('new review configuration does not change legacy enquiry/cron namespace or policy',()=>{
 const before=JSON.stringify(env),legacy=createProxyPolicy(env),request=q('/network');assert.equal(legacy(request),'192.0.2.10');
 const review=stagingReviewOptions({env,distRoot:'/synthetic/dist'});assert.equal(review.verifyHttpsRequest(request),true);assert.equal(review.authorizeTester,null);assert.equal(JSON.stringify(env),before);assert.equal(legacy(request),'192.0.2.10');
 assert.equal(stagingReviewOptions({env:{...env,SEEDTRADE_REVIEW_HTTPS_MODE:undefined},distRoot:'/synthetic/dist'}).verifyHttpsRequest(request),false);
 assert.equal(stagingReviewOptions({env:{...env,B2B_PROXY_MODE:'hostinger-managed',SEEDTRADE_REVIEW_HTTPS_MODE:undefined},distRoot:'/synthetic/dist'}).verifyHttpsRequest(request),false);
 for(const p of ['server/networkProxyPolicy.mjs','server/networkStagingRuntime.mjs','server/networkInterest.mjs','server/networkInterestLegacy.mjs','server/networkDeliveryCron.mjs'])assert.deepEqual(fs.readFileSync(p),baseline(p));
});
test('all existing staging paths except four scoped integration files remain byte-identical, including19 staging-only paths',()=>{
 const entries=execFileSync('git',['ls-tree','-r','-z',base],{encoding:'utf8'}).split('\0').filter(Boolean);
 const changed=[];for(const entry of entries){const[,sha,p]=entry.match(/^\d+ blob ([a-f0-9]+)\t(.*)$/);assert.equal(fs.existsSync(p),true,p);const b=fs.readFileSync(p),actual=createHash('sha1').update(Buffer.from('blob '+b.length+'\0')).update(b).digest('hex');if(actual!==sha)changed.push(p)}
 assert.deepEqual(changed.sort(),['.gitignore','package.json','server/index.mjs','src/AppV2.jsx']);
 const pkg=JSON.parse(fs.readFileSync('package.json')),old=JSON.parse(baseline('package.json'));assert.deepEqual(pkg.dependencies,old.dependencies);assert.deepEqual(pkg.devDependencies,old.devDependencies);assert.equal(pkg.scripts.start,old.scripts.start);assert.equal(pkg.scripts.postinstall,old.scripts.postinstall);
 for(const gate of ['validate_editorial_assets.mjs','prerender_seo.mjs','prerender_static_first.mjs'])assert.ok(pkg.scripts['build:vite'].includes(gate));
 assert.deepEqual(fs.readFileSync('package-lock.json'),baseline('package-lock.json'));
 // Existing public i18n uses English source keys and four translated dictionaries.
 assert.equal(messages.EN,undefined);for(const lang of ['DE','FR','ES','IT'])assert.equal(typeof messages[lang],'object');
 for(const lang of ['EN','DE','FR','ES','IT'])assert.ok(networkText(lang,'signIn').length>0);
});
test('default-OFF review and startup transport configuration constructs without network credentials or calls',async()=>{
 assert.equal(stagingReviewOptions({env:{},distRoot:'/synthetic/dist'}).enabled,false);
 assert.deepEqual(await runConfiguredTransportAcceptance({env:{MTLS_STARTUP_TEST:'false'}}),{status:'SKIP_DISABLED'});
 const manifest={'index.html':{file:'assets/main.js',dynamicImports:['src/networkReview/NetworkSurface.jsx']},'src/networkReview/NetworkSurface.jsx':{file:'assets/private.js'}};
 const handler=await createRemoteNetworkReview({options:{enabled:false},manifest,env:{}});
 for(const p of ['/network','/assets/private.js']){const r=response();assert.equal(await handler(q(p),r),true);assert.equal(r.status,404)}
 assert.equal(await handler(q('/weather-evidence'),response()),false);assert.equal(await handler(q('/market'),response()),false);
});
test('staging-bound private route/asset dispatch still requires active allowlisted session and ignores spoofed roles/identity',async()=>{
 const o=stagingReviewOptions({env,distRoot:'/synthetic/dist'});delete o.privateAssetRoot;delete o.publicAssetRoots;
 let active=true,rendered=0,clientCalls=0;const client={call:async(op)=>{clientCalls++;assert.equal(op,'review:introspect');return{status:200,body:{authenticated:true,active,allowlisted:true,subject:'member:synthetic',expiresAt:Date.now()+60000}}}};
 const manifest={'index.html':{file:'assets/main.js',dynamicImports:['src/networkReview/NetworkSurface.jsx']},'src/networkReview/NetworkSurface.jsx':{file:'assets/private.js'}};
 const handler=createNetworkReviewDispatcher(composeRemoteReviewOptions({options:{...o,renderAppShell:async()=>{},renderPrivateAsset:async(_q,r)=>{rendered++;r.writeHead(200);r.end('synthetic')}},manifest,client}));
 for(const p of ['/assets/private.js','/api/network-preview/access']){const r=response();await handler(q(p),r);assert.equal(r.status,404)}assert.equal(clientCalls,0);assert.equal(rendered,0);
 const cookie='__Host-seedtrade_review_access=m.'+'A'.repeat(43);let r=response();await handler(q('/assets/private.js',cookie),r);assert.equal(r.status,200);assert.equal(r.headers['Cache-Control'],'private, no-store');assert.equal(rendered,1);
 active=false;r=response();await handler(q('/assets/private.js',cookie),r);assert.equal(r.status,404);assert.equal(rendered,1);
});
