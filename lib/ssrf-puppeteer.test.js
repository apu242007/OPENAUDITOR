'use strict';

var mod = require('./ssrf-puppeteer');
var passed = 0;
var failed = 0;

function assert(condition, msg) {
  if (condition) { passed++; console.log('  ✅ ' + msg); }
  else { failed++; console.error('  ❌ FAIL: ' + msg); }
}

function section(name) { console.log('\n' + name); }

// ═══════════════════════════════════════
// validateImportUrl — síncrono
// ═══════════════════════════════════════

section('validateImportUrl — URLs válidas');
var r1 = mod.validateImportUrl('https://raw.githubusercontent.com/user/repo/main/template.json');
assert(r1.ok === true, 'GitHub raw URL es válida');
assert(r1.trusted === true, 'GitHub raw es trusted');

var r2 = mod.validateImportUrl('https://gitlab.com/user/repo/-/raw/main/template.json');
assert(r2.ok === true, 'GitLab URL es válida');
assert(r2.trusted === true, 'GitLab es trusted');

var r3 = mod.validateImportUrl('https://example.com/my-template.json');
assert(r3.ok === true, 'URL genérica HTTPS es válida');
assert(r3.trusted === false, 'example.com no es trusted');

section('validateImportUrl — URLs bloqueadas');
var b1 = mod.validateImportUrl('');
assert(b1.ok === false, 'URL vacía rechazada');

var b2 = mod.validateImportUrl('file:///etc/passwd');
assert(b2.ok === false, 'file:// rechazado');

var b3 = mod.validateImportUrl('ftp://server.com/template.json');
assert(b3.ok === false, 'ftp:// rechazado');

var b4 = mod.validateImportUrl('javascript:alert(1)');
assert(b4.ok === false, 'javascript: rechazado');

var b5 = mod.validateImportUrl('data:text/html,<script>alert(1)</script>');
assert(b5.ok === false, 'data: rechazado');

var b6 = mod.validateImportUrl('https://user:pass@example.com/t.json');
assert(b6.ok === false, 'URL con credenciales rechazada');

var b7 = mod.validateImportUrl('https://example.com:8080/t.json');
assert(b7.ok === false, 'Puerto no estándar rechazado');

var b8 = mod.validateImportUrl('gopher://evil.com');
assert(b8.ok === false, 'gopher:// rechazado');

var b9 = mod.validateImportUrl('https://example.com/' + 'a'.repeat(2100));
assert(b9.ok === false, 'URL >2048 chars rechazada');

var b10 = mod.validateImportUrl(12345);
assert(b10.ok === false, 'No-string rechazado');

var b11 = mod.validateImportUrl(null);
assert(b11.ok === false, 'null rechazado');

section('validateImportUrl — edge cases');
var e1 = mod.validateImportUrl('http://localhost/template.json');
assert(e1.ok === true, 'localhost HTTP permitido (desarrollo)');
assert(e1.trusted === false, 'localhost no es trusted');

var e2 = mod.validateImportUrl('https://raw.githubusercontent.com/../../../etc/passwd');
assert(e2.ok === true, 'path traversal en URL pasa validación de formato (la protección real es la verificación de contenido)');
assert(e2.trusted === true, 'host sigue siendo trusted');

// ═══════════════════════════════════════
// isPrivateIP
// ═══════════════════════════════════════

