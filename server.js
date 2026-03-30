'use strict';

// Load environment variables first
require('dotenv').config();

const express = require('express');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const archiver = require('archiver');

// Application modules
const constants = require('./config/constants');
const { initLogger, getLogger, requestLogger, errorLogger } = require('./lib/logger');
const { errorHandler } = require('./lib/errors');
const cache = require('./lib/cache');
const { setupSwagger } = require('./lib/swagger');
const security = require('./security');
const ssrfGuard = require('./lib/ssrf-puppeteer');
const db = require('./lib/db');
const buildPdfHtml = require('./pdf_report');
const buildStandaloneHtml = require('./standalone_inspection');

// Route modules
const { registerAdminRoutes } = require('./routes/admin');
const { registerInspectionRoutes } = require('./routes/inspections');
const { registerPageRoutes } = require('./routes/pages');
const { registerSearchRoutes } = require('./routes/search');
const { registerTemplateRoutes } = require('./routes/templates');

// Utility modules
const {
  ensureDir,
  readJson: readJsonFile,
  writeJsonAtomic,
  createBackupArchive,
  importBackupArchive
} = require('./lib/storage');

const {
  sanitizeTemplateInput,
  sanitizeInspectionPatch,
  sanitizeConfigPatch,
  sanitizeWebhookInput,
  sanitizeString,
  validateTemplate,
  validateInspection,
  validateWebhook,
  validateConfig
} = require('./lib/validation');

const {
  hashPin,
  verifyPin,
  createSession,
  destroySession,
  setSessionCookie,
  clearSessionCookie,
  isAuthenticated
} = require('./lib/auth');

const { deepClone, deepCloneWithNewIds, regenerateIds } = require('./lib/template-utils');
const { calculateInspectionScore } = require('./lib/scoring');
const packageVersion = require('./package.json').version;

// ===================================================================
// MAIN SERVER INITIALIZATION
// ===================================================================

