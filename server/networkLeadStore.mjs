import { randomUUID, createHmac } from 'node:crypto'

export const DELIVERY_STATES = Object.freeze(['RECEIVED', 'PENDING_DELIVERY', 'DELIVERING', 'DELIVERED_TO_PROVIDER', 'DELIVERY_FAILED_RETRYABLE', 'DELIVERY_FAILED_PERMANENT', 'MANUAL_REVIEW_REQUIRED'])
const transitions = {
  RECEIVED: ['PENDING_DELIVERY'], PENDING_DELIVERY: ['DELIVERING'],
  DELIVERING: ['DELIVERED_TO_PROVIDER', 'DELIVERY_FAILED_RETRYABLE', 'DELIVERY_FAILED_PERMANENT', 'MANUAL_REVIEW_REQUIRED'],
  DELIVERY_FAILED_RETRYABLE: ['DELIVERING'], DELIVERED_TO_PROVIDER: [], DELIVERY_FAILED_PERMANENT: [], MANUAL_REVIEW_REQUIRED: []
}
export class StoreError extends Error { constructor(code) { super(code); this.code = code } }
export function requireStorageContract(store, { allowTestAdapter = false } = {}) {
  if (!store || !['receive', 'claim', 'settle', 'recover', 'purge'].every(name => typeof store[name] === 'function')) throw new StoreError('STORAGE_UNAVAILABLE')
  if (!store.capabilities?.atomic || !store.capabilities?.idempotency || (!store.capabilities?.durable && !allowTestAdapter)) throw new StoreError('STORAGE_NOT_DURABLE')
}

// Isolated non-durable test adapter. Never selected by server/index.mjs.
// A production adapter must implement the same atomic transactions on verified private storage.
export function createMockLeadStore({ secret, now = () => Date.now(), retentionMs = 7 * 86400000, idempotencyMs = 86400000, rateWindowMs = 60000, rateMaximum = 1 } = {}) {
  if (typeof secret !== 'string' || secret.length < 32 || retentionMs < idempotencyMs || idempotencyMs <= 0 || rateWindowMs <= 0 || rateMaximum < 1) throw new StoreError('INVALID_STORAGE_POLICY')
  const records = new Map(), keys = new Map(), rates = new Map()
  const digest = value => createHmac('sha256', secret).update(value).digest('hex')
  const copy = value => structuredClone(value)
  const change = (record, state, patch = {}) => {
    if (!transitions[record.DELIVERY_STATUS]?.includes(state)) throw new StoreError('INVALID_TRANSITION')
    Object.assign(record, patch, { DELIVERY_STATUS: state, UPDATED_AT: new Date(now()).toISOString() })
  }
  function purge() {
    const time = now()
    for (const [key, value] of keys) if (value.expires <= time) keys.delete(key)
    for (const [id, value] of records) if (Date.parse(value.RETENTION_EXPIRES_AT) <= time) records.delete(id)
    for (const [key, value] of rates) if (value.expires <= time) rates.delete(key)
  }
  return {
    capabilities: Object.freeze({ atomic: true, idempotency: true, durable: false, private: true, testOnly: true }),
    async receive({ input, idempotencyKey, clientIdentity }) {
      purge()
      const key = digest('key:' + idempotencyKey), payload = digest(JSON.stringify([input.company, input.email, input.role, input.country]))
      const existing = keys.get(key)
      if (existing) {
        if (existing.payload !== payload) throw new StoreError('IDEMPOTENCY_CONFLICT')
        return { record: copy(records.get(existing.id)), duplicate: true }
      }
      const rateKey = digest('rate:' + clientIdentity), time = now(), bucket = rates.get(rateKey)
      if (bucket && bucket.count >= rateMaximum) throw new StoreError('RATE_LIMITED')
      rates.set(rateKey, { count: (bucket?.count || 0) + 1, expires: bucket?.expires || time + rateWindowMs })
      const date = new Date(time).toISOString(), id = randomUUID()
      const record = { ENQUIRY_ID: id, RECEIVED_AT: date, COMPANY_NAME: input.company, BUSINESS_EMAIL: input.email, ROLE: input.role, COUNTRY: input.country,
        DELIVERY_STATUS: 'RECEIVED', DELIVERY_ATTEMPTS: 0, LAST_DELIVERY_ERROR_CODE: null, CREATED_AT: date, UPDATED_AT: date,
        CLASSIFICATION: 'PRIVATE_ENQUIRY', RETENTION_EXPIRES_AT: new Date(time + retentionMs).toISOString(), NEXT_ATTEMPT_AT: time, PROVIDER_MESSAGE_ID: null }
      change(record, 'PENDING_DELIVERY')
      records.set(id, record); keys.set(key, { id, payload, expires: time + idempotencyMs })
      return { record: copy(record), duplicate: false }
    },
    async claim(id, maximumAttempts) {
      purge(); const r = records.get(id)
      if (!r || !['PENDING_DELIVERY', 'DELIVERY_FAILED_RETRYABLE'].includes(r.DELIVERY_STATUS) || r.NEXT_ATTEMPT_AT > now() || r.DELIVERY_ATTEMPTS >= maximumAttempts) return null
      const token = randomUUID()
      change(r, 'DELIVERING', { DELIVERY_ATTEMPTS: r.DELIVERY_ATTEMPTS + 1, CLAIM_TOKEN: token })
      return { record: copy(r), token }
    },
    async settle(id, token, state, patch = {}) {
      const r = records.get(id)
      if (!r || r.DELIVERY_STATUS !== 'DELIVERING' || r.CLAIM_TOKEN !== token) throw new StoreError('STALE_CLAIM')
      const allowed = new Set(['LAST_DELIVERY_ERROR_CODE', 'NEXT_ATTEMPT_AT', 'PROVIDER_MESSAGE_ID'])
      if (Object.keys(patch).some(key => !allowed.has(key))) throw new StoreError('INVALID_PATCH')
      change(r, state, patch); delete r.CLAIM_TOKEN; return copy(r)
    },
    async recover() {
      // Call only after previous worker process is stopped; ambiguous sends are never retried.
      for (const r of records.values()) if (r.DELIVERY_STATUS === 'DELIVERING') { change(r, 'MANUAL_REVIEW_REQUIRED', { LAST_DELIVERY_ERROR_CODE: 'WORKER_INTERRUPTED' }); delete r.CLAIM_TOKEN }
    },
    async purge() { purge() },
    // Test inspection only. No public endpoint exposes this method.
    inspect(id) { return copy(records.get(id)) },
    count() { return records.size }
  }
}
