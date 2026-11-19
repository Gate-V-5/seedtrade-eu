// B2B V1 email verification primitives. No mail send, database writes or HTTP routes.
import {randomBytes, createHash, timingSafeEqual} from 'node:crypto';

export const EMAIL_TOKEN_TTL_MS = 30 * 60 * 1000;
export const RESET_TOKEN_TTL_MS = 15 * 60 * 1000;
// Domain separation permits the existing token store without accepting a reset
// credential as an email-verification credential (or the reverse).
export function hashResetToken(token) {
  hashVerificationToken(token); // same strict 256-bit token format
  return createHash('sha256').update('seedtrade-password-reset-v1\0').update(token,'ascii').digest('hex');
}
export function issueResetToken({now=Date.now()}={}) {
  const issued=issueVerificationToken({now});
  return {...issued,tokenHash:hashResetToken(issued.token),expiresAt:now+RESET_TOKEN_TTL_MS};
}

export function normalizeEmail(email) {
  if (typeof email !== 'string') throw new TypeError('INVALID_EMAIL');
  const value = email.trim().toLowerCase();
  if (value.length < 3 || value.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    throw new TypeError('INVALID_EMAIL');
  }
  return value;
}

export function hashVerificationToken(token) {
  if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token)) {
    throw new TypeError('INVALID_VERIFICATION_TOKEN');
  }
  return createHash('sha256').update(token, 'ascii').digest('hex');
}

export function issueVerificationToken({now = Date.now()} = {}) {
  if (!Number.isSafeInteger(now) || now < 0) throw new TypeError('INVALID_TIME');
  const token = randomBytes(32).toString('hex');
  return {token, tokenHash: hashVerificationToken(token), expiresAt: now + EMAIL_TOKEN_TTL_MS};
}

// Callers must atomically consume a matching unconsumed token in the database.
// This function alone does not provide single-use semantics.
export function verifyTokenCandidate({token, storedHash, expiresAt, consumedAt = null, now = Date.now()}) {
  if (consumedAt != null || !Number.isSafeInteger(now) || !Number.isSafeInteger(expiresAt) ||
      now >= expiresAt || typeof storedHash !== 'string' || !/^[a-f0-9]{64}$/.test(storedHash)) return false;
  let digest;
  try { digest = Buffer.from(hashVerificationToken(token), 'hex'); }
  catch { return false; }
  return timingSafeEqual(digest, Buffer.from(storedHash, 'hex'));
}
