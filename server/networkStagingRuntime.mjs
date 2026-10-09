import { createHash } from 'node:crypto'
import { createNetworkHandler } from './networkInterest.mjs'
import { createMysqlLeadStore } from './networkMysqlStore.mjs'
import { createProxyPolicy } from './networkProxyPolicy.mjs'
import { createDeliveryWorker } from './networkDeliveryWorker.mjs'
import { createDeliveryCron } from './networkDeliveryCron.mjs'
import { createRuntimeMail } from './runtimeMail.mjs'
import { requireStagingIdentity, createGuardedStagingPool } from './networkStagingDatabase.mjs'
const allowedOrigins = ['https://staging.seedtrade.eu']
export function createStagingTestSender(env) {
  requireStagingIdentity(env)
  return async (message, { signal } = {}) => {
    if (signal?.aborted) throw new Error('Test transport aborted')
    const { transport } = createRuntimeMail(env)
    try {
      // Generate only in memory, addressed to a synthetic .invalid recipient.
      // Never return fake SMTP acceptance or log/persist MIME/personal information.
      await transport.sendMail({ ...message, to: 'synthetic-staging@seedtrade.invalid', disableFileAccess: true, disableUrlAccess: true })
      throw Object.assign(new Error('Staging test transport does not deliver'), { code: 'TEST_TRANSPORT_DISABLED', deliveryOutcome: 'NOT_ACCEPTED', retryable: false })
    } finally { transport.close() }
  }
}
export async function createStagingNetworkRuntime(env, { poolFactory = createGuardedStagingPool, storeFactory = createMysqlLeadStore } = {}) {
  requireStagingIdentity(env)
  const unavailable = () => ({ networkInterest: createNetworkHandler({ allowedOrigins }), cron: null, ready: false, close: async () => {} })
  if (env.B2B_ENQUIRIES_ENABLED !== 'true') return unavailable()
  let pool
  try {
    if (['B2B_RUNTIME_VERIFIED','B2B_STORAGE_VERIFIED','B2B_PRIVACY_APPROVED'].some(k => env[k] !== 'true')) return unavailable()
    const resolveClientIdentity = createProxyPolicy(env)
    pool = poolFactory(env)
    const store = storeFactory({ pool, secret: env.B2B_STORAGE_SECRET,
      retentionDays: Number(env.B2B_RETENTION_DAYS || 90), idempotencyDays: Number(env.B2B_IDEMPOTENCY_DAYS || 7), abuseHours: Number(env.B2B_ABUSE_HOURS || 24),
      retentionApproved: false, lockName: 'b2b_' + createHash('sha256').update(env.B2B_MYSQL_DATABASE).digest('hex').slice(0,48) })
    await store.verify()
    const worker = createDeliveryWorker({ store, sendMail: createStagingTestSender(env), from: 'staging-test@seedtrade.invalid' })
    // Cron is optional and never scheduled automatically. Its token remains server-only.
    const cron = env.B2B_STAGING_WORKER_ENABLED === 'true' ? createDeliveryCron({ store, worker, token: env.B2B_CRON_TOKEN, resolveClientIdentity }) : null
    return { networkInterest: createNetworkHandler({ store, allowedOrigins, resolveClientIdentity }), cron, ready: true, close: () => store.close() }
  } catch {
    await pool?.end().catch(() => {})
    // No mock fallback, secret/error log, or public startup crash.
    return unavailable()
  }
}
