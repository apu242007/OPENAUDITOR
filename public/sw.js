importScripts('/js/db.js');
const CACHE_NAME = 'auditorlibre-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/catalog.html',
  '/settings.html',
  '/about.html',
  '/actions.html',
  '/compare.html',
  '/search.html',
  '/editor.html',
  '/inspector.html',
  '/offline.html',
  '/style.css',
  '/app.js',
  '/colorized-selects.js',
  '/js/db.js',
  '/favicon.svg',
  '/logo.svg',
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Intentamos cachear todos los estáticos, no fallamos si alguno no existe
      return Promise.allSettled(
        STATIC_ASSETS.map((url) => cache.add(url).catch((err) => console.log('SW Cache Add Error for', url, err)))
      );
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  
  const url = new URL(event.request.url);

  // APIs y datos dinámicos: Network First, fallback a /offline.html
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(event.request).catch(() => {
        // En caso de que estenos offline y queramos manejar APIs específicamente
        // por ahora dejamos que falle si no es un request de navegación
        if (event.request.mode === 'navigate') {
          return caches.match('/offline.html');
        }
        return new Response('{"error": "Offline"}', {
          status: 503,
          headers: { 'Content-Type': 'application/json' }
        });
      })
    );
    return;
  }
  
  // Archivos estáticos y de página: Cache First + Background Revalidate
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, networkResponse.clone()));
        return networkResponse;
      }).catch(() => {
        // Fallback for navigation requests
        if (event.request.mode === 'navigate') {
          return caches.match('/offline.html');
        }
        return null;
      });
      return cachedResponse || fetchPromise;
    })
  );
});

self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-inspections') {
    event.waitUntil(processSyncQueue());
  }
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'TRIGGER_SYNC') {
    event.waitUntil(processSyncQueue());
  }
});

async function processSyncQueue() {
  if (!self.auditDb) return;
  const pending = await self.auditDb.obtenerPendientes();
  if (!pending || pending.length === 0) return;

  for (const item of pending) {
    try {
      if (item.tipo === 'inspection-save') {
        await doFetch('/api/inspections/' + item.inspeccionId, 'PUT', item.payload);
      } else if (item.tipo === 'inspection-complete') {
        await doFetch('/api/inspections/' + item.inspeccionId + '/complete', 'POST', item.payload);
      }
      
      let photos = await self.auditDb.obtenerFotosPorInspeccion(item.inspeccionId);
      let fileMap = {};
      for (const photo of photos) {
        if (!photo.subida && photo.blob) {
          const fd = new FormData();
          fd.append('file', photo.blob, 'photo.jpg');
          const pRes = await doFetch('/api/upload', 'POST', fd, true);
          if (pRes && pRes.filename) {
            await self.auditDb.marcarFotoSubida(photo.fotoId, pRes.filename);
            fileMap['local:' + photo.fotoId] = pRes.filename;
          }
        }
      }

      await self.auditDb.eliminarDeQueue(item.id);
      
      const clients = await self.clients.matchAll();
      clients.forEach(client => client.postMessage({
        type: 'SYNC_COMPLETE',
        inspeccionId: item.inspeccionId,
        fileMap: fileMap
      }));
      
    } catch (e) {
      console.warn('Background sync failed for item', item.id, e);
      await self.auditDb.marcarEstado(item.id, 'error');
      const clients = await self.clients.matchAll();
      clients.forEach(client => client.postMessage({
        type: 'SYNC_ERROR',
        inspeccionId: item.inspeccionId,
        error: e.message
      }));
    }
  }
}

async function doFetch(url, method, rawData, isFormData = false) {
  const options = { method: method, headers: {} };
  if (!isFormData) {
    options.headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(rawData);
  } else {
    options.body = rawData;
  }
  const res = await fetch(url, options);
  if (!res.ok) throw new Error('Server returned ' + res.status);
  return res.json();
}
