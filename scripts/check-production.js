'use strict';

const http = require('http');

const BASE_URL = process.env.OPENAUDITOR_BASE_URL || 'http://127.0.0.1:3001';
const ENDPOINTS = [
  { path: '/readyz', expected: [200], critical: true },
  { path: '/health', expected: [200, 503], critical: true },
  { path: '/', expected: [200], critical: true },
  { path: '/settings', expected: [200], critical: true },
  { path: '/catalog', expected: [200], critical: false }
];

function request(pathname) {
  return new Promise((resolve, reject) => {
    const req = http.get(BASE_URL + pathname, (res) => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => resolve({ statusCode: res.statusCode, body }));
    });
    req.on('error', reject);
    req.setTimeout(8000, () => req.destroy(new Error('timeout')));
  });
}

async function main() {
  let failed = false;
  console.log('OPENAUDITOR production check');
  console.log('Base URL:', BASE_URL);

  for (const endpoint of ENDPOINTS) {
    try {
      const result = await request(endpoint.path);
      const ok = endpoint.expected.includes(result.statusCode);
      if (!ok) failed = failed || endpoint.critical;
      console.log(
        (ok ? 'OK   ' : 'FAIL ') +
        endpoint.path +
        ' -> ' +
        result.statusCode
      );

      if (endpoint.path === '/health') {
        try {
          const health = JSON.parse(result.body || '{}');
          if (health.status) {
            console.log('     health.status =', health.status);
          }
          if (health.diskSpace) {
            console.log('     health.diskSpace =', health.diskSpace);
          }
        } catch (e) {
          console.log('     health body is not valid JSON');
        }
      }
    } catch (error) {
      failed = failed || endpoint.critical;
      console.log('FAIL ' + endpoint.path + ' -> ' + error.message);
    }
  }

  if (failed) {
    process.exitCode = 1;
    console.log('Production check finished with blocking failures.');
    return;
  }

  console.log('Production check finished successfully.');
}

main().catch((error) => {
  console.error('Unexpected production check error:', error.message);
  process.exit(1);
});
