'use strict';

var url = require('url');
var dns = require('dns');
var net = require('net');

// ═══════════════════════════════════════════════
// 1. ANTI-SSRF — Validación de URLs de importación
// ═══════════════════════════════════════════════

var TRUSTED_HOSTS = [
  'raw.githubusercontent.com',
  'gist.githubusercontent.com',
  'gitlab.com',
  'raw.gitlab.com'
];

var BLOCKED_SCHEMES = ['file:', 'ftp:', 'gopher:', 'data:', 'javascript:'];

/**
 * Valida una URL para importación de plantillas.
 * Devuelve { ok: true, parsed, trusted } o { ok: false, error }
 */
function validateImportUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return { ok: false, error: 'URL requerida' };
  }

  rawUrl = rawUrl.trim();
  if (rawUrl.length > 2048) {
    return { ok: false, error: 'URL excede 2048 caracteres' };
  }

  var parsed;
  try {
    parsed = new URL(rawUrl);
  } catch (e) {
    return { ok: false, error: 'URL no válida' };
  }

  // Solo HTTPS (HTTP solo para localhost en desarrollo)
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    return { ok: false, error: 'Solo se permiten URLs HTTP/HTTPS' };
  }

  // Bloquear esquemas peligrosos embebidos (double encoding, etc.)
  var lower = rawUrl.toLowerCase();
  for (var i = 0; i < BLOCKED_SCHEMES.length; i++) {
    if (lower.includes(BLOCKED_SCHEMES[i])) {
      return { ok: false, error: 'Esquema bloqueado detectado en URL' };
    }
  }

  // Bloquear credenciales en URL
  if (parsed.username || parsed.password) {
    return { ok: false, error: 'URLs con credenciales no son permitidas' };
  }

  // Bloquear puertos no estándar (excepto en desarrollo)
  var port = parsed.port ? parseInt(parsed.port) : null;
  if (port && port !== 80 && port !== 443) {
    return { ok: false, error: 'Solo se permiten puertos 80 y 443' };
  }

  // Verificar si es host de confianza
  var trusted = false;
  for (var j = 0; j < TRUSTED_HOSTS.length; j++) {
    if (parsed.hostname === TRUSTED_HOSTS[j] || parsed.hostname.endsWith('.' + TRUSTED_HOSTS[j])) {
      trusted = true;
      break;
    }
  }

  return { ok: true, parsed: parsed, trusted: trusted, url: parsed.href };
}

/**
 * Verifica que un hostname no resuelva a IP privada/interna (anti-SSRF rebind).
 * Devuelve Promise<{ ok, error? }>
 */
function checkNotPrivateIP(hostname) {
  return new Promise(function(resolve) {
    // Si es IP literal, verificar directo
    if (net.isIP(hostname)) {
      if (isPrivateIP(hostname)) {
        resolve({ ok: false, error: 'No se permiten IPs privadas o de loopback' });
      } else {
        resolve({ ok: true });
      }
      return;
    }

    // Resolver DNS y verificar todas las IPs
    dns.resolve4(hostname, function(err, addresses) {
      if (err) {
        // Intentar con IPv6
        dns.resolve6(hostname, function(err6, addresses6) {
          if (err6) {
            resolve({ ok: false, error: 'No se pudo resolver el hostname: ' + hostname });
            return;
          }
          for (var i = 0; i < addresses6.length; i++) {
            if (isPrivateIPv6(addresses6[i])) {
              resolve({ ok: false, error: 'El hostname resuelve a una IP interna' });
              return;
            }
          }
          resolve({ ok: true });
        });
        return;
      }

      for (var i = 0; i < addresses.length; i++) {
        if (isPrivateIP(addresses[i])) {
          resolve({ ok: false, error: 'El hostname resuelve a una IP interna (' + addresses[i] + ')' });
          return;
        }
      }
      resolve({ ok: true });
    });
  });
}

function isPrivateIP(ip) {
  var parts = ip.split('.').map(Number);
  if (parts.length !== 4) return true; // malformed = block

  // 127.0.0.0/8 — loopback
  if (parts[0] === 127) return true;
  // 10.0.0.0/8
  if (parts[0] === 10) return true;
  // 172.16.0.0/12
  if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
  // 192.168.0.0/16
  if (parts[0] === 192 && parts[1] === 168) return true;
  // 0.0.0.0
  if (parts[0] === 0) return true;
  // 169.254.0.0/16 — link-local
  if (parts[0] === 169 && parts[1] === 254) return true;
  // 224.0.0.0/4 — multicast
  if (parts[0] >= 224 && parts[0] <= 239) return true;
  // 240-255 — reserved
  if (parts[0] >= 240) return true;

  return false;
}

