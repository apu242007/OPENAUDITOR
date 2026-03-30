(function(scope) {
  var DB_NAME = 'auditapp';
  var DB_VERSION = 1;

  function openDb() {
    return new Promise(function(resolve, reject) {
      var req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = function(event) {
        var db = event.target.result;

        if (!db.objectStoreNames.contains('borradores')) {
          var drafts = db.createObjectStore('borradores', { keyPath: 'inspeccionId' });
          drafts.createIndex('plantillaId', 'plantillaId');
          drafts.createIndex('actualizadoEn', 'actualizadoEn');
        }

        if (!db.objectStoreNames.contains('syncQueue')) {
          var queue = db.createObjectStore('syncQueue', { keyPath: 'id', autoIncrement: true });
          queue.createIndex('estado', 'estado');
          queue.createIndex('tipo', 'tipo');
          queue.createIndex('creadoEn', 'creadoEn');
        }

        if (!db.objectStoreNames.contains('fotos')) {
          var photos = db.createObjectStore('fotos', { keyPath: 'fotoId' });
          photos.createIndex('inspeccionId', 'inspeccionId');
          photos.createIndex('subida', 'subida');
        }
      };
      req.onsuccess = function() { resolve(req.result); };
      req.onerror = function() { reject(req.error); };
    });
  }

  function runTx(storeName, mode, executor) {
    return openDb().then(function(db) {
      return new Promise(function(resolve, reject) {
        var tx = db.transaction(storeName, mode);
        var store = tx.objectStore(storeName);
        var req = executor(store);
        req.onsuccess = function() { resolve(req.result); };
        req.onerror = function() { reject(req.error); };
      });
    });
  }

  function runIndexGetAll(storeName, indexName, value) {
    return openDb().then(function(db) {
      return new Promise(function(resolve, reject) {
        var tx = db.transaction(storeName, 'readonly');
        var index = tx.objectStore(storeName).index(indexName);
        var req = index.getAll(IDBKeyRange.only(value));
        req.onsuccess = function() { resolve(req.result || []); };
        req.onerror = function() { reject(req.error); };
      });
    });
  }

  var api = {
    openDb: openDb,

    guardarBorrador: function(inspeccionId, plantillaId, respuestas, repeatableAnswers) {
      return runTx('borradores', 'readwrite', function(store) {
        return store.put({
          inspeccionId: inspeccionId,
          plantillaId: plantillaId,
          respuestas: respuestas || {},
          repeatableAnswers: repeatableAnswers || {},
          actualizadoEn: new Date().toISOString()
        });
      });
    },

    obtenerBorrador: function(inspeccionId) {
      return runTx('borradores', 'readonly', function(store) {
        return store.get(inspeccionId);
      });
    },

    eliminarBorrador: function(inspeccionId) {
      return runTx('borradores', 'readwrite', function(store) {
        return store.delete(inspeccionId);
      });
    },

    encolar: function(payload) {
      return runTx('syncQueue', 'readwrite', function(store) {
        return store.add(Object.assign({
          estado: 'pendiente',
          intentos: 0,
          creadoEn: new Date().toISOString()
        }, payload || {}));
      });
    },

    obtenerPendientes: function() {
      return runIndexGetAll('syncQueue', 'estado', 'pendiente');
    },

    obtenerErrores: function() {
      return runIndexGetAll('syncQueue', 'estado', 'error');
    },

    obtenerQueueItem: function(id) {
      return runTx('syncQueue', 'readonly', function(store) {
        return store.get(id);
      });
    },

    marcarEstado: function(id, estado) {
      return api.obtenerQueueItem(id).then(function(item) {
        if (!item) return null;
        return runTx('syncQueue', 'readwrite', function(store) {
          return store.put(Object.assign({}, item, {
            estado: estado,
            intentos: (item.intentos || 0) + 1,
            actualizadoEn: new Date().toISOString()
          }));
        });
      });
    },

    eliminarDeQueue: function(id) {
      return runTx('syncQueue', 'readwrite', function(store) {
        return store.delete(id);
      });
    },

    guardarFoto: function(fotoId, inspeccionId, itemId, blob) {
      return runTx('fotos', 'readwrite', function(store) {
        return store.put({
          fotoId: fotoId,
          inspeccionId: inspeccionId,
          itemId: itemId,
          blob: blob,
          subida: false,
          creadoEn: new Date().toISOString()
        });
      });
    },

    obtenerFoto: function(fotoId) {
      return runTx('fotos', 'readonly', function(store) {
        return store.get(fotoId);
      });
    },

    obtenerFotosPorInspeccion: function(inspeccionId) {
      return runIndexGetAll('fotos', 'inspeccionId', inspeccionId);
    },

    marcarFotoSubida: function(fotoId, filename) {
      return api.obtenerFoto(fotoId).then(function(photo) {
        if (!photo) return null;
        return runTx('fotos', 'readwrite', function(store) {
          return store.put(Object.assign({}, photo, {
            subida: true,
            serverFilename: filename || photo.serverFilename || null,
            actualizadoEn: new Date().toISOString()
          }));
        });
      });
    }
  };

  scope.auditDb = api;
})(typeof self !== 'undefined' ? self : window);
