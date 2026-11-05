import test from 'node:test';
import assert from 'node:assert/strict';
import {runStagingDatabaseProbe} from '../scripts/b2b_staging_db_readonly_probe.mjs';

// Synthetic configuration only; no process.env access or real driver calls.
const env = {
  SEEDTRADE_RUNTIME_ENV: 'staging',
  SEEDTRADE_PUBLIC_ORIGIN: 'https://staging.seedtrade.eu',
  B2B_REGISTRATION_DB_PROBE: 'true',
  B2B_DB_HOST: '127.0.0.1',
  B2B_DB_PORT: '3306',
  B2B_DB_NAME: 'u230581718_staging_b2b',
  B2B_DB_USER: 'u230581718_b2b_stage',
  B2B_DB_PASSWORD: 'synthetic-probe-test-only'
};
const tableNames = ['b2b_audit_log', 'b2b_companies', 'b2b_company_members',
  'b2b_email_verifications', 'b2b_users'];
const foreignKeys = [
  ['b2b_company_members', 'company_id', 'b2b_companies', 'id'],
  ['b2b_company_members', 'user_id', 'b2b_users', 'id'],
  ['b2b_email_verifications', 'user_id', 'b2b_users', 'id']
].map(([table_name, column_name, target_table, target_column]) =>
  ({table_name, column_name, target_table, target_column}));

function fixture(options = {}) {
  const state = {connections: 0, queries: [], ends: 0, destroys: 0};
  const rows = [
    [{db: env.B2B_DB_NAME, account: env.B2B_DB_USER + '@localhost'}],
    tableNames.map(name => ({name, engine: 'InnoDB'})),
    structuredClone(foreignKeys)
  ];
  const connection = {
    async execute(sql, params) {
      const index = state.queries.length;
      state.queries.push({sql, params});
      assert.match(sql, /^SELECT /);
      if (options.failQuery === index) throw options.error;
      return [rows[index]];
    },
    async end() {
      state.ends++;
      if (options.endError) throw options.endError;
    },
    async destroy() {
      state.destroys++;
      if (options.destroyError) throw options.destroyError;
    }
  };
  const driver = {
    async createConnection(config) {
      state.connections++;
      state.config = config;
      if (options.connectError) throw options.connectError;
      return connection;
    }
  };
  return {state, rows, run: (configuration = env) =>
    runStagingDatabaseProbe({env: configuration, driver})};
}

test('successful probe uses restricted options, three SELECTs and closes before returning', async () => {
  for (const host of ['localhost', '127.0.0.1']) {
    const f = fixture();
    f.rows[0][0].account = env.B2B_DB_USER + '@' + host;
    assert.deepEqual(await f.run(), {status: 'PASS', stage: 'SCHEMA'});
    assert.deepEqual(f.state.config, {
      host: '127.0.0.1', port: 3306, user: env.B2B_DB_USER,
      password: env.B2B_DB_PASSWORD, database: env.B2B_DB_NAME,
      connectTimeout: 4000, multipleStatements: false,
      namedPlaceholders: false, flags: ['-LOCAL_FILES']
    });
    assert.equal(f.state.queries.length, 3);
    assert.equal(f.state.queries[0].sql, 'SELECT DATABASE() AS db, CURRENT_USER() AS account');
    assert.match(f.state.queries[1].sql, /information_schema\.TABLES/);
    assert.deepEqual(f.state.queries[1].params, [env.B2B_DB_NAME, 'BASE TABLE']);
    assert.match(f.state.queries[2].sql, /information_schema\.KEY_COLUMN_USAGE/);
    assert.deepEqual(f.state.queries[2].params, [env.B2B_DB_NAME]);
    assert.equal(f.state.ends, 1);
    assert.equal(f.state.destroys, 0);
  }
});

test('every configuration restriction fails closed before creating a connection', async () => {
  for (const key of Object.keys(env)) {
    for (const value of [undefined, '', 'unexpected-value']) {
      // Passwords are private opaque values; only presence is validated.
      if (key === 'B2B_DB_PASSWORD' && value === 'unexpected-value') continue;
      const f = fixture();
      assert.deepEqual(await f.run({...env, [key]: value}), {
        status: 'BLOCKED', stage: 'CONFIGURATION', reason: 'OTHER_BLOCKED'
      }, key);
      assert.equal(f.state.connections, 0);
      assert.equal(f.state.ends, 0);
    }
  }
});

