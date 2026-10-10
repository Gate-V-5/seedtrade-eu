import { mysqlTlsTransport } from './mysqlTlsTransport.mjs'
import mysql from 'mysql2/promise'
import { StoreError } from './networkLeadStore.mjs'
export function mysqlConfiguration(env) {
  const { B2B_MYSQL_HOST, B2B_MYSQL_PORT = '3306', B2B_MYSQL_USER, B2B_MYSQL_PASSWORD, B2B_MYSQL_DATABASE, B2B_MYSQL_SOCKET } = env
  if (![B2B_MYSQL_USER, B2B_MYSQL_PASSWORD, B2B_MYSQL_DATABASE].every(v => typeof v === 'string' && v.length && !/[\x00\r\n]/.test(v))) throw new StoreError('DATABASE_CONFIGURATION_REQUIRED')
  if (B2B_MYSQL_SOCKET && (!B2B_MYSQL_SOCKET.startsWith('/') || /[\x00\r\n]/.test(B2B_MYSQL_SOCKET))) throw new StoreError('INVALID_DATABASE_SOCKET')
  if (B2B_MYSQL_SOCKET && env.B2B_MYSQL_SOCKET_VERIFIED !== 'true') throw new StoreError('VERIFIED_DATABASE_SOCKET_REQUIRED')
  if (!B2B_MYSQL_SOCKET && (!B2B_MYSQL_HOST || /[\x00\r\n]/.test(B2B_MYSQL_HOST))) throw new StoreError('DATABASE_CONFIGURATION_REQUIRED')
  const port = Number(B2B_MYSQL_PORT)
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new StoreError('INVALID_DATABASE_PORT')
  return { ...(B2B_MYSQL_SOCKET ? { socketPath: B2B_MYSQL_SOCKET } : mysqlTlsTransport(env)),
    user: B2B_MYSQL_USER, password: B2B_MYSQL_PASSWORD, database: B2B_MYSQL_DATABASE,
    connectionLimit: 4, waitForConnections: false, queueLimit: 0, connectTimeout: 4000,
    enableKeepAlive: true, charset: 'utf8mb4', timezone: 'Z', dateStrings: true,
    supportBigNumbers: true, decimalNumbers: true, multipleStatements: false, debug: false }
}
export function createMysqlPool(env) { return mysql.createPool(mysqlConfiguration(env)) }
