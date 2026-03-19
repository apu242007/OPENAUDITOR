const express = require('express');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const puppeteer = require('puppeteer');
const buildPdfHtml = require('./pdf_report');
const archiver = require('archiver');
const AdmZip = require('adm-zip');

let dataDir;
let TEMPLATES_FILE;
let INSPECTIONS_FILE;
let CONFIG_FILE;
let uploadsDir;
const app = express();
const PORT = 3001;

// Resolve data paths dynamically for ESM module
(async () => {
  const envPaths = (await import('env-paths')).default;
  const paths = envPaths('open-auditor');
  dataDir = paths.data;

  // Load config if exists
  const initialConfigPath = path.join(dataDir, 'config.json');
  let appConfig = { dataPath: '' };

  try {
    if (fs.existsSync(initialConfigPath)) {
      const rawConfig = JSON.parse(fs.readFileSync(initialConfigPath, 'utf8'));
      if (rawConfig.dataPath) {
        dataDir = rawConfig.dataPath;
        appConfig.dataPath = rawConfig.dataPath;
      }
    }
  } catch (e) {
    console.error('Error reading initial config', e);
  }

  // Create directories
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  uploadsDir = path.join(dataDir, 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  // Data files
  TEMPLATES_FILE = path.join(dataDir, 'templates.json');
  INSPECTIONS_FILE = path.join(dataDir, 'inspections.json');
  CONFIG_FILE = path.join(dataDir, 'config.json');

  // Initialize data files
  if (!fs.existsSync(TEMPLATES_FILE)) fs.writeFileSync(TEMPLATES_FILE, '[]', 'utf8');
  if (!fs.existsSync(INSPECTIONS_FILE)) fs.writeFileSync(INSPECTIONS_FILE, '[]', 'utf8');
  if (!fs.existsSync(CONFIG_FILE)) fs.writeFileSync(CONFIG_FILE, JSON.stringify(appConfig, null, 2), 'utf8');

  migrateData();

  // Feature 8: OS notification on startup
  try {
    var notifier = require('node-notifier');
    notifier.notify({ title: 'OPEN AUDITOR', message: 'Servidor iniciado en http://localhost:3001', timeout: 5 });
  } catch(e) {}

  // Feature 12: updated banner
  console.log('');
  console.log('╔══════════════════════════════════════╗');
  console.log('║        OPEN AUDITOR  v2.0            ║');
  console.log('╚══════════════════════════════════════╝');
  console.log('  URL:  http://localhost:3001');
  console.log('  Data: ' + dataDir);
  console.log('');

  app.listen(PORT, () => {});
})();

app.use(express.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'public')));
// Serve uploads statically
app.use('/uploads', (req, res, next) => express.static(uploadsDir)(req, res, next));

