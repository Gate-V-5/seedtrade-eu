import test from 'node:test';
import assert from 'node:assert/strict';
import {Readable} from 'node:stream';
import {b2bRegistrationReadiness, createB2bRegistrationModule} from '../server/b2b/createRegistrationModule.mjs';

test('composition preserves the disabled default and never opens a DB connection', async () => {
  let connections=0;
  const handle=createB2bRegistrationModule({
    pool:{async getConnection(){connections++;throw Error('should not connect');}},
    passwordHasher:{async hash(){return 'hash';}},
    mailer:{async sendVerification(){}},
    rateLimiter:async()=>true,
    allowedOrigin:'https://staging.seedtrade.eu'
  });
  const req=Readable.from([]);req.url='/api/b2b/v1/register';req.method='POST';req.headers={};
  const res={status:0,writeHead(status){this.status=status;},end(){}};
  assert.equal(await handle(req,res),true);
  assert.equal(res.status,404);
  assert.equal(connections,0);
});

test('registration activation remains blocked without complete independent staging evidence', () => {
  const base = {
    SEEDTRADE_RUNTIME_ENV:'staging',
    SEEDTRADE_PUBLIC_ORIGIN:'https://staging.seedtrade.eu',
    SEEDTRADE_MAIL_TRANSPORT:'test-stream',
    B2B_REGISTRATION_ENABLED:'true',
    B2B_REGISTRATION_RUNTIME_VERIFIED:'true',
    B2B_REGISTRATION_STORAGE_VERIFIED:'true',
    B2B_REGISTRATION_MAIL_VERIFIED:'true',
    B2B_REGISTRATION_PROXY_VERIFIED:'true',
    B2B_REGISTRATION_PRIVACY_APPROVED:'true'
  };
  assert.equal(b2bRegistrationReadiness({}).status,'BLOCKED');
  assert.equal(b2bRegistrationReadiness(base).status,'READY_FOR_ISOLATED_TEST');
  for (const key of Object.keys(base)) {
    const altered={...base,[key]:key==='SEEDTRADE_RUNTIME_ENV'?'production':'false'};
    assert.equal(b2bRegistrationReadiness(altered).status,'BLOCKED',key);
  }
  assert.equal(b2bRegistrationReadiness({...base,B2B_REGISTRATION_ENABLED:'false'}).status,'BLOCKED');
});
