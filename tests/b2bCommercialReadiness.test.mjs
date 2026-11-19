import test from 'node:test';import assert from 'node:assert/strict';
import {tradingFixture} from './fixtures/tradingFixture.mjs';import {offerInput} from './fixtures/b2bPortalFixture.mjs';
import {commissionTerms,commissionTermsHash} from '../server/b2b/commissionTerms.mjs';import {commissionDisclosure} from '../shared/commissionDisclosure.mjs';
import {createTradingAdmin} from '../server/b2b/tradingAdmin.mjs';import {B2bError} from '../server/b2b/portalService.mjs';
async function start(){const f=await tradingFixture();const o=await f.service.saveOffer(f.s.sessionToken,{...offerInput,listingDirection:'OFFER',productType:'COMMODITY'});await f.service.publishOffer(f.s.sessionToken,{id:o.id,version:0,commissionAccepted:true,commissionTermsHash});const e=await f.service.sendEnquiry(f.b.sessionToken,{offerId:o.id,body:'Synthetic commercial readiness case',requestedQuantity:10,requestedUnit:'kg',requestId:'commercial-readiness-0001'});return {...f,o,e};}
test('default broker is the owner-selected MB Gate-V; unknown billing and company ID are not invented',async()=>{const f=await start(),r=f.h.state.trades.get(f.e.id);assert.equal(r.operator.key,'GATE_V');assert.equal(r.operator.legalName,'MB Gate-V');assert.equal(r.operator.companyId,null);assert.equal(r.operator.invoiceIdentityVerified,false);assert.equal(r.payerCompanyId,f.s.company.id);assert.equal(r.commissionAcceptance.termsHash,commissionTermsHash);assert(!('bankAccount' in r.operator));});
test('explicit Lagrenas change leaves exactly one current operator, immutable history, payer and terms',async()=>{
 const f=await start();await f.h.register('alternate-broker');const alt=[...f.h.state.companies.values()].find(c=>c.number==='SYN-alternate-broker');alt.status='VERIFIED';alt.legalName='Lagrenas';
 const grants=[...f.bindings,{adminId:99,companyId:alt.companyId,operatorKey:'LAGRENAS',permissions:['broker:assign']}];const admin=createTradingAdmin({repository:f.h.repository,auth:f.auth,workflow:f.workflow,bindings:grants,ErrorType:B2bError});
 let r=(await admin.action(f.brokerToken,{id:f.e.id,version:0,operatorCompanyId:f.operatorCompanyId,operatorKey:'GATE_V',action:'ASSIGN_OPERATOR',evidenceRef:'Synthetic existing private authorization'})).transaction;
 const accepted=structuredClone(r.commissionAcceptance);r=(await admin.action(f.brokerToken,{id:f.e.id,version:r.version,operatorCompanyId:alt.companyId,operatorKey:'LAGRENAS',action:'CHANGE_OPERATOR',evidenceRef:'Synthetic transaction-specific change decision'})).transaction;
 assert.equal(r.operator.key,'LAGRENAS');assert.equal(r.operator.legalName,'Lagrenas');assert.equal(r.operatorHistory.at(-1).previous.key,'GATE_V');assert.deepEqual(r.commissionAcceptance,accepted);assert.equal(r.payerCompanyId,f.s.company.id);
 await assert.rejects(admin.action(f.brokerToken,{id:f.e.id,version:r.version,operatorCompanyId:alt.companyId,operatorKey:'LAGRENAS',action:'DOCUMENT',kind:'COMMISSION_INVOICE_DRAFT'}),e=>e.message==='BROKERAGE_PERMISSION_REQUIRED');
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
