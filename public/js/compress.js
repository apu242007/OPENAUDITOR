(function(scope) {
  function comprimirImagen(file, maxMB) {
    var maxBytes = (maxMB || 0.5) * 1024 * 1024;
    if (!file || file.size <= maxBytes) return Promise.resolve(file);

    return new Promise(function(resolve, reject) {
      var img = new Image();
      var url = URL.createObjectURL(file);

      img.onload = function() {
        URL.revokeObjectURL(url);
        var scale = Math.min(1, Math.sqrt(maxBytes / file.size));
        var width = Math.max(1, Math.round(img.naturalWidth * scale));
        var height = Math.max(1, Math.round(img.naturalHeight * scale));
        var canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        var ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('Canvas no disponible'));
        ctx.drawImage(img, 0, 0, width, height);
        var type = file.type === 'image/png' ? 'image/png' : 'image/webp';
        canvas.toBlob(function(blob) {
          if (!blob) return reject(new Error('toBlob falló'));
          resolve(blob);
        }, type, 0.82);
      };

      img.onerror = function() {
        URL.revokeObjectURL(url);
        reject(new Error('imagen invalida'));
      };

      img.src = url;
    });
  }

  scope.auditCompress = {
    comprimirImagen: comprimirImagen
  };
})(typeof self !== 'undefined' ? self : window);
