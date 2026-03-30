#!/usr/bin/env node

/**
 * Script to move inline event handlers to external JavaScript
 * This script addresses CSP violations by removing inline event handlers.
 */

const fs = require('fs');
const path = require('path');

const editorPath = path.join(__dirname, 'public', 'editor.html');

function fixInlineHandlers() {
  let content = fs.readFileSync(editorPath, 'utf8');

  console.log('Moving inline event handlers to external JavaScript...');

  // Remove a few known inline handlers and replace them with hook classes.
  content = content.replace(
    /<button[^>]*onclick="exportTemplate\(\)"[^>]*>/g,
    '<button class="js-export-template">'
  );
  content = content.replace(
    /<button[^>]*onclick="previewPdf\(\)"[^>]*>/g,
    '<button class="js-preview-pdf">'
  );
  content = content.replace(
    /<button[^>]*onclick="showQR\(\)"[^>]*>/g,
    '<button class="js-show-qr">'
  );

  fs.writeFileSync(editorPath, content, 'utf8');
}

fixInlineHandlers();
