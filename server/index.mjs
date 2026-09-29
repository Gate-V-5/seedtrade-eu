import nodemailer from 'nodemailer'
import http from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { createNetworkHandler } from './networkInterest.mjs'

const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM, PORT } = process.env
if (![SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM].every(Boolean)) throw new Error('Server SMTP configuration is incomplete')
const port = Number(SMTP_PORT)
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid SMTP_PORT')
const transport = nodemailer.createTransport({ host: SMTP_HOST, port, secure: port === 465, auth: { user: SMTP_USER, pass: SMTP_PASS } })
const networkInterest = createNetworkHandler({ sendMail: options => transport.sendMail(options), from: SMTP_FROM })
const dist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../dist')
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.xml': 'application/xml; charset=utf-8', '.txt': 'text/plain; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.ico': 'image/x-icon', '.webp': 'image/webp', '.woff2': 'font/woff2' }

const server = http.createServer(async (req, res) => {
  if (req.url?.split('?')[0] === '/api/network-interest') return networkInterest(req, res)
  if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405); return res.end() }
  let pathname
  try { pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname) } catch { res.writeHead(400); return res.end() }
  if (pathname.includes('\0') || pathname.split('/').includes('..') || pathname.startsWith('/api/')) { res.writeHead(404); return res.end() }
  const target = path.resolve(dist, `.${pathname}`)
  if (target !== dist && !target.startsWith(dist + path.sep)) { res.writeHead(404); return res.end() }
  try {
    const file = (await stat(target)).isDirectory() ? path.join(target, 'index.html') : target
    const data = await readFile(file)
    const extension = path.extname(file).toLowerCase()
    res.writeHead(200, { 'Content-Type': mime[extension] || 'application/octet-stream', 'X-Content-Type-Options': 'nosniff', 'Cache-Control': extension === '.html' ? 'no-cache, must-revalidate' : 'public, max-age=31536000, immutable' })
    res.end(req.method === 'HEAD' ? undefined : data)
  } catch { res.writeHead(404); res.end() }
})
const listenPort = PORT == null || PORT === '' ? 3000 : Number(PORT)
if (!Number.isInteger(listenPort) || listenPort < 1 || listenPort > 65535) throw new Error('Valid PORT is required')
server.listen(listenPort)
