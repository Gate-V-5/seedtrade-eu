import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeEmail, issueVerificationToken, hashVerificationToken, verifyTokenCandidate, EMAIL_TOKEN_TTL_MS} from '../server/b2b/emailVerification.mjs';

test('email normalization rejects invalid inputs', () => {
  assert.equal(normalizeEmail('  User@Example.COM '), 'user@example.com');
  assert.throws(() => normalizeEmail('not-an-email'), /INVALID_EMAIL/);
});
test('issued token is random, hashed, and expires in 30 minutes', () => {
  const a = issueVerificationToken({now: 1000});
  const b = issueVerificationToken({now: 1000});
  assert.match(a.token, /^[a-f0-9]{64}$/);
  assert.notEqual(a.token, b.token);
  assert.notEqual(a.token, a.tokenHash);
  assert.equal(a.tokenHash, hashVerificationToken(a.token));
  assert.equal(a.expiresAt, 1000 + EMAIL_TOKEN_TTL_MS);
});
test('verification rejects wrong, expired and consumed tokens', () => {
  const issued = issueVerificationToken({now: 1000});
  const candidate = {token: issued.token, storedHash: issued.tokenHash, expiresAt: issued.expiresAt};
  assert.equal(verifyTokenCandidate({...candidate, now: 1001}), true);
  assert.equal(verifyTokenCandidate({...candidate, token: '0'.repeat(64), now: 1001}), false);
  assert.equal(verifyTokenCandidate({...candidate, now: issued.expiresAt}), false);
  assert.equal(verifyTokenCandidate({...candidate, consumedAt: 1002, now: 1001}), false);
  assert.equal(verifyTokenCandidate({...candidate, storedHash: 'bad', now: 1001}), false);
});