// Eliminar inspección por ID
app.delete('/api/inspections/:id', (req, res) => {
  try {
    let ins = readJson(INSPECTIONS_FILE);
    const idx = ins.findIndex(x => x.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Not found' });
    ins.splice(idx, 1);
    writeJson(INSPECTIONS_FILE, ins);
    res.json({ ok: true });
  } catch (err) {
    console.error('Error eliminando inspección:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Multer setup
const storage = multer.diskStorage({
  destination: function (req, file, cb) { cb(null, uploadsDir); },
  filename: function (req, file, cb) { cb(null, Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname)); }
});
const upload = multer({ storage: storage });

// Webhook helper
async function dispatchWebhook(event, payload) {
  const config = readJson(CONFIG_FILE);
  const hooks = (config.webhooks || []).filter(h => h.enabled && h.events.includes(event));
  
  for (const hook of hooks) {
    const body = JSON.stringify({
      event,
      timestamp: new Date().toISOString(),
      source: 'open-auditor',
      payload
    });

    const headers = {
      'Content-Type': 'application/json',
      ...(hook.headers || {})
    };

    if (hook.secret) {
      const crypto = require('crypto');
      const sig = crypto.createHmac('sha256', hook.secret).update(body).digest('hex');
      headers['X-OA-Signature'] = `sha256=${sig}`;
    }

    try {
      const res = await fetch(hook.url, { method: 'POST', headers, body, signal: AbortSignal.timeout(5000) });
      updateWebhookStatus(hook.id, res.status, res.ok);
    } catch (err) {
      updateWebhookStatus(hook.id, null, false, err.message);
      if (hook.retryOnFailure) {
        setTimeout(() => dispatchWebhook(event, payload), 30000);
      }
    }
  }
}

function updateWebhookStatus(hookId, status, ok, error) {
  const config = readJson(CONFIG_FILE);
  const hook = config.webhooks?.find(h => h.id === hookId);
  if (hook) {
    hook.lastTriggeredAt = new Date().toISOString();
    hook.lastStatus = ok ? 'success' : `error${status ? ` (${status})` : ''}`;
    if (error) hook.lastError = error;
    writeJson(CONFIG_FILE, config);
  }
}

// Helper functions
function readJson(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return []; }
}
function writeJson(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
}
function now() { return new Date().toISOString(); }
function uuid() { return uuidv4(); }

function defaultTemplate(name) {
  const t = now();
  return {
    id: uuid(), name: name || 'Nueva Plantilla', description: '',
    status: 'draft', publishedAt: null, publishedVersions: [], tags: [], schedule: null,
    createdAt: t, updatedAt: t, lockedBy: null, lockedAt: null,
    severityLevels: [
      { id: uuid(), key: 'critical', label: 'Crítico', color: '#dc2626', icon: '🔴', order: 1 },
      { id: uuid(), key: 'major', label: 'Mayor', color: '#d97706', icon: '🟡', order: 2 },
      { id: uuid(), key: 'minor', label: 'Menor', color: '#2563eb', icon: '🔵', order: 3 },
      { id: uuid(), key: 'observation', label: 'Observación', color: '#16a34a', icon: '🟢', order: 4 }
    ],
    settings: { defaultNotes: true, defaultMedia: true, defaultActions: true, defaultRequired: false },
    report: { pageSize: 'A4', showCover: true, showTOC: true, showScore: true, showFlaggedItems: true },
    questionLibrary: [],
    pages: [{
      id: uuid(), name: 'Portada', type: 'cover',
      sections: [{
        id: uuid(), title: '', repeatable: false, minInstances: 1, maxInstances: null, addButtonLabel: "",
        questions: [
          { id: uuid(), text: 'Sitio donde se ha realizado', responseType: 'site', required: true, allowNote: true, allowMedia: true, allowAction: true, score: null, conditionalLogic: null },
          { id: uuid(), text: 'Realizada el', responseType: 'date', required: false, allowNote: true, allowMedia: true, allowAction: true, score: null, conditionalLogic: null },
          { id: uuid(), text: 'Preparada por', responseType: 'person', required: false, allowNote: true, allowMedia: true, allowAction: true, score: null, conditionalLogic: null },
          { id: uuid(), text: 'Ubicación', responseType: 'location', required: false, allowNote: true, allowMedia: true, allowAction: true, score: null, conditionalLogic: null }
        ]
      }]
    }]
  };
}

function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function deepCloneWithNewIds(template) {
  return regenerateIds(deepClone(template));
}

function regenerateIds(template) {
  const newT = JSON.parse(JSON.stringify(template));
  newT.id = uuid();
  newT.pages.forEach(p => {
    p.id = uuid();
    p.sections.forEach(s => {
      s.id = uuid();
      s.questions.forEach(q => {
        const oldQid = q.id;
        q.id = uuid();
        // We'd ideally remap conditional logic IDs here, but keeping it simple for MVP
      });
    });
  });
  return newT;
}

var LIBRARY_FILE;

// Feature 11: Data migrations
function migrateData() {
  LIBRARY_FILE = path.join(dataDir, 'library.json');
  if (!fs.existsSync(LIBRARY_FILE)) fs.writeFileSync(LIBRARY_FILE, '[]', 'utf8');
  
  // Migrate templates for repeatable sections, pessimistic lock, severity, etc.
  var ts = readJson(TEMPLATES_FILE);
  var tChanged = false;
  ts.forEach(function(t) {
    if (t.lockedBy === undefined) { t.lockedBy = null; tChanged = true; }
    if (t.lockedAt === undefined) { t.lockedAt = null; tChanged = true; }
    if (!t.severityLevels) {
      t.severityLevels = [
        { id: uuid(), key: 'critical', label: 'Crítico', color: '#dc2626', icon: '🔴', order: 1 },
        { id: uuid(), key: 'major', label: 'Mayor', color: '#d97706', icon: '🟡', order: 2 },
        { id: uuid(), key: 'minor', label: 'Menor', color: '#2563eb', icon: '🔵', order: 3 },
        { id: uuid(), key: 'observation', label: 'Observación', color: '#16a34a', icon: '🟢', order: 4 }
      ];
      tChanged = true;
    }
    if (t.publishedVersions) {
      t.publishedVersions.forEach((v, i) => {
        if (!v.versionNumber) { v.versionNumber = i + 1; tChanged = true; }
        if (v.changeMessage === undefined) { v.changeMessage = ''; tChanged = true; }
        if (v.publishedBy === undefined) { v.publishedBy = ''; tChanged = true; }
      });
    }
    
    if (t.pages) {
      t.pages.forEach(function(p) {
        if (p.sections) {
          p.sections.forEach(function(s) {
            if (s.repeatable === undefined) {
              s.repeatable = false; s.minInstances = 1; s.maxInstances = null; s.addButtonLabel = "";
              tChanged = true;
            }
          });
        }
      });
    }
  });
  if (tChanged) writeJson(TEMPLATES_FILE, ts);

  // Migrate inspections: ensure activityLog array exists and repeatableAnswers, optimistic locking fields, and answer location/severity
  var ins = readJson(INSPECTIONS_FILE);
  var changed = false;
  ins.forEach(function(i) {
    if (i.lockedBy === undefined) { i.lockedBy = null; changed = true; }
    if (i.lockedAt === undefined) { i.lockedAt = null; changed = true; }
    if (!i.activityLog) { i.activityLog = []; changed = true; }
    if (!i.repeatableAnswers) { i.repeatableAnswers = {}; changed = true; }
    if (i.answers) {
      Object.values(i.answers).forEach(ans => {
        if (ans && ans.severity === undefined) { ans.severity = null; changed = true; }
        if (ans && ans.location === undefined) { ans.location = null; changed = true; }
      });
    }
    if (i.snapshot && i.snapshot.pages) {
      i.snapshot.pages.forEach(p => p.sections.forEach(s => {
        if (s.repeatable === undefined) { s.repeatable = false; s.minInstances = 1; s.maxInstances = null; s.addButtonLabel = ""; changed = true; }
      }));
    }
  });
  if (changed) writeJson(INSPECTIONS_FILE, ins);

  // Migrate Config: branding and webhooks
  let config = { dataPath: '' };
  try { config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8')); } catch {}
  let configChanged = false;
  if (!config.branding) {
    config.branding = {
      appName: 'OPEN AUDITOR',
      primaryColor: '#4f46e5',
      primaryColorHover: '#4338ca',
      logoPath: null, faviconPath: null, pdfLogoPath: null,
      footerText: 'Generado con OPEN AUDITOR'
    };
    configChanged = true;
  }
  if (!config.webhooks) {
    config.webhooks = [];
    configChanged = true;
  }
  if (configChanged) writeJson(CONFIG_FILE, config);

  console.log('  Migrations: OK');
}

// Feature 1: fileToBase64
function fileToBase64(filename) {
  var filePath = path.join(uploadsDir, filename);
  if (!fs.existsSync(filePath)) return null;
  var ext = path.extname(filename).slice(1).toLowerCase();
  var mime = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml', ico: 'image/x-icon' }[ext] || 'image/jpeg';
  var data = fs.readFileSync(filePath).toString('base64');
  return 'data:' + mime + ';base64,' + data;
}

function filePathToBase64(relPath) {
  if (!relPath) return null;
  var filePath = path.join(dataDir, relPath);
  if (!fs.existsSync(filePath)) return null;
  var ext = path.extname(filePath).slice(1).toLowerCase();
  var mime = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml', ico: 'image/x-icon' }[ext] || 'application/octet-stream';
  var data = fs.readFileSync(filePath).toString('base64');
  return 'data:' + mime + ';base64,' + data;
}

// Feature 4: getLocalIP
const os = require('os');
function getLocalIP() {
  var nets = os.networkInterfaces();
  var keys = Object.keys(nets);
  for (var i = 0; i < keys.length; i++) {
    var iface = nets[keys[i]];
    for (var j = 0; j < iface.length; j++) {
      var net = iface[j];
      if (net.family === 'IPv4' && !net.internal) return net.address;
    }
  }
  return 'localhost';
}

// ---- CONFIG ROUTES ----
app.get('/api/config', (req, res) => {
  let cfg = { dataPath: '' };
  try { cfg = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8')); } catch {}
  res.json(cfg);
});
app.put('/api/config', (req, res) => {
  let cfg = { dataPath: '' };
  try { cfg = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8')); } catch {}
  cfg.dataPath = req.body.dataPath !== undefined ? req.body.dataPath : cfg.dataPath;
  if (req.body.branding !== undefined) cfg.branding = req.body.branding;
  writeJson(CONFIG_FILE, cfg);
  res.json(cfg);
});

function hexToRgba(hex, alpha) {
  let r = 0, g = 0, b = 0;
  if (hex.length === 4) {
    r = parseInt(hex[1]+hex[1], 16); g = parseInt(hex[2]+hex[2], 16); b = parseInt(hex[3]+hex[3], 16);
  } else if (hex.length === 7) {
    r = parseInt(hex.substring(1,3), 16); g = parseInt(hex.substring(3,5), 16); b = parseInt(hex.substring(5,7), 16);
  }
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function darkenColor(hex, amount) {
  let color = hex.replace('#', '');
  if (color.length === 3) color = color[0]+color[0]+color[1]+color[1]+color[2]+color[2];
  const num = parseInt(color, 16);
  let r = (num >> 16) - Math.round(255 * (amount / 100));
  let g = ((num >> 8) & 0x00FF) - Math.round(255 * (amount / 100));
  let b = (num & 0x0000FF) - Math.round(255 * (amount / 100));
  r = r < 0 ? 0 : r; g = g < 0 ? 0 : g; b = b < 0 ? 0 : b;
  return `#${(g | (b << 8) | (r << 16)).toString(16).padStart(6, '0')}`;
}

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
  --app-name: "${b.appName || 'OPEN AUDITOR'}";
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
    res.status(404).send('No logo');
  }
});

app.get('/api/config/favicon', (req, res) => {
  const config = readJson(CONFIG_FILE);
  if (config.branding && config.branding.faviconPath) {
    res.sendFile(path.join(dataDir, config.branding.faviconPath));
  } else {
    res.status(404).send('No favicon');
  }
});

app.get('/api/config/pdf-logo', (req, res) => {
  const config = readJson(CONFIG_FILE);
  const pdfLogoPath = config.branding && (config.branding.pdfLogoPath || config.branding.logoPath);
  if (pdfLogoPath) {
    res.sendFile(path.join(dataDir, pdfLogoPath));
  } else {
    res.status(404).send('No pdf logo');
  }
});

app.post('/api/config/logo', upload.single('logo'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file' });
  const config = readJson(CONFIG_FILE);
  if (!config.branding) config.branding = {};
  config.branding.logoPath = 'uploads/' + req.file.filename;
  writeJson(CONFIG_FILE, config);
  res.json({ path: config.branding.logoPath });
});

app.post('/api/config/favicon', upload.single('favicon'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file' });
  const config = readJson(CONFIG_FILE);
  if (!config.branding) config.branding = {};
  config.branding.faviconPath = 'uploads/' + req.file.filename;
  writeJson(CONFIG_FILE, config);
  res.json({ path: config.branding.faviconPath });
});

app.post('/api/config/pdf-logo', upload.single('pdfLogo'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file' });
  const config = readJson(CONFIG_FILE);
  if (!config.branding) config.branding = {};
  config.branding.pdfLogoPath = 'uploads/' + req.file.filename;
  writeJson(CONFIG_FILE, config);
  res.json({ path: config.branding.pdfLogoPath });
});

// Webhooks API
app.get('/api/webhooks', (req, res) => {
  const config = readJson(CONFIG_FILE);
  res.json(config.webhooks || []);
});
app.post('/api/webhooks', (req, res) => {
  const config = readJson(CONFIG_FILE);
  if (!config.webhooks) config.webhooks = [];
  const hook = { id: uuidv4(), ...req.body, lastTriggeredAt: null, lastStatus: null };
  config.webhooks.push(hook);
  writeJson(CONFIG_FILE, config);
  res.json(hook);
});
app.put('/api/webhooks/:id', (req, res) => {
  const config = readJson(CONFIG_FILE);
  const idx = (config.webhooks || []).findIndex(h => h.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  config.webhooks[idx] = { ...config.webhooks[idx], ...req.body, id: config.webhooks[idx].id };
  writeJson(CONFIG_FILE, config);
  res.json(config.webhooks[idx]);
});
app.delete('/api/webhooks/:id', (req, res) => {
  const config = readJson(CONFIG_FILE);
  config.webhooks = (config.webhooks || []).filter(h => h.id !== req.params.id);
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

// ---- TEMPLATES ROUTES ----
app.get('/api/templates', (req, res) => {
  const ts = readJson(TEMPLATES_FILE);
  const ins = readJson(INSPECTIONS_FILE);
  var today = new Date().toISOString().slice(0, 10);
  res.json(ts.map(function(t) {
    var expiryStatus = null;
    if (t.expiry && t.expiry.date) {
      if (t.expiry.date < today) expiryStatus = 'expired';
      else {
        var daysLeft = Math.ceil((new Date(t.expiry.date) - new Date()) / 86400000);
        if (daysLeft <= (t.expiry.warnDays || 7)) expiryStatus = 'warning';
        else expiryStatus = 'ok';
      }
    }
    return { id: t.id, name: t.name, status: t.status, updatedAt: t.updatedAt,
      pageCount: t.pages ? t.pages.length : 0, tags: t.tags || [],
      schedule: t.schedule || null, expiry: t.expiry || null, expiryStatus: expiryStatus,
      inspectionCount: ins.filter(function(i) { return i.templateId === t.id; }).length
    };
  }));
});

app.get('/api/templates/:id', (req, res) => {
  if (req.params.id === 'import') return res.status(404).end(); // avoid conflict
  const t = readJson(TEMPLATES_FILE).find(t => t.id === req.params.id);
  if (!t) return res.status(404).json({ error: 'Not found' });
  res.json(t);
});

app.post('/api/templates', (req, res) => {
  const ts = readJson(TEMPLATES_FILE);
  const t = defaultTemplate(req.body && req.body.name);
  ts.push(t);
  writeJson(TEMPLATES_FILE, ts);
  res.status(201).json(t);
});

app.put('/api/templates/:id', (req, res) => {
  const ts = readJson(TEMPLATES_FILE);
  const idx = ts.findIndex(t => t.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  const existing = ts[idx];
  
  const clientUpdatedAt = req.body._updatedAt;
  if (clientUpdatedAt && existing.updatedAt && new Date(clientUpdatedAt) < new Date(existing.updatedAt)) {
    return res.status(409).json({
      error: 'CONFLICT',
      message: 'Esta plantilla fue modificada por otro usuario mientras trabajabas.',
      serverUpdatedAt: existing.updatedAt,
      serverVersion: existing
    });
  }

  ts[idx] = { ...existing, ...req.body, id: existing.id, createdAt: existing.createdAt, updatedAt: now(), _updatedAt: undefined };
  writeJson(TEMPLATES_FILE, ts);
  res.json(ts[idx]);
});

app.post('/api/templates/:id/lock', (req, res) => {
  const ts = readJson(TEMPLATES_FILE);
  const t = ts.find(x => x.id === req.params.id);
  if (!t) return res.status(404).json({ error: 'Not found' });
  t.lockedBy = req.body.lockedBy || null;
  t.lockedAt = t.lockedBy ? now() : null;
  writeJson(TEMPLATES_FILE, ts);
  res.json({ ok: true, lockedBy: t.lockedBy });
});

app.post('/api/templates/:id/unlock', (req, res) => {
  const ts = readJson(TEMPLATES_FILE);
  const t = ts.find(x => x.id === req.params.id);
  if (!t) return res.status(404).json({ error: 'Not found' });
  t.lockedBy = null;
  t.lockedAt = null;
  writeJson(TEMPLATES_FILE, ts);
  res.json({ ok: true });
});

app.delete('/api/templates/:id', (req, res) => {
  const ts = readJson(TEMPLATES_FILE);
  const idx = ts.findIndex(t => t.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  ts.splice(idx, 1);
  writeJson(TEMPLATES_FILE, ts);
  res.json({ ok: true });
});

app.post('/api/templates/:id/duplicate', (req, res) => {
  const ts = readJson(TEMPLATES_FILE);
  const existing = ts.find(t => t.id === req.params.id);
  if (!existing) return res.status(404).json({ error: 'Not found' });
  const copy = regenerateIds(existing);
  copy.name = 'Copia de ' + existing.name;
  copy.status = 'draft';
  copy.publishedAt = null;
  copy.publishedVersions = [];
  const t = now();
  copy.createdAt = t;
  copy.updatedAt = t;
  ts.push(copy);
  writeJson(TEMPLATES_FILE, ts);
  res.status(201).json(copy);
});

app.post('/api/templates/:id/publish', async (req, res) => {
  const ts = readJson(TEMPLATES_FILE);
  const idx = ts.findIndex(t => t.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  const t = ts[idx];
  const snap = JSON.parse(JSON.stringify(t));
  snap.publishedVersions = undefined;
  if (!t.publishedVersions) t.publishedVersions = [];
  
  const versionNumber = t.publishedVersions.length + 1;
  const { changeMessage, publishedBy } = req.body || {};
  
  t.publishedVersions.unshift({
    publishedAt: now(),
    changeMessage: changeMessage || '',
    publishedBy: publishedBy || '',
    versionNumber,
    snapshot: snap
  });
  t.status = 'published';
  t.publishedAt = now();
  t.updatedAt = now();
  writeJson(TEMPLATES_FILE, ts);
  
  dispatchWebhook('template.published', {
    template: { id: t.id, name: t.name, versionNumber, changeMessage }
  });
  
  res.json(t);
});

app.post('/api/templates/:id/revert', (req, res) => {
  const ts = readJson(TEMPLATES_FILE);
  const idx = ts.findIndex(t => t.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  const t = ts[idx];
  if (!t.publishedVersions || t.publishedVersions.length === 0) return res.status(400).json({ error: 'No published versions' });
  const vIndex = req.body.versionIndex !== undefined ? req.body.versionIndex : (t.publishedVersions.length - 1);
  const snap = t.publishedVersions[vIndex].snapshot;
  if (!snap) return res.status(400).json({ error: 'Invalid version' });
  const newT = { ...JSON.parse(JSON.stringify(snap)), publishedVersions: t.publishedVersions, updatedAt: now() };
  ts[idx] = newT;
  writeJson(TEMPLATES_FILE, ts);
  res.json(ts[idx]);
});

app.get('/api/templates/:id/export', (req, res) => {
  const t = readJson(TEMPLATES_FILE).find(t => t.id === req.params.id);
  if (!t) return res.status(404).json({ error: 'Not found' });
  res.setHeader('Content-disposition', `attachment; filename=template-${t.id}.json`);
  res.setHeader('Content-type', 'application/json');
  res.send(JSON.stringify(t, null, 2));
});

app.post('/api/templates/import', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  try {
    const raw = fs.readFileSync(req.file.path, 'utf8');
    const parsed = JSON.parse(raw);
    const ts = readJson(TEMPLATES_FILE);
    const newT = deepCloneWithNewIds(parsed);
    const t = now();
    newT.createdAt = t;
    newT.updatedAt = t;
    newT.status = 'draft';
    newT.publishedAt = null;
    newT.publishedVersions = [];
    ts.push(newT);
    writeJson(TEMPLATES_FILE, ts);
    fs.unlinkSync(req.file.path);
    res.json(newT);
  } catch (e) {
    res.status(400).json({ error: 'Invalid JSON file' });
  }
});

app.post('/api/templates/import-url', async (req, res) => {
  const { url } = req.body;
  if (!url || !url.startsWith('http')) {
    return res.status(400).json({ error: 'URL inválida' });
  }

  const trustedDomains = [
    'raw.githubusercontent.com',
    'gitlab.com',
    'raw.gitlab.com',
    'gist.githubusercontent.com'
  ];
  const urlObj = new URL(url);
  const isTrusted = trustedDomains.some(d => urlObj.hostname.endsWith(d));

  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(10000),
      headers: { 'Accept': 'application/json' }
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('json') && !contentType.includes('text')) {
      throw new Error('La URL no devuelve JSON válido');
    }

    const data = await response.json();

    if (!data.pages || !data.name) {
      throw new Error('El archivo no parece ser una plantilla de OPEN AUDITOR válida');
    }

    const imported = deepCloneWithNewIds(data);
    imported.name = `${data.name} (importada)`;
    imported.status = 'draft';
    imported.importedFrom = url;
    imported.importedAt = new Date().toISOString();
    imported.publishedVersions = [];
    imported.createdAt = new Date().toISOString();
    imported.updatedAt = new Date().toISOString();

    const templates = readJson(TEMPLATES_FILE);
    templates.push(imported);
    writeJson(TEMPLATES_FILE, templates);

    res.json({
      success: true,
      template: imported,
      trusted: isTrusted,
      warning: isTrusted ? null : 'Esta plantilla proviene de una fuente no verificada. Revisá el contenido antes de publicarla.'
    });
  } catch (err) {
    res.status(400).json({
      error: 'IMPORT_FAILED',
      message: err.message
    });
  }
});

function collectReferencedFiles(template) {
  const files = new Set();
  const extractFilename = (url) => {
    if (!url) return null;
    if (url.startsWith('data:')) return null;
    if (url.includes('/uploads/')) {
      return url.split('/uploads/').pop().split('?')[0];
    }
    return null;
  };
  
  if (template.pages) {
    template.pages.forEach(p => {
      if (p.sections) {
        p.sections.forEach(s => {
          if (s.questions) {
            s.questions.forEach(q => {
              const fn = extractFilename(q.helpImage || q.helpMedia);
              if (fn) files.add(fn);
            });
          }
        });
      }
    });
  }
  return Array.from(files);
}

app.get('/api/templates/:id/export/pack', (req, res) => {
  const templates = readJson(TEMPLATES_FILE);
  const template = templates.find(t => t.id === req.params.id);
  if (!template) return res.status(404).json({ error: 'No encontrada' });

  const safeName = template.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', `attachment; filename="${safeName}.oapack"`);

  const archive = archiver('zip', { zlib: { level: 9 } });
  archive.pipe(res);

  archive.append(JSON.stringify(template, null, 2), { name: 'plantilla.json' });

  const manifest = {
    version: '1.0',
    appVersion: '1.2.0',
    exportedAt: new Date().toISOString(),
    template: {
      id: template.id,
      name: template.name,
      description: template.description
    }
  };
  
  const referencedFiles = collectReferencedFiles(template);
  manifest.fileCount = referencedFiles.length;
  manifest.files = referencedFiles.map(f => `uploads/${f}`);

  archive.append(JSON.stringify(manifest, null, 2), { name: 'manifest.json' });

  if (template.description) {
    archive.append(`# ${template.name}\n\n${template.description}\n`, { name: 'README.md' });
  }

  for (const filename of referencedFiles) {
    const filePath = path.join(dataDir, 'uploads', filename);
    if (fs.existsSync(filePath)) {
      archive.file(filePath, { name: `uploads/${filename}` });
    }
  }

  archive.finalize();
});

app.post('/api/templates/import-pack', multer({ storage: multer.memoryStorage() }).single('pack'), (req, res) => {
  try {
    if (!req.file) throw new Error('No file uploaded');
    const zip = new AdmZip(req.file.buffer);

    const manifestEntry = zip.getEntry('manifest.json');
    if (!manifestEntry) throw new Error('Archivo .oapack inválido: falta manifest.json');
    const manifest = JSON.parse(manifestEntry.getData().toString());

    const templateEntry = zip.getEntry('plantilla.json');
    if (!templateEntry) throw new Error('Archivo .oapack inválido: falta plantilla.json');
    const template = JSON.parse(templateEntry.getData().toString());

    const imported = deepCloneWithNewIds(template);
    imported.name = `${template.name} (importada)`;
    imported.status = 'draft';
    imported.importedFromPack = manifest;
    imported.importedAt = new Date().toISOString();
    imported.publishedVersions = [];
    imported.createdAt = new Date().toISOString();
    imported.updatedAt = new Date().toISOString();

    const entries = zip.getEntries().filter(e => e.entryName.startsWith('uploads/') && !e.isDirectory);
    for (const entry of entries) {
      const filename = path.basename(entry.entryName);
      const dest = path.join(uploadsDir, filename);
      if (!fs.existsSync(dest)) {
        zip.extractEntryTo(entry, uploadsDir, false, false);
      }
    }

    const templates = readJson(TEMPLATES_FILE);
    templates.push(imported);
    writeJson(TEMPLATES_FILE, templates);

    res.json({ success: true, template: imported, filesImported: entries.length });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ---- INSPECTIONS ROUTES ----
app.get('/api/inspections', (req, res) => {
  const ins = readJson(INSPECTIONS_FILE);
  res.json(ins.map(i => ({ id: i.id, templateName: i.templateName, code: i.code, status: i.status, startedAt: i.startedAt, score: i.score, maxScore: i.maxScore })));
});

app.get('/api/inspections/:id', (req, res) => {
  const ins = readJson(INSPECTIONS_FILE).find(i => i.id === req.params.id);
  if (!ins) return res.status(404).json({ error: 'Not found' });
  res.json(ins);
});

app.post('/api/inspections', (req, res) => {
  const { templateId } = req.body;
  const ts = readJson(TEMPLATES_FILE);
  const tIndex = ts.findIndex(x => x.id === templateId);
  if (tIndex === -1 || ts[tIndex].status !== 'published') return res.status(400).json({ error: 'Invalid or unpublished template' });
  const t = ts[tIndex];

  if (t.expiry && t.expiry.date) {
    var todayStr = new Date().toISOString().slice(0, 10);
    if (t.expiry.date < todayStr && t.expiry.blockOnExpiry) return res.status(400).json({ error: 'La plantilla ha expirado y no puede usarse para nuevas inspecciones' });
  }
  
  let code = null;
  if (t.correlative && t.correlative.enabled) {
    const cor = t.correlative;
    const num = String(cor.nextNumber || 1).padStart(cor.padLength || 3, '0');
    const parts = [];
    if (cor.prefix) parts.push(cor.prefix);
    if (cor.includeyear) parts.push(new Date().getFullYear());
    parts.push(num);
    const sep = cor.separator !== undefined ? cor.separator : '-';
    code = parts.join(sep);
    
    // Increment nextNumber
    t.correlative.nextNumber = (cor.nextNumber || 1) + 1;
    writeJson(TEMPLATES_FILE, ts); // Save updated template nextNumber
  }

  const ins = readJson(INSPECTIONS_FILE);
  const newIns = {
    id: uuid(),
    templateId: t.id,
    templateName: t.name,
    code: code,
    snapshot: t.publishedVersions[0].snapshot, // we unshift versions, so 0 is latest
    status: 'in_progress',
    startedAt: now(),
    completedAt: null,
    score: null,
    maxScore: null,
    answers: {},
    repeatableAnswers: {}
  };
  ins.push(newIns);
  writeJson(INSPECTIONS_FILE, ins);
  dispatchWebhook('inspection.created', {
    inspection: { id: newIns.id, templateId, templateName: t.name, code }
  });
  res.status(201).json(newIns);
});

app.put('/api/inspections/:id', (req, res) => {
  const ins = readJson(INSPECTIONS_FILE);
  const idx = ins.findIndex(i => i.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  
  const current = ins[idx];
  const clientUpdatedAt = req.body._updatedAt;
  
  if (clientUpdatedAt && current.updatedAt && new Date(clientUpdatedAt) < new Date(current.updatedAt)) {
    return res.status(409).json({
      error: 'CONFLICT',
      message: 'Esta inspección fue modificada por otro usuario mientras trabajabas.',
      serverUpdatedAt: current.updatedAt,
      serverVersion: current
    });
  }

  current.answers = req.body.answers || current.answers;
  current.repeatableAnswers = req.body.repeatableAnswers || current.repeatableAnswers || {};
  // Feature 9: append activity log entries
  if (req.body.activityLog && Array.isArray(req.body.activityLog)) {
    if (!current.activityLog) current.activityLog = [];
    current.activityLog = current.activityLog.concat(req.body.activityLog);
    if (current.activityLog.length > 1000) current.activityLog = current.activityLog.slice(-1000);
  }
  
  current.updatedAt = now();
  writeJson(INSPECTIONS_FILE, ins);
  dispatchWebhook('inspection.autosaved', {
    inspection: { id: current.id, code: current.code }
  });
  res.json(current);
});


app.post('/api/inspections/:id/lock', (req, res) => {
  try {
    const ins = readJson(INSPECTIONS_FILE);
    const i = ins.find(x => x.id === req.params.id);
    if (!i) {
      console.warn('Intento de lock sobre inspección inexistente:', req.params.id);
      return res.status(404).json({ error: 'Not found' });
    }
    i.lockedBy = req.body.lockedBy || null;
    i.lockedAt = i.lockedBy ? now() : null;
    writeJson(INSPECTIONS_FILE, ins);
    res.json({ ok: true, lockedBy: i.lockedBy });
  } catch (err) {
    console.error('Error en /api/inspections/:id/lock:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/inspections/:id/unlock', (req, res) => {
  const ins = readJson(INSPECTIONS_FILE);
  const i = ins.find(x => x.id === req.params.id);
  if (!i) return res.status(404).json({ error: 'Not found' });
  i.lockedBy = null;
  i.lockedAt = null;
  writeJson(INSPECTIONS_FILE, ins);
  res.json({ ok: true });
});

app.post('/api/inspections/:id/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file' });
  res.json({ filename: req.file.filename });
});

app.post('/api/inspections/:id/complete', (req, res) => {
  const ins = readJson(INSPECTIONS_FILE);
  const idx = ins.findIndex(i => i.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  const inspection = ins[idx];
  inspection.answers = req.body.answers || inspection.answers;
  inspection.repeatableAnswers = req.body.repeatableAnswers || inspection.repeatableAnswers || {};
  
  const templateSnapshot = inspection.snapshot;
  
  // Media validation (Layer 1.2)
  const warnings = [];
  for (const page of templateSnapshot.pages) {
    for (const section of page.sections) {
      if (section.repeatable) {
        const instances = inspection.repeatableAnswers[section.id] || [];
        instances.forEach((inst, instIdx) => {
          for (const q of section.questions) {
            if (q.requireMedia) {
              const ans = inst[q.id] || {};
              const count = (ans.mediaFiles || []).length;
              if (count < (q.minMediaCount || 1)) {
                warnings.push({
                  questionId: q.id,
                  questionText: q.text,
                  message: q.mediaValidationMessage || `Requiere al menos ${q.minMediaCount || 1} foto(s) en instancia ${instIdx + 1}`
                });
              }
            }
          }
        });
      } else {
        for (const q of section.questions) {
          if (q.requireMedia) {
            const ans = inspection.answers[q.id] || {};
            const count = (ans.mediaFiles || []).length;
            if (count < (q.minMediaCount || 1)) {
              warnings.push({
                questionId: q.id,
                questionText: q.text,
                message: q.mediaValidationMessage || `Requiere al menos ${q.minMediaCount || 1} foto(s)`
              });
            }
          }
        }
      }
    }
  }

  if (warnings.length > 0) {
    return res.status(422).json({
      error: 'MEDIA_REQUIRED',
      warnings,
      message: `${warnings.length} pregunta(s) requieren evidencia fotográfica`
    });
  }

  // Scoring logic
  let totalScore = 0;
  let maxScore = 0;
  const template = inspection.snapshot;
  
  const scoreQ = (q, ans) => {
    if (q.score !== null && q.score !== undefined && q.score !== '') {
      if (ans) {
        if (q.responseType === 'multiple_choice' || q.responseType === 'yesno') {
          if (ans.value === 'yes') { totalScore += Number(q.score); maxScore += Number(q.score); }
          else if (ans.value === 'no') { maxScore += Number(q.score); }
          else if (ans.value === 'na') { }
          else {
            const opt = (q.options || []).find(o => String(o.id) === String(ans.value) || String(o.label) === String(ans.value));
            if (opt) {
              if (opt.scoreValue === 1) { totalScore += Number(q.score); maxScore += Number(q.score); }
              else if (opt.scoreValue === 0) { maxScore += Number(q.score); }
            } else {
              maxScore += Number(q.score);
            }
          }
        } else if (q.responseType === 'checkbox') {
          maxScore += Number(q.score);
          if (ans.value === true || ans.value === 'true') totalScore += Number(q.score);
        } else {
          maxScore += Number(q.score);
          if (ans.value) totalScore += Number(q.score);
        }
      } else {
        maxScore += Number(q.score);
      }
    }
  };

  template.pages.forEach(p => {
    p.sections.forEach(s => {
      if (s.repeatable) {
        const instances = inspection.repeatableAnswers[s.id] || [];
        instances.forEach(inst => {
          s.questions.forEach(q => {
            const ans = inst[q.id];
            scoreQ(q, ans);
          });
        });
      } else {
        s.questions.forEach(q => {
          const ans = inspection.answers[q.id];
          scoreQ(q, ans);
        });
      }
    });
  });
  
  inspection.score = totalScore;
  inspection.maxScore = maxScore;
  inspection.status = 'completed';
  inspection.completedAt = now();
  writeJson(INSPECTIONS_FILE, ins);
  
  dispatchWebhook('inspection.completed', {
    inspection: { id: inspection.id, code: inspection.code, templateName: inspection.templateName, score: totalScore, completedAt: inspection.completedAt }
  });
  res.json(inspection);
});

app.get('/api/inspections/:id/export/csv', (req, res) => {
  const ins = readJson(INSPECTIONS_FILE).find(i => i.id === req.params.id);
  if (!ins) return res.status(404).json({ error: 'Not found' });
  
  let csv = 'Page,Section,Question,Type,Value,Note,Flagged,Action\n';
  const escapeCsv = (str) => `"${String(str || '').replace(/"/g, '""')}"`;
  
  ins.snapshot.pages.forEach(p => {
    p.sections.forEach(s => {
      s.questions.forEach(q => {
        const ans = ins.answers[q.id] || {};
        csv += [
          escapeCsv(p.name), escapeCsv(s.title), escapeCsv(q.text), escapeCsv(q.responseType),
          escapeCsv(ans.value), escapeCsv(ans.note), escapeCsv(ans.flagged), escapeCsv(ans.action)
        ].join(',') + '\n';
      });
    });
  });
  
  res.setHeader('Content-disposition', `attachment; filename=inspection-${ins.id}.csv`);
  res.setHeader('Content-type', 'text/csv; charset=utf-8');
  res.send('\uFEFF' + csv); // BOM for Excel
});

app.get('/api/inspections/:id/export/pdf', async (req, res) => {
  var ins = readJson(INSPECTIONS_FILE).find(function(i){ return i.id === req.params.id; });
  if (!ins) return res.status(404).json({ error: 'Not found' });
  try {
    var config = readJson(CONFIG_FILE);
    var branding = config.branding || {};
    branding.pdfLogoDataUri = filePathToBase64(branding.pdfLogoPath || branding.logoPath);
    var html = buildPdfHtml(ins, uploadsDir, branding);
    var browser = await puppeteer.launch({ headless: 'new' });
    var pg = await browser.newPage();
    await pg.setContent(html, { waitUntil: 'networkidle0' });
    var r = ins.snapshot.report || {};
    var buf = await pg.pdf({
      format: r.pageSize === 'Letter' ? 'Letter' : 'A4',
      printBackground: true,
      margin: { top: '20mm', right: '20mm', bottom: '28mm', left: '20mm' }
    });
    await browser.close();
    res.setHeader('Content-disposition', 'attachment; filename=inspection-' + ins.id + '.pdf');
    res.setHeader('Content-type', 'application/pdf');
    res.send(buf);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error generating PDF: ' + e.message });
  }
});


// ---- QR CODE (Feature 4) ----
app.get('/api/templates/:id/qr', async function(req, res) {
  var QRCode = require('qrcode');
  var ip = getLocalIP();
  var url = 'http://' + ip + ':3001/inspector/' + req.params.id;
  try {
    var buf = await QRCode.toBuffer(url, { width: 300, margin: 2, color: { dark: '#1a1a2e', light: '#ffffff' } });
    res.set('Content-Type', 'image/png');
    res.send(buf);
  } catch(e) { res.status(500).json({ error: 'QR error: ' + e.message }); }
});

// ---- VALIDATION ----
app.get('/api/templates/:id/validate', function(req, res) {
  var t = readJson(TEMPLATES_FILE).find(function(x) { return x.id === req.params.id; });
  if (!t) return res.status(404).json({ error: 'Not found' });
  var warnings = [];
  t.pages.forEach(function(p) {
    p.sections.forEach(function(s) {
      if (s.questions.length === 0) warnings.push('Seccion vacia: ' + (s.title||'Sin titulo') + ' en ' + p.name);
      s.questions.forEach(function(q) {
        if (!q.text || !q.text.trim()) warnings.push('Pregunta sin texto en: ' + (s.title||'Sin titulo'));
        if (q.conditionalLogic && q.conditionalLogic.dependsOn) {
          var dep = t.pages.some(function(pp) { return pp.sections.some(function(ss) { return ss.questions.some(function(qq) { return qq.id === q.conditionalLogic.dependsOn; }); }); });
          if (!dep) warnings.push('Logica condicional invalida en: ' + q.text);
        }
      });
    });
  });
  res.json({ warnings: warnings });
});

// ---- TEMPLATE INSPECTIONS HISTORY ----
app.get('/api/templates/:id/inspections', function(req, res) {
  var ins = readJson(INSPECTIONS_FILE).filter(function(i) { return i.templateId === req.params.id; });
  res.json(ins.map(function(i) { return { id: i.id, templateName: i.templateName, status: i.status, startedAt: i.startedAt, completedAt: i.completedAt, score: i.score, maxScore: i.maxScore }; }));
});

// ---- GLOBAL LIBRARY (Feature 3) ----
app.get('/api/library', function(req, res) {
  res.json(readJson(LIBRARY_FILE));
});
app.post('/api/library', function(req, res) {
  var lib = readJson(LIBRARY_FILE);
  var q = req.body;
  q.id = uuid();
  q.savedAt = now();
  q.usageCount = 0;
  lib.push(q);
  writeJson(LIBRARY_FILE, lib);
  res.status(201).json(q);
});
app.delete('/api/library/:id', function(req, res) {
  var lib = readJson(LIBRARY_FILE);
  lib = lib.filter(function(q) { return q.id !== req.params.id; });
  writeJson(LIBRARY_FILE, lib);
  res.json({ ok: true });
});
app.post('/api/library/:id/use', function(req, res) {
  var lib = readJson(LIBRARY_FILE);
  var q = lib.find(function(x) { return x.id === req.params.id; });
  if (!q) return res.status(404).json({ error: 'Not found' });
  q.usageCount = (q.usageCount || 0) + 1;
  writeJson(LIBRARY_FILE, lib);
  res.json(q);
});

// ---- ACTIONS (Feature 2: assignedTo, object format) ----
function normalizeAction(ans) {
  if (!ans.action) return null;
  if (typeof ans.action === 'string') {
    return { description: ans.action, status: ans.actionStatus || 'open', assignedTo: '', deadline: ans.actionDeadline || null };
  }
  return { description: ans.action.description || '', status: ans.action.status || ans.actionStatus || 'open', assignedTo: ans.action.assignedTo || '', deadline: ans.action.deadline || ans.actionDeadline || null };
}
app.get('/api/actions', function(req, res) {
  var all = readJson(INSPECTIONS_FILE); var actions = [];
  all.forEach(function(insp) {
    if (!insp.answers) return;
    Object.keys(insp.answers).forEach(function(qid) {
      var ans = insp.answers[qid];
      if (ans && ans.action) {
        var qText = qid;
        if (insp.snapshot) insp.snapshot.pages.forEach(function(pg) { pg.sections.forEach(function(sec) { sec.questions.forEach(function(q) { if (q.id === qid) qText = q.text; }); }); });
        var norm = normalizeAction(ans);
        if (!norm) return;
        actions.push({ inspectionId: insp.id, inspectionName: insp.templateName, templateId: insp.templateId, questionId: qid, questionText: qText, action: norm.description, assignedTo: norm.assignedTo, status: norm.status, deadline: norm.deadline, flagged: ans.flagged || false, startedAt: insp.startedAt, note: ans.note || '' });
      }
    });
  });
  res.json(actions);
});
app.put('/api/actions/:inspectionId/:questionId', function(req, res) {
  var ins = readJson(INSPECTIONS_FILE);
  var idx = ins.findIndex(function(i) { return i.id === req.params.inspectionId; });
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  var ans = ins[idx].answers && ins[idx].answers[req.params.questionId];
  if (!ans) return res.status(404).json({ error: 'Answer not found' });
  if (typeof ans.action === 'string') { ans.action = { description: ans.action, status: ans.actionStatus || 'open', assignedTo: '', deadline: ans.actionDeadline || null }; }
  if (!ans.action || typeof ans.action !== 'object') ans.action = { description: '', status: 'open', assignedTo: '', deadline: null };
  if (req.body.status !== undefined) { ans.action.status = req.body.status; ans.actionStatus = req.body.status; }
  if (req.body.deadline !== undefined) { ans.action.deadline = req.body.deadline; ans.actionDeadline = req.body.deadline; }
  if (req.body.assignedTo !== undefined) ans.action.assignedTo = req.body.assignedTo;
  if (req.body.description !== undefined) ans.action.description = req.body.description;
  writeJson(INSPECTIONS_FILE, ins);
  
  dispatchWebhook('action.status_changed', {
    inspectionId: req.params.inspectionId, questionId: req.params.questionId, newStatus: ans.action.status, assignedTo: ans.action.assignedTo
  });
  res.json(ans);
});
// ---- SIGNATURE ----
app.post('/api/inspections/:id/signature', function(req, res) {
  var ins = readJson(INSPECTIONS_FILE);
  var idx = ins.findIndex(function(i) { return i.id === req.params.id; });
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  ins[idx].signature = req.body.signature || null;
  writeJson(INSPECTIONS_FILE, ins);
  res.json({ ok: true });
});

// ---- FINDINGS PDF ----
app.get('/api/inspections/:id/export/pdf-findings', async function(req, res) {
  var ins = readJson(INSPECTIONS_FILE).find(function(i) { return i.id === req.params.id; });
  if (!ins) return res.status(404).json({ error: 'Not found' });
  var items = [];
  ins.snapshot.pages.forEach(function(p) { p.sections.forEach(function(s) { s.questions.forEach(function(q) { var a = ins.answers[q.id]; if (a && a.flagged) items.push({ page: p.name, sec: s.title, q: q.text, v: a.value, n: a.note, act: (typeof a.action === 'object' ? a.action.description : a.action), media: a.mediaFiles || [] }); }); }); });
  var css = 'body{font-family:sans-serif;color:#333;padding:32px}h1{color:#1a1a2e;border-bottom:2px solid #4f46e5;padding-bottom:12px}table{width:100%;border-collapse:collapse;margin-top:16px}th,td{border:1px solid #e5e7eb;padding:8px 12px;text-align:left;vertical-align:top}th{background:#4f46e5;color:#fff}tr:nth-child(even){background:#f9fafb}';
  var html = '<html><head><style>' + css + '</style></head><body>';
  html += '<h1>Informe de Hallazgos</h1><p><strong>Inspeccion:</strong> ' + ins.templateName + ' | <strong>Hallazgos:</strong> ' + items.length + '</p>';
  if (!items.length) html += '<p>No hay elementos senalados.</p>';
  else {
    html += '<table><thead><tr><th>Pagina</th><th>Seccion</th><th>Pregunta</th><th>Respuesta</th><th>Nota</th><th>Accion Correctiva</th></tr></thead><tbody>';
    items.forEach(function(it) {
      html += '<tr><td>' + (it.page||'') + '</td><td>' + (it.sec||'') + '</td><td><strong>' + (it.q||'') + '</strong></td><td>' + (it.v||'-') + '</td><td>' + (it.n||'-') + '</td><td>' + (it.act||'-') + '</td></tr>';
      if (it.media && it.media.length) {
        html += '<tr><td colspan=6><div style="display:flex;flex-wrap:wrap;gap:8px;padding:8px 0 16px">';
        it.media.forEach(function(mf, mi) {
          var b64 = fileToBase64(mf);
          if (b64) html += '<div><img src="' + b64 + '" style="max-width:240px;max-height:180px;object-fit:cover;border-radius:3px;border:1px solid #e9e8e6"><div style="font-size:8pt;color:#9b9b97">Foto ' + (mi+1) + '</div></div>';
        });
        html += '</div></td></tr>';
      }
    });
    html += '</tbody></table>';
  }
  if (ins.signature) html += '<div style="margin-top:40px"><p><strong>Firma:</strong></p><img src="' + ins.signature + '" style="height:80px"></div>';
  html += '</body></html>';
  try {
    var browser = await puppeteer.launch({ headless: 'new' });
    var pg = await browser.newPage();
    await pg.setContent(html);
    var buf = await pg.pdf({ format: 'A4' });
    await browser.close();
    res.setHeader('Content-disposition', 'attachment; filename=findings-' + ins.id + '.pdf');
    res.setHeader('Content-type', 'application/pdf');
    res.send(buf);
  } catch (e) { res.status(500).json({ error: 'PDF error' }); }
});

// ---- EXCEL ----
app.get('/api/inspections/:id/export/xlsx', async function(req, res) {
  var ins = readJson(INSPECTIONS_FILE).find(function(i) { return i.id === req.params.id; });
  if (!ins) return res.status(404).json({ error: 'Not found' });
  try {
    var ExcelJS = require('exceljs');
    var wb = new ExcelJS.Workbook();
    var sh = wb.addWorksheet('Inspeccion');
    sh.columns = [{header:'Pagina',key:'page',width:20},{header:'Seccion',key:'sec',width:20},{header:'Pregunta',key:'q',width:40},{header:'Tipo',key:'type',width:15},{header:'Respuesta',key:'val',width:20},{header:'Nota',key:'note',width:30},{header:'Senalado',key:'flag',width:10},{header:'Accion',key:'action',width:40},{header:'Estado',key:'st',width:15}];
    var hr = sh.getRow(1); hr.font = { bold: true, color: { argb: 'FFFFFFFF' } }; hr.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } };
    
    var repSheets = {};

    ins.snapshot.pages.forEach(function(p) { p.sections.forEach(function(s) { 
      if (s.repeatable) {
        var shName = (s.title || 'Seccion Repetible').slice(0, 31); // Excel sheet name limit
        if (!repSheets[shName]) {
          var rs = wb.addWorksheet(shName);
          rs.columns = [{header:'Instancia',key:'inst',width:15},{header:'Pregunta',key:'q',width:40},{header:'Respuesta',key:'val',width:20},{header:'Nota',key:'note',width:30},{header:'Senalado',key:'flag',width:10},{header:'Accion',key:'action',width:40}];
          var rhr = rs.getRow(1); rhr.font = { bold: true, color: { argb: 'FFFFFFFF' } }; rhr.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } };
          repSheets[shName] = rs;
        }
        var rs = repSheets[shName];
        var instances = ins.repeatableAnswers[s.id] || [];
        instances.forEach((inst, idx) => {
          s.questions.forEach(q => {
            var a = inst[q.id] || {};
            rs.addRow({ inst: (s.title||'Instancia')+' '+(idx+1), q: q.text, val: String(a.value||''), note: a.note||'', flag: a.flagged?'Si':'', action: a.action||'' });
          });
        });
      } else {
        s.questions.forEach(function(q) { var a = ins.answers[q.id] || {}; sh.addRow({ page: p.name, sec: s.title||'', q: q.text, type: q.responseType, val: String(a.value||''), note: a.note||'', flag: a.flagged?'Si':'', action: a.action||'', st: a.actionStatus||'' }); }); 
      }
    }); });
    res.setHeader('Content-disposition', 'attachment; filename=inspection-' + ins.id + '.xlsx');
    res.setHeader('Content-type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    await wb.xlsx.write(res); res.end();
  } catch (e) { res.status(500).json({ error: 'Excel error: ' + e.message }); }
});

// ---- TEMPLATE PREVIEW PDF ----
app.get('/api/templates/:id/preview/pdf', async function(req, res) {
  var t = readJson(TEMPLATES_FILE).find(function(x) { return x.id === req.params.id; });
  if (!t) return res.status(404).json({ error: 'Not found' });
  var config = readJson(CONFIG_FILE);
  var branding = config.branding || {};
  var previewLogo = filePathToBase64(branding.pdfLogoPath || branding.logoPath);
  var css = 'body{font-family:sans-serif;color:#333;padding:32px;max-width:800px;margin:0 auto}' +
    'h1{color:#1a1a2e;border-bottom:3px solid #4f46e5;padding-bottom:16px;margin-bottom:8px}' +
    'h2{color:#4f46e5;font-size:1.1rem;margin:28px 0 8px;border-bottom:1px solid #e5e7eb;padding-bottom:6px}' +
    'h3{color:#374151;font-size:.95rem;margin:16px 0 6px;font-style:italic}' +
    '.q{display:flex;align-items:flex-start;gap:10px;padding:8px 0;border-bottom:1px dashed #f3f4f6}' +
    '.q-num{min-width:22px;height:22px;background:#4f46e5;color:#fff;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:.75rem;font-weight:700;margin-top:1px}' +
    '.q-text{flex:1;font-size:.9rem;color:#1f2937}' +
    '.q-type{font-size:.75rem;color:#6b7280;background:#f3f4f6;padding:2px 8px;border-radius:10px;margin-left:auto;white-space:nowrap}' +
    '.q-req{color:#ef4444;font-weight:700;margin-left:4px}' +
    '.opts{display:flex;gap:6px;flex-wrap:wrap;margin:4px 0 4px 32px}' +
    '.opt{padding:3px 10px;border-radius:12px;font-size:.78rem;font-weight:600;color:#fff}' +
    '.preview-logo{max-width:220px;max-height:90px;object-fit:contain;margin:0 auto 18px;display:block}' +
    '.cover{text-align:center;padding:60px 0 40px;border-bottom:2px solid #4f46e5;margin-bottom:32px}' +
    '.meta{display:flex;gap:24px;justify-content:center;margin-top:12px;font-size:.85rem;color:#6b7280}' +
    '.page-break{page-break-before:always}';
  var typeLabel = { multiple_choice:'Opciones', text:'Texto', number:'Numero', date:'Fecha', site:'Sitio', person:'Persona', location:'Ubicacion', checkbox:'Casilla' };
  var totalQ = 0; t.pages.forEach(function(p) { p.sections.forEach(function(s) { totalQ += s.questions.length; }); });
  var html = '<html><head><meta charset="UTF-8"><style>' + css + '</style></head><body>';
  html += '<div class="cover">';
  if (previewLogo) html += '<img class="preview-logo" src="' + previewLogo + '" alt="Logo">';
  html += '<h1>' + t.name + '</h1>';
  if (t.description) html += '<p style="color:#6b7280;margin-top:8px">' + t.description + '</p>';
  html += '<div class="meta"><span>' + t.pages.length + ' paginas</span><span>' + totalQ + ' preguntas</span><span>Estado: ' + (t.status === 'published' ? 'Publicada' : 'Borrador') + '</span>';
  if (t.tags && t.tags.length) html += '<span>Etiquetas: ' + t.tags.join(', ') + '</span>';
  html += '</div></div>';
  t.pages.forEach(function(p, pi) {
    if (pi > 0) html += '<div class="page-break"></div>';
    html += '<h2>' + (pi+1) + '. ' + (p.name || 'Pagina') + '</h2>';
    p.sections.forEach(function(s) {
      if (s.title) html += '<h3>' + s.title + '</h3>';
      var qNum = 0;
      s.questions.forEach(function(q) {
        qNum++;
        html += '<div class="q">';
        html += '<div class="q-num">' + qNum + '</div>';
        html += '<div class="q-text">' + (q.text || 'Sin texto') + (q.required ? '<span class="q-req">*</span>' : '') + '</div>';
        html += '<div class="q-type">' + (typeLabel[q.responseType] || q.responseType) + '</div>';
        html += '</div>';
        if (q.options && q.options.length) {
          html += '<div class="opts">';
          q.options.forEach(function(o) { html += '<span class="opt" style="background:' + (o.color || '#4f46e5') + '">' + (o.label || o.id) + '</span>'; });
          html += '</div>';
        }
      });
    });
  });
  html += '</body></html>';
  try {
    var browser = await puppeteer.launch({ headless: 'new' });
    var pg = await browser.newPage();
    await pg.setContent(html);
    var buf = await pg.pdf({ format: 'A4', margin: { top: '20mm', bottom: '20mm', left: '20mm', right: '20mm' } });
    await browser.close();
    res.setHeader('Content-disposition', 'attachment; filename=template-' + t.id + '.pdf');
    res.setHeader('Content-type', 'application/pdf');
    res.send(buf);
  } catch(e) { res.status(500).json({ error: 'PDF error: ' + e.message }); }
});

// ---- INSPECTION COMPARISON (Feature 10) ----
app.get('/api/inspections/compare', function(req, res) {
  var all = readJson(INSPECTIONS_FILE);
  var a = all.find(function(i) { return i.id === req.query.a; });
  var b = all.find(function(i) { return i.id === req.query.b; });
  if (!a || !b) return res.status(404).json({ error: 'One or both inspections not found' });
  var result = { a: { id: a.id, name: a.templateName, date: a.completedAt || a.startedAt, score: a.score, maxScore: a.maxScore }, b: { id: b.id, name: b.templateName, date: b.completedAt || b.startedAt, score: b.score, maxScore: b.maxScore }, questions: [] };
  var tmpl = a.snapshot;
  if (!tmpl) return res.status(400).json({ error: 'No snapshot' });
  tmpl.pages.forEach(function(p) { p.sections.forEach(function(sec) { sec.questions.forEach(function(q) { var aAns = a.answers && a.answers[q.id]; var bAns = b.answers && b.answers[q.id]; result.questions.push({ id: q.id, text: q.text, page: p.name, section: sec.title, aValue: aAns ? aAns.value : null, bValue: bAns ? bAns.value : null, diff: (aAns ? aAns.value : null) !== (bAns ? bAns.value : null) }); }); }); });
  res.json(result);
});

// HTML entry points
app.get('/editor/:id', (req, res) => res.sendFile(path.join(__dirname, 'public', 'editor.html')));
app.get('/inspector/:id', (req, res) => res.sendFile(path.join(__dirname, 'public', 'inspector.html')));
app.get('/actions', (req, res) => res.sendFile(path.join(__dirname, 'public', 'actions.html')));
app.get('/compare', (req, res) => res.sendFile(path.join(__dirname, 'public', 'compare.html')));
app.get('/settings', (req, res) => res.sendFile(path.join(__dirname, 'public', 'settings.html')));

// ---- SEARCH API ----
function normalizeText(str) {
  return (str || '').toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

app.get('/api/search', (req, res) => {
  const q = normalizeText(req.query.q || '');
  const type = req.query.type || 'all';
  if (q.length < 2) return res.json({ results: [] });

  const results = [];

  if (type === 'all' || type === 'templates') {
    const templates = readJson(TEMPLATES_FILE);
    for (const t of templates) {
      if (normalizeText(t.name).includes(q)) {
        results.push({ type: 'template', id: t.id,
          title: t.name, subtitle: `Plantilla · ${t.status}`,
          url: `/editor/${t.id}` });
      }
      for (const page of t.pages || []) {
        for (const section of page.sections || []) {
          for (const question of section.questions || []) {
            if (normalizeText(question.text).includes(q) ||
                normalizeText(question.helpText).includes(q)) {
              results.push({ type: 'question', id: t.id,
                title: question.text,
                subtitle: `En plantilla: ${t.name} › ${page.name} › ${section.title}`,
                url: `/editor/${t.id}` });
            }
          }
        }
      }
    }
  }

  if (type === 'all' || type === 'inspections') {
    const inspections = readJson(INSPECTIONS_FILE);
    for (const insp of inspections) {
      if (normalizeText(insp.code).includes(q) ||
          normalizeText(insp.templateName).includes(q)) {
        results.push({ type: 'inspection', id: insp.id,
          title: insp.code || insp.templateName,
          subtitle: `Inspección · ${insp.status} · ${insp.startedAt?.split('T')[0]}`,
          url: `/inspector/${insp.id}` });
      }
      for (const [qId, ans] of Object.entries(insp.answers || {})) {
        if (typeof ans.value === 'string' &&
            normalizeText(ans.value).includes(q)) {
          results.push({ type: 'answer', id: insp.id,
            title: ans.value,
            subtitle: `En inspección: ${insp.code || insp.templateName}`,
            url: `/inspector/${insp.id}` });
        }
        if (normalizeText(ans.note).includes(q)) {
          results.push({ type: 'note', id: insp.id,
            title: ans.note,
            subtitle: `Nota en: ${insp.code || insp.templateName}`,
            url: `/inspector/${insp.id}` });
        }
        const actionDesc = ans.action?.description || (typeof ans.action === 'string' ? ans.action : '');
        if (normalizeText(actionDesc).includes(q)) {
          results.push({ type: 'action', id: insp.id,
            title: actionDesc,
            subtitle: `Acción en: ${insp.code || insp.templateName}`,
            url: `/actions` });
        }
      }
    }
  }

  const seen = new Set();
  const deduped = results.filter(r => {
    const key = `${r.type}-${r.id}-${r.title}`;
    if (seen.has(key)) return false;
    seen.add(key); return true;
  }).slice(0, 50);

  res.json({ results: deduped, total: deduped.length, query: q });
});

// App listen is handled inside async IIFE
