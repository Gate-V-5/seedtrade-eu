import test from 'node:test';import assert from 'node:assert/strict';
import {tradingFixture} from './fixtures/tradingFixture.mjs';
import {offerInput} from './fixtures/b2bPortalFixture.mjs';
import {commissionTermsHash,commissionTerms,executedValue,totals} from '../server/b2b/commissionTerms.mjs';
import {digest} from '../server/b2b/legalAcceptance.mjs';
import {createTradingAdmin} from '../server/b2b/tradingAdmin.mjs';
import {B2bError} from '../server/b2b/portalService.mjs';
let nonce=0;const key=()=>('synthetic-trading-'+(++nonce)).padEnd(24,'0');
const agreement={goods:'Synthetic seed lot',quantity:'20',quantityUnit:'t',price:'500',priceUnit:'t',currency:'EUR',deliveryTerms:'EXW synthetic warehouse',priceExcludesVat:true};
async function start(direction='OFFER'){
 const f=await tradingFixture(),owner=direction==='OFFER'?f.s:f.b,respondent=direction==='OFFER'?f.b:f.s;
 await f.service.saveListingPreference(respondent.sessionToken,{enabled:true,language:'DE',cropIds:[]});
 const offer=await f.service.saveOffer(owner.sessionToken,{...offerInput,quantity:20,unit:'t',priceAmount:500,listingDirection:direction,productType:'COMMODITY'});
 await assert.rejects(f.service.publishOffer(owner.sessionToken,{id:offer.id,version:0}),e=>e.message==='COMMISSION_ACCEPTANCE_REQUIRED');
 await f.service.publishOffer(owner.sessionToken,{id:offer.id,version:0,commissionAccepted:true,commissionTermsHash});
 const enquiry=await f.service.sendEnquiry(respondent.sessionToken,{offerId:offer.id,requestedQuantity:20,requestedUnit:'t',body:'Synthetic negotiation only',proposedPrice:'500',proposedDeliveryTerms:'EXW synthetic warehouse',requestId:key()});
 let r=(await f.service.transactionDetail(owner.sessionToken,{id:enquiry.id})).transaction;
 const action=async(actor,action,extra={})=>{r=(await f.service.transactionAction(actor.sessionToken,{id:r.enquiryId,version:r.version,requestId:key(),action,...extra})).transaction;return r;};
 const operator=async(action,extra={})=>{r=(await f.admin.action(f.brokerToken,{id:r.enquiryId,version:r.version,action,operatorCompanyId:f.operatorCompanyId,...extra})).transaction;return r;};
 return {...f,owner,respondent,offer,enquiry,action,operator,get record(){return r;}};
}
for(const direction of ['OFFER','BUY_REQUEST'])test(direction+': complete synthetic journey, author payer, bilateral execution, seven draft documents and one commission',async()=>{
 const f=await start(direction),{owner,respondent}=f;
 assert.equal(f.record.payerCompanyId,owner.company.id);assert.equal(f.record.buyerCompanyId,f.b.company.id);assert.equal(f.record.sellerCompanyId,f.s.company.id);
 assert.equal(f.record.commissionAcceptance.termsHash,commissionTermsHash);assert.equal(f.record.operator,null);assert.equal(f.record.status,'ENQUIRY');
 await f.action(owner,'PROPOSE',{agreement});await f.action(owner,'ACCEPT',{agreementHash:f.record.agreementHash});await f.action(respondent,'ACCEPT',{agreementHash:f.record.agreementHash});assert.equal(f.record.status,'AGREED');
 await f.action(owner,'CONFIRM_ORDER',{evidenceRef:'synthetic order confirmation'});
 await f.action(owner,'RECORD_EXECUTION',{quantity:'8',evidenceRef:'synthetic first delivery'});assert.equal(f.record.deliveries.length,0);
 await assert.rejects(f.action(owner,'CONFIRM_EXECUTION',{evidenceRef:'self confirmation'}),e=>e.status===403);
 await f.action(respondent,'CONFIRM_EXECUTION',{evidenceRef:'synthetic receipt first delivery'});assert.equal(f.record.status,'PARTIALLY_FULFILLED');assert.equal(f.record.commission.commission,'40.00');
 await f.action(owner,'RECORD_EXECUTION',{quantity:'12',evidenceRef:'synthetic final delivery'});await f.action(respondent,'CONFIRM_EXECUTION',{evidenceRef:'synthetic receipt final delivery'});assert.equal(f.record.status,'FULFILLED');assert.equal(f.record.commission.goodsValue,'10000.00');assert.equal(f.record.commission.commission,'100.00');
 await f.operator('ASSIGN_OPERATOR');await f.action(owner,'COMMISSION_DUE');
 for(const kind of ['ENQUIRY_SUMMARY','NEGOTIATION_SUMMARY','ORDER_CONFIRMATION','TRANSACTION_CONFIRMATION','FULFILMENT_RECORD','COMMISSION_STATEMENT','COMMISSION_INVOICE_DRAFT'])await f.action(owner,'DOCUMENT',{kind});
 assert.equal(f.record.documents.length,7);assert(f.record.documents.every(d=>{const {hash,...content}=d;return hash===digest(content)&&d.status==='DRAFT_NOT_ISSUED'&&d.snapshot.payerCompanyId===owner.company.id;}));
 await f.operator('RECORD_SIMULATED_INVOICE',{evidenceRef:'synthetic accounting reference'});assert.equal(f.record.invoice.status,'LOCAL_SIMULATION_NOT_ISSUED');await f.operator('CLOSE',{evidenceRef:'synthetic settlement reference'});assert.equal(f.record.status,'CLOSED');
 await assert.rejects(f.operator('RECORD_SIMULATED_INVOICE',{evidenceRef:'duplicate accounting ref'}));assert.equal(f.record.invoice.commission.commission,'100.00');
 assert.equal(f.h.state.listingJobs.size,1);assert.equal([...f.h.state.listingJobs.values()][0].status,'SENT');await f.notices.drain();assert.equal(f.delivered.filter(m=>m.subject.includes('Marktplatz')).length,1);
});
test('partial refund after invoice creates a traceable credit, never a second commission',async()=>{
 const f=await start();await f.action(f.owner,'PROPOSE',{agreement});await f.action(f.owner,'ACCEPT',{agreementHash:f.record.agreementHash});await f.action(f.respondent,'ACCEPT',{agreementHash:f.record.agreementHash});await f.action(f.owner,'CONFIRM_ORDER',{evidenceRef:'synthetic order'});
 await f.action(f.owner,'RECORD_EXECUTION',{quantity:'20',evidenceRef:'synthetic delivery'});await f.action(f.respondent,'CONFIRM_EXECUTION',{evidenceRef:'synthetic receipt'});await f.operator('ASSIGN_OPERATOR');await f.action(f.owner,'COMMISSION_DUE');await f.action(f.owner,'DOCUMENT',{kind:'COMMISSION_INVOICE_DRAFT'});await f.operator('RECORD_SIMULATED_INVOICE',{evidenceRef:'synthetic original invoice'});
 await f.action(f.owner,'ADJUST_EXECUTION',{deliveryId:1,quantity:'5',evidenceRef:'synthetic return'});await f.action(f.respondent,'CONFIRM_ADJUSTMENT',{evidenceRef:'synthetic return received'});assert.equal(f.record.commission.commission,'75.00');
 await f.operator('RECORD_SIMULATED_CREDIT',{evidenceRef:'synthetic credit reference'});assert.equal(f.record.credits[0].amountMinor,'2500');assert.equal(f.record.invoice.commission.commission,'100.00');await assert.rejects(f.operator('RECORD_SIMULATED_CREDIT',{evidenceRef:'duplicate credit ref'}));
});
test('idempotency, company isolation, permission checks, cancellations and no assumed operator',async()=>{
 const f=await start();await assert.rejects(f.service.transactionDetail(f.memberAdmin.sessionToken,{id:f.record.enquiryId}),e=>e.status===404);
 await assert.rejects(f.admin.action(f.owner.sessionToken,{id:1}),e=>e.status===401);
 const unbound=createTradingAdmin({repository:f.h.repository,auth:f.auth,workflow:f.workflow,bindings:[],ErrorType:B2bError});await assert.rejects(unbound.action(f.brokerToken,{id:f.record.enquiryId}),e=>e.status===403);
 const input={id:f.record.enquiryId,version:f.record.version,action:'PROPOSE',agreement,requestId:key()};const first=await f.service.transactionAction(f.owner.sessionToken,input),retry=await f.service.transactionAction(f.owner.sessionToken,input);assert.equal(retry.transaction.version,first.transaction.version);assert(retry.replayed);
 await assert.rejects(f.service.transactionAction(f.owner.sessionToken,{...input,agreement:{...agreement,price:'501'}}),e=>e.message==='IDEMPOTENCY_CONFLICT');
 await assert.rejects(f.service.transactionAction(f.respondent.sessionToken,{...input,requestId:key()}),e=>e.status===409);
 assert.equal(first.transaction.operator,null);assert.equal(first.transaction.invoice,null);
 const r=await f.service.transactionAction(f.owner.sessionToken,{id:f.record.enquiryId,version:first.transaction.version,action:'CANCEL',evidenceRef:'synthetic cancellation',requestId:key()});assert.equal(r.transaction.status,'CANCELLED');assert.equal(r.transaction.commission.commission,'0.00');
});
test('money precision uses decimal integers, one rounded total, explicit compatible units',()=>{
 assert.equal(executedValue('20','t','500','t'),1000000n);assert.equal(executedValue('1000','kg','500','t'),50000n);
 assert.equal(totals([{goodsMinor:'100'},{goodsMinor:'100'}]).commission,'0.02');assert.equal(totals([{goodsMinor:'49'}]).commission,'0.00');assert.equal(totals([{goodsMinor:'50'}]).commission,'0.01');assert.throws(()=>executedValue('1','t','500','seeds'));assert.equal(commissionTerms.status,'DRAFT');
});
test('opt-outs and SMTP failures never lose committed publication, and unknown delivery is not resent',async()=>{
 const f=await tradingFixture();await f.service.saveListingPreference(f.b.sessionToken,{enabled:false,language:'EN',cropIds:[]});
 const o=await f.service.saveOffer(f.s.sessionToken,{...offerInput,listingDirection:'OFFER',productType:'COMMODITY'});await f.service.publishOffer(f.s.sessionToken,{id:o.id,version:0,commissionAccepted:true,commissionTermsHash});assert.equal(f.h.state.listingJobs.size,0);
 await f.service.saveListingPreference(f.b.sessionToken,{enabled:true,language:'EN',cropIds:[]});f.transport.sendMail=async()=>{throw Error('synthetic SMTP timeout')};
 const next=await f.service.saveOffer(f.s.sessionToken,{...offerInput,listingDirection:'OFFER',productType:'COMMODITY'});await f.service.publishOffer(f.s.sessionToken,{id:next.id,version:0,commissionAccepted:true,commissionTermsHash});assert.equal(f.h.state.offers.get(next.id).status,'PUBLISHED');assert.equal([...f.h.state.listingJobs.values()][0].status,'UNKNOWN');await f.notices.drain();assert.equal([...f.h.state.listingJobs.values()][0].status,'UNKNOWN');
});
