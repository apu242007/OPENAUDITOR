'use strict';

const ALLOWED_WEBHOOK_EVENTS = [
  'action.status_changed',
  'inspection.autosaved',
  'inspection.completed',
  'inspection.created',
  'template.published'
];

const ALLOWED_SYNC_DESTINATION_KINDS = ['apps_script', 'generic_webhook', 'github_gist', 'openauditor_node', 'pocketbase', 'supabase'];
const ALLOWED_CONFIG_KEYS = ['dataPath', 'branding', 'security', 'webhooks', 'syncDestinations'];
const ALLOWED_BRANDING_KEYS = ['appName', 'primaryColor', 'primaryColorHover', 'primaryColorLight', 'logoPath', 'faviconPath', 'pdfLogoPath', 'footerText'];
const ALLOWED_SECURITY_KEYS = ['enabled', 'pin', 'pinHash', 'pinSalt', 'requireAuthForLan'];
const ALLOWED_WEBHOOK_KEYS = ['id', 'name', 'url', 'secret', 'events', 'headers', 'retryOnFailure', 'enabled', 'lastTriggeredAt', 'lastStatus', 'lastError'];
const ALLOWED_SYNC_DESTINATION_KEYS = ['id', 'name', 'kind', 'url', 'headers', 'enabled', 'notes'];
const ALLOWED_ANSWER_KEYS = ['value', 'note', 'mediaFiles', 'flagged', 'action', 'actionStatus', 'actionDeadline', '_showNote', '_showMedia', '_showAction', 'savedAt', 'severity', 'location'];
const ALLOWED_ACTION_KEYS = ['description', 'status', 'assignedTo', 'deadline'];

