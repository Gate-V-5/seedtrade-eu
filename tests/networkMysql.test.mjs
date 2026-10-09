import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { createMysqlLeadStore } from '../server/networkMysqlStore.mjs'
import { mysqlConfiguration } from '../server/networkMysqlConfiguration.mjs'
import { createProxyPolicy } from '../server/networkProxyPolicy.mjs'
import { createPrivateMailSender } from '../server/networkMailTransport.mjs'
import { createDeliveryCron } from '../server/networkDeliveryCron.mjs'
import { createNetworkRuntime } from '../server/networkRuntime.mjs'
import nodemailer from 'nodemailer'
const secret='x'.repeat(40), id='12345678-1234-4234-8234-123456789012', token='22345678-1234-4234-8234-123456789012'
const input={company:"O'Brien <seed>",email:'buyer@example.test',role:'Buyer',country:'LT'}
// SQL contract mock, not an SQL engine: assert ordered transaction boundaries and parameter binding.
function scripted(steps){
 const log=[];let released=0,destroyed=0
 const connection={async query(q){log.push([q.sql,[]]);if(q.sql==='ROLLBACK')return [];if(q.sql==='SET TRANSACTION ISOLATION LEVEL READ COMMITTED'||q.sql==='START TRANSACTION'||q.sql==='COMMIT')return [];throw Error('Unexpected control')},async execute(q,p){log.push([q.sql,p]);const step=steps.shift();assert.ok(step,`Unexpected query ${q.sql}`);assert.match(q.sql,step.pattern);if(step.fail)throw Error('Database secret detail');return [step.rows??{affectedRows:1}]},release(){released++},destroy(){destroyed++}}
 return {pool:{async getConnection(){return connection},async end(){}},log,remaining:()=>steps.length,released:()=>released,destroyed:()=>destroyed}
}
const row={enquiry_id:id,received_at_ms:100000,company_name:input.company,business_email:input.email,role:'Buyer',country:'LT',delivery_status:'DELIVERING',delivery_attempts:1,created_at_ms:100000,updated_at_ms:100000,next_attempt_at_ms:100000,retention_expires_at_ms:10000000,claim_token:token}
test('MOCK: SQL parameters never interpolate hostile form data; receipt transaction commits atomically',async()=>{
 const steps=[{pattern:/CURRENT_TIMESTAMP/,rows:[{now_ms:100000}]},{pattern:/INSERT INTO b2b_idempotency/},{pattern:/SELECT \* FROM b2b_idempotency/,rows:[{enquiry_id:null}]},...['global','client'].flatMap(()=>[{pattern:/INSERT INTO b2b_rate_buckets/},{pattern:/SELECT \* FROM b2b_rate_buckets/,rows:[{count_value:0,window_expires_at_ms:160000}]},{pattern:/UPDATE b2b_rate_buckets/}]),{pattern:/INSERT INTO b2b_enquiries/},{pattern:/UPDATE b2b_idempotency/},{pattern:/SELECT \* FROM b2b_enquiries/,rows:[row]}]
 const db=scripted(steps),store=createMysqlLeadStore({pool:db.pool,secret})
 await store.receive({input,idempotencyKey:'valid-key-123456789',clientIdentity:'127.0.0.1'})
 assert.equal(db.remaining(),0);assert.equal(db.log.at(-1)[0],'COMMIT');assert.equal(db.released(),1)
 const insert=db.log.find(([s])=>s.startsWith('INSERT INTO b2b_enquiries'));assert.ok(insert[1].includes(input.company));assert.ok(!insert[0].includes(input.company))
})
test('MOCK: same idempotency receipt is read before rate budget; conflicting payload rolls back',async()=>{
 const db=scripted([{pattern:/CURRENT_TIMESTAMP/,rows:[{now_ms:100000}]},{pattern:/INSERT INTO b2b_idempotency/},{pattern:/SELECT \* FROM b2b_idempotency/,rows:[{enquiry_id:id,expires_at_ms:200000,payload_hash:'not-matching'}]}])
 await assert.rejects(createMysqlLeadStore({pool:db.pool,secret}).receive({input,idempotencyKey:'valid-key-123456789',clientIdentity:'127.0.0.1'}),{code:'IDEMPOTENCY_CONFLICT'})
 assert.equal(db.log.at(-1)[0],'ROLLBACK')
})
test('MOCK: SQL/storage failure is redacted and rolled back',async()=>{
 const db=scripted([{pattern:/CURRENT_TIMESTAMP/,fail:true}])
 await assert.rejects(createMysqlLeadStore({pool:db.pool,secret}).receive({input,idempotencyKey:'valid-key-123456789',clientIdentity:'127.0.0.1'}),error=>error.code==='STORAGE_UNAVAILABLE'&&!error.message.includes('secret detail'))
 assert.equal(db.log.at(-1)[0],'ROLLBACK')
})
test('MOCK: atomic claim locks record and persists attempt before handing off',async()=>{
 const db=scripted([{pattern:/FOR UPDATE/,rows:[{...row,delivery_status:'PENDING_DELIVERY',delivery_attempts:0}]},{pattern:/CURRENT_TIMESTAMP/,rows:[{now_ms:100000}]},{pattern:/UPDATE b2b_enquiries/},{pattern:/INSERT INTO b2b_delivery_attempts/},{pattern:/SELECT \* FROM b2b_enquiries/,rows:[row]}])
 const claim=await createMysqlLeadStore({pool:db.pool,secret}).claim(id,3);assert.equal(claim.record.DELIVERY_STATUS,'DELIVERING');assert.equal(db.log.at(-1)[0],'COMMIT')
})
test('MOCK: stale claim cannot change status; exhausted retry is rejected',async()=>{
 for(const r of [{...row,claim_token:id},{...row,delivery_attempts:3}]){
 const db=scripted([{pattern:/FOR UPDATE/,rows:[r]},{pattern:/CURRENT_TIMESTAMP/,rows:[{now_ms:100000}]}])
 await assert.rejects(createMysqlLeadStore({pool:db.pool,secret}).settle(id,token,'DELIVERY_FAILED_RETRYABLE'),{code:r.claim_token===id?'STALE_CLAIM':'INVALID_TRANSITION'})
 assert.equal(db.log.at(-1)[0],'ROLLBACK')
 }
})
test('MOCK: interrupted worker recovery requires held lock; busy worker sends nothing',async()=>{
 const db=scripted([{pattern:/GET_LOCK/,rows:[{acquired:0}]}]);const store=createMysqlLeadStore({pool:db.pool,secret})
 assert.deepEqual(await store.withDeliveryLock(()=>{throw Error('must not run')}),{busy:true,processed:0})
 await assert.rejects(store.recover({}),{code:'DELIVERY_LOCK_REQUIRED'})
})
test('retention deletion is inactive without explicit approval and active delivery cannot be deleted',async()=>{
 const db=scripted([{pattern:/FOR UPDATE/,rows:[row]}]);const store=createMysqlLeadStore({pool:db.pool,secret})
 await assert.rejects(store.purge(),{code:'RETENTION_NOT_APPROVED'});await assert.rejects(store.deleteOne(id),{code:'ACTIVE_DELIVERY'})
 await assert.rejects(store.exportOne("' OR 1=1"),{code:'INVALID_ENQUIRY_ID'})
})
test('migration is manual, InnoDB, idempotent and has primary/unique/FK constraints',async()=>{
 const sql=await readFile('server/migrations/001_b2b_private_enquiries.sql','utf8')
 assert.equal((sql.match(/CREATE TABLE IF NOT EXISTS/g)||[]).length,4);assert.equal((sql.match(/ENGINE=InnoDB/g)||[]).length,4)
 assert.match(sql,/key_hash.*PRIMARY KEY/);assert.match(sql,/UNIQUE KEY b2b_attempt_claim/);assert.equal((sql.match(/ON DELETE CASCADE/g)||[]).length,2)
})
test('pool enforces TLS/parameter isolation; unsafe/incomplete config fails',()=>{
 const env={B2B_MYSQL_HOST:'db.example.test',B2B_MYSQL_USER:'app',B2B_MYSQL_PASSWORD:'not-real',B2B_MYSQL_DATABASE:'private'}
 const config=mysqlConfiguration(env);assert.equal(config.ssl.rejectUnauthorized,true);assert.equal(config.multipleStatements,false);assert.equal(config.waitForConnections,false)
 assert.throws(()=>mysqlConfiguration({...env,B2B_MYSQL_PORT:'0'}));assert.throws(()=>mysqlConfiguration({}))
})
test('proxy policy trusts only explicit overwriting peer and rejects spoofed/non-TLS/chained headers',()=>{
 const policy=createProxyPolicy({B2B_PROXY_MODE:'trusted',B2B_PROXY_VERIFIED:'true',B2B_TRUSTED_PROXY_IPS:'127.0.0.1'})
 const req={socket:{remoteAddress:'127.0.0.1'},headers:{'x-forwarded-proto':'https','x-forwarded-for':'203.0.113.4'}}
 assert.equal(policy(req),'203.0.113.4');assert.equal(policy({...req,socket:{remoteAddress:'203.0.113.1'}}),null)
 assert.equal(policy({...req,headers:{...req.headers,'x-forwarded-for':'203.0.113.4, 1.1.1.1'}}),null)
 assert.equal(policy({...req,headers:{...req.headers,'x-forwarded-proto':'http'}}),null)
 assert.throws(()=>createProxyPolicy({}))
})
const mailEnv={SMTP_HOST:'smtp.example.test',SMTP_PORT:'587',SMTP_USER:'unused',SMTP_PASS:'unused',SMTP_FROM:'network@seedtrade.eu'}
const message={from:mailEnv.SMTP_FROM,to:'network@seedtrade.eu',replyTo:'buyer@example.test',subject:'Private enquiry',text:'<script>inert</script>'}
test('Nodemailer 10 actual stream transport generates MIME without SMTP or real mail',async()=>{
 const sender=createPrivateMailSender(mailEnv,{createTransport:()=>nodemailer.createTransport({streamTransport:true,buffer:true,newline:'unix'})})
 const result=await sender(message);assert.match(result.message.toString(),/Content-Type: text\/plain/);assert.match(result.message.toString(),/To: network@seedtrade.eu/)
 const pkg=JSON.parse(await readFile('node_modules/nodemailer/package.json','utf8'));assert.equal(pkg.version,'10.0.16')
})
test('trusted SMTP negative replies classify retry; uncertain failure is redacted/manual',async()=>{
 for(const error of [{responseCode:451,command:'DATA'},{responseCode:550,command:'RCPT TO'},{code:'ECONNECTION'}]){
 const sender=createPrivateMailSender(mailEnv,{createTransport:()=>({sendMail:async()=>{throw error},close(){}})})
 await assert.rejects(sender(message),e=>e.deliveryOutcome===(error.responseCode?'NOT_ACCEPTED':undefined)&&(!error.responseCode||e.retryable===(error.responseCode<500)))
 }
})
test('transport cancellation closes connection and prevents late success',async()=>{
 let closes=0;const controller=new AbortController()
 const sender=createPrivateMailSender(mailEnv,{createTransport:()=>({sendMail:()=>new Promise(()=>{}),close(){closes++}})})
 const pending=sender(message,{signal:controller.signal});controller.abort();await assert.rejects(pending,{code:'ATTEMPT_TIMEOUT'});assert.ok(closes>=1)
})
test('MOCK cron is bearer/TLS protected, empty-body only, exposes no private record',async()=>{
 let called=0;const store={withDeliveryLock:async fn=>fn({}),recover:async()=>{},nextPending:async()=>id}
 const handler=createDeliveryCron({store,worker:{deliver:async()=>{called++;return {DELIVERY_STATUS:'DELIVERED_TO_PROVIDER',BUSINESS_EMAIL:'never-public'}}},token:secret,resolveClientIdentity:req=>req.secure?'127.0.0.1':null})
 async function invoke(headers={},secure=true){let status,body;const res={writeHead:s=>status=s,end:s=>body=JSON.parse(s)};await handler({url:'/api/internal/network-delivery',method:'POST',headers,secure},res);return {status,body}}
 assert.equal((await invoke()).status,403);assert.equal((await invoke({authorization:`Bearer ${secret}`},false)).status,403)
 assert.equal((await invoke({authorization:`Bearer ${secret}`,'content-length':'1'})).status,413)
 const result=await invoke({authorization:`Bearer ${secret}`});assert.equal(result.status,200);assert.equal(called,1);assert.ok(!JSON.stringify(result).includes('never-public'))
})
test('runtime defaults disabled; activation prerequisites fail before database/SMTP calls',async()=>{
 let calls=0;const dependencies={poolFactory:()=>{calls++;throw Error('must not run')}}
 const runtime=await createNetworkRuntime({},dependencies);assert.equal(runtime.cron,null)
 await assert.rejects(createNetworkRuntime({B2B_ENQUIRIES_ENABLED:'true'},dependencies),/Activation blocked/);assert.equal(calls,0)
})

