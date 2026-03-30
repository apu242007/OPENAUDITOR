'use strict';

// Tests básicos para security.js — correr con: node security.test.js
var sec = require('./security');
var passed = 0;
var failed = 0;

function assert(condition, msg) {
  if (condition) { passed++; console.log('  ✅ ' + msg); }
  else { failed++; console.error('  ❌ ' + msg); }
}

function section(name) { console.log('\n' + name); }

// ─── sanitizeStr ───
section('sanitizeStr');
assert(sec.sanitizeStr('hola') === 'hola', 'texto normal pasa sin cambios');
assert(sec.sanitizeStr('<script>alert(1)</script>').indexOf('<script>') === -1, 'neutraliza script tags');
assert(sec.sanitizeStr('texto\x00oculto') === 'textooculto', 'elimina null byte');
assert(sec.sanitizeStr('  espacios  ') === 'espacios', 'trim de espacios');
assert(sec.sanitizeStr(123) === 123, 'no-string devuelve tal cual');
assert(sec.sanitizeStr(null) === null, 'null devuelve null');

// ─── sanitizeDeep ───
section('sanitizeDeep');
var deep = sec.sanitizeDeep({ name: '<script>x</script>', tags: ['ok', '<b>bold</b>'], nested: { val: 'clean' } });
assert(deep.name.indexOf('<script>') === -1, 'limpia script en objeto');
assert(deep.tags[1] === '<b>bold</b>', 'no toca tags html que no son script');
assert(deep.nested.val === 'clean', 'strings limpios pasan');

var arr = sec.sanitizeDeep(['<script>x', 'ok']);
assert(arr[0].indexOf('<script>') === -1, 'limpia dentro de arrays');

// ─── validateTemplate ───
section('validateTemplate');
assert(sec.validateTemplate({}) === null, 'cuerpo vacío es válido (parcial update)');
assert(sec.validateTemplate({ name: 'Test' }) === null, 'nombre válido pasa');
assert(sec.validateTemplate({ name: '' }) !== null, 'nombre vacío falla');
assert(sec.validateTemplate({ name: 'x'.repeat(201) }) !== null, 'nombre >200 chars falla');
assert(sec.validateTemplate({ name: 123 }) !== null, 'nombre no-string falla');
assert(sec.validateTemplate({ description: 'x'.repeat(5001) }) !== null, 'descripción >5000 falla');
assert(sec.validateTemplate({ pages: 'not array' }) !== null, 'pages no-array falla');
assert(sec.validateTemplate({ tags: ['a', 'b'] }) === null, 'tags válidos pasan');
assert(sec.validateTemplate({ tags: new Array(21).fill('x') }) !== null, 'más de 20 tags falla');
assert(sec.validateTemplate({ tags: [123] }) !== null, 'tag no-string falla');

// Validación de estructura de páginas
assert(sec.validateTemplate({ pages: [{ id: 'p1', name: 'OK', sections: [] }] }) === null, 'página válida pasa');
assert(sec.validateTemplate({ pages: [{ name: 'no id' }] }) !== null, 'página sin id falla');

// ─── validateInspectionUpdate ───
section('validateInspectionUpdate');
assert(sec.validateInspectionUpdate({}) === null, 'cuerpo vacío válido');
assert(sec.validateInspectionUpdate({ answers: { q1: { value: 'yes' } } }) === null, 'answers válidos pasan');
assert(sec.validateInspectionUpdate({ answers: 'no' }) !== null, 'answers string falla');
assert(sec.validateInspectionUpdate({ answers: { q1: 'string' } }) !== null, 'answer string directo falla');
assert(sec.validateInspectionUpdate({ answers: { q1: { note: 'x'.repeat(5001) } } }) !== null, 'nota >5000 falla');
assert(sec.validateInspectionUpdate({ activityLog: [{ type: 'answer' }] }) === null, 'activityLog válido pasa');
assert(sec.validateInspectionUpdate({ activityLog: 'no' }) !== null, 'activityLog no-array falla');

// ─── validateWebhook ───
section('validateWebhook');
assert(sec.validateWebhook({ url: 'https://example.com/hook', events: ['inspection.completed'] }) === null, 'webhook válido pasa');
assert(sec.validateWebhook({}) !== null, 'sin url falla');
assert(sec.validateWebhook({ url: 'not-a-url', events: ['inspection.completed'] }) !== null, 'url inválida falla');
assert(sec.validateWebhook({ url: 'https://x.com', events: [] }) !== null, 'events vacío falla');
assert(sec.validateWebhook({ url: 'https://x.com', events: ['invalid.event'] }) !== null, 'evento inválido falla');
assert(sec.validateWebhook({ url: 'https://x.com', events: ['inspection.completed'], name: 'x'.repeat(101) }) !== null, 'name >100 falla');

// ─── validateConfig ───
section('validateConfig');
assert(sec.validateConfig({}) === null, 'config vacío válido');
assert(sec.validateConfig({ dataPath: '/tmp/data' }) === null, 'dataPath válido');
assert(sec.validateConfig({ dataPath: 123 }) !== null, 'dataPath no-string falla');
assert(sec.validateConfig({ branding: { appName: 'Mi App', primaryColor: '#ff0000' } }) === null, 'branding válido');
assert(sec.validateConfig({ branding: { primaryColor: 'notahex' } }) !== null, 'color no hex falla');
assert(sec.validateConfig({ branding: { appName: 'x'.repeat(101) } }) !== null, 'appName >100 falla');

// ─── validateActionUpdate ───
section('validateActionUpdate');
assert(sec.validateActionUpdate({}) === null, 'vacío válido');
assert(sec.validateActionUpdate({ status: 'open' }) === null, 'status open válido');
assert(sec.validateActionUpdate({ status: 'in_progress' }) === null, 'status in_progress válido');
assert(sec.validateActionUpdate({ status: 'resolved' }) === null, 'status resolved válido');
assert(sec.validateActionUpdate({ status: 'invalid' }) !== null, 'status inválido falla');
assert(sec.validateActionUpdate({ deadline: '2025-12-31' }) === null, 'deadline válido');
assert(sec.validateActionUpdate({ deadline: 'mañana' }) !== null, 'deadline no fecha falla');
assert(sec.validateActionUpdate({ assignedTo: 'Juan' }) === null, 'assignedTo válido');
assert(sec.validateActionUpdate({ assignedTo: 'x'.repeat(201) }) !== null, 'assignedTo >200 falla');

// ─── Resumen ───
console.log('\n══════════════════════════════');
console.log('  Total: ' + (passed + failed) + ' | ✅ ' + passed + ' | ❌ ' + failed);
console.log('══════════════════════════════\n');
process.exit(failed > 0 ? 1 : 0);
