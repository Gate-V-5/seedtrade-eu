import nodemailer from 'nodemailer'

export function createRuntimeMail(env, createTransport = nodemailer.createTransport) {
  const mode = env.SEEDTRADE_MAIL_TRANSPORT || 'smtp'
  if (mode === 'test-stream') {
    if (env.SEEDTRADE_RUNTIME_ENV !== 'staging' || env.SEEDTRADE_PUBLIC_ORIGIN !== 'https://staging.seedtrade.eu') {
      throw new Error('Test mail transport requires explicit staging identity')
    }
    return {
      from: 'staging-test@seedtrade.invalid',
      transport: createTransport({ streamTransport: true, buffer: true, newline: 'unix', disableFileAccess: true, disableUrlAccess: true })
    }
  }
  if (mode !== 'smtp') throw new Error('Unsupported mail transport')
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM } = env
  if (![SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM].every(Boolean)) throw new Error('Server SMTP configuration is incomplete')
  const port = Number(SMTP_PORT)
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid SMTP_PORT')
  return { from: SMTP_FROM, transport: createTransport({ host: SMTP_HOST, port, secure: port === 465, auth: { user: SMTP_USER, pass: SMTP_PASS } }) }
}
