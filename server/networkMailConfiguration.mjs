// Configuration contract only. No transport is created or activated here.
export function mailConfiguration(env) {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM } = env
  if (![SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM].every(value => typeof value === 'string' && value.length > 0 && !/[\r\n\x00]/.test(value))) throw new Error('Server mail configuration is incomplete')
  const port = Number(SMTP_PORT)
  if (![465,587].includes(port)) throw new Error('TLS SMTP port required')
  if (!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(SMTP_FROM)) throw new Error('Configured sender must be one mailbox')
  return { host: SMTP_HOST, port, secure: port === 465, requireTLS: port === 587, tls: { rejectUnauthorized: true },
    connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 20000, dnsTimeout: 10000,
    auth: { user: SMTP_USER, pass: SMTP_PASS }, logger: false, debug: false }
}
