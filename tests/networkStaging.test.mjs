import test from 'node:test'
import assert from 'node:assert/strict'
import { Readable } from 'node:stream'
import { spawn } from 'node:child_process'
import http from 'node:http'
import { readFile } from 'node:fs/promises'
import { createGuardedStagingPool, verifyConnectedTestDatabase, requireTestDatabaseConfiguration, TEST_DATABASE, TEST_USER } from '../server/networkStagingDatabase.mjs'
import { createStagingNetworkRuntime, createStagingTestSender } from '../server/networkStagingRuntime.mjs'
import { createMockLeadStore } from '../server/networkLeadStore.mjs'
import { createDeliveryWorker } from '../server/networkDeliveryWorker.mjs'
const staging = { SEEDTRADE_RUNTIME_ENV:'staging', SEEDTRADE_PUBLIC_ORIGIN:'https://staging.seedtrade.eu', SEEDTRADE_MAIL_TRANSPORT:'test-stream' }
const configured = { ...staging, B2B_MYSQL_DATABASE:TEST_DATABASE, B2B_MYSQL_USER:TEST_USER, B2B_MYSQL_PASSWORD:'synthetic-not-real', B2B_MYSQL_HOST:'database.example.invalid', B2B_STORAGE_SECRET:'synthetic-secret-'.repeat(4) }
function connection({db=TEST_DATABASE,user=TEST_USER,cipher='TLS_AES_256_GCM_SHA384',grants=[`GRANT USAGE ON *.* TO '${TEST_USER}'@'localhost'`,`GRANT SELECT, INSERT, UPDATE, DELETE ON \`${TEST_DATABASE}\`.* TO '${TEST_USER}'@'localhost'`]}={}) {
 const queries=[]
 return {queries,async execute(q){queries.push(q.sql);if(q.sql.startsWith('SELECT DATABASE'))return [[{db,account:user+'@localhost'}]];if(q.sql.startsWith('SHOW SESSION'))return [[{Value:cipher}]];if(q.sql.startsWith('SHOW GRANTS'))return [grants.map(g=>({Grants:g}))];throw Error('Unexpected query')},destroy(){this.destroyed=true},release(){}}
}
test('database guard requires exact staging env/database/user before connecting',()=>{
 let calls=0
 for(const env of [{...configured,SEEDTRADE_RUNTIME_ENV:'production'},{...configured,SEEDTRADE_MAIL_TRANSPORT:'smtp'},{...configured,B2B_MYSQL_DATABASE:'other'},{...configured,B2B_MYSQL_USER:'other'}])assert.throws(()=>createGuardedStagingPool(env,()=>{calls++;return {}}))
 assert.equal(calls,0)
 assert.throws(()=>requireTestDatabaseConfiguration({...configured,B2B_MYSQL_SOCKET:'/private/mysql.sock'}),/verified/i)
})
test('MOCK active identity mismatch blocks before DDL/DML; every connection verified',async()=>{
 for(const options of [{db:'other'},{user:'other'}]){
 const c=connection(options),p=createGuardedStagingPool(configured,()=>({getConnection:async()=>c,end:async()=>{}}))
 await assert.rejects(p.getConnection());assert.equal(c.destroyed,true);assert.equal(c.queries.length,1)
 }
 const c=connection(),p=createGuardedStagingPool(configured,()=>({getConnection:async()=>c,end:async()=>{}}))
 await p.getConnection();await p.getConnection();assert.equal(c.queries.filter(q=>q.startsWith('SELECT DATABASE')).length,2)
})
test('MOCK plaintext, broad privileges, roles and grant options fail closed',async()=>{
 for(const options of [{cipher:''},{grants:[`GRANT ALL PRIVILEGES ON *.* TO '${TEST_USER}'@'localhost'`]},{grants:[`GRANT SELECT ON \`other\`.* TO '${TEST_USER}'@'localhost'`]},{grants:[`GRANT SELECT ON \`${TEST_DATABASE}\`.* TO '${TEST_USER}'@'localhost' WITH GRANT OPTION`]},{grants:['GRANT role TO account']}])await assert.rejects(verifyConnectedTestDatabase(connection(options),configured))
 assert.equal(await verifyConnectedTestDatabase(connection(),configured),true)
})
async function unavailable(runtime){let status,body;const req=Readable.from([]);Object.assign(req,{method:'POST',url:'/api/network-interest',headers:{},socket:{remoteAddress:'127.0.0.1'}});await runtime.networkInterest(req,{writeHead:s=>status=s,end:b=>body=JSON.parse(b)});assert.equal(status,503);assert.equal(body.enquiryId,undefined);assert.equal(runtime.cron,null)}
test('unconfigured/disabled staging starts with no DB calls and no memory fallback',async()=>{
 let calls=0
 for(const env of [staging,{...staging,B2B_ENQUIRIES_ENABLED:'true'}])await unavailable(await createStagingNetworkRuntime(env,{poolFactory:()=>{calls++;throw Error('must not connect')}}))
 assert.equal(calls,0)
 const source=await readFile('server/networkStagingRuntime.mjs','utf8');assert.doesNotMatch(source,/createMockLeadStore|createPrivateMailSender/)
})
test('enabled staging missing config/connection failure remains unavailable without crashing',async()=>{
 const env={...staging,B2B_ENQUIRIES_ENABLED:'true',B2B_RUNTIME_VERIFIED:'true',B2B_STORAGE_VERIFIED:'true',B2B_PRIVACY_APPROVED:'true',B2B_PROXY_VERIFIED:'true',B2B_PROXY_MODE:'direct'}
 await unavailable(await createStagingNetworkRuntime(env))
 let closes=0
 await unavailable(await createStagingNetworkRuntime({...env,...configured},{poolFactory:()=>({end:async()=>{closes++}}),storeFactory:()=>({verify:async()=>{throw Error('credential should not leak')}})}))
 assert.equal(closes,1)
})
test('staging stream cannot fake provider acceptance or retry an intentional non-delivery',async()=>{
 const store=createMockLeadStore({secret:configured.B2B_STORAGE_SECRET}),input={company:'Synthetic',email:'synthetic@example.invalid',role:'Buyer',country:'TEST'}
 const receipt=await store.receive({input,idempotencyKey:'synthetic-valid-key-123',clientIdentity:'127.0.0.1'})
 const worker=createDeliveryWorker({store,allowTestAdapter:true,sendMail:createStagingTestSender(staging),from:'staging@seedtrade.invalid'})
 const result=await worker.deliver(receipt.record.ENQUIRY_ID)
 assert.equal(result.DELIVERY_STATUS,'DELIVERY_FAILED_PERMANENT');assert.equal(result.LAST_DELIVERY_ERROR_CODE,'TEST_TRANSPORT_DISABLED');assert.equal(await worker.deliver(result.ENQUIRY_ID),null)
 assert.throws(()=>createStagingTestSender({...staging,SEEDTRADE_MAIL_TRANSPORT:'smtp'}))
})
test('actual server serves homepage without DB; B2B unavailable and staging marker present',async()=>{
 const reserve=http.createServer();await new Promise(r=>reserve.listen(0,'127.0.0.1',r));const port=reserve.address().port;await new Promise(r=>reserve.close(r))
 const child=spawn(process.execPath,['server/index.mjs'],{env:{...staging,PORT:String(port),B2B_ENQUIRIES_ENABLED:'true'},stdio:['ignore','ignore','pipe']});let errors='';child.stderr.on('data',d=>errors+=d)
 try {let response
 for(let i=0;i<80;i++){try{response=await fetch(`http://127.0.0.1:${port}/`);break}catch{await new Promise(r=>setTimeout(r,25))}}
 assert.equal(response?.status,200);assert.equal(response.headers.get('x-seedtrade-staging-backend'),'package3h')
 const r=await fetch(`http://127.0.0.1:${port}/api/network-interest`,{method:'POST',headers:{'Content-Type':'application/json',Origin:staging.SEEDTRADE_PUBLIC_ORIGIN},body:'{}'});assert.equal(r.status,503);assert.equal((await r.json()).enquiryId,undefined);assert.equal(errors,'')
 }finally{child.kill('SIGTERM');await new Promise(r=>child.once('exit',r))}
})
test('migration execution is explicit test-only, not automatic startup; frontend unchanged',async()=>{
 const source=await readFile('server/networkStagingMigration.mjs','utf8');assert.match(source,/getConnection\(\).*Active database/);assert.match(source,/B2B_STAGING_TEST_EXECUTION/);assert.match(source,/--apply-test-only/)
 assert.doesNotMatch(await readFile('server/index.mjs','utf8'),/migrateStagingDatabase/)
})
test('MOCK verified durable runtime accepts only staging Origin and returns receipt after commit',async()=>{
 let receipts=0
 const id='12345678-1234-4234-8234-123456789012'
 const store={capabilities:{atomic:true,idempotency:true,durable:true},verify:async()=>{},receive:async()=>{receipts++;return {record:{ENQUIRY_ID:id}}},claim:async()=>null,settle:async()=>{},recover:async()=>{},purge:async()=>{},close:async()=>{}}
 const env={...configured,B2B_ENQUIRIES_ENABLED:'true',B2B_RUNTIME_VERIFIED:'true',B2B_STORAGE_VERIFIED:'true',B2B_PRIVACY_APPROVED:'true',B2B_PROXY_VERIFIED:'true',B2B_PROXY_MODE:'direct'}
 const runtime=await createStagingNetworkRuntime(env,{poolFactory:()=>({end:async()=>{}}),storeFactory:()=>store})
 assert.equal(runtime.ready,true)
 async function submit(origin){let status,body;const req=Readable.from([JSON.stringify({company:'Synthetic',email:'synthetic@example.invalid',role:'Buyer',country:'TEST'})]);Object.assign(req,{method:'POST',url:'/api/network-interest',headers:{origin,'content-type':'application/json','idempotency-key':'synthetic-request-key-123'},socket:{remoteAddress:'127.0.0.1',encrypted:true}});await runtime.networkInterest(req,{writeHead:s=>status=s,end:b=>body=JSON.parse(b)});return {status,body}}
 assert.equal((await submit('https://seedtrade.eu')).status,403);assert.equal(receipts,0)
 const response=await submit(staging.SEEDTRADE_PUBLIC_ORIGIN);assert.equal(response.status,202);assert.equal(response.body.enquiryId,id);assert.match(response.body.message,/Inbox delivery is not yet confirmed/);assert.equal(receipts,1)
})
