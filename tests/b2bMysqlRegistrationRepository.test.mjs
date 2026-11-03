import test from 'node:test';
import assert from 'node:assert/strict';
import {createMysqlB2bRepository} from '../server/b2b/mysqlRegistrationRepository.mjs';

function fixture({failOn = ''} = {}) {
  const events = [];
  const db = {
    async beginTransaction(){events.push('begin');},
    async execute(sql,params){
      events.push({sql,params});
      if (sql.includes(failOn) && failOn) throw new Error('fixture failure');
      if (sql.startsWith('INSERT')) return [{insertId:events.length}];
      return [{affectedRows:1}];
    },
    async commit(){events.push('commit');},
    async rollback(){events.push('rollback');},
    release(){events.push('release');}
  };
  return {events,repository:createMysqlB2bRepository({async getConnection(){return db;}})};
}

test('registration operations commit in one transaction with parameterized SQL',async()=>{
  const {events,repository}=fixture();
  await repository.transaction(async tx=>{
    const companyId=await tx.insertCompany({legalName:'Seed Co',registrationCountry:'LT',registrationNumber:'123'});
    const userId=await tx.insertUser({email:'a@example.com',passwordHash:'hash'});
    await tx.insertCompanyMember({companyId,userId,role:'COMPANY_ADMIN'});
    await tx.insertEmailVerification({userId,tokenHash:'a'.repeat(64),expiresAt:new Date()});
    await tx.appendAudit({actorUserId:userId,companyId,action:'COMPANY_REGISTRATION',entityType:'company',entityId:String(companyId)});
  });
  assert.equal(events[0],'begin');
  assert.equal(events.at(-2),'commit');
  assert.equal(events.at(-1),'release');
  assert.equal(events.filter(e=>typeof e==='object').length,5);
  assert.ok(events.filter(e=>typeof e==='object').every(e=>e.sql.includes('?')));
});
test('verification token consumption uses atomic conditional UPDATE',async()=>{
  const {events,repository}=fixture();
  const result=await repository.transaction(tx=>tx.consumeEmailVerification({userId:2,tokenHash:'b'.repeat(64)}));
  assert.equal(result,true);
  const query=events.find(e=>typeof e==='object');
  assert.match(query.sql,/consumed_at IS NULL AND expires_at>UTC_TIMESTAMP\(3\)/);
});
test('failed database operation rolls back and releases connection',async()=>{
  const {events,repository}=fixture({failOn:'INSERT INTO b2b_users'});
  await assert.rejects(()=>repository.transaction(tx=>tx.insertUser({email:'a@example.com',passwordHash:'hash'})));
  assert.ok(events.includes('rollback'));
  assert.ok(!events.includes('commit'));
  assert.equal(events.at(-1),'release');
});
