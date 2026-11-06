import test from 'node:test';
import assert from 'node:assert/strict';
import {Readable} from 'node:stream';
import {createB2bStagingRuntime} from '../server/b2b/stagingRuntime.mjs';

const env = {
  SEEDTRADE_RUNTIME_ENV:'staging', SEEDTRADE_PUBLIC_ORIGIN:'https://staging.seedtrade.eu',
  SEEDTRADE_MAIL_TRANSPORT:'test-stream', B2B_REGISTRATION_ENABLED:'true',
  B2B_REGISTRATION_RUNTIME_VERIFIED:'true', B2B_REGISTRATION_STORAGE_VERIFIED:'true',
  B2B_REGISTRATION_MAIL_VERIFIED:'true', B2B_REGISTRATION_PROXY_VERIFIED:'true',
  B2B_REGISTRATION_PRIVACY_APPROVED:'true', B2B_DB_HOST:'127.0.0.1', B2B_DB_PORT:'3306',
  B2B_DB_NAME:'u230581718_staging_b2b', B2B_DB_USER:'u230581718_b2b_stage',
  B2B_DB_PASSWORD:'synthetic-only', B2B_PROXY_MODE:'trusted', B2B_TRUSTED_PROXY_IPS:'127.0.0.1'
};
async function request(runtime, url, body, overrides = {}) {
  const req = Readable.from(body ? [Buffer.from(JSON.stringify(body))] : []);
  Object.assign(req, {url, method:body ? 'POST' : 'GET', socket:{remoteAddress:'127.0.0.1'},
    headers:{origin:env.SEEDTRADE_PUBLIC_ORIGIN, 'content-type':'application/json',
      'x-forwarded-proto':'https', 'x-forwarded-for':'192.0.2.1'}}, overrides);
  const res = {writeHead(status, headers){this.status=status; this.headers=headers;},
    end(body){this.body=JSON.parse(body);}};
  assert.equal(await runtime.handle(req,res), true);
  return res;
}
function fixture({wrongIdentity = false, failedDatabase = false} = {}) {
  const state = {sql:[], sent:[], destroyed:0, ended:0, closed:0, used:false};
  const connection = {
    async execute(sql, params) {
      state.sql.push(sql);
      if (failedDatabase) throw new Error('synthetic private driver details');
      if (sql.startsWith('SELECT DATABASE')) return [[{db:wrongIdentity ? 'wrong' : env.B2B_DB_NAME,
        account:'u230581718_b2b_stage@127.0.0.1'}]];
      if (sql.startsWith('INSERT INTO b2b_companies')) return [{insertId:21}];
      if (sql.startsWith('INSERT INTO b2b_users')) return [{insertId:42}];
      if (sql.startsWith('INSERT INTO b2b_email_verifications')) state.tokenHash=params[1];
      if (sql.startsWith('UPDATE b2b_email_verifications')) {
        if (state.used || params[1] !== state.tokenHash) return [{affectedRows:0}];
        state.used=true; return [{affectedRows:1}];
      }
      return [{affectedRows:1}];
    },
    async beginTransaction(){state.sql.push('BEGIN');}, async commit(){state.sql.push('COMMIT');},
    async rollback(){state.sql.push('ROLLBACK');}, release(){}, destroy(){state.destroyed++;}
  };
  const dependencies = {
    driver:{createPool(config){state.config=config; return {
      async getConnection(){return connection;}, async end(){state.ended++;}
    };}},
    createMail(){return {from:'staging-test@seedtrade.invalid', transport:{
      async sendMail(message){assert.equal(state.sql.at(-1),'COMMIT');state.sent.push(message);return {accepted:[message.to],rejected:[]};},
      close(){state.closed++;}
    }};}
  };
  return {state, dependencies};
}
const body = {email:'owner@example.test', password:'a sufficiently long test password',
  company:{legalName:'Synthetic Company', registrationCountry:'LT', registrationNumber:'WP05-TEST'}};

test('every missing gate, production, SMTP and wrong database stay closed without creating dependencies', async () => {
  const configurations = [{}, ...Object.keys(env).filter(key => key.startsWith('B2B_REGISTRATION_'))
    .map(key => ({...env, [key]:'false'})), {...env, SEEDTRADE_RUNTIME_ENV:'production'},
    {...env, SEEDTRADE_MAIL_TRANSPORT:'smtp'}, {...env, B2B_DB_NAME:'other'},
    {...env, B2B_DB_PASSWORD:''}, {...env, B2B_PROXY_MODE:''},
    {...env,B2B_REGISTRATION_MAIL_TRANSPORT:'smtp',B2B_REGISTRATION_ENABLED:'false'},
    {...env,B2B_REGISTRATION_MAIL_TRANSPORT:'unknown'}];
  for (const configuration of configurations) {
    let pools = 0, transports = 0;
    const runtime = await createB2bStagingRuntime(configuration, {
      driver:{createPool(){pools++; throw new Error('unexpected pool');}},
      createMail(){transports++; throw new Error('unexpected transport');}
    });
    for (const url of ['/api/b2b/v1/status','/api/b2b/v1/register','/api/b2b/v1/verify-email']) {
      assert.equal((await request(runtime,url)).status,404);
    }
    await runtime.close();
    assert.equal(pools,0);
    assert.equal(transports,0);
  }
});

