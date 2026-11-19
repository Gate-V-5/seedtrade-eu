// B2B database readiness: no connection on import, no schema changes, no secrets in output.
// This module is intentionally not mounted in the live server yet.
export function b2bDatabaseConfig(env) {
  if(env.SEEDTRADE_RUNTIME_ENV==='production') {
    if(env.SEEDTRADE_PUBLIC_ORIGIN!=='https://seedtrade.eu'||env.B2B_DB_SOCKET!=='/run/seedtrade-production-db/mariadb.sock'||
       env.B2B_DB_NAME!=='u230581718_seedtrade_b2b'||env.B2B_DB_USER!=='u230581718_b2b_prod'||
       typeof env.B2B_DB_PASSWORD!=='string'||!env.B2B_DB_PASSWORD||env.B2B_DB_HOST||env.B2B_DB_PORT)throw Error('B2B_DB_CONFIG_INCOMPLETE');
    return {socketPath:env.B2B_DB_SOCKET,user:env.B2B_DB_USER,password:env.B2B_DB_PASSWORD,database:env.B2B_DB_NAME,connectTimeout:5000,waitForConnections:true,connectionLimit:5};
  }
  const host = env.B2B_DB_HOST;
  const user = env.B2B_DB_USER;
  const password = env.B2B_DB_PASSWORD;
  const database = env.B2B_DB_NAME;
  const port = env.B2B_DB_PORT == null ? 3306 : Number(env.B2B_DB_PORT);
  if (![host,user,password,database].every(x => typeof x === 'string' && x.length > 0) ||
      !Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('B2B_DB_CONFIG_INCOMPLETE');
  }
  return {host, user, password, database, port, connectTimeout: 5000, waitForConnections: true, connectionLimit: 5};
}

// Inject the driver in tests; a real connection is made only when explicitly called.
export async function checkB2bDatabase({env, driver}) {
  let connection;
  try {
    const config = b2bDatabaseConfig(env);
    connection = await driver.createConnection(config);
    const [rows] = await connection.query('SELECT 1 AS ok');
    return {status: rows?.[0]?.ok === 1 ? 'PASS' : 'BLOCKED'};
  } catch {
    // Do not log raw driver errors: they may contain hostnames, usernames or credentials.
    return {status: 'BLOCKED'};
  } finally {
    if (connection) await connection.end().catch(() => {});
  }
}
