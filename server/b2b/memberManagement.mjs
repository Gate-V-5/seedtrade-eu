import {B2bError} from './portalService.mjs';
import {applyMemberAction,syntheticCleanupAllowed} from './accountRetirement.mjs';
const fail=(status,code)=>{throw new B2bError(status,code)};
const profile=value=>typeof value==='string'?JSON.parse(value):value??{};
const safeProfile=p=>Object.fromEntries(['registeredAddress','contactFirstName','contactLastName','contactName','contactRole','phone','vat','roles','speciesIds'].filter(k=>Object.hasOwn(p,k)).map(k=>[k,p[k]]));
export function createMemberManagement({repository,authenticate,memberManagerAdminIds,passwordHasher,now}){
 const authorized=async(tx,token)=>{const a=await authenticate(tx,token);if(!memberManagerAdminIds.includes(a.adminId))fail(403,'MEMBER_MANAGEMENT_ASSIGNMENT_REQUIRED');return a};
 const manageCompany=(token,input)=>repository.transaction(async tx=>{
  const a=await authorized(tx,token);
  return applyMemberAction(tx,{actor:a,input,passwordHasher,now});
 });
 return {
  managedMembers:(token,input)=>repository.transaction(async tx=>{
   const a=await authorized(tx,token),query=input.query??'',after=input.after??0;
   if(typeof query!=='string'||query.length>100||(query.trim().length===1)||!Number.isSafeInteger(after)||after<0)fail(400,'INVALID_REQUEST');
   const country=input.country??'';if(typeof country!=='string'||(country!==''&&!/^[A-Z]{2}$/.test(country)))fail(400,'INVALID_REQUEST');const scope=input.scope??'ACTIVE';if(!['ACTIVE','ARCHIVED'].includes(scope))fail(400,'INVALID_REQUEST');const page=await tx.findManagedMembers(query.trim(),after,scope,country);
   return {countries:await tx.managedCompanyCountries(),items:page.items.map(c=>{const p=profile(c.profile);return {companyId:c.companyId,legalName:c.legalName,country:c.country,number:c.number,companyStatus:c.companyStatus,version:c.version,createdAt:c.createdAt,profile:safeProfile(p),accountState:p.accountState==='DELETED'?'DELETED':p.accountState==='CLOSED'?'CLOSED':p.accessSuspended===true?'SUSPENDED':'ACTIVE',deletionReviewRequestedAt:p.deletionReviewRequestedAt??null,identityReleased:!!p.identityReleasedAt,protected:a.historicalRecordRestrictions.includes(c.companyId),syntheticCleanupAvailable:syntheticCleanupAllowed(a,c),history:c.history??[],deletionReadiness:c.deletionReadiness??null,conflicted:a.conflictCompanyIds.includes(c.companyId),members:c.members.map(m=>({userId:m.userId,email:(p.accountState==='DELETED'||p.identityReleasedAt)?null:m.email,emailReleased:p.accountState==='DELETED'||!!p.identityReleasedAt,emailVerified:!!m.verifiedAt,role:m.role}))}}),next:page.next};
  }),
  manageCompany,
  setCompanyAccess:(token,input)=>{if(typeof input.suspended!=='boolean')fail(400,'INVALID_REQUEST');return manageCompany(token,{...input,action:input.suspended?'SUSPEND':'REACTIVATE'})}
 };
}
