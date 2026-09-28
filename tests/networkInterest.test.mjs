import test from 'node:test'
import assert from 'node:assert/strict'
import { createNetworkServer, validateRegistration, RECIPIENT } from '../server/networkInterest.mjs'

const valid = { company: 'Test Seed Ltd', email: 'test@example.org', role: 'Buyer', country: 'Lithuania' }
test('four required fields and strict role/email validation', () => {
  for (const field of Object.keys(valid)) assert.equal(validateRegistration({ ...valid, [field]: '' }), null)
  assert.equal(validateRegistration({ ...valid, email: 'not-an-email' }), null)
  assert.equal(validateRegistration({ ...valid, role: 'Administrator' }), null)
  assert.equal(validateRegistration({ ...valid, company: 'A\r\nB' }), null)
  assert.equal(validateRegistration({ ...valid, extra: 'private' }), null)
  assert.deepEqual(validateRegistration(valid), { ...valid, website: '' })
})

async function withServer(sendMail, run) {
  const server = createNetworkServer({ sendMail, from: 'network@seedtrade.eu', rateLimitMs: 60_000 })
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  const url = `http://127.0.0.1:${server.address().port}/api/network-interest`
  try { await run(url) } finally { await new Promise(resolve => server.close(resolve)) }
}
const post = (url, value, options = {}) => fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: new URL(url).origin, ...options.headers }, body: JSON.stringify(value) })

test('confirmed SMTP handoff contains all fields, recipient, source and timestamp; duplicate is limited', async () => {
  const messages = []
  await withServer(async message => { messages.push(message); return { accepted: [RECIPIENT] } }, async url => {
    const response = await post(url, valid)
    assert.equal(response.status, 200)
    assert.match((await response.json()).message, /registered/)
    assert.equal((await post(url, valid)).status, 429)
  })
  assert.equal(messages.length, 1)
  assert.equal(messages[0].to, 'network@seedtrade.eu')
  assert.match(messages[0].subject, /Test Seed Ltd/)
  for (const value of [...Object.values(valid), 'Submitted:', 'SeedTrade.eu European B2B Seed Network form']) assert.ok(messages[0].text.includes(value))
})

test('invalid, cross-origin, non-JSON and oversized requests do not send mail', async () => {
  let sends = 0
  await withServer(async () => { sends++; return { accepted: [RECIPIENT] } }, async url => {
    assert.equal((await post(url, { ...valid, email: 'bad' })).status, 400)
    assert.equal((await post(url, valid, { headers: { Origin: 'https://attacker.example' } })).status, 403)
    assert.equal((await fetch(url, { method: 'POST', headers: { Origin: new URL(url).origin, 'Content-Type': 'text/plain' }, body: 'hi' })).status, 415)
    assert.equal((await post(url, { ...valid, country: 'x'.repeat(5000) })).status, 413)
    assert.equal((await post(url, { ...valid, website: 'bot.example' })).status, 200)
  })
  assert.equal(sends, 0)
})

test('failed SMTP handoff does not claim success and allows retry', async () => {
  let attempts = 0
  await withServer(async () => { attempts++; if (attempts === 1) throw Error('SMTP failed'); return { accepted: [RECIPIENT] } }, async url => {
    assert.equal((await post(url, valid)).status, 503)
    assert.equal((await post(url, valid)).status, 200)
  })
  assert.equal(attempts, 2)
})