section('isPrivateIP');
assert(mod.isPrivateIP('127.0.0.1') === true, '127.0.0.1 es privada');
assert(mod.isPrivateIP('127.0.0.2') === true, '127.0.0.2 es privada');
assert(mod.isPrivateIP('10.0.0.1') === true, '10.x es privada');
assert(mod.isPrivateIP('10.255.255.255') === true, '10.255.x es privada');
assert(mod.isPrivateIP('172.16.0.1') === true, '172.16.x es privada');
assert(mod.isPrivateIP('172.31.255.255') === true, '172.31.x es privada');
assert(mod.isPrivateIP('172.15.0.1') === false, '172.15 NO es privada');
assert(mod.isPrivateIP('172.32.0.1') === false, '172.32 NO es privada');
assert(mod.isPrivateIP('192.168.0.1') === true, '192.168.x es privada');
assert(mod.isPrivateIP('192.168.255.255') === true, '192.168.255 es privada');
assert(mod.isPrivateIP('0.0.0.0') === true, '0.0.0.0 es privada');
assert(mod.isPrivateIP('169.254.169.254') === true, '169.254 (AWS metadata) es privada');
assert(mod.isPrivateIP('224.0.0.1') === true, 'multicast es privada');
assert(mod.isPrivateIP('240.0.0.1') === true, 'reserved es privada');
assert(mod.isPrivateIP('8.8.8.8') === false, '8.8.8.8 (Google DNS) NO es privada');
assert(mod.isPrivateIP('140.82.121.3') === false, 'GitHub IP NO es privada');
assert(mod.isPrivateIP('1.1.1.1') === false, 'Cloudflare DNS NO es privada');

// ═══════════════════════════════════════
// checkNotPrivateIP — async
// ═══════════════════════════════════════

section('checkNotPrivateIP (async)');

async function runAsyncTests() {
  // IP literal privada
  var cp1 = await mod.checkNotPrivateIP('127.0.0.1');
  assert(cp1.ok === false, 'checkNotPrivateIP bloquea 127.0.0.1');

  var cp2 = await mod.checkNotPrivateIP('10.0.0.5');
  assert(cp2.ok === false, 'checkNotPrivateIP bloquea 10.0.0.5');

  var cp3 = await mod.checkNotPrivateIP('192.168.1.100');
  assert(cp3.ok === false, 'checkNotPrivateIP bloquea 192.168.1.100');

  // IP literal pública
  var cp4 = await mod.checkNotPrivateIP('8.8.8.8');
  assert(cp4.ok === true, 'checkNotPrivateIP permite 8.8.8.8');

  // Hostname que resuelve a IP pública (puede fallar en entornos con red restringida)
  var cp5 = await mod.checkNotPrivateIP('github.com');
  if (cp5.ok) {
    assert(true, 'checkNotPrivateIP permite github.com (red disponible)');
  } else {
    console.log('  ⏭️  checkNotPrivateIP github.com — skip (red restringida en este entorno)');
  }

  // Hostname inexistente
  var cp6 = await mod.checkNotPrivateIP('this-domain-definitely-does-not-exist-12345.com');
  assert(cp6.ok === false, 'checkNotPrivateIP bloquea hostname irresolvable');

  // ═══════════════════════════════════════
  // puppeteerLaunchOptions
  // ═══════════════════════════════════════

  section('puppeteerLaunchOptions');
  var opts = mod.puppeteerLaunchOptions();
  assert(opts.headless === 'new', 'headless es new');
  assert(Array.isArray(opts.args), 'args es array');
  assert(opts.args.indexOf('--disable-extensions') !== -1, 'extensiones deshabilitadas');
  assert(opts.args.indexOf('--disable-background-networking') !== -1, 'networking background deshabilitado');
  assert(opts.args.indexOf('--disable-remote-fonts') !== -1, 'fuentes remotas deshabilitadas');
  assert(opts.args.indexOf('--disable-dev-shm-usage') !== -1, 'dev-shm workaround activo');
  assert(opts.timeout === 30000, 'timeout es 30s');

  // ═══════════════════════════════════════
  // Resumen
  // ═══════════════════════════════════════

  console.log('\n══════════════════════════════');
  console.log('  Total: ' + (passed + failed) + ' | ✅ ' + passed + ' | ❌ ' + failed);
  console.log('══════════════════════════════\n');
  process.exit(failed > 0 ? 1 : 0);
}

runAsyncTests().catch(function(e) {
  console.error('Error fatal en tests:', e);
  process.exit(1);
});
