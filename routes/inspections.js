'use strict';

function registerInspectionRoutes(deps) {
  const {
    app,
    security,
    ssrfGuard,
    buildPdfHtml,
    readJson,
    writeJson,
    now,
    uuid,
    fileToBase64,
    filePathToBase64,
    sanitizeInspectionPatch,
    validateInspection,
    calculateInspectionScore,
    dispatchWebhook,
    uploadSingle,
    dataDir,
    TEMPLATES_FILE,
    INSPECTIONS_FILE,
    CONFIG_FILE,
    uploadsDir
  } = deps;

  function isStale(clientUpdatedAt, serverUpdatedAt) {
    return !!(clientUpdatedAt && serverUpdatedAt && new Date(clientUpdatedAt) < new Date(serverUpdatedAt));
  }

  function mergeOfflineRefs(answerObj, map) {
    if (!answerObj || !map) return answerObj;
    Object.values(answerObj).forEach(function(answer) {
      if (!answer || !answer.mediaFiles) return;
      answer.mediaFiles = answer.mediaFiles.map(function(ref) {
        return map[ref] !== undefined ? map[ref] : ref;
      });
    });
    return answerObj;
  }

  app.delete('/api/inspections/:id', (req, res) => {
    try {
      const inspection = readJson(INSPECTIONS_FILE).find(function(item) { return item.id === req.params.id; });
      if (!inspection) return res.status(404).json({ error: 'Not found' });
      const db = require('../lib/db');
      db.deleteInspection(req.params.id);
      res.json({ ok: true });
    } catch (error) {
      console.error('Error eliminando inspeccion:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.get('/api/inspections/compare', (req, res) => {
    const all = readJson(INSPECTIONS_FILE);
    const inspectionA = all.find(function(item) { return item.id === req.query.a; });
    const inspectionB = all.find(function(item) { return item.id === req.query.b; });
    if (!inspectionA || !inspectionB) {
      return res.status(404).json({ error: 'One or both inspections not found' });
    }
    if (!inspectionA.snapshot) return res.status(400).json({ error: 'No snapshot' });

    const result = {
      a: {
        id: inspectionA.id,
        name: inspectionA.templateName,
        date: inspectionA.completedAt || inspectionA.startedAt,
        score: inspectionA.score,
        maxScore: inspectionA.maxScore
      },
      b: {
        id: inspectionB.id,
        name: inspectionB.templateName,
        date: inspectionB.completedAt || inspectionB.startedAt,
        score: inspectionB.score,
        maxScore: inspectionB.maxScore
      },
      questions: []
    };

    inspectionA.snapshot.pages.forEach(function(page) {
      page.sections.forEach(function(section) {
        section.questions.forEach(function(question) {
          const answerA = inspectionA.answers && inspectionA.answers[question.id];
          const answerB = inspectionB.answers && inspectionB.answers[question.id];
          result.questions.push({
            id: question.id,
            text: question.text,
            page: page.name,
            section: section.title,
            aValue: answerA ? answerA.value : null,
            bValue: answerB ? answerB.value : null,
            diff: (answerA ? answerA.value : null) !== (answerB ? answerB.value : null)
          });
        });
      });
    });

    res.json(result);
  });

  app.get('/api/inspections', (req, res) => {
    const inspections = readJson(INSPECTIONS_FILE);
    res.json(inspections.map(function(item) {
      const isTest = !!(item.sourceMeta && item.sourceMeta.mode === 'template-test');
      return {
        id: item.id,
        templateName: item.templateName,
        code: item.code,
        status: item.status,
        startedAt: item.startedAt,
        score: item.score,
        maxScore: item.maxScore,
        isTest
      };
    }));
  });

  app.get('/api/inspections/:id', (req, res) => {
    const inspection = readJson(INSPECTIONS_FILE).find(function(item) { return item.id === req.params.id; });
    if (!inspection) return res.status(404).json({ error: 'Not found' });
    res.json(inspection);
  });

  app.post('/api/inspections', (req, res) => {
    const templateId = req.body.templateId;
    const templates = readJson(TEMPLATES_FILE);
    const templateIndex = templates.findIndex(function(item) { return item.id === templateId; });
    if (templateIndex === -1 || templates[templateIndex].status !== 'published') {
      return res.status(400).json({ error: 'Invalid or unpublished template' });
    }

    const template = templates[templateIndex];
    if (template.expiry && template.expiry.date) {
      const today = new Date().toISOString().slice(0, 10);
      if (template.expiry.date < today && template.expiry.blockOnExpiry) {
        return res.status(400).json({ error: 'La plantilla ha expirado y no puede usarse para nuevas inspecciones' });
      }
    }

    let code = null;
    if (template.correlative && template.correlative.enabled) {
      const correlative = template.correlative;
      const num = String(correlative.nextNumber || 1).padStart(correlative.padLength || 3, '0');
      const parts = [];
      if (correlative.prefix) parts.push(correlative.prefix);
      if (correlative.includeyear) parts.push(new Date().getFullYear());
      parts.push(num);
      code = parts.join(correlative.separator !== undefined ? correlative.separator : '-');
      template.correlative.nextNumber = (correlative.nextNumber || 1) + 1;
      writeJson(TEMPLATES_FILE, templates);
    }

    if (!template.publishedVersions || !template.publishedVersions[0] || !template.publishedVersions[0].snapshot) {
      return res.status(400).json({ error: 'La plantilla no tiene una versión publicada válida' });
    }

    const inspections = readJson(INSPECTIONS_FILE);
    const inspection = {
      id: uuid(),
      templateId: template.id,
      templateName: template.name,
      code,
      snapshot: template.publishedVersions[0].snapshot,
      status: 'in_progress',
      startedAt: now(),
      completedAt: null,
      score: null,
      maxScore: null,
      answers: {},
      repeatableAnswers: {}
    };

    const validation = validateInspection(inspection);
    if (!validation.ok) return res.status(400).json({ error: 'INVALID_INSPECTION', details: validation.errors });
    inspections.push(inspection);
    writeJson(INSPECTIONS_FILE, inspections);

    dispatchWebhook('inspection.created', {
      inspection: { id: inspection.id, templateId, templateName: template.name, code }
    });

    res.status(201).json(inspection);
  });

  app.put('/api/inspections/:id', security.validate(security.validateInspectionUpdate), (req, res) => {
    const inspections = readJson(INSPECTIONS_FILE);
    const index = inspections.findIndex(function(item) { return item.id === req.params.id; });
    if (index === -1) return res.status(404).json({ error: 'Not found' });

    const current = inspections[index];
    const patch = sanitizeInspectionPatch(req.body || {});
    if (isStale(patch._updatedAt, current.updatedAt)) {
      return res.status(409).json({
        error: 'CONFLICT',
        message: 'Esta inspeccion fue modificada por otro usuario mientras trabajabas.',
        serverUpdatedAt: current.updatedAt,
        serverVersion: current
      });
    }

    current.answers = patch.answers || current.answers;
    current.repeatableAnswers = patch.repeatableAnswers || current.repeatableAnswers || {};
    if (patch.activityLog && Array.isArray(patch.activityLog)) {
      if (!current.activityLog) current.activityLog = [];
      current.activityLog = current.activityLog.concat(patch.activityLog);
      if (current.activityLog.length > 1000) current.activityLog = current.activityLog.slice(-1000);
    }

    current.updatedAt = now();
    const validation = validateInspection(current);
    if (!validation.ok) return res.status(400).json({ error: 'INVALID_INSPECTION', details: validation.errors });
    writeJson(INSPECTIONS_FILE, inspections);

    dispatchWebhook('inspection.autosaved', {
      inspection: { id: current.id, code: current.code }
    });

    res.json(current);
  });

  app.post('/api/inspections/:id/lock', (req, res) => {
    try {
      const inspections = readJson(INSPECTIONS_FILE);
      const inspection = inspections.find(function(item) { return item.id === req.params.id; });
      if (!inspection) return res.status(404).json({ error: 'Not found' });
      inspection.lockedBy = req.body.lockedBy || null;
      inspection.lockedAt = inspection.lockedBy ? now() : null;
      writeJson(INSPECTIONS_FILE, inspections);
      res.json({ ok: true, lockedBy: inspection.lockedBy });
    } catch (error) {
      console.error('Error en /api/inspections/:id/lock:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.post('/api/inspections/:id/unlock', (req, res) => {
    const inspections = readJson(INSPECTIONS_FILE);
    const inspection = inspections.find(function(item) { return item.id === req.params.id; });
    if (!inspection) return res.status(404).json({ error: 'Not found' });
    inspection.lockedBy = null;
    inspection.lockedAt = null;
    writeJson(INSPECTIONS_FILE, inspections);
    res.json({ ok: true });
  });

  app.post('/api/inspections/:id/upload', uploadSingle('file'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file' });
    const inspection = readJson(INSPECTIONS_FILE).find(function(item) { return item.id === req.params.id; });
    if (!inspection) return res.status(404).json({ error: 'Not found' });
    res.json({ filename: req.file.filename });
  });

  app.post('/api/inspections/:id/complete', security.validate(security.validateInspectionUpdate), (req, res) => {
    const inspections = readJson(INSPECTIONS_FILE);
    const index = inspections.findIndex(function(item) { return item.id === req.params.id; });
    if (index === -1) return res.status(404).json({ error: 'Not found' });

    const inspection = inspections[index];
    const patch = sanitizeInspectionPatch(req.body || {});
    if (isStale(patch._updatedAt, inspection.updatedAt)) {
      return res.status(409).json({
        error: 'CONFLICT',
        message: 'Esta inspeccion fue modificada por otro usuario mientras trabajabas.',
        serverUpdatedAt: inspection.updatedAt,
        serverVersion: inspection
      });
    }

    inspection.answers = patch.answers || inspection.answers;
    inspection.repeatableAnswers = patch.repeatableAnswers || inspection.repeatableAnswers || {};

    const warnings = [];
    inspection.snapshot.pages.forEach(function(page) {
      page.sections.forEach(function(section) {
        if (section.repeatable) {
          const instances = inspection.repeatableAnswers[section.id] || [];
          instances.forEach(function(instance, instanceIndex) {
            section.questions.forEach(function(question) {
              if (!question.requireMedia) return;
              const answer = instance[question.id] || {};
              const count = (answer.mediaFiles || []).length;
              if (count < (question.minMediaCount || 1)) {
                warnings.push({
                  questionId: question.id,
                  questionText: question.text,
                  message: question.mediaValidationMessage || 'Requiere al menos ' + (question.minMediaCount || 1) + ' foto(s) en instancia ' + (instanceIndex + 1)
                });
              }
            });
          });
        } else {
          section.questions.forEach(function(question) {
            if (!question.requireMedia) return;
            const answer = inspection.answers[question.id] || {};
            const count = (answer.mediaFiles || []).length;
            if (count < (question.minMediaCount || 1)) {
              warnings.push({
                questionId: question.id,
                questionText: question.text,
                message: question.mediaValidationMessage || 'Requiere al menos ' + (question.minMediaCount || 1) + ' foto(s)'
              });
            }
          });
        }
      });
    });

    if (warnings.length > 0) {
      return res.status(422).json({
        error: 'MEDIA_REQUIRED',
        warnings,
        message: warnings.length + ' pregunta(s) requieren evidencia fotografica'
      });
    }

    const scored = calculateInspectionScore(inspection.snapshot, inspection.answers, inspection.repeatableAnswers);
    inspection.score = scored.totalScore;
    inspection.maxScore = scored.maxScore;
    inspection.status = 'completed';
    inspection.updatedAt = now();
    inspection.completedAt = now();

    const validation = validateInspection(inspection);
    if (!validation.ok) return res.status(400).json({ error: 'INVALID_INSPECTION', details: validation.errors });
    writeJson(INSPECTIONS_FILE, inspections);

    dispatchWebhook('inspection.completed', {
      inspection: {
        id: inspection.id,
        code: inspection.code,
        templateName: inspection.templateName,
        score: scored.totalScore,
        completedAt: inspection.completedAt
      }
    });

    res.json(inspection);
  });

  app.get('/api/inspections/:id/export/csv', (req, res) => {
    const inspection = readJson(INSPECTIONS_FILE).find(function(item) { return item.id === req.params.id; });
    if (!inspection) return res.status(404).json({ error: 'Not found' });

    let csv = 'Page,Section,Question,Type,Value,Note,Flagged,Action\n';
    const escapeCsv = function(value) {
      return '"' + String(value || '').replace(/"/g, '""') + '"';
    };

    inspection.snapshot.pages.forEach(function(page) {
      page.sections.forEach(function(section) {
        if (section.repeatable) {
          const instances = (inspection.repeatableAnswers && inspection.repeatableAnswers[section.id]) || [];
          instances.forEach(function(instance, index) {
            section.questions.forEach(function(question) {
              const answer = (instance && instance[question.id]) || {};
              csv += [
                escapeCsv(page.name),
                escapeCsv((section.title || '') + ' #' + (index + 1)),
                escapeCsv(question.text),
                escapeCsv(question.responseType),
                escapeCsv(answer.value),
                escapeCsv(answer.note),
                escapeCsv(answer.flagged),
                escapeCsv(answer.action)
              ].join(',') + '\n';
            });
          });
        } else {
          section.questions.forEach(function(question) {
            const answer = inspection.answers[question.id] || {};
            csv += [
              escapeCsv(page.name),
              escapeCsv(section.title),
              escapeCsv(question.text),
              escapeCsv(question.responseType),
              escapeCsv(answer.value),
              escapeCsv(answer.note),
              escapeCsv(answer.flagged),
              escapeCsv(answer.action)
            ].join(',') + '\n';
          });
        }
      });
    });

    res.setHeader('Content-disposition', 'attachment; filename=inspection-' + inspection.id + '.csv');
    res.setHeader('Content-type', 'text/csv; charset=utf-8');
    res.send('\uFEFF' + csv);
  });

  app.get('/api/inspections/:id/export/pdf', async (req, res) => {
    const inspection = readJson(INSPECTIONS_FILE).find(function(item) { return item.id === req.params.id; });
    if (!inspection) return res.status(404).json({ error: 'Not found' });

    try {
      const config = readJson(CONFIG_FILE);
      const branding = config.branding || {};
      const templateLogoPath = inspection.snapshot && inspection.snapshot.report ? inspection.snapshot.report.logoPath : null;
      branding.pdfLogoDataUri = filePathToBase64(templateLogoPath, dataDir);
      const html = buildPdfHtml(inspection, uploadsDir, branding);
      const report = inspection.snapshot.report || {};
      const buffer = await ssrfGuard.generatePdfSafe(html, {
        format: report.pageSize === 'Letter' ? 'Letter' : 'A4',
        printBackground: true,
        margin: { top: '28mm', right: '20mm', bottom: '28mm', left: '20mm' }
      });
      res.setHeader('Content-disposition', 'attachment; filename=inspection-' + inspection.id + '.pdf');
      res.setHeader('Content-type', 'application/pdf');
      res.send(buffer);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Error generating PDF: ' + error.message });
    }
  });

  app.post('/api/inspections/:id/signature', (req, res) => {
    const inspections = readJson(INSPECTIONS_FILE);
    const index = inspections.findIndex(function(item) { return item.id === req.params.id; });
    if (index === -1) return res.status(404).json({ error: 'Not found' });
    const signature = req.body && typeof req.body.signature === 'string' ? req.body.signature.trim() : '';
    if (signature && !/^data:image\/png;base64,[a-z0-9+/=]+$/i.test(signature)) {
      return res.status(400).json({ error: 'INVALID_SIGNATURE' });
    }
    inspections[index].signature = signature || null;
    inspections[index].signerName = req.body && req.body.signerName ? req.body.signerName.trim() : null;
    inspections[index].signerTitle = req.body && req.body.signerTitle ? req.body.signerTitle.trim() : null;
    writeJson(INSPECTIONS_FILE, inspections);
    res.json({ ok: true });
  });

  app.get('/api/inspections/:id/export/pdf-findings', async (req, res) => {
    const inspection = readJson(INSPECTIONS_FILE).find(function(item) { return item.id === req.params.id; });
    if (!inspection) return res.status(404).json({ error: 'Not found' });

    const items = [];
    inspection.snapshot.pages.forEach(function(page) {
      page.sections.forEach(function(section) {
        section.questions.forEach(function(question) {
          const answer = inspection.answers[question.id];
          if (answer && answer.flagged) {
            items.push({
              page: page.name,
              sec: section.title,
              q: question.text,
              v: answer.value,
              n: answer.note,
              act: typeof answer.action === 'object' ? answer.action.description : answer.action,
              media: answer.mediaFiles || []
            });
          }
        });
      });
    });

    let html = '<html><head><style>body{font-family:sans-serif;color:#333;padding:32px}h1{color:#1a1a2e;border-bottom:2px solid #4f46e5;padding-bottom:12px}table{width:100%;border-collapse:collapse;margin-top:16px}th,td{border:1px solid #e5e7eb;padding:8px 12px;text-align:left;vertical-align:top}th{background:#4f46e5;color:#fff}tr:nth-child(even){background:#f9fafb}</style></head><body>';
    html += '<h1>Informe de Hallazgos</h1><p><strong>Inspeccion:</strong> ' + inspection.templateName + ' | <strong>Hallazgos:</strong> ' + items.length + '</p>';
    if (!items.length) {
      html += '<p>No hay elementos senalados.</p>';
    } else {
      html += '<table><thead><tr><th>Pagina</th><th>Seccion</th><th>Pregunta</th><th>Respuesta</th><th>Nota</th><th>Accion Correctiva</th></tr></thead><tbody>';
      items.forEach(function(item) {
        html += '<tr><td>' + (item.page || '') + '</td><td>' + (item.sec || '') + '</td><td><strong>' + (item.q || '') + '</strong></td><td>' + (item.v || '-') + '</td><td>' + (item.n || '-') + '</td><td>' + (item.act || '-') + '</td></tr>';
        if (item.media && item.media.length) {
          html += '<tr><td colspan=6><div style="display:flex;flex-wrap:wrap;gap:8px;padding:8px 0 16px">';
          item.media.forEach(function(mediaFile, mediaIndex) {
            const base64 = fileToBase64(mediaFile);
            if (base64) {
              html += '<div><img src="' + base64 + '" style="max-width:240px;max-height:180px;object-fit:cover;border-radius:3px;border:1px solid #e9e8e6"><div style="font-size:8pt;color:#9b9b97">Foto ' + (mediaIndex + 1) + '</div></div>';
            }
          });
          html += '</div></td></tr>';
        }
      });
      html += '</tbody></table>';
    }
    if (inspection.signature) {
      html += '<div style="margin-top:40px"><p><strong>Firma:</strong></p><img src="' + inspection.signature + '" style="height:80px"></div>';
    }
    html += '</body></html>';

    try {
      const buffer = await ssrfGuard.generatePdfSafe(html, { format: 'A4' });
      res.setHeader('Content-disposition', 'attachment; filename=findings-' + inspection.id + '.pdf');
      res.setHeader('Content-type', 'application/pdf');
      res.send(buffer);
    } catch (error) {
      res.status(500).json({ error: 'PDF error' });
    }
  });

  app.get('/api/inspections/:id/export/xlsx', async (req, res) => {
    const inspection = readJson(INSPECTIONS_FILE).find(function(item) { return item.id === req.params.id; });
    if (!inspection) return res.status(404).json({ error: 'Not found' });

    try {
      const ExcelJS = require('exceljs');
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Inspeccion');
      sheet.columns = [
        { header: 'Pagina', key: 'page', width: 20 },
        { header: 'Seccion', key: 'sec', width: 20 },
        { header: 'Pregunta', key: 'q', width: 40 },
        { header: 'Tipo', key: 'type', width: 15 },
        { header: 'Respuesta', key: 'val', width: 20 },
        { header: 'Nota', key: 'note', width: 30 },
        { header: 'Senalado', key: 'flag', width: 10 },
        { header: 'Accion', key: 'action', width: 40 },
        { header: 'Estado', key: 'st', width: 15 }
      ];
      const headerRow = sheet.getRow(1);
      headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } };

      const repeatableSheets = {};
      inspection.snapshot.pages.forEach(function(page) {
        page.sections.forEach(function(section) {
          if (section.repeatable) {
            const sheetName = (section.title || 'Seccion Repetible').slice(0, 31);
            if (!repeatableSheets[sheetName]) {
              const repeatableSheet = workbook.addWorksheet(sheetName);
              repeatableSheet.columns = [
                { header: 'Instancia', key: 'inst', width: 15 },
                { header: 'Pregunta', key: 'q', width: 40 },
                { header: 'Respuesta', key: 'val', width: 20 },
                { header: 'Nota', key: 'note', width: 30 },
                { header: 'Senalado', key: 'flag', width: 10 },
                { header: 'Accion', key: 'action', width: 40 }
              ];
              const repeatableHeader = repeatableSheet.getRow(1);
              repeatableHeader.font = { bold: true, color: { argb: 'FFFFFFFF' } };
              repeatableHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } };
              repeatableSheets[sheetName] = repeatableSheet;
            }

            const repeatableSheet = repeatableSheets[sheetName];
            const instances = inspection.repeatableAnswers[section.id] || [];
            instances.forEach(function(instance, index) {
              section.questions.forEach(function(question) {
                const answer = instance[question.id] || {};
                repeatableSheet.addRow({
                  inst: (section.title || 'Instancia') + ' ' + (index + 1),
                  q: question.text,
                  val: String(answer.value || ''),
                  note: answer.note || '',
                  flag: answer.flagged ? 'Si' : '',
                  action: answer.action || ''
                });
              });
            });
          } else {
            section.questions.forEach(function(question) {
              const answer = inspection.answers[question.id] || {};
              sheet.addRow({
                page: page.name,
                sec: section.title || '',
                q: question.text,
                type: question.responseType,
                val: String(answer.value || ''),
                note: answer.note || '',
                flag: answer.flagged ? 'Si' : '',
                action: answer.action || '',
                st: answer.actionStatus || ''
              });
            });
          }
        });
      });

      res.setHeader('Content-disposition', 'attachment; filename=inspection-' + inspection.id + '.xlsx');
      res.setHeader('Content-type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      await workbook.xlsx.write(res);
      res.end();
    } catch (error) {
      res.status(500).json({ error: 'Excel error: ' + error.message });
    }
  });

  app.post('/api/inspections/:id/upload-offline', uploadSingle('file'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file' });
    if (!req.body.localFotoId) return res.status(400).json({ error: 'localFotoId requerido' });

    const inspection = readJson(INSPECTIONS_FILE).find(function(item) { return item.id === req.params.id; });
    if (!inspection) return res.status(404).json({ error: 'Not found' });

    res.json({
      ok: true,
      localFotoId: req.body.localFotoId,
      filename: req.file.filename,
      url: '/uploads/' + req.file.filename
    });
  });

  app.post('/api/inspections/:id/sync', security.validate(security.validateInspectionUpdate), (req, res) => {
    const inspections = readJson(INSPECTIONS_FILE);
    const index = inspections.findIndex(function(item) { return item.id === req.params.id; });
    if (index === -1) return res.status(404).json({ error: 'Not found' });

    const inspection = inspections[index];
    const patch = sanitizeInspectionPatch(req.body || {});
    if (inspection.status === 'completed') {
      return res.json({ ok: true, skipped: true, status: 'completed' });
    }
    if (isStale(patch._updatedAt, inspection.updatedAt)) {
      return res.status(409).json({
        error: 'CONFLICT',
        message: 'Esta inspeccion fue modificada por otro usuario mientras trabajabas.',
        serverUpdatedAt: inspection.updatedAt,
        serverVersion: inspection
      });
    }

    const answers = patch.answers;
    const repeatableAnswers = patch.repeatableAnswers;
    const fileMap = req.body.fileMap;
    const complete = !!req.body.complete;

    if (answers) {
      inspection.answers = mergeOfflineRefs(Object.assign({}, inspection.answers, answers), fileMap);
    }
    if (repeatableAnswers) {
      const merged = Object.assign({}, inspection.repeatableAnswers);
      Object.entries(repeatableAnswers).forEach(function(entry) {
        const sectionId = entry[0];
        const instances = entry[1];
        merged[sectionId] = instances.map(function(instance, idx) {
          return mergeOfflineRefs(Object.assign({}, (merged[sectionId] && merged[sectionId][idx]) || {}, instance), fileMap);
        });
      });
      inspection.repeatableAnswers = merged;
    }

    inspection.updatedAt = now();

    if (complete) {
      const scored = calculateInspectionScore(inspection.snapshot, inspection.answers, inspection.repeatableAnswers);
      inspection.score = scored.totalScore;
      inspection.maxScore = scored.maxScore;
      inspection.status = 'completed';
      inspection.completedAt = now();
      writeJson(INSPECTIONS_FILE, inspections);

      dispatchWebhook('inspection.completed', {
        inspection: {
          id: inspection.id,
          code: inspection.code,
          templateName: inspection.templateName,
          score: scored.totalScore,
          completedAt: inspection.completedAt
        }
      });

      return res.json({ ok: true, completed: true, inspection });
    }

    writeJson(INSPECTIONS_FILE, inspections);
    res.json({ ok: true, completed: false });
  });
}

module.exports = { registerInspectionRoutes };
