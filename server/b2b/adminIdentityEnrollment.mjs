import {normalizeEmail} from './emailVerification.mjs';
import {decryptMfa,mfaCounter} from './adminMfa.mjs';

// Owner-private confirmation only; no HTTP handler imports this module.
// This never creates a session, assigns COMPANY_REVIEW or claims conflict completeness.
export async function confirmAdminIdentity({db,input,passwordHasher,key,now=()=>Date.now()}){
 const email=normalizeEmail(input?.email);
 if(typeof input.password!=='string'||input.password.length<12||input.password.length>1024)throw Error('ADMIN_ENROLLMENT_NOT_CONFIRMED');
 await db.beginTransaction();
 try{
  const [rows]=await db.execute('SELECT * FROM b2b_platform_admins WHERE email=? FOR UPDATE',[email]);const a=rows[0];
  if(!a||a.role!=='ENROLLMENT_ONLY'||!['PROVISIONED','ACTIVE'].includes(a.state)||new Date(a.locked_until??0).getTime()>now())throw Error('ADMIN_ENROLLMENT_NOT_CONFIRMED');
  const valid=await passwordHasher.verify(input.password,a.password_hash);
  let counter=null;try{counter=mfaCounter(decryptMfa(a.totp_encrypted,key,a.id),input.otp,now(),a.last_totp_counter);}catch{}
  if(!valid||counter==null){
   await db.execute('UPDATE b2b_platform_admins SET failed_attempts=failed_attempts+1,locked_until=CASE WHEN failed_attempts>=5 THEN TIMESTAMPADD(MINUTE,15,UTC_TIMESTAMP(3)) ELSE locked_until END WHERE id=?',[a.id]);
   await db.execute("INSERT INTO b2b_audit_log (actor_user_id,platform_admin_id,company_id,action,entity_type,entity_id) VALUES (NULL,?,NULL,'ADMIN_ENROLLMENT_FAILED','platform_admin',?)",[a.id,a.id]);
   await db.commit();throw Error('ADMIN_ENROLLMENT_NOT_CONFIRMED');
  }
  await db.execute("UPDATE b2b_platform_admins SET state='ACTIVE',last_totp_counter=?,failed_attempts=0,locked_until=NULL WHERE id=?",[counter,a.id]);
  await db.execute("INSERT INTO b2b_audit_log (actor_user_id,platform_admin_id,company_id,action,entity_type,entity_id) VALUES (NULL,?,NULL,'ADMIN_MFA_ENROLLMENT_CONFIRMED','platform_admin',?)",[a.id,a.id]);
  await db.commit();return {status:'MFA_ENROLLED_REVIEW_DISABLED',permissions:[]};
 }catch(error){await db.rollback();throw error;}
}
