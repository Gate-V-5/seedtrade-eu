import test from 'node:test';import assert from 'node:assert/strict';import {Readable} from 'node:stream';
import {tradingFixture} from './fixtures/tradingFixture.mjs';import {offerInput} from './fixtures/b2bPortalFixture.mjs';
import {commissionTermsHash} from '../server/b2b/commissionTerms.mjs';import {digest} from '../server/b2b/legalAcceptance.mjs';
import {createB2bPortalHttp} from '../server/b2b/portalHttp.mjs';import {SESSION_COOKIE,csrfForSession,B2bError} from '../server/b2b/portalService.mjs';
import {createTradingWorkflow} from '../server/b2b/tradingWorkflow.mjs';import {createTradingAdmin} from '../server/b2b/tradingAdmin.mjs';
import {tradingTransactionMethods} from '../server/b2b/tradingRepository.mjs';
import {tradingDocument} from '../src/b2b/tradingDocument.mjs';import {tradingMessages} from '../src/b2b/tradingMessages.mjs';
async function introduced(){const f=await tradingFixture(),o=await f.service.saveOffer(f.s.sessionToken,{...offerInput,listingDirection:'OFFER',productType:'CERTIFIED_SEED',seedCategory:'CERTIFIED_SOWING',certificationClass:'C',qualityParameters:[{parameter:'germination',operator:'MIN',value:'80',unit:'%'}]});await f.service.publishOffer(f.s.sessionToken,{id:o.id,version:0,commissionAccepted:true,commissionTermsHash});const e=await f.service.sendEnquiry(f.b.sessionToken,{offerId:o.id,requestedQuantity:10,requestedUnit:'kg',body:'Synthetic boundary fixture',requestId:'boundary-enquiry-0001'});return {...f,o,e};}
test('local-only commercial mode and exact acceptance cannot silently enable production or accept different wording',async()=>{
 assert.throws(()=>createTradingWorkflow({localOnly:false,ErrorType:B2bError}),/TRADING_LOCAL_ONLY/);const f=await tradingFixture(),o=await f.service.saveOffer(f.s.sessionToken,{...offerInput,listingDirection:'OFFER',productType:'COMMODITY'});
 await assert.rejects(f.service.publishOffer(f.s.sessionToken,{id:o.id,version:0,commissionAccepted:true,commissionTermsHash:'0'.repeat(64)}));assert.equal(f.h.state.offers.get(o.id).status,'DRAFT');assert.equal(f.h.state.listingJobs.size,0);
});
test('HTTP trading routes preserve Origin/CSRF gates and remain absent in Member-only mode',async()=>{
 const f=await introduced(),origin='https://local.example.test';
 const invoke=async({foreign=false,csrf=true,memberOnly=false,tradingEnabled=true,method='POST'}={})=>{
  const service=f.service,handler=createB2bPortalHttp({service,allowedOrigin:origin,resolveClient:()=> '127.0.0.1',enabled:true,tradingEnabled,memberOnly});
  const body={id:f.e.id,version:0,action:'CANCEL',requestId:'boundary-http-0001',evidenceRef:'synthetic cancellation'};
  const req=Readable.from([Buffer.from(JSON.stringify(body))]);req.method=method;req.url='/api/b2b/v1/trading/action';req.headers={origin:foreign?'https://foreign.example':origin,'content-type':'application/json',cookie:SESSION_COOKIE+'='+f.s.sessionToken,...(csrf?{'x-seedtrade-csrf':csrfForSession(f.s.sessionToken)}:{})};let status;const res={writeHead(n){status=n},end(){}};await handler(req,res);return status;
 };
 assert.equal(await invoke({foreign:true}),403);assert.equal(await invoke({csrf:false}),403);assert.equal(await invoke({memberOnly:true}),404);assert.equal(await invoke({tradingEnabled:false}),undefined);assert.equal(f.h.state.trades.get(f.e.id).version,0);
});
test('payer, introduction and accepted terms stay frozen after later listing edits, and audit failure rolls back',async()=>{
 const f=await introduced(),before=structuredClone(f.h.state.trades.get(f.e.id));await f.service.saveOffer(f.s.sessionToken,{...offerInput,id:f.o.id,version:1,listingDirection:'BUY_REQUEST',productType:'COMMODITY'});
 const after=(await f.service.transactionDetail(f.b.sessionToken,{id:f.e.id})).transaction;assert.equal(after.payerCompanyId,f.s.company.id);assert.equal(after.listingDirection,'OFFER');assert.deepEqual(after.commissionAcceptance,before.commissionAcceptance);assert.equal(digest(after.commissionAcceptance.terms),commissionTermsHash);
 f.h.faults.audit=true;await assert.rejects(f.service.transactionAction(f.s.sessionToken,{id:f.e.id,version:0,action:'CANCEL',evidenceRef:'synthetic cancellation',requestId:'boundary-audit-0001'}));assert.deepEqual(f.h.state.trades.get(f.e.id),before);
});
test('separate operator bindings and conflicts fail closed; unassigned view reveals only assignment summary',async()=>{
 const f=await introduced(),summary=await f.admin.detail(f.brokerToken,{id:f.e.id});assert.equal(summary.transaction,null);assert(summary.assignment.version===0);assert(!summary.messages);
 const conflicted=createTradingAdmin({repository:f.h.repository,workflow:f.workflow,ErrorType:B2bError,bindings:f.bindings,auth:{authenticate:async()=>({adminId:99,platformAdmin:true,conflictCompanyIds:[f.s.company.id]})}});
 await assert.rejects(conflicted.detail(f.brokerToken,{id:f.e.id}),e=>e.status===404);await assert.rejects(conflicted.action(f.brokerToken,{id:f.e.id,version:0,action:'ASSIGN_OPERATOR',operatorCompanyId:f.operatorCompanyId}),e=>e.status===403);
 await assert.rejects(f.service.transactionDetail(f.memberAdmin.sessionToken,{id:f.e.id}),e=>e.status===404);
});
test('persisted financial records use locked, parameterized, versioned SQL and never erase on conflict',async()=>{
 const calls=[],db={async execute(sql,params){calls.push({sql,params});if(sql.startsWith('SELECT'))return [[{payload_json:JSON.stringify({enquiryId:7,version:1})}]];return [{affectedRows:1}];}},tx=tradingTransactionMethods(db),r={enquiryId:7,listingId:8,ownerCompanyId:9,respondingCompanyId:10,version:1,agreement:{goods:"synthetic ' OR 1=1 --"}};
 await tx.tradingRecord(7);await tx.saveTradingRecord(r,0);await tx.setCommissionAcceptance({id:8,companyId:9,version:1,acceptance:{termsHash:commissionTermsHash}});await tx.enqueueListingNotice({offerId:8,offerVersion:2,userId:1});
 assert(calls[0].sql.includes('FOR UPDATE'));assert(calls[1].sql.includes('AND version=?'));assert(!calls[1].sql.includes(r.agreement.goods));assert.equal(calls[1].params.at(-1),0);assert(calls[3].sql.includes('ON DUPLICATE KEY UPDATE'));
});
test('all five language document drafts are escaped, snapshot-based and explicitly not issued',()=>{
 const snapshot={transactionId:'ST-7',buyerName:'Synthetic <script>buyer</script>',sellerName:'Synthetic seller',buyerCompanyId:1,sellerCompanyId:2,payerCompanyId:2,operator:null,agreement:{goods:'Synthetic lot',quantity:'20',quantityUnit:'t',price:'500',priceUnit:'t',currency:'EUR',deliveryTerms:'EXW synthetic location',quality:[{parameter:'germination',operator:'MIN',value:'80',unit:'%'},{parameter:'moisture',operator:'MAX',value:'9',unit:'%'}]},commission:{goodsValue:'10000.00',commission:'100.00'}};
 const doc={kind:'COMMISSION_INVOICE_DRAFT',version:1,status:'DRAFT_NOT_ISSUED',generatedAt:'2026-11-19T12:00:00Z',snapshot};doc.hash=digest(doc);
 for(const lang of ['EN','DE','FR','ES','IT']){const html=tradingDocument(doc,lang);assert(!html.includes('<script>'));assert(html.includes('10000.00'));assert(html.includes('≥ 80%'));assert(html.includes('≤ 9%'));assert(html.includes(tradingMessages[lang]['Draft — not issued']));assert(html.includes(tradingMessages[lang]['Not assigned']));assert(!html.includes('VAT 0%'));}
});
