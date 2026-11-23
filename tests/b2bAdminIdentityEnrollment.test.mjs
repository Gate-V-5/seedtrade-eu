import test from 'node:test';
import assert from 'node:assert/strict';
import {provisionFirstAdmin} from '../server/b2b/adminProvision.mjs';
import {confirmAdminIdentity} from '../server/b2b/adminIdentityEnrollment.mjs';
import {createAdminService} from '../server/b2b/adminService.mjs';
import {decryptMfa,totp} from '../server/b2b/adminMfa.mjs';
const key=Buffer.alloc(32,7),password='synthetic-test-input-only',now=Date.UTC(2026,10,20,14);
const input={email:'identity@example.invalid',password,ownerAuthorized:true,enrollmentOnly:true,ownerAuthorizationRef:'Synthetic isolated test only'};
const hasher={hash:async()=> 'synthetic-hash',verify:async value=>value===password};
async function fixture(){
 let a=null,enrollment;const sql=[];
 const db={beginTransaction:async()=>{},commit:async()=>{},rollback:async()=>{},execute:async(query,args=[])=>{
  sql.push({query,args});
  if(query.includes('GET_LOCK'))return [[{acquired:1}]];
  if(query.startsWith('SELECT id'))return [a?[{id:a.id}]:[]];
  if(query.startsWith('INSERT INTO b2b_platform_admins')){a={id:args[0],email:args[1],password_hash:args[2],totp_encrypted:args[3],role:'ENROLLMENT_ONLY',state:'PROVISIONED',last_totp_counter:-1,auth_version:1,conflict_company_ids:null,conflicts_confirmed_at:null};return [{}];}
  if(query.startsWith('SELECT *'))return [[a].filter(Boolean)];
  if(query.startsWith('UPDATE')&&query.includes("state='ACTIVE'")){a.state='ACTIVE';a.last_totp_counter=args[0];}
  return [{}];
 }};
 const result=await provisionFirstAdmin({db,input,passwordHasher:hasher,key,writeEnrollment:async value=>{enrollment=value;}});
 return {db,sql,get a(){return a;},enrollment,result};
}
test('owner identity provisions without asserting a personal conflict list and cannot assign COMPANY_REVIEW',async()=>{
 const f=await fixture();assert.equal(f.result.status,'IDENTITY_PROVISIONED_MFA_REQUIRED_REVIEW_DISABLED');
 assert.equal(f.a.role,'ENROLLMENT_ONLY');assert.equal(f.a.conflict_company_ids,null);assert.equal(f.a.conflicts_confirmed_at,null);
 const insert=f.sql.find(s=>s.query.startsWith('INSERT INTO b2b_platform_admins'));
 assert(insert.query.includes("'ENROLLMENT_ONLY',NULL,NULL"));assert(!f.sql.some(s=>s.query.includes('b2b_company_members')));
 assert.equal(decryptMfa(f.a.totp_encrypted,key,f.a.id),f.enrollment.secret);
 for(const invalid of [{...input,enrollmentOnly:false},{...input,ownerAuthorized:false},{...input,conflictCompanyIds:[1,2,3]},{...input,conflictsCompleteConfirmed:true}]){
  let touched=false;
  await assert.rejects(provisionFirstAdmin({input:invalid,passwordHasher:{hash:()=>{touched=true;}},db:f.db,key,writeEnrollment:()=>{touched=true;}}),/OWNER_IDENTITY_ENROLLMENT_REQUIRED/);assert.equal(touched,false);
 }
 await assert.rejects(provisionFirstAdmin({db:f.db,input,passwordHasher:hasher,key,writeEnrollment:async()=>{throw Error('must not overwrite');}}),/FIRST_ADMIN_ALREADY_EXISTS/);
});
test('private password plus TOTP confirmation grants no session or review privilege; replay is refused',async()=>{
 const f=await fixture(),otp=totp(f.enrollment.secret,Math.floor(now/30000));
 const result=await confirmAdminIdentity({db:f.db,input:{email:input.email,password,otp},passwordHasher:hasher,key,now:()=>now});
 assert.deepEqual(result,{status:'MFA_ENROLLED_REVIEW_DISABLED',permissions:[]});
 assert.equal(f.a.role,'ENROLLMENT_ONLY');assert.equal(f.a.state,'ACTIVE');assert.equal(f.a.conflict_company_ids,null);assert.equal(f.a.conflicts_confirmed_at,null);
 assert(!f.sql.some(s=>s.query.startsWith('INSERT INTO b2b_platform_admin_sessions')||s.query.startsWith('UPDATE')&&/\brole\s*=|conflict_company_ids\s*=/.test(s.query)));
 await assert.rejects(confirmAdminIdentity({db:f.db,input:{email:input.email,password,otp},passwordHasher:hasher,key,now:()=>now}),/ADMIN_ENROLLMENT_NOT_CONFIRMED/);
});
test('wrong password, missing OTP and non-enrollment roles cannot complete private enrollment',async()=>{
 for(const override of [{password:'incorrect-test-input'},{otp:undefined}]){
  const f=await fixture();await assert.rejects(confirmAdminIdentity({db:f.db,input:{email:input.email,password,otp:totp(f.enrollment.secret,Math.floor(now/30000)),...override},passwordHasher:hasher,key,now:()=>now}),/ADMIN_ENROLLMENT_NOT_CONFIRMED/);
  assert.equal(f.a.state,'PROVISIONED');assert.equal(f.a.last_totp_counter,-1);assert(f.sql.some(s=>s.query.includes('failed_attempts=failed_attempts+1')));
 }
 const f=await fixture();f.a.role='COMPANY_REVIEW';await assert.rejects(confirmAdminIdentity({db:f.db,input:{email:input.email,password,otp:totp(f.enrollment.secret,Math.floor(now/30000))},passwordHasher:hasher,key,now:()=>now}),/ADMIN_ENROLLMENT_NOT_CONFIRMED/);
});
test('even MFA-confirmed enrollment identities cannot use Admin login or reviewer authentication',async()=>{
 const f=await fixture();f.a.state='ACTIVE';f.a.last_totp_counter=Math.floor(now/30000);
 const tx={adminByEmail:async()=>f.a,adminSession:async()=>f.a,adminConflicts:async()=>{throw Error('must not enter review');}};
 const service=createAdminService({repository:{transaction:async work=>work(tx)},passwordHasher:hasher,key,now:()=>now});
 await assert.rejects(service.authenticate(tx,'a'.repeat(64)),e=>e.message==='ADMIN_SIGN_IN_REQUIRED');
 await assert.rejects(service.login({email:input.email,password,otp:totp(f.enrollment.secret,Math.floor(now/30000)+1)}),e=>e.message==='INVALID_ADMIN_CREDENTIALS');
});
test('historical test-record restrictions remain independent of any declared affiliation list',async()=>{
 const tx={adminSession:async()=>({id:'b'.repeat(32),state:'ACTIVE',role:'COMPANY_REVIEW',last_totp_counter:1,owner_authorization_ref:'Existing owner assignment'}),adminConflicts:async()=>[9]};
 const service=createAdminService({repository:{},passwordHasher:hasher,key});
 const actor=await service.authenticate(tx,'a'.repeat(64));assert.deepEqual(actor.historicalRecordRestrictions,[1,2,3]);assert.deepEqual(actor.conflictCompanyIds,[1,2,3]);
});
