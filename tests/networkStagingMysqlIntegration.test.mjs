import test from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID, createHmac } from 'node:crypto'
import { createGuardedStagingPool, requireStagingIdentity } from '../server/networkStagingDatabase.mjs'
import { createMysqlLeadStore } from '../server/networkMysqlStore.mjs'
import { createDeliveryWorker } from '../server/networkDeliveryWorker.mjs'
import { createStagingTestSender } from '../server/networkStagingRuntime.mjs'
import { migrateStagingDatabase } from '../server/networkStagingMigration.mjs'
const enabled=process.env.B2B_STAGING_REAL_TESTS==='true'
// Invoke only inside authorised private staging runtime. No credentials in arguments/results.
test('REAL STAGING MYSQL: migration, receipt, duplicates, retries, locks, rollback, reconnect and cleanup',{skip:!enabled,timeout:60000},async()=>{
 const env=process.env;requireStagingIdentity(env);assert.equal(env.B2B_STAGING_TEST_EXECUTION,'true')
 await migrateStagingDatabase(env);await migrateStagingDatabase(env)
 const prefix='3h-synthetic-'+randomUUID(),secret=env.B2B_STORAGE_SECRET
 const keyHash=key=>createHmac('sha256',secret).update('key:'+key).digest('hex')
 let pool=createGuardedStagingPool(env),store=createMysqlLeadStore({pool,secret,rateMaximum:20,globalMaximum:100,lockName:'seedtrade_3h_test_worker'}),ids=[],keys=[]
 async function query(sql,args=[]){const c=await pool.getConnection();try{const [rows]=await c.execute({sql,timeout:4000},args);return rows}finally{c.release()}}
 const request=key=>({input:{company:prefix+" SQL '); DROP TABLE b2b_enquiries; --",email:'synthetic@example.invalid',role:'Buyer',country:'TEST'},idempotencyKey:key,clientIdentity:prefix})
 try {
 await store.verify()
 const key=prefix+'-concurrent';keys.push(key)
 const results=await Promise.all(Array.from({length:4},()=>store.receive(request(key))))
 ids.push(results[0].record.ENQUIRY_ID)
 assert.equal(new Set(results.map(r=>r.record.ENQUIRY_ID)).size,1);assert.equal(results.filter(r=>!r.duplicate).length,1)
 assert.equal((await store.exportOne(ids[0])).COMPANY_NAME,request(key).input.company)
 await assert.rejects(store.receive({...request(key),input:{...request(key).input,company:prefix+'-different'}}),{code:'IDEMPOTENCY_CONFLICT'})
 await pool.end();pool=createGuardedStagingPool(env);store=createMysqlLeadStore({pool,secret,rateMaximum:20,globalMaximum:100,lockName:'seedtrade_3h_test_worker'})
 assert.equal((await store.receive(request(key))).record.ENQUIRY_ID,ids[0]) // New connections/pool, durable persistence.
 const competitor=createMysqlLeadStore({pool,secret,lockName:'seedtrade_3h_test_worker'})
 await store.withDeliveryLock(async()=>{
 assert.deepEqual(await competitor.withDeliveryLock(()=>{throw Error('lock must exclude')}),{busy:true,processed:0})
 const claims=await Promise.all([store.claim(ids[0],3),competitor.claim(ids[0],3)])
 assert.equal(claims.filter(Boolean).length,1)
 await store.settle(ids[0],claims.find(Boolean).token,'DELIVERY_FAILED_RETRYABLE',{NEXT_ATTEMPT_AT:0,LAST_DELIVERY_ERROR_CODE:'PROVIDER_REJECTED'})
 for(let attempt=2;attempt<=3;attempt++){
 const claim=await store.claim(ids[0],3);assert.equal(claim.record.DELIVERY_ATTEMPTS,attempt)
 await store.settle(ids[0],claim.token,attempt===3?'DELIVERY_FAILED_PERMANENT':'DELIVERY_FAILED_RETRYABLE',{NEXT_ATTEMPT_AT:0,LAST_DELIVERY_ERROR_CODE:'PROVIDER_REJECTED'})
 }
 assert.equal(await store.claim(ids[0],3),null)
 })
 const recoveryKey=prefix+'-recovery';keys.push(recoveryKey);const rec=await store.receive(request(recoveryKey));ids.push(rec.record.ENQUIRY_ID)
 await store.claim(rec.record.ENQUIRY_ID,3)
 await store.withDeliveryLock(session=>store.recover(session))
 assert.equal((await store.exportOne(rec.record.ENQUIRY_ID)).DELIVERY_STATUS,'MANUAL_REVIEW_REQUIRED')
 const streamKey=prefix+'-stream';keys.push(streamKey);const stream=await store.receive(request(streamKey));ids.push(stream.record.ENQUIRY_ID)
 const worker=createDeliveryWorker({store,sendMail:createStagingTestSender(env),from:'staging-test@seedtrade.invalid'})
 const delivered=await worker.deliver(stream.record.ENQUIRY_ID)
 assert.equal(delivered.DELIVERY_STATUS,'DELIVERY_FAILED_PERMANENT');assert.equal(delivered.LAST_DELIVERY_ERROR_CODE,'TEST_TRANSPORT_DISABLED')
 const rollbackKey=prefix+'-rollback';keys.push(rollbackKey)
 // Actual invalid SQL inside the active transaction; ensure preceding idempotency/budget writes roll back.
 const faultPool={end:()=>pool.end(),async getConnection(){const c=await pool.getConnection();const execute=c.execute.bind(c);c.execute=async(q,args)=>{if(q.sql.startsWith('INSERT INTO b2b_enquiries'))return execute({sql:'SELECT intentionally_missing_3h_column FROM b2b_enquiries LIMIT 0',timeout:4000});return execute(q,args)};const release=c.release.bind(c);c.release=()=>{c.execute=execute;c.release=release;release()};return c}}
 await assert.rejects(createMysqlLeadStore({pool:faultPool,secret,rateMaximum:20,globalMaximum:100}).receive(request(rollbackKey)),{code:'STORAGE_UNAVAILABLE'})
 assert.equal((await query('SELECT enquiry_id FROM b2b_idempotency WHERE key_hash=?',[keyHash(rollbackKey)])).length,0)
 await assert.rejects(createMysqlLeadStore({pool:{getConnection:async()=>{throw Error('synthetic connection failure')},end:async()=>{}},secret}).receive(request(prefix+'-failure')),{code:'STORAGE_UNAVAILABLE'})
 const recovered=await store.receive(request(rollbackKey));ids.push(recovered.record.ENQUIRY_ID)
 assert.equal(recovered.duplicate,false)
 // Only a synthetic ID is read privately; no HTTP record lookup exists.
 assert.equal((await store.exportOne(ids[0])).BUSINESS_EMAIL,'synthetic@example.invalid')
 }finally{
 // Delete only receipts created by this random-key run, never TRUNCATE/DROP or all leads.
 for(const key of keys){const rows=await query('SELECT enquiry_id FROM b2b_idempotency WHERE key_hash=?',[keyHash(key)]);for(const row of rows)if(row.enquiry_id&&!ids.includes(row.enquiry_id))ids.push(row.enquiry_id)}
 for(const id of ids){await store.deleteOne(id);assert.equal(await store.exportOne(id),null)}
 for(const key of keys)assert.equal((await query('SELECT enquiry_id FROM b2b_idempotency WHERE key_hash=?',[keyHash(key)])).length,0)
 for(const bucket of ['global','rate:'+prefix]){
 const hash=createHmac('sha256',secret).update(bucket).digest('hex')
 // Global bucket is shared; preserve it. Remove only this run's synthetic client bucket.
 if(bucket!=='global')await query('DELETE FROM b2b_rate_buckets WHERE bucket_hash=?',[hash])
 }
 await pool.end()
 }
})
