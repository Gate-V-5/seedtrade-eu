import {randomBytes} from 'node:crypto';
import {normalizeEmail} from './emailVerification.mjs';
import {encryptMfa,newMfaSecret} from './adminMfa.mjs';
// Owner-only CLI adapter below calls this. It is NEVER imported by HTTP handlers.
export async function provisionFirstAdmin({db,input,passwordHasher,key,writeEnrollment}){
 // Identity enrollment is not a company-review assignment or affiliation declaration.
 if(input?.ownerAuthorized!==true||input.enrollmentOnly!==true||typeof input.ownerAuthorizationRef!=='string'||!input.ownerAuthorizationRef.trim()||input.ownerAuthorizationRef.length>200||input.conflictsCompleteConfirmed===true||input.conflictCompanyIds!=null)throw Error('OWNER_IDENTITY_ENROLLMENT_REQUIRED');
 const email=normalizeEmail(input.email),hash=await passwordHasher.hash(input.password),adminId=randomBytes(16).toString('hex'),secret=newMfaSecret();
 const [locks]=await db.execute("SELECT GET_LOCK('seedtrade-first-platform-admin-v1',10) AS acquired");if(Number(locks[0]?.acquired)!==1)throw Error('ADMIN_PROVISION_LOCK');
 try{
  await db.beginTransaction();const [rows]=await db.execute('SELECT id FROM b2b_platform_admins LIMIT 1 FOR UPDATE');if(rows.length)throw Error('FIRST_ADMIN_ALREADY_EXISTS');
  await db.execute("INSERT INTO b2b_platform_admins (id,email,password_hash,totp_encrypted,role,conflict_company_ids,conflicts_confirmed_at,owner_authorization_ref) VALUES (?,?,?,?,'ENROLLMENT_ONLY',NULL,NULL,?)",[adminId,email,hash,encryptMfa(secret,key,adminId),input.ownerAuthorizationRef]);
  await db.execute("INSERT INTO b2b_audit_log (actor_user_id,platform_admin_id,company_id,action,entity_type,entity_id) VALUES (NULL,?,NULL,'ADMIN_IDENTITY_PROVISIONED','platform_admin',?)",[adminId,adminId]);
  // Protected owner-local file only; no seed, URI or password goes to stdout/logs.
  await writeEnrollment({secret,issuer:'SEEDTRADE.EU Administration',account:email,algorithm:'SHA1',digits:6,period:30});
  await db.commit();return {status:'IDENTITY_PROVISIONED_MFA_REQUIRED_REVIEW_DISABLED'};
 }catch(e){await db.rollback();throw e;}finally{await db.execute("SELECT RELEASE_LOCK('seedtrade-first-platform-admin-v1')");}
}
