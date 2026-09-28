import nodemailer from 'nodemailer'
import { createNetworkServer } from './networkInterest.mjs'

const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM, PORT } = process.env
if (![SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM].every(Boolean)) throw new Error('Server SMTP configuration is incomplete')
const port = Number(SMTP_PORT)
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid SMTP_PORT')
const transport = nodemailer.createTransport({ host: SMTP_HOST, port, secure: port === 465, auth: { user: SMTP_USER, pass: SMTP_PASS } })
const server = createNetworkServer({ sendMail: options => transport.sendMail(options), from: SMTP_FROM })
server.listen(Number(PORT) || 3000)
