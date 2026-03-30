'use strict';

const path = require('path');
const multer = require('multer');

// ─────────────────────────────────────────────
// 1. SANITIZACIÓN
// ─────────────────────────────────────────────

/**
 * Limpia un string de caracteres de control y HTML peligroso.
 * NO reemplaza &, solo tags y control chars.
 */
function sanitizeStr(str) {
  if (typeof str !== 'string') return str;
  return str
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // control chars
    .replace(/<script\b/gi, '&lt;script')                    // script tags
    .replace(/<\/script>/gi, '&lt;/script&gt;')
    .trim();
}

/**
 * Sanitiza recursivamente un objeto (strings dentro de objetos/arrays).
 * Profundidad máxima para evitar recursión infinita.
 */
function sanitizeDeep(obj, depth) {
  if (depth === undefined) depth = 0;
  if (depth > 20) return obj;
  if (typeof obj === 'string') return sanitizeStr(obj);
  if (Array.isArray(obj)) return obj.map(function(item) { return sanitizeDeep(item, depth + 1); });
  if (obj && typeof obj === 'object') {
    var out = {};
    var keys = Object.keys(obj);
    for (var i = 0; i < keys.length; i++) {
      out[keys[i]] = sanitizeDeep(obj[keys[i]], depth + 1);
    }
    return out;
  }
  return obj;
}

// ─────────────────────────────────────────────
// 2. VALIDACIÓN
// ─────────────────────────────────────────────

/** Devuelve null si ok, o string con error si falla */
function validateTemplate(body) {
  if (body.name !== undefined) {
    if (typeof body.name !== 'string') return 'name debe ser string';
    if (body.name.length > 200) return 'name excede 200 caracteres';
    if (!body.name.trim()) return 'name no puede estar vacío';
  }
  if (body.description !== undefined) {
    if (typeof body.description !== 'string') return 'description debe ser string';
    if (body.description.length > 5000) return 'description excede 5000 caracteres';
  }
  if (body.pages !== undefined) {
    if (!Array.isArray(body.pages)) return 'pages debe ser array';
    if (body.pages.length > 100) return 'máximo 100 páginas';
    for (var i = 0; i < body.pages.length; i++) {
      var p = body.pages[i];
      if (!p.id || typeof p.id !== 'string') return 'cada página necesita id string';
      if (p.name && p.name.length > 200) return 'nombre de página excede 200 chars';
      if (p.sections) {
        if (!Array.isArray(p.sections)) return 'sections debe ser array';
        if (p.sections.length > 50) return 'máximo 50 secciones por página';
        for (var j = 0; j < p.sections.length; j++) {
          var s = p.sections[j];
          if (!s.id || typeof s.id !== 'string') return 'cada sección necesita id string';
          if (s.questions && !Array.isArray(s.questions)) return 'questions debe ser array';
          if (s.questions && s.questions.length > 200) return 'máximo 200 preguntas por sección';
        }
      }
    }
  }
  if (body.tags !== undefined) {
    if (!Array.isArray(body.tags)) return 'tags debe ser array';
    if (body.tags.length > 20) return 'máximo 20 tags';
    for (var k = 0; k < body.tags.length; k++) {
      if (typeof body.tags[k] !== 'string') return 'cada tag debe ser string';
      if (body.tags[k].length > 50) return 'cada tag máximo 50 chars';
    }
  }
  return null;
}

function validateInspectionUpdate(body) {
  if (body.answers !== undefined) {
    if (typeof body.answers !== 'object' || Array.isArray(body.answers)) return 'answers debe ser objeto';
    var keys = Object.keys(body.answers);
    for (var i = 0; i < keys.length; i++) {
      var ans = body.answers[keys[i]];
      if (typeof ans !== 'object' || Array.isArray(ans)) return 'cada answer debe ser objeto';
      if (ans.value !== undefined && ans.value !== null && typeof ans.value !== 'string' && typeof ans.value !== 'number' && typeof ans.value !== 'boolean') {
        return 'answer.value debe ser string, number, boolean o null';
      }
      if (ans.note !== undefined && typeof ans.note !== 'string') return 'answer.note debe ser string';
      if (ans.note && ans.note.length > 5000) return 'answer.note excede 5000 chars';
      if (ans.mediaFiles !== undefined && !Array.isArray(ans.mediaFiles)) return 'answer.mediaFiles debe ser array';
      if (ans.action !== undefined && typeof ans.action !== 'string' && typeof ans.action !== 'object') return 'answer.action debe ser string u objeto';
    }
  }
  if (body.activityLog !== undefined) {
    if (!Array.isArray(body.activityLog)) return 'activityLog debe ser array';
    if (body.activityLog.length > 500) return 'activityLog excede 500 entradas por request';
  }
  return null;
}

