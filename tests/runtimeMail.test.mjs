import test from 'node:test'
import assert from 'node:assert/strict'
import { createRuntimeMail } from '../server/runtimeMail.mjs'
const staging = { SEEDTRADE_MAIL_TRANSPORT: 'test-stream', SEEDTRADE_RUNTIME_ENV: 'staging', SEEDTRADE_PUBLIC_ORIGIN: 'https://staging.seedtrade.eu' }
test('production and default mode still require SMTP', () => {
  for (const env of [{}, {SEEDTRADE_RUNTIME_ENV:'production'}, {...staging,SEEDTRADE_MAIL_TRANSPORT:'smtp'}]) assert.throws(()=>createRuntimeMail(env), /SMTP configuration/)
})
test('test mode fails closed outside exact staging identity', () => {
  for (const env of [{...staging,SEEDTRADE_RUNTIME_ENV:undefined},{...staging,SEEDTRADE_RUNTIME_ENV:'production'},{...staging,SEEDTRADE_PUBLIC_ORIGIN:'https://seedtrade.eu'}]) assert.throws(()=>createRuntimeMail(env), /staging identity/)
})
test('stream transport generates bytes without SMTP acceptance', async () => {
  const {transport,from}=createRuntimeMail(staging)
  const result=await transport.sendMail({from,to:'synthetic@example.invalid',subject:'Synthetic test',text:'Test only'})
  assert.ok(Buffer.isBuffer(result.message))
  assert.equal(result.accepted,undefined)
  transport.close()
})
test('SMTP configuration preserved and unknown mode rejected', () => {
  const env={SMTP_HOST:'smtp.example.invalid',SMTP_PORT:'465',SMTP_USER:'synthetic',SMTP_PASS:'synthetic',SMTP_FROM:'sender@example.invalid'}
  const result=createRuntimeMail(env,options=>options)
  assert.equal(result.transport.secure,true)
  assert.equal(result.from,env.SMTP_FROM)
  assert.throws(()=>createRuntimeMail({...staging,SEEDTRADE_MAIL_TRANSPORT:'other'}), /Unsupported/)
  assert.throws(()=>createRuntimeMail({...env,SMTP_PORT:'invalid'}), /SMTP_PORT/)
})

test('test transport cannot produce false delivery success', async () => {
  const { Readable } = await import('node:stream')
  const { createNetworkHandler } = await import('../server/networkInterest.mjs')
  const {transport,from}=createRuntimeMail(staging)
  const req=Readable.from([JSON.stringify({company:'Synthetic test',email:'synthetic@example.invalid',role:'Buyer',country:'Test'})])
  Object.assign(req,{url:'/api/network-interest',method:'POST',headers:{host:'staging.seedtrade.eu',origin:'https://staging.seedtrade.eu','content-type':'application/json'},socket:{remoteAddress:'127.0.0.1'}})
  let status,body
  await createNetworkHandler({from,sendMail:options=>transport.sendMail(options)})(req,{writeHead:code=>{status=code},end:value=>{body=value}})
  assert.equal(status,503)
  assert.match(body,/could not be sent/)
  transport.close()
})
