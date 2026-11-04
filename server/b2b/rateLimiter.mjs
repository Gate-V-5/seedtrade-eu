// Single-process bounded rate limiter for isolated B2B registration testing.
// Not a substitute for shared, proxy-verified production abuse controls.
export function createB2bRateLimiter({limit = 5, windowMs = 60_000, now = () => Date.now()} = {}) {
  if (!Number.isSafeInteger(limit) || limit < 1 || !Number.isSafeInteger(windowMs) || windowMs < 1)
    throw new TypeError('INVALID_RATE_LIMIT_CONFIGURATION');
  const attempts = new Map();
  return async function rateLimit(req) {
    // Do not trust user-supplied forwarding headers.
    const address = req.socket?.remoteAddress;
    if (typeof address !== 'string' || !address || address.length > 128) return false;
    const time = now();
    if (!Number.isSafeInteger(time) || time < 0) return false;
    for (const [key, value] of attempts) {
      if (time >= value.resetAt) attempts.delete(key);
    }
    const key = address + ':' + new URL(req.url, 'http://localhost').pathname;
    const current = attempts.get(key);
    if (!current || time >= current.resetAt) {
      if (attempts.size >= 10000) return false;
      attempts.set(key, {count:1,resetAt:time + windowMs});
      return true;
    }
    if (current.count >= limit) return false;
    current.count++;
    return true;
  };
}
