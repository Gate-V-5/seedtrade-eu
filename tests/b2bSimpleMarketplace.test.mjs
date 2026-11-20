import test from 'node:test';import assert from 'node:assert/strict';
import {tradingFixture} from './fixtures/tradingFixture.mjs';import {offerInput} from './fixtures/b2bPortalFixture.mjs';
import {simpleFullTerms} from '../shared/simpleBrokerageTerms.mjs';import {simpleRows} from '../src/b2b/simpleMessages.mjs';
import {createRegistrationService} from '../server/b2b/registrationService.mjs';import {createB2bPortalService} from '../server/b2b/portalService.mjs';import {currentLegalRegistry} from '../server/b2b/legalAcceptance.mjs';import {profileFor} from './fixtures/b2bPortalFixture.mjs';
import {Readable} from 'node:stream';import {createB2bPortalHttp} from '../server/b2b/portalHttp.mjs';import {SESSION_COOKIE,csrfForSession} from '../server/b2b/portalService.mjs';
async function enquiry(direction='OFFER'){
 const f=await tradingFixture({simple:true});
 // The coordinator has no Marketplace company or member, and no billing authority.
 f.h.state.companies.delete(f.operatorCompanyId);
 f.h.state.members=f.h.state.members.filter(m=>m.companyId!==f.operatorCompanyId);
 const p=f.workflow.policy,o=await f.service.saveOffer(f.s.sessionToken,{...offerInput,listingDirection:direction,productType:'COMMODITY',quantity:20,unit:'t',priceAmount:500});
 await f.service.saveListingPreference(f.b.sessionToken,{enabled:true,language:'DE',cropIds:[]});
 await assert.rejects(f.service.publishOffer(f.s.sessionToken,{id:o.id,version:0}),e=>e.message==='COMMISSION_ACCEPTANCE_REQUIRED');
 await f.service.publishOffer(f.s.sessionToken,{id:o.id,version:0,commissionAccepted:true,commissionTermsHash:p.hash});
 const input={offerId:o.id,requestedQuantity:20,requestedUnit:'t',proposedPrice:'500',body:'',uiLanguage:'FR',requestId:'simple-enquiry-00001'};
 const e=await f.service.sendEnquiry(f.b.sessionToken,input);return {...f,e,input,o};
}
for(const direction of ['OFFER','BUY_REQUEST'])test(direction+': publication → member notice → exact email confirmation → one operator notice; manual execution only',async()=>{
 const f=await enquiry(direction);assert.equal(f.e.status,'PENDING_EMAIL_CONFIRMATION');assert.equal(f.e.confirmationMailStatus,'SENT');assert.equal(f.delivered.length,2);
 const mail=f.delivered.find(m=>m.to===f.b.user.email&&m.text.includes('view=confirm-enquiry'));const url=new URL(mail.text.split('\n').find(l=>l.startsWith('https://'))),q=new URLSearchParams(url.hash.slice(1)),token=q.get('token');
 assert(!url.search.includes(token));assert.equal(f.h.state.trades.get(f.e.id).enquiryConfirmation.token,undefined);
 const pending=await f.service.enquiries(f.s.sessionToken,{direction:'INBOX'});assert.equal(pending.items.length,0);
 const summary=await f.service.enquiryConfirmationSummary(f.b.sessionToken,{id:f.e.id,token});assert.equal(summary.summary.price,'500');assert.equal(summary.summary.priceUnit,'t');
 assert.equal(summary.summary.listingCompanyContact,undefined);const memberDetail=(await f.service.transactionDetail(f.b.sessionToken,{id:f.e.id})).transaction;assert.equal(memberDetail.enquiryConfirmation.operatorContacts,undefined);assert.equal(memberDetail.enquiryConfirmation.tokenHash,undefined);
 await assert.rejects(f.service.confirmEnquiry(f.b.sessionToken,{id:f.e.id,token,confirmed:true,summaryHash:'wrong',version:1}),e=>e.message==='SUMMARY_CHANGED');
 await assert.rejects(f.service.enquiryConfirmationSummary(f.s.sessionToken,{id:f.e.id,token}),e=>e.status===404);
 await f.service.sendEnquiry(f.b.sessionToken,f.input);assert.equal(f.delivered.length,2);
 const result=await f.service.confirmEnquiry(f.b.sessionToken,{id:f.e.id,token,confirmed:true,summaryHash:summary.summaryHash,version:summary.version});assert.equal(result.status,'CONFIRMED');assert.equal(result.operatorMailStatus,'SENT');
 await assert.rejects(f.service.confirmEnquiry(f.b.sessionToken,{id:f.e.id,token,confirmed:true,summaryHash:summary.summaryHash,version:1}),e=>e.message==='INVALID_OR_EXPIRED');
 await f.confirmation.deliverOperator(f.e.id);assert.equal(f.delivered.filter(m=>m.to==='operations@example.invalid').length,1);
 assert.equal((await f.service.enquiries(f.s.sessionToken,{direction:'INBOX'})).items.length,1);
 const r=f.h.state.trades.get(f.e.id);assert.equal(r.payerCompanyId,f.s.company.id);assert.equal(r.operator.key,'GATE_V');assert.equal(r.invoice,null);assert.deepEqual(r.deliveries,[]);assert.deepEqual(r.documents,[]);
 assert.equal(r.operator.companyId,undefined);assert.equal(r.operator.registrationNumber,'306795035');assert.equal(r.operator.identityStatus,'LEGAL_OPERATOR');
 assert.equal(r.commissionAcceptance.companyId,f.s.company.id);assert.equal(r.commissionAcceptance.userId,f.s.user.id);assert.equal(r.commissionAcceptance.listingId,f.o.id);assert.equal(r.commissionAcceptance.termsVersion,'brokerage-simple-1pct-v2');assert.equal(r.commissionAcceptance.termsHash,f.workflow.policy.hash);assert(r.commissionAcceptance.acceptedAt);
 const handoff=JSON.parse(f.delivered.find(m=>m.to==='operations@example.invalid').text);assert.equal(handoff.administration,undefined);assert.equal(handoff.coordination,'MANUAL_OUTSIDE_MARKETPLACE_V1');
 await assert.rejects(f.workflow.operatorAction(null,{},{} ,[]),e=>e.message==='MANUAL_BROKERAGE_ONLY');
 await assert.rejects(f.service.transactionAction(f.b.sessionToken,{id:f.e.id,action:'RECORD_EXECUTION'}),e=>e.message==='MANUAL_BROKERAGE_ONLY');
});
test('five-language terms are versioned local drafts; new labels have all five translations',()=>{for(const l of ['EN','DE','FR','ES','IT']){assert.equal(simpleFullTerms[l].length,11);assert(simpleFullTerms[l].join(' ').includes('MB Gate-V'));}assert(simpleRows.every(row=>row.length===5&&row.every(Boolean)));});
test('SMTP failure preserves committed enquiry and cannot generate operator mail before confirmation',async()=>{const f=await tradingFixture({simple:true}),o=await f.service.saveOffer(f.s.sessionToken,{...offerInput,listingDirection:'OFFER',productType:'COMMODITY'});await f.service.publishOffer(f.s.sessionToken,{id:o.id,version:0,commissionAccepted:true,commissionTermsHash:f.workflow.policy.hash});f.transport.sendMail=async()=>{throw Error('synthetic delivery uncertainty');};const e=await f.service.sendEnquiry(f.b.sessionToken,{offerId:o.id,requestedQuantity:1,requestedUnit:'kg',body:'',requestId:'simple-failure-00001'});assert.equal(e.confirmationMailStatus,'UNKNOWN');assert.equal(f.h.state.trades.get(e.id).enquiryConfirmation.state,'PENDING_EMAIL_CONFIRMATION');assert.equal((await f.confirmation.deliverOperator(e.id)).status,'NOT_CLAIMED');});
test('expired tokens and withdrawn offers cannot confirm; concurrent confirmations notify once',async()=>{
 const expired=await enquiry(),message=expired.delivered.find(m=>m.text.includes('view=confirm-enquiry')),link=new URL(message.text.split('\n').find(l=>l.startsWith('https://'))),token=new URLSearchParams(link.hash.slice(1)).get('token');expired.h.advance(31*60000);await assert.rejects(expired.service.enquiryConfirmationSummary(expired.b.sessionToken,{id:expired.e.id,token}),e=>e.message==='INVALID_OR_EXPIRED');
 const f=await enquiry(),mail=f.delivered.find(m=>m.text.includes('view=confirm-enquiry')),url=new URL(mail.text.split('\n').find(l=>l.startsWith('https://'))),key=new URLSearchParams(url.hash.slice(1)).get('token'),summary=await f.service.enquiryConfirmationSummary(f.b.sessionToken,{id:f.e.id,token:key});
 const input={id:f.e.id,token:key,confirmed:true,summaryHash:summary.summaryHash,version:summary.version};f.h.state.offers.get(f.o.id).status='CLOSED';await assert.rejects(f.service.confirmEnquiry(f.b.sessionToken,input),e=>e.message==='OFFER_UNAVAILABLE');f.h.state.offers.get(f.o.id).status='PUBLISHED';
 const results=await Promise.allSettled([f.service.confirmEnquiry(f.b.sessionToken,input),f.service.confirmEnquiry(f.b.sessionToken,input)]);assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.equal(f.delivered.filter(m=>m.to==='operations@example.invalid').length,1);
});
test('integrated new registration/password setup → independent review → accepted listing → confirmed enquiry → manual handoff',async()=>{
 const f=await tradingFixture({simple:true}),registration=createRegistrationService({...f.h.options,simpleRegistration:true}),email='new-synthetic-seller@example.invalid',password='synthetic registration password';
 const account=await registration.register({email,termsAccepted:true,locale:'en',legalBundleId:currentLegalRegistry.bundleId,company:{legalName:'New Synthetic Seller',registrationCountry:'LT',registrationNumber:'SYN-NEW-SELLER',registeredAddress:{street:'Test Street 1',city:'Vilnius',postalCode:'00000'},contactFirstName:'Synthetic',contactLastName:'Representative',vat:''}});
 const verification=f.h.mail.at(-1);await registration.verifyEmail({userId:account.userId,token:verification.token,password});let seller=await f.service.login({email,password});assert.equal(seller.company.status,'PENDING');await assert.rejects(f.service.saveOffer(seller.sessionToken,offerInput),e=>e.message==='COMPANY_APPROVAL_REQUIRED');
 await f.service.saveProfile(seller.sessionToken,profileFor(seller.company));seller={...seller,...await f.service.me(seller.sessionToken)};const conflictReview=createB2bPortalService({...f.h.options,reviewActor:async()=>({adminId:'a'.repeat(32),platformAdmin:true,conflictCompanyIds:[seller.company.id]})});
 await assert.rejects(conflictReview.reviewCompany(f.brokerToken,{companyId:seller.company.id,version:seller.company.version,status:'VERIFIED',reason:'Synthetic conflict check',conflictFreeConfirmed:true}),e=>e.message==='SELF_APPROVAL_FORBIDDEN');
 const review=createB2bPortalService({...f.h.options,reviewActor:f.auth.authenticate});await review.reviewCompany(f.brokerToken,{companyId:seller.company.id,version:seller.company.version,status:'VERIFIED',reason:'Synthetic independent review evidence',conflictFreeConfirmed:true});
 await f.service.saveListingPreference(f.b.sessionToken,{enabled:true,language:'IT',cropIds:[]});const offer=await f.service.saveOffer(seller.sessionToken,{...offerInput,listingDirection:'OFFER',productType:'COMMODITY',quantity:20,unit:'t',priceAmount:500});await f.service.publishOffer(seller.sessionToken,{id:offer.id,version:0,commissionAccepted:true,commissionTermsHash:f.workflow.policy.hash});
 const enquiry=await f.service.sendEnquiry(f.b.sessionToken,{offerId:offer.id,requestedQuantity:20,requestedUnit:'t',body:'Synthetic request',requestId:'integrated-simple-0001'}),mail=f.delivered.findLast(m=>m.text.includes('view=confirm-enquiry')),url=new URL(mail.text.split('\n').find(l=>l.startsWith('https://'))),token=new URLSearchParams(url.hash.slice(1)).get('token'),summary=await f.service.enquiryConfirmationSummary(f.b.sessionToken,{id:enquiry.id,token});await f.service.confirmEnquiry(f.b.sessionToken,{id:enquiry.id,token,confirmed:true,summaryHash:summary.summaryHash,version:summary.version});
 assert.equal(f.h.state.trades.get(enquiry.id).enquiryConfirmation.state,'CONFIRMED');assert.equal(f.h.state.trades.get(enquiry.id).invoice,null);assert.equal(f.delivered.filter(m=>m.to==='operations@example.invalid').length,1);
});
test('confirmation HTTP routes require session, trusted Origin and CSRF and remain absent in Member-only mode',async()=>{
 const f=await enquiry(),origin='https://staging.seedtrade.eu';
 const handler=memberOnly=>createB2bPortalHttp({service:f.service,allowedOrigin:origin,resolveClient:()=> '127.0.0.1',enabled:true,communications:true,simpleMarketplace:true,tradingEnabled:true,memberOnly});
 async function request(api,{csrf=true,site=origin,method='POST'}={}){const req=Readable.from([JSON.stringify({id:f.e.id,token:'0'.repeat(64)})]);Object.assign(req,{url:'/api/b2b/v1/enquiries/confirm',method,socket:{remoteAddress:'127.0.0.1'},headers:{origin:site,'content-type':'application/json',cookie:SESSION_COOKIE+'='+f.b.sessionToken,...(csrf?{'x-seedtrade-csrf':csrfForSession(f.b.sessionToken)}:{})}});const res={writeHead(s){this.status=s;},end(v){this.body=JSON.parse(v);}};await api(req,res);return res;}
 assert.equal((await request(handler(false),{csrf:false})).status,403);assert.equal((await request(handler(false),{site:'https://other.invalid'})).status,403);assert.equal((await request(handler(false),{method:'GET'})).status,404);assert.equal((await request(handler(true))).status,404);assert.equal(f.h.state.trades.get(f.e.id).enquiryConfirmation.state,'PENDING_EMAIL_CONFIRMATION');
});
