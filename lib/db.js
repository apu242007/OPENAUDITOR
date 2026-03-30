'use strict';

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

let db = null;

/**
 * Run schema migrations to update existing database structure
 * This allows backward compatibility with older database versions
 */
function runSchemaMigrations() {
  if (!db) return;

  try {
    // Check if templates table exists and needs migration
    const tablesResult = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='templates'").get();

    if (tablesResult) {
      // Get current columns in templates table
      const columnsResult = db.prepare('PRAGMA table_info(templates)').all();
      const columnNames = columnsResult.map(col => col.name);

      // Add status column if it doesn't exist
      if (!columnNames.includes('status')) {
        console.log('Migrating templates table: adding status column');
        db.exec('ALTER TABLE templates ADD COLUMN status TEXT DEFAULT "draft"');
      }
    }

    // Check if inspections table needs migration
    const inspectionsResult = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='inspections'").get();

    if (inspectionsResult) {
      const columnsResult = db.prepare('PRAGMA table_info(inspections)').all();
      const columnNames = columnsResult.map(col => col.name);

      // Add created_at if missing
      if (!columnNames.includes('created_at')) {
        console.log('Migrating inspections table: adding created_at column');
        db.exec('ALTER TABLE inspections ADD COLUMN created_at TEXT');
        // Update existing rows with a default value
        db.exec("UPDATE inspections SET created_at = updated_at WHERE created_at IS NULL");
      }

      // Add completed_at if missing
      if (!columnNames.includes('completed_at')) {
        console.log('Migrating inspections table: adding completed_at column');
        db.exec('ALTER TABLE inspections ADD COLUMN completed_at TEXT');
      }

      // Make sure template_id and status exist
      if (!columnNames.includes('template_id')) {
        console.log('Migrating inspections table: adding template_id column');
        db.exec('ALTER TABLE inspections ADD COLUMN template_id TEXT');
      }

      if (!columnNames.includes('status')) {
        console.log('Migrating inspections table: adding status column');
        db.exec('ALTER TABLE inspections ADD COLUMN status TEXT DEFAULT "in_progress"');
      }
    }
  } catch (err) {
    console.error('Error running schema migrations:', err.message);
    // Don't throw - let the app continue with table creation
  }
}

function initDb(dataDir) {
  const dbPath = path.join(dataDir, 'auditorlibre.db');
  db = new Database(dbPath);

  // Pragmas for performance and safety
  db.pragma('journal_mode = WAL');
  db.pragma('synchronous = NORMAL');

  // Run schema migrations before creating tables
  runSchemaMigrations();

  // Create tables with performance indexes
  db.exec(`
    CREATE TABLE IF NOT EXISTS config (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      data TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS templates (
      id TEXT PRIMARY KEY,
      data TEXT NOT NULL,
      status TEXT,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_templates_status ON templates(status);
    CREATE INDEX IF NOT EXISTS idx_templates_updated ON templates(updated_at DESC);

    CREATE TABLE IF NOT EXISTS inspections (
      id TEXT PRIMARY KEY,
      template_id TEXT NOT NULL,
      data TEXT NOT NULL,
      status TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      completed_at TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_inspections_template ON inspections(template_id);
    CREATE INDEX IF NOT EXISTS idx_inspections_status ON inspections(status);
    CREATE INDEX IF NOT EXISTS idx_inspections_updated ON inspections(updated_at DESC);
    CREATE INDEX IF NOT EXISTS idx_inspections_completed ON inspections(completed_at DESC) WHERE completed_at IS NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_inspections_template_status ON inspections(template_id, status);

    CREATE TABLE IF NOT EXISTS library (
      id TEXT PRIMARY KEY,
      data TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tokens (
      token TEXT PRIMARY KEY,
      data TEXT NOT NULL,
      expires_at TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_tokens_expires ON tokens(expires_at);

    CREATE TABLE IF NOT EXISTS actions (
      id TEXT PRIMARY KEY,
      inspection_id TEXT NOT NULL,
      question_id TEXT NOT NULL,
      question_text TEXT,
      description TEXT,
      status TEXT DEFAULT 'open',
      assigned_to TEXT,
      deadline TEXT,
      flagged INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (inspection_id) REFERENCES inspections(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_actions_status ON actions(status);
    CREATE INDEX IF NOT EXISTS idx_actions_assigned ON actions(assigned_to);
    CREATE INDEX IF NOT EXISTS idx_actions_inspection ON actions(inspection_id);
    CREATE INDEX IF NOT EXISTS idx_actions_deadline ON actions(deadline) WHERE deadline IS NOT NULL;
  `);
  
  return db;
}

function getDb() {
  if (!db) throw new Error('Database not initialized');
  return db;
}

// Transactional Helpers
const saveConfig = (data) => {
  const stmt = getDb().prepare('INSERT OR REPLACE INTO config (id, data) VALUES (1, ?)');
  return stmt.run(JSON.stringify(data));
};