test('connection errors use only allowlisted codes and never raw error content', async () => {
  const cases = [
    ['ER_ACCESS_DENIED_ERROR', 'AUTH_FAILED'],
    ['ER_DBACCESS_DENIED_ERROR', 'AUTH_FAILED'],
    ['ECONNREFUSED', 'CONNECTION_REFUSED'],
    ['ETIMEDOUT', 'CONNECTION_TIMEOUT'],
    ['PROTOCOL_SEQUENCE_TIMEOUT', 'CONNECTION_TIMEOUT'],
    ['EHOSTUNREACH', 'CONNECTION_UNREACHABLE'],
    ['ENETUNREACH', 'CONNECTION_UNREACHABLE'],
    ['ENOTFOUND', 'CONNECTION_UNREACHABLE'],
    ['EAI_AGAIN', 'CONNECTION_UNREACHABLE'],
    ['UNKNOWN_PRIVATE_CODE', 'OTHER_BLOCKED'],
    ['constructor', 'OTHER_BLOCKED'],
    [undefined, 'OTHER_BLOCKED']
  ];
  for (const [code, reason] of cases) {
    const error = Object.assign(new Error('PRIVATE: mysql://secret SELECT password token'),
      {code, sql: 'PRIVATE SQL', password: env.B2B_DB_PASSWORD});
    const f = fixture({connectError: error});
    const result = await f.run();
    assert.deepEqual(result, {status: 'BLOCKED', stage: 'CONNECTION', reason});
    assert.doesNotMatch(JSON.stringify(result), /PRIVATE|mysql:|SELECT|password|token|synthetic/);
    assert.equal(f.state.queries.length, 0);
    assert.equal(f.state.ends, 0); // No connection handle was acquired.
  }
});

test('database/account mismatches fail at IDENTITY and always close', async () => {
  for (const alter of [
    rows => { rows[0] = []; },
    rows => { rows[0].push({...rows[0][0]}); },
    rows => { rows[0][0].db = 'different_database'; },
    rows => { rows[0][0].account = env.B2B_DB_USER + '@%'; },
    rows => { rows[0][0].account = 'different_user@localhost'; }
  ]) {
    const f = fixture();
    alter(f.rows);
    assert.deepEqual(await f.run(), {status: 'BLOCKED', stage: 'IDENTITY', reason: 'OTHER_BLOCKED'});
    assert.equal(f.state.queries.length, 1);
    assert.equal(f.state.ends, 1);
  }
});

test('exact five InnoDB tables and three foreign keys are required', async () => {
  for (const alter of [
    rows => { rows[1].pop(); },
    rows => { rows[1].push({name: 'extra_table', engine: 'InnoDB'}); },
    rows => { rows[1][0].name = 'unexpected_table'; },
    rows => { rows[1][0].engine = 'MyISAM'; },
    rows => { rows[2].pop(); },
    rows => { rows[2].push({...rows[2][0]}); },
    rows => { rows[2][0].target_table = 'unexpected_table'; },
    rows => { rows[2][0].target_column = 'unexpected_column'; },
    rows => { rows[2][0].column_name = 'unexpected_column'; }
  ]) {
    const f = fixture();
    alter(f.rows);
    assert.deepEqual(await f.run(), {status: 'BLOCKED', stage: 'SCHEMA', reason: 'OTHER_BLOCKED'});
    assert.equal(f.state.ends, 1);
  }
});

test('query errors retain their stage and cannot masquerade as connection errors', async () => {
  for (const index of [0, 1, 2]) {
    const f = fixture({failQuery: index,
      error: Object.assign(new Error('PRIVATE SQL'), {code: 'ER_ACCESS_DENIED_ERROR'})});
    assert.deepEqual(await f.run(), {status: 'BLOCKED',
      stage: index === 0 ? 'IDENTITY' : 'SCHEMA', reason: 'OTHER_BLOCKED'});
    assert.equal(f.state.ends, 1);
  }
});

test('cleanup failure forces destruction and BLOCKED without leaking errors', async () => {
  for (const failQuery of [undefined, 0, 1]) {
    for (const destroyError of [undefined, new Error('PRIVATE destroy failure')]) {
      const f = fixture({failQuery, error: new Error('PRIVATE query failure'),
        endError: new Error('PRIVATE cleanup failure'), destroyError});
      assert.deepEqual(await f.run(), {status: 'BLOCKED',
        stage: failQuery === 0 ? 'IDENTITY' : 'SCHEMA', reason: 'OTHER_BLOCKED'});
      assert.equal(f.state.ends, 1);
      assert.equal(f.state.destroys, 1);
    }
  }
});