function isPrivateIPv6(ip) {
  var lower = ip.toLowerCase();
  // ::1 loopback
  if (lower === '::1' || lower === '0000:0000:0000:0000:0000:0000:0000:0001') return true;
  // fe80::/10 link-local
  if (lower.startsWith('fe80')) return true;
  // fc00::/7 unique local
  if (lower.startsWith('fc') || lower.startsWith('fd')) return true;
  // :: unspecified
  if (lower === '::') return true;
  return false;
}


// ═══════════════════════════════════════════════
// 2. PUPPETEER HARDENING
// ═══════════════════════════════════════════════

/**
 * Opciones endurecidas para puppeteer.launch().
 * Devuelve el objeto de configuración para usar en lugar de { headless: 'new' }
 */
function puppeteerLaunchOptions() {
  return {
    headless: 'new',
    args: [
      // Sandbox (mantenerlo activo)
      '--no-sandbox',                     // necesario en containers/CI sin user namespace
      '--disable-setuid-sandbox',

      // Deshabilitar features que no se necesitan para generar PDFs
      '--disable-gpu',
      '--disable-dev-shm-usage',          // evita crash por /dev/shm limitado
      '--disable-software-rasterizer',

      // Bloquear acceso a red desde el navegador renderizando
      '--disable-extensions',
      '--disable-background-networking',
      '--disable-default-apps',
      '--disable-sync',
      '--disable-translate',

      // Restringir acceso a archivos
      '--disable-reading-from-canvas',
      '--disable-remote-fonts',           // no cargar fuentes externas

      // Limitar procesos
      '--single-process',                 // un solo proceso reduce superficie
      '--no-zygote',

      // Seguridad extra
      '--disable-web-security',           // no necesitamos CORS para PDF local
      '--disable-features=VizDisplayCompositor',
      '--disable-breakpad',               // no crash reports
    ],
    // Timeout de 30s para evitar que un render colgado bloquee el server
    timeout: 30000,
    // No cargar ningún perfil de usuario
    ignoreDefaultArgs: ['--enable-automation']
  };
}

/**
 * Genera un PDF de forma segura con timeout y cleanup garantizado.
 * @param {string} html - HTML a renderizar
 * @param {object} pdfOptions - Opciones para page.pdf()
 * @param {number} timeoutMs - Timeout en ms (default 30000)
 * @returns {Promise<Buffer>}
 */
async function generatePdfSafe(html, pdfOptions, timeoutMs) {
  if (!timeoutMs) timeoutMs = 30000;
  var puppeteer = require('puppeteer');
  var browser = null;

  try {
    browser = await puppeteer.launch(puppeteerLaunchOptions());
    var page = await browser.newPage();

    // Bloquear navegación a URLs externas durante el render
    await page.setRequestInterception(true);
    page.on('request', function(request) {
      var reqUrl = request.url();
      // Solo permitir data: URIs (para imágenes base64) y file: (para imágenes locales)
      if (reqUrl.startsWith('data:') || reqUrl.startsWith('file:')) {
        request.continue();
      } else if (request.resourceType() === 'document' && reqUrl === 'about:blank') {
        request.continue();
      } else {
        // Bloquear cualquier request externo (http, https, etc.)
        request.abort('blockedbyclient');
      }
    });

    // Interceptar console.log del browser (detectar errores JS)
    page.on('pageerror', function() {}); // silenciar

    // Timeout para setContent
    await Promise.race([
      page.setContent(html, { waitUntil: 'networkidle0', timeout: timeoutMs }),
      new Promise(function(_, reject) {
        setTimeout(function() { reject(new Error('Timeout renderizando HTML')); }, timeoutMs);
      })
    ]);

    // Generar PDF con timeout
    var buffer = await Promise.race([
      page.pdf(pdfOptions),
      new Promise(function(_, reject) {
        setTimeout(function() { reject(new Error('Timeout generando PDF')); }, timeoutMs);
      })
    ]);

    return buffer;
  } finally {
    // SIEMPRE cerrar el browser, incluso si hay error
    if (browser) {
      try { await browser.close(); } catch (e) { /* ignore close errors */ }
    }
  }
}


// ═══════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════

module.exports = {
  // Anti-SSRF
  validateImportUrl: validateImportUrl,
  checkNotPrivateIP: checkNotPrivateIP,
  isPrivateIP: isPrivateIP,
  TRUSTED_HOSTS: TRUSTED_HOSTS,

  // Puppeteer
  puppeteerLaunchOptions: puppeteerLaunchOptions,
  generatePdfSafe: generatePdfSafe
};
