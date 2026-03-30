function ensureHeaders(sheet, orderedLabels) {
  if (!orderedLabels || !orderedLabels.length) return [];
  var current = [];
  if (sheet.getLastRow() > 0) {
    current = sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), 1)).getValues()[0]
      .map(function(value) { return String(value || '').trim(); })
      .filter(Boolean);
  }

  orderedLabels.forEach(function(label) {
    if (current.indexOf(label) === -1) current.push(label);
  });

  sheet.getRange(1, 1, 1, current.length).setValues([current]);
  return current;
}

function sanitizeSheetName(name) {
  var raw = String(name || 'Plantilla sin nombre').trim();
  var clean = raw
    .replace(/[\\\/\?\*\[\]:]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!clean) clean = 'Plantilla sin nombre';
  return clean.slice(0, 95);
}

function getTemplateSheet(ss, payload) {
  var baseName = sanitizeSheetName(payload.templateName || payload.templateId || 'Plantilla');
  var sheetName = 'TPL - ' + baseName;
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) sheet = ss.insertSheet(sheetName);
  return sheet;
}

function buildSheetColumns(payload) {
  var fixed = [
    { key: 'receivedAt', label: 'Received At' },
    { key: 'templateId', label: 'Template Id' },
    { key: 'templateName', label: 'Template Name' },
    { key: 'completedAt', label: 'Completed At' },
    { key: 'exportedFrom', label: 'Exported From' },
    { key: 'inspectorFileId', label: 'Inspector File Id' }
  ];

  var dynamic = Array.isArray(payload.sheetSchema) ? payload.sheetSchema : [];
  var merged = [];
  var seen = {};

  fixed.concat(dynamic).forEach(function(item) {
    if (!item || !item.label || seen[item.label]) return;
    seen[item.label] = true;
    merged.push(item);
  });

  return merged;
}

function buildRowValues(headers, payload, columns) {
  var labelToKey = {};
  columns.forEach(function(item) {
    labelToKey[item.label] = item.key;
  });

  var row = payload.flatRow || {};
  return headers.map(function(header) {
    var key = labelToKey[header];
    if (!key) return '';
    return row[key] !== undefined && row[key] !== null ? row[key] : '';
  });
}

function ensureRawHeaders(rawSheet) {
  if (rawSheet.getLastRow() === 0) {
    rawSheet.appendRow(['receivedAt', 'templateId', 'templateName', 'sheetName', 'payload']);
  }
}

function doPost(e) {
  try {
    var payload = JSON.parse((e.postData && e.postData.contents) || '{}');
    var spreadsheetId = 'REEMPLAZAR_SPREADSHEET_ID';
    var ss = SpreadsheetApp.openById(spreadsheetId);
    var sheet = getTemplateSheet(ss, payload);
    var rawSheet = ss.getSheetByName('raw_payloads') || ss.insertSheet('raw_payloads');

    var mediaCount = Array.isArray(payload.media) ? payload.media.length : 0;
    if (!payload.flatRow) payload.flatRow = {};
    payload.flatRow.receivedAt = payload.flatRow.receivedAt || new Date().toISOString();
    payload.flatRow.templateId = payload.flatRow.templateId || payload.templateId || '';
    payload.flatRow.templateName = payload.flatRow.templateName || payload.templateName || '';
    payload.flatRow.completedAt = payload.flatRow.completedAt || payload.completedAt || '';
    payload.flatRow.exportedFrom = payload.flatRow.exportedFrom || payload.exportedFrom || '';
    payload.flatRow.inspectorFileId = payload.flatRow.inspectorFileId || payload.inspectorFileId || '';
    payload.flatRow.mediaCount = mediaCount;

    var columns = buildSheetColumns(payload);
    if (!columns.some(function(item) { return item.label === 'Media Count'; })) {
      columns.push({ key: 'mediaCount', label: 'Media Count' });
    }

    var headers = ensureHeaders(sheet, columns.map(function(item) { return item.label; }));
    var values = buildRowValues(headers, payload, columns);
    sheet.appendRow(values);

    ensureRawHeaders(rawSheet);
    rawSheet.appendRow([
      new Date(),
      payload.templateId || '',
      payload.templateName || '',
      sheet.getName(),
      JSON.stringify(payload)
    ]);

    return ContentService
      .createTextOutput(JSON.stringify({
        ok: true,
        columns: headers.length,
        templateName: payload.templateName || '',
        sheetName: sheet.getName()
      }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: String(error.message || error) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
