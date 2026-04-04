// Shared API helpers and utilities

async function parseApiErrorResponse(response) {
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    try {
      return await response.json();
    } catch (e) {
      return null;
    }
  }
  return response.text();
}

const api = {
  async get(url) {
    const r = await fetch(url, { cache: 'no-store' });
    if (!r.ok) {
      const payload = await parseApiErrorResponse(r);
      const err = new Error(typeof payload === 'string' ? payload : ((payload && payload.message) || 'Request failed'));
      err.status = r.status;
      err.data = typeof payload === 'string' ? null : payload;
      throw err;
    }
    return r.json();
  },
  async getBlob(url) {
    const r = await fetch(url, { cache: 'no-store' });
    if (!r.ok) throw new Error(await r.text());
    return r.blob();
  },
  async post(url, data) {
    const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    if (!r.ok) {
      const payload = await parseApiErrorResponse(r);
      const err = new Error(typeof payload === 'string' ? payload : ((payload && payload.message) || 'Request failed'));
      err.status = r.status;
      err.data = typeof payload === 'string' ? null : payload;
      throw err;
    }
    return r.json();
  },
  async put(url, data) {
    const r = await fetch(url, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    if (!r.ok) {
      const payload = await parseApiErrorResponse(r);
      const err = new Error(typeof payload === 'string' ? payload : ((payload && payload.message) || 'Request failed'));
      err.status = r.status;
      err.data = typeof payload === 'string' ? null : payload;
      throw err;
    }
    return r.json();
  },
  async del(url) {
    const r = await fetch(url, { method: 'DELETE' });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  },
  async upload(url, file) {
    const formData = new FormData();
    formData.append('file', file);
    const r = await fetch(url, { method: 'POST', body: formData });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  }
};

function isConflictError(err) {
  return !!(err && err.status === 409 && err.data && err.data.error === 'CONFLICT');
}

function esc(s) {
  return String(s || '').replace(/&/g,'\x26amp;').replace(/</g,'\x26lt;').replace(/>/g,'\x26gt;').replace(/"/g,'\x26quot;');
}

function formatDate(iso) {
  if (!iso) return '-';
  const d = new Date(iso);
  const lang = localStorage.getItem('oa_lang') || 'es';
  const locale = lang === 'en' ? 'en-US' : 'es-ES';
  return d.toLocaleDateString(locale, { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

let __translations = null;
async function initI18n() {
  const lang = localStorage.getItem('oa_lang') || 'es';
  try {
    __translations = await api.get('/api/i18n/' + lang);
  } catch (e) {
    console.error('Failed to load translations', e);
  }
}

function t(key, data = {}) {
  if (!__translations) return key;
  const parts = key.split('.');
  let val = __translations;
  for (const p of parts) {
    val = val ? val[p] : null;
  }
  if (typeof val !== 'string') return key;
  for (const [k, v] of Object.entries(data)) {
    val = val.replace('{{' + k + '}}', v);
  }
  return val;
}

function switchLanguage(lang) {
  localStorage.setItem('oa_lang', lang);
  location.reload();
}

function uuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

function toast(msg, type = '') {
  const c = document.getElementById('toastContainer');
  if (!c) return;
  const t = document.createElement('div');
  t.className = 'toast' + (type ? ' toast-' + type : '');
  t.textContent = msg;
  c.appendChild(t);
  setTimeout(() => t.remove(), 3000);
}

const RESPONSE_TYPES = [
  { value: 'multiple_choice', label: 'Opciones múltiples' },
  { value: 'text',            label: 'Texto' },
  { value: 'number',   label: 'Numero' },
  { value: 'date',     label: 'Fecha' },
  { value: 'site',     label: 'Sitio' },
  { value: 'person',   label: 'Persona' },
  { value: 'location', label: 'Ubicacion' },
  { value: 'checkbox', label: 'Casilla' },
];

function responseTypeLabel(val) {
  const t = RESPONSE_TYPES.find(t => t.value === val);
  return t ? t.label : val;
}

function isLocalDevHost() {
  return location.hostname === 'localhost' || location.hostname === '127.0.0.1';
}

async function registerPWA() {
  if ('serviceWorker' in navigator) {
    try {
      await navigator.serviceWorker.register('/sw.js');
    } catch (e) {
      console.warn('PWA: Service Worker registration failed', e);
    }
  }
}

function initUiMotion(root = document) {
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const revealSelectors = [
    '.card',
    '.section-block',
    '.exec-question',
    '.empty-state',
    '.page-item',
    '.inspector-nav-item',
    '.webhook-item'
  ];

  function markReveal(el, index) {
    if (!el || el.dataset.motionReady === 'true') return;
    el.dataset.motionReady = 'true';
    el.style.setProperty('--motion-delay', Math.min(index * 45, 220) + 'ms');
    el.classList.add('ui-reveal');
  }

  revealSelectors.forEach((selector) => {
    if (root instanceof HTMLElement && root.matches(selector)) markReveal(root, 0);
    root.querySelectorAll(selector).forEach((el, index) => markReveal(el, index));
  });

  if (root instanceof HTMLElement && root.matches('.dropdown-menu')) {
    if (root.dataset.motionDropdown !== 'true') {
      root.dataset.motionDropdown = 'true';
      root.classList.add('ui-dropdown-panel');
    }
  }
  root.querySelectorAll('.dropdown-menu').forEach((el) => {
    if (el.dataset.motionDropdown === 'true') return;
    el.dataset.motionDropdown = 'true';
    el.classList.add('ui-dropdown-panel');
  });

  if (root instanceof HTMLElement && root.matches('.modal-overlay')) {
    if (root.dataset.motionModal !== 'true') {
      root.dataset.motionModal = 'true';
      root.classList.add('ui-modal-shell');
      const panel = root.querySelector('.modal');
      if (panel) panel.classList.add('ui-modal-panel');
    }
  }
  root.querySelectorAll('.modal-overlay').forEach((el) => {
    if (el.dataset.motionModal === 'true') return;
    el.dataset.motionModal = 'true';
    el.classList.add('ui-modal-shell');
    const panel = el.querySelector('.modal');
    if (panel) panel.classList.add('ui-modal-panel');
  });
}

function initComponentMotion(root = document) {
  const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = !window.matchMedia || window.matchMedia('(pointer: fine)').matches;

  function mark(selector, className) {
    if (root instanceof HTMLElement && root.matches(selector)) root.classList.add(className);
    root.querySelectorAll(selector).forEach((el) => el.classList.add(className));
  }

  mark('.index-main > .card', 'ui-feature-card');
  mark('#templateCard', 'ui-feature-card');
  mark('.page-header h1', 'ui-heading-accent');
  mark('.filter-bar', 'ui-filter-surface');
  mark('.actions-cell .btn', 'ui-tactile');
  mark('.report-actions .btn', 'ui-tactile');
  mark('#btnSave', 'ui-tactile');
  mark('#btnComplete', 'ui-tactile ui-cta-glow');
  mark('#btnKiosk', 'ui-tactile');
  mark('#syncStatus', 'ui-sync-live');
  mark('.progress-container', 'ui-progress-shell');
  mark('#progressBar', 'ui-progress-live');
  mark('.report-score-box', 'ui-score-spotlight');
  mark('.exec-question', 'ui-question-focus');

  if (!reduceMotion) {
    root.querySelectorAll('.ui-feature-card, .ui-score-spotlight').forEach((el) => {
      if (el.dataset.motionTiltReady === 'true') return;
      el.dataset.motionTiltReady = 'true';

      if (finePointer) {
        el.addEventListener('mousemove', function(event) {
          const rect = el.getBoundingClientRect();
          const px = (event.clientX - rect.left) / rect.width;
          const py = (event.clientY - rect.top) / rect.height;
          const rotateX = (0.5 - py) * 3;
          const rotateY = (px - 0.5) * 4;
          el.style.setProperty('--tilt-x', rotateX.toFixed(2) + 'deg');
          el.style.setProperty('--tilt-y', rotateY.toFixed(2) + 'deg');
        });

        el.addEventListener('mouseleave', function() {
          el.style.setProperty('--tilt-x', '0deg');
          el.style.setProperty('--tilt-y', '0deg');
        });
      }
    });

    root.querySelectorAll('.ui-tactile').forEach((el) => {
      if (el.dataset.motionRippleReady === 'true') return;
      el.dataset.motionRippleReady = 'true';

      el.addEventListener('click', function(event) {
        const rect = el.getBoundingClientRect();
        const ripple = document.createElement('span');
        ripple.className = 'ui-ripple-dot';
        ripple.style.left = (event.clientX - rect.left) + 'px';
        ripple.style.top = (event.clientY - rect.top) + 'px';
        el.appendChild(ripple);
        window.setTimeout(function() { ripple.remove(); }, 650);
      });
    });
  }
}

function initInspectorDetailMotion(root = document) {
  const inspectorRoot =
    (root instanceof HTMLElement && (root.matches('#insLayout') || root.querySelector('#insLayout')))
      ? (root.matches && root.matches('#insLayout') ? root : root.querySelector('#insLayout'))
      : document.getElementById('insLayout');

  if (!inspectorRoot) return;

  const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function mark(selector, className) {
    if (root instanceof HTMLElement && root.matches(selector)) root.classList.add(className);
    root.querySelectorAll(selector).forEach((el) => el.classList.add(className));
  }

  mark('.inspector-topbar', 'ui-inspector-topbar');
  mark('#syncStatus', 'ui-sync-hero');
  mark('.progress-container', 'ui-progress-hero-shell');
  mark('#progressBar', 'ui-progress-hero-bar');
  mark('.inspector-nav-item', 'ui-nav-hero');
  mark('.exec-question', 'ui-question-hero');
  mark('#btnSave', 'ui-save-soft');
  mark('#btnComplete', 'ui-complete-hero');

  if (reduceMotion) return;
}

function initReportDetailMotion(root = document) {
  const reportRoot =
    (root instanceof HTMLElement && (root.matches('#reportView') || root.querySelector('#reportView')))
      ? (root.matches && root.matches('#reportView') ? root : root.querySelector('#reportView'))
      : document.getElementById('reportView');

  if (!reportRoot || reportRoot.classList.contains('hidden')) return;

  const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  reportRoot.querySelectorAll('.report-header').forEach((el) => el.classList.add('ui-report-hero-head'));
  reportRoot.querySelectorAll('.report-score-box').forEach((el) => el.classList.add('ui-report-score-hero'));
  reportRoot.querySelectorAll('.report-score-val').forEach((el) => el.classList.add('ui-report-score-value'));
  reportRoot.querySelectorAll('.report-actions .btn').forEach((el) => el.classList.add('ui-report-action-soft', 'ui-tactile'));
  reportRoot.querySelectorAll('.report-actions .btn-primary').forEach((el) => el.classList.add('ui-report-action-hero'));

  Array.from(reportRoot.children).forEach((child) => {
    if (!(child instanceof HTMLElement)) return;
    if (child.classList.contains('report-header') || child.classList.contains('report-score-box') || child.classList.contains('report-actions')) return;
    child.classList.add('ui-report-section-soft');
  });

  reportRoot.querySelectorAll('div').forEach((el) => {
    if ((el.textContent || '').includes('Elemento señalado')) {
      el.classList.add('ui-report-flag-soft');
    }
  });

  const reportHeader = reportRoot.querySelector('.report-header');
  if (reportHeader) {
    Array.from(reportHeader.children).forEach((child, index) => {
      if (!(child instanceof HTMLElement)) return;
      if (index === 0 && child.tagName === 'DIV') child.classList.add('ui-report-code-pill');
    });
  }

  if (reduceMotion) return;

  reportRoot.querySelectorAll('.ui-report-score-value').forEach((el) => {
    if (el.dataset.scoreAnimated === 'true') return;
    el.dataset.scoreAnimated = 'true';

    const match = (el.textContent || '').match(/(\d+)\s*\/\s*(\d+)\s*\((\d+)%\)/);
    if (!match) return;

    const score = Number(match[1]);
    const maxScore = Number(match[2]);
    const pct = Number(match[3]);
    const duration = 1100;
    const start = performance.now();

    function tick(now) {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const currentScore = Math.round(score * eased);
      const currentPct = Math.round(pct * eased);
      el.textContent = currentScore + ' / ' + maxScore + ' (' + currentPct + '%)';
      if (progress < 1) {
        requestAnimationFrame(tick);
      }
    }

    requestAnimationFrame(tick);
  });
}

document.addEventListener('DOMContentLoaded', function() {
  registerPWA();
});
