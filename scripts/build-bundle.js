const fs = require('fs');
const archiver = require('archiver');
const path = require('path');

const rootDir = path.join(__dirname, '..');
const outputFile = path.join(rootDir, 'auditorlibre-production.zip');

console.log('Armando bundle de producción...');

const output = fs.createWriteStream(outputFile);
const archive = archiver('zip', { zlib: { level: 9 } });

output.on('close', function() {
  console.log('✅ Bundle creado exitosamente: auditorlibre-production.zip');
  console.log('📦 Tamaño total: ' + (archive.pointer() / 1024 / 1024).toFixed(2) + ' MB');
  console.log('\nPara desplegar en producción:');
  console.log('1. Descomprimir el ZIP en tu servidor.');
  console.log('2. Ejecutar "npm install --production".');
  console.log('3. Iniciar con "npm run start:prod" o usar PM2 (npm run pm2:start).');
});

archive.on('warning', function(err) {
  if (err.code === 'ENOENT') {
    console.warn(err);
  } else {
    throw err;
  }
});

archive.on('error', function(err) {
  throw err;
});

archive.pipe(output);

const ignorePatterns = [
  'node_modules/**',
  '.git/**',
  '.gemini/**',
  'auditorlibre-production.zip',
  'Pantalla*.png', // Archivos temporales
  'test/**',
  '.nyc_output/**',
  'coverage/**'
];

archive.glob('**/*', {
  cwd: rootDir,
  ignore: ignorePatterns,
  dot: true
});

archive.finalize();
