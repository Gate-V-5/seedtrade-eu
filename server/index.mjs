import http from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { createNetworkHandler } from './networkInterestLegacy.mjs'
import { createStagingNetworkRuntime } from './networkStagingRuntime.mjs'
import { requireStagingIdentity } from './networkStagingDatabase.mjs'

const { PORT } = process.env
const { createRuntimeMail } = await import('./runtimeMail.mjs')
const staging = process.env.SEEDTRADE_RUNTIME_ENV === 'staging' || process.env.SEEDTRADE_MAIL_TRANSPORT === 'test-stream'
if (staging) requireStagingIdentity(process.env)
const { transport, from } = createRuntimeMail(process.env)
const runtime = staging ? await createStagingNetworkRuntime(process.env) : null
const networkInterest = runtime?.networkInterest || createNetworkHandler({ sendMail: options => transport.sendMail(options), from })
const dist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../dist')
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.xml': 'application/xml; charset=utf-8', '.txt': 'text/plain; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.ico': 'image/x-icon', '.webp': 'image/webp', '.woff2': 'font/woff2' }

const server = http.createServer(async (req, res) => {
  if (runtime) res.setHeader('X-SeedTrade-Staging-Backend', 'package3h')
  if (runtime?.cron && req.url === '/api/internal/network-delivery') return runtime.cron(req, res)
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
server.requestTimeout = 15000
server.headersTimeout = 10000
server.timeout = runtime?.cron ? 60000 : 15000
server.listen(listenPort)
for (const signal of ['SIGINT','SIGTERM']) process.on(signal, () => server.close(() => Promise.resolve(runtime?.close()).finally(() => process.exit(0))))
