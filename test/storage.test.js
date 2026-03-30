'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { readJson, writeJsonAtomic, createBackupArchive, importBackupArchive } = require('../lib/storage');

test('writeJsonAtomic escribe y respalda archivos', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'oa-storage-'));
  const file = path.join(dir, 'data.json');

  writeJsonAtomic(file, { a: 1 }, { backupDir: path.join(dir, 'backups'), keepBackups: 5, backup: false });
  writeJsonAtomic(file, { a: 2 }, { backupDir: path.join(dir, 'backups'), keepBackups: 5 });

  const data = readJson(file, {});
  assert.equal(data.a, 2);
  assert.equal(fs.readdirSync(path.join(dir, 'backups')).length > 0, true);
});

test('backup zip export/import funciona', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'oa-backup-'));
  const source = path.join(dir, 'config.json');
  const archive = path.join(dir, 'backup.zip');
  const restoreDir = path.join(dir, 'restore');

  fs.writeFileSync(source, JSON.stringify({ ok: true }), 'utf8');
  createBackupArchive({ 'config.json': source }, archive);
  importBackupArchive(archive, restoreDir);

  const restored = JSON.parse(fs.readFileSync(path.join(restoreDir, 'config.json'), 'utf8'));
  assert.equal(restored.ok, true);
});
