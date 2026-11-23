import {stageCompanyDecision} from './companyDecisionNotifications.mjs';
import {mailLanguage} from './messageLanguage.mjs';
import {normalizeListingSpecifications,readListingSpecifications} from './listingSpecifications.mjs';
import {PUBLIC_PREVIEW_VERSION,safePreviewText} from './publicPreview.mjs';
import {marketplaceEntitled} from './marketplaceEntitlement.mjs';
import {normalizeBuyerFilters} from './buyerOfferFilters.mjs';
import {offerCountries,offerCurrencies} from './offerOptions.mjs';
import {currentLegalRegistry} from './legalAcceptance.mjs';
import {randomBytes,createHash,createHmac} from 'node:crypto';
import {normalizeEmail,issueVerificationToken,issueResetToken,hashResetToken} from './emailVerification.mjs';
import {normalizeCompany,normalizeOffer,canPublishOffer,canCreateEnquiry} from './domain.mjs';
import {marketplaceOperation} from './marketplaceNotifications.mjs';

export const SESSION_SECONDS=8*60*60;
export const SESSION_COOKIE='__Host-seedtrade_b2b_session';
export const sessionHash=token=>createHash('sha256').update(token).digest('hex');
export const csrfForSession=token=>createHmac('sha256',token).update('seedtrade-b2b-csrf-v1').digest('hex');
export class B2bError extends Error { constructor(status,code){super(code);this.status=status;} }
const fail=(status,code)=>{throw new B2bError(status,code);};
const id=value=>{if(!Number.isSafeInteger(value)||value<1)fail(400,'INVALID_REQUEST');return value;};
const version=value=>{if(!Number.isSafeInteger(value)||value<0)fail(400,'INVALID_REQUEST');return value;};
const cursor=value=>value==null?0:version(value);
const text=(value,max,required=false)=>{
  if(typeof value!=='string')fail(400,'INVALID_REQUEST');
  const result=value.trim();if(result.length>max||(required&&!result)||/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(result))fail(400,'INVALID_REQUEST');
  return result;
};
const parseProfile=value=>value==null?null:typeof value==='string'?JSON.parse(value):value;
const company=row=>({id:id(row.companyId),legalName:row.legalName,country:row.country,number:row.number,
  status:row.status,version:version(row.version),profile:parseProfile(row.profile),
  reviewReason:['MORE_INFO','REJECTED'].includes(row.status)&&typeof row.reviewReason==='string'?row.reviewReason.slice(0,100):null});
const page=rows=>({items:rows.slice(0,50),next:rows.length>50?rows[49].id:null});

