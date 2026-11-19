import {digest} from './legalAcceptance.mjs';
import {commissionTerms,commissionTermsHash,decimal,executedValue,totals} from './commissionTerms.mjs';
import {offerCurrencies} from './offerOptions.mjs';
export const DOCUMENT_TYPES=['ENQUIRY_SUMMARY','NEGOTIATION_SUMMARY','ORDER_CONFIRMATION','TRANSACTION_CONFIRMATION','FULFILMENT_RECORD','COMMISSION_STATEMENT','COMMISSION_INVOICE_DRAFT'];
const asObject=v=>typeof v==='string'?JSON.parse(v):v??{};
// This candidate deliberately has no production enable switch or invoice-issuance function.
export function createTradingWorkflow({localOnly=false,ErrorType,now=()=>Date.now(),catalogue=[]}={}){
 if(localOnly!==true||typeof ErrorType!=='function')throw Error('TRADING_LOCAL_ONLY');
 const fail=(status,code)=>{throw new ErrorType(status,code);};
 const reference=v=>{if(typeof v!=='string'||v.length<3||v.length>200||/[<>\x00-\x1f]/.test(v))fail(400,'EVIDENCE_REFERENCE_REQUIRED');return v.trim();};
 const clock=()=>new Date(now()).toISOString();
 const recordId=value=>{if(!Number.isSafeInteger(value)||value<1)fail(400,'INVALID_REQUEST');return value;};
 const participant=(r,a)=>{if(!r||![r.buyerCompanyId,r.sellerCompanyId].includes(a.company.id))fail(404,'NOT_FOUND');};
 const manager=a=>{if(a.role!=='COMPANY_ADMIN')fail(403,'COMPANY_ADMIN_REQUIRED');};
 const quantity=v=>{try{if(decimal(v,3)<=0n)throw Error();}catch{fail(400,'INVALID_QUANTITY');}return v;};
 const price=v=>{try{if(decimal(v,2)<=0n)throw Error();}catch{fail(400,'INVALID_PRICE');}return v;};
 const audit=(tx,a,action,r)=>tx.appendAudit({actorUserId:a.user?.id??null,adminActorId:a.adminId??null,companyId:a.company?.id??null,action,entityType:'trading',entityId:String(r.enquiryId)});
 async function persist(tx,a,r,action,oldVersion){r.version=oldVersion+1;r.updatedAt=clock();await tx.saveTradingRecord(r,oldVersion);await audit(tx,a,action,r);return {transaction:r};}
 const prepareDocument=(r,kind)=>{if(r.documents.length>=100)fail(409,'RECORD_REVIEW_REQUIRED');
    if(!DOCUMENT_TYPES.includes(kind))fail(400,'INVALID_DOCUMENT');
    const snapshot={listingSnapshot:r.listingSnapshot,transactionId:r.id,listingId:r.listingId,enquiryId:r.enquiryId,buyerCompanyId:r.buyerCompanyId,buyerName:r.buyerName,sellerCompanyId:r.sellerCompanyId,sellerName:r.sellerName,payerCompanyId:r.payerCompanyId,operator:r.operator,agreement:r.agreement,deliveries:r.deliveries,commission:totals(r.deliveries),commissionTermsHash:r.commissionAcceptance.termsHash,transactionVersion:r.version,status:r.status};
    const doc={kind:kind,version:r.documents.filter(d=>d.kind===kind).length+1,status:'DRAFT_NOT_ISSUED',generatedAt:clock(),snapshot:structuredClone(snapshot)};doc.hash=digest(doc);r.documents.push(doc);
 };
 const policy={terms:commissionTerms,hash:commissionTermsHash,localOnly:true,publicationApproved:false};
 return {
  policy,
  async beforePublish(tx,a,offer,input){
   if(input.commissionAccepted!==true||input.commissionTermsHash!==commissionTermsHash)fail(400,'COMMISSION_ACCEPTANCE_REQUIRED');manager(a);
   const acceptance={companyId:a.company.id,userId:a.user.id,listingId:offer.id,listingVersion:offer.version+1,termsVersion:commissionTerms.version,termsHash:commissionTermsHash,terms:commissionTerms,acceptedAt:clock(),scope:'LOCAL_DRAFT_TERMS_TEST_ONLY'};
   await tx.setCommissionAcceptance({id:offer.id,companyId:a.company.id,version:offer.version,acceptance});
   await tx.appendAudit({actorUserId:a.user.id,companyId:a.company.id,action:'COMMISSION_TERMS_ACCEPTED',entityType:'offer',entityId:String(offer.id)});
  },
  async published(tx,a,offer){
   for(const recipient of await tx.eligibleListingRecipients(a.company.id)){
    if(recipient.cropIds?.length&&!recipient.cropIds.includes(offer.cropId))continue;
    const details=asObject(offer.details);
    await tx.enqueueListingNotice({offerId:offer.id,offerVersion:offer.version+1,userId:recipient.userId,email:recipient.email,language:recipient.language,
     direction:details.listingDirection??'OFFER',productType:details.productType??null,product:catalogue.find(c=>c.id===offer.cropId)?.name??offer.cropId,
     cropId:offer.cropId,quantity:offer.quantity,unit:offer.unit,price:offer.priceAmount,currency:offer.currency});
   }
  },
  async introduced(tx,a,offer,enquiryId,input){
   const existing=await tx.tradingRecord(enquiryId);if(existing)return existing;
   const d=asObject(offer.details),acceptance=d.commissionAcceptance;
   if(!acceptance||acceptance.termsHash!==commissionTermsHash||digest(acceptance.terms)!==acceptance.termsHash||acceptance.companyId!==offer.companyId||acceptance.listingId!==offer.id||acceptance.listingVersion!==offer.version)fail(409,'LISTING_COMMISSION_ACCEPTANCE_REQUIRED');
   const demand=d.listingDirection==='BUY_REQUEST';
   const owner=await tx.companyForReview(offer.companyId);
   const r={id:'ST-'+enquiryId,enquiryId,listingId:offer.id,ownerCompanyId:offer.companyId,respondingCompanyId:a.company.id,
    buyerCompanyId:demand?offer.companyId:a.company.id,sellerCompanyId:demand?a.company.id:offer.companyId,payerCompanyId:offer.companyId,
    listingDirection:demand?'BUY_REQUEST':'OFFER',productType:d.productType??null,cropId:offer.cropId,cropName:catalogue.find(c=>c.id===offer.cropId)?.name??'',botanicalName:catalogue.find(c=>c.id===offer.cropId)?.botanical??'',buyerName:demand?owner.legalName:a.company.legalName,sellerName:demand?a.company.legalName:owner.legalName,quality:structuredClone(d.qualityParameters??[]),
    proposedQuantity:input.requestedQuantity??null,proposedUnit:input.requestedUnit??null,proposedPrice:input.proposedPrice??null,proposedDeliveryTerms:input.proposedDeliveryTerms??null,
    commissionAcceptance:structuredClone(acceptance),rateBasisPoints:100,operator:null,status:'ENQUIRY',version:0,agreement:null,acceptances:[],deliveries:[],documents:[],operations:[],invoice:null,
    listingSnapshot:{id:offer.id,version:offer.version,cropId:offer.cropId,variety:d.variety??null,productType:d.productType??null,certificationClass:d.productType==='COMMODITY'?null:offer.certificationClass??null,quantity:offer.quantity,unit:offer.unit,priceAmount:offer.priceAmount??null,currency:offer.currency,originCountry:offer.originCountry,packaging:d.packaging??null,deliveryTerms:d.deliveryTerms??null,organic:d.organic??null,quality:structuredClone(d.qualityParameters??[])},
    createdAt:clock(),updatedAt:clock(),introductionAt:clock(),localOnly:true,history:[{action:'INTRODUCED',at:clock(),companyId:a.company.id}]};
   if(r.proposedPrice!=null)price(r.proposedPrice);if(r.proposedDeliveryTerms!=null)reference(r.proposedDeliveryTerms);
   await tx.saveTradingRecord(r,null);await audit(tx,a,'TRADE_INTRODUCED',r);return r;
  },
  async list(tx,a,input){const after=input.after??0;if(!Number.isSafeInteger(after)||after<0)fail(400,'INVALID_REQUEST');const rows=await tx.listTradingRecords(a.company.id,after);return {items:rows.slice(0,50).map(r=>({id:r.id,enquiryId:r.enquiryId,buyerName:r.buyerName,sellerName:r.sellerName,status:r.status,updatedAt:r.updatedAt})),next:rows.length>50?rows[49].enquiryId:null};},
  async detail(tx,a,input){const r=await tx.tradingRecord(recordId(input.id));participant(r,a);return {transaction:r};},
  async preference(tx,a,input,save=false){
   if(!save)return {preference:await tx.listingPreference(a.user.id)};
   if(typeof input.enabled!=='boolean'||!['EN','DE','FR','ES','IT'].includes(input.language)||!Array.isArray(input.cropIds)||input.cropIds.length>100||input.cropIds.some(id=>!catalogue.some(c=>c.id===id))||new Set(input.cropIds).size!==input.cropIds.length)fail(400,'INVALID_REQUEST');
   await tx.saveListingPreference({userId:a.user.id,enabled:input.enabled,language:input.language,cropIds:input.cropIds});
   await tx.appendAudit({actorUserId:a.user.id,companyId:a.company.id,action:input.enabled?'LISTING_NOTICES_OPT_IN':'LISTING_NOTICES_OPT_OUT',entityType:'user',entityId:String(a.user.id)});return {saved:true};
  },
  async action(tx,a,input){
   const r=await tx.tradingRecord(recordId(input.id));participant(r,a);manager(a);
   if(!Number.isSafeInteger(input.version)||input.version<0||typeof input.requestId!=='string'||!/^[a-zA-Z0-9_-]{16,128}$/.test(input.requestId))fail(400,'INVALID_REQUEST');
   const {version:ignoredVersion,...operation}=input;const fingerprint=digest(operation),prior=r.operations.find(o=>o.key===input.requestId);
   if(prior){if(prior.fingerprint!==fingerprint)fail(409,'IDEMPOTENCY_CONFLICT');return {transaction:r,replayed:true};}
   if(r.version!==input.version)fail(409,'RELOAD_REQUIRED');
   if(r.history.length>=1000||r.documents.length>=100||r.operations.length>=1000)fail(409,'RECORD_REVIEW_REQUIRED');
   const old=r.version,action=input.action;let evidence=null;
   if(action==='PROPOSE'){
    if(!['ENQUIRY','NEGOTIATION','AGREED'].includes(r.status))fail(409,'INVALID_TRANSITION');const g=input.agreement;
    if(!g||!['kg','t'].includes(g.quantityUnit)||!['kg','t'].includes(g.priceUnit)||!offerCurrencies.includes(g.currency)||g.priceExcludesVat!==true)fail(400,'INVALID_AGREEMENT');
    r.agreement={goods:reference(g.goods),quantity:quantity(g.quantity),quantityUnit:g.quantityUnit,price:price(g.price),priceUnit:g.priceUnit,currency:g.currency,deliveryTerms:reference(g.deliveryTerms),priceExcludesVat:true,quality:structuredClone(r.quality)};
    r.agreementHash=digest(r.agreement);r.acceptances=[];r.status='NEGOTIATION';
   }else if(action==='ACCEPT'){
    if(r.status!=='NEGOTIATION'||input.agreementHash!==r.agreementHash)fail(409,'INVALID_TRANSITION');
    if(!r.acceptances.some(x=>x.companyId===a.company.id))r.acceptances.push({companyId:a.company.id,userId:a.user.id,hash:r.agreementHash,at:clock()});if(r.acceptances.length===2)r.status='AGREED';
   }else if(action==='CONFIRM_ORDER'){
    if(r.status!=='AGREED')fail(409,'INVALID_TRANSITION');evidence=reference(input.evidenceRef);r.orderEvidence=evidence;r.status='ORDER_CONFIRMED';
   }else if(action==='RECORD_EXECUTION'){
    if(!['ORDER_CONFIRMED','PARTIALLY_FULFILLED'].includes(r.status))fail(409,'INVALID_TRANSITION');
    if(r.executionAwaiting||r.pendingAdjustment)fail(409,'EXECUTION_CONFIRMATION_REQUIRED');const q=quantity(input.quantity);evidence=reference(input.evidenceRef);
    const executed=r.deliveries.reduce((n,d)=>n+BigInt(d.quantityMilli),0n)+decimal(q,3),agreed=decimal(r.agreement.quantity,3);
    if(executed>agreed)fail(400,'EXCESS_EXECUTION');
    // Both companies must corroborate execution; entering a reference alone is not delivery proof.
    r.pendingExecution={quantity:q,quantityMilli:decimal(q,3).toString(),goodsMinor:executedValue(q,r.agreement.quantityUnit,r.agreement.price,r.agreement.priceUnit).toString(),evidenceRef:evidence,submittedBy:a.company.id};
    r.executionAwaiting=true;
   }else if(action==='CONFIRM_EXECUTION'){
    if(!r.executionAwaiting||r.pendingExecution.submittedBy===a.company.id)fail(403,'COUNTERPARTY_CONFIRMATION_REQUIRED');evidence=reference(input.evidenceRef);
    r.deliveries.push({...r.pendingExecution,id:r.deliveries.length+1,confirmedBy:a.company.id,confirmationEvidence:evidence,at:clock()});delete r.pendingExecution;r.executionAwaiting=false;
    const q=r.deliveries.reduce((n,d)=>n+BigInt(d.quantityMilli),0n);r.status=q===decimal(r.agreement.quantity,3)?'FULFILLED':'PARTIALLY_FULFILLED';
   }else if(action==='ADJUST_EXECUTION'){
    if(!['PARTIALLY_FULFILLED','FULFILLED','COMMISSION_DUE','COMMISSION_INVOICED','CLOSED','DISPUTED'].includes(r.status)||r.executionAwaiting||r.pendingAdjustment)fail(409,'INVALID_TRANSITION');
    const delivery=r.deliveries.find(d=>d.id===input.deliveryId&&BigInt(d.quantityMilli)>0n);if(!delivery)fail(400,'INVALID_DELIVERY');
    const q=decimal(quantity(input.quantity),3),already=r.deliveries.filter(d=>d.adjusts===delivery.id).reduce((n,d)=>n-BigInt(d.quantityMilli),0n);
    if(q+already>BigInt(delivery.quantityMilli))fail(400,'EXCESS_ADJUSTMENT');
    evidence=reference(input.evidenceRef);const remaining=BigInt(delivery.quantityMilli)-already;
    const goods=q===remaining?BigInt(delivery.goodsMinor)+r.deliveries.filter(d=>d.adjusts===delivery.id).reduce((n,d)=>n+BigInt(d.goodsMinor),0n):executedValue(input.quantity,r.agreement.quantityUnit,r.agreement.price,r.agreement.priceUnit);
    r.pendingAdjustment={quantity:input.quantity,quantityMilli:(-q).toString(),goodsMinor:(-goods).toString(),adjusts:delivery.id,evidenceRef:evidence,submittedBy:a.company.id};
   }else if(action==='CONFIRM_ADJUSTMENT'){
    if(!r.pendingAdjustment||r.pendingAdjustment.submittedBy===a.company.id)fail(403,'COUNTERPARTY_CONFIRMATION_REQUIRED');evidence=reference(input.evidenceRef);
    r.deliveries.push({...r.pendingAdjustment,id:r.deliveries.length+1,confirmedBy:a.company.id,confirmationEvidence:evidence,at:clock()});delete r.pendingAdjustment;r.status=r.invoice?'COMMISSION_DUE':'PARTIALLY_FULFILLED';
   }else if(action==='COMMISSION_DUE'){
    if(!['PARTIALLY_FULFILLED','FULFILLED'].includes(r.status)||!r.deliveries.length||r.executionAwaiting||r.pendingAdjustment)fail(409,'INVALID_TRANSITION');r.executionClosed=true;r.status='COMMISSION_DUE';
   }else if(action==='DOCUMENT'){
    prepareDocument(r,input.kind);
   }else if(['REJECT','CANCEL','DISPUTE'].includes(action)){
    if(['CLOSED','CANCELLED','REJECTED','COMMISSION_INVOICED'].includes(r.status))fail(409,'INVALID_TRANSITION');evidence=reference(input.evidenceRef);
    if(action!=='DISPUTE'&&r.deliveries.length)fail(409,'EXECUTED_VALUE_REQUIRES_ADJUSTMENT');r.status=({REJECT:'REJECTED',CANCEL:'CANCELLED',DISPUTE:'DISPUTED'})[action];
   }else if(action==='REOPEN_EXECUTION'){
    if(!['COMMISSION_DUE','DISPUTED'].includes(r.status)||r.invoice)fail(409,'INVALID_TRANSITION');evidence=reference(input.evidenceRef);r.executionClosed=false;r.status=r.deliveries.length?'PARTIALLY_FULFILLED':'ORDER_CONFIRMED';
   }else fail(400,'INVALID_ACTION');
   r.commission=totals(r.deliveries);r.history.push({action,companyId:a.company.id,userId:a.user.id,evidenceRef:evidence,at:clock()});r.operations.push({key:input.requestId,fingerprint});return persist(tx,a,r,action,old);
  },
  async operatorAction(tx,a,input,bindings){
   const r=await tx.tradingRecord(recordId(input.id)),binding=bindings.find(b=>b.adminId===a.adminId&&b.companyId===input.operatorCompanyId);
   if(!a.platformAdmin||!binding||!Array.isArray(a.conflictCompanyIds)||!r||a.conflictCompanyIds.some(id=>[r.buyerCompanyId,r.sellerCompanyId].includes(id)))fail(403,'BROKERAGE_ASSIGNMENT_REQUIRED');
   if(r.version!==input.version)fail(409,'RELOAD_REQUIRED');const old=r.version;
   if(input.action==='ASSIGN_OPERATOR'){
    if(r.operator&&r.operator.companyId!==binding.companyId)fail(409,'OPERATOR_ALREADY_ASSIGNED');const c=await tx.companyForReview(binding.companyId);
    if(!c||c.status!=='VERIFIED'||[r.buyerCompanyId,r.sellerCompanyId].includes(binding.companyId))fail(400,'VERIFIED_BROKERAGE_ENTITY_REQUIRED');
    r.operator={companyId:binding.companyId,legalName:c.legalName,country:c.country,registrationNumber:c.number,assignedBy:a.adminId,at:clock(),invoiceIdentityVerified:false};
   }else if(input.action==='DOCUMENT'){
    if(r.operator?.companyId!==binding.companyId)fail(403,'BROKERAGE_ASSIGNMENT_REQUIRED');prepareDocument(r,input.kind);
   }else if(input.action==='RECORD_SIMULATED_INVOICE'){
    if(r.status!=='COMMISSION_DUE'||r.operator?.companyId!==binding.companyId||r.invoice||r.pendingAdjustment||r.executionAwaiting)fail(409,'INVALID_TRANSITION');
    if(!r.documents.some(d=>d.kind==='COMMISSION_INVOICE_DRAFT'&&d.snapshot.operator?.companyId===binding.companyId&&d.snapshot.commission.commissionMinor===totals(r.deliveries).commissionMinor))fail(409,'INVOICE_DRAFT_REQUIRED');
    r.invoice={status:'LOCAL_SIMULATION_NOT_ISSUED',reference:reference(input.evidenceRef),commission:totals(r.deliveries),operatorCompanyId:binding.companyId};r.status='COMMISSION_INVOICED';
   }else if(input.action==='RECORD_SIMULATED_CREDIT'){
    if(r.status!=='COMMISSION_DUE'||!r.invoice||r.operator?.companyId!==binding.companyId||r.pendingAdjustment||r.executionAwaiting)fail(409,'INVALID_TRANSITION');
    const credited=(r.credits??[]).reduce((n,c)=>n+BigInt(c.amountMinor),0n),amount=BigInt(r.invoice.commission.commissionMinor)-credited-BigInt(totals(r.deliveries).commissionMinor);
    if(amount<=0n)fail(409,'NO_CREDIT_DUE');r.credits??=[];r.credits.push({status:'LOCAL_SIMULATION_NOT_ISSUED',reference:reference(input.evidenceRef),amountMinor:amount.toString(),at:clock()});r.status='COMMISSION_INVOICED';
   }else if(input.action==='CLOSE'){
    if(r.status!=='COMMISSION_INVOICED'||!r.invoice||r.operator?.companyId!==binding.companyId)fail(409,'INVALID_TRANSITION');r.closureEvidence=reference(input.evidenceRef);r.status='CLOSED';
   }else fail(400,'INVALID_ACTION');
   r.history.push({action:input.action,adminId:a.adminId,at:clock()});return persist(tx,a,r,input.action,old);
  }
 };
}
