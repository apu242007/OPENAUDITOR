'use strict';

const path = require('path');
const os = require('os');
const fs = require('fs');

// Set test environment
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error'; // Reduce log noise during tests

// Create temporary test data directory
const testDataDir = path.join(os.tmpdir(), 'auditor-libre-test-' + Date.now());
process.env.DATA_DIR = testDataDir;

console.log('Test data directory:', testDataDir);

// Global setup
before(function() {
  // Create test data directory
  if (!fs.existsSync(testDataDir)) {
    fs.mkdirSync(testDataDir, { recursive: true });
  }

  // Initialize database for tests
  const db = require('../lib/db');
  db.initDb(testDataDir);
  console.log('Test database initialized');
});

// Global teardown
after(function() {
  // Close database
  try {
    const db = require('../lib/db');
    const dbInstance = db.getDb();
    if (dbInstance) {
      dbInstance.close();
      console.log('Test database closed');
    }
  } catch (err) {
    console.error('Error closing database:', err.message);
  }

  // Clean up test directory
  try {
    if (fs.existsSync(testDataDir)) {
      fs.rmSync(testDataDir, { recursive: true, force: true });
      console.log('Test data directory cleaned up');
    }
  } catch (err) {
    console.error('Error cleaning up test directory:', err.message);
  }
});

// Helper to create fresh database before each test
beforeEach(function() {
  const db = require('../lib/db');

  // Clear all tables
  try {
    db.getDb().exec('DELETE FROM sessions');
    db.getDb().exec('DELETE FROM actions');
    db.getDb().exec('DELETE FROM inspections');
    db.getDb().exec('DELETE FROM templates');
    db.getDb().exec('DELETE FROM library');
    db.getDb().exec('DELETE FROM config WHERE id = 1');
  } catch (err) {
    // Tables might not exist yet, ignore
  }
});

module.exports = {
  testDataDir
};
