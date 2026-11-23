import {B2bError} from './portalService.mjs';
const fail=(status,code)=>{throw new B2bError(status,code)};
const profile=value=>typeof value==='string'?JSON.parse(value):value??{};
const safeProfile=p=>Object.fromEntries(['registeredAddress','contactFirstName','contactLastName','contactName','contactRole','phone','vat','roles','speciesIds'].filter(k=>Object.hasOwn(p,k)).map(k=>[k,p[k]]));
export function createMemberManagement({repository,authenticate,memberManagerAdminIds,now}){
 const authorized=async(tx,token)=>{const a=await authenticate(tx,token);if(!memberManagerAdminIds.includes(a.adminId))fail(403,'MEMBER_MANAGEMENT_ASSIGNMENT_REQUIRED');return a};
 const manageCompany=(token,input)=>repository.transaction(async tx=>{
  const a=await authorized(tx,token);
  if(!Number.isSafeInteger(input.companyId)||input.companyId<1||!Number.isSafeInteger(input.version)||input.version<0||!['SUSPEND','REACTIVATE','CLOSE','REOPEN','REQUEST_DELETION'].includes(input.action)||typeof input.reason!=='string'||input.reason.trim().length<3||input.reason.length>100||/[\x00-\x1f<>]/.test(input.reason))fail(400,'INVALID_REQUEST');
  if(a.historicalRecordRestrictions.includes(input.companyId))fail(403,'HISTORICAL_RECORD_PROTECTED');
  const c=await tx.companyForReview(input.companyId);if(!c)fail(404,'NOT_FOUND');if(c.version!==input.version)fail(409,'RELOAD_REQUIRED');
  const p=profile(c.profile),closed=p.accountState==='CLOSED',suspended=p.accessSuspended===true;
  if((input.action==='REOPEN'&&!closed)||(input.action==='REACTIVATE'&&(!suspended||closed))||(input.action==='SUSPEND'&&(closed||suspended))||(input.action==='CLOSE'&&closed)||(input.action==='REQUEST_DELETION'&&(!closed||p.deletionReviewRequestedAt)))fail(409,'INVALID_ACCOUNT_TRANSITION');
  const updated={...p};
  if(input.action==='REQUEST_DELETION')updated.deletionReviewRequestedAt=new Date(now()).toISOString();
  else {updated.accountState=input.action==='CLOSE'?'CLOSED':'ACTIVE';updated.accessSuspended=['SUSPEND','CLOSE'].includes(input.action);if(input.action==='REOPEN')delete updated.deletionReviewRequestedAt;}
  await tx.updateManagedCompany({companyId:c.companyId,version:c.version,profile:updated});
  await tx.revokeCompanySessions(c.companyId);
  await tx.appendAudit({actorUserId:null,adminActorId:a.adminId,companyId:c.companyId,action:'MEMBER_'+input.action,entityType:'account_reason',entityId:input.reason.trim()});
  return {status:input.action==='REQUEST_DELETION'?'DELETION_REVIEW_REQUIRED':'PENDING_INDEPENDENT_REVIEW',accountState:updated.accountState,suspended:updated.accessSuspended===true,version:c.version+1};
 });
 return {
  managedMembers:(token,input)=>repository.transaction(async tx=>{
   const a=await authorized(tx,token),query=input.query??'',after=input.after??0;
   if(typeof query!=='string'||query.length>100||(query.trim().length===1)||!Number.isSafeInteger(after)||after<0)fail(400,'INVALID_REQUEST');
   const page=await tx.findManagedMembers(query.trim(),after);
   return {items:page.items.map(c=>{const p=profile(c.profile);return {companyId:c.companyId,legalName:c.legalName,country:c.country,number:c.number,companyStatus:c.companyStatus,version:c.version,createdAt:c.createdAt,profile:safeProfile(p),accountState:p.accountState==='CLOSED'?'CLOSED':p.accessSuspended===true?'SUSPENDED':'ACTIVE',deletionReviewRequestedAt:p.deletionReviewRequestedAt??null,protected:a.historicalRecordRestrictions.includes(c.companyId),conflicted:a.conflictCompanyIds.includes(c.companyId),members:c.members.map(m=>({userId:m.userId,email:m.email,emailVerified:!!m.verifiedAt,role:m.role}))}}),next:page.next};
  }),
  manageCompany,
  setCompanyAccess:(token,input)=>{if(typeof input.suspended!=='boolean')fail(400,'INVALID_REQUEST');return manageCompany(token,{...input,action:input.suspended?'SUSPEND':'REACTIVATE'})}
 };
}
