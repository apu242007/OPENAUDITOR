'use strict';

const crypto = require('crypto');
const { promisify } = require('util');

const pbkdf2 = promisify(crypto.pbkdf2);
const COOKIE_NAME = 'oa_session';
const SESSION_MAX_AGE = 24 * 60 * 60 * 1000; // 24 hours
const CLEANUP_INTERVAL = 60 * 60 * 1000; // 1 hour

let db = null;
let cleanupTimer = null;

// Initialize session storage in database
function initSessions(database) {
  db = database;

  // Create sessions table
  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      created_at INTEGER NOT NULL,
      expires_at INTEGER NOT NULL,
      user_agent TEXT,
      ip_address TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);
  `);

  // Start cleanup timer
  if (cleanupTimer) clearInterval(cleanupTimer);
  cleanupTimer = setInterval(cleanupExpiredSessions, CLEANUP_INTERVAL);
}

function cleanupExpiredSessions() {
  if (!db) return;
  try {
    const result = db.prepare('DELETE FROM sessions WHERE expires_at < ?').run(Date.now());
    if (result.changes > 0) {
      console.log(`Cleaned up ${result.changes} expired sessions`);
    }
  } catch (err) {
    console.error('Error cleaning up sessions:', err);
  }
}

// Improved PIN hashing with PBKDF2
async function hashPin(pin, salt = null) {
  if (!salt) {
    salt = crypto.randomBytes(16).toString('hex');
  }

  const hash = await pbkdf2(
    String(pin || ''),
    salt,
    100000, // iterations
    64, // key length
    'sha512'
  );

  return {
    hash: hash.toString('hex'),
    salt: salt
  };
}

// Verify PIN with constant-time comparison
async function verifyPin(pin, storedHash, storedSalt) {
  const { hash } = await hashPin(pin, storedSalt);

  try {
    return crypto.timingSafeEqual(
      Buffer.from(hash, 'hex'),
      Buffer.from(storedHash, 'hex')
    );
  } catch (err) {
    return false;
  }
}

function parseCookies(req) {
  const raw = req.headers.cookie || '';
  return raw.split(';').reduce((acc, part) => {
    const idx = part.indexOf('=');
    if (idx === -1) return acc;
    const key = part.slice(0, idx).trim();
    const value = decodeURIComponent(part.slice(idx + 1).trim());
    if (key) acc[key] = value;
    return acc;
  }, {});
}

function createSession(userAgent = '', ipAddress = '') {
  if (!db) {
    console.error('Database not initialized for sessions');
    const token = crypto.randomBytes(32).toString('hex');
    return token;
  }

  const token = crypto.randomBytes(32).toString('hex');
  const now = Date.now();
  const expiresAt = now + SESSION_MAX_AGE;

  try {
    db.prepare(
      'INSERT INTO sessions (token, created_at, expires_at, user_agent, ip_address) VALUES (?, ?, ?, ?, ?)'
    ).run(token, now, expiresAt, userAgent || '', ipAddress || '');
  } catch (err) {
    console.error('Error creating session:', err);
  }

  return token;
}

function destroySession(token) {
  if (!token || !db) return;

  try {
    db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
  } catch (err) {
    console.error('Error destroying session:', err);
  }
}

function setSessionCookie(res, token, options = {}) {
  const maxAge = options.maxAge || SESSION_MAX_AGE / 1000; // Convert to seconds
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';

  res.setHeader(
    'Set-Cookie',
    `${COOKIE_NAME}=${token}; HttpOnly; Path=/; SameSite=Strict${secure}; Max-Age=${maxAge}`
  );
}

function clearSessionCookie(res) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.setHeader('Set-Cookie', `${COOKIE_NAME}=; HttpOnly; Path=/; Max-Age=0; SameSite=Strict${secure}`);
}

function isAuthenticated(req) {
  return true;
}

function isLocalRequest(req) {
  const host = (req.hostname || '').toLowerCase();
  const ip = (req.ip || '').replace('::ffff:', '');
  return host === 'localhost' || host === '127.0.0.1' || ip === '127.0.0.1' || ip === '::1';
}

function authGuard(getConfig) {
  return function(req, res, next) {
    return next();
  };
}

// Cleanup on process exit
process.on('SIGINT', () => {
  if (cleanupTimer) clearInterval(cleanupTimer);
});

process.on('SIGTERM', () => {
  if (cleanupTimer) clearInterval(cleanupTimer);
});

module.exports = {
  COOKIE_NAME,
  hashPin,
  verifyPin,
  createSession,
  destroySession,
  setSessionCookie,
  clearSessionCookie,
  isAuthenticated,
  authGuard,
  initSessions,
  cleanupExpiredSessions
};
