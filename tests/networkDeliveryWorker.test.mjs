import test from 'node:test'
import assert from 'node:assert/strict'
import { createMockLeadStore, requireStorageContract } from '../server/networkLeadStore.mjs'
import { createDeliveryWorker, RECIPIENT } from '../server/networkDeliveryWorker.mjs'
const input={company:'Mock <b>Seed</b>',email:'test@example.org',role:'Seller',country:'LT',website:''}
async function fixture(sendMail,options={}) {
  let time=1000; const store=createMockLeadStore({secret:'synthetic-mock-only-secret-000000000',now:()=>time})
  const {record}=await store.receive({input,idempotencyKey:'synthetic-key-00001',clientIdentity:'test'})
  const worker=createDeliveryWorker({store,sendMail,from:'network@seedtrade.eu',allowTestAdapter:true,now:()=>time,retryMs:10,timeoutMs:30,...options})
  return {store,worker,id:record.ENQUIRY_ID,advance:()=>time+=1000}
}
test('provider accepted is not inbox delivered, plaintext injection is inert, concurrent workers send once',async()=>{
  let sends=0
  const f=await fixture(async mail=>{sends++;assert.equal(mail.to,RECIPIENT);assert.equal(mail.html,undefined);assert.ok(mail.text.includes('<b>'));return{accepted:[RECIPIENT],messageId:'mock@example.invalid'}})
  await Promise.all([f.worker.deliver(f.id),f.worker.deliver(f.id),f.worker.deliver(f.id)])
  assert.equal(sends,1);assert.equal(f.store.inspect(f.id).DELIVERY_STATUS,'DELIVERED_TO_PROVIDER');assert.equal(await f.worker.deliver(f.id),null)
})
test('explicit known provider rejection retries at most three times',async()=>{
  let sends=0
  const f=await fixture(async()=>{sends++;throw Object.assign(Error('private text'),{deliveryOutcome:'NOT_ACCEPTED',retryable:true})})
  for(let n=0;n<3;n++){await f.worker.deliver(f.id);f.advance()}
  assert.equal(sends,3);assert.equal(f.store.inspect(f.id).DELIVERY_STATUS,'DELIVERY_FAILED_PERMANENT');assert.equal(await f.worker.deliver(f.id),null)
  assert.ok(!JSON.stringify(f.store.inspect(f.id)).includes('private text'))
})
test('unknown provider failure is manual review and never automatically resent',async()=>{
 const f=await fixture(async()=>{throw Error('uncertain')});await f.worker.deliver(f.id);f.advance();assert.equal(await f.worker.deliver(f.id),null);assert.equal(f.store.inspect(f.id).DELIVERY_STATUS,'MANUAL_REVIEW_REQUIRED')
})
test('timeout becomes manual review; late acceptance cannot alter state or trigger retry',async()=>{
 let finish;const f=await fixture(()=>new Promise(resolve=>finish=resolve));await f.worker.deliver(f.id)
 assert.equal(f.store.inspect(f.id).DELIVERY_STATUS,'MANUAL_REVIEW_REQUIRED');finish({accepted:[RECIPIENT]});await new Promise(r=>setTimeout(r,10));assert.equal(f.store.inspect(f.id).DELIVERY_STATUS,'MANUAL_REVIEW_REQUIRED')
})
test('missing target acceptance requires manual review without retry',async()=>{
 const f=await fixture(async()=>({accepted:['wrong@example.invalid']}));await f.worker.deliver(f.id);assert.equal(f.store.inspect(f.id).DELIVERY_STATUS,'MANUAL_REVIEW_REQUIRED')
})
test('safe transitions, stale claims and interrupted-worker recovery',async()=>{
 const f=await fixture(async()=>({accepted:[RECIPIENT]}));const claim=await f.store.claim(f.id,3)
 await assert.rejects(f.store.settle(f.id,claim.token,'RECEIVED'),/INVALID_TRANSITION/)
 await f.store.recover();assert.equal(f.store.inspect(f.id).DELIVERY_STATUS,'MANUAL_REVIEW_REQUIRED')
 await assert.rejects(f.store.settle(f.id,claim.token,'DELIVERED_TO_PROVIDER'),/STALE_CLAIM/)
})
test('mock adapter cannot satisfy production contract',()=>{
 const store=createMockLeadStore({secret:'synthetic-mock-only-secret-000000000'});assert.throws(()=>requireStorageContract(store),/STORAGE_NOT_DURABLE/)
})
test('bounded retention removes mock records and idempotency state without extending retention',async()=>{
 let time=0;const store=createMockLeadStore({secret:'synthetic-mock-only-secret-000000000',now:()=>time,retentionMs:20,idempotencyMs:10,rateWindowMs:1})
 const receive=()=>store.receive({input,idempotencyKey:'synthetic-key-00001',clientIdentity:'test'})
 const a=await receive();time=5;assert.equal((await receive()).record.ENQUIRY_ID,a.record.ENQUIRY_ID);time=21;await store.purge();assert.equal(store.count(),0)
})
import { mailConfiguration } from '../server/networkMailConfiguration.mjs'
test('server-only SMTP contract enforces TLS and bounded budgets without creating a real transport',()=>{
 const env={SMTP_HOST:'smtp.example.invalid',SMTP_PORT:'587',SMTP_USER:'mock-only',SMTP_PASS:'mock-only',SMTP_FROM:'network@seedtrade.eu'}
 const config=mailConfiguration(env);assert.equal(config.requireTLS,true);assert.equal(config.tls.rejectUnauthorized,true);assert.equal(config.logger,false)
 assert.equal(mailConfiguration({...env,SMTP_PORT:'465'}).secure,true)
 assert.throws(()=>mailConfiguration({...env,SMTP_PORT:'25'}));assert.throws(()=>mailConfiguration({...env,SMTP_FROM:'x\r\ny'}))
})
