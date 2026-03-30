'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { validateTemplate, validateInspection, validateConfig } = require('../lib/validation');

test('validateTemplate acepta una plantilla mínima válida', () => {
  const result = validateTemplate({
    name: 'Demo',
    pages: [{ sections: [{ questions: [{ id: 'q1', text: 'Pregunta' }] }] }]
  });
  assert.equal(result.ok, true);
});

test('validateInspection detecta snapshot inválido', () => {
  const result = validateInspection({ id: 'i1', templateId: 't1', answers: {} });
  assert.equal(result.ok, false);
});

test('validateConfig acepta seguridad y branding básicos', () => {
  const result = validateConfig({
    branding: { appName: 'Auditor Libre', primaryColor: '#000000' },
    security: { enabled: true, pinHash: 'abc' },
    webhooks: []
  });
  assert.equal(result.ok, true);
});
