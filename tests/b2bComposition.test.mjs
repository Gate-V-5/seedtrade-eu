import test from 'node:test';
import assert from 'node:assert/strict';
import {Readable} from 'node:stream';
import {createB2bRegistrationModule} from '../server/b2b/createRegistrationModule.mjs';

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
