'use strict';

const AdmZip = require('adm-zip');
const QRCode = require('qrcode');

function registerTemplateRoutes(deps) {
  const {
    app,
    fs,
    path,
    archiver,
    security,
    ssrfGuard,
    buildStandaloneHtml,
    defaultTemplate,
    readJson,
    writeJson,
    now,
    uuid,
    getLocalIP,
    filePathToBase64,
    setStandaloneCors,
    pruneInspectionTokens,
    saveInspectionTokens,
    inspectionTokens,
    sanitizeTemplateInput,
    validateTemplate,
    validateInspection,
    deepCloneWithNewIds,
    regenerateIds,
    calculateInspectionScore,
    dispatchWebhook,
    brandingUploadSingle,
    importUploadSingle,
    publicDir,
    dataDir,
    uploadsDir,
    TEMPLATES_FILE,
    INSPECTIONS_FILE,
    CONFIG_FILE,
    PORT
  } = deps;

  function collectReferencedFiles(template) {
    const files = new Set();

    function extractFilename(url) {
      if (!url || url.startsWith('data:')) return null;
      if (!url.includes('/uploads/')) return null;
      return url.split('/uploads/').pop().split('?')[0];
    }

    (template.pages || []).forEach(function(page) {
      (page.sections || []).forEach(function(section) {
        (section.questions || []).forEach(function(question) {
          const filename = extractFilename(question.helpImage || question.helpMedia);
          if (filename) files.add(filename);
        });
      });
    });

    return Array.from(files);
  }

  const exampleCatalogDir = path.join(__dirname, '../templates/catalog');

  function listExampleTemplateFiles(rootDir, currentDir) {
    if (!fs.existsSync(currentDir)) return [];
    return fs.readdirSync(currentDir, { withFileTypes: true }).flatMap(function(entry) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) return listExampleTemplateFiles(rootDir, fullPath);
      if (!entry.isFile() || path.extname(entry.name).toLowerCase() !== '.json') return [];
      const relativePath = path.relative(rootDir, fullPath).replace(/\\/g, '/');
      return [{
        fullPath,
        relativePath,
        slug: relativePath.replace(/\.json$/i, '').replace(/\//g, '--')
      }];
    });
  }

  function extractLegalRefs(tags) {
    return (Array.isArray(tags) ? tags : []).filter(function(tag) {
      const normalized = String(tag || '').toLowerCase();
      return normalized.indexOf('ley-') === 0 || normalized.indexOf('decreto-') === 0 || normalized.indexOf('res-') === 0;
    });
  }

  function readExampleCatalog() {
    return listExampleTemplateFiles(exampleCatalogDir, exampleCatalogDir).map(function(fileInfo) {
      const raw = fs.readFileSync(fileInfo.fullPath, 'utf8');
      const parsed = JSON.parse(raw);
      const category = fileInfo.relativePath.split('/')[0] || 'general';
      const tags = Array.isArray(parsed.tags) ? parsed.tags : [];
      const legalRefs = extractLegalRefs(tags);
      return {
        slug: fileInfo.slug,
        file: fileInfo.relativePath,
        category,
        name: parsed.name || path.basename(fileInfo.relativePath, '.json'),
        description: parsed.description || '',
        tags,
        legalRefs,
        legalFocus: legalRefs.length > 0,
        pageCount: Array.isArray(parsed.pages) ? parsed.pages.length : 0,
        sectionCount: Array.isArray(parsed.pages)
          ? parsed.pages.reduce(function(total, page) {
            return total + ((page && Array.isArray(page.sections)) ? page.sections.length : 0);
          }, 0)
          : 0
      };
    }).sort(function(a, b) {
      return String(a.name || '').localeCompare(String(b.name || ''), 'es');
    });
  }

  function loadExampleTemplateBySlug(slug) {
    const catalogEntry = listExampleTemplateFiles(exampleCatalogDir, exampleCatalogDir).find(function(item) {
      return item.slug === slug;
    });
    if (!catalogEntry) return null;
    return {
      meta: {
        slug: catalogEntry.slug,
        file: catalogEntry.relativePath,
        category: catalogEntry.relativePath.split('/')[0] || 'general'
      },
      template: JSON.parse(fs.readFileSync(catalogEntry.fullPath, 'utf8'))
    };
  }

  app.get('/api/templates', (req, res) => {
    const templates = readJson(TEMPLATES_FILE);
    const inspections = readJson(INSPECTIONS_FILE);
    const today = new Date().toISOString().slice(0, 10);

    res.json(templates.map(function(template) {
      let expiryStatus = null;
      if (template.expiry && template.expiry.date) {
        if (template.expiry.date < today) expiryStatus = 'expired';
        else {
          const daysLeft = Math.ceil((new Date(template.expiry.date) - new Date()) / 86400000);
          expiryStatus = daysLeft <= (template.expiry.warnDays || 7) ? 'warning' : 'ok';
        }
      }

      return {
        id: template.id,
        name: template.name,
        status: template.status,
        updatedAt: template.updatedAt,
        pageCount: template.pages ? template.pages.length : 0,
        tags: template.tags || [],
        schedule: template.schedule || null,
        expiry: template.expiry || null,
        expiryStatus,
        inspectionCount: inspections.filter(function(inspection) {
          return inspection.templateId === template.id;
        }).length
      };
    }));
  });

  app.get('/api/templates/examples', (req, res) => {
    try {
      res.json(readExampleCatalog());
    } catch (error) {
      res.status(500).json({ error: 'EXAMPLE_CATALOG_ERROR' });
    }
  });

  app.get('/api/templates/examples/:slug', (req, res) => {
    try {
      const loaded = loadExampleTemplateBySlug(req.params.slug);
      if (!loaded) return res.status(404).json({ error: 'EXAMPLE_NOT_FOUND' });

      const template = loaded.template || {};
      const pages = Array.isArray(template.pages) ? template.pages : [];
      const sectionCount = pages.reduce(function(total, page) {
        return total + (((page && page.sections) || []).length);
      }, 0);
      const questionCount = pages.reduce(function(total, page) {
        return total + ((page.sections || []).reduce(function(sectionTotal, section) {
          return sectionTotal + (((section && section.questions) || []).length);
        }, 0));
      }, 0);
      const repeatableSectionCount = pages.reduce(function(total, page) {
        return total + ((page.sections || []).filter(function(section) { return !!section.repeatable; }).length);
      }, 0);
      const tags = Array.isArray(template.tags) ? template.tags : [];
      const legalRefs = extractLegalRefs(tags);

      res.json({
        slug: loaded.meta.slug,
        file: loaded.meta.file,
        category: loaded.meta.category,
        name: template.name || loaded.meta.slug,
        description: template.description || '',
        tags,
        legalRefs,
        legalFocus: legalRefs.length > 0,
        pageCount: pages.length,
        sectionCount,
        questionCount,
        repeatableSectionCount,
        report: template.report || {},
        pages: pages.map(function(page) {
          return {
            id: page.id,
            name: page.name,
            type: page.type || 'inspection',
            sectionCount: Array.isArray(page.sections) ? page.sections.length : 0,
            questionCount: (page.sections || []).reduce(function(total, section) {
              return total + (((section && section.questions) || []).length);
            }, 0),
            sections: (page.sections || []).map(function(section) {
              return {
                id: section.id,
                title: section.title || '',
                repeatable: !!section.repeatable,
                questionCount: Array.isArray(section.questions) ? section.questions.length : 0
              };
            })
          };
        })
      });
    } catch (error) {
      res.status(500).json({ error: 'EXAMPLE_DETAIL_ERROR' });
    }
  });

  app.get('/api/templates/:id', (req, res) => {
    if (req.params.id === 'import') return res.status(404).end();
    const template = readJson(TEMPLATES_FILE).find(function(item) { return item.id === req.params.id; });
    if (!template) return res.status(404).json({ error: 'Not found' });
    res.json(template);
  });

  app.get('/api/plantilla/:id', (req, res) => {
    const template = readJson(TEMPLATES_FILE).find(function(item) { return item.id === req.params.id; });
    if (!template) return res.status(404).json({ error: 'Not found' });
    res.json(template);
  });

  app.post('/api/templates', security.validate(security.validateTemplate), (req, res) => {
    const templates = readJson(TEMPLATES_FILE);
    const payload = sanitizeTemplateInput(req.body || {});
    const template = defaultTemplate(payload && payload.name);
    const validation = validateTemplate(template);
    if (!validation.ok) return res.status(400).json({ error: 'INVALID_TEMPLATE', details: validation.errors });
    templates.push(template);
    writeJson(TEMPLATES_FILE, templates);
    res.status(201).json(template);
  });

  app.post('/api/templates/:id/test-inspection', (req, res) => {
    const templates = readJson(TEMPLATES_FILE);
    const template = templates.find(function(item) { return item.id === req.params.id; });
    if (!template) return res.status(404).json({ error: 'Not found' });

    const validation = validateTemplate(template);
    if (!validation.ok) return res.status(400).json({ error: 'INVALID_TEMPLATE', details: validation.errors });

    const inspections = readJson(INSPECTIONS_FILE);
    const snapshot = JSON.parse(JSON.stringify(template));
    delete snapshot.publishedVersions;

    const inspection = {
      id: uuid(),
      templateId: template.id,
      templateName: template.name,
      code: null,
      snapshot,
      status: 'in_progress',
      startedAt: now(),
      completedAt: null,
      score: null,
      maxScore: null,
      answers: {},
      repeatableAnswers: {},
      sourceMeta: {
        mode: 'template-test',
        templateStatus: template.status || 'draft'
      }
    };

    const inspectionValidation = validateInspection(inspection);
    if (!inspectionValidation.ok) {
      return res.status(400).json({ error: 'INVALID_INSPECTION', details: inspectionValidation.errors });
    }

    inspections.push(inspection);
    writeJson(INSPECTIONS_FILE, inspections);
    res.status(201).json(inspection);
  });

  app.put('/api/templates/:id', security.validate(security.validateTemplate), (req, res) => {
    const templates = readJson(TEMPLATES_FILE);
    const index = templates.findIndex(function(item) { return item.id === req.params.id; });
    if (index === -1) return res.status(404).json({ error: 'Not found' });

    const existing = templates[index];
    const clientUpdatedAt = req.body._updatedAt;
    if (clientUpdatedAt && existing.updatedAt && new Date(clientUpdatedAt) < new Date(existing.updatedAt)) {
      return res.status(409).json({
        error: 'CONFLICT',
        message: 'Esta plantilla fue modificada por otro usuario mientras trabajabas.',
        serverUpdatedAt: existing.updatedAt,
        serverVersion: existing
      });
    }

    const sanitizedTemplate = sanitizeTemplateInput(req.body || {});
    templates[index] = {
      ...existing,
      ...sanitizedTemplate,
      id: existing.id,
      createdAt: existing.createdAt,
      updatedAt: now(),
      _updatedAt: undefined
    };

    const validation = validateTemplate(templates[index]);
    if (!validation.ok) return res.status(400).json({ error: 'INVALID_TEMPLATE', details: validation.errors });
    writeJson(TEMPLATES_FILE, templates);
    res.json(templates[index]);
  });

  app.post('/api/templates/:id/logo', brandingUploadSingle('file'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const templates = readJson(TEMPLATES_FILE);
    const index = templates.findIndex(function(item) { return item.id === req.params.id; });
    if (index === -1) return res.status(404).json({ error: 'Not found' });
    if (!templates[index].report) templates[index].report = {};
    templates[index].report.logoPath = 'uploads/' + req.file.filename;
    templates[index].updatedAt = now();
    writeJson(TEMPLATES_FILE, templates);
    res.json({ path: templates[index].report.logoPath });
  });

  app.delete('/api/templates/:id/logo', (req, res) => {
    const templates = readJson(TEMPLATES_FILE);
    const index = templates.findIndex(function(item) { return item.id === req.params.id; });
    if (index === -1) return res.status(404).json({ error: 'Not found' });
    if (!templates[index].report) templates[index].report = {};
    templates[index].report.logoPath = null;
    templates[index].updatedAt = now();
    writeJson(TEMPLATES_FILE, templates);
    res.json({ ok: true });
  });

  app.post('/api/templates/:id/cover-image', brandingUploadSingle('file'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const templates = readJson(TEMPLATES_FILE);
    const index = templates.findIndex(function(item) { return item.id === req.params.id; });
    if (index === -1) return res.status(404).json({ error: 'Not found' });
    if (!templates[index].report) templates[index].report = {};
    templates[index].report.coverImagePath = 'uploads/' + req.file.filename;
    templates[index].updatedAt = now();
    writeJson(TEMPLATES_FILE, templates);
    res.json({ path: templates[index].report.coverImagePath });
  });

  app.delete('/api/templates/:id/cover-image', (req, res) => {
    const templates = readJson(TEMPLATES_FILE);
    const index = templates.findIndex(function(item) { return item.id === req.params.id; });
    if (index === -1) return res.status(404).json({ error: 'Not found' });
    if (!templates[index].report) templates[index].report = {};
    templates[index].report.coverImagePath = null;
    templates[index].updatedAt = now();
    writeJson(TEMPLATES_FILE, templates);
    res.json({ ok: true });
  });

  app.post('/api/templates/:id/lock', (req, res) => {
    const templates = readJson(TEMPLATES_FILE);
    const template = templates.find(function(item) { return item.id === req.params.id; });
    if (!template) return res.status(404).json({ error: 'Not found' });
    template.lockedBy = req.body.lockedBy || null;
    template.lockedAt = template.lockedBy ? now() : null;
    writeJson(TEMPLATES_FILE, templates);
    res.json({ ok: true, lockedBy: template.lockedBy });
  });

  app.post('/api/templates/:id/unlock', (req, res) => {
    const templates = readJson(TEMPLATES_FILE);
    const template = templates.find(function(item) { return item.id === req.params.id; });
    if (!template) return res.status(404).json({ error: 'Not found' });
    template.lockedBy = null;
    template.lockedAt = null;
    writeJson(TEMPLATES_FILE, templates);
    res.json({ ok: true });
  });

  app.delete('/api/templates/:id', (req, res) => {
    const template = readJson(TEMPLATES_FILE).find(function(item) { return item.id === req.params.id; });
    if (!template) return res.status(404).json({ error: 'Not found' });
    const dbModule = require('../lib/db');
    dbModule.deleteTemplate(req.params.id);
    res.json({ ok: true });
  });

  app.post('/api/templates/:id/duplicate', (req, res) => {
    const templates = readJson(TEMPLATES_FILE);
    const existing = templates.find(function(item) { return item.id === req.params.id; });
    if (!existing) return res.status(404).json({ error: 'Not found' });

    const copy = regenerateIds(existing, uuid);
    copy.name = 'Copia de ' + existing.name;
    copy.status = 'draft';
    copy.publishedAt = null;
    copy.publishedVersions = [];
    copy.createdAt = now();
    copy.updatedAt = copy.createdAt;
    templates.push(copy);
    writeJson(TEMPLATES_FILE, templates);
    res.status(201).json(copy);
  });

  app.post('/api/templates/:id/publish', async (req, res) => {
    const templates = readJson(TEMPLATES_FILE);
    const index = templates.findIndex(function(item) { return item.id === req.params.id; });
    if (index === -1) return res.status(404).json({ error: 'Not found' });

    const template = templates[index];
    const snapshot = JSON.parse(JSON.stringify(template));
    snapshot.publishedVersions = undefined;
    if (!template.publishedVersions) template.publishedVersions = [];

    const versionNumber = template.publishedVersions.length + 1;
    const changeMessage = req.body && req.body.changeMessage;
    const publishedBy = req.body && req.body.publishedBy;

    template.publishedVersions.unshift({
      publishedAt: now(),
      changeMessage: changeMessage || '',
      publishedBy: publishedBy || '',
      versionNumber,
      snapshot
    });
    template.status = 'published';
    template.publishedAt = now();
    template.updatedAt = now();
    writeJson(TEMPLATES_FILE, templates);

    dispatchWebhook('template.published', {
      template: { id: template.id, name: template.name, versionNumber, changeMessage }
    });

    res.json(template);
  });

  app.post('/api/templates/:id/revert', (req, res) => {
    const templates = readJson(TEMPLATES_FILE);
    const index = templates.findIndex(function(item) { return item.id === req.params.id; });
    if (index === -1) return res.status(404).json({ error: 'Not found' });

    const template = templates[index];
    if (!template.publishedVersions || template.publishedVersions.length === 0) {
      return res.status(400).json({ error: 'No published versions' });
    }

    const versionIndex = req.body.versionIndex !== undefined
      ? req.body.versionIndex
      : (template.publishedVersions.length - 1);
    const snapshot = template.publishedVersions[versionIndex].snapshot;
    if (!snapshot) return res.status(400).json({ error: 'Invalid version' });

    templates[index] = {
      ...JSON.parse(JSON.stringify(snapshot)),
      publishedVersions: template.publishedVersions,
      updatedAt: now()
    };
    writeJson(TEMPLATES_FILE, templates);
    res.json(templates[index]);
  });

  app.get('/api/templates/:id/export', (req, res) => {
    const template = readJson(TEMPLATES_FILE).find(function(item) { return item.id === req.params.id; });
    if (!template) return res.status(404).json({ error: 'Not found' });
    res.setHeader('Content-disposition', 'attachment; filename=template-' + template.id + '.json');
    res.setHeader('Content-type', 'application/json');
    res.send(JSON.stringify(template, null, 2));
  });

  app.get('/api/templates/:id/export/html', (req, res) => {
    const template = readJson(TEMPLATES_FILE).find(function(item) { return item.id === req.params.id; });
    if (!template) return res.status(404).json({ error: 'Not found' });
    if (!template.publishedVersions || !template.publishedVersions[0] || !template.publishedVersions[0].snapshot || template.status !== 'published') {
      return res.status(400).json({ error: 'La plantilla debe estar publicada' });
    }

    const cssPath = path.join(publicDir, 'style.css');
    const css = fs.existsSync(cssPath) ? fs.readFileSync(cssPath, 'utf8') : '';
    const config = readJson(CONFIG_FILE);
    const html = buildStandaloneHtml({
      snapshot: template.publishedVersions[0].snapshot,
      logoB64: filePathToBase64(template.report && template.report.logoPath, dataDir),
      css,
      templateId: template.id,
      serverUrl: 'http://' + getLocalIP() + ':' + PORT,
      appName: config.branding && config.branding.appName,
      syncDestinations: config.syncDestinations || []
    });

    const safeName = String(template.name || 'plantilla').replace(/[^a-z0-9]+/gi, '_').toLowerCase();
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename=\"' + safeName + '_inspeccion.html\"');
    res.send(html);
  });

  app.post('/api/templates/:id/token', (req, res) => {
    pruneInspectionTokens();
    const template = readJson(TEMPLATES_FILE).find(function(item) { return item.id === req.params.id; });
    if (!template) return res.status(404).json({ error: 'Not found' });
    if (!template.publishedVersions || !template.publishedVersions[0] || !template.publishedVersions[0].snapshot || template.status !== 'published') {
      return res.status(400).json({ error: 'Plantilla no publicada' });
    }

    const crypto = require('crypto');
    const token = crypto.randomBytes(12).toString('hex');
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
    const record = {
      token,
      templateId: template.id,
      templateName: template.name,
      expiresAt,
      used: false,
      createdAt: now(),
      lastOpenedAt: null
    };

    inspectionTokens.set(token, record);
    saveInspectionTokens();

    res.json({
      token,
      url: 'http://' + getLocalIP() + ':' + PORT + '/i/' + token,
      expiresAt
    });
  });

  app.get('/i/:token', (req, res) => {
    pruneInspectionTokens();
    const record = inspectionTokens.get(req.params.token);
    if (!record) {
      return res.status(404).send('<!DOCTYPE html><html lang=\"es\"><body style=\"font-family:system-ui,sans-serif;text-align:center;padding:40px\"><h2>Link invalido o expirado</h2><p>Pedi uno nuevo al administrador.</p></body></html>');
    }

    if (record.expiresAt && new Date(record.expiresAt) < new Date()) {
      inspectionTokens.delete(req.params.token);
      saveInspectionTokens();
      return res.status(410).send('<!DOCTYPE html><html lang=\"es\"><body style=\"font-family:system-ui,sans-serif;text-align:center;padding:40px\"><h2>Link expirado</h2><p>Este link era valido por 48 horas. Pedi uno nuevo.</p></body></html>');
    }

    const template = readJson(TEMPLATES_FILE).find(function(item) { return item.id === record.templateId; });
    if (!template || template.status !== 'published' || !template.publishedVersions || !template.publishedVersions[0] || !template.publishedVersions[0].snapshot) {
      return res.status(404).send('<!DOCTYPE html><html lang=\"es\"><body style=\"font-family:system-ui,sans-serif;text-align:center;padding:40px\"><h2>Plantilla no disponible</h2><p>La plantilla ya no esta publicada.</p></body></html>');
    }

    record.used = true;
    record.lastOpenedAt = now();
    inspectionTokens.set(req.params.token, record);
    saveInspectionTokens();

    const cssPath = path.join(publicDir, 'style.css');
    const css = fs.existsSync(cssPath) ? fs.readFileSync(cssPath, 'utf8') : '';
    const config = readJson(CONFIG_FILE);
    const html = buildStandaloneHtml({
      snapshot: template.publishedVersions[0].snapshot,
      logoB64: filePathToBase64(template.report && template.report.logoPath, dataDir),
      css,
      templateId: template.id,
      serverUrl: 'http://' + getLocalIP() + ':' + PORT,
      appName: config.branding && config.branding.appName,
      syncDestinations: config.syncDestinations || []
    });

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.send(html);
  });

  app.post('/api/templates/import', importUploadSingle('file'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    try {
      const raw = fs.readFileSync(req.file.path, 'utf8');
      const parsed = JSON.parse(raw);
      const validation = validateTemplate(parsed);
      if (!validation.ok) throw new Error(validation.errors.join(' | '));

      const templates = readJson(TEMPLATES_FILE);
      const imported = deepCloneWithNewIds(parsed, uuid);
      imported.createdAt = now();
      imported.updatedAt = imported.createdAt;
      imported.status = 'draft';
      imported.publishedAt = null;
      imported.publishedVersions = [];
      templates.push(imported);
      writeJson(TEMPLATES_FILE, templates);
      fs.unlinkSync(req.file.path);
      res.json(imported);
    } catch (error) {
      res.status(400).json({ error: 'Invalid JSON file' });
    }
  });

  app.post('/api/templates/examples/import', (req, res) => {
    try {
      const slug = String((req.body && req.body.slug) || '').trim();
      if (!slug) return res.status(400).json({ error: 'EXAMPLE_SLUG_REQUIRED' });

      const loaded = loadExampleTemplateBySlug(slug);
      if (!loaded) return res.status(404).json({ error: 'EXAMPLE_NOT_FOUND' });

      const validation = validateTemplate(loaded.template);
      if (!validation.ok) {
        return res.status(400).json({ error: 'INVALID_EXAMPLE_TEMPLATE', details: validation.errors });
      }

      const templates = readJson(TEMPLATES_FILE);
      const imported = deepCloneWithNewIds(loaded.template, uuid);
      imported.createdAt = now();
      imported.updatedAt = imported.createdAt;
      imported.status = 'draft';
      imported.publishedAt = null;
      imported.publishedVersions = [];
      imported.importedFromCatalog = true;
      imported.catalogSlug = loaded.meta.slug;
      imported.catalogCategory = loaded.meta.category;
      templates.push(imported);
      writeJson(TEMPLATES_FILE, templates);
      res.json(imported);
    } catch (error) {
      res.status(500).json({ error: 'EXAMPLE_IMPORT_ERROR' });
    }
  });

  app.options('/api/import/standalone', (req, res) => {
    setStandaloneCors(res);
    res.status(204).end();
  });

  app.post('/api/import/standalone', (req, res) => {
    setStandaloneCors(res);

    const body = req.body || {};
    const templateId = body.templateId;
    const templates = readJson(TEMPLATES_FILE);
    const template = templates.find(function(item) { return item.id === templateId; });
    if (!template || template.status !== 'published' || !template.publishedVersions || !template.publishedVersions[0] || !template.publishedVersions[0].snapshot) {
      return res.status(400).json({ error: 'Invalid or unpublished template' });
    }

    const fileMap = {};
    (Array.isArray(body.media) ? body.media : []).forEach(function(mediaItem) {
      if (!mediaItem || !mediaItem.id || typeof mediaItem.dataUrl !== 'string') return;
      const match = mediaItem.dataUrl.match(/^data:([^;]+);base64,(.+)$/);
      if (!match) return;
      const ext = {
        'image/jpeg': '.jpg',
        'image/png': '.png',
        'image/webp': '.webp',
        'image/gif': '.gif',
        'image/svg+xml': '.svg',
        'image/bmp': '.bmp'
      }[match[1]] || path.extname(mediaItem.name || '') || '.bin';
      const filename = Date.now() + '-' + Math.round(Math.random() * 1e9) + ext;
      fs.writeFileSync(path.join(uploadsDir, filename), Buffer.from(match[2], 'base64'));
      fileMap[mediaItem.id] = filename;
    });

    function replaceMediaRefs(answerBag) {
      const cloned = JSON.parse(JSON.stringify(answerBag || {}));
      Object.values(cloned).forEach(function(answer) {
        if (!answer || !Array.isArray(answer.mediaFiles)) return;
        answer.mediaFiles = answer.mediaFiles.map(function(ref) {
          return fileMap[ref] || ref;
        });
      });
      return cloned;
    }

    const answers = replaceMediaRefs(body.answers || {});
    const repeatableAnswers = {};
    Object.entries(body.repeatableAnswers || {}).forEach(function(entry) {
      const sectionId = entry[0];
      const instances = Array.isArray(entry[1]) ? entry[1] : [];
      repeatableAnswers[sectionId] = instances.map(function(instance) {
        return replaceMediaRefs(instance || {});
      });
    });

    const snapshot = template.publishedVersions[0].snapshot;
    const scored = calculateInspectionScore(snapshot, answers, repeatableAnswers);
    const inspections = readJson(INSPECTIONS_FILE);
    const completedAt = body.completedAt || now();
    const startedAt = body.startedAt || completedAt;

    const inspection = {
      id: uuid(),
      templateId: template.id,
      templateName: template.name,
      code: null,
      snapshot,
      status: 'completed',
      startedAt,
      completedAt,
      score: scored.totalScore,
      maxScore: scored.maxScore,
      answers,
      repeatableAnswers,
      importedFrom: 'standalone-html',
      sourceMeta: {
        exportedFrom: body.exportedFrom || 'standalone-html',
        inspectorFileId: body.inspectorFileId || null
      }
    };

    const validation = validateInspection(inspection);
    if (!validation.ok) return res.status(400).json({ error: 'INVALID_INSPECTION', details: validation.errors });

    inspections.push(inspection);
    writeJson(INSPECTIONS_FILE, inspections);
    dispatchWebhook('inspection.completed', {
      inspection: {
        id: inspection.id,
        code: inspection.code,
        templateName: inspection.templateName,
        score: inspection.score,
        completedAt: inspection.completedAt
      }
    });

    res.status(201).json({
      ok: true,
      inspectionId: inspection.id,
      mediaImported: Object.keys(fileMap).length
    });
  });

  app.post('/api/templates/import-url', async (req, res) => {
    const importUrlValidation = ssrfGuard.validateImportUrl(req.body.url);
    if (!importUrlValidation.ok) {
      return res.status(400).json({ error: 'URL_INVALID', message: importUrlValidation.error });
    }

    const ipCheck = await ssrfGuard.checkNotPrivateIP(importUrlValidation.parsed.hostname);
    if (!ipCheck.ok) {
      return res.status(403).json({ error: 'SSRF_BLOCKED', message: ipCheck.error });
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(importUrlValidation.url, {
        signal: controller.signal,
        headers: { Accept: 'application/json', 'User-Agent': 'Auditor-Libre/2.0' },
        redirect: 'error'
      });
      clearTimeout(timeout);

      if (!response.ok) throw new Error('HTTP ' + response.status);

      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('json') && !contentType.includes('text')) {
        throw new Error('La URL no devuelve JSON valido');
      }

      const text = await response.text();
      if (text.length > 10 * 1024 * 1024) throw new Error('La respuesta excede 10MB');

      const data = JSON.parse(text);
      if (!data.pages || !data.name) {
        throw new Error('El archivo no parece ser una plantilla de Auditor Libre valida');
      }

      const validation = validateTemplate(data);
      if (!validation.ok) throw new Error(validation.errors.join(' | '));

      const imported = deepCloneWithNewIds(data, uuid);
      imported.name = data.name + ' (importada)';
      imported.status = 'draft';
      imported.importedFrom = importUrlValidation.url;
      imported.importedAt = now();
      imported.publishedVersions = [];
      imported.createdAt = now();
      imported.updatedAt = imported.createdAt;

      const templates = readJson(TEMPLATES_FILE);
      templates.push(imported);
      writeJson(TEMPLATES_FILE, templates);

      res.json({
        success: true,
        template: imported,
        trusted: importUrlValidation.trusted,
        warning: importUrlValidation.trusted ? null : 'Esta plantilla proviene de una fuente no verificada. Revisa el contenido antes de publicarla.'
      });
    } catch (error) {
      if (error.name === 'AbortError') {
        return res.status(504).json({ error: 'TIMEOUT', message: 'La URL tardo demasiado en responder' });
      }
      res.status(400).json({ error: 'IMPORT_FAILED', message: error.message });
    }
  });

  app.get('/api/templates/:id/export/pack', (req, res) => {
    const templates = readJson(TEMPLATES_FILE);
    const template = templates.find(function(item) { return item.id === req.params.id; });
    if (!template) return res.status(404).json({ error: 'No encontrada' });

    const safeName = template.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename="' + safeName + '.oapack"');

    const archive = archiver('zip', { zlib: { level: 9 } });
    archive.pipe(res);
    archive.append(JSON.stringify(template, null, 2), { name: 'plantilla.json' });

    const referencedFiles = collectReferencedFiles(template);
    const manifest = {
      version: '1.0',
      appVersion: '1.2.0',
      exportedAt: now(),
      template: {
        id: template.id,
        name: template.name,
        description: template.description
      },
      fileCount: referencedFiles.length,
      files: referencedFiles.map(function(filename) { return 'uploads/' + filename; })
    };

    archive.append(JSON.stringify(manifest, null, 2), { name: 'manifest.json' });
    if (template.description) {
      archive.append('# ' + template.name + '\n\n' + template.description + '\n', { name: 'README.md' });
    }

    referencedFiles.forEach(function(filename) {
      const filePath = path.join(dataDir, 'uploads', filename);
      if (fs.existsSync(filePath)) archive.file(filePath, { name: 'uploads/' + filename });
    });

    archive.finalize();
  });

  app.post('/api/templates/import-pack', importUploadSingle('pack'), (req, res) => {
    try {
      if (!req.file) throw new Error('No file uploaded');
      const zip = new AdmZip(fs.readFileSync(req.file.path));

      const manifestEntry = zip.getEntry('manifest.json');
      if (!manifestEntry) throw new Error('Archivo .oapack invalido: falta manifest.json');
      const manifest = JSON.parse(manifestEntry.getData().toString());

      const templateEntry = zip.getEntry('plantilla.json');
      if (!templateEntry) throw new Error('Archivo .oapack invalido: falta plantilla.json');
      const template = JSON.parse(templateEntry.getData().toString());

      const validation = validateTemplate(template);
      if (!validation.ok) throw new Error(validation.errors.join(' | '));

      const imported = deepCloneWithNewIds(template, uuid);
      imported.name = template.name + ' (importada)';
      imported.status = 'draft';
      imported.importedFromPack = manifest;
      imported.importedAt = now();
      imported.publishedVersions = [];
      imported.createdAt = now();
      imported.updatedAt = imported.createdAt;

      const entries = zip.getEntries().filter(function(entry) {
        return entry.entryName.startsWith('uploads/') && !entry.isDirectory;
      });
      entries.forEach(function(entry) {
        const filename = path.basename(entry.entryName);
        const destination = path.join(uploadsDir, filename);
        if (!fs.existsSync(destination)) {
          zip.extractEntryTo(entry, uploadsDir, false, false);
        }
      });

      const templates = readJson(TEMPLATES_FILE);
      templates.push(imported);
      writeJson(TEMPLATES_FILE, templates);
      try { fs.unlinkSync(req.file.path); } catch (error) {}

      res.json({ success: true, template: imported, filesImported: entries.length });
    } catch (error) {
      try { if (req.file && req.file.path) fs.unlinkSync(req.file.path); } catch (cleanupError) {}
      res.status(400).json({ error: error.message });
    }
  });

  app.get('/api/templates/:id/qr', async (req, res) => {
    try {
      const url = 'http://' + getLocalIP() + ':3001/inspect/' + req.params.id;
      const buffer = await QRCode.toBuffer(url, {
        width: 300,
        margin: 2,
        color: { dark: '#1a1a2e', light: '#ffffff' }
      });
      res.set('Content-Type', 'image/png');
      res.send(buffer);
    } catch (error) {
      res.status(500).json({ error: 'QR error: ' + error.message });
    }
  });

  app.get('/api/templates/:id/qr-token', async (req, res) => {
    if (!req.query.url) return res.status(400).json({ error: 'url requerida' });
    try {
      const buffer = await QRCode.toBuffer(String(req.query.url), {
        width: 300,
        margin: 2,
        color: { dark: '#1a1a2e', light: '#ffffff' }
      });
      res.set('Content-Type', 'image/png');
      res.send(buffer);
    } catch (error) {
      res.status(500).json({ error: 'QR error: ' + error.message });
    }
  });

  app.get('/api/templates/:id/validate', (req, res) => {
    const template = readJson(TEMPLATES_FILE).find(function(item) { return item.id === req.params.id; });
    if (!template) return res.status(404).json({ error: 'Not found' });

    const warnings = [];
    (template.pages || []).forEach(function(page) {
      (page.sections || []).forEach(function(section) {
        if ((section.questions || []).length === 0) {
          warnings.push('Seccion vacia: ' + (section.title || 'Sin titulo') + ' en ' + page.name);
        }
        (section.questions || []).forEach(function(question) {
          if (!question.text || !question.text.trim()) {
            warnings.push('Pregunta sin texto en: ' + (section.title || 'Sin titulo'));
          }
          if (question.conditionalLogic && question.conditionalLogic.dependsOn) {
            const dependencyExists = (template.pages || []).some(function(candidatePage) {
              return (candidatePage.sections || []).some(function(candidateSection) {
                return (candidateSection.questions || []).some(function(candidateQuestion) {
                  return candidateQuestion.id === question.conditionalLogic.dependsOn;
                });
              });
            });
            if (!dependencyExists) warnings.push('Logica condicional invalida en: ' + question.text);
          }
        });
      });
    });

    res.json({ warnings });
  });

  app.get('/api/templates/:id/inspections', (req, res) => {
    const inspections = readJson(INSPECTIONS_FILE).filter(function(item) {
      return item.templateId === req.params.id;
    });
    res.json(inspections.map(function(item) {
      return {
        id: item.id,
        templateName: item.templateName,
        status: item.status,
        startedAt: item.startedAt,
        completedAt: item.completedAt,
        score: item.score,
        maxScore: item.maxScore
      };
    }));
  });

  app.get('/api/templates/:id/preview/pdf', async (req, res) => {
    const template = readJson(TEMPLATES_FILE).find(function(item) { return item.id === req.params.id; });
    if (!template) return res.status(404).json({ error: 'Not found' });

    const config = readJson(CONFIG_FILE);
    const previewLogo = filePathToBase64(template.report && template.report.logoPath, dataDir);
    const previewCoverImage = filePathToBase64(template.report && template.report.coverImagePath, dataDir);
    const typeLabel = {
      multiple_choice: 'Opciones',
      text: 'Texto',
      number: 'Numero',
      date: 'Fecha',
      site: 'Sitio',
      person: 'Persona',
      location: 'Ubicacion',
      checkbox: 'Casilla'
    };
    let totalQuestions = 0;
    (template.pages || []).forEach(function(page) {
      (page.sections || []).forEach(function(section) {
        totalQuestions += (section.questions || []).length;
      });
    });

    const css = 'body{font-family:sans-serif;color:#333;padding:32px;max-width:800px;margin:0 auto}' +
      'h1{color:#1a1a2e;margin:0}' +
      'h2{color:#4f46e5;font-size:1.1rem;margin:28px 0 8px;border-bottom:1px solid #e5e7eb;padding-bottom:6px}' +
      'h3{color:#374151;font-size:.95rem;margin:16px 0 6px;font-style:italic}' +
      '.q{display:flex;align-items:flex-start;gap:10px;padding:8px 0;border-bottom:1px dashed #f3f4f6}' +
      '.q-num{min-width:22px;height:22px;background:#4f46e5;color:#fff;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:.75rem;font-weight:700;margin-top:1px}' +
      '.q-text{flex:1;font-size:.9rem;color:#1f2937}' +
      '.q-type{font-size:.75rem;color:#6b7280;background:#f3f4f6;padding:2px 8px;border-radius:10px;margin-left:auto;white-space:nowrap}' +
      '.q-req{color:#ef4444;font-weight:700;margin-left:4px}' +
      '.opts{display:flex;gap:6px;flex-wrap:wrap;margin:4px 0 4px 32px}' +
      '.opt{padding:3px 10px;border-radius:12px;font-size:.78rem;font-weight:600;color:#fff}' +
      '.preview-logo{width:96px;height:96px;object-fit:contain;display:block;flex:0 0 auto;border-radius:18px;background:#fff;padding:10px;border:1px solid #e5e7eb}' +
      '.cover{padding:36px 0 28px;border-bottom:2px solid #4f46e5;margin-bottom:32px}' +
      '.cover-hero{display:grid;grid-template-columns:minmax(0,1.3fr) minmax(220px,.9fr);gap:24px;align-items:stretch;margin-bottom:18px}' +
      '.cover-head{display:flex;align-items:flex-start;gap:18px;text-align:left}' +
      '.cover-head-text{flex:1;min-width:0}' +
      '.cover-image-wrap{min-height:220px;border-radius:24px;overflow:hidden;background:linear-gradient(135deg,#e0e7ff,#f8fafc);box-shadow:0 20px 45px rgba(79,70,229,.16)}' +
      '.cover-image{width:100%;height:100%;object-fit:cover;display:block}' +
      '.meta{display:flex;gap:24px;justify-content:flex-start;margin-top:12px;font-size:.85rem;color:#6b7280;flex-wrap:wrap}' +
      '.page-break{page-break-before:always}';

    const includeCover = !template.report || template.report.showCover !== false;
    const previewPages = (template.pages || []).filter(function(page) {
      return includeCover || page.type !== 'cover';
    });
    let html = '<html><head><meta charset="UTF-8"><style>' + css + '</style></head><body>';
    if (includeCover) {
      html += '<div class="cover"><div class="cover-hero"><div class="cover-head">';
      if (previewLogo) html += '<img class="preview-logo" src="' + previewLogo + '" alt="Logo">';
      html += '<div class="cover-head-text"><h1>' + template.name + '</h1>';
      if (template.description) html += '<p style="color:#6b7280;margin-top:8px">' + template.description + '</p>';
      html += '<div class="meta"><span>' + previewPages.length + ' paginas</span><span>' + totalQuestions + ' preguntas</span><span>Estado: ' + (template.status === 'published' ? 'Publicada' : 'Borrador') + '</span>';
      if (template.tags && template.tags.length) html += '<span>Etiquetas: ' + template.tags.join(', ') + '</span>';
      html += '</div></div></div>';
      if (previewCoverImage) html += '<div class="cover-image-wrap"><img class="cover-image" src="' + previewCoverImage + '" alt="Imagen de portada"></div>';
      html += '</div></div>';
    }

    previewPages.forEach(function(page, pageIndex) {
      if (pageIndex > 0) html += '<div class="page-break"></div>';
      html += '<h2>' + (pageIndex + 1) + '. ' + (page.name || 'Pagina') + '</h2>';
      (page.sections || []).forEach(function(section) {
        if (section.title) html += '<h3>' + section.title + '</h3>';
        let questionNumber = 0;
        (section.questions || []).forEach(function(question) {
          questionNumber += 1;
          html += '<div class="q">';
          html += '<div class="q-num">' + questionNumber + '</div>';
          html += '<div class="q-text">' + (question.text || 'Sin texto') + (question.required ? '<span class="q-req">*</span>' : '') + '</div>';
          html += '<div class="q-type">' + (typeLabel[question.responseType] || question.responseType) + '</div>';
          html += '</div>';
          if (question.options && question.options.length) {
            html += '<div class="opts">';
            question.options.forEach(function(option) {
              html += '<span class="opt" style="background:' + (option.color || '#4f46e5') + '">' + (option.label || option.id) + '</span>';
            });
            html += '</div>';
          }
        });
      });
    });
    html += '</body></html>';

    try {
      const buffer = await ssrfGuard.generatePdfSafe(html, {
        format: 'A4',
        margin: { top: '20mm', bottom: '20mm', left: '20mm', right: '20mm' }
      });
      res.setHeader('Content-disposition', 'attachment; filename=template-' + template.id + '.pdf');
      res.setHeader('Content-type', 'application/pdf');
      res.send(buffer);
    } catch (error) {
      res.status(500).json({ error: 'PDF error: ' + error.message });
    }
  });
}

module.exports = { registerTemplateRoutes };