test('gated staging flow checks identity before writes, uses UTC, reports stream non-delivery and verifies once', async () => {
  const {state, dependencies} = fixture();
  const runtime = await createB2bStagingRuntime(env, dependencies);
  assert.deepEqual((await request(runtime,'/api/b2b/v1/status')).body,{registrationAvailable:true});
  assert.equal(state.sql.length,0);
  const registration = await request(runtime,'/api/b2b/v1/register',body);
  assert.equal(registration.status,202);
  assert.deepEqual(registration.body,{status:'PENDING_EMAIL_DELIVERY'});
  assert.equal(state.config.timezone,'Z');
  assert.equal(state.config.multipleStatements,false);
  assert.match(state.sql[0],/^SELECT DATABASE/);
  assert.equal(state.sql[1],'BEGIN');
  const fragment = new URLSearchParams(new URL(state.sent[0].text.match(/https:\/\/\S+/)[0]).hash.slice(1));
  const verification = {userId:Number(fragment.get('user')),token:fragment.get('token')};
  assert.equal((await request(runtime,'/api/b2b/v1/verify-email',verification)).status,200);
  assert.equal((await request(runtime,'/api/b2b/v1/verify-email',verification)).status,400);
  await runtime.close();
  assert.equal(state.ended,1);
  assert.equal(state.closed,1);
});

test('proxy spoofing cannot reach storage and a wrong database identity fails before BEGIN', async () => {
  for (const options of [{wrongIdentity:true},{failedDatabase:true}]) {
    const {state, dependencies} = fixture(options);
    const runtime = await createB2bStagingRuntime(env, dependencies);
    const spoofed = {socket:{remoteAddress:'192.0.2.9'}};
    assert.deepEqual((await request(runtime,'/api/b2b/v1/status',null,spoofed)).body,{registrationAvailable:false});
    assert.equal((await request(runtime,'/api/b2b/v1/register',body,spoofed)).status,429);
    assert.equal(state.sql.length,0);
    const result = await request(runtime,'/api/b2b/v1/register',body);
    assert.equal(result.status,503);
    assert.deepEqual(result.body,{error:'TEMPORARILY_UNAVAILABLE'});
    assert.equal(state.sql.length,1);
    assert.equal(state.destroyed,1);
    assert.equal(state.sent.length,0);
    await runtime.close();
  }
});

test('transport cleanup failure still closes the pool and startup cleanup stays fail-closed', async () => {
  const f=fixture();
  f.dependencies.createMail=()=>({from:'staging-test@seedtrade.invalid',transport:{
    async sendMail(){},close(){throw Error('private cleanup details');}
  }});
  const runtime=await createB2bStagingRuntime(env,f.dependencies);
  await assert.rejects(runtime.close());
  assert.equal(f.state.ended,1);
  const g=fixture();
  g.dependencies.createMail=()=>({from:'',transport:{
    async sendMail(){},close(){throw Error('private cleanup details');}
  }});
  const closed=await createB2bStagingRuntime(env,g.dependencies);
  assert.equal((await request(closed,'/api/b2b/v1/status')).status,404);
  assert.equal(g.state.ended,0); // Invalid mail configuration now stops before creating a pool.
});

test('SMTP registration commits before acceptance, verifies the link once and preserves pending delivery on rejection',async()=>{
  for(const rejected of [false,true]) {
    const f=fixture();
    if(rejected)f.dependencies.createMail=()=>({from:'verify@example.test',transport:{
      async sendMail(message){assert.equal(f.state.sql.at(-1),'COMMIT');f.state.sent.push(message);return {accepted:[],rejected:[message.to]};},close(){}
    }});
    const runtime=await createB2bStagingRuntime({...env,B2B_REGISTRATION_MAIL_TRANSPORT:'smtp'},f.dependencies);
    const result=await request(runtime,'/api/b2b/v1/register',body);
    assert.equal(result.status,202);
    assert.equal(result.body.status,rejected?'PENDING_EMAIL_DELIVERY':'PENDING_EMAIL_VERIFICATION');
    assert.equal(f.state.sent.length,1);
    assert.equal(f.state.sql.includes('ROLLBACK'),false);
    if(!rejected) {
      const fragment=new URLSearchParams(new URL(f.state.sent[0].text.match(/https:\/\/\S+/)[0]).hash.slice(1));
      const confirmation={userId:Number(fragment.get('user')),token:fragment.get('token')};
      assert.equal((await request(runtime,'/api/b2b/v1/verify-email',confirmation)).status,200);
      assert.equal((await request(runtime,'/api/b2b/v1/verify-email',confirmation)).status,400);
    }
    await runtime.close();
  }
});

test('closed and open B2B runtimes leave public pages and existing APIs untouched', async () => {
  const f=fixture();
  for (const runtime of [await createB2bStagingRuntime({}),await createB2bStagingRuntime(env,f.dependencies)]) {
    for (const url of ['/','/market/','/privacy/','/b2b/register','/b2b/verify-email',
      '/api/network-interest','/api/internal/network-delivery','http://[']) {
      const handled=await runtime.handle({url,method:'GET',headers:{},socket:{}}, {
        writeHead(){assert.fail('unrelated response intercepted');},end(){assert.fail('unrelated response ended');}
      });
      assert.equal(handled,false,url);
    }
    await runtime.close();
  }
  assert.equal(f.state.sql.length,0);
  assert.equal(f.state.sent.length,0);
});
