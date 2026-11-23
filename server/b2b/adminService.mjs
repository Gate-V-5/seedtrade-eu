import {randomBytes} from 'node:crypto';
import {createMemberManagement} from './memberManagement.mjs';
import {normalizeEmail} from './emailVerification.mjs';
import {B2bError,sessionHash,csrfForSession} from './portalService.mjs';
import {decryptMfa,mfaCounter} from './adminMfa.mjs';
export const ADMIN_COOKIE='__Host-seedtrade_platform_admin';
export const ADMIN_SESSION_SECONDS=30*60;
const fail=(status,code)=>{throw new B2bError(status,code);};
export function createAdminService({repository,passwordHasher,key,memberManagerAdminIds=[],now=()=>Date.now()}){
 if(!Array.isArray(memberManagerAdminIds)||memberManagerAdminIds.some(id=>typeof id!=='string'||!/^[a-f0-9]{32}$/.test(id))||new Set(memberManagerAdminIds).size!==memberManagerAdminIds.length)throw Error('INVALID_MEMBER_MANAGEMENT_ASSIGNMENT');
 let dummy;
 const audit=(tx,a,action)=>tx.appendAudit({actorUserId:null,adminActorId:a.id,companyId:null,action,entityType:'platform_admin',entityId:a.id});
 const requireOwnerAuthorization=a=>{if(typeof a.owner_authorization_ref!=='string'||!a.owner_authorization_ref.trim())fail(403,'ADMIN_AUTHORIZATION_REQUIRED');};
 const authenticate=async(tx,token)=>{
  if(typeof token!=='string'||!/^[a-f0-9]{64}$/.test(token))fail(401,'ADMIN_SIGN_IN_REQUIRED');
  const a=await tx.adminSession(sessionHash(token));if(!a||a.state!=='ACTIVE'||a.role!=='COMPANY_REVIEW'||!Number.isSafeInteger(Number(a.last_totp_counter))||Number(a.last_totp_counter)<0)fail(401,'ADMIN_SIGN_IN_REQUIRED');
  requireOwnerAuthorization(a);
  // Retired acceptance records remain protected; affiliations do not veto review.
  return {adminId:a.id,platformAdmin:true,conflictCompanyIds:[1,2,3],historicalRecordRestrictions:[1,2,3]};
 };
 const permissions=id=>['company:review',...(memberManagerAdminIds.includes(id)?['member:manage']:[])];
 return {authenticate,
  ...createMemberManagement({repository,authenticate,memberManagerAdminIds,passwordHasher,now}),
  async login(input){
   let email;try{email=normalizeEmail(input.email);}catch{email='invalid@example.invalid';}
   const validPassword=typeof input.password==='string'&&input.password.length>=12&&input.password.length<=1024;
   const a=await repository.transaction(tx=>tx.adminByEmail(email));
   dummy??=passwordHasher.hash(randomBytes(32).toString('hex'));const fallback=await dummy;
   const valid=await passwordHasher.verify(validPassword?input.password:'invalid-password-value',a?.password_hash??fallback);
   const result=await repository.transaction(async tx=>{
    const current=await tx.adminByEmail(email,true);
    if(!current||!a||current.password_hash!==a.password_hash)return null;
    if(current.state==='DISABLED'||!['ACTIVE','PROVISIONED'].includes(current.state)||current.role!=='COMPANY_REVIEW'||new Date(current.locked_until??0).getTime()>now())return null;
    let counter=null;try{counter=mfaCounter(decryptMfa(current.totp_encrypted,key,current.id),input.otp,now(),current.last_totp_counter);}catch{}
    if(!validPassword||!valid||counter==null){await tx.adminFailure(current.id);await audit(tx,current,'ADMIN_LOGIN_FAILED');return null;}
    requireOwnerAuthorization(current);
    await tx.adminSuccess(current.id,counter);
    const token=randomBytes(32).toString('hex');await tx.adminInsertSession({hash:sessionHash(token),id:current.id,version:current.auth_version,expires:new Date(now()+ADMIN_SESSION_SECONDS*1000)});
    await audit(tx,current,'ADMIN_LOGIN_MFA');return {sessionToken:token,csrfToken:csrfForSession(token),permissions:permissions(current.id)};
   });
   if(!result)fail(401,'INVALID_ADMIN_CREDENTIALS');return result;
  },
  me:token=>repository.transaction(async tx=>{const a=await authenticate(tx,token);return {permissions:permissions(a.adminId),csrfToken:csrfForSession(token)};}),
  logout:token=>repository.transaction(async tx=>{const a=await authenticate(tx,token);await tx.adminLogout(sessionHash(token));await audit(tx,{id:a.adminId},'ADMIN_LOGOUT');return {status:'SIGNED_OUT'};})
 };
}
