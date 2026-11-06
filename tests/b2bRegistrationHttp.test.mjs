import test from 'node:test';
import assert from 'node:assert/strict';
import {Readable} from 'node:stream';
import {createB2bRegistrationHttp} from '../server/b2b/registrationHttp.mjs';
function request(path, body={}, opts={}) {
  const req=Readable.from([Buffer.from(JSON.stringify(body))]);
  req.url=path;req.method=opts.method??'POST';
  req.headers={origin:opts.origin??'https://staging.seedtrade.eu', 'content-type':opts.contentType??'application/json'};
  return req;
}
function response(){return {status:0,headers:null,body:'',writeHead(code,headers){this.status=code;this.headers=headers;},end(data){this.body=data;}};}
function handler({enabled=true,rateLimiter=async()=>true,service}={}){
  return createB2bRegistrationHttp({enabled,rateLimiter,allowedOrigin:'https://staging.seedtrade.eu',
    service:service??{async register(){return {status:'PENDING_EMAIL_VERIFICATION'};},async verifyEmail(){return {status:'EMAIL_VERIFIED'};}}});
}
test('disabled router is invisible',async()=>{
  const res=response();assert.equal(await handler({enabled:false})(request('/api/b2b/v1/register'),res),true);assert.equal(res.status,404);
});
test('does not intercept unrelated routes',async()=>{
  assert.equal(await handler()(request('/api/network-interest'),response()),false);
  assert.equal(await handler()(request('http://['),response()),false);
});

test('rate limiter failure returns a generic outage without invoking storage',async()=>{
  let calls=0;
  const res=response();
  await handler({rateLimiter:async()=>{throw Error('private details');},
    service:{async register(){calls++;},async verifyEmail(){calls++;}}})(request('/api/b2b/v1/register'),res);
  assert.equal(res.status,503);
  assert.deepEqual(JSON.parse(res.body),{error:'TEMPORARILY_UNAVAILABLE'});
  assert.equal(calls,0);
});
test('register and verify return non-sensitive acknowledgements',async()=>{
  const h=handler();
  for(const path of ['/api/b2b/v1/register','/api/b2b/v1/verify-email']){
    const res=response();await h(request(path),res);assert.equal(res.status,path.endsWith('/register')?202:200);assert.equal(res.headers['Cache-Control'],'no-store');
  }
});
test('origin, content type, rate limits and JSON are enforced',async()=>{
  const h=handler();let res=response();
  await h(request('/api/b2b/v1/register',{}, {origin:'https://attacker.example'}),res);assert.equal(res.status,403);
  res=response();await h(request('/api/b2b/v1/register',{}, {contentType:'text/plain'}),res);assert.equal(res.status,403);
  res=response();await handler({rateLimiter:async()=>false})(request('/api/b2b/v1/register'),res);assert.equal(res.status,429);
  res=response();
  const bad=Readable.from(['{bad']);bad.url='/api/b2b/v1/register';bad.method='POST';
  bad.headers={origin:'https://staging.seedtrade.eu','content-type':'application/json'};
  await h(bad,res);assert.equal(res.status,400);
});
test('service errors do not leak database details or falsely claim success',async()=>{
  const res=response();await handler({service:{async register(){throw Error('secret db host')},async verifyEmail(){}}})(request('/api/b2b/v1/register'),res);
  assert.equal(res.status,503);assert.doesNotMatch(res.body,/secret|db host/i);
});

test('invalid token cannot be reported as verified',async()=>{
 const res=response();await handler({service:{async register(){return {status:'PENDING_EMAIL_VERIFICATION'};},async verifyEmail(){return {status:'INVALID_OR_EXPIRED'};}}})(request('/api/b2b/v1/verify-email'),res);
 assert.equal(res.status,400);assert.match(res.body,/INVALID_OR_EXPIRED/);
});
test('mail delivery failure is reported as pending, not delivered',async()=>{
 const res=response();await handler({service:{async register(){return {status:'PENDING_EMAIL_DELIVERY'};},async verifyEmail(){return {status:'EMAIL_VERIFIED'};}}})(request('/api/b2b/v1/register'),res);
 assert.equal(res.status,202);assert.match(res.body,/PENDING_EMAIL_DELIVERY/);
});
