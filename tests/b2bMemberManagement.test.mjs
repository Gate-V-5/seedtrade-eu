import test from 'node:test';import assert from 'node:assert/strict';
import {approvedFixture} from './fixtures/b2bPortalFixture.mjs';import {createAdminService} from '../server/b2b/adminService.mjs';
test('MFA reviewer role does not automatically grant member management; explicit assignment, reason and version required',async()=>{
 const f=await approvedFixture(),adminId='c'.repeat(32),token='d'.repeat(64),base=f.h.repository.transaction.bind(f.h.repository);
 f.h.repository.transaction=fn=>base(tx=>fn(Object.assign(tx,{adminSession:async()=>({id:adminId,state:'ACTIVE',role:'COMPANY_REVIEW',last_totp_counter:1}),adminConflicts:async()=>[],findManagedMembers:async query=>({items:[{email:f.s.user.email,companyId:f.s.company.id,legalName:f.s.company.legalName,members:[]}],next:null}),revokeCompanySessions:async companyId=>{for(const [k,s]of f.h.state.sessions){const m=f.h.state.members.find(m=>m.userId===s.userId);if(m?.companyId===companyId)f.h.state.sessions.delete(k);}}})));
 const make=ids=>createAdminService({repository:f.h.repository,passwordHasher:f.h.passwordHasher,key:Buffer.alloc(32),memberManagerAdminIds:ids});
 await assert.rejects(make([]).managedMembers(token,{query:'seller'}),e=>e.status===403);
 const admin=make([adminId]);assert.equal((await admin.managedMembers(token,{query:'seller'})).items.length,1);assert((await admin.me(token)).permissions.includes('member:manage'));
 const company=(await f.h.service.me(f.s.sessionToken)).company;
 await assert.rejects(admin.setCompanyAccess(token,{companyId:company.id,version:company.version,suspended:true,reason:''}),e=>e.status===400);
 await assert.rejects(admin.setCompanyAccess(token,{companyId:company.id,version:company.version,suspended:true,reason:'Protected historical acceptance company'}),e=>e.status===403&&e.message==='HISTORICAL_RECORD_PROTECTED');
 assert.equal((await f.h.service.me(f.s.sessionToken)).company.status,'VERIFIED');
 assert.throws(()=>make(['info@seedtrade.eu']),/INVALID_MEMBER_MANAGEMENT_ASSIGNMENT/);
});
