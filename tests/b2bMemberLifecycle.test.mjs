import test from 'node:test';import assert from 'node:assert/strict';
import {createAdminService} from '../server/b2b/adminService.mjs';
import {createRegistrationService} from '../server/b2b/registrationService.mjs';
import {createB2bRegistrationHttp} from '../server/b2b/registrationHttp.mjs';
import {createAdminHttp} from '../server/b2b/adminHttp.mjs';
import {withProductionCors} from '../server/b2b/productionCors.mjs';
import {portalFixture} from './fixtures/b2bPortalFixture.mjs';
import {currentLegalRegistry} from '../server/b2b/legalAcceptance.mjs';
const adminId='c'.repeat(32),token='d'.repeat(64);
function fixture(){
 const h=portalFixture(),base=h.repository.transaction.bind(h.repository);
 h.state.companies.set(4,{companyId:4,legalName:'Local lifecycle fixture',country:'LT',number:'LOCAL-4',status:'VERIFIED',version:0,profile:{registeredAddress:{street:'Test 1'},accessSuspended:false}});
 h.state.offers.set(1,{id:1,companyId:4,status:'PUBLISHED',version:0});h.state.sessions.set('local',{userId:4});
 h.repository.transaction=work=>base(tx=>work(Object.assign(tx,{
  adminSession:async()=>({id:adminId,state:'ACTIVE',role:'COMPANY_REVIEW',last_totp_counter:1,owner_authorization_ref:'Existing owner assignment'}),adminConflicts:async()=>[],
  findManagedMembers:async()=>({items:[{...h.state.companies.get(4),companyStatus:h.state.companies.get(4).status,members:[{userId:4,email:'member@example.invalid',verifiedAt:new Date(),role:'COMPANY_ADMIN',password_hash:'must-not-escape'}]}],next:null}),
  updateManagedCompany:async({companyId,version,profile})=>{const c=h.state.companies.get(companyId);assert.equal(c.version,version);await tx.saveProfile({...c,companyId,version,profile});},
  revokeCompanySessions:async()=>h.state.sessions.clear()
 })));
 const make=ids=>createAdminService({repository:h.repository,passwordHasher:h.passwordHasher,key:Buffer.alloc(32),memberManagerAdminIds:ids,now:()=>Date.UTC(2026,10,23)});
 return {h,make,admin:make([adminId])};
}
test('management is separately assigned; safe all-company list, profile and member projection',async()=>{
 const {admin,make}=fixture();await assert.rejects(make([]).managedMembers(token,{query:''}),e=>e.status===403);
 const r=await admin.managedMembers(token,{query:''});assert.equal(r.items.length,1);assert.equal(r.items[0].members[0].emailVerified,true);assert(!JSON.stringify(r).includes('must-not-escape'));assert.equal(r.items[0].accountState,'ACTIVE');
 assert.deepEqual((await admin.me(token)).permissions,['company:review','member:manage']);assert.throws(()=>make(['info@seedtrade.eu']),/INVALID_MEMBER_MANAGEMENT_ASSIGNMENT/);
});
test('suspend, reactivate, close and reopen preserve identity/history, withdraw offers, revoke sessions and require review',async()=>{
 const {admin,h}=fixture();let version=0;
 for(const action of ['SUSPEND','REACTIVATE','CLOSE','REQUEST_DELETION','REOPEN']){
  await admin.manageCompany(token,{companyId:4,version:version++,action,reason:'Local authorized test reason'});
  const c=h.state.companies.get(4);assert.equal(c.status,'PENDING');assert.equal(c.version,version);assert.equal(h.state.sessions.size,0);assert.equal(h.state.offers.get(1).status,'DRAFT');
  if(action==='CLOSE')assert.equal(c.profile.accountState,'CLOSED');if(action==='REQUEST_DELETION')assert(c.profile.deletionReviewRequestedAt);
 }
 assert.equal(h.state.companies.size,1);assert.equal(h.state.audit.length,5);assert(h.state.audit.every(a=>a.adminActorId===adminId));assert.equal(h.state.companies.get(4).profile.accessSuspended,false);
});
test('historical protection, stale writes, invalid transitions and failed audits all fail without partial changes',async()=>{
 const {admin,h}=fixture();for(const companyId of [1,2,3])await assert.rejects(admin.manageCompany(token,{companyId,version:0,action:'CLOSE',reason:'Local test reason'}),e=>e.status===403);
 await assert.rejects(admin.manageCompany(token,{companyId:4,version:0,action:'REOPEN',reason:'Local test reason'}),e=>e.status===409);
 await assert.rejects(admin.manageCompany(token,{companyId:4,version:1,action:'CLOSE',reason:'Local test reason'}),e=>e.status===409);
 h.faults.audit=true;await assert.rejects(admin.manageCompany(token,{companyId:4,version:0,action:'CLOSE',reason:'Local test reason'}));assert.equal(h.state.companies.get(4).status,'VERIFIED');assert.equal(h.state.offers.get(1).status,'PUBLISHED');assert.equal(h.state.sessions.size,1);
});
test('concurrent registration retries and duplicate email with a different company never leave partial identities',async()=>{
 const h=portalFixture(),service=createRegistrationService({...h.options,simpleRegistration:true});const input={email:'retry@example.invalid',termsAccepted:true,locale:'en',legalBundleId:currentLegalRegistry.bundleId,company:{legalName:'Local Retry',registrationNumber:'LOCAL-RETRY',registrationCountry:'LT',registeredAddress:{street:'Test Street 1',city:'Vilnius',postalCode:'00000'},contactFirstName:'Local',contactLastName:'Test'}};
 const r=await Promise.all([service.register(input),service.register(input)]);assert.deepEqual(r.map(x=>x.status).sort(),['PENDING_EMAIL_VERIFICATION','REGISTRATION_RECEIVED']);
 assert.equal((await service.register({...input,company:{...input.company,registrationNumber:'LOCAL-OTHER'}})).status,'REGISTRATION_RECEIVED');assert.equal(h.state.companies.size,1);assert.equal(h.state.users.size,1);assert.equal(h.mail.length,1);assert.equal(h.state.audit.filter(a=>a.action==='COMPANY_REGISTRATION').length,1);
});
function req(url,body,method='POST'){return {url,method,headers:{origin:'https://seedtrade.eu','content-type':'application/json'},async *[Symbol.asyncIterator](){yield Buffer.from(JSON.stringify(body))}}}
function res(){return {writeHead(status,headers){this.status=status;this.headers=headers},end(body){this.body=JSON.parse(body)}}}
test('new, duplicate and delayed-mail registration HTTP responses are indistinguishable',async()=>{
 for(const status of ['PENDING_EMAIL_VERIFICATION','PENDING_EMAIL_DELIVERY','REGISTRATION_RECEIVED']){const handler=createB2bRegistrationHttp({enabled:true,allowedOrigin:'https://seedtrade.eu',rateLimiter:async()=>true,service:{register:async()=>({status,userId:9}),verifyEmail:async()=>{}}}),r=res();await handler(req('/api/b2b/v1/register',{}),r);assert.equal(r.status,202);assert.deepEqual(r.body,{status:'REGISTRATION_RECEIVED'});}
});
test('unauthenticated administration never enumerates company/member data',async()=>{
 const h=createAdminHttp({enabled:true,resolveClient:()=> '127.0.0.1',allowedOrigins:['https://seedtrade.eu'],auth:createAdminService({repository:{transaction:async fn=>fn({})},passwordHasher:{},key:Buffer.alloc(32),memberManagerAdminIds:[adminId]}),review:{}}),r=res();await h(req('/api/b2b/v1/admin/members?query=&after=0',undefined,'GET'),r);assert.equal(r.status,401);assert(!JSON.stringify(r.body).includes('@'));
});
test('production CORS admits only the scoped management action and preserves authentication/CSRF',async()=>{
 const handler=withProductionCors(createAdminHttp({enabled:true,resolveClient:()=> '127.0.0.1',allowedOrigins:['https://seedtrade.eu'],auth:{},review:{}}));
 const request=req('/api/b2b/v1/admin/members/action',{});request.headers.host='api.seedtrade.eu';request.method='OPTIONS';request.headers['access-control-request-method']='POST';request.headers['access-control-request-headers']='Content-Type, X-SeedTrade-CSRF';
 const response=()=>({setHeader(){},writeHead(status){this.status=status},end(body){this.body=body}});
 const preflight=response();await handler(request,preflight);assert.equal(preflight.status,204);
 request.method='POST';const anonymous=response();await handler(request,anonymous);assert.equal(anonymous.status,403);assert.equal(JSON.parse(anonymous.body).error,'REQUEST_REJECTED');
 request.method='OPTIONS';request.headers.origin='https://untrusted.example.invalid';const foreign=response();await handler(request,foreign);assert.equal(foreign.status,403);
});