export function createB2bPortalService({repository,passwordHasher,mailer,catalogue=[],memberOnly=false,communications=false,adminUserIds=[],reviewActor=null,notifications=null,trading=null,listingDelivery=null,enquiryConfirmation=null,decisionNotifications=null,now=()=>Date.now()}) {
  const crops=new Map(catalogue.map(c=>[c.id,c]));
  if((!memberOnly&&!crops.size)||new Set(adminUserIds).size!==adminUserIds.length||adminUserIds.some(n=>!Number.isSafeInteger(n)||n<1))throw Error('B2B_PORTAL_CONFIGURATION');
  const admins=new Set(adminUserIds);
  const resetMail=new Set();
  let dummy;
  const credentials=async(input,allowUnverified=false)=>{
    let email;try{email=normalizeEmail(input.email);}catch{fail(401,'INVALID_CREDENTIALS');}
    if(typeof input.password!=='string'||input.password.length<12||input.password.length>1024)fail(401,'INVALID_CREDENTIALS');
    const user=await repository.transaction(tx=>tx.findLogin(email));
    // Keep missing-user and wrong-password work comparable without holding a DB connection during scrypt.
    dummy??=passwordHasher.hash(randomBytes(32).toString('hex'));
    const dummyHash=await dummy;
    const matches=await passwordHasher.verify(input.password,user?.passwordHash??dummyHash);
    if(!matches||!user||(!allowUnverified&&!user.verifiedAt))fail(401,'INVALID_CREDENTIALS');
    id(user.id);return user;
  };
  const actor=async(tx,token)=>{
    if(typeof token!=='string'||!/^[a-f0-9]{64}$/.test(token))fail(401,'SIGN_IN_REQUIRED');
    const row=await tx.sessionContext(sessionHash(token));
    if(!row||!row.verifiedAt)fail(401,'SIGN_IN_REQUIRED');
    if(!['MEMBER','COMPANY_ADMIN'].includes(row.role))fail(403,'MEMBERSHIP_REQUIRED');
    id(row.userId);const c=company(row);if((c.profile?.accessSuspended===true||['CLOSED','DELETED'].includes(c.profile?.accountState)))fail(403,'COMPANY_ACCESS_SUSPENDED');
    return {user:{id:row.userId,email:row.email},company:c,role:row.role,platformAdmin:admins.has(row.userId)};
  };
  const withActor=(token,work)=>repository.transaction(async tx=>work(tx,await actor(tx,token)));
  const withReviewer=(token,work)=>reviewActor?repository.transaction(async tx=>work(tx,await reviewActor(tx,token))):withActor(token,work);
  const editCompany=a=>{if(a.role!=='COMPANY_ADMIN')fail(403,'COMPANY_ADMIN_REQUIRED');};
  const verified=a=>{if(!marketplaceEntitled(a,'VIEW_FULL_OFFERS'))fail(403,'COMPANY_APPROVAL_REQUIRED');};
  const platform=a=>{if(!a.platformAdmin)fail(403,'PLATFORM_ADMIN_REQUIRED');};
  const audit=(tx,a,action,entityType,entityId)=>tx.appendAudit({actorUserId:a.user.id,companyId:a.company.id,action,entityType,entityId:String(entityId)});
  const checkVersion=(actual,expected)=>{if(actual!==version(expected))fail(409,'RELOAD_REQUIRED');};
  const profileInput=input=>{
    if(!input||typeof input!=='object'||Array.isArray(input)||input.authorityConfirmed!==true||input.authorityDocumentId!==currentLegalRegistry.documents.authority.id)fail(400,'INVALID_REQUEST');
    const address=input.registeredAddress;
    if(!address||typeof address!=='object'||Array.isArray(address)||!/^[A-Z]{2}$/.test(address.country??''))fail(400,'INVALID_REQUEST');
    if(!Array.isArray(input.speciesIds)||input.speciesIds.length>100||input.speciesIds.some(c=>!crops.has(c))||new Set(input.speciesIds).size!==input.speciesIds.length)fail(400,'INVALID_REQUEST');
    return {contactName:text(input.contactName,100,true),contactRole:text(input.contactRole??'',80),phone:text(input.phone??'',50),
      vat:text(input.vat??'',50),registeredAddress:{street:text(address.street,200,true),city:text(address.city,100,true),postalCode:text(address.postalCode,20,true),country:address.country},
      roles:Array.isArray(input.roles)?input.roles.filter(r=>['BUYER','SELLER','PRODUCER'].includes(r)):[],speciesIds:input.speciesIds,authorityConfirmed:true,authorityDocumentId:currentLegalRegistry.documents.authority.id};
  };
  const offerInput=input=>{
    const normalized=normalizeOffer(input);
    if(!crops.has(normalized.cropId)||normalized.quantity>1e9||Math.abs(normalized.quantity*1000-Math.round(normalized.quantity*1000))>1e-5||
      (normalized.priceAmount!=null&&(normalized.priceAmount>1e9||Math.abs(normalized.priceAmount*100-Math.round(normalized.priceAmount*100))>1e-5)))fail(400,'INVALID_REQUEST');
    if(!['SOWING_STATUS_UNKNOWN','CERTIFIED_SOWING','NON_CERTIFIED_SOWING'].includes(input.seedCategory)||!offerCountries.includes(input.originCountry))fail(400,'INVALID_REQUEST');
    const date=input.validUntil,parsed=new Date(date+'T00:00:00Z');
    if(typeof date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(parsed.getTime())||parsed.toISOString().slice(0,10)!==date||date<new Date(now()).toISOString().slice(0,10)||parsed.getTime()>now()+366*86400000)fail(400,'INVALID_REQUEST');
    const optionalText=(value,max)=>text(value??'',max);
    const currency=input.currency??'EUR';
    if(!offerCurrencies.includes(currency))fail(400,'INVALID_REQUEST');
    const availability=input.availability??'AVAILABLE_NOW';
    if(!['AVAILABLE_NOW','AVAILABLE_FROM'].includes(availability))fail(400,'INVALID_REQUEST');
    const availableFrom=availability==='AVAILABLE_FROM'?input.availableFrom:null;
    if(availableFrom!=null){const d=new Date(availableFrom+'T00:00:00Z');if(typeof availableFrom!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(availableFrom)||!Number.isFinite(d.getTime())||d.toISOString().slice(0,10)!==availableFrom||availableFrom>date)fail(400,'INVALID_REQUEST');}
    if(availability==='AVAILABLE_FROM'&&!availableFrom)fail(400,'INVALID_REQUEST');
    const percent=value=>{if(value==null||value==='')return null;if(typeof value!=='number'||!Number.isFinite(value)||value<0||value>100||Math.abs(value*100-Math.round(value*100))>1e-6)fail(400,'INVALID_REQUEST');return value;};
    return {cropId:normalized.cropId,quantity:normalized.quantity,unit:normalized.unit,priceAmount:normalized.priceAmount??null,currency,
      seedCategory:input.seedCategory,certificationClass:optionalText(input.certificationClass,80),originCountry:input.originCountry,validUntil:date,
      details:{...normalizeListingSpecifications(input),variety:optionalText(input.variety,128),availability,availableFrom,germinationPercent:percent(input.germinationPercent),purityPercent:percent(input.purityPercent),moisturePercent:percent(input.moisturePercent),qualitySpecifications:optionalText(input.qualitySpecifications,2000),commercialInformation:optionalText(input.commercialInformation,2000)}};
  };
  const publicOffer=o=>{
    const d=parseProfile(o.details)??{};
    const string=(v,max)=>typeof v==='string'?v.slice(0,max):'';
    const percent=v=>typeof v==='number'&&Number.isFinite(v)&&v>=0&&v<=100?v:null;
    return {id:o.id,cropId:o.cropId,species:crops.get(o.cropId),companyName:o.companyName,companyCountry:o.companyCountry,
      quantity:Number(o.quantity),unit:o.unit,priceAmount:o.priceAmount==null?null:Number(o.priceAmount),currency:o.currency,
      seedCategory:o.seedCategory,certificationClass:d.productType==='COMMODITY'?'':string(o.certificationClass,80),originCountry:o.originCountry,validUntil:o.validUntil,
      details:{...readListingSpecifications(d),variety:string(d.variety,128),availability:d.availability==='AVAILABLE_FROM'?'AVAILABLE_FROM':'AVAILABLE_NOW',
        availableFrom:typeof d.availableFrom==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(d.availableFrom)?d.availableFrom:null,
        germinationPercent:percent(d.germinationPercent),purityPercent:percent(d.purityPercent),moisturePercent:percent(d.moisturePercent),
        qualitySpecifications:string(d.qualitySpecifications,2000),commercialInformation:string(d.commercialInformation,2000)}};
  };
  const ownedOffer=async(tx,a,offerId)=>{
    const offer=await tx.offerForUpdate(id(offerId));
    if(!offer||offer.companyId!==a.company.id)fail(404,'NOT_FOUND');return offer;
  };
  const participant=async(tx,a,enquiryId)=>{
    const item=await tx.enquiryForUpdate(id(enquiryId));
    if(!item||![item.buyerCompanyId,item.sellerCompanyId].includes(a.company.id))fail(404,'NOT_FOUND');    if(enquiryConfirmation){const r=await tx.tradingRecord(item.id);if(r?.enquiryConfirmation?.state!=="CONFIRMED"&&r?.respondingCompanyId!==a.company.id)fail(404,'NOT_FOUND');}
return item;
  };
  const previousOperation=async(tx,operation)=>{
    const old=await tx.marketplaceOperation(operation);
    if(old&&old.fingerprint!==operation.fingerprint)fail(409,'IDEMPOTENCY_CONFLICT');
    return old;
  };
  const enquiryView=(item,a)=>{
    const snapshot=parseProfile(item.snapshot)??{},current=parseProfile(item.offerDetails)??{};
    return {...item,listingDirection:snapshot.listingDirection??null,productType:snapshot.productType??null,listingOwnerRole:snapshot.listingDirection==='BUY_REQUEST'?'BUYER':'SELLER',requestedQuantity:snapshot.requestedQuantity??null,requestedUnit:snapshot.requestedUnit??null,
      variety:typeof snapshot.variety==='string'?snapshot.variety:current.variety??'',species:crops.get(snapshot.cropId??item.cropId)??null,
      direction:item.buyerCompanyId===a.company.id?'SENT':'INBOX',canReply:a.company.status==='VERIFIED'&&item.status!=='CLOSED',
      initialMessage:typeof item.initialMessage==='string'?item.initialMessage.slice(0,180):'',
      snapshot:undefined,offerDetails:undefined};
  };
  const enqueue=async(tx,a,operation,enquiryId,messageId,snapshot={})=>{
    const context=await tx.marketplaceNotificationContext(enquiryId,operation.kind),initial=parseProfile(context.snapshot)??{};
    const notificationId=id(await tx.enqueueMarketplaceNotification({...operation,actorCompanyId:a.company.id,
      enquiryId,messageId,recipientUserId:context.recipientUserId,recipientCompanyId:context.recipientCompanyId,
      recipientEmail:context.recipientEmail,payload:{offerId:context.offerId,enquiryId,
        product:crops.get(context.cropId)?.name??context.cropId,quantity:Number(context.quantity),unit:context.unit,
        language:initial.buyerLanguage??snapshot.buyerLanguage??'EN',listingDirection:initial.listingDirection??snapshot.listingDirection??null,productType:initial.productType??snapshot.productType??null,...snapshot},
      status:operation.kind==='BUYER_REPLY'?'SKIPPED':context.recipientEmail?'PENDING':'BLOCKED'}));
    return notificationId;
  };
  const afterCommit=async(work)=>{
    const result=await work;
    const {notificationId,notificationState,confirmationToken,...response}=result;
    if(enquiryConfirmation&&confirmationToken){const sent=await enquiryConfirmation.deliverConfirmation(response.id,confirmationToken);response.confirmationMailStatus=sent.status;}
    if(enquiryConfirmation&&response.operatorNotificationPending){delete response.operatorNotificationPending;response.operatorMailStatus=(await enquiryConfirmation.deliverOperator(response.id)).status;}
    if(notificationId) {
      let status=notificationState;
      if(!status||status==='PENDING')try{status=(await notifications.deliver(notificationId)).status;}catch{status='UNKNOWN';}
      if(communications)response.emailNotificationConfirmed=status==='SKIPPED'?null:status==='ACCEPTED';
    }
    return response;
  };
  return {
    ...(enquiryConfirmation?{
      enquiryConfirmationSummary:(token,input)=>withActor(token,(tx,a)=>enquiryConfirmation.view(tx,a,input)),
      confirmEnquiry:(token,input)=>afterCommit(withActor(token,(tx,a)=>enquiryConfirmation.confirm(tx,a,input)))
    }:{}),
    ...(trading?{
      tradingPolicy:token=>withActor(token,async(tx,a)=>{verified(a);return trading.policy;}),
      transactions:(token,input)=>withActor(token,async(tx,a)=>{verified(a);return trading.list(tx,a,input);}),
      transactionDetail:(token,input)=>withActor(token,async(tx,a)=>{verified(a);return trading.detail(tx,a,input);}),
      transactionAction:(token,input)=>withActor(token,async(tx,a)=>{verified(a);return trading.action(tx,a,input);}),
      listingPreference:token=>withActor(token,async(tx,a)=>trading.preference(tx,a,{},false)),
      saveListingPreference:(token,input)=>withActor(token,async(tx,a)=>trading.preference(tx,a,input,true))
    }:{}),
    drainResetMail:()=>Promise.allSettled([...resetMail]),
    async requestPasswordReset(input) {
      const accepted={status:'REQUEST_ACCEPTED'};
      let email;try{email=normalizeEmail(input.email);}catch{return accepted;}
      const issued=issueResetToken({now:now()});
      const user=await repository.transaction(async tx=>{
        // Serialize issue/replace/login on the existing user row.
        const current=await tx.findLogin(email,true);
        if(!current?.verifiedAt)return null;
        await tx.revokeVerificationTokens(current.id);
        await tx.insertEmailVerification({userId:current.id,tokenHash:issued.tokenHash,expiresAt:new Date(issued.expiresAt)});
        await tx.appendAudit({actorUserId:current.id,companyId:null,action:'PASSWORD_RESET_REQUESTED',entityType:'user',entityId:String(current.id)});
        return current;
      });
      // SMTP outcome and latency must not disclose whether an account exists.
      // Existing bounded SMTP adapter handles the single attempt; no retries or
      // raw error/token logging. The caller always receives the same response.
      if(user){
        const delivery=Promise.resolve().then(()=>mailer.sendPasswordReset({email:user.email,userId:user.id,token:issued.token,uiLanguage:input.uiLanguage})).catch(()=>{});
        resetMail.add(delivery);delivery.finally(()=>resetMail.delete(delivery));
      }
      return accepted;
    },
    async resetPassword(input) {
      const userId=id(input.userId);let tokenHash;
      try{tokenHash=hashResetToken(input.token);}catch{fail(400,'INVALID_OR_EXPIRED');}
      if(typeof input.password!=='string'||input.password.length<12||input.password.length>1024)fail(400,'INVALID_REQUEST');
      const passwordHash=await passwordHasher.hash(input.password);
      return repository.transaction(async tx=>{
        const user=await tx.findResetUser(userId);
        if(!user?.verifiedAt||!await tx.consumeEmailVerification({userId,tokenHash}))fail(400,'INVALID_OR_EXPIRED');
        await tx.replacePassword({userId,passwordHash});
        await tx.revokeVerificationTokens(userId);
        await tx.appendAudit({actorUserId:userId,companyId:null,action:'PASSWORD_RESET_COMPLETED',entityType:'user',entityId:String(userId)});
        return {status:'PASSWORD_RESET'};
      });
    },
    async login(input,previousToken) {
      const user=await credentials(input),token=randomBytes(32).toString('hex');
      return repository.transaction(async tx=>{
        const current=await tx.findLogin(user.email,true);
        if(!current?.verifiedAt||current.id!==user.id||current.passwordHash!==user.passwordHash)fail(401,'INVALID_CREDENTIALS');
        if(typeof previousToken==='string'&&/^[a-f0-9]{64}$/.test(previousToken))await tx.revokeSession(sessionHash(previousToken));
        await tx.insertSession({tokenHash:sessionHash(token),userId:user.id,expiresAt:new Date(now()+SESSION_SECONDS*1000)});
        const a=await actor(tx,token);await audit(tx,a,'LOGIN','user',user.id);
        return {...a,sessionToken:token,csrfToken:csrfForSession(token)};
      });
    },
    async resendVerification(input) {
      let user;try{user=await credentials(input,true);}catch(error){if(error instanceof B2bError&&error.status===401)return {status:'REQUEST_ACCEPTED'};throw error;}
      if(user.verifiedAt)return {status:'REQUEST_ACCEPTED'};
      const issued=issueVerificationToken({now:now()});
      await repository.transaction(async tx=>{
        const current=await tx.findLogin(user.email,true);
        if(!current||current.verifiedAt||current.passwordHash!==user.passwordHash)fail(409,'RETRY_REQUIRED');
        await tx.revokeVerificationTokens(user.id);
        await tx.insertEmailVerification({userId:user.id,tokenHash:issued.tokenHash,expiresAt:new Date(issued.expiresAt)});
        await tx.appendAudit({actorUserId:user.id,companyId:null,action:'EMAIL_VERIFICATION_REQUESTED',entityType:'user',entityId:String(user.id)});
      });
      try{await mailer.sendVerification({email:user.email,userId:user.id,token:issued.token,uiLanguage:input.uiLanguage});}catch{/* Never log credentials or retry an unknown delivery. */}
      return {status:'REQUEST_ACCEPTED'};
    },
    me:token=>withActor(token,async(_tx,a)=>({...a,csrfToken:csrfForSession(token)})),
    logout:token=>withActor(token,async(tx,a)=>{await tx.revokeSession(sessionHash(token));await audit(tx,a,'LOGOUT','user',a.user.id);return {status:'SIGNED_OUT'};}),
    catalogue:token=>withActor(token,async()=>({items:catalogue})),
    saveProfile:(token,input)=>withActor(token,async(tx,a)=>{
      editCompany(a);checkVersion(a.company.version,input.version);
      const identity=normalizeCompany(input.company),profile={...(a.company.profile??{}),...profileInput(input.profile),uiLanguage:mailLanguage(input.uiLanguage??a.company.profile?.uiLanguage)};
      await tx.saveProfile({companyId:a.company.id,legalName:identity.legalName,country:identity.registrationCountry,number:identity.registrationNumber,profile,version:input.version});
      await audit(tx,a,'COMPANY_PROFILE_UPDATED','company',a.company.id);
      await audit(tx,a,'REPRESENTATIVE_AUTHORITY_RECONFIRMED','legal_snapshot',currentLegalRegistry.documents.authority.id);
      return {status:'PENDING_REVIEW'};
    }),
    reviewQueue:async(token,input)=>{const result=await withReviewer(token,async(tx,a)=>{
      platform(a);const rows=await tx.reviewQueue(cursor(input.after));
      return {items:rows.slice(0,50).map(row=>company(row)),next:rows.length>50?rows[49].companyId:null};
    });if(decisionNotifications)try{await decisionNotifications.drain();}catch{}return result;},
    reviewCompany:async(token,input)=>{const result=await withReviewer(token,async(tx,a)=>{
      platform(a);const companyId=id(input.companyId);if(a.adminId){if(a.historicalRecordRestrictions?.includes(companyId))fail(403,'HISTORICAL_RECORD_PROTECTED');}else if(companyId===a.company.id)fail(403,'SELF_APPROVAL_FORBIDDEN');
      if(!(a.adminId?['VERIFIED','REJECTED']:['VERIFIED','MORE_INFO','REJECTED']).includes(input.status))fail(400,'INVALID_REQUEST');
      const reason=text(input.reason??'',100,!a.adminId),row=await tx.companyForReview(companyId);if(!row)fail(404,'NOT_FOUND');
      checkVersion(row.version,input.version);
      if(decisionNotifications&&['CLOSED','DELETED'].includes(parseProfile(row.profile)?.accountState))fail(403,'COMPANY_ACCESS_CLOSED');
      if(a.adminId&&row.status===input.status)return {status:row.status,alreadyRecorded:true,notificationIds:[]};
      if(input.status==='VERIFIED'){normalizeCompany({legalName:row.legalName,registrationCountry:row.country,registrationNumber:row.number});const p=parseProfile(row.profile);if(p?.accessSuspended===true||p?.accountState==='CLOSED')fail(403,'COMPANY_ACCESS_SUSPENDED');profileInput(p);}
      const staged=decisionNotifications?await stageCompanyDecision(tx,{company:row,status:input.status,adminId:a.adminId,passwordHasher,now}):{ids:[]};
      await tx.decideCompany({companyId,status:input.status,version:input.version,...(staged.rejectedProfile?{rejectedProfile:staged.rejectedProfile}:{})});
      await tx.appendAudit({actorUserId:a.adminId?null:a.user.id,...(a.adminId?{adminActorId:a.adminId}:{}),companyId,action:'COMPANY_'+input.status,entityType:'company_review',entityId:JSON.stringify({version:input.version}).slice(0,100)});
      // Store the bounded review reason as an auditable event without exposing it in the marketplace.
      if(reason)await tx.appendAudit({actorUserId:a.adminId?null:a.user.id,...(a.adminId?{adminActorId:a.adminId}:{}),companyId,action:'REVIEW_REASON',entityType:'review_reason',entityId:reason.slice(0,100)});
      return {status:input.status,...(decisionNotifications?{notificationIds:staged.ids,reRegistrationReady:!!staged.rejectedProfile}:{})};
    });if(decisionNotifications&&result.notificationIds?.length){try{const sent=await decisionNotifications.deliverMany(result.notificationIds);result.notificationStatus=sent.every(x=>x.status==='fulfilled'&&x.value.status==='SENT')?'SENT':'QUEUED_OR_REVIEW_REQUIRED';}catch{result.notificationStatus='QUEUED_OR_REVIEW_REQUIRED';}}return result;},
    offers:(token,input)=>withActor(token,async(tx,a)=>{
      const own=input.own===true;if(!own)verified(a);
      const filters=own?{}:normalizeBuyerFilters(input,crops);
      const result=page(await tx.listOffers({companyId:a.company.id,own,after:cursor(input.after),filters,...(!own?{eligibleCropIds:[...crops.keys()]}:{})}));
      return {...result,items:result.items.map(o=>own?({...o,quantity:Number(o.quantity),priceAmount:o.priceAmount==null?null:Number(o.priceAmount),details:parseProfile(o.details)??{},species:crops.get(o.cropId)??null}):publicOffer(o))};
    }),
    offerDetail:(token,input)=>withActor(token,async(tx,a)=>{
      verified(a);const own=await tx.offerForUpdate(id(input.id));if(own?.companyId===a.company.id){if(own.status!=='PUBLISHED'||own.validUntil<new Date(now()).toISOString().slice(0,10))fail(404,'NOT_FOUND');return {offer:{...publicOffer({...own,companyName:a.company.legalName,companyCountry:a.company.country}),isOwn:true}};}const row=await tx.publishedOffer({id:id(input.id),companyId:a.company.id,eligibleCropIds:[...crops.keys()]});
      if(!row)fail(404,'NOT_FOUND');return {offer:publicOffer(row)};
    }),
    saveOffer:(token,input)=>withActor(token,async(tx,a)=>{
      editCompany(a);verified(a);const content=offerInput(input);
      if(input.publicPreviewConfirmed!=null&&typeof input.publicPreviewConfirmed!=='boolean')fail(400,'INVALID_REQUEST');
      if(input.publicPreviewConfirmed===true){if(!safePreviewText(content.details.variety)||!safePreviewText(content.certificationClass))fail(400,'INVALID_REQUEST');content.details.publicPreview={version:PUBLIC_PREVIEW_VERSION,confirmedByUserId:a.user.id,confirmedAt:new Date(now()).toISOString()};}
      if(input.id!=null){const old=await ownedOffer(tx,a,input.id);checkVersion(old.version,input.version);if(!['DRAFT','PUBLISHED','CLOSED'].includes(old.status))fail(409,'DRAFT_REQUIRED');}
      const offerId=id(await tx.saveOffer({...content,companyId:a.company.id,id:input.id??null,version:input.version??0}));
      await audit(tx,a,'OFFER_SAVED','offer',offerId);
      if(input.publicPreviewConfirmed===true)await audit(tx,a,'PUBLIC_PREVIEW_CONFIRMED_V1','offer',offerId);return {id:offerId,status:'DRAFT',version:input.id==null?0:input.version+1};
    }),
    publishOffer:async(token,input)=>{const result=await withActor(token,async(tx,a)=>{
      if(!canPublishOffer({companyStatus:a.company.status,memberRole:a.role}))fail(403,'COMPANY_APPROVAL_REQUIRED');
      const offer=await ownedOffer(tx,a,input.id);checkVersion(offer.version,input.version);
      offerInput({...offer,...(parseProfile(offer.details)??{})});
      if(offer.status!=='DRAFT'||offer.validUntil<new Date(now()).toISOString().slice(0,10))fail(409,'VALID_DRAFT_REQUIRED');
      if(trading)await trading.beforePublish(tx,a,offer,input);
      await tx.setOfferStatus({id:offer.id,companyId:a.company.id,status:'PUBLISHED',version:input.version});
      if(trading)await trading.published(tx,a,offer);
      await audit(tx,a,'OFFER_PUBLISHED','offer',offer.id);return {status:'PUBLISHED',id:offer.id,version:offer.version+1};
    });if(trading&&listingDelivery)try{await listingDelivery.drain();}catch{/* Committed outbox remains pending; publication is not lost. */}return result;},
    closeOffer:(token,input)=>withActor(token,async(tx,a)=>{
      editCompany(a);const offer=await ownedOffer(tx,a,input.id);checkVersion(offer.version,input.version);
      if(offer.status==='CLOSED')fail(409,'ALREADY_CLOSED');
      await tx.setOfferStatus({id:offer.id,companyId:a.company.id,status:'CLOSED',version:input.version});
      await audit(tx,a,'OFFER_CLOSED','offer',offer.id);return {status:'CLOSED'};
    }),
    sendEnquiry:(token,input)=>afterCommit(withActor(token,async(tx,a)=>{
      verified(a);const offer=await tx.offerForUpdate(id(input.offerId));
      if(!offer||offer.status!=='PUBLISHED'||offer.companyStatus!=='VERIFIED'||offer.validUntil<new Date(now()).toISOString().slice(0,10)||!crops.has(offer.cropId))fail(404,'NOT_FOUND');
      if(!canCreateEnquiry({companyStatus:a.company.status,memberRole:a.role,buyerCompanyId:a.company.id,sellerCompanyId:offer.companyId}))fail(403,'ENQUIRY_FORBIDDEN');
      const body=text(input.body??'',2000,!enquiryConfirmation),quantity=input.requestedQuantity??(communications?null:Number(offer.quantity)),unit=input.requestedUnit??(communications?null:offer.unit);
      if(typeof quantity!=='number'||!Number.isFinite(quantity)||quantity<=0||quantity>1e9||Math.abs(quantity*1000-Math.round(quantity*1000))>1e-5||!['kg','t'].includes(unit))fail(400,'INVALID_REQUEST');
      const buyerLanguage=input.uiLanguage??'EN';if(!['EN','DE','FR','ES','IT'].includes(buyerLanguage))fail(400,'INVALID_REQUEST');
      if(communications&&!notifications)fail(503,'TEMPORARILY_UNAVAILABLE');
      const content=trading?JSON.stringify({body,quantity,unit,proposedPrice:input.proposedPrice??null,proposedDeliveryTerms:input.proposedDeliveryTerms??null}):input.requestedQuantity==null&&input.requestedUnit==null?body:JSON.stringify({body,quantity,unit});
      const operation=notifications?marketplaceOperation('ENQUIRY',a.user.id,offer.id,content,input.requestId):null;
      if(operation){const old=await previousOperation(tx,operation);if(old){const c=enquiryConfirmation?(await tx.tradingRecord(old.enquiryId))?.enquiryConfirmation:null;return {id:old.enquiryId,notificationId:old.id,notificationState:old.status,...(c?{status:c.state,confirmationMailStatus:c.confirmationMail}:{})};}}
      const enquiryId=id(await tx.createEnquiry({offerId:offer.id,companyId:a.company.id,userId:a.user.id}));
      if(trading)await trading.introduced(tx,a,offer,enquiryId,input);
      const messageId=id(await tx.insertMessage({enquiryId,userId:a.user.id,companyId:a.company.id,body}));
      await audit(tx,a,'ENQUIRY_CREATED','enquiry',enquiryId);
      const details=parseProfile(offer.details)??{};
      const snapshot={listingDirection:details.listingDirection??null,productType:details.productType??null,cropId:offer.cropId,variety:typeof details.variety==='string'?details.variety:'',requestedQuantity:quantity,requestedUnit:unit,buyerLanguage};
      if(enquiryConfirmation){const confirmationToken=await enquiryConfirmation.stage(tx,a,enquiryId,input);const context=await tx.marketplaceNotificationContext(enquiryId,'ENQUIRY');await tx.enqueueMarketplaceNotification({...operation,actorCompanyId:a.company.id,enquiryId,messageId,recipientUserId:null,recipientCompanyId:context.recipientCompanyId,recipientEmail:null,payload:snapshot,status:'SKIPPED'});return {id:enquiryId,status:'PENDING_EMAIL_CONFIRMATION',confirmationToken};}
      return {id:enquiryId,...(operation?{notificationId:await enqueue(tx,a,operation,enquiryId,messageId,snapshot)}:{})};
    })),
    enquiries:(token,input)=>withActor(token,async(tx,a)=>{
      if(input.direction!=null&&!['INBOX','SENT'].includes(input.direction))fail(400,'INVALID_REQUEST');
      const result=page(await tx.listEnquiries({companyId:a.company.id,after:cursor(input.after),direction:input.direction}));
      if(enquiryConfirmation){const items=[];for(const item of result.items){const r=await tx.tradingRecord(item.id);if(r?.enquiryConfirmation?.state==='CONFIRMED'||r?.respondingCompanyId===a.company.id)items.push({...enquiryView(item,a),confirmationStatus:r?.enquiryConfirmation?.state??null});}return {...result,items};}
      return {...result,items:result.items.map(item=>enquiryView(item,a))};
    }),
    messages:(token,input)=>withActor(token,async(tx,a)=>{
      const enquiry=await participant(tx,a,input.id),result=page(await tx.enquiryMessages({enquiryId:input.id,after:cursor(input.after)}));
      const view=enquiryView(enquiry,a);if(enquiryConfirmation){const r=await tx.tradingRecord(enquiry.id);view.confirmationStatus=r?.enquiryConfirmation?.state??null;view.canReply=view.canReply&&view.confirmationStatus==='CONFIRMED';}const request=view.listingDirection==='BUY_REQUEST';
      return {...result,items:result.items.map(m=>({...m,authorSide:m.authorCompanyId===enquiry.buyerCompanyId?(request?'SELLER':'BUYER'):(request?'BUYER':'SELLER')})),enquiry:{...view,...(trading?{transactionAvailable:Boolean(await tx.tradingRecord(enquiry.id))}:{})}};
    }),
    reply:(token,input)=>afterCommit(withActor(token,async(tx,a)=>{
      verified(a);if(communications&&!notifications)fail(503,'TEMPORARILY_UNAVAILABLE');const item=await participant(tx,a,input.id);if(item.status==='CLOSED')fail(409,'ENQUIRY_CLOSED');
      if(enquiryConfirmation&&(await tx.tradingRecord(item.id))?.enquiryConfirmation?.state!=='CONFIRMED')fail(409,'ENQUIRY_CONFIRMATION_REQUIRED');
      const body=text(input.body,2000,true),operation=notifications?marketplaceOperation(a.company.id===item.sellerCompanyId?'SELLER_REPLY':'BUYER_REPLY',a.user.id,item.id,body,input.requestId):null;
      if(operation){const old=await previousOperation(tx,operation);if(old)return {status:'SAVED',notificationId:old.id,notificationState:old.status};}
      const messageId=id(await tx.insertMessage({enquiryId:item.id,userId:a.user.id,companyId:a.company.id,body}));
      if(a.company.id===item.sellerCompanyId)await tx.setEnquiryStatus({id:item.id,status:'REPLIED'});
      await audit(tx,a,'ENQUIRY_REPLY','enquiry',item.id);return {status:'SAVED',...(operation?{notificationId:await enqueue(tx,a,operation,item.id,messageId),notificationState:operation.kind==='BUYER_REPLY'?'SKIPPED':undefined}:{})};
    })),
    closeEnquiry:(token,input)=>withActor(token,async(tx,a)=>{await participant(tx,a,input.id);await tx.setEnquiryStatus({id:input.id,status:'CLOSED'});await audit(tx,a,'ENQUIRY_CLOSED','enquiry',input.id);return {status:'CLOSED'};})
  };
}