async function startServer() {
  const app = express();
  const PORT = constants.SERVER.PORT;
  const HOST = constants.SERVER.HOST;
  let logger = console; // Fallback until logger is initialized

  try {
    // ─────────────────────────────────────────────────────────────
    // 1. INITIALIZE DATA PATHS
    // ─────────────────────────────────────────────────────────────
    const envPaths = (await import('env-paths')).default;
    const paths = envPaths('auditorlibre');
    let dataDir = process.env.DATA_DIR || paths.data;

    // Load config to potentially override dataDir
    const initialConfigPath = path.join(dataDir, 'config.json');
    if (fs.existsSync(initialConfigPath)) {
      try {
        const rawConfig = JSON.parse(fs.readFileSync(initialConfigPath, 'utf8'));
        if (rawConfig.dataPath) {
          dataDir = rawConfig.dataPath;
        }
      } catch (e) {
        console.error('Error reading initial config:', e.message);
      }
    }

    // Create directories
    ensureDir(dataDir);
    const uploadsDir = path.join(dataDir, 'uploads');
    const BACKUPS_DIR = path.join(dataDir, 'backups');
    ensureDir(uploadsDir);
    ensureDir(BACKUPS_DIR);

    // ─────────────────────────────────────────────────────────────
    // 2. INITIALIZE LOGGING
    // ─────────────────────────────────────────────────────────────
    logger = initLogger(dataDir);
    logger.info('Starting Auditor Libre...', {
      version: packageVersion,
      nodeVersion: process.version,
      env: constants.SERVER.ENV,
      dataDir
    });

    // ─────────────────────────────────────────────────────────────
    // 3. INITIALIZE DATABASE
    // ─────────────────────────────────────────────────────────────
    logger.info('Initializing database...');
    db.initDb(dataDir);

    // ─────────────────────────────────────────────────────────────
    // 4. DATA MIGRATION (from JSON to SQLite)
    // ─────────────────────────────────────────────────────────────
    const TEMPLATES_FILE = path.join(dataDir, 'templates.json');
    const INSPECTIONS_FILE = path.join(dataDir, 'inspections.json');
    const CONFIG_FILE = path.join(dataDir, 'config.json');
    const TOKENS_FILE = path.join(dataDir, 'inspection_tokens.json');
    const LIBRARY_FILE = path.join(dataDir, 'library.json');

    await migrateDataFiles({
      logger,
      CONFIG_FILE,
      TEMPLATES_FILE,
      INSPECTIONS_FILE,
      LIBRARY_FILE
    });

    // ─────────────────────────────────────────────────────────────
    // 5. INITIALIZE FILE UPLOAD MIDDLEWARE
    // ─────────────────────────────────────────────────────────────
    const upload = security.createUpload(uploadsDir);
    const importUpload = security.createImportUpload(uploadsDir);
    const brandingUpload = security.createBrandingUpload(uploadsDir);

    // ─────────────────────────────────────────────────────────────
    // 6. CONFIGURE EXPRESS MIDDLEWARE
    // ─────────────────────────────────────────────────────────────
    logger.info('Configuring middleware...');

    // Request ID
    app.use((req, res, next) => {
      req.id = req.headers['x-request-id'] || uuidv4();
      res.setHeader('X-Request-ID', req.id);
      next();
    });

    // Request logging
    if (constants.SERVER.ENV !== 'test') {
      app.use(requestLogger);
    }

    // Body parsing
    app.use(express.json({ limit: '10mb' }));
    app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Security headers with proper CSP
    app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          scriptSrcAttr: ["'none'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", "data:", "blob:"],
          connectSrc: ["'self'"],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'", "blob:"],
          frameSrc: ["'none'"]
        }
      },
      crossOriginEmbedderPolicy: false
    }));

    // Input sanitization
    app.use(security.sanitizeBody);

    // Rate limiting
    app.use('/api/', rateLimit({
      windowMs: constants.RATE_LIMIT.GENERAL.WINDOW_MS,
      max: constants.RATE_LIMIT.GENERAL.MAX_REQUESTS,
      standardHeaders: true,
      legacyHeaders: false,
      message: { error: 'Too many requests. Please wait a moment.' }
    }));

    app.use('/api/inspections/:id/export', rateLimit({
      windowMs: constants.RATE_LIMIT.EXPORT.WINDOW_MS,
      max: constants.RATE_LIMIT.EXPORT.MAX_REQUESTS,
      standardHeaders: true,
      legacyHeaders: false,
      message: { error: 'Too many export requests. Please wait.' }
    }));

    // Static file serving
    const publicDir = path.join(__dirname, 'public');
    app.use(express.static(publicDir));
    app.use('/uploads', express.static(uploadsDir));

    // ─────────────────────────────────────────────────────────────
    // 7. INITIALIZE CACHE
    // ─────────────────────────────────────────────────────────────
    logger.info('Warming cache...');
    await cache.warmCache(db);

    // ─────────────────────────────────────────────────────────────
    // 8. HEALTH CHECK ENDPOINTS
    // ─────────────────────────────────────────────────────────────
    app.get('/health', (req, res) => {
      const health = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: packageVersion
      };

      // Check database
      try {
        db.getDb().prepare('SELECT 1').get();
        health.database = 'connected';
      } catch (err) {
        health.status = 'unhealthy';
        health.database = 'disconnected';
        logger.error('Health check: database error', { error: err.message });
        return res.status(503).json(health);
      }

      // Check disk space
      try {
        const stats = fs.statfsSync ? fs.statfsSync(dataDir) : null;
        if (stats) {
          const freePercentage = (stats.bavail / stats.blocks) * 100;
          if (freePercentage < 10) {
            health.status = 'degraded';
            health.diskSpace = 'low';
          } else {
            health.diskSpace = 'ok';
          }
        }
      } catch (err) {
        health.diskSpace = 'unknown';
      }

      const statusCode = health.status === 'healthy' ? 200 : 503;
      res.status(statusCode).json(health);
    });

    // Kubernetes-style probes
    app.get('/healthz', (req, res) => res.status(200).send('OK'));

    app.get('/readyz', (req, res) => {
      try {
        db.getDb().prepare('SELECT 1').get();
        res.status(200).send('OK');
      } catch (err) {
        logger.error('Readiness check failed', { error: err.message });
        res.status(503).send('Not ready');
      }
    });

    // ─────────────────────────────────────────────────────────────
    // 9. REGISTER ROUTE HANDLERS
    // ─────────────────────────────────────────────────────────────
    logger.info('Registering routes...');

    // Helper functions for routes
    const inspectionTokens = new Map();
    loadInspectionTokens(inspectionTokens, TOKENS_FILE);

    const routeConfig = {
      app,
      fs,
      path,
      archiver,
      security,
      ssrfGuard,
      buildPdfHtml,
      buildStandaloneHtml,
      defaultTemplate,
      readJson,
      writeJson,
      now,
      uuid,
      getLocalIP,
      fileToBase64,
      filePathToBase64,
      setStandaloneCors,
      pruneInspectionTokens,
      saveInspectionTokens,
      inspectionTokens,
      sanitizeTemplateInput,
      sanitizeInspectionPatch,
      sanitizeConfigPatch,
      sanitizeWebhookInput,
      sanitizeString,
      validateTemplate,
      validateInspection,
      validateWebhook,
      validateConfig,
      deepCloneWithNewIds,
      regenerateIds,
      calculateInspectionScore,
      dispatchWebhook,
      hashPin,
      verifyPin,
      createSession,
      destroySession,
      setSessionCookie,
      clearSessionCookie,
      isAuthenticated,
      uuidv4,
      importBackupArchive,
      createBackupArchive,
      migrateData,
      publicDir,
      dataDir,
      uploadsDir,
      BACKUPS_DIR,
      CONFIG_FILE,
      TEMPLATES_FILE,
      INSPECTIONS_FILE,
      LIBRARY_FILE,
      TOKENS_FILE,
      PORT,
      packageVersion
    };

    // Create upload middleware functions
    const uploadSingle = (fieldName) => upload.single(fieldName);
    const importUploadSingle = (fieldName) => importUpload.single(fieldName);
    const brandingUploadSingle = (fieldName) => brandingUpload.single(fieldName);

    Object.assign(routeConfig, {
      uploadSingle,
      importUploadSingle,
      brandingUploadSingle
    });

    registerAdminRoutes(routeConfig);
    registerTemplateRoutes(routeConfig);
    registerInspectionRoutes(routeConfig);
    registerPageRoutes(routeConfig);
    registerSearchRoutes(routeConfig);

    // Additional API endpoints
    registerAdditionalRoutes(app, {
      dataDir,
      LIBRARY_FILE,
      INSPECTIONS_FILE,
      CONFIG_FILE,
      readJson,
      writeJson,
      uuid,
      now,
      dispatchWebhook
    });

    // ─────────────────────────────────────────────────────────────
    // 9.5. SETUP API DOCUMENTATION
    // ─────────────────────────────────────────────────────────────
    if (constants.SERVER.ENV !== 'production') {
      logger.info('Setting up API documentation at /api-docs');
      setupSwagger(app);
    }

    // ─────────────────────────────────────────────────────────────
    // 10. ERROR HANDLING MIDDLEWARE (must be last)
    // ─────────────────────────────────────────────────────────────
    app.use(security.multerErrorHandler);
    app.use(errorLogger);
    app.use(errorHandler);

    // ─────────────────────────────────────────────────────────────
    // 11. START LISTENING
    // ─────────────────────────────────────────────────────────────
    const server = app.listen(PORT, HOST, () => {
      logger.info('Server started successfully', {
        port: PORT,
        host: HOST,
        dataDir,
        env: constants.SERVER.ENV
      });

      console.log('');
      console.log('╔══════════════════════════════════════╗');
      console.log('║        Auditor Libre  v2.0            ║');
      console.log('╚══════════════════════════════════════╝');
      console.log('  URL:  http://' + HOST + ':' + PORT);
      console.log('  Data: ' + dataDir);
      console.log('  Env:  ' + constants.SERVER.ENV);
      console.log('');

      // Desktop notifications only make sense in local development.
      if (constants.SERVER.ENV !== 'production') {
        try {
          const notifier = require('node-notifier');
          notifier.notify({
            title: 'Auditor Libre',
            message: `Server started on http://${HOST}:${PORT}`,
            timeout: 5
          });
        } catch (e) {
          // Ignore notification errors
        }
      }

      // Signal PM2 that app is ready
      if (process.send) {
        process.send('ready');
      }
    });

    // ─────────────────────────────────────────────────────────────
    // 12. GRACEFUL SHUTDOWN
    // ─────────────────────────────────────────────────────────────
    const gracefulShutdown = async (signal) => {
      logger.info(`Received ${signal}, shutting down gracefully...`);

      // Stop accepting new connections
      server.close(() => {
        logger.info('HTTP server closed');

        // Close database
        try {
          db.getDb().close();
          logger.info('Database closed');
        } catch (err) {
          logger.error('Error closing database', { error: err.message });
        }

        logger.info('Shutdown complete');
        process.exit(0);
      });

      // Force shutdown after 10 seconds
      setTimeout(() => {
        logger.error('Forcing shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

  } catch (err) {
    logger.error('Fatal error during startup', {
      error: err.message,
      stack: err.stack
    });
    process.exit(1);
  }
}

// ===================================================================
// HELPER FUNCTIONS
// ===================================================================

async function migrateDataFiles({ logger, CONFIG_FILE, TEMPLATES_FILE, INSPECTIONS_FILE, LIBRARY_FILE }) {
  logger.info('Running data migrations...');

  // Migrate config
  if (fs.existsSync(CONFIG_FILE)) {
    try {
      const oldConfig = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
      db.saveConfig(oldConfig);
      fs.renameSync(CONFIG_FILE, CONFIG_FILE + '.migrated.bak');
      logger.info('Migrated config.json');
    } catch (e) {
      logger.error('Error migrating config', { error: e.message });
    }
  }

  // Migrate templates
  if (fs.existsSync(TEMPLATES_FILE)) {
    try {
      const oldTemplates = JSON.parse(fs.readFileSync(TEMPLATES_FILE, 'utf8'));
      if (Array.isArray(oldTemplates)) {
        oldTemplates.forEach(t => db.saveTemplate(t.id, t));
        logger.info(`Migrated ${oldTemplates.length} templates`);
      }
      fs.renameSync(TEMPLATES_FILE, TEMPLATES_FILE + '.migrated.bak');
    } catch (e) {
      logger.error('Error migrating templates', { error: e.message });
    }
  }

  // Migrate inspections
  if (fs.existsSync(INSPECTIONS_FILE)) {
    try {
      const oldInspections = JSON.parse(fs.readFileSync(INSPECTIONS_FILE, 'utf8'));
      if (Array.isArray(oldInspections)) {
        oldInspections.forEach(i => db.saveInspection(i.id, i.templateId, i));
        logger.info(`Migrated ${oldInspections.length} inspections`);
      }
      fs.renameSync(INSPECTIONS_FILE, INSPECTIONS_FILE + '.migrated.bak');
    } catch (e) {
      logger.error('Error migrating inspections', { error: e.message });
    }
  }

  // Migrate library
  if (fs.existsSync(LIBRARY_FILE)) {
    try {
      const oldLibrary = JSON.parse(fs.readFileSync(LIBRARY_FILE, 'utf8'));
      if (Array.isArray(oldLibrary)) {
        oldLibrary.forEach(q => db.saveLibraryItem(q.id, q));
        logger.info(`Migrated ${oldLibrary.length} library items`);
      }
      fs.renameSync(LIBRARY_FILE, LIBRARY_FILE + '.migrated.bak');
    } catch (e) {
      logger.error('Error migrating library', { error: e.message });
    }
  }

  logger.info('Migrations complete');
}

function readJson(file, fallback) {
  if (file.includes('config.json')) return db.getConfig(fallback);
  if (file.includes('templates.json')) return db.getAllTemplates();
  if (file.includes('inspections.json')) return db.getAllInspections();
  if (file.includes('library.json')) return db.getLibrary();
  return fallback;
}

function writeJson(file, data) {
  if (file.includes('config.json')) return db.saveConfig(data);

  if (file.includes('templates.json') && Array.isArray(data)) {
    data.forEach(t => db.saveTemplate(t.id, t));
    return;
  }

  if (file.includes('inspections.json') && Array.isArray(data)) {
    data.forEach(i => db.saveInspection(i.id, i.templateId, i));
    return;
  }

  if (file.includes('library.json') && Array.isArray(data)) {
    data.forEach(q => db.saveLibraryItem(q.id, q));
    return;
  }
}

function now() {
  return new Date().toISOString();
}

function uuid() {
  return uuidv4();
}

function fileToBase64(filename, uploadsDir) {
  const filePath = path.join(uploadsDir, filename);
  if (!fs.existsSync(filePath)) return null;

  const ext = path.extname(filename).slice(1).toLowerCase();
  const mimeTypes = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
    svg: 'image/svg+xml',
    ico: 'image/x-icon'
  };
  const mime = mimeTypes[ext] || 'image/jpeg';
  const data = fs.readFileSync(filePath).toString('base64');

  return `data:${mime};base64,${data}`;
}

function filePathToBase64(relPath, dataDir) {
  if (!relPath) return null;
  const filePath = path.join(dataDir, relPath);
  if (!fs.existsSync(filePath)) return null;

  const ext = path.extname(filePath).slice(1).toLowerCase();
  const mimeTypes = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
    svg: 'image/svg+xml',
    ico: 'image/x-icon'
  };
  const mime = mimeTypes[ext] || 'application/octet-stream';
  const data = fs.readFileSync(filePath).toString('base64');

  return `data:${mime};base64,${data}`;
}

function setStandaloneCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function loadInspectionTokens(tokensMap, TOKENS_FILE) {
  tokensMap.clear();
  const tokens = readJsonFile(TOKENS_FILE, []);
  if (Array.isArray(tokens)) {
    tokens.forEach((entry) => {
      if (!entry || !entry.token) return;
      if (entry.expiresAt && new Date(entry.expiresAt) < new Date()) return;
      tokensMap.set(entry.token, entry);
    });
  }
}

function saveInspectionTokens(tokensMap, TOKENS_FILE) {
  writeJsonAtomic(TOKENS_FILE, Array.from(tokensMap.values()), { backup: false });
}

function pruneInspectionTokens(tokensMap, TOKENS_FILE) {
  let changed = false;
  tokensMap.forEach((value, key) => {
    if (value && value.expiresAt && new Date(value.expiresAt) < new Date()) {
      tokensMap.delete(key);
      changed = true;
    }
  });
  if (changed) saveInspectionTokens(tokensMap, TOKENS_FILE);
}

const os = require('os');
function getLocalIP() {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  return 'localhost';
}

function defaultTemplate(name) {
  const t = now();
  return {
    id: uuid(),
    name: name || 'Nueva Plantilla',
    description: '',
    status: 'draft',
    publishedAt: null,
    publishedVersions: [],
    tags: [],
    schedule: null,
    createdAt: t,
    updatedAt: t,
    lockedBy: null,
    lockedAt: null,
    severityLevels: [
      { id: uuid(), key: 'critical', label: 'Crítico', color: '#dc2626', icon: '🔴', order: 1 },
      { id: uuid(), key: 'major', label: 'Mayor', color: '#d97706', icon: '🟡', order: 2 },
      { id: uuid(), key: 'minor', label: 'Menor', color: '#2563eb', icon: '🔵', order: 3 },
      { id: uuid(), key: 'observation', label: 'Observación', color: '#16a34a', icon: '🟢', order: 4 }
    ],
    settings: {
      defaultNotes: true,
      defaultMedia: true,
      defaultActions: true,
      defaultRequired: false
    },
    report: {
      pageSize: 'A4',
      showCover: true,
      showTOC: true,
      showScore: true,
      showFlaggedItems: true,
      logoPath: null,
      coverImagePath: null
    },
    questionLibrary: [],
    pages: [{
      id: uuid(),
      name: 'Portada',
      type: 'cover',
      sections: [{
        id: uuid(),
        title: '',
        repeatable: false,
        minInstances: 1,
        maxInstances: null,
        addButtonLabel: "",
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

// Data migration helper
function migrateData(dataDir) {
  // This function is now empty since migration is handled in startServer
  // Kept for backwards compatibility with routes
}

async function dispatchWebhook(event, payload) {
  const config = db.getConfig() || {};
  const hooks = (config.webhooks || []).filter(h => h.enabled && h.events.includes(event));

  for (const hook of hooks) {
    await _dispatchHook(hook, event, payload, false);
  }
}

async function _dispatchHook(hook, event, payload, isRetry) {
  const logger = getLogger();
  const body = JSON.stringify({
    event,
    timestamp: new Date().toISOString(),
    source: 'auditorlibre',
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
    const parsed = new URL(hook.url);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new Error('Invalid protocol');
    }

    const ipCheck = await ssrfGuard.checkNotPrivateIP(parsed.hostname);
    if (!ipCheck.ok) {
      throw new Error('SSRF blocked: ' + ipCheck.error);
    }

    const res = await fetch(hook.url, {
      method: 'POST',
      headers,
      body,
      redirect: 'manual',
      signal: AbortSignal.timeout(constants.WEBHOOK.TIMEOUT_MS)
    });

    updateWebhookStatus(hook.id, res.status, res.ok);
    logger.info('Webhook dispatched', { hookId: hook.id, event, status: res.status });
  } catch (err) {
    logger.error('Webhook error', { hookId: hook.id, event, error: err.message });
    updateWebhookStatus(hook.id, null, false, err.message);

    if (hook.retryOnFailure && !isRetry) {
      setTimeout(() => _dispatchHook(hook, event, payload, true), constants.WEBHOOK.RETRY_DELAY_MS);
    }
  }
}

function updateWebhookStatus(hookId, status, ok, error) {
  const config = db.getConfig() || {};
  const hook = config.webhooks?.find(h => h.id === hookId);
  if (hook) {
    hook.lastTriggeredAt = new Date().toISOString();
    hook.lastStatus = ok ? 'success' : `error${status ? ` (${status})` : ''}`;
    if (error) hook.lastError = error;
    db.saveConfig(config);
  }
}

function registerAdditionalRoutes(app, ctx) {
  const { dataDir, LIBRARY_FILE, INSPECTIONS_FILE, CONFIG_FILE, readJson, writeJson, uuid, now, dispatchWebhook } = ctx;

  // i18n endpoint with caching
  app.get('/api/i18n/:lang', cache.cacheControl(constants.CACHE.I18N_TTL), (req, res) => {
    const lang = req.params.lang === 'en' ? 'en' : 'es';
    const filePath = path.join(__dirname, 'i18n', `${lang}.json`);

    if (fs.existsSync(filePath)) {
      const etag = cache.generateETag(filePath);
      res.set('ETag', etag);

      if (req.headers['if-none-match'] === etag) {
        return res.status(304).end();
      }

      res.json(JSON.parse(fs.readFileSync(filePath, 'utf8')));
    } else {
      res.status(404).json({ error: 'Language not found' });
    }
  });

  // Analytics stats
  app.get('/api/analytics/stats', (req, res) => {
    const inspections = db.getAllInspections();
    const completed = inspections.filter(i => i.status === 'completed');
    const totalScore = completed.reduce((acc, i) => acc + (i.score || 0), 0);
    const totalMax = completed.reduce((acc, i) => acc + (i.maxScore || 0), 0);
    const avgScore = totalMax > 0 ? (totalScore / totalMax * 100) : 0;

    const severities = { critical: 0, major: 0, minor: 0, observation: 0 };
    inspections.forEach(i => {
      if (i.answers) {
        Object.values(i.answers).forEach(ans => {
          if (ans && ans.flagged && ans.severity) {
            severities[ans.severity] = (severities[ans.severity] || 0) + 1;
          }
        });
      }
    });

    res.json({
      total: inspections.length,
      completedCount: completed.length,
      avgScore: Math.round(avgScore),
      severities
    });
  });

  // Library endpoints
  app.get('/api/library', (req, res) => {
    res.json(readJson(LIBRARY_FILE));
  });

  app.post('/api/library', (req, res) => {
    const lib = readJson(LIBRARY_FILE);
    const q = req.body;
    q.id = uuid();
    q.savedAt = now();
    q.usageCount = 0;
    lib.push(q);
    writeJson(LIBRARY_FILE, lib);
    res.status(201).json(q);
  });

  app.delete('/api/library/:id', (req, res) => {
    db.deleteLibraryItem(req.params.id);
    res.json({ ok: true });
  });

  app.post('/api/library/:id/use', (req, res) => {
    const lib = readJson(LIBRARY_FILE);
    const q = lib.find(x => x.id === req.params.id);
    if (!q) return res.status(404).json({ error: 'Not found' });
    q.usageCount = (q.usageCount || 0) + 1;
    writeJson(LIBRARY_FILE, lib);
    res.json(q);
  });

  // Actions endpoints - now using database table
  app.get('/api/actions', (req, res) => {
    const actions = db.getAllActions(req.query);
    res.json(actions);
  });

  app.put('/api/actions/:inspectionId/:questionId', security.validate(security.validateActionUpdate), (req, res) => {
    const actionId = `${req.params.inspectionId}-${req.params.questionId}`;

    db.updateAction(actionId, {
      status: req.body.status,
      assignedTo: req.body.assignedTo,
      deadline: req.body.deadline,
      description: req.body.description
    });

    dispatchWebhook('action.status_changed', {
      inspectionId: req.params.inspectionId,
      questionId: req.params.questionId,
      newStatus: req.body.status,
      assignedTo: req.body.assignedTo
    });

    res.json({ ok: true });
  });

  // Cache stats endpoint (for debugging)
  app.get('/api/debug/cache-stats', (req, res) => {
    if (constants.SERVER.ENV === 'production') {
      return res.status(404).end();
    }
    res.json(cache.getStats());
  });
}

// ===================================================================
// START SERVER
// ===================================================================

if (require.main === module) {
  startServer().catch(err => {
    console.error('Failed to start server:', err);
    process.exit(1);
  });
}

module.exports = { startServer };