var VALID_WEBHOOK_EVENTS = [
  'inspection.created',
  'inspection.completed',
  'inspection.autosaved',
  'action.status_changed',
  'template.published'
];

function validateWebhook(body) {
  if (!body.url || typeof body.url !== 'string') return 'url es requerida';
  try { new URL(body.url); } catch (e) { return 'url no es válida'; }
  if (body.url.length > 2000) return 'url excede 2000 chars';

  if (!body.events || !Array.isArray(body.events) || body.events.length === 0) {
    return 'events debe ser array no vacío';
  }
  for (var i = 0; i < body.events.length; i++) {
    if (VALID_WEBHOOK_EVENTS.indexOf(body.events[i]) === -1) {
      return 'evento inválido: ' + body.events[i];
    }
  }
  if (body.name && (typeof body.name !== 'string' || body.name.length > 100)) return 'name debe ser string de máximo 100 chars';
  if (body.secret && (typeof body.secret !== 'string' || body.secret.length > 500)) return 'secret excede 500 chars';
  if (body.headers !== undefined) {
    if (typeof body.headers !== 'object' || Array.isArray(body.headers)) return 'headers debe ser objeto';
    var hKeys = Object.keys(body.headers);
    for (var j = 0; j < hKeys.length; j++) {
      if (typeof body.headers[hKeys[j]] !== 'string') return 'cada header debe ser string';
    }
  }
  return null;
}

function validateConfig(body) {
  if (body.dataPath !== undefined && typeof body.dataPath !== 'string') return 'dataPath debe ser string';
  if (body.dataPath && body.dataPath.length > 500) return 'dataPath excede 500 chars';
  if (body.branding !== undefined) {
    if (typeof body.branding !== 'object' || Array.isArray(body.branding)) return 'branding debe ser objeto';
    var b = body.branding;
    if (b.appName && (typeof b.appName !== 'string' || b.appName.length > 100)) return 'appName excede 100 chars';
    if (b.primaryColor && !/^#[0-9a-fA-F]{3,8}$/.test(b.primaryColor)) return 'primaryColor debe ser hex válido';
    if (b.footerText && (typeof b.footerText !== 'string' || b.footerText.length > 200)) return 'footerText excede 200 chars';
  }
  return null;
}

function validateActionUpdate(body) {
  var VALID_STATUSES = ['open', 'in_progress', 'resolved'];
  if (body.status !== undefined && VALID_STATUSES.indexOf(body.status) === -1) {
    return 'status inválido. Opciones: ' + VALID_STATUSES.join(', ');
  }
  if (body.deadline !== undefined && body.deadline !== '' && body.deadline !== null) {
    if (typeof body.deadline !== 'string' || !/^\d{4}-\d{2}-\d{2}/.test(body.deadline)) {
      return 'deadline debe ser formato YYYY-MM-DD';
    }
  }
  if (body.assignedTo !== undefined && typeof body.assignedTo !== 'string') return 'assignedTo debe ser string';
  if (body.assignedTo && body.assignedTo.length > 200) return 'assignedTo excede 200 chars';
  if (body.description !== undefined && typeof body.description !== 'string') return 'description debe ser string';
  if (body.description && body.description.length > 2000) return 'description excede 2000 chars';
  return null;
}

// ─────────────────────────────────────────────
// 3. MULTER ENDURECIDO
// ─────────────────────────────────────────────

var ALLOWED_EXTENSIONS = /\.(jpg|jpeg|png|gif|webp|svg|ico|mp4|mov|pdf)$/i;
var ALLOWED_MIMES = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
  'image/x-icon', 'video/mp4', 'video/quicktime', 'application/pdf'
];
var MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

function createUpload(uploadsDir) {
  var storage = multer.diskStorage({
    destination: function (req, file, cb) { cb(null, uploadsDir); },
    filename: function (req, file, cb) {
      var safeName = Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname).toLowerCase();
      cb(null, safeName);
    }
  });

  return multer({
    storage: storage,
    limits: {
      fileSize: MAX_FILE_SIZE,
      files: 1,
      fields: 10,
      fieldSize: 1024 * 100 // 100KB para campos de texto en form
    },
    fileFilter: function (req, file, cb) {
      var ext = path.extname(file.originalname).toLowerCase();
      if (!ALLOWED_EXTENSIONS.test(ext)) {
        return cb(new Error('Tipo de archivo no permitido: ' + ext));
      }
      if (ALLOWED_MIMES.indexOf(file.mimetype) === -1) {
        return cb(new Error('MIME type no permitido: ' + file.mimetype));
      }
      cb(null, true);
    }
  });
}

