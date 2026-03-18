// Shared API helpers and utilities

const api = {
  async get(url) {
    const r = await fetch(url);
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  },
  async getBlob(url) {
    const r = await fetch(url);
    if (!r.ok) throw new Error(await r.text());
    return r.blob();
  },
  async post(url, data) {
    const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  },
  async put(url, data) {
    const r = await fetch(url, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    if (!r.ok) throw new Error(await r.text());
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

function esc(s) {
  return String(s || '').replace(/&/g,'\x26amp;').replace(/</g,'\x26lt;').replace(/>/g,'\x26gt;').replace(/"/g,'\x26quot;');
}

function formatDate(iso) {
  if (!iso) return '-';
  const d = new Date(iso);
  return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
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
