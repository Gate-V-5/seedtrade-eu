import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'
import { createGuardedStagingPool, requireStagingIdentity } from './networkStagingDatabase.mjs'
import { createMysqlLeadStore } from './networkMysqlStore.mjs'
export async function migrateStagingDatabase(env) {
  requireStagingIdentity(env)
  if (env.B2B_STAGING_TEST_EXECUTION !== 'true') throw new Error('Explicit staging test execution required')
  const pool = createGuardedStagingPool(env)
  try {
    const store = createMysqlLeadStore({ pool, secret: env.B2B_STORAGE_SECRET })
    const c = await pool.getConnection() // Active database/user/TLS/grants checked before DDL.
    try {
      const sql = await readFile(new URL('./migrations/001_b2b_private_enquiries.sql', import.meta.url), 'utf8')
      const statements = sql.split('\n').filter(line => !line.trim().startsWith('--')).join('\n').split(';').map(s => s.trim()).filter(Boolean)
      for (const statement of statements) {
        if (!statement.startsWith('CREATE TABLE IF NOT EXISTS b2b_')) throw new Error('Migration statement outside approved scope')
        await c.query({ sql: statement, timeout: 4000 })
      }
    } finally { c.release() }
    await store.verify()
    return { migration: 'VERIFIED', database: 'AUTHORISED_TEST_ONLY', privateRecordsCreated: 0 }
  } finally { await pool.end() }
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.length !== 3 || process.argv[2] !== '--apply-test-only') { console.error('Explicit --apply-test-only is required'); process.exitCode = 1 }
  else try { console.log(JSON.stringify(await migrateStagingDatabase(process.env))) }
  catch { console.error('Staging migration blocked or failed; review private configuration/schema safely'); process.exitCode = 1 }
}
