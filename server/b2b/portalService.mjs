import {randomBytes,createHash,createHmac} from 'node:crypto';
import {normalizeEmail,issueVerificationToken} from './emailVerification.mjs';
import {normalizeCompany,normalizeOffer,canPublishOffer,canCreateEnquiry} from './domain.mjs';

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

export function createB2bPortalService({repository,passwordHasher,mailer,catalogue,adminUserIds=[],now=()=>Date.now()}) {
  const crops=new Map(catalogue.map(c=>[c.id,c]));
  if(!crops.size||new Set(adminUserIds).size!==adminUserIds.length||adminUserIds.some(n=>!Number.isSafeInteger(n)||n<1))throw Error('B2B_PORTAL_CONFIGURATION');
  const admins=new Set(adminUserIds);
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
    id(row.userId);const c=company(row);
    return {user:{id:row.userId,email:row.email},company:c,role:row.role,platformAdmin:admins.has(row.userId)};
  };
  const withActor=(token,work)=>repository.transaction(async tx=>work(tx,await actor(tx,token)));
  const editCompany=a=>{if(a.role!=='COMPANY_ADMIN')fail(403,'COMPANY_ADMIN_REQUIRED');};
  const verified=a=>{if(a.company.status!=='VERIFIED')fail(403,'COMPANY_APPROVAL_REQUIRED');};
  const platform=a=>{if(!a.platformAdmin)fail(403,'PLATFORM_ADMIN_REQUIRED');};
  const audit=(tx,a,action,entityType,entityId)=>tx.appendAudit({actorUserId:a.user.id,companyId:a.company.id,action,entityType,entityId:String(entityId)});
  const checkVersion=(actual,expected)=>{if(actual!==version(expected))fail(409,'RELOAD_REQUIRED');};
  const profileInput=input=>{
    if(!input||typeof input!=='object'||Array.isArray(input)||input.authorityConfirmed!==true)fail(400,'INVALID_REQUEST');
    const address=input.registeredAddress;
    if(!address||typeof address!=='object'||Array.isArray(address)||!/^[A-Z]{2}$/.test(address.country??''))fail(400,'INVALID_REQUEST');
    if(!Array.isArray(input.roles)||!input.roles.length||input.roles.length>3||input.roles.some(r=>!['BUYER','SELLER','PRODUCER'].includes(r))||new Set(input.roles).size!==input.roles.length)fail(400,'INVALID_REQUEST');
    if(!Array.isArray(input.speciesIds)||input.speciesIds.length>100||input.speciesIds.some(c=>!crops.has(c))||new Set(input.speciesIds).size!==input.speciesIds.length)fail(400,'INVALID_REQUEST');
    return {contactName:text(input.contactName,100,true),contactRole:text(input.contactRole??'',80),phone:text(input.phone??'',50),
      vat:text(input.vat??'',50),registeredAddress:{street:text(address.street,200,true),city:text(address.city,100,true),postalCode:text(address.postalCode,20,true),country:address.country},
      roles:input.roles,speciesIds:input.speciesIds,authorityConfirmed:true};
  };
  const offerInput=input=>{
    const normalized=normalizeOffer(input);
    if(!crops.has(normalized.cropId)||normalized.quantity>1e9||Math.abs(normalized.quantity*1000-Math.round(normalized.quantity*1000))>1e-5||
      (normalized.priceAmount!=null&&(normalized.priceAmount>1e9||Math.abs(normalized.priceAmount*100-Math.round(normalized.priceAmount*100))>1e-5)))fail(400,'INVALID_REQUEST');
    if(!['SOWING_STATUS_UNKNOWN','CERTIFIED_SOWING','NON_CERTIFIED_SOWING'].includes(input.seedCategory)||!/^[A-Z]{2}$/.test(input.originCountry??''))fail(400,'INVALID_REQUEST');
    const date=input.validUntil,parsed=new Date(date+'T00:00:00Z');
    if(typeof date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(parsed.getTime())||parsed.toISOString().slice(0,10)!==date||date<new Date(now()).toISOString().slice(0,10)||parsed.getTime()>now()+366*86400000)fail(400,'INVALID_REQUEST');
    return {cropId:normalized.cropId,quantity:normalized.quantity,unit:normalized.unit,priceAmount:normalized.priceAmount??null,
      seedCategory:input.seedCategory,originCountry:input.originCountry,validUntil:date};
  };
  const ownedOffer=async(tx,a,offerId)=>{
    const offer=await tx.offerForUpdate(id(offerId));
    if(!offer||offer.companyId!==a.company.id)fail(404,'NOT_FOUND');return offer;
  };
  const participant=async(tx,a,enquiryId)=>{
    const item=await tx.enquiryForUpdate(id(enquiryId));
    if(!item||![item.buyerCompanyId,item.sellerCompanyId].includes(a.company.id))fail(404,'NOT_FOUND');return item;
  };
  return {
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
      try{await mailer.sendVerification({email:user.email,userId:user.id,token:issued.token});}catch{/* Never log credentials or retry an unknown delivery. */}
      return {status:'REQUEST_ACCEPTED'};
    },
    me:token=>withActor(token,async(_tx,a)=>({...a,csrfToken:csrfForSession(token)})),
    logout:token=>withActor(token,async(tx,a)=>{await tx.revokeSession(sessionHash(token));await audit(tx,a,'LOGOUT','user',a.user.id);return {status:'SIGNED_OUT'};}),
    catalogue:token=>withActor(token,async()=>({items:catalogue})),
    saveProfile:(token,input)=>withActor(token,async(tx,a)=>{
      editCompany(a);checkVersion(a.company.version,input.version);
      const identity=normalizeCompany(input.company),profile=profileInput(input.profile);
      await tx.saveProfile({companyId:a.company.id,legalName:identity.legalName,country:identity.registrationCountry,number:identity.registrationNumber,profile,version:input.version});
      await audit(tx,a,'COMPANY_PROFILE_UPDATED','company',a.company.id);return {status:'PENDING_REVIEW'};
    }),
    reviewQueue:(token,input)=>withActor(token,async(tx,a)=>{
      platform(a);const rows=await tx.reviewQueue(cursor(input.after));
      return {items:rows.slice(0,50).map(company),next:rows.length>50?rows[49].companyId:null};
    }),
    reviewCompany:(token,input)=>withActor(token,async(tx,a)=>{
      platform(a);const companyId=id(input.companyId);if(companyId===a.company.id)fail(403,'SELF_APPROVAL_FORBIDDEN');
      if(!['VERIFIED','MORE_INFO','REJECTED'].includes(input.status))fail(400,'INVALID_REQUEST');
      const reason=text(input.reason,100,true),row=await tx.companyForReview(companyId);if(!row)fail(404,'NOT_FOUND');
      checkVersion(row.version,input.version);
      if(input.status==='VERIFIED')profileInput(parseProfile(row.profile));
      await tx.decideCompany({companyId,status:input.status,version:input.version});
      await tx.appendAudit({actorUserId:a.user.id,companyId,action:'COMPANY_'+input.status,entityType:'company_review',entityId:JSON.stringify({version:input.version}).slice(0,100)});
      // Store the bounded review reason as an auditable event without exposing it in the marketplace.
      await tx.appendAudit({actorUserId:a.user.id,companyId,action:'REVIEW_REASON',entityType:'review_reason',entityId:reason.slice(0,100)});
      return {status:input.status};
    }),
    offers:(token,input)=>withActor(token,async(tx,a)=>{
      const own=input.own===true;if(!own)verified(a);
      const result=page(await tx.listOffers({companyId:a.company.id,own,after:cursor(input.after)}));
      return {...result,items:result.items.map(o=>({...o,species:crops.get(o.cropId)??null}))};
    }),
    saveOffer:(token,input)=>withActor(token,async(tx,a)=>{
      editCompany(a);verified(a);const content=offerInput(input);
      if(input.id!=null){const old=await ownedOffer(tx,a,input.id);checkVersion(old.version,input.version);if(old.status!=='DRAFT')fail(409,'DRAFT_REQUIRED');}
      const offerId=id(await tx.saveOffer({...content,companyId:a.company.id,id:input.id??null,version:input.version??0}));
      await audit(tx,a,'OFFER_SAVED','offer',offerId);return {id:offerId};
    }),
    publishOffer:(token,input)=>withActor(token,async(tx,a)=>{
      if(!canPublishOffer({companyStatus:a.company.status,memberRole:a.role}))fail(403,'COMPANY_APPROVAL_REQUIRED');
      const offer=await ownedOffer(tx,a,input.id);checkVersion(offer.version,input.version);
      if(offer.status!=='DRAFT'||offer.validUntil<new Date(now()).toISOString().slice(0,10))fail(409,'VALID_DRAFT_REQUIRED');
      await tx.setOfferStatus({id:offer.id,companyId:a.company.id,status:'PUBLISHED',version:input.version});
      await audit(tx,a,'OFFER_PUBLISHED','offer',offer.id);return {status:'PUBLISHED'};
    }),
    closeOffer:(token,input)=>withActor(token,async(tx,a)=>{
      editCompany(a);const offer=await ownedOffer(tx,a,input.id);checkVersion(offer.version,input.version);
      if(offer.status==='CLOSED')fail(409,'ALREADY_CLOSED');
      await tx.setOfferStatus({id:offer.id,companyId:a.company.id,status:'CLOSED',version:input.version});
      await audit(tx,a,'OFFER_CLOSED','offer',offer.id);return {status:'CLOSED'};
    }),
    sendEnquiry:(token,input)=>withActor(token,async(tx,a)=>{
      verified(a);const offer=await tx.offerForUpdate(id(input.offerId));
      if(!offer||offer.status!=='PUBLISHED'||offer.companyStatus!=='VERIFIED'||offer.validUntil<new Date(now()).toISOString().slice(0,10))fail(404,'NOT_FOUND');
      if(!canCreateEnquiry({companyStatus:a.company.status,memberRole:a.role,buyerCompanyId:a.company.id,sellerCompanyId:offer.companyId}))fail(403,'ENQUIRY_FORBIDDEN');
      const body=text(input.body,2000,true),enquiryId=id(await tx.createEnquiry({offerId:offer.id,companyId:a.company.id,userId:a.user.id}));
      await tx.insertMessage({enquiryId,userId:a.user.id,companyId:a.company.id,body});
      await audit(tx,a,'ENQUIRY_CREATED','enquiry',enquiryId);return {id:enquiryId};
    }),
    enquiries:(token,input)=>withActor(token,async(tx,a)=>page(await tx.listEnquiries({companyId:a.company.id,after:cursor(input.after)}))),
    messages:(token,input)=>withActor(token,async(tx,a)=>{await participant(tx,a,input.id);return page(await tx.enquiryMessages({enquiryId:input.id,after:cursor(input.after)}));}),
    reply:(token,input)=>withActor(token,async(tx,a)=>{
      verified(a);const item=await participant(tx,a,input.id);if(item.status==='CLOSED')fail(409,'ENQUIRY_CLOSED');
      const body=text(input.body,2000,true);await tx.insertMessage({enquiryId:item.id,userId:a.user.id,companyId:a.company.id,body});
      if(a.company.id===item.sellerCompanyId)await tx.setEnquiryStatus({id:item.id,status:'REPLIED'});
      await audit(tx,a,'ENQUIRY_REPLY','enquiry',item.id);return {status:'SAVED'};
    }),
    closeEnquiry:(token,input)=>withActor(token,async(tx,a)=>{await participant(tx,a,input.id);await tx.setEnquiryStatus({id:input.id,status:'CLOSED'});await audit(tx,a,'ENQUIRY_CLOSED','enquiry',input.id);return {status:'CLOSED'};})
  };
}
