import test from 'node:test';
import assert from 'node:assert/strict';
import {createRegistrationService} from '../server/b2b/registrationService.mjs';

function harness({mailFails = false,companyId=21,userId=42} = {}) {
  const calls = [];
  const tx = {
    async insertCompany(v){calls.push(['company',v]);return companyId;},
    async insertUser(v){calls.push(['user',{email:v.email,hashPresent:!!v.passwordHash}]);return userId;},
    async insertCompanyMember(v){calls.push(['member',v]);},
    async insertEmailVerification(v){calls.push(['token',{userId:v.userId,hash:v.tokenHash,expiry:v.expiresAt}]);},
    async appendAudit(v){calls.push(['audit',v.action]);},
    async consumeEmailVerification(v){calls.push(['consume',v]);return true;},
    async markEmailVerified(v){calls.push(['verified',v]);}
  };
  const repository={async transaction(fn){calls.push(['begin']);const result=await fn(tx);calls.push(['commit']);return result;}};
  const passwordHasher={async hash(){return '$argon2id$test-fixture';}};
  const mailer={async sendVerification(v){calls.push(['mail',{email:v.email,tokenLength:v.token.length}]);if(mailFails)throw Error('mail unavailable');}};
  return {calls,service:createRegistrationService({repository,passwordHasher,mailer,now:()=>1000})};
}

test('registration commits company, user, membership and token before sending email',async()=>{
  const {calls,service}=harness();
  const result=await service.register({email:' OWNER@EXAMPLE.COM ',password:'a sufficiently long password',
    company:{legalName:'Seed Trade',registrationCountry:'lt',registrationNumber:'123456'}});
  assert.deepEqual(result,{companyId:21,userId:42,status:'PENDING_EMAIL_VERIFICATION'});
  assert.ok(calls.findIndex(x=>x[0]==='commit')<calls.findIndex(x=>x[0]==='mail'));
  assert.equal(calls.find(x=>x[0]==='member')[1].role,'COMPANY_ADMIN');
  assert.equal(calls.find(x=>x[0]==='token')[1].hash.length,64);
});

test('unsafe verification IDs are rejected before storage and unsafe generated IDs cannot commit or send mail',async()=>{
  for(const userId of [undefined,0,-1,'42',Number.MAX_SAFE_INTEGER+1,{},Infinity]) {
    const h=harness();
    await assert.rejects(h.service.verifyEmail({userId,token:'a'.repeat(64)}),/INVALID_USER_ID/);
    assert.equal(h.calls.length,0);
  }
  for(const options of [{companyId:0},{companyId:'21'},{userId:Number.MAX_SAFE_INTEGER+1}]) {
    const h=harness(options);
    await assert.rejects(h.service.register({email:'owner@example.test',password:'a sufficiently long password',
      company:{legalName:'Seed Trade',registrationCountry:'LT',registrationNumber:'123456'}}),/B2B_ID_UNSUPPORTED/);
    assert.equal(h.calls.some(call=>call[0]==='commit'||call[0]==='mail'),false);
  }
});
test('mail failure remains recoverable and is not a false registration success',async()=>{
  const {service}=harness({mailFails:true});
  const result=await service.register({email:'owner@example.com',password:'a sufficiently long password',
    company:{legalName:'Seed Trade',registrationCountry:'LT',registrationNumber:'123456'}});
  assert.equal(result.status,'PENDING_EMAIL_DELIVERY');
});
test('email verification consumes token in same transaction as verified state',async()=>{
  const {calls,service}=harness();
  const result=await service.verifyEmail({userId:42,token:'a'.repeat(64)});
  assert.equal(result.status,'EMAIL_VERIFIED');
  assert.ok(calls.findIndex(x=>x[0]==='consume')<calls.findIndex(x=>x[0]==='verified'));
  assert.ok(calls.findIndex(x=>x[0]==='verified')<calls.findIndex(x=>x[0]==='commit'));
});
test('invalid registration inputs fail before writes',async()=>{
  const {calls,service}=harness();
  await assert.rejects(()=>service.register({email:'bad',password:'short',company:{}}),/INVALID_EMAIL/);
  assert.equal(calls.length,0);
});
