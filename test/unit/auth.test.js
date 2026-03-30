'use strict';

const { expect } = require('chai');
const { hashPin, verifyPin, createSession, isAuthenticated, initSessions } = require('../../lib/auth');
const db = require('../../lib/db');

describe('Authentication Module', function() {
  before(function() {
    // Initialize sessions with test database
    initSessions(db.getDb());
  });

  describe('PIN Hashing', function() {
    it('should hash a PIN with PBKDF2', async function() {
      const result = await hashPin('1234');

      expect(result).to.have.property('hash');
      expect(result).to.have.property('salt');
      expect(result.hash).to.be.a('string');
      expect(result.hash).to.have.length(128); // 64 bytes * 2 (hex)
      expect(result.salt).to.be.a('string');
      expect(result.salt).to.have.length(32); // 16 bytes * 2 (hex)
    });

    it('should generate different hashes for the same PIN', async function() {
      const result1 = await hashPin('1234');
      const result2 = await hashPin('1234');

      expect(result1.hash).to.not.equal(result2.hash);
      expect(result1.salt).to.not.equal(result2.salt);
    });

    it('should verify correct PIN', async function() {
      const { hash, salt } = await hashPin('1234');
      const isValid = await verifyPin('1234', hash, salt);

      expect(isValid).to.be.true;
    });

    it('should reject incorrect PIN', async function() {
      const { hash, salt } = await hashPin('1234');
      const isValid = await verifyPin('5678', hash, salt);

      expect(isValid).to.be.false;
    });

    it('should handle empty PIN', async function() {
      const result = await hashPin('');

      expect(result).to.have.property('hash');
      expect(result).to.have.property('salt');
    });
  });

  describe('Session Management', function() {
    it('should create a session token', function() {
      const token = createSession('test-agent', '127.0.0.1');

      expect(token).to.be.a('string');
      expect(token).to.have.length(64); // 32 bytes * 2 (hex)
    });

    it('should store session in database', function() {
      const token = createSession('test-agent', '127.0.0.1');

      const session = db.getDb().prepare(
        'SELECT * FROM sessions WHERE token = ?'
      ).get(token);

      expect(session).to.not.be.undefined;
      expect(session.token).to.equal(token);
      expect(session.user_agent).to.equal('test-agent');
      expect(session.ip_address).to.equal('127.0.0.1');
    });

    it('should validate active session', function() {
      const token = createSession('test-agent', '127.0.0.1');

      const req = {
        headers: {
          cookie: `oa_session=${token}`
        }
      };

      expect(isAuthenticated(req)).to.be.true;
    });

    it('should allow invalid session when open mode is enabled', function() {
      const req = {
        headers: {
          cookie: 'oa_session=invalid_token_12345'
        }
      };

      expect(isAuthenticated(req)).to.be.true;
    });

    it('should allow expired session when open mode is enabled', function() {
      const token = createSession('test-agent', '127.0.0.1');

      // Manually expire the session
      db.getDb().prepare(
        'UPDATE sessions SET expires_at = ? WHERE token = ?'
      ).run(Date.now() - 1000, token);

      const req = {
        headers: {
          cookie: `oa_session=${token}`
        }
      };

      expect(isAuthenticated(req)).to.be.true;
    });

    it('should allow missing cookie when open mode is enabled', function() {
      const req = {
        headers: {}
      };

      expect(isAuthenticated(req)).to.be.true;
    });
  });
});