// Upload especial para importar (acepta .json, .oapack y backups .zip)
var IMPORT_EXTENSIONS = /\.(json|oapack|zip)$/i;
var IMPORT_MIMES = ['application/json', 'application/zip', 'application/x-zip-compressed', 'application/octet-stream', 'text/plain'];
var MAX_IMPORT_SIZE = 50 * 1024 * 1024; // 50 MB para packs

function createImportUpload(uploadsDir) {
  var storage = multer.diskStorage({
    destination: function (req, file, cb) { cb(null, uploadsDir); },
    filename: function (req, file, cb) {
      cb(null, 'import-' + Date.now() + path.extname(file.originalname).toLowerCase());
    }
  });

  return multer({
    storage: storage,
    limits: { fileSize: MAX_IMPORT_SIZE, files: 1 },
    fileFilter: function (req, file, cb) {
      var ext = path.extname(file.originalname).toLowerCase();
      if (!IMPORT_EXTENSIONS.test(ext)) {
        return cb(new Error('Solo se permiten archivos .json, .oapack o .zip'));
      }
      cb(null, true);
    }
  });
}

// Upload para branding (logo, favicon)
var BRANDING_EXTENSIONS = /\.(png|svg|ico|jpg|jpeg|webp)$/i;
var BRANDING_MIMES = ['image/png', 'image/svg+xml', 'image/x-icon', 'image/jpeg', 'image/webp'];

function createBrandingUpload(uploadsDir) {
  var storage = multer.diskStorage({
    destination: function (req, file, cb) { cb(null, uploadsDir); },
    filename: function (req, file, cb) {
      cb(null, 'branding-' + Date.now() + path.extname(file.originalname).toLowerCase());
    }
  });

  return multer({
    storage: storage,
    limits: { fileSize: 2 * 1024 * 1024, files: 1 }, // 2MB para imágenes de branding
    fileFilter: function (req, file, cb) {
      var ext = path.extname(file.originalname).toLowerCase();
      if (!BRANDING_EXTENSIONS.test(ext)) {
        return cb(new Error('Tipo de imagen no permitido: ' + ext));
      }
      if (BRANDING_MIMES.indexOf(file.mimetype) === -1) {
        return cb(new Error('MIME type no permitido: ' + file.mimetype));
      }
      cb(null, true);
    }
  });
}

// ─────────────────────────────────────────────
// 4. MIDDLEWARE
// ─────────────────────────────────────────────

/** Middleware que sanitiza req.body automáticamente */
function sanitizeBody(req, res, next) {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeDeep(req.body);
  }
  next();
}

/** Error handler para errores de multer */
function multerErrorHandler(err, req, res, next) {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'Archivo demasiado grande. Máximo permitido: 10 MB' });
    }
    return res.status(400).json({ error: 'Error de upload: ' + err.message });
  }
  if (err && (err.message.includes('no permitido') || err.message.includes('Solo se permiten'))) {
    return res.status(400).json({ error: err.message });
  }
  next(err);
}

/** Middleware de validación genérico — factory */
function validate(validatorFn) {
  return function (req, res, next) {
    var error = validatorFn(req.body);
    if (error) return res.status(400).json({ error: 'Validación fallida: ' + error });
    next();
  };
}

// ─────────────────────────────────────────────
// EXPORTS
// ─────────────────────────────────────────────

module.exports = {
  // Sanitización
  sanitizeStr: sanitizeStr,
  sanitizeDeep: sanitizeDeep,
  sanitizeBody: sanitizeBody,

  // Validadores
  validateTemplate: validateTemplate,
  validateInspectionUpdate: validateInspectionUpdate,
  validateWebhook: validateWebhook,
  validateConfig: validateConfig,
  validateActionUpdate: validateActionUpdate,
  validate: validate,

  // Multer factories
  createUpload: createUpload,
  createImportUpload: createImportUpload,
  createBrandingUpload: createBrandingUpload,

  // Error handler
  multerErrorHandler: multerErrorHandler
};
