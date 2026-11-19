import test from 'node:test';import assert from 'node:assert/strict';
import {tradingFixture} from './fixtures/tradingFixture.mjs';import {offerInput} from './fixtures/b2bPortalFixture.mjs';
import {commissionTerms,commissionTermsHash} from '../server/b2b/commissionTerms.mjs';import {commissionDisclosure} from '../shared/commissionDisclosure.mjs';
import {createTradingAdmin} from '../server/b2b/tradingAdmin.mjs';import {B2bError} from '../server/b2b/portalService.mjs';
async function start(){const f=await tradingFixture();const o=await f.service.saveOffer(f.s.sessionToken,{...offerInput,listingDirection:'OFFER',productType:'COMMODITY'});await f.service.publishOffer(f.s.sessionToken,{id:o.id,version:0,commissionAccepted:true,commissionTermsHash});const e=await f.service.sendEnquiry(f.b.sessionToken,{offerId:o.id,body:'Synthetic commercial readiness case',requestedQuantity:10,requestedUnit:'kg',requestId:'commercial-readiness-0001'});return {...f,o,e};}
test('default broker is the owner-selected MB Gate-V; unknown billing and company ID are not invented',async()=>{const f=await start(),r=f.h.state.trades.get(f.e.id);assert.equal(r.operator.key,'GATE_V');assert.equal(r.operator.legalName,'MB Gate-V');assert.equal(r.operator.companyId,null);assert.equal(r.operator.invoiceIdentityVerified,false);assert.equal(r.payerCompanyId,f.s.company.id);assert.equal(r.commissionAcceptance.termsHash,commissionTermsHash);assert(!('bankAccount' in r.operator));});
test('MB Gate-V is the sole selectable broker; retired bindings cannot assign or invoice',async()=>{
 const f=await start();const {brokerageOperators,brokeragePermissions}=await import('../server/b2b/brokerageOperators.mjs');
 assert.deepEqual(Object.keys(brokerageOperators),['GATE_V']);
 const retired={adminId:99,companyId:f.operatorCompanyId,operatorKey:'LAGRENAS',permissions:[...new Set(Object.values(brokeragePermissions))]};
 assert.throws(()=>createTradingAdmin({repository:f.h.repository,auth:f.auth,workflow:f.workflow,bindings:[retired],ErrorType:B2bError}),/INVALID_BROKERAGE_BINDING/);
 const before=structuredClone(f.h.state.trades.get(f.e.id)),audit=structuredClone(f.h.state.audit);
 for(const action of Object.keys(brokeragePermissions))await assert.rejects(f.h.repository.transaction(async tx=>f.workflow.operatorAction(tx,await f.auth.authenticate(tx,f.brokerToken),{id:f.e.id,version:0,operatorCompanyId:f.operatorCompanyId,operatorKey:'LAGRENAS',action,evidenceRef:'Synthetic retired binding'},[retired])),e=>e.message==='BROKERAGE_ASSIGNMENT_REQUIRED');
 assert.deepEqual(f.h.state.trades.get(f.e.id),before);assert.deepEqual(f.h.state.audit,audit);
});
test('historical broker snapshots and audit evidence remain unchanged and participant-readable',async()=>{
 const f=await start(),record=f.h.state.trades.get(f.e.id);
 record.operator={key:'LAGRENAS',legalName:'Lagrenas',companyId:987,identityStatus:'HISTORICAL_FIXTURE'};
 record.operatorHistory=[{previous:{key:'GATE_V',legalName:'MB Gate-V'},reason:'Synthetic historical evidence'}];
 record.documents=[{kind:'COMMISSION_INVOICE_DRAFT',snapshot:{operator:structuredClone(record.operator)},hash:'historical-evidence-not-rehashed'}];
 const before=structuredClone(record),audit=structuredClone(f.h.state.audit);
 for(const participant of [f.s,f.b])assert.deepEqual((await f.service.transactionDetail(participant.sessionToken,{id:f.e.id})).transaction,before);
 await assert.rejects(f.admin.action(f.brokerToken,{id:f.e.id,version:0,operatorCompanyId:f.operatorCompanyId,operatorKey:'GATE_V',action:'DOCUMENT',kind:'COMMISSION_INVOICE_DRAFT'}),e=>e.message==='BROKERAGE_ASSIGNMENT_REQUIRED');
 assert.deepEqual(f.h.state.trades.get(f.e.id),before);assert.deepEqual(f.h.state.audit,audit);
});

test('review/MFA identity alone never grants financial authority; each administrative action checks explicit permission',async()=>{
 const f=await start(),admin=createTradingAdmin({repository:f.h.repository,auth:f.auth,workflow:f.workflow,bindings:[{adminId:99,companyId:f.operatorCompanyId,operatorKey:'GATE_V',permissions:[]}],ErrorType:B2bError});
 for(const action of ['ASSIGN_OPERATOR','CHANGE_OPERATOR','CONFIRM_MILESTONE','APPROVE_COMMISSION','APPROVE_INVOICE_DRAFT','APPROVE_CORRECTION','DOCUMENT','RECORD_SIMULATED_INVOICE','CLOSE'])await assert.rejects(admin.action(f.brokerToken,{id:f.e.id,version:0,operatorCompanyId:f.operatorCompanyId,action}),e=>e.message==='BROKERAGE_PERMISSION_REQUIRED');
 await assert.rejects(f.service.transactionAction(f.s.sessionToken,{id:f.e.id,version:0,action:'DOCUMENT',kind:'COMMISSION_INVOICE_DRAFT',requestId:'commercial-invoice-0001'}),e=>e.status===403);
 assert.equal(f.h.state.trades.get(f.e.id).version,0);
});
test('exact customer wording is shared in five languages and requires a new explicit versioned acceptance',async()=>{
 assert.equal(commissionDisclosure.EN[0],'SEEDTRADE Brokerage Commission');assert.equal(commissionDisclosure.EN.length,7);assert.equal(commissionTerms.text,commissionDisclosure.EN.join('\n\n'));
 for(const lang of ['EN','DE','FR','ES','IT']){assert.equal(commissionDisclosure[lang].length,7);assert(Object.isFrozen(commissionDisclosure[lang]));assert(commissionDisclosure[lang].every(t=>t.length>20));}
 const f=await tradingFixture(),o=await f.service.saveOffer(f.s.sessionToken,{...offerInput,listingDirection:'OFFER',productType:'COMMODITY'});
 await assert.rejects(f.service.publishOffer(f.s.sessionToken,{id:o.id,version:0,commissionAccepted:true,commissionTermsHash:'0'.repeat(64)}));assert(!f.h.state.offers.get(o.id).details.commissionAcceptance);
 await f.service.publishOffer(f.s.sessionToken,{id:o.id,version:0,commissionAccepted:true,commissionTermsHash});const a=f.h.state.offers.get(o.id).details.commissionAcceptance;assert.equal(a.companyId,f.s.company.id);assert.equal(a.userId,f.s.user.id);assert.equal(a.listingId,o.id);assert.equal(a.termsVersion,commissionTerms.version);assert(f.h.state.audit.some(a=>a.action==='COMMISSION_TERMS_ACCEPTED'));
});
