import test from 'node:test'
import assert from 'node:assert/strict'
import http from 'node:http'
import { randomUUID } from 'node:crypto'
import { createNetworkServer, validateRegistration } from '../server/networkInterest.mjs'
import { createMockLeadStore } from '../server/networkLeadStore.mjs'
const valid = { company: 'Mock Seed Ltd', email: 'test@example.org', role: 'Buyer', country: 'Lithuania' }
const origin = 'https://seedtrade.eu'
const mock = options => createMockLeadStore({ secret: 'isolated-test-secret-never-production-0000', ...options })
async function withServer(run, options = {}) {
  const store = options.store || mock()
  const server = createNetworkServer({ store, allowedOrigins: [origin], allowTestAdapter: true, ...options })
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  const url = `http://127.0.0.1:${server.address().port}/api/network-interest`
  try { await run(url, store) } finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)) }
}
const post = (url, value = valid, options = {}) => fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: origin, 'Idempotency-Key': randomUUID(), ...options.headers }, body: options.raw ?? JSON.stringify(value) })
test('all required fields, strict enum, lengths, control/header characters and unexpected keys', () => {
  for (const field of Object.keys(valid)) assert.equal(validateRegistration({ ...valid, [field]: '' }), null)
  for (const changes of [{email:'bad'}, {role:'Admin'}, {company:'a\r\nb'}, {country:'x'.repeat(101)}, {email:'x'.repeat(255)}, {extra:'private'}, {website:'x'.repeat(255)}]) assert.equal(validateRegistration({...valid,...changes}), null)
  assert.deepEqual(validateRegistration(valid), {...valid,website:''})
})
test('valid enquiry is received once and response contains no submitted private fields', async () => withServer(async (url, store) => {
  const response = await post(url); assert.equal(response.status,202)
  const body = await response.json(); assert.match(body.enquiryId, /^[a-f0-9-]{36}$/)
  assert.equal(store.inspect(body.enquiryId).DELIVERY_STATUS,'PENDING_DELIVERY')
  assert.match(body.message,/not yet confirmed/)
  for (const field of Object.values(valid)) assert.ok(!JSON.stringify(body).includes(field))
  assert.equal((await fetch(url)).status,404)
}))
test('invalid email, malformed JSON, unsupported type, honeypot and byte overflow fail without receipts', async () => withServer(async (url,store) => {
  assert.equal((await post(url,{...valid,email:'bad'})).status,400)
  assert.equal((await post(url,valid,{raw:'{bad'})).status,400)
  assert.equal((await post(url,valid,{headers:{'Content-Type':'text/plain'}})).status,415)
  assert.equal((await post(url,{...valid,website:'spam.example'})).status,400)
  assert.equal((await post(url,valid,{raw:JSON.stringify({...valid,website:'é'.repeat(2100)})})).status,413)
  assert.equal(store.count(),0)
}))
test('same-key duplicates and concurrent duplicates create exactly one receipt; changed payload conflicts', async () => withServer(async (url,store) => {
  const key = randomUUID(), options={headers:{'Idempotency-Key':key}}
  const bodies=await Promise.all(Array.from({length:10},async()=> { const r=await post(url,valid,options);assert.equal(r.status,202);return r.json() }))
  assert.equal(new Set(bodies.map(x=>x.enquiryId)).size,1);assert.equal(store.count(),1)
  assert.equal((await post(url,{...valid,company:'Different'},options)).status,409)
}))
test('rate limit persists across handler recreation with shared adapter; failed delivery cannot reset it', async () => {
  const store=mock(); await withServer(async url=>{assert.equal((await post(url)).status,202);assert.equal((await post(url)).status,429)}, {store})
  await withServer(async url=>assert.equal((await post(url)).status,429),{store})
})
test('storage failure and storage deadline never return false success', async () => {
  for (const receive of [async()=>{throw Error('private credentials must not escape')},()=>new Promise(()=>{})]) {
    const store=mock();store.receive=receive
    await withServer(async url=>{const r=await post(url);assert.equal(r.status,503);assert.ok(!(await r.text()).includes('credentials'))},{store,receiptTimeoutMs:20})
  }
})
test('production rejects mock storage and disabled endpoint fails closed', async () => withServer(async url=>assert.equal((await post(url)).status,503),{allowTestAdapter:false}))
test('allowlisted HTTPS origin ignores spoofed forwarding headers and rejects HTTP origins', async () => withServer(async url=>{
  assert.equal((await post(url,valid,{headers:{Origin:'https://attacker.example','X-Forwarded-Host':'attacker.example'}})).status,403)
  assert.equal((await post(url,valid,{headers:{Origin:'http://seedtrade.eu'}})).status,403)
  assert.equal((await post(url,valid,{headers:{'X-Forwarded-Host':'attacker.example'}})).status,202)
}))
test('slow incomplete request has bounded timeout', async () => withServer(async url=>{
  await new Promise((resolve,reject)=>{
    const req=http.request(url,{method:'POST',headers:{Origin:origin,'Content-Type':'application/json','Idempotency-Key':randomUUID()}},res=>{assert.equal(res.statusCode,408);res.resume();res.on('end',resolve)})
    req.on('error',reject);req.write('{')
  })
},{requestTimeoutMs:30}))
test('UTF8 multibyte split chunks decode correctly', async () => withServer(async (url,store)=>{
  await new Promise((resolve,reject)=>{
    const req=http.request(url,{method:'POST',headers:{Origin:origin,'Content-Type':'application/json','Idempotency-Key':randomUUID()}},res=>{assert.equal(res.statusCode,202);res.resume();res.on('end',resolve)})
    req.on('error',reject);const bytes=Buffer.from(JSON.stringify({...valid,company:'Sėklos'}));for(const byte of bytes)req.write(Buffer.from([byte]));req.end()
  });assert.equal(store.count(),1)
}))
test('late storage commit after timeout can be retrieved with same key without a second receipt',async()=>{
 const store=mock(),receive=store.receive;let delay=true
 store.receive=async options=>{if(delay)await new Promise(resolve=>setTimeout(resolve,50));return receive(options)}
 await withServer(async url=>{
  const options={headers:{'Idempotency-Key':randomUUID()}}
  assert.equal((await post(url,valid,options)).status,503)
  await new Promise(resolve=>setTimeout(resolve,60));delay=false
  assert.equal((await post(url,valid,options)).status,202);assert.equal(store.count(),1)
 },{store,receiptTimeoutMs:20})
})