test('MOCK schema preflight refuses missing uniqueness guarantees',async()=>{
 const names=['b2b_enquiries','b2b_idempotency','b2b_rate_buckets','b2b_delivery_attempts']
 const db=scripted([{pattern:/information_schema.TABLES/,rows:names.map(name=>({name,engine:'InnoDB'}))},{pattern:/information_schema.STATISTICS/,rows:[]}])
 await assert.rejects(createMysqlLeadStore({pool:db.pool,secret}).verify(),{code:'SCHEMA_NOT_READY'})
})
test('MOCK ambiguous COMMIT destroys connection; no false success and safe same-key retry path',async()=>{
 const db=scripted([{pattern:/SELECT \*/,rows:[row]}])
 const get=db.pool.getConnection.bind(db.pool);db.pool.getConnection=async()=>{const c=await get();const query=c.query.bind(c);c.query=async q=>{if(q.sql==='COMMIT')throw Error('connection lost');return query(q)};return c}
 await assert.rejects(createMysqlLeadStore({pool:db.pool,secret}).exportOne(id),{code:'STORAGE_UNAVAILABLE'});assert.equal(db.destroyed(),1);assert.equal(db.released(),0)
})
test('MOCK interrupted delivery recovery persists manual review under exclusive lock',async()=>{
 const db=scripted([{pattern:/GET_LOCK/,rows:[{acquired:1}]},{pattern:/CURRENT_TIMESTAMP/,rows:[{now_ms:100000}]},{pattern:/UPDATE b2b_delivery_attempts/},{pattern:/UPDATE b2b_enquiries/},{pattern:/RELEASE_LOCK/,rows:[{released:1}]}])
 const store=createMysqlLeadStore({pool:db.pool,secret});await store.withDeliveryLock(session=>store.recover(session))
 const updates=db.log.filter(([sql])=>sql.startsWith('UPDATE'));assert.ok(updates.every(([,args])=>args.includes('MANUAL_REVIEW_REQUIRED')))
})
test('MOCK delivered state persists record and attempt together; never claims inbox receipt',async()=>{
 const db=scripted([{pattern:/FOR UPDATE/,rows:[row]},{pattern:/CURRENT_TIMESTAMP/,rows:[{now_ms:100000}]},{pattern:/UPDATE b2b_enquiries/},{pattern:/UPDATE b2b_delivery_attempts/},{pattern:/SELECT \*/,rows:[{...row,delivery_status:'DELIVERED_TO_PROVIDER'}]}])
 const result=await createMysqlLeadStore({pool:db.pool,secret}).settle(id,token,'DELIVERED_TO_PROVIDER',{PROVIDER_MESSAGE_ID:'<test@seedtrade.eu>'})
 assert.equal(result.DELIVERY_STATUS,'DELIVERED_TO_PROVIDER');assert.equal(db.log.at(-1)[0],'COMMIT')
})
test('private operator export is owner-only outside application; delete requires confirmation',async()=>{
 const {privateProcedures}=await import('../server/networkPrivateProcedures.mjs');const {mkdtemp,stat,rm}=await import('node:fs/promises');const {tmpdir}=await import('node:os');const path=await import('node:path')
 const dir=await mkdtemp(path.join(tmpdir(),'b2b-disposable-'))
 const store={exportOne:async()=>({ENQUIRY_ID:id,CLASSIFICATION:'PRIVATE_ENQUIRY'}),deleteOne:async()=>1}
 try{
 await assert.rejects(privateProcedures({store,exportDirectory:dir}).exportOne(id),/Authorised/)
 const procedures=privateProcedures({store,authorised:true,exportDirectory:dir});const file=await procedures.exportOne(id)
 assert.equal((await stat(file)).mode&0o777,0o600);await assert.rejects(procedures.deleteOne(id),/confirmation/);assert.equal(await procedures.deleteOne(id,{confirmed:true}),1)
 }finally{await rm(dir,{recursive:true,force:true})}
})

