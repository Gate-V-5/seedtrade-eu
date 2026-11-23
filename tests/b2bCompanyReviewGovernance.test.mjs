import test from 'node:test';import assert from 'node:assert/strict';
import {createAdminService} from '../server/b2b/adminService.mjs';import {createAdminHttp} from '../server/b2b/adminHttp.mjs';import {createB2bPortalService,csrfForSession} from '../server/b2b/portalService.mjs';import {portalFixture,profileFor} from './fixtures/b2bPortalFixture.mjs';
const token='a'.repeat(64),adminId='b'.repeat(32);
test('dedicated administrator authorization does not query or require affiliation declarations',async()=>{
 const a={id:adminId,state:'ACTIVE',role:'COMPANY_REVIEW',last_totp_counter:1,owner_authorization_ref:'Existing owner assignment',conflict_company_ids:'not-an-affiliation-declaration'};const tx={adminSession:async()=>a,adminConflicts:async()=>{throw Error('Affiliations must not be consulted')}};
 const service=createAdminService({repository:{},passwordHasher:{},key:Buffer.alloc(32)});const actor=await service.authenticate(tx,token);assert.equal(actor.platformAdmin,true);assert.deepEqual(actor.conflictCompanyIds,[1,2,3]);delete a.owner_authorization_ref;await assert.rejects(service.authenticate(tx,token),e=>e.message==='ADMIN_AUTHORIZATION_REQUIRED');a.owner_authorization_ref='Owner';a.role='ENROLLMENT_ONLY';await assert.rejects(service.authenticate(tx,token),e=>e.status===401);
});
test('explicit dedicated Admin decision can approve an affiliated company without a declaration, with reason/version/audit',async()=>{
 const h=portalFixture();h.state.counter.company=8;const registered=await h.register('affiliated');const member=await h.service.login(registered);await h.service.saveProfile(member.sessionToken,profileFor(member.company));let c=(await h.service.me(member.sessionToken)).company;
 const service=createB2bPortalService({...h.options,memberOnly:true,adminUserIds:[],reviewActor:async()=>({adminId,platformAdmin:true,conflictCompanyIds:[c.id],historicalRecordRestrictions:[1,2,3]})});
 const queue=await service.reviewQueue(token,{});assert(!Object.hasOwn(queue.items[0],'conflicted'));assert.equal(h.state.companies.get(c.id).status,'PENDING');
 await assert.rejects(service.reviewCompany(token,{companyId:c.id,version:c.version,status:'VERIFIED',reason:''}),e=>e.status===400);
 assert.equal((await service.reviewCompany(token,{companyId:c.id,version:c.version,status:'VERIFIED',reason:'Actual company details checked'})).status,'VERIFIED');assert(h.state.audit.some(a=>a.adminActorId===adminId&&a.action==='COMPANY_VERIFIED'));assert(h.state.audit.some(a=>a.adminActorId===adminId&&a.action==='REVIEW_REASON'&&a.entityId==='Actual company details checked'));
 await assert.rejects(service.reviewCompany(token,{companyId:c.id,version:c.version,status:'REJECTED',reason:'Stale decision'}),e=>e.status===409);
});
test('retired records, suspended accounts, incomplete profiles and ordinary Member self-review remain blocked',async()=>{
 const h=portalFixture();h.state.counter.company=8;const r=await h.register('incomplete'),m=await h.service.login(r);const admin=createB2bPortalService({...h.options,memberOnly:true,adminUserIds:[],reviewActor:async()=>({adminId,platformAdmin:true,historicalRecordRestrictions:[1,2,3]})});
 await assert.rejects(admin.reviewCompany(token,{companyId:1,version:0,status:'VERIFIED',reason:'No retired approval'}),e=>e.status===403);
 await assert.rejects(admin.reviewCompany(token,{companyId:m.company.id,version:0,status:'VERIFIED',reason:'Missing profile'}),e=>e.status===400);
 const c=h.state.companies.get(m.company.id);c.profile={accessSuspended:true};await assert.rejects(admin.reviewCompany(token,{companyId:c.companyId,version:0,status:'VERIFIED',reason:'Suspended'}),e=>e.status===403);
 const legacy=createB2bPortalService({...h.options,adminUserIds:[m.user.id]});await assert.rejects(legacy.reviewCompany(m.sessionToken,{companyId:m.company.id,version:0,status:'VERIFIED',reason:'No Member self-review'}),e=>e.status===403);
});
test('Admin HTTP accepts reasoned review without conflict flag and still requires CSRF and trusted origin',async()=>{
 let calls=0;const handler=createAdminHttp({enabled:true,allowedOrigins:['https://seedtrade.eu'],resolveClient:()=> '127.0.0.1',auth:{},review:{reviewCompany:async(t,b)=>{calls++;assert.equal(t,token);assert(!Object.hasOwn(b,'conflictFreeConfirmed'));return {status:'VERIFIED'}}}});
 const req=()=>({url:'/api/b2b/v1/admin/companies/review',method:'POST',headers:{origin:'https://seedtrade.eu','content-type':'application/json',cookie:'__Host-seedtrade_platform_admin='+token,'x-seedtrade-csrf':csrfForSession(token)},async *[Symbol.asyncIterator](){yield Buffer.from(JSON.stringify({companyId:9,version:1,status:'VERIFIED',reason:'Checked actual details'}))}});const res=()=>({writeHead(s){this.status=s},end(b){this.body=JSON.parse(b)}});
 let r=res();await handler(req(),r);assert.equal(r.status,200);let bad=req();delete bad.headers['x-seedtrade-csrf'];r=res();await handler(bad,r);assert.equal(r.status,403);bad=req();bad.headers.origin='https://foreign.example.invalid';r=res();await handler(bad,r);assert.equal(r.status,403);assert.equal(calls,1);
});
