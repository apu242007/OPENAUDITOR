'use strict';

const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
}

function readJson(filePath, fallback) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (err) {
    return fallback;
  }
}

function backupFile(filePath, options) {
  const opts = options || {};
  const backupDir = opts.backupDir || path.join(path.dirname(filePath), 'backups');
  const keep = opts.keep || 10;
  if (!fs.existsSync(filePath)) return null;

  ensureDir(backupDir);
  const stamp = new Date().toISOString().replace(/[:.]/g, '-') + '-' + Math.random().toString(36).slice(2, 8);
  const backupName = path.basename(filePath) + '.' + stamp + '.bak';
  const backupPath = path.join(backupDir, backupName);
  fs.copyFileSync(filePath, backupPath);

  const backups = fs.readdirSync(backupDir)
    .filter(name => name.startsWith(path.basename(filePath) + '.'))
    .map(name => path.join(backupDir, name))
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);

  backups.slice(keep).forEach(oldPath => {
    try { fs.unlinkSync(oldPath); } catch (err) {}
  });

  return backupPath;
}

function writeJsonAtomic(filePath, data, options) {
  const opts = options || {};
  const dirPath = path.dirname(filePath);
  ensureDir(dirPath);

  if (opts.backup !== false && fs.existsSync(filePath)) {
    backupFile(filePath, { backupDir: opts.backupDir, keep: opts.keepBackups });
  }

  const rnd = Math.random().toString(36).slice(2, 10);
  const tempPath = path.join(dirPath, path.basename(filePath) + '.' + rnd + '.tmp');
  fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf8');
  fs.renameSync(tempPath, filePath);
}

function createBackupArchive(paths, outputPath) {
  const zip = new AdmZip();
  Object.keys(paths).forEach(name => {
    const filePath = paths[name];
    if (filePath && fs.existsSync(filePath)) zip.addLocalFile(filePath, '', name);
  });
  zip.writeZip(outputPath);
  return outputPath;
}

function importBackupArchive(archivePath, targetDir) {
  ensureDir(targetDir);
  const zip = new AdmZip(archivePath);
  zip.extractAllTo(targetDir, true);
}

module.exports = {
  ensureDir,
  readJson,
  backupFile,
  writeJsonAtomic,
  createBackupArchive,
  importBackupArchive
};
