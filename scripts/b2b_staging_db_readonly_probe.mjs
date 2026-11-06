#!/usr/bin/env node
// Operator-run, read-only staging registration DB probe.
// Never imported by server/index.mjs; no HTTP endpoint or deployment side effects.
// Execute only inside the authorised managed Node.js staging runtime.
import mysql from 'mysql2/promise';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

const expectedDatabase = 'u230581718_staging_b2b';
const expectedUser = 'u230581718_b2b_stage';
const expectedTables = [
  'b2b_audit_log', 'b2b_companies', 'b2b_company_members',
  'b2b_email_verifications', 'b2b_users'
];
const connectionFailures = new Map([
  ['ER_ACCESS_DENIED_ERROR', 'AUTH_FAILED'],
  ['ER_DBACCESS_DENIED_ERROR', 'AUTH_FAILED'],
  ['ECONNREFUSED', 'CONNECTION_REFUSED'],
  ['ETIMEDOUT', 'CONNECTION_TIMEOUT'],
  ['PROTOCOL_SEQUENCE_TIMEOUT', 'CONNECTION_TIMEOUT'],
  ['EHOSTUNREACH', 'CONNECTION_UNREACHABLE'],
  ['ENETUNREACH', 'CONNECTION_UNREACHABLE'],
  ['ENOTFOUND', 'CONNECTION_UNREACHABLE'],
  ['EAI_AGAIN', 'CONNECTION_UNREACHABLE']
]);

// Importing this module never connects. Tests supply a fake driver and environment.
export async function runStagingDatabaseProbe({env, driver}) {
 let connection;
 let stage = 'CONFIGURATION';
 let result;
 try {
  if (env.SEEDTRADE_RUNTIME_ENV !== 'staging' ||
      env.SEEDTRADE_PUBLIC_ORIGIN !== 'https://staging.seedtrade.eu' ||
      env.B2B_REGISTRATION_DB_PROBE !== 'true' ||
      env.B2B_DB_HOST !== '127.0.0.1' ||
      env.B2B_DB_PORT !== '3306' ||
      env.B2B_DB_NAME !== expectedDatabase ||
      env.B2B_DB_USER !== expectedUser ||
      !env.B2B_DB_PASSWORD) throw new Error('BLOCKED');

  stage = 'CONNECTION';
  connection = await driver.createConnection({
    host: '127.0.0.1', port: 3306,
    user: expectedUser, password: env.B2B_DB_PASSWORD,
    database: expectedDatabase,
    connectTimeout: 4000, multipleStatements: false,
    namedPlaceholders: false, flags: ['-LOCAL_FILES']
  });
  stage = 'IDENTITY';
  const [identity] = await connection.execute(
    'SELECT DATABASE() AS db, CURRENT_USER() AS account'
  );
  if (identity.length !== 1 ||
      identity[0].db !== expectedDatabase ||
      !['u230581718_b2b_stage@127.0.0.1','u230581718_b2b_stage@localhost'].includes(identity[0].account)) {
    throw new Error('BLOCKED');
  }
  stage = 'SCHEMA';
  const [tables] = await connection.execute(
    'SELECT TABLE_NAME AS name, ENGINE AS engine FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_TYPE = ? ORDER BY TABLE_NAME',
    [expectedDatabase, 'BASE TABLE']
  );
  const portalTables=['b2b_sessions','b2b_offers','b2b_enquiries','b2b_enquiry_messages'];
  const portal=tables.length===expectedTables.length+portalTables.length;
  const allowedTables=portal?[...expectedTables,...portalTables].sort():expectedTables;
  if (tables.length !== allowedTables.length ||
      tables.some((row,i) => row.name !== allowedTables[i] || row.engine !== 'InnoDB'))
    throw new Error('BLOCKED');
  const [keys] = await connection.execute(
    'SELECT TABLE_NAME AS table_name, COLUMN_NAME AS column_name, REFERENCED_TABLE_NAME AS target_table, REFERENCED_COLUMN_NAME AS target_column FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA = ? AND REFERENCED_TABLE_NAME IS NOT NULL',
    [expectedDatabase]
  );
  const actual = keys.map(x=>[x.table_name,x.column_name,x.target_table,x.target_column].join(':')).sort();
  const expected = [
    'b2b_company_members:company_id:b2b_companies:id',
    'b2b_company_members:user_id:b2b_users:id',
    'b2b_email_verifications:user_id:b2b_users:id',
    ...(portal?[
      'b2b_sessions:user_id:b2b_users:id',
      'b2b_offers:company_id:b2b_companies:id',
      'b2b_enquiries:offer_id:b2b_offers:id',
      'b2b_enquiries:buyer_company_id:b2b_companies:id',
      'b2b_enquiries:created_by_user_id:b2b_users:id',
      'b2b_enquiry_messages:enquiry_id:b2b_enquiries:id',
      'b2b_enquiry_messages:author_user_id:b2b_users:id',
      'b2b_enquiry_messages:author_company_id:b2b_companies:id'
    ]:[])
  ].sort();
  if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error('BLOCKED');
  result = {status: 'PASS', stage};
 } catch (error) {
  // Only fixed categories escape; never return raw errors or configuration values.
  const reason = stage === 'CONNECTION'
    ? connectionFailures.get(error?.code) ?? 'OTHER_BLOCKED'
    : 'OTHER_BLOCKED';
  result = {status: 'BLOCKED', stage, reason};
 } finally {
  if (connection) {
    try {
      await connection.end();
    } catch {
      // Force-close when graceful cleanup fails, and never report a clean PASS.
      try { await connection.destroy(); } catch { /* No raw cleanup errors. */ }
      result = {status: 'BLOCKED', stage, reason: 'OTHER_BLOCKED'};
    }
  }
 }
 return result;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const result = await runStagingDatabaseProbe({env: process.env, driver: mysql});
  const line = `B2B_STAGING_DB_READ_ONLY_PROBE=${result.status} STAGE=${result.stage}` +
    (result.reason ? ` REASON=${result.reason}` : '');
  if (result.status === 'PASS') console.log(line);
  else {
    console.error(line);
    process.exitCode = 1;
  }
}
