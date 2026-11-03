// B2B database readiness: no connection on import, no schema changes, no secrets in output.
// This module is intentionally not mounted in the live server yet.
export function b2bDatabaseConfig(env) {
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
