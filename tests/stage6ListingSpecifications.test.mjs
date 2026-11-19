import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeListingSpecifications,readListingSpecifications} from '../server/b2b/listingSpecifications.mjs';
import {approvedFixture,offerInput} from './fixtures/b2bPortalFixture.mjs';
import {createB2bPortalService} from '../server/b2b/portalService.mjs';
import {normalizeBuyerFilters} from '../server/b2b/buyerOfferFilters.mjs';
import {createMysqlB2bRepository} from '../server/b2b/mysqlRegistrationRepository.mjs';
import {marketplaceEmail} from '../server/b2b/marketplaceNotifications.mjs';
const quality=[{parameter:'germination',operator:'MIN',value:'80.00',unit:'%'},{parameter:'physicalPurity',operator:'EXACT',value:'99',unit:'%'}];
test('quality operator, precision and legacy exact observations remain distinct',()=>{
 assert.deepEqual(normalizeListingSpecifications({qualityParameters:quality}).qualityParameters,quality);
 const legacy={germinationPercent:80,purityPercent:99,moisturePercent:9,qualitySpecifications:'Original free text'};
 const before=structuredClone(legacy),read=readListingSpecifications(legacy);
 assert.deepEqual(read.qualityParameters.map(q=>q.operator),['EXACT','EXACT','EXACT']);assert.deepEqual(legacy,before);
 assert.equal(read.productType,null);assert.equal(read.listingDirection,null);
});
test('malformed percentages, operators, duplicate parameters and contradictory certification fail closed',()=>{
 for(const row of [{...quality[0],value:80},{...quality[0],value:'100.01'},{...quality[0],value:'-1'},{...quality[0],value:'NaN'},{...quality[0],unit:'kg'},{...quality[0],operator:'ABOUT'},{...quality[0],parameter:'unknown'},{...quality[0],injected:true}])assert.throws(()=>normalizeListingSpecifications({qualityParameters:[row]}));
 assert.throws(()=>normalizeListingSpecifications({qualityParameters:[quality[0],quality[0]]}));
 assert.throws(()=>normalizeListingSpecifications({productType:'COMMODITY',certificationClass:'C1'}));
 assert.throws(()=>normalizeListingSpecifications({productType:'COMMODITY',seedCategory:'CERTIFIED_SOWING'}));
 assert.throws(()=>normalizeListingSpecifications({organic:'true'}));
 assert.throws(()=>normalizeListingSpecifications({listingDirection:'SELL_ANYTHING'}));
 assert.throws(()=>normalizeListingSpecifications({productType:'INFERRED_SEED'}));
});
test('all four listing combinations save, publish, discover, reload and retain company ownership',async()=>{
 const {h,s,b}=await approvedFixture();
 for(const listingDirection of ['OFFER','BUY_REQUEST'])for(const productType of ['CERTIFIED_SEED','COMMODITY']){
  const input={...offerInput,listingDirection,productType,seedCategory:productType==='CERTIFIED_SEED'?'CERTIFIED_SOWING':'SOWING_STATUS_UNKNOWN',certificationClass:productType==='CERTIFIED_SEED'?'C':'',qualityParameters:quality,packaging:'1000 kg Big Bag',deliveryTerms:'EXW Lithuania',organic:false};
  const saved=await h.service.saveOffer(s.sessionToken,input);await h.service.publishOffer(s.sessionToken,{id:saved.id,version:0});
  const detail=(await h.service.offerDetail(b.sessionToken,{id:saved.id})).offer;
  assert.equal(detail.details.listingDirection,listingDirection);assert.equal(detail.details.productType,productType);assert.deepEqual(detail.details.qualityParameters,quality);
  assert.equal(detail.certificationClass,productType==='CERTIFIED_SEED'?'C':'');
  const found=await h.service.offers(b.sessionToken,{listingDirection,productType});assert(found.items.some(o=>o.id===saved.id));assert(found.items.every(o=>o.details.listingDirection===listingDirection&&o.details.productType===productType));
  await assert.rejects(h.service.closeOffer(b.sessionToken,{id:saved.id,version:1}),e=>e.status===404);
 }
});
test('new classifications do not relax quantity, origin, expiry or pending company gates',async()=>{
 const {h,s,b}=await approvedFixture(),input={...offerInput,listingDirection:'BUY_REQUEST',productType:'COMMODITY'};
 for(const patch of [{quantity:null},{quantity:0},{originCountry:'EU'},{originCountry:''},{validUntil:null},{validUntil:'2020-01-01'}])await assert.rejects(h.service.saveOffer(s.sessionToken,{...input,...patch}));
 h.state.companies.get(b.company.id).status='PENDING';await assert.rejects(h.service.saveOffer(b.sessionToken,input),e=>e.status===403);
 assert.equal(h.state.offers.size,0);
});
test('legacy persisted offer remains unchanged when read and is not reclassified',async()=>{
 const {h,s,b}=await approvedFixture(),saved=await h.service.saveOffer(s.sessionToken,{...offerInput,germinationPercent:88.5,qualitySpecifications:'Legacy exact laboratory note'});
 const row=h.state.offers.get(saved.id);delete row.details.listingDirection;delete row.details.productType;delete row.details.qualityParameters;await h.service.publishOffer(s.sessionToken,{id:saved.id,version:0});
 const before=structuredClone(h.state.offers.get(saved.id)),detail=(await h.service.offerDetail(b.sessionToken,{id:saved.id})).offer;
 assert.equal(detail.details.productType,null);assert.equal(detail.details.qualitySpecifications,'Legacy exact laboratory note');assert.equal(detail.details.qualityParameters[0].operator,'EXACT');assert.equal(detail.details.qualityParameters[0].value,'88.5');assert.deepEqual(h.state.offers.get(saved.id),before);
});
test('new filter values are validated and bound as SQL parameters rather than interpolated input',async()=>{
 assert.throws(()=>normalizeBuyerFilters({listingDirection:"BUY_REQUEST' OR 1=1"},new Set(['red-clover'])));
 const calls=[],db={async execute(sql,args){calls.push({sql,args});return [[]];},release(){},async beginTransaction(){},async commit(){},async rollback(){}};
 const repository=createMysqlB2bRepository({async getConnection(){return db;}});
 await repository.transaction(tx=>tx.listOffers({companyId:2,own:false,after:0,eligibleCropIds:['red-clover'],filters:{listingDirection:'BUY_REQUEST',productType:'COMMODITY'}}));
 const q=calls.find(c=>c.sql.includes('FROM b2b_offers'));assert(q.sql.includes("JSON_EXTRACT(o.details_json,'$.listingDirection')"));assert(!q.sql.includes('BUY_REQUEST'));assert(q.args.includes('BUY_REQUEST'));assert(q.args.includes('COMMODITY'));assert(q.sql.includes("c.verification_status='VERIFIED'"));
});
test('BUY_REQUEST conversations retain owner/initiator authorization and immutable commercial roles after edits',async()=>{
 const {h,s,b,admin}=await approvedFixture();h.service=createB2bPortalService({...h.options,communications:true,notifications:{async deliver(){return {status:'ACCEPTED'};}}});
 const saved=await h.service.saveOffer(s.sessionToken,{...offerInput,listingDirection:'BUY_REQUEST',productType:'COMMODITY'});await h.service.publishOffer(s.sessionToken,{id:saved.id,version:0});
 const enquiry=await h.service.sendEnquiry(b.sessionToken,{offerId:saved.id,body:'Synthetic supplier response',requestedQuantity:10,requestedUnit:'kg',requestId:'stage6-enquiry-key-0001'});
 await h.service.reply(s.sessionToken,{id:enquiry.id,body:'Synthetic buyer reply',requestId:'stage6-reply-key-0001'});
 await h.service.saveOffer(s.sessionToken,{...offerInput,id:saved.id,version:1,listingDirection:'OFFER',productType:'CERTIFIED_SEED'});
 const history=await h.service.messages(b.sessionToken,{id:enquiry.id});assert.deepEqual(history.items.map(m=>m.authorSide),['SELLER','BUYER']);assert.equal(history.enquiry.listingOwnerRole,'BUYER');assert.equal(history.enquiry.listingDirection,'BUY_REQUEST');
 await assert.rejects(h.service.messages(admin.sessionToken,{id:enquiry.id}),e=>e.status===404);await assert.rejects(h.service.sendEnquiry(s.sessionToken,{offerId:saved.id,body:'Self',requestedQuantity:1,requestedUnit:'kg'}));
 const notified=[...h.state.notifications.values()];assert(notified.every(n=>n.payload.listingDirection==='BUY_REQUEST'));
});
test('BUY_REQUEST notification copy uses supplier and buyer roles in five languages without conversation content',()=>{
 for(const language of ['EN','DE','FR','ES','IT'])for(const kind of ['ENQUIRY','SELLER_REPLY']){
  const result=marketplaceEmail({from:'network@example.test',origin:'https://staging.seedtrade.eu',job:{kind,recipientEmail:'isolated@example.test',payload:{offerId:1,enquiryId:1,product:'Synthetic crop',quantity:10,unit:'kg',language,listingDirection:'BUY_REQUEST',body:'PRIVATE_SECRET_TEXT'}}});
  assert(!result.text.includes('PRIVATE_SECRET_TEXT'));assert(result.text.includes('lang='+language.toLowerCase()));if(language==='EN')assert(result.subject.includes(kind==='ENQUIRY'?'seller response':'Buyer replied'));
 }
});
