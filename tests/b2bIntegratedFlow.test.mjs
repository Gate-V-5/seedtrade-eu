import test from 'node:test';
import assert from 'node:assert/strict';
import {createB2bPasswordHasher} from '../server/b2b/passwordHasher.mjs';
import {createB2bRegistrationModule} from '../server/b2b/createRegistrationModule.mjs';
import {Readable} from 'node:stream';

test('scrypt hashes are salted, verifiable and reject wrong passwords', async () => {
  const h = createB2bPasswordHasher();
  const password = 'long example password for testing';
  const a = await h.hash(password), b = await h.hash(password);
  assert.notEqual(a,b);
  assert.ok(a.startsWith('scrypt$16384$8$1$'));
  assert.equal(await h.verify(password,a),true);
  assert.equal(await h.verify('wrong example password',a),false);
  assert.equal(await h.verify(password,'malformed'),false);
  await assert.rejects(h.hash('short'),/INVALID_PASSWORD/);
});

test('full HTTP registration and verification with injected transactional fake DB', async () => {
  const events=[];
  const state={tokenHash:null,used:false,verified:false};
  const connection={
    async beginTransaction(){events.push('begin');},
    async execute(sql,args){
      if(sql.startsWith('INSERT INTO b2b_companies')) return [{insertId:21}];
      if(sql.startsWith('INSERT INTO b2b_users')) {
        assert.ok(args[1].startsWith('scrypt$'));
        return [{insertId:42}];
      }
      if(sql.startsWith('INSERT INTO b2b_email_verifications')) state.tokenHash=args[1];
      if(sql.startsWith('UPDATE b2b_email_verifications')) {
        if(state.used || args[1]!==state.tokenHash) return [{affectedRows:0}];
        state.used=true; return [{affectedRows:1}];
      }
      if(sql.startsWith('UPDATE b2b_users')) state.verified=true;
      return [{affectedRows:1}];
    },
    async commit(){events.push('commit');},
    async rollback(){events.push('rollback');},
    release(){events.push('release');}
  };
  let sent;
  const handle=createB2bRegistrationModule({
    pool:{async getConnection(){return connection;}},
    passwordHasher:createB2bPasswordHasher(),
    mailer:{async sendVerification(msg){assert.equal(events.at(-1),'release');sent=msg;}},
    rateLimiter:async()=>true,allowedOrigin:'https://staging.seedtrade.eu',enabled:true
  });
  async function post(path,body) {
    const req=Readable.from([Buffer.from(JSON.stringify(body))]);
    req.method='POST';req.url=path;
    req.headers={origin:'https://staging.seedtrade.eu','content-type':'application/json'};
    const res={status:null,body:null,writeHead(s){this.status=s;},end(v){this.body=JSON.parse(v);}};
    assert.equal(await handle(req,res),true);
    return res;
  }
  const registration=await post('/api/b2b/v1/register',{
    email:'owner@example.test',password:'a sufficiently long password',
    company:{legalName:'Seed Trade',registrationCountry:'LT',registrationNumber:'123456'}
  });
  assert.equal(registration.status,202);
  assert.equal(registration.body.status,'PENDING_EMAIL_VERIFICATION');
  assert.equal(sent.userId,42);
  const confirmed=await post('/api/b2b/v1/verify-email',{userId:42,token:sent.token});
  assert.equal(confirmed.status,200);
  assert.equal(state.verified,true);
  const replay=await post('/api/b2b/v1/verify-email',{userId:42,token:sent.token});
  assert.equal(replay.status,400);
  assert.equal(events.includes('rollback'),false);
});
