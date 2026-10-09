import test from 'node:test'
import assert from 'node:assert/strict'
import mysql from 'mysql2/promise'
import { readFile } from 'node:fs/promises'
import { createMysqlLeadStore } from '../server/networkMysqlStore.mjs'
// Explicit local disposable database ONLY. No production variable is read by this test.
const enabled=process.env.B2B_TEST_MYSQL_DISPOSABLE==='true'
test('REAL MYSQL: migration twice, transactions, concurrent duplicates, restart, locks, retry and private deletion',{skip:!enabled},async()=>{
 const {B2B_TEST_MYSQL_HOST:host,B2B_TEST_MYSQL_DATABASE:database,B2B_TEST_MYSQL_USER:user,B2B_TEST_MYSQL_PASSWORD:password}=process.env
 assert.ok(['127.0.0.1','::1'].includes(host),'loopback DB only')
 assert.match(database||'',/^seedtrade_disposable_[a-z0-9_]+$/)
 const options={host,database,user,password,port:Number(process.env.B2B_TEST_MYSQL_PORT||3306),connectionLimit:4,multipleStatements:false}
 const pool=mysql.createPool(options),secret='disposable-test-only-secret-32-characters',lockName=database.slice(0,64)
 const store=createMysqlLeadStore({pool,secret,rateMaximum:20,lockName})
 try{
 const migration=await readFile('server/migrations/001_b2b_private_enquiries.sql','utf8')
 for(let cycle=0;cycle<2;cycle++)for(const statement of migration.split('\n').filter(line=>!line.trim().startsWith('--')).join('\n').split(';').map(s=>s.trim()).filter(Boolean))await pool.query(statement)
 await store.verify()
 const input={company:"SQL '); DROP TABLE b2b_enquiries; --",email:'buyer@example.test',role:'Buyer',country:'LT'}
 const request={input,idempotencyKey:'local-disposable-key-1',clientIdentity:'127.0.0.1'}
 const results=await Promise.all(Array.from({length:8},()=>store.receive(request)))
 assert.equal(new Set(results.map(r=>r.record.ENQUIRY_ID)).size,1);assert.equal(results.filter(r=>!r.duplicate).length,1)
 const id=results[0].record.ENQUIRY_ID
 await assert.rejects(store.receive({...request,input:{...input,company:'conflict'}}),{code:'IDEMPOTENCY_CONFLICT'})
 const restart=createMysqlLeadStore({pool,secret,rateMaximum:20,lockName});assert.equal((await restart.exportOne(id)).COMPANY_NAME,input.company)
 await store.withDeliveryLock(async session=>{
 assert.deepEqual(await restart.withDeliveryLock(()=>{throw Error('lock must exclude')}),{busy:true,processed:0})
 const claims=await Promise.all([store.claim(id,3),restart.claim(id,3)]);assert.equal(claims.filter(Boolean).length,1)
 const claim=claims.find(Boolean)
 await store.settle(id,claim.token,'DELIVERY_FAILED_RETRYABLE',{LAST_DELIVERY_ERROR_CODE:'PROVIDER_REJECTED',NEXT_ATTEMPT_AT:0})
 const second=await store.claim(id,3);assert.equal(second.record.DELIVERY_ATTEMPTS,2)
 await store.recover(session);assert.equal((await store.exportOne(id)).DELIVERY_STATUS,'MANUAL_REVIEW_REQUIRED')
 assert.equal(await store.claim(id,3),null)
 })
 await store.deleteOne(id);assert.equal(await store.exportOne(id),null)
 const [rows]=await pool.execute('SELECT * FROM b2b_idempotency WHERE enquiry_id=?',[id]);assert.equal(rows.length,0)
 }finally{await pool.end()}
})