test('MOCK recreated adapter reads same durable backing row without replacing it with memory storage',async()=>{
 const db=scripted([{pattern:/SELECT \*/,rows:[row]},{pattern:/SELECT \*/,rows:[row]}])
 const first=await createMysqlLeadStore({pool:db.pool,secret}).exportOne(id)
 const second=await createMysqlLeadStore({pool:db.pool,secret}).exportOne(id)
 assert.deepEqual(first,second) // real process/database restart remains an opt-in integration gate
})
test('public bundles contain no MySQL adapter, server secrets, private schema or mock enquiry data',async()=>{
 const {readdir}=await import('node:fs/promises')
 const files=await readdir('dist/assets')
 for(const file of files.filter(f=>f.endsWith('.js'))){const text=await readFile('dist/assets/'+file,'utf8');for(const forbidden of ['B2B_MYSQL_PASSWORD','B2B_STORAGE_SECRET','b2b_delivery_attempts','networkMysqlStore','never-public','buyer@example.test'])assert.ok(!text.includes(forbidden),`${file}: ${forbidden}`)}
})

test('MOCK activated runtime wires verified MySQL storage to authenticated cron without creating a mail handoff',async()=>{
 const names=['b2b_enquiries','b2b_idempotency','b2b_rate_buckets','b2b_delivery_attempts']
 const indexes=[['b2b_enquiries','PRIMARY',['enquiry_id']],['b2b_idempotency','PRIMARY',['key_hash']],['b2b_rate_buckets','PRIMARY',['bucket_hash']],['b2b_delivery_attempts','PRIMARY',['enquiry_id','attempt_no']],['b2b_delivery_attempts','b2b_attempt_claim',['claim_token']]].flatMap(([name,idx,cols])=>cols.map((col,i)=>({name,idx,col,seq:i+1,non_unique:0})))
 const db=scripted([{pattern:/information_schema.TABLES/,rows:names.map(name=>({name,engine:'InnoDB'}))},{pattern:/information_schema.STATISTICS/,rows:indexes},{pattern:/information_schema.REFERENTIAL_CONSTRAINTS/,rows:['b2b_idempotency','b2b_delivery_attempts'].map(name=>({name,parent:'b2b_enquiries',delete_rule:'CASCADE'}))},...names.map(name=>({pattern:new RegExp('FROM '+name+' LIMIT 0'),rows:[]})),{pattern:/GET_LOCK/,rows:[{acquired:1}]},{pattern:/CURRENT_TIMESTAMP/,rows:[{now_ms:100000}]},{pattern:/UPDATE b2b_delivery_attempts/},{pattern:/UPDATE b2b_enquiries/},{pattern:/CURRENT_TIMESTAMP/,rows:[{now_ms:100000}]},{pattern:/SELECT enquiry_id FROM b2b_enquiries/,rows:[]},{pattern:/RELEASE_LOCK/,rows:[{released:1}]}])
 const env={...mailEnv,B2B_ENQUIRIES_ENABLED:'true',B2B_STORAGE_VERIFIED:'true',B2B_PRIVACY_APPROVED:'true',B2B_RUNTIME_VERIFIED:'true',B2B_DELIVERY_ENABLED:'true',B2B_PROXY_VERIFIED:'true',B2B_PROXY_MODE:'direct',B2B_STORAGE_SECRET:secret,B2B_MYSQL_DATABASE:'disposable_fixture',B2B_CRON_TOKEN:secret}
 const runtime=await createNetworkRuntime(env,{poolFactory:()=>db.pool})
 let status,body;await runtime.cron({url:'/api/internal/network-delivery',method:'POST',socket:{encrypted:true,remoteAddress:'127.0.0.1'},headers:{authorization:`Bearer ${secret}`}},{writeHead:s=>status=s,end:b=>body=JSON.parse(b)})
 assert.equal(status,200);assert.deepEqual(body,{processed:0});assert.equal(db.remaining(),0);await runtime.close()
})
