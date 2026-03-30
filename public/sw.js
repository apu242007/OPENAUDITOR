self.addEventListener('install', function(event) {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', function(event) {
  event.waitUntil((async function() {
    var keys = await caches.keys();
    await Promise.all(keys.map(function(key) {
      return caches.delete(key);
    }));
    await self.registration.unregister();
    var clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    clients.forEach(function(client) {
      client.navigate(client.url);
    });
  })());
});

self.addEventListener('fetch', function() {});
