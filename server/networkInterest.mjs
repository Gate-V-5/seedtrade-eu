import http from 'node:http'

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
  return { company, email, role, country, website: value.website?.trim() || '' }
}

export function createNetworkHandler({ sendMail, from, now = () => new Date(), rateLimitMs = 60_000 }) {
  if (typeof sendMail !== 'function' || !from) throw new Error('Server mail configuration is required')
  const recent = new Map()
  return async (req, res) => {
    const reply = (status, message) => { res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }); res.end(JSON.stringify({ message })) }
    if (req.url !== '/api/network-interest' || req.method !== 'POST') return reply(404, 'Not found.')
    const host = req.headers['x-forwarded-host'] || req.headers.host
    const origin = req.headers.origin
    if (!host || !origin || (() => { try { return new URL(origin).host !== host } catch { return true } })()) return reply(403, 'Request origin is not allowed.')
    if (!/^application\/json(?:\s*;|$)/i.test(req.headers['content-type'] || '')) return reply(415, 'JSON is required.')
    let raw = ''
    try {
      for await (const chunk of req) { raw += chunk; if (raw.length > 4096) return reply(413, 'Request too large.') }
      const input = validateRegistration(JSON.parse(raw))
      if (!input) return reply(400, 'Please complete all four fields with valid details.')
      // Honeypot: acknowledge without sending or disclosing the filtering rule.
      if (input.website) return reply(200, 'Thank you. Your interest has been registered.')
      const key = req.socket.remoteAddress || 'unknown'
      const time = now().getTime()
      for (const [address, expiry] of recent) if (expiry <= time) recent.delete(address)
      if (recent.has(key)) return reply(429, 'Please wait before trying again.')
      recent.set(key, time + rateLimitMs)
      try {
        const result = await sendMail({
          from, to: RECIPIENT, replyTo: input.email,
          subject: `SeedTrade Network Registration — ${input.company}`,
          text: `Company name: ${input.company}\nBusiness email: ${input.email}\nRole: ${input.role}\nCountry: ${input.country}\nSubmitted: ${now().toISOString()}\nSource: SeedTrade.eu European B2B Seed Network form\n`
        })
        if (!result?.accepted?.some(address => address.toLowerCase() === RECIPIENT)) throw new Error('SMTP did not accept the intended recipient')
        return reply(200, 'Thank you. Your interest has been registered.')
      } catch { recent.delete(key); return reply(503, 'Registration could not be sent. Please try again later.') }
    } catch { return reply(400, 'Invalid request.') }
  }
}

export function createNetworkServer(options) { return http.createServer(createNetworkHandler(options)) }
