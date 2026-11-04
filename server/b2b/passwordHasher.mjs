// Built-in Node.js password hashing; no new runtime dependency.
// Format: scrypt$N$r$p$saltHex$derivedKeyHex
import {randomBytes, scrypt as scryptCallback, timingSafeEqual} from 'node:crypto';
import {promisify} from 'node:util';
const scrypt = promisify(scryptCallback);
const N = 16384, r = 8, p = 1, keylen = 64;
const options = {N, r, p, maxmem: 32 * 1024 * 1024};
export function createB2bPasswordHasher() {
  return {
    async hash(password) {
      if (typeof password !== 'string' || password.length < 12 || password.length > 1024)
        throw new TypeError('INVALID_PASSWORD');
      const salt = randomBytes(32);
      const key = await scrypt(password, salt, keylen, options);
      return ['scrypt', N, r, p, salt.toString('hex'), key.toString('hex')].join('$');
    },
    async verify(password, stored) {
      if (typeof password !== 'string' || typeof stored !== 'string') return false;
      const parts = stored.split('$');
      if (parts.length !== 6 || parts[0] !== 'scrypt' ||
          parts[1] !== String(N) || parts[2] !== String(r) || parts[3] !== String(p) ||
          !/^[a-f0-9]{64}$/.test(parts[4]) || !/^[a-f0-9]{128}$/.test(parts[5])) return false;
      if (password.length < 12 || password.length > 1024) return false;
      const candidate = await scrypt(password, Buffer.from(parts[4], 'hex'), keylen, options);
      return timingSafeEqual(candidate, Buffer.from(parts[5], 'hex'));
    }
  };
}