const getConfig = (fallback) => {
  const row = getDb().prepare('SELECT data FROM config WHERE id = 1').get();
  return row ? JSON.parse(row.data) : fallback;
};

const saveTemplate = (id, data) => {
  const stmt = getDb().prepare('INSERT OR REPLACE INTO templates (id, data, status, updated_at) VALUES (?, ?, ?, ?)');
  return stmt.run(
    id,
    JSON.stringify(data),
    data.status || 'draft',
    data.updatedAt || new Date().toISOString()
  );
};

const getAllTemplates = () => {
  return getDb().prepare('SELECT data FROM templates ORDER BY updated_at DESC').all().map(r => JSON.parse(r.data));
};

const deleteTemplate = (id) => {
  return getDb().prepare('DELETE FROM templates WHERE id = ?').run(id);
};

const saveInspection = (id, templateId, data) => {
  const stmt = getDb().prepare(
    'INSERT OR REPLACE INTO inspections (id, template_id, data, status, created_at, updated_at, completed_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
  );
  return stmt.run(
    id,
    templateId,
    JSON.stringify(data),
    data.status || 'in_progress',
    data.createdAt || data.startedAt || new Date().toISOString(),
    data.updatedAt || new Date().toISOString(),
    data.status === 'completed' ? (data.completedAt || new Date().toISOString()) : null
  );
};

const getAllInspections = () => {
  return getDb().prepare('SELECT data FROM inspections ORDER BY updated_at DESC').all().map(r => JSON.parse(r.data));
};

const getInspection = (id) => {
  const row = getDb().prepare('SELECT data FROM inspections WHERE id = ?').get(id);
  return row ? JSON.parse(row.data) : null;
};

const deleteInspection = (id) => {
  return getDb().prepare('DELETE FROM inspections WHERE id = ?').run(id);
};

const saveLibraryItem = (id, data) => {
  const stmt = getDb().prepare('INSERT OR REPLACE INTO library (id, data) VALUES (?, ?)');
  return stmt.run(id, JSON.stringify(data));
};

const getLibrary = () => {
  return getDb().prepare('SELECT data FROM library').all().map(r => JSON.parse(r.data));
};

const deleteLibraryItem = (id) => {
  return getDb().prepare('DELETE FROM library WHERE id = ?').run(id);
};

// Actions management
const saveAction = (id, inspectionId, questionId, data) => {
  const now = new Date().toISOString();
  const stmt = getDb().prepare(`
    INSERT OR REPLACE INTO actions
    (id, inspection_id, question_id, question_text, description, status, assigned_to, deadline, flagged, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  return stmt.run(
    id,
    inspectionId,
    questionId,
    data.questionText || '',
    data.description || '',
    data.status || 'open',
    data.assignedTo || '',
    data.deadline || null,
    data.flagged ? 1 : 0,
    data.createdAt || now,
    now
  );
};

const getAllActions = (filters = {}) => {
  let query = 'SELECT * FROM actions WHERE 1=1';
  const params = [];

  if (filters.status) {
    query += ' AND status = ?';
    params.push(filters.status);
  }

  if (filters.inspectionId) {
    query += ' AND inspection_id = ?';
    params.push(filters.inspectionId);
  }

  if (filters.assignedTo) {
    query += ' AND assigned_to = ?';
    params.push(filters.assignedTo);
  }

  query += ' ORDER BY created_at DESC LIMIT 1000';

  return getDb().prepare(query).all(...params).map(row => ({
    ...row,
    flagged: !!row.flagged
  }));
};

const getActionsByInspection = (inspectionId) => {
  return getDb().prepare('SELECT * FROM actions WHERE inspection_id = ?').all(inspectionId).map(row => ({
    ...row,
    flagged: !!row.flagged
  }));
};

const updateAction = (id, data) => {
  const stmt = getDb().prepare(`
    UPDATE actions
    SET description = COALESCE(?, description),
        status = COALESCE(?, status),
        assigned_to = COALESCE(?, assigned_to),
        deadline = COALESCE(?, deadline),
        updated_at = ?
    WHERE id = ?
  `);

  return stmt.run(
    data.description,
    data.status,
    data.assignedTo,
    data.deadline,
    new Date().toISOString(),
    id
  );
};

const deleteAction = (id) => {
  return getDb().prepare('DELETE FROM actions WHERE id = ?').run(id);
};

const deleteActionsByInspection = (inspectionId) => {
  return getDb().prepare('DELETE FROM actions WHERE inspection_id = ?').run(inspectionId);
};

module.exports = {
  initDb,
  getDb,
  saveConfig,
  getConfig,
  saveTemplate,
  getAllTemplates,
  deleteTemplate,
  saveInspection,
  getAllInspections,
  getInspection,
  deleteInspection,
  saveLibraryItem,
  getLibrary,
  deleteLibraryItem,
  saveAction,
  getAllActions,
  getActionsByInspection,
  updateAction,
  deleteAction,
  deleteActionsByInspection
};
