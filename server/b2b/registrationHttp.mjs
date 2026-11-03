// Opt-in B2B registration HTTP handler. Not mounted by the existing server.
// No cookies or sessions are issued. Requires trusted origin and rate limiter.
const MAX_BODY_BYTES = 16 * 1024;
const jsonHeaders = {'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
function respond(res, status, payload) { res.writeHead(status, jsonHeaders); res.end(JSON.stringify(payload)); }
async function readJson(req) {
  let size = 0;
  const chunks = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) throw new Error('BODY_TOO_LARGE');
    chunks.push(chunk);
  }
  const value = JSON.parse(Buffer.concat(chunks).toString('utf8'));
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('INVALID_JSON');
  return value;
}
export function createB2bRegistrationHttp({service, rateLimiter, allowedOrigin, enabled = false}) {
  if (!service || typeof service.register !== 'function' || typeof service.verifyEmail !== 'function' ||
      typeof rateLimiter !== 'function' || typeof allowedOrigin !== 'string' ||
      !/^https:\/\/[^/]+$/.test(allowedOrigin)) throw new TypeError('B2B_HTTP_CONFIGURATION');
  return async function handle(req, res) {
    const pathname = new URL(req.url, 'http://localhost').pathname;
    if (!pathname.startsWith('/api/b2b/v1/')) return false;
    if (!enabled) { respond(res, 404, {error:'NOT_FOUND'}); return true; }
    if (req.method !== 'POST' || !['/api/b2b/v1/register','/api/b2b/v1/verify-email'].includes(pathname)) {
      respond(res, 404, {error:'NOT_FOUND'}); return true;
    }
    if (req.headers.origin !== allowedOrigin ||
        !/^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(req.headers['content-type'] || '')) {
      respond(res, 403, {error:'REQUEST_REJECTED'}); return true;
    }
    // Rate limiter must use trusted server-derived client identity, not untrusted X-Forwarded-For.
    if (!(await rateLimiter(req))) { respond(res, 429, {error:'RATE_LIMITED'}); return true; }
    let body;
    try { body = await readJson(req); }
    catch { respond(res, 400, {error:'INVALID_REQUEST'}); return true; }
    try {
      if (pathname === '/api/b2b/v1/register') {
        const result = await service.register(body);
        if (!['PENDING_EMAIL_VERIFICATION','PENDING_EMAIL_DELIVERY'].includes(result?.status)) throw new Error('REGISTRATION_RESULT_INVALID');
        respond(res, 202, {status: result.status});
      } else {
        const result = await service.verifyEmail(body);
        if (result?.status === 'EMAIL_VERIFIED') respond(res, 200, {status:'EMAIL_VERIFIED'});
        else if (result?.status === 'INVALID_OR_EXPIRED') respond(res, 400, {error:'INVALID_OR_EXPIRED'});
        else throw new Error('VERIFICATION_RESULT_INVALID');
      }
    } catch (error) {
      if (error instanceof TypeError && /^INVALID_/.test(error.message)) {
        respond(res, 400, {error:'INVALID_REQUEST'});
      } else {
        // Never leak database details or report an infrastructure failure as success.
        respond(res, 503, {error:'TEMPORARILY_UNAVAILABLE'});
      }
    }
    return true;
  };
}
