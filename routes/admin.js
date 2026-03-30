'use strict';

function hexToRgba(hex, alpha) {
  let r = 0;
  let g = 0;
  let b = 0;
  if (hex.length === 4) {
    r = parseInt(hex[1] + hex[1], 16);
    g = parseInt(hex[2] + hex[2], 16);
    b = parseInt(hex[3] + hex[3], 16);
  } else if (hex.length === 7) {
    r = parseInt(hex.substring(1, 3), 16);
    g = parseInt(hex.substring(3, 5), 16);
    b = parseInt(hex.substring(5, 7), 16);
  }
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function darkenColor(hex, amount) {
  let color = hex.replace('#', '');
  if (color.length === 3) color = color[0] + color[0] + color[1] + color[1] + color[2] + color[2];
  const num = parseInt(color, 16);
  let r = (num >> 16) - Math.round(255 * (amount / 100));
  let g = ((num >> 8) & 0x00FF) - Math.round(255 * (amount / 100));
  let b = (num & 0x0000FF) - Math.round(255 * (amount / 100));
  r = r < 0 ? 0 : r;
  g = g < 0 ? 0 : g;
  b = b < 0 ? 0 : b;
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

function registerAdminRoutes(deps) {
  const {
    app,
    fs,
    path,
    security,
    brandingUploadSingle,
    importUploadSingle,
    readJson,
    writeJson,
    sanitizeConfigPatch,
    sanitizeWebhookInput,
    sanitizeString,
    validateConfig,
    validateWebhook,
    hashPin,
    verifyPin,
    createSession,
    destroySession,
    setSessionCookie,
    clearSessionCookie,
    isAuthenticated,
    uuidv4,
    dispatchWebhook,
    importBackupArchive,
    createBackupArchive,
    migrateData,
    getLocalIP,
    dataDir,
    uploadsDir,
    BACKUPS_DIR,
    CONFIG_FILE,
    TEMPLATES_FILE,
    INSPECTIONS_FILE,
    LIBRARY_FILE,
    PORT,
    packageVersion
  } = deps;

  app.get('/api/config', (req, res) => {
    let cfg = readJson(CONFIG_FILE) || { dataPath: '' };
    cfg.security = { enabled: false, requireAuthForLan: false };
    res.json(cfg);
  });

  app.put('/api/config', security.validate(security.validateConfig), async (req, res) => {
    let cfg = readJson(CONFIG_FILE) || { dataPath: '' };
    const patch = sanitizeConfigPatch(req.body);
    if (patch.dataPath !== undefined) cfg.dataPath = patch.dataPath;
    if (patch.branding !== undefined) cfg.branding = { ...(cfg.branding || {}), ...patch.branding };
    if (patch.syncDestinations !== undefined) cfg.syncDestinations = patch.syncDestinations;
    cfg.security = { enabled: false, requireAuthForLan: false };
    const validation = validateConfig(cfg);
    if (!validation.ok) return res.status(400).json({ error: 'INVALID_CONFIG', details: validation.errors });
    writeJson(CONFIG_FILE, cfg);
    cfg.security = { enabled: false, requireAuthForLan: false };
    res.json(cfg);
  });

  app.get('/api/config/theme.css', (req, res) => {
    const config = readJson(CONFIG_FILE);
    const b = config.branding || {};
    const primary = b.primaryColor || '#4f46e5';
    const hover = b.primaryColorHover || darkenColor(primary, 10);
    const light = b.primaryColorLight || hexToRgba(primary, 0.08);

    const css = `
:root {
  --accent: ${primary};
  --accent-hover: ${hover};
  --accent-light: ${light};
  --accent-border: ${hexToRgba(primary, 0.3)};
  --app-name: "${b.appName || 'Auditor Libre'}";
}
    `.trim();

    res.setHeader('Content-Type', 'text/css');
    res.setHeader('Cache-Control', 'no-cache');
    res.send(css);
  });

  app.get('/api/config/logo', (req, res) => {
    const config = readJson(CONFIG_FILE);
    if (config.branding && config.branding.logoPath) {
      res.sendFile(path.join(dataDir, config.branding.logoPath));
    } else {
      res.sendFile(path.join(__dirname, '../public/logo.svg'));
    }
  });

  app.get('/api/config/favicon', (req, res) => {
    const config = readJson(CONFIG_FILE);
    if (config.branding && config.branding.faviconPath) {
      res.sendFile(path.join(dataDir, config.branding.faviconPath));
    } else {
      res.sendFile(path.join(__dirname, '../public/favicon.svg'));
    }
  });

  app.get('/api/config/pdf-logo', (req, res) => {
    const config = readJson(CONFIG_FILE);
    const pdfLogoPath = config.branding && (config.branding.pdfLogoPath || config.branding.logoPath);
    if (pdfLogoPath) {
      res.sendFile(path.join(dataDir, pdfLogoPath));
    } else {
      res.sendFile(path.join(__dirname, '../public/logo.svg'));
    }
  });

  app.post('/api/config/logo', brandingUploadSingle('logo'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file' });
    const config = readJson(CONFIG_FILE);
    if (!config.branding) config.branding = {};
    config.branding.logoPath = 'uploads/' + req.file.filename;
    writeJson(CONFIG_FILE, config);
    res.json({ path: config.branding.logoPath });
  });

  app.post('/api/config/favicon', brandingUploadSingle('favicon'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file' });
    const config = readJson(CONFIG_FILE);
    if (!config.branding) config.branding = {};
    config.branding.faviconPath = 'uploads/' + req.file.filename;
    writeJson(CONFIG_FILE, config);
    res.json({ path: config.branding.faviconPath });
  });

  app.post('/api/config/pdf-logo', brandingUploadSingle('pdfLogo'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file' });
    const config = readJson(CONFIG_FILE);
    if (!config.branding) config.branding = {};
    config.branding.pdfLogoPath = 'uploads/' + req.file.filename;
    writeJson(CONFIG_FILE, config);
    res.json({ path: config.branding.pdfLogoPath });
  });

  app.get('/api/auth/status', (req, res) => {
    res.json({
      securityRequired: false,
      authenticated: true,
      mode: 'open'
    });
  });

  app.post('/api/auth/login', async (req, res) => {
    clearSessionCookie(res);
    res.json({ ok: true, bypassed: true, mode: 'open' });
  });

  app.post('/api/auth/logout', (req, res) => {
    clearSessionCookie(res);
    res.json({ ok: true, bypassed: true, mode: 'open' });
  });

  app.get('/api/system/diagnostics', (req, res) => {
    const config = readJson(CONFIG_FILE);
    const templates = readJson(TEMPLATES_FILE);
    const inspections = readJson(INSPECTIONS_FILE);
    const backups = fs.existsSync(BACKUPS_DIR) ? fs.readdirSync(BACKUPS_DIR).length : 0;
    res.json({
      version: packageVersion,
      node: process.version,
      platform: process.platform,
      localIP: getLocalIP(),
      appUrl: 'http://' + getLocalIP() + ':' + PORT,
      dataDir,
      uploadsDir,
      templates: templates.length,
      inspections: inspections.length,
      backups,
      securityEnabled: false,
      accessMode: 'open'
    });
  });

  app.get('/api/system/backup/export', (req, res) => {
    const db = require('../lib/db');
    const filename = 'auditorlibre-backup-' + new Date().toISOString().slice(0, 10) + '.zip';
    const outputPath = path.join(BACKUPS_DIR, filename);
    const tmpDir = path.join(BACKUPS_DIR, '.tmp-export-' + Date.now());
    try {
      fs.mkdirSync(tmpDir, { recursive: true });
      const tmpConfig = path.join(tmpDir, 'config.json');
      const tmpTemplates = path.join(tmpDir, 'templates.json');
      const tmpInspections = path.join(tmpDir, 'inspections.json');
      const tmpLibrary = path.join(tmpDir, 'library.json');
      fs.writeFileSync(tmpConfig, JSON.stringify(db.getConfig({}), null, 2), 'utf8');
      fs.writeFileSync(tmpTemplates, JSON.stringify(db.getAllTemplates(), null, 2), 'utf8');
      fs.writeFileSync(tmpInspections, JSON.stringify(db.getAllInspections(), null, 2), 'utf8');
      fs.writeFileSync(tmpLibrary, JSON.stringify(db.getLibrary(), null, 2), 'utf8');
      createBackupArchive({
        'config.json': tmpConfig,
        'templates.json': tmpTemplates,
        'inspections.json': tmpInspections,
        'library.json': tmpLibrary
      }, outputPath);
    } finally {
      try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch (e) {}
    }
    res.download(outputPath, filename);
  });

  app.post('/api/system/backup/import', importUploadSingle('backup'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file' });
    const db = require('../lib/db');
    try {
      importBackupArchive(req.file.path, dataDir);
      fs.unlinkSync(req.file.path);

      // Re-import extracted JSON files into SQLite immediately
      const cfgPath = path.join(dataDir, 'config.json');
      const tplPath = path.join(dataDir, 'templates.json');
      const insPath = path.join(dataDir, 'inspections.json');
      const libPath = path.join(dataDir, 'library.json');

      if (fs.existsSync(cfgPath)) {
        try { db.saveConfig(JSON.parse(fs.readFileSync(cfgPath, 'utf8'))); fs.unlinkSync(cfgPath); } catch (e) {}
      }
      if (fs.existsSync(tplPath)) {
        try { const ts = JSON.parse(fs.readFileSync(tplPath, 'utf8')); if (Array.isArray(ts)) ts.forEach(t => db.saveTemplate(t.id, t)); fs.unlinkSync(tplPath); } catch (e) {}
      }
      if (fs.existsSync(insPath)) {
        try { const is = JSON.parse(fs.readFileSync(insPath, 'utf8')); if (Array.isArray(is)) is.forEach(i => db.saveInspection(i.id, i.templateId, i)); fs.unlinkSync(insPath); } catch (e) {}
      }
      if (fs.existsSync(libPath)) {
        try { const ls = JSON.parse(fs.readFileSync(libPath, 'utf8')); if (Array.isArray(ls)) ls.forEach(q => db.saveLibraryItem(q.id, q)); fs.unlinkSync(libPath); } catch (e) {}
      }

      migrateData();
      res.json({ ok: true });
    } catch (err) {
      try { fs.unlinkSync(req.file.path); } catch (e) {}
      res.status(400).json({ error: 'IMPORT_BACKUP_FAILED', message: err.message });
    }
  });

  app.get('/api/webhooks', (req, res) => {
    const config = readJson(CONFIG_FILE);
    res.json(config.webhooks || []);
  });

  app.post('/api/webhooks', security.validate(security.validateWebhook), (req, res) => {
    const config = readJson(CONFIG_FILE);
    if (!config.webhooks) config.webhooks = [];
    const payload = sanitizeWebhookInput(req.body);
    const hook = { id: uuidv4(), ...payload, lastTriggeredAt: null, lastStatus: null };
    const validation = validateWebhook(hook);
    if (!validation.ok) return res.status(400).json({ error: 'INVALID_WEBHOOK', details: validation.errors });
    config.webhooks.push(hook);
    writeJson(CONFIG_FILE, config);
    res.json(hook);
  });

  app.put('/api/webhooks/:id', security.validate(security.validateWebhook), (req, res) => {
    const config = readJson(CONFIG_FILE);
    const idx = (config.webhooks || []).findIndex((h) => h.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Not found' });
    const payload = sanitizeWebhookInput(req.body);
    config.webhooks[idx] = { ...config.webhooks[idx], ...payload, id: config.webhooks[idx].id };
    const validation = validateWebhook(config.webhooks[idx]);
    if (!validation.ok) return res.status(400).json({ error: 'INVALID_WEBHOOK', details: validation.errors });
    writeJson(CONFIG_FILE, config);
    res.json(config.webhooks[idx]);
  });

  app.delete('/api/webhooks/:id', (req, res) => {
    const config = readJson(CONFIG_FILE);
    config.webhooks = (config.webhooks || []).filter((h) => h.id !== req.params.id);
    writeJson(CONFIG_FILE, config);
    res.json({ ok: true });
  });

  app.post('/api/webhooks/:id/test', async (req, res) => {
    await dispatchWebhook('inspection.completed', {
      inspection: { id: 'test-' + Date.now(), code: 'TEST-001', templateName: 'Plantilla de prueba', score: 85, completedAt: new Date().toISOString() },
      _test: true
    });
    res.json({ message: 'Webhook de prueba enviado' });
  });
}

module.exports = {
  registerAdminRoutes
};
