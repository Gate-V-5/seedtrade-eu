import test from 'node:test';
import assert from 'node:assert/strict';
import {handleDisabledB2bApi} from '../server/b2b/disabledApi.mjs';

function response() {
  return {
    status: null, headers: null, body: '',
    writeHead(status, headers) { this.status = status; this.headers = headers; },
    end(body) { this.body = body; }
  };
}
test('B2B API is fail-closed for all methods and does not reveal data', () => {
  for (const method of ['GET','POST','OPTIONS']) {
    for (const url of ['/api/b2b/v1/register','/api/b2b/v1/verify-email','/api/b2b/v1/unknown']) {
      const res = response();
      assert.equal(handleDisabledB2bApi({method,url},res),true);
      assert.equal(res.status,404);
      assert.deepEqual(JSON.parse(res.body),{error:'NOT_FOUND'});
      assert.equal(res.headers['Cache-Control'],'no-store');
    }
  }
});
test('B2B boundary leaves existing routes untouched', () => {
  for (const url of ['/','/api/network-interest','/api/internal/network-delivery','/b2b/register','/b2b/verify-email']) {
    const res=response();
    assert.equal(handleDisabledB2bApi({method:'GET',url},res),false);
    assert.equal(res.status,null);
  }
});
