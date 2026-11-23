import {randomBytes} from 'node:crypto';
import {B2bError} from './portalService.mjs';
const fail=(status,code)=>{throw new B2bError(status,code)};
export const cleanupAdminId='e94a36332eae9ffec8bfdc2b76d83ec5';
const syntheticNames={1:'SeedTrade Production Acceptance Reviewer',2:'SeedTrade Production Acceptance Seller',3:'SeedTrade Production Acceptance Buyer'};
export const syntheticCleanupAllowed=(actor,c)=>actor.adminId===cleanupAdminId&&syntheticNames[c.companyId]===c.legalName;
export const accountProfile=value=>typeof value==='string'?JSON.parse(value):value??{};
export async function applyMemberAction(tx,{actor,input,passwordHasher,now=()=>Date.now()}){
 if(!Number.isSafeInteger(input.companyId)||input.companyId<1||!Number.isSafeInteger(input.version)||input.version<0||!['SUSPEND','REACTIVATE','CLOSE','REOPEN','REQUEST_DELETION','EXECUTE_DELETION'].includes(input.action)||typeof input.reason!=='string'||input.reason.trim().length<3||input.reason.length>100||/[\x00-\x1f<>]/.test(input.reason))fail(400,'INVALID_REQUEST');
 if(actor.historicalRecordRestrictions.includes(input.companyId)&&input.syntheticCleanupConfirmed!==true)fail(403,'HISTORICAL_RECORD_PROTECTED');
 const c=await tx.companyForReview(input.companyId);if(!c)fail(404,'NOT_FOUND');if(c.version!==input.version)fail(409,'RELOAD_REQUIRED');
 if(actor.historicalRecordRestrictions.includes(c.companyId)&&!(syntheticCleanupAllowed(actor,c)&&input.syntheticCleanupConfirmed===true&&['CLOSE','REQUEST_DELETION','EXECUTE_DELETION'].includes(input.action)))fail(403,'HISTORICAL_RECORD_PROTECTED');
 const p=accountProfile(c.profile),closed=p.accountState==='CLOSED',suspended=p.accessSuspended===true;
 if(p.accountState==='DELETED'||(input.action==='REOPEN'&&!closed)||(input.action==='REACTIVATE'&&(!suspended||closed))||(input.action==='SUSPEND'&&(closed||suspended))||(input.action==='CLOSE'&&closed)||(input.action==='REQUEST_DELETION'&&(!closed||p.deletionReviewRequestedAt)))fail(409,'INVALID_ACCOUNT_TRANSITION');
 let updated={...p},releasedEmails=[],retained=null;
 if(input.action==='EXECUTE_DELETION'){
  if(!closed||!p.deletionReviewRequestedAt||input.retentionReviewed!==true)fail(409,'RETENTION_REVIEW_REQUIRED');
  retained=await tx.deletionDependencies(c.companyId);if(retained.openEnquiries>0||retained.deliveriesInFlight>0)fail(409,'ACTIVE_DEPENDENCIES_REQUIRE_REVIEW');
  const members=await tx.retirementMembers(c.companyId);
  if(members.some(m=>m.companyIds.length!==1||m.companyIds[0]!==c.companyId))fail(409,'SHARED_IDENTITY_REQUIRES_REVIEW');
  for(const member of members){const passwordHash=await passwordHasher.hash(randomBytes(32).toString('hex'));await tx.retireMember({userId:member.userId,email:member.email,passwordHash,retiredEmail:`retired-${member.userId}-${randomBytes(16).toString('hex')}@seedtrade.invalid`});releasedEmails.push(member.email);}
  updated={accountState:'DELETED',accessSuspended:true,deletedAt:new Date(now()).toISOString(),retainedIdentity:{legalName:c.legalName,country:c.country,registrationNumber:c.number},releasedMemberIds:members.map(m=>m.userId)};
  await tx.retireManagedCompany({companyId:c.companyId,version:c.version,profile:updated});
 }else{
  if(input.action==='REQUEST_DELETION')updated.deletionReviewRequestedAt=new Date(now()).toISOString();
  else{updated.accountState=input.action==='CLOSE'?'CLOSED':'ACTIVE';updated.accessSuspended=['SUSPEND','CLOSE'].includes(input.action);if(input.action==='REOPEN')delete updated.deletionReviewRequestedAt;}
  await tx.updateManagedCompany({companyId:c.companyId,version:c.version,profile:updated});
 }
 await tx.revokeCompanySessions(c.companyId);
 await tx.appendAudit({actorUserId:null,adminActorId:actor.adminId,companyId:c.companyId,action:'MEMBER_'+input.action,entityType:'account_reason',entityId:input.reason.trim()});
 if(input.action==='EXECUTE_DELETION')for(const userId of updated.releasedMemberIds)await tx.appendAudit({actorUserId:null,adminActorId:actor.adminId,companyId:c.companyId,action:'MEMBER_EMAIL_RELEASED',entityType:'retired_member',entityId:String(userId)});
 return {status:input.action==='EXECUTE_DELETION'?'DELETED_EMAILS_RELEASED':input.action==='REQUEST_DELETION'?'DELETION_REVIEW_REQUIRED':'PENDING_INDEPENDENT_REVIEW',accountState:updated.accountState,suspended:updated.accessSuspended===true,version:c.version+1,...(retained?{releasedEmails,retainedReferenceRecords:retained}:{})};
}
