import test from 'node:test';
import assert from 'node:assert/strict';
import {Readable} from 'node:stream';
import {simpleTerms} from '../shared/simpleBrokerageTerms.mjs';
import {digest} from '../server/b2b/legalAcceptance.mjs';
import {hostedMarketplaceEnabled,marketplaceTrueGates} from '../server/b2b/marketplaceActivation.mjs';
import {createB2bStagingRuntime} from '../server/b2b/stagingRuntime.mjs';
import {withProductionCors} from '../server/b2b/productionCors.mjs';
import {createTradingWorkflow} from '../server/b2b/tradingWorkflow.mjs';
import {B2bError} from '../server/b2b/portalService.mjs';

// Synthetic configuration only. No socket connection, SMTP connection or real grant.
const env={SEEDTRADE_RUNTIME_ENV:'production',SEEDTRADE_PUBLIC_ORIGIN:'https://seedtrade.eu',SEEDTRADE_MAIL_TRANSPORT:'smtp',B2B_REGISTRATION_MAIL_TRANSPORT:'smtp',B2B_PRODUCTION_RELEASE_APPROVED:'true',B2B_MEMBER_AUTH_MODE:'member-only-v1',B2B_MARKETPLACE_MODE:'marketplace-v1',B2B_PORTAL_ENABLED:'false',B2B_PLATFORM_ADMIN_ENABLED:'false',B2B_DB_SOCKET:'/run/seedtrade-production-db/mariadb.sock',B2B_DB_NAME:'u230581718_seedtrade_b2b',B2B_DB_USER:'u230581718_b2b_prod',B2B_DB_PASSWORD:'synthetic-never-used',B2B_PROXY_MODE:'trusted',B2B_TRUSTED_PROXY_IPS:'127.0.0.1',B2B_BROKERAGE_TERMS_HASH:digest(simpleTerms),B2B_BROKERAGE_TERMS_APPROVAL_REF:'SYNTHETIC_TEST_ONLY_NOT_OWNER_APPROVAL',...Object.fromEntries(marketplaceTrueGates.map(k=>[k,'true'])),...Object.fromEntries(['ENABLED','RUNTIME_VERIFIED','STORAGE_VERIFIED','MAIL_VERIFIED','PROXY_VERIFIED','PRIVACY_APPROVED'].map(k=>['B2B_REGISTRATION_'+k,'true']))};
async function invoke(handler,route,method='GET'){
 const req=Readable.from([]);Object.assign(req,{url:'/api/b2b/v1'+route,method,socket:{remoteAddress:'127.0.0.1'},headers:{host:'api.seedtrade.eu',origin:env.SEEDTRADE_PUBLIC_ORIGIN,'x-forwarded-proto':'https','x-forwarded-for':'127.0.0.1',...(method==='OPTIONS'?{'access-control-request-method':'POST','access-control-request-headers':'content-type,x-seedtrade-csrf'}:{})}});
 const res={setHeader(){},writeHead(status,headers){this.status=status;this.headers=headers;},end(bytes){this.body=bytes?JSON.parse(bytes):null;}};await handler(req,res);return res;
}
test('all existing hosted safeguards and exact brokerage approval remain required; no broker member/billing/admin binding',()=>{
 assert.equal(hostedMarketplaceEnabled(env),true);assert.equal(hostedMarketplaceEnabled({}),false);
 for(const key of [...marketplaceTrueGates,'B2B_PRODUCTION_RELEASE_APPROVED'])assert.throws(()=>hostedMarketplaceEnabled({...env,[key]:'false'}));
 for(const patch of [{B2B_BROKERAGE_TERMS_HASH:'0'.repeat(64)},{B2B_BROKERAGE_TERMS_APPROVAL_REF:''}])assert.throws(()=>hostedMarketplaceEnabled({...env,...patch}),/BROKERAGE_TERMS_PUBLICATION_APPROVAL_REQUIRED/);
 assert.throws(()=>createTradingWorkflow({simple:true,localOnly:false,ErrorType:B2bError}),/TRADING_LOCAL_ONLY/);
 const workflow=createTradingWorkflow({simple:true,localOnly:false,ErrorType:B2bError,publicationApproval:{termsHash:digest(simpleTerms),reference:env.B2B_BROKERAGE_TERMS_APPROVAL_REF}});assert.equal(workflow.policy.publicationApproved,true);
});
test('hosted composition and CORS connect simple capabilities without transaction-admin schema or SMTP delivery',async()=>{
 const queries=[];let sends=0;
 const connection={release(){},destroy(){},async execute(sql){queries.push(sql);if(sql.startsWith('SELECT DATABASE()'))return [[{db:env.B2B_DB_NAME,account:env.B2B_DB_USER+'@localhost',activeRole:null}]];if(sql.includes('information_schema.COLUMNS'))return [[{COLUMN_TYPE:'longtext',IS_NULLABLE:'YES'}]];return [[]];}};
 const runtime=await createB2bStagingRuntime(env,{catalogue:[],driver:{createPool:()=>({getConnection:async()=>connection,end:async()=>{}})},createMail:()=>({transport:{sendMail:async()=>{sends++;throw Error('NO_REAL_MAIL');},close(){}},from:'network@seedtrade.eu'})});
 try{
  const api=withProductionCors(runtime.handle),status=await invoke(api,'/status');assert.equal(status.status,200);assert.equal(status.body.simpleMarketplace,true);assert.equal(status.body.registrationPasswordAfterVerification,true);assert.equal(status.body.enquiriesAvailable,true);
  assert(queries.some(q=>q.includes('b2b_trading_records')));assert(!queries.some(q=>q.includes('b2b_platform_admin')));
  for(const route of ['/trading/preferences','/enquiries/confirmation-summary','/enquiries/confirm'])assert.equal((await invoke(api,route,'OPTIONS')).status,204);
  assert.equal((await invoke(api,'/trading/policy')).status,401);
  assert.equal((await invoke(api,'/admin/session')).status,404);
  assert.equal((await invoke(api,'/trading/action','OPTIONS')).status,404);
  assert.equal(sends,0);
 }finally{await runtime.close();}
});