function isObject(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function hasOnlyKeys(obj, allowedKeys) {
  return Object.keys(obj).every(function(key) { return allowedKeys.includes(key); });
}

function sanitizeString(value, maxLength) {
  if (typeof value !== 'string') return value;
  const cleaned = value
    .replace(/[<>]/g, '')
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .trim();
  if (!maxLength || cleaned.length <= maxLength) return cleaned;
  return cleaned.slice(0, maxLength);
}

function sanitizeStringArray(values, maxItems, maxLength) {
  if (!Array.isArray(values)) return [];
  return values
    .slice(0, maxItems || values.length)
    .map(function(value) { return sanitizeString(String(value), maxLength); })
    .filter(Boolean);
}

function sanitizePlainObjectStrings(obj, options) {
  if (!isObject(obj)) return {};
  const opts = options || {};
  const out = {};
  const keys = Object.keys(obj).slice(0, opts.maxKeys || Object.keys(obj).length);
  keys.forEach(function(key) {
    const cleanKey = sanitizeString(String(key), opts.maxKeyLength || 64);
    if (!cleanKey) return;
    const value = obj[key];
    if (typeof value !== 'string') return;
    out[cleanKey] = sanitizeString(value, opts.maxValueLength || 500);
  });
  return out;
}

function sanitizeTemplateInput(template) {
  if (!isObject(template)) return template;
  return sanitizeNestedTemplateObject(template);
}

function sanitizeNestedTemplateObject(value) {
  if (Array.isArray(value)) return value.map(sanitizeNestedTemplateObject);
  if (!isObject(value)) return typeof value === 'string' ? sanitizeString(value, 5000) : value;
  const out = {};
  Object.keys(value).forEach(function(key) {
    const item = value[key];
    if (key === 'name') out[key] = sanitizeString(item, 200);
    else if (key === 'description' || key === 'text' || key === 'title' || key === 'placeholder' || key === 'helpText' || key === 'helpMedia' || key === 'helpImage' || key === 'label' || key === 'note' || key === 'mediaValidationMessage' || key === 'addButtonLabel' || key === 'prefix' || key === 'separator') out[key] = sanitizeString(item, 5000);
    else if (key === 'tags') out[key] = sanitizeStringArray(item, 50, 50);
    else out[key] = sanitizeNestedTemplateObject(item);
  });
  return out;
}

function sanitizeActionObject(action) {
  if (typeof action === 'string') return sanitizeString(action, 2000);
  if (!isObject(action)) return action;
  return {
    description: sanitizeString(action.description || '', 2000),
    status: sanitizeString(action.status || 'open', 32),
    assignedTo: sanitizeString(action.assignedTo || '', 120),
    deadline: action.deadline == null ? null : sanitizeString(String(action.deadline), 32)
  };
}

function sanitizeAnswerObject(answer) {
  if (!isObject(answer)) return {};
  const out = {};
  if (answer.value !== undefined) {
    out.value = typeof answer.value === 'string' ? sanitizeString(answer.value, 5000) : answer.value;
  }
  if (answer.note !== undefined) out.note = sanitizeString(answer.note, 5000);
  if (answer.mediaFiles !== undefined) out.mediaFiles = sanitizeStringArray(answer.mediaFiles, 50, 255);
  if (answer.flagged !== undefined) out.flagged = !!answer.flagged;
  if (answer.action !== undefined) out.action = sanitizeActionObject(answer.action);
  if (answer.actionStatus !== undefined) out.actionStatus = sanitizeString(answer.actionStatus, 32);
  if (answer.actionDeadline !== undefined) out.actionDeadline = answer.actionDeadline == null ? null : sanitizeString(String(answer.actionDeadline), 32);
  if (answer._showNote !== undefined) out._showNote = !!answer._showNote;
  if (answer._showMedia !== undefined) out._showMedia = !!answer._showMedia;
  if (answer._showAction !== undefined) out._showAction = !!answer._showAction;
  if (answer.savedAt !== undefined) out.savedAt = sanitizeString(String(answer.savedAt), 64);
  if (answer.severity !== undefined) out.severity = answer.severity === null ? null : sanitizeString(String(answer.severity), 32);
  if (answer.location !== undefined) out.location = answer.location === null ? null : sanitizeString(String(answer.location), 500);
  return out;
}

function sanitizeAnswersMap(answers) {
  if (!isObject(answers)) return {};
  const out = {};
  Object.keys(answers).forEach(function(key) {
    out[String(key)] = sanitizeAnswerObject(answers[key]);
  });
  return out;
}

function sanitizeRepeatableAnswersMap(repeatableAnswers) {
  if (!isObject(repeatableAnswers)) return {};
  const out = {};
  Object.keys(repeatableAnswers).forEach(function(sectionId) {
    const instances = Array.isArray(repeatableAnswers[sectionId]) ? repeatableAnswers[sectionId] : [];
    out[String(sectionId)] = instances.map(function(instance) {
      return sanitizeAnswersMap(instance);
    });
  });
  return out;
}

function sanitizeInspectionPatch(payload) {
  if (!isObject(payload)) return {};
  const out = {};
  if (payload.answers !== undefined) out.answers = sanitizeAnswersMap(payload.answers);
  if (payload.repeatableAnswers !== undefined) out.repeatableAnswers = sanitizeRepeatableAnswersMap(payload.repeatableAnswers);
  if (payload.activityLog !== undefined && Array.isArray(payload.activityLog)) {
    out.activityLog = payload.activityLog.slice(0, 200).map(function(entry) {
      if (!isObject(entry)) return null;
      return {
        type: sanitizeString(entry.type || '', 64),
        message: sanitizeString(entry.message || '', 1000),
        user: sanitizeString(entry.user || '', 120),
        createdAt: sanitizeString(String(entry.createdAt || ''), 64)
      };
    }).filter(Boolean);
  }
  if (payload._updatedAt !== undefined) out._updatedAt = sanitizeString(String(payload._updatedAt), 64);
  return out;
}

function sanitizeConfigPatch(payload) {
  if (!isObject(payload)) return {};
  const out = {};
  if (payload.dataPath !== undefined) out.dataPath = sanitizeString(payload.dataPath, 500);
  if (payload.branding !== undefined && isObject(payload.branding)) {
    out.branding = {};
    ALLOWED_BRANDING_KEYS.forEach(function(key) {
      if (payload.branding[key] !== undefined) out.branding[key] = sanitizeString(payload.branding[key], 500);
    });
  }
  if (payload.security !== undefined && isObject(payload.security)) {
    out.security = {};
    if (payload.security.enabled !== undefined) out.security.enabled = !!payload.security.enabled;
    if (payload.security.requireAuthForLan !== undefined) out.security.requireAuthForLan = !!payload.security.requireAuthForLan;
    if (payload.security.pin !== undefined) out.security.pin = sanitizeString(String(payload.security.pin), 128);
    if (payload.security.pinHash !== undefined) out.security.pinHash = sanitizeString(String(payload.security.pinHash), 512);
  }
  if (payload.syncDestinations !== undefined && Array.isArray(payload.syncDestinations)) {
    out.syncDestinations = payload.syncDestinations
      .slice(0, 20)
      .map(sanitizeSyncDestinationInput)
      .filter(function(item) { return item && Object.keys(item).length > 0; });
  }
  return out;
}

function sanitizeWebhookInput(payload) {
  if (!isObject(payload)) return {};
  const out = {};
  if (payload.name !== undefined) out.name = sanitizeString(payload.name, 120);
  if (payload.url !== undefined) out.url = sanitizeString(payload.url, 2048);
  if (payload.secret !== undefined) out.secret = sanitizeString(payload.secret, 500);
  if (payload.events !== undefined) out.events = sanitizeStringArray(payload.events, ALLOWED_WEBHOOK_EVENTS.length, 64);
  if (payload.headers !== undefined) out.headers = sanitizePlainObjectStrings(payload.headers, { maxKeys: 20, maxKeyLength: 64, maxValueLength: 500 });
  if (payload.retryOnFailure !== undefined) out.retryOnFailure = !!payload.retryOnFailure;
  if (payload.enabled !== undefined) out.enabled = !!payload.enabled;
  return out;
}

function sanitizeSyncDestinationInput(payload) {
  if (!isObject(payload)) return {};
  const out = {};
  if (payload.id !== undefined) out.id = sanitizeString(payload.id, 120);
  if (payload.name !== undefined) out.name = sanitizeString(payload.name, 120);
  if (payload.kind !== undefined) out.kind = sanitizeString(payload.kind, 32);
  if (payload.url !== undefined) out.url = sanitizeString(payload.url, 2048);
  if (payload.headers !== undefined) out.headers = sanitizePlainObjectStrings(payload.headers, { maxKeys: 20, maxKeyLength: 64, maxValueLength: 500 });
  if (payload.enabled !== undefined) out.enabled = !!payload.enabled;
  if (payload.notes !== undefined) out.notes = sanitizeString(payload.notes, 1000);
  return out;
}

function validateActionObject(action, path, errors) {
  if (typeof action === 'string') return;
  if (!isObject(action)) {
    errors.push(path + ' debe ser texto u objeto.');
    return;
  }
  if (!hasOnlyKeys(action, ALLOWED_ACTION_KEYS)) errors.push(path + ' contiene campos no permitidos.');
  if (action.description !== undefined && typeof action.description !== 'string') errors.push(path + '.description debe ser texto.');
  if (action.status !== undefined && !['open', 'in_progress', 'resolved'].includes(action.status)) errors.push(path + '.status inválido.');
  if (action.assignedTo !== undefined && typeof action.assignedTo !== 'string') errors.push(path + '.assignedTo debe ser texto.');
  if (action.deadline !== undefined && action.deadline !== null && typeof action.deadline !== 'string') errors.push(path + '.deadline debe ser texto o null.');
}

function validateAnswersMap(answers, path, errors) {
  if (!isObject(answers)) {
    errors.push(path + ' debe ser un objeto.');
    return;
  }
  Object.keys(answers).forEach(function(questionId) {
    const answer = answers[questionId];
    const answerPath = path + '.' + questionId;
    if (!isObject(answer)) {
      errors.push(answerPath + ' debe ser un objeto.');
      return;
    }
    if (!hasOnlyKeys(answer, ALLOWED_ANSWER_KEYS)) errors.push(answerPath + ' contiene campos no permitidos.');
    if (answer.note !== undefined && typeof answer.note !== 'string') errors.push(answerPath + '.note debe ser texto.');
    if (answer.mediaFiles !== undefined && !Array.isArray(answer.mediaFiles)) errors.push(answerPath + '.mediaFiles debe ser array.');
    if (Array.isArray(answer.mediaFiles) && answer.mediaFiles.some(function(file) { return typeof file !== 'string'; })) errors.push(answerPath + '.mediaFiles solo admite texto.');
    if (answer.flagged !== undefined && typeof answer.flagged !== 'boolean') errors.push(answerPath + '.flagged debe ser booleano.');
    if (answer.action !== undefined) validateActionObject(answer.action, answerPath + '.action', errors);
  });
}

function validateTemplate(template) {
  const errors = [];
  if (!isObject(template)) errors.push('La plantilla debe ser un objeto.');
  if (!template || typeof template.name !== 'string' || !template.name.trim()) errors.push('La plantilla requiere un nombre.');
  if (template && typeof template.name === 'string' && template.name.length > 200) errors.push('La plantilla no puede superar 200 caracteres en el nombre.');
  if (template && template.description !== undefined && typeof template.description !== 'string') errors.push('La descripción debe ser texto.');
  if (template && typeof template.description === 'string' && template.description.length > 2000) errors.push('La descripción no puede superar 2000 caracteres.');
  if (template && template.tags !== undefined && (!Array.isArray(template.tags) || template.tags.some(function(tag) { return typeof tag !== 'string' || tag.length > 50; }))) errors.push('tags debe ser un array de strings cortos.');
  if (!template || !Array.isArray(template.pages) || template.pages.length === 0) errors.push('La plantilla requiere al menos una página.');

  (template && template.pages || []).forEach(function(page, pageIndex) {
    if (!isObject(page)) errors.push('Página ' + (pageIndex + 1) + ': formato inválido.');
    if (!Array.isArray(page.sections)) errors.push('Página ' + (pageIndex + 1) + ': faltan secciones.');
    (page.sections || []).forEach(function(section, sectionIndex) {
      if (!Array.isArray(section.questions)) errors.push('Página ' + (pageIndex + 1) + ', sección ' + (sectionIndex + 1) + ': faltan preguntas.');
      (section.questions || []).forEach(function(question, questionIndex) {
        if (!question.id) errors.push('Pregunta ' + (questionIndex + 1) + ' en página ' + (pageIndex + 1) + ': falta id.');
        if (typeof question.text !== 'string') errors.push('Pregunta ' + (questionIndex + 1) + ' en página ' + (pageIndex + 1) + ': texto inválido.');
      });
    });
  });

  return { ok: errors.length === 0, errors };
}

function validateInspection(inspection) {
  const errors = [];
  if (!isObject(inspection)) errors.push('La inspección debe ser un objeto.');
  if (!inspection || !inspection.id) errors.push('La inspección requiere id.');
  if (!inspection || !inspection.templateId) errors.push('La inspección requiere templateId.');
  if (!inspection || !inspection.snapshot || !Array.isArray(inspection.snapshot.pages)) errors.push('La inspección requiere snapshot válido.');
  if (!inspection || !isObject(inspection.answers)) errors.push('La inspección requiere answers como objeto.');
  if (inspection && inspection.repeatableAnswers !== undefined && !isObject(inspection.repeatableAnswers)) errors.push('repeatableAnswers debe ser un objeto.');
  if (inspection && isObject(inspection.answers)) validateAnswersMap(inspection.answers, 'answers', errors);
  if (inspection && isObject(inspection.repeatableAnswers)) {
    Object.keys(inspection.repeatableAnswers).forEach(function(sectionId) {
      const instances = inspection.repeatableAnswers[sectionId];
      if (!Array.isArray(instances)) {
        errors.push('repeatableAnswers.' + sectionId + ' debe ser un array.');
        return;
      }
      instances.forEach(function(instance, index) {
        validateAnswersMap(instance, 'repeatableAnswers.' + sectionId + '[' + index + ']', errors);
      });
    });
  }
  return { ok: errors.length === 0, errors };
}

function validateWebhook(hook) {
  const errors = [];
  if (!isObject(hook)) errors.push('El webhook debe ser un objeto.');
  if (hook && !hasOnlyKeys(hook, ALLOWED_WEBHOOK_KEYS)) errors.push('El webhook contiene campos no permitidos.');
  if (!hook || typeof hook.url !== 'string' || !hook.url.trim()) errors.push('El webhook requiere una URL.');
  if (hook && typeof hook.url === 'string') {
    try {
      const parsed = new URL(hook.url);
      if (!['http:', 'https:'].includes(parsed.protocol)) errors.push('La URL del webhook debe usar http o https.');
    } catch (e) {
      errors.push('La URL del webhook no es válida.');
    }
  }
  if (hook && hook.name !== undefined && typeof hook.name !== 'string') errors.push('name debe ser texto.');
  if (!hook || !Array.isArray(hook.events) || hook.events.length === 0) errors.push('El webhook requiere al menos un evento.');
  if (Array.isArray(hook && hook.events) && hook.events.some(function(event) { return !ALLOWED_WEBHOOK_EVENTS.includes(event); })) errors.push('El webhook contiene eventos no permitidos.');
  if (hook && hook.headers !== undefined && !isObject(hook.headers)) errors.push('headers debe ser un objeto plano.');
  if (hook && isObject(hook.headers) && Object.values(hook.headers).some(function(value) { return typeof value !== 'string'; })) errors.push('headers solo admite valores string.');
  return { ok: errors.length === 0, errors };
}

function validateSyncDestination(destination) {
  const errors = [];
  if (!isObject(destination)) errors.push('El destino de sincronizacion debe ser un objeto.');
  if (destination && !hasOnlyKeys(destination, ALLOWED_SYNC_DESTINATION_KEYS)) errors.push('El destino de sincronizacion contiene campos no permitidos.');
  if (!destination || typeof destination.name !== 'string' || !destination.name.trim()) errors.push('El destino de sincronizacion requiere un nombre.');
  if (!destination || typeof destination.kind !== 'string' || !ALLOWED_SYNC_DESTINATION_KINDS.includes(destination.kind)) {
    errors.push('El destino de sincronizacion requiere un tipo valido.');
  }
  if (!destination || typeof destination.url !== 'string' || !destination.url.trim()) errors.push('El destino de sincronizacion requiere una URL.');
  if (destination && typeof destination.url === 'string') {
    try {
      const parsed = new URL(destination.url);
      if (!['http:', 'https:'].includes(parsed.protocol)) errors.push('La URL del destino debe usar http o https.');
    } catch (e) {
      errors.push('La URL del destino no es valida.');
    }
  }
  if (destination && destination.headers !== undefined && !isObject(destination.headers)) errors.push('headers debe ser un objeto plano.');
  if (destination && isObject(destination.headers) && Object.values(destination.headers).some(function(value) { return typeof value !== 'string'; })) {
    errors.push('headers solo admite valores string.');
  }
  if (destination && destination.enabled !== undefined && typeof destination.enabled !== 'boolean') errors.push('enabled debe ser booleano.');
  if (destination && destination.notes !== undefined && typeof destination.notes !== 'string') errors.push('notes debe ser texto.');
  return { ok: errors.length === 0, errors };
}

function validateConfig(config) {
  const errors = [];
  if (!isObject(config)) errors.push('La configuración debe ser un objeto.');
  if (config && !hasOnlyKeys(config, ALLOWED_CONFIG_KEYS)) errors.push('La configuración contiene campos no permitidos.');
  if (config && config.dataPath !== undefined && typeof config.dataPath !== 'string') errors.push('dataPath debe ser texto.');

  const branding = (config && config.branding) || {};
  if (branding && !isObject(branding)) errors.push('branding debe ser un objeto.');
  if (isObject(branding) && !hasOnlyKeys(branding, ALLOWED_BRANDING_KEYS)) errors.push('branding contiene campos no permitidos.');
  if (branding.appName !== undefined && typeof branding.appName !== 'string') errors.push('branding.appName debe ser texto.');
  if (branding.primaryColor !== undefined && typeof branding.primaryColor !== 'string') errors.push('branding.primaryColor debe ser texto.');
  if (branding.primaryColorHover !== undefined && typeof branding.primaryColorHover !== 'string') errors.push('branding.primaryColorHover debe ser texto.');
  if (branding.primaryColorLight !== undefined && typeof branding.primaryColorLight !== 'string') errors.push('branding.primaryColorLight debe ser texto.');
  if (branding.footerText !== undefined && typeof branding.footerText !== 'string') errors.push('branding.footerText debe ser texto.');

  const security = (config && config.security) || {};
  if (security && !isObject(security)) errors.push('security debe ser un objeto.');
  if (isObject(security) && !hasOnlyKeys(security, ALLOWED_SECURITY_KEYS)) errors.push('security contiene campos no permitidos.');
  if (security.enabled !== undefined && typeof security.enabled !== 'boolean') errors.push('security.enabled debe ser booleano.');
  if (security.pinHash !== undefined && typeof security.pinHash !== 'string') errors.push('security.pinHash debe ser texto.');
  if (security.requireAuthForLan !== undefined && typeof security.requireAuthForLan !== 'boolean') errors.push('security.requireAuthForLan debe ser booleano.');

  if (config && config.webhooks !== undefined && !Array.isArray(config.webhooks)) errors.push('webhooks debe ser un array.');
  if (Array.isArray(config && config.webhooks)) {
    config.webhooks.forEach(function(hook, index) {
      const hookValidation = validateWebhook(hook);
      hookValidation.errors.forEach(function(error) {
        errors.push('webhooks[' + index + ']: ' + error);
      });
    });
  }
  if (config && config.syncDestinations !== undefined && !Array.isArray(config.syncDestinations)) errors.push('syncDestinations debe ser un array.');
  if (Array.isArray(config && config.syncDestinations)) {
    config.syncDestinations.forEach(function(destination, index) {
      const destinationValidation = validateSyncDestination(destination);
      destinationValidation.errors.forEach(function(error) {
        errors.push('syncDestinations[' + index + ']: ' + error);
      });
    });
  }
  return { ok: errors.length === 0, errors };
}

module.exports = {
  ALLOWED_WEBHOOK_EVENTS,
  sanitizeTemplateInput,
  sanitizeInspectionPatch,
  sanitizeConfigPatch,
  sanitizeWebhookInput,
  sanitizeSyncDestinationInput,
  sanitizeString,
  validateTemplate,
  validateInspection,
  validateWebhook,
  validateSyncDestination,
  validateConfig
};
