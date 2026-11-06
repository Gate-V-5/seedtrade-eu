// Transactional test double only. Production always uses the existing mysql2 repository.
import {createB2bPasswordHasher} from '../../server/b2b/passwordHasher.mjs';
import {createRegistrationService} from '../../server/b2b/registrationService.mjs';
import {createB2bPortalService} from '../../server/b2b/portalService.mjs';

export function portalFixture() {
  let clock=Date.UTC(2026,10,6,12),state={users:new Map(),companies:new Map(),members:[],tokens:[],sessions:new Map(),offers:new Map(),enquiries:new Map(),messages:[],audit:[],counter:{company:0,user:0,offer:0,enquiry:0,message:0}};
  const mail=[],faults={audit:false};let queue=Promise.resolve();
  const duplicate=()=>{throw Object.assign(Error('synthetic database uniqueness'),{code:'ER_DUP_ENTRY'});};
  const repository={async transaction(work) {
    let release;const previous=queue;queue=new Promise(resolve=>{release=resolve;});await previous;
    const snapshot=structuredClone(state);
    const tx={
      async insertCompany(c){if([...state.companies.values()].some(x=>x.country===c.registrationCountry&&x.number===c.registrationNumber))duplicate();const companyId=++state.counter.company;state.companies.set(companyId,{companyId,legalName:c.legalName,country:c.registrationCountry,number:c.registrationNumber,status:'PENDING',profile:null,version:0});return companyId;},
      async insertUser(u){if([...state.users.values()].some(x=>x.email===u.email))duplicate();const id=++state.counter.user;state.users.set(id,{id,...u,verifiedAt:null});return id;},
      async insertCompanyMember(m){state.members.push(structuredClone(m));},
      async insertEmailVerification(t){state.tokens.push({...structuredClone(t),consumedAt:null});},
      async consumeEmailVerification(t){const token=state.tokens.find(x=>x.userId===t.userId&&x.tokenHash===t.tokenHash&&!x.consumedAt&&x.expiresAt.getTime()>clock);if(!token)return false;token.consumedAt=clock;return true;},
      async markEmailVerified({userId}){state.users.get(userId).verifiedAt=clock;},
      async appendAudit(a){if(faults.audit)throw Error('synthetic private driver details');state.audit.push(structuredClone(a));},
      async findLogin(email){return structuredClone([...state.users.values()].find(u=>u.email===email)??null);},
      async insertSession(s){for(const [key,value]of state.sessions)if(value.userId===s.userId&&value.expiresAt.getTime()<=clock)state.sessions.delete(key);state.sessions.set(s.tokenHash,structuredClone(s));},
      async revokeSession(hash){state.sessions.delete(hash);},
      async sessionContext(hash){const session=state.sessions.get(hash);if(!session||session.expiresAt.getTime()<=clock)return null;const user=state.users.get(session.userId),members=state.members.filter(m=>m.userId===user.id);if(members.length!==1)return null;return {...structuredClone(state.companies.get(members[0].companyId)),userId:user.id,email:user.email,verifiedAt:user.verifiedAt,role:members[0].role,reviewReason:state.audit.findLast(a=>a.companyId===members[0].companyId&&a.action==='REVIEW_REASON')?.entityId??null};},
      async revokeVerificationTokens(userId){for(const t of state.tokens)if(t.userId===userId&&!t.consumedAt)t.consumedAt=clock;},
      async saveProfile(input){const c=state.companies.get(input.companyId);Object.assign(c,{legalName:input.legalName,country:input.country,number:input.number,profile:structuredClone(input.profile),version:c.version+1,status:'PENDING'});for(const o of state.offers.values())if(o.companyId===c.companyId&&o.status==='PUBLISHED'){o.status='DRAFT';o.version++;}},
      async companyForReview(id){return structuredClone(state.companies.get(id)??null);},
      async reviewQueue(after){return [...state.companies.values()].filter(c=>c.companyId>after).sort((a,b)=>a.companyId-b.companyId).slice(0,51).map(c=>structuredClone(c));},
      async decideCompany({companyId,status}){const c=state.companies.get(companyId);c.status=status;c.version++;if(status!=='VERIFIED')for(const o of state.offers.values())if(o.companyId===companyId&&o.status==='PUBLISHED'){o.status='DRAFT';o.version++;}},
      async listOffers({companyId,own,after}){return [...state.offers.values()].filter(o=>o.id>after&&(own?o.companyId===companyId:o.companyId!==companyId&&o.status==='PUBLISHED'&&state.companies.get(o.companyId).status==='VERIFIED'&&o.validUntil>=new Date(clock).toISOString().slice(0,10))).sort((a,b)=>a.id-b.id).slice(0,51).map(o=>({...structuredClone(o),companyName:state.companies.get(o.companyId).legalName}));},
      async offerForUpdate(id){const o=state.offers.get(id);return o?{...structuredClone(o),companyStatus:state.companies.get(o.companyId).status}:null;},
      async saveOffer(input){const id=input.id??++state.counter.offer,old=state.offers.get(id);state.offers.set(id,{...structuredClone(input),id,currency:'EUR',status:'DRAFT',version:old?old.version+1:0});return id;},
      async setOfferStatus({id,status}){const o=state.offers.get(id);o.status=status;o.version++;},
      async createEnquiry({offerId,companyId,userId}){if([...state.enquiries.values()].some(e=>e.offerId===offerId&&e.buyerCompanyId===companyId))duplicate();const id=++state.counter.enquiry;state.enquiries.set(id,{id,offerId,buyerCompanyId:companyId,createdByUserId:userId,status:'OPEN'});return id;},
      async enquiryForUpdate(id){const e=state.enquiries.get(id);return e?{...structuredClone(e),sellerCompanyId:state.offers.get(e.offerId).companyId}:null;},
      async listEnquiries({companyId,after}){return [...state.enquiries.values()].filter(e=>e.id>after&&(e.buyerCompanyId===companyId||state.offers.get(e.offerId).companyId===companyId)).sort((a,b)=>a.id-b.id).slice(0,51).map(e=>{const o=state.offers.get(e.offerId);return {...structuredClone(e),sellerCompanyId:o.companyId,buyerName:state.companies.get(e.buyerCompanyId).legalName,sellerName:state.companies.get(o.companyId).legalName,cropId:o.cropId};});},
      async enquiryMessages({enquiryId,after}){return state.messages.filter(m=>m.enquiryId===enquiryId&&m.id>after).slice(0,51).map(m=>structuredClone(m));},
      async insertMessage({enquiryId,userId,companyId,body}){const id=++state.counter.message;state.messages.push({id,enquiryId,authorUserId:userId,authorCompanyId:companyId,body,createdAt:new Date(clock)});return id;},
      async setEnquiryStatus({id,status}){state.enquiries.get(id).status=status;}
    };
    try{return await work(tx);}catch(error){state=snapshot;throw error;}finally{release();}
  }};
  const passwordHasher=createB2bPasswordHasher(),mailer={async sendVerification(m){mail.push(m);}},catalogue=[{id:'red-clover',name:'Red clover',botanical:'Trifolium pratense',category:'forage-legumes'}];
  const options={repository,passwordHasher,mailer,catalogue,adminUserIds:[1],now:()=>clock};
  const registration=createRegistrationService(options),service=createB2bPortalService(options);
  async function register(label,{verify=true}={}) {
    const email=label+'@example.test',password='synthetic password for '+label;
    const result=await registration.register({email,password,noticesAccepted:true,company:{legalName:label+' Company',registrationCountry:'LT',registrationNumber:'SYN-'+label}});
    if(verify){const message=mail.at(-1);await registration.verifyEmail({userId:message.userId,token:message.token});}
    return {...result,email,password};
  }
  return {repository,passwordHasher,mailer,catalogue,options,registration,service,register,mail,faults,get state(){return state;},advance:ms=>{clock+=ms;}};
}
export function profileFor(company) {return {version:company.version,company:{legalName:company.legalName,registrationCountry:company.country,registrationNumber:company.number},profile:{contactName:'Synthetic Contact',contactRole:'Owner',phone:'',vat:'',registeredAddress:{street:'Test Street 1',city:'Vilnius',postalCode:'LT-00000',country:'LT'},roles:['SELLER','BUYER'],speciesIds:['red-clover'],authorityConfirmed:true}};}
export async function approvedFixture() {
  const h=portalFixture(),operator=await h.register('operator'),seller=await h.register('seller'),buyer=await h.register('buyer');
  const admin=await h.service.login(operator),s=await h.service.login(seller),b=await h.service.login(buyer);
  for(const a of [s,b]){await h.service.saveProfile(a.sessionToken,profileFor(a.company));const c=(await h.service.me(a.sessionToken)).company;await h.service.reviewCompany(admin.sessionToken,{companyId:c.id,version:c.version,status:'VERIFIED',reason:'Synthetic registry evidence checked'});}
  return {h,operator,seller,buyer,admin,s,b};
}
export const offerInput={cropId:'red-clover',quantity:100,unit:'kg',priceAmount:5.25,seedCategory:'SOWING_STATUS_UNKNOWN',originCountry:'LT',validUntil:'2026-12-01'};
