'use strict';

function normalizeText(str) {
  return (str || '').toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function registerSearchRoutes(deps) {
  const { app, readJson, TEMPLATES_FILE, INSPECTIONS_FILE } = deps;

  app.get('/api/search', (req, res) => {
    const q = normalizeText(req.query.q || '');
    const type = req.query.type || 'all';
    if (q.length < 2) return res.json({ results: [] });

    const results = [];

    if (type === 'all' || type === 'templates') {
      const templates = readJson(TEMPLATES_FILE);
      for (const t of templates) {
        if (normalizeText(t.name).includes(q)) {
          results.push({
            type: 'template',
            id: t.id,
            title: t.name,
            subtitle: `Plantilla · ${t.status}`,
            url: `/editor/${t.id}`
          });
        }
        for (const page of t.pages || []) {
          for (const section of page.sections || []) {
            for (const question of section.questions || []) {
              if (normalizeText(question.text).includes(q) || normalizeText(question.helpText).includes(q)) {
                results.push({
                  type: 'question',
                  id: t.id,
                  title: question.text,
                  subtitle: `En plantilla: ${t.name} › ${page.name} › ${section.title}`,
                  url: `/editor/${t.id}`
                });
              }
            }
          }
        }
      }
    }

    if (type === 'all' || type === 'inspections') {
      const inspections = readJson(INSPECTIONS_FILE);
      for (const insp of inspections) {
        if (normalizeText(insp.code).includes(q) || normalizeText(insp.templateName).includes(q)) {
          results.push({
            type: 'inspection',
            id: insp.id,
            title: insp.code || insp.templateName,
            subtitle: `Inspección · ${insp.status} · ${insp.startedAt?.split('T')[0]}`,
            url: `/inspector/${insp.id}`
          });
        }
        for (const ans of Object.values(insp.answers || {})) {
          if (typeof ans.value === 'string' && normalizeText(ans.value).includes(q)) {
            results.push({
              type: 'answer',
              id: insp.id,
              title: ans.value,
              subtitle: `En inspección: ${insp.code || insp.templateName}`,
              url: `/inspector/${insp.id}`
            });
          }
          if (normalizeText(ans.note).includes(q)) {
            results.push({
              type: 'note',
              id: insp.id,
              title: ans.note,
              subtitle: `Nota en: ${insp.code || insp.templateName}`,
              url: `/inspector/${insp.id}`
            });
          }
          const actionDesc = ans.action?.description || (typeof ans.action === 'string' ? ans.action : '');
          if (normalizeText(actionDesc).includes(q)) {
            results.push({
              type: 'action',
              id: insp.id,
              title: actionDesc,
              subtitle: `Acción en: ${insp.code || insp.templateName}`,
              url: `/actions`
            });
          }
        }
      }
    }

    const seen = new Set();
    const deduped = results.filter((result) => {
      const key = `${result.type}-${result.id}-${result.title}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).slice(0, 50);

    res.json({ results: deduped, total: deduped.length, query: q });
  });
}

module.exports = {
  registerSearchRoutes
};
