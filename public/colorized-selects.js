(function() {
  function hexToRgb(hex) {
    const clean = String(hex || '').trim().replace('#', '');
    if (!/^[0-9a-fA-F]{3,8}$/.test(clean)) return null;
    const full = clean.length === 3
      ? clean.split('').map(function(ch) { return ch + ch; }).join('')
      : clean.slice(0, 6);
    const value = parseInt(full, 16);
    return {
      r: (value >> 16) & 255,
      g: (value >> 8) & 255,
      b: value & 255
    };
  }

  function rgba(hex, alpha) {
    const rgb = hexToRgb(hex);
    if (!rgb) return '';
    return 'rgba(' + rgb.r + ',' + rgb.g + ',' + rgb.b + ',' + alpha + ')';
  }

  function defaultColorForOption(option, index) {
    const value = String(option.value || '').toLowerCase();
    const text = String(option.textContent || '').toLowerCase();
    const token = value + ' ' + text;

    if (/(published|publicada|activo|active|ok|done|closed|cerrada|complete|completed|si|yes|true|pass|success|verde)/.test(token)) return '#16a34a';
    if (/(draft|borrador|warning|pend|pending|open|abierta|orange|amber)/.test(token)) return '#d97706';
    if (/(no|false|error|fail|red|rechazado|cancel|bloq)/.test(token)) return '#dc2626';
    if (/(na|n\/a|none|ninguno|all|todos|neutral|gris|gray)/.test(token)) return '#6b7280';
    if (/(compare|sort|date|fecha|number|text|blue|azul|progress|curso|in_progress)/.test(token)) return '#2563eb';
    return ['#4f46e5', '#2563eb', '#16a34a', '#d97706', '#dc2626', '#7c3aed'][index % 6];
  }

  function resolveOptionColor(option, index) {
    return option.dataset.color || defaultColorForOption(option, index);
  }

  function styleOption(option, index) {
    const color = resolveOptionColor(option, index);
    option.dataset.colorResolved = color;
    option.style.color = color;
    option.style.backgroundColor = rgba(color, 0.10) || '#ffffff';
  }

  function paintSelect(select) {
    if (!(select instanceof HTMLSelectElement)) return;
    const option = select.options[select.selectedIndex];
    if (!option) return;
    const color = option.dataset.colorResolved || resolveOptionColor(option, select.selectedIndex);
    select.classList.add('colorized-select');
    select.style.setProperty('--select-color', color);
    select.style.setProperty('--select-border', rgba(color, 0.40) || color);
    select.style.setProperty('--select-bg-top', rgba(color, 0.16) || '#ffffff');
    select.style.setProperty('--select-bg-bottom', rgba(color, 0.09) || '#f8fafc');
  }

  function enhanceSelect(select) {
    if (!(select instanceof HTMLSelectElement)) return;
    Array.from(select.options).forEach(styleOption);
    paintSelect(select);
    if (select.dataset.colorizedBound === '1') return;
    select.dataset.colorizedBound = '1';
    select.addEventListener('change', function() {
      Array.from(select.options).forEach(styleOption);
      paintSelect(select);
    });
    select.addEventListener('input', function() {
      Array.from(select.options).forEach(styleOption);
      paintSelect(select);
    });
  }

  function refresh(root) {
    const scope = root && root.querySelectorAll ? root : document;
    scope.querySelectorAll('select').forEach(enhanceSelect);
  }

  document.addEventListener('DOMContentLoaded', function() {
    refresh(document);
    const observer = new MutationObserver(function(mutations) {
      mutations.forEach(function(mutation) {
        mutation.addedNodes.forEach(function(node) {
          if (node instanceof HTMLSelectElement) {
            enhanceSelect(node);
            return;
          }
          if (node && node.querySelectorAll) refresh(node);
        });
      });
    });
    observer.observe(document.body, { childList: true, subtree: true });
  });

  window.refreshColorizedSelects = refresh;
})();
