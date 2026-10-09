import http from 'node:http'
import { requireStorageContract } from './networkLeadStore.mjs'

export const RECIPIENT = 'network@seedtrade.eu'
const roles = new Set(['Buyer', 'Seller', 'Partner'])
const emailPattern = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/

export function validateRegistration(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const allowed = new Set(['company', 'email', 'role', 'country', 'website'])
  if (Object.keys(value).some(key => !allowed.has(key))) return null
  if (Object.keys(value).some(key => typeof value[key] !== 'string')) return null
  const company = value.company?.trim(), email = value.email?.trim(), role = value.role, country = value.country?.trim()
  if (!company || company.length > 120 || /[\x00-\x1f\x7f]/.test(company)) return null
  if (!email || email.length > 254 || !emailPattern.test(email) || /[\x00-\x1f\x7f]/.test(email)) return null
  if (!roles.has(role) || !country || country.length > 100 || /[\x00-\x1f\x7f]/.test(country)) return null
  if ((value.website || '').length > 254 || /[\x00-\x1f\x7f]/.test(value.website || '')) return null
  return { company, email, role, country, website: value.website?.trim() || '' }
}

export function createNetworkHandler({ store, allowedOrigins, allowTestAdapter = false, requestTimeoutMs = 10000, receiptTimeoutMs = 5000, resolveClientIdentity = req => req.socket.remoteAddress || 'unknown' } = {}) {
  if (!Array.isArray(allowedOrigins) || !allowedOrigins.length || allowedOrigins.some(origin => {
    try { const parsed = new URL(origin); return parsed.origin !== origin || parsed.protocol !== 'https:' } catch { return true }
  })) throw new Error('Explicit HTTPS origins required')
  if (requestTimeoutMs <= 0 || receiptTimeoutMs <= 0) throw new Error('Invalid request budget')
  // Absence of verified durable storage fails closed; the runtime never uses the mock adapter.
  let ready = true
  try { requireStorageContract(store, { allowTestAdapter }) } catch { ready = false }
  return async (req, res) => {
    const reply = (status, message, extra = {}) => {
      if (res.writableEnded || res.destroyed) return
      res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...(status === 429 ? { 'Retry-After': '60' } : {}) })
      res.end(JSON.stringify({ message, ...extra }))
    }
    if (req.url !== '/api/network-interest' || req.method !== 'POST') return reply(404, 'Not found.')
    if (!ready) return reply(503, 'Enquiry service is unavailable.')
    // Host/Forwarded headers never expand the configured Origin allowlist.
    // Connecting IP only; proxy client identity integration remains an activation prerequisite.
    const clientIdentity = resolveClientIdentity(req)
    if (!clientIdentity) return reply(403, 'Secure request context is required.')
    if (!allowedOrigins.includes(req.headers.origin)) return reply(403, 'Request origin is not allowed.')
    if (!/^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(req.headers['content-type'] || '')) return reply(415, 'JSON is required.')
    const key = req.headers['idempotency-key']
    if (typeof key !== 'string' || !/^[a-zA-Z0-9_-]{16,128}$/.test(key)) return reply(400, 'A valid request identifier is required.')
    const chunks = []; let bytes = 0, timer
    const read = async () => {
      for await (const chunk of req) {
        const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
        bytes += buffer.length
        if (bytes > 4096) throw Object.assign(new Error('Body limit'), { code: 'BODY_LIMIT' })
        chunks.push(buffer)
      }
      return new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks))
    }
    let raw
    try {
      raw = await Promise.race([read(), new Promise((_, reject) => { timer = setTimeout(() => reject(Object.assign(new Error('Request timeout'), { code: 'REQUEST_TIMEOUT' })), requestTimeoutMs) })])
    } catch (error) {
      const status = error?.code === 'BODY_LIMIT' ? 413 : error?.code === 'REQUEST_TIMEOUT' ? 408 : 400
      reply(status, 'Invalid request.'); req.destroy(); return
    } finally { clearTimeout(timer) }
    let input
    try { input = validateRegistration(JSON.parse(raw)) } catch { /* no raw exception or input disclosure */ }
    if (!input) return reply(400, 'Please complete all four fields with valid details.')
    if (input.website) return reply(400, 'Invalid request.')
    try {
      const receipt = await Promise.race([
        store.receive({ input, idempotencyKey: key, clientIdentity }),
        new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('Storage timeout')), receiptTimeoutMs) })
      ])
      return reply(202, 'Your enquiry has been received for processing. Inbox delivery is not yet confirmed.', { enquiryId: receipt.record.ENQUIRY_ID, status: 'RECEIVED' })
    } catch (error) {
      if (error?.code === 'RATE_LIMITED') return reply(429, 'Please wait before trying again.')
      if (error?.code === 'IDEMPOTENCY_CONFLICT') return reply(409, 'Request identifier conflicts with an earlier enquiry.')
      // A late transaction may commit: same-key retry must retrieve it, never create a second record.
      return reply(503, 'Enquiry service is unavailable.')
    } finally { clearTimeout(timer) }
  }
}
export function createNetworkServer(options) {
  const server = http.createServer(createNetworkHandler(options))
  server.requestTimeout = 15000; server.headersTimeout = 10000; server.timeout = 15000
  return server
}
