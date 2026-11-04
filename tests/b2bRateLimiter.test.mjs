import test from 'node:test';
import assert from 'node:assert/strict';
import {createB2bRateLimiter} from '../server/b2b/rateLimiter.mjs';

test('limits requests by socket address and route without trusting forwarding headers', async () => {
  let now=1000;
  const limit=createB2bRateLimiter({limit:2,windowMs:1000,now:()=>now});
  const request=(address,url='/api/b2b/v1/register')=>({
    url,socket:{remoteAddress:address},headers:{'x-forwarded-for':'spoofed'}
  });
  assert.equal(await limit(request('127.0.0.1')),true);
  assert.equal(await limit(request('127.0.0.1')),true);
  assert.equal(await limit(request('127.0.0.1')),false);
  assert.equal(await limit(request('127.0.0.2')),true);
  assert.equal(await limit(request('127.0.0.1','/api/b2b/v1/verify-email')),true);
  now=2000;
  assert.equal(await limit(request('127.0.0.1')),true);
});
test('missing trusted socket identity fails closed', async () => {
  const limit=createB2bRateLimiter();
  assert.equal(await limit({url:'/api/b2b/v1/register',headers:{'x-forwarded-for':'1.2.3.4'}}),false);
});
