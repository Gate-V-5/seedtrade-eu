import test from 'node:test';
import assert from 'node:assert/strict';
import {confirmB2bEmail} from '../src/b2b/confirmEmail.mjs';

const base='https://staging.seedtrade.eu/b2b/verify-email';
function setup(fragment, responseStatus=200) {
  const events=[];
  const history={replaceState(_state,_title,url){events.push(['clear',url]);}};
  const location={href:base+'#'+fragment};
  const fetcher=async(url,options)=>{
    events.push(['fetch',url,options]);
    return {status:responseStatus};
  };
  return {events,history,location,fetcher};
}
test('clears URL fragment before posting token as JSON',async()=>{
  const h=setup('user=42&token='+'a'.repeat(64));
  assert.deepEqual(await confirmB2bEmail(h),{status:'EMAIL_VERIFIED'});
  assert.deepEqual(h.events[0],['clear','/b2b/verify-email']);
  assert.equal(h.events[1][0],'fetch');
  assert.equal(h.events[1][2].referrerPolicy,'no-referrer');
  assert.equal(JSON.parse(h.events[1][2].body).userId,42);
});
test('invalid link never makes a network request',async()=>{
  const h=setup('user=42&token=bad');
  assert.deepEqual(await confirmB2bEmail(h),{status:'INVALID_LINK'});
  assert.deepEqual(h.events,[['clear','/b2b/verify-email']]);
});
test('expired token and backend failure are not reported as success',async()=>{
  const expired=setup('user=42&token='+'b'.repeat(64),400);
  assert.deepEqual(await confirmB2bEmail(expired),{status:'INVALID_OR_EXPIRED'});
  const unavailable=setup('user=42&token='+'b'.repeat(64),503);
  assert.deepEqual(await confirmB2bEmail(unavailable),{status:'UNAVAILABLE'});
});
