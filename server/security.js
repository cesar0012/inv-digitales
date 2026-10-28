/**
 * ============================================================================
 * SECURITY HELPERS — shared by the Express server
 * ============================================================================
 * Small, dependency-free helpers for the hardening pass:
 *  - safe file names and paths (blocks ../ path traversal)
 *  - password hashing with scrypt + salt (and upgrade of legacy SHA-256)
 *  - random tokens and constant-time comparison
 *  - an in-memory rate limiter for login-style endpoints
 *  - masking of personal data in logs
 */

import { randomBytes, scryptSync, timingSafeEqual, createHash } from 'crypto';
import { resolve, sep } from 'path';

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------

/** A plain file name: letters, digits, dot, dash, underscore. No slashes, no "..". */
export const isSafeFilename = (name) =>
  typeof name === 'string' &&
  name.length > 0 &&
  name.length <= 200 &&
  /^[A-Za-z0-9._-]+$/.test(name) &&
  !name.startsWith('.') &&
  !name.includes('..');

/** User ids are numeric (Laravel) or simple slugs (local users). */
export const isSafeId = (id) =>
  (typeof id === 'string' || typeof id === 'number') && /^[A-Za-z0-9_-]{1,64}$/.test(String(id));

/** Folder names under /img include accented letters and spaces (e.g. "xv-años"). */
export const isSafeFolderName = (name) =>
  typeof name === 'string' &&
  name.length > 0 &&
  name.length <= 100 &&
  /^[\p{L}\p{N} _-]+$/u.test(name);

/**
 * Join path parts onto a base directory and refuse anything that escapes it.
 * Returns the absolute path, or null when the result would leave `base`.
 */
export const resolveInside = (base, ...parts) => {
  const root = resolve(base);
  const full = resolve(root, ...parts.map(String));
  if (full !== root && !full.startsWith(root + sep)) return null;
  return full;
};

// ---------------------------------------------------------------------------
// Passwords
// ---------------------------------------------------------------------------

const SCRYPT_N = 16384;
const SCRYPT_KEYLEN = 64;

/** Hash a password as "scrypt$N$saltHex$hashHex". */
export const hashPassword = (password) => {
  const salt = randomBytes(16);
  const hash = scryptSync(String(password), salt, SCRYPT_KEYLEN, { N: SCRYPT_N });
  return `scrypt$${SCRYPT_N}$${salt.toString('hex')}$${hash.toString('hex')}`;
};

const LEGACY_SHA256 = /^[a-f0-9]{64}$/i;

/**
 * Check a password against a stored hash.
 * Accepts the new scrypt format and the legacy unsalted SHA-256 hex digests,
 * so existing accounts keep working. `needsUpgrade` tells the caller to
 * re-hash the password with hashPassword() after a successful legacy login.
 */
export const verifyPassword = (password, stored) => {
  if (typeof stored !== 'string' || !stored || stored.startsWith('!')) {
    return { ok: false, needsUpgrade: false };
  }
  if (stored.startsWith('scrypt$')) {
    const [, n, saltHex, hashHex] = stored.split('$');
    const expected = Buffer.from(hashHex || '', 'hex');
    if (!expected.length) return { ok: false, needsUpgrade: false };
    const actual = scryptSync(String(password), Buffer.from(saltHex, 'hex'), expected.length, {
      N: parseInt(n, 10) || SCRYPT_N
    });
    return { ok: timingSafeEqual(actual, expected), needsUpgrade: false };
  }
  if (LEGACY_SHA256.test(stored)) {
    const actual = createHash('sha256').update(String(password)).digest('hex');
    return { ok: safeEqual(actual, stored.toLowerCase()), needsUpgrade: true };
  }
  return { ok: false, needsUpgrade: false };
};

/** SHA-256 hex digests of passwords that were shipped as defaults in the source code. */
export const KNOWN_WEAK_PASSWORD_HASHES = new Set(
  ['admin123', 'Jar123456', 'invD2026!'].map((p) => createHash('sha256').update(p).digest('hex'))
);

// ---------------------------------------------------------------------------
// Tokens
// ---------------------------------------------------------------------------

export const randomToken = (bytes = 32) => randomBytes(bytes).toString('hex');

/** Constant-time string comparison that also works for different lengths. */
export const safeEqual = (a, b) => {
  const ha = createHash('sha256').update(String(a ?? '')).digest();
  const hb = createHash('sha256').update(String(b ?? '')).digest();
  return timingSafeEqual(ha, hb) && String(a ?? '').length === String(b ?? '').length;
};

// ---------------------------------------------------------------------------
// Rate limiting (in memory, per process)
// ---------------------------------------------------------------------------

/**
 * Express middleware: at most `max` requests per `windowMs` per client IP and
 * route key. Good enough for a single server process; use a shared store
 * (Redis) if the generator is ever scaled to several instances.
 */
export const rateLimit = ({ windowMs = 15 * 60 * 1000, max = 10, key = 'default' } = {}) => {
  const hits = new Map();
  return (req, res, next) => {
    const now = Date.now();
    const ip = req.ip || req.socket?.remoteAddress || 'unknown';
    const id = `${key}:${ip}`;
    const entry = hits.get(id);
    if (!entry || entry.reset <= now) {
      hits.set(id, { count: 1, reset: now + windowMs });
    } else {
      entry.count += 1;
      if (entry.count > max) {
        res.setHeader('Retry-After', Math.ceil((entry.reset - now) / 1000));
        return res.status(429).json({ error: 'Demasiados intentos. Intenta de nuevo más tarde.' });
      }
    }
    if (hits.size > 10000) {
      for (const [k, v] of hits) if (v.reset <= now) hits.delete(k);
    }
    next();
  };
};

// ---------------------------------------------------------------------------
// Log masking
// ---------------------------------------------------------------------------

export const maskEmail = (email) => {
  if (!email || typeof email !== 'string' || !email.includes('@')) return '(sin email)';
  const [user, domain] = email.split('@');
  return `${user.slice(0, 1)}***@${domain}`;
};
