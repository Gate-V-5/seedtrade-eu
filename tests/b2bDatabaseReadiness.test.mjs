import test from 'node:test';
import assert from 'node:assert/strict';
import {b2bDatabaseConfig,checkB2bDatabase} from '../server/b2b/databaseReadiness.mjs';

const env={B2B_DB_HOST:'localhost',B2B_DB_USER:'test',B2B_DB_PASSWORD:'private',
 B2B_DB_NAME:'testdb',B2B_DB_PORT:'3306'};

test('database configuration is explicit and opt-in',()=>{
  assert.equal(b2bDatabaseConfig(env).database,'testdb');
  assert.throws(()=>b2bDatabaseConfig({}),/B2B_DB_CONFIG_INCOMPLETE/);
  assert.throws(()=>b2bDatabaseConfig({...env,B2B_DB_PORT:'0'}),/B2B_DB_CONFIG_INCOMPLETE/);
});
test('readiness succeeds only for successful SELECT 1',async()=>{
  let closed=false;
  const driver={async createConnection(){return {
    async query(sql){assert.equal(sql,'SELECT 1 AS ok');return [[{ok:1}]];},
    async end(){closed=true;}
  }}};
  assert.deepEqual(await checkB2bDatabase({env,driver}),{status:'PASS'});
  assert.equal(closed,true);
});
test('readiness fails closed and suppresses database errors',async()=>{
  const driver={async createConnection(){throw new Error('sensitive connection string')}};
  assert.deepEqual(await checkB2bDatabase({env,driver}),{status:'BLOCKED'});
});
