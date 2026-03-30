'use strict';

// Ejemplo mínimo de receptor HTTP para guardar imports de OPENAUDITOR en PocketBase.
// Usalo como referencia para una API propia, middleware o worker delante de PocketBase.

const PocketBase = require('pocketbase/cjs');
const express = require('express');

const app = express();
app.use(express.json({ limit: '30mb' }));

const pb = new PocketBase(process.env.POCKETBASE_URL || 'http://127.0.0.1:8090');

async function authAsAdmin() {
  await pb.admins.authWithPassword(
    process.env.POCKETBASE_ADMIN_EMAIL,
    process.env.POCKETBASE_ADMIN_PASSWORD
  );
}

app.post('/api/openauditor/import', async function(req, res) {
  try {
    const payload = req.body || {};
    await authAsAdmin();

    const record = await pb.collection('inspections_imports').create({
      templateId: payload.templateId || '',
      templateName: payload.templateName || '',
      completedAt: payload.completedAt || new Date().toISOString(),
      exportedFrom: payload.exportedFrom || 'standalone-html',
      inspectorFileId: payload.inspectorFileId || '',
      payload: JSON.stringify(payload)
    });

    res.status(201).json({ ok: true, recordId: record.id });
  } catch (error) {
    res.status(500).json({ ok: false, error: String(error.message || error) });
  }
});

app.listen(process.env.PORT || 8787, function() {
  console.log('OPENAUDITOR PocketBase receiver listening on port ' + (process.env.PORT || 8787));
});
