import { createMysqlPool, mysqlConfiguration } from './networkMysqlConfiguration.mjs'
export const TEST_DATABASE = 'u230581718_seedtrade_test'
export const TEST_USER = 'u230581718_st_test'
export function requireStagingIdentity(env) {
  if (env.SEEDTRADE_RUNTIME_ENV !== 'staging' || env.SEEDTRADE_PUBLIC_ORIGIN !== 'https://staging.seedtrade.eu' || env.SEEDTRADE_MAIL_TRANSPORT !== 'test-stream') throw new Error('Explicit staging test identity required')
}
export function requireTestDatabaseConfiguration(env) {
  requireStagingIdentity(env)
  if (env.B2B_MYSQL_DATABASE !== TEST_DATABASE || env.B2B_MYSQL_USER !== TEST_USER) throw new Error('Authorised test database configuration required')
  if (env.B2B_MYSQL_SOCKET && env.B2B_MYSQL_SOCKET_VERIFIED !== 'true') throw new Error('Verified private database socket required')
  return mysqlConfiguration(env)
}
export async function verifyConnectedTestDatabase(connection, env) {
  requireTestDatabaseConfiguration(env)
  const [rows] = await connection.execute({ sql: 'SELECT DATABASE() AS db, CURRENT_USER() AS account', timeout: 4000 })
  if (rows.length !== 1 || rows[0].db !== TEST_DATABASE || typeof rows[0].account !== 'string' || rows[0].account.split('@')[0] !== TEST_USER) throw new Error('Connected test database identity mismatch')
  if (!env.B2B_MYSQL_SOCKET) {
    const [tls] = await connection.execute({ sql: "SHOW SESSION STATUS LIKE 'Ssl_cipher'", timeout: 4000 })
    if (tls.length !== 1 || typeof tls[0].Value !== 'string' || !tls[0].Value.length) throw new Error('Verified database TLS required')
  }
  const [grants] = await connection.execute({ sql: 'SHOW GRANTS FOR CURRENT_USER()', timeout: 4000 })
  if (!grants.length || grants.some(row => {
    const grant = Object.values(row)[0]
    if (typeof grant !== 'string' || /WITH GRANT OPTION/i.test(grant)) return true
    const scope = grant.match(/^GRANT\s+(.+?)\s+ON\s+(.+?)\s+TO\s/i)
    if (!scope) return true // Roles or unrecognised grants require review, not guessing.
    if (scope[2] === '*.*') return scope[1] !== 'USAGE'
    return !new RegExp('^`' + TEST_DATABASE + '`\\.(?:\\*|`b2b_[a-z_]+`)$').test(scope[2])
  })) throw new Error('Restricted test database grants required')
  return true
}
// Check the active identity on every acquired connection, before transaction/DDL/DML.
export function createGuardedStagingPool(env, poolFactory = createMysqlPool) {
  requireTestDatabaseConfiguration(env)
  const pool = poolFactory(env)
  return {
    async getConnection() {
      const c = await pool.getConnection()
      try { await verifyConnectedTestDatabase(c, env); return c }
      catch { c.destroy(); throw new Error('Test database connection verification failed') }
    },
    end: () => pool.end()
  }
}
