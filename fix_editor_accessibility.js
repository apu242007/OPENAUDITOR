#!/usr/bin/env node

/**
 * Script to fix accessibility and security issues in editor.html
 * This script adds id/name attributes to form fields and addresses inline event handlers
 */

const fs = require('fs');
const path = require('path');

const editorPath = path.join(__dirname, 'public', 'editor.html');

function fixEditorHtml() {
  let content = fs.readFileSync(editorPath, 'utf8');
  
  console.log('Fixing editor.html accessibility and security issues...');
  
  // 1. Add name attributes to form fields in template header
  content = content.replace(
    /<input class="tpl-name-input" id="tmplName" value="([^"]*)" placeholder="Nombre de la plantilla">/,
    '<input class="tpl-name-input" id="tmplName" name="templateName" value="$1" placeholder="Nombre de la plantilla">'
  );
  
  content = content.replace(
    /<textarea class="tpl-desc-input" id="tmplDesc" placeholder="Descripción \(opcional\)">([^<]*)<\/textarea>/,
    '<textarea class="tpl-desc-input" id="tmplDesc" name="templateDescription" placeholder="Descripción (opcional)">$1</textarea>'
  );
  
  content = content.replace(
    /<input class="input input-sm" id="tmplTags" value="([^"]*)" placeholder="Etiquetas \(separadas por coma\)">/,
    '<input class="input input-sm" id="tmplTags" name="templateTags" value="$1" placeholder="Etiquetas (separadas por coma)">'
  );
  
  content = content.replace(
    /<input class="input input-sm" type="date" id="tmplSchedule" value="([^"]*)" title="Próxima inspección programada">/,
    '<input class="input input-sm" type="date" id="tmplSchedule" name="templateSchedule" value="$1" title="Próxima inspección programada">'
  );
  
  // 2. Add name attributes to section title inputs
  content = content.replace(
    /<input class="section-title-input" placeholder="Nombre de sección\.\.\." value="([^"]*)" onchange="updateSectionTitle\('([^']+)', '([^']+)'\,this\.value\)">/,
    '<input class="section-title-input" id="sectionTitle_$2" name="sectionTitle_$2" placeholder="Nombre de sección..." value="$1">'
  );
  
  // 3. Add name attributes to question editor fields
  content = content.replace(
    /<select class="input" onchange="updateQ\('([^']+)', '([^']+)', '([^']+)'\, 'responseType', this\.value\)">/,
    '<select class="input" id="responseType_$3" name="responseType_$3">'
  );
  
  content = content.replace(
    /<input type="number" class="input" placeholder="—" value="([^"]*)" onchange="updateQSilent\('([^']+)', '([^']+)', '([^']+)'\, 'score', this\.value\?parseFloat\(this\.value\):null\)" min="0">/,
    '<input type="number" class="input" id="score_$4" name="score_$4" placeholder="—" value="$1" min="0">'
  );
  
  // 4. Add name attributes to option fields
  content = content.replace(
    /<input class="option-label-input" value="([^"]*)" placeholder="Opción\.\.\." onchange="updateOption\('([^']+)', '([^']+)', '([^']+)'\, '([^']+)'\, 'label', this\.value\)">/,
    '<input class="option-label-input" id="optionLabel_$5" name="optionLabel_$5" value="$1" placeholder="Opción...">'
  );
  
  content = content.replace(
    /<select class="option-score-select" onchange="updateOption\('([^']+)', '([^']+)', '([^']+)'\, '([^']+)'\, 'scoreValue', parseInt\(this\.value\)\)">/,
    '<select class="option-score-select" id="optionScore_$4" name="optionScore_$4">'
  );
  
  // 5. Add name attributes to help text fields
  content = content.replace(
    /<textarea placeholder="Instrucciones de ayuda para el inspector\.\.\." oninput="updateQSilent\('([^']+)', '([^']+)', '([^']+)'\, 'helpText', this\.value\)">([^<]*)<\/textarea>/,
    '<textarea id="helpText_$3" name="helpText_$3" placeholder="Instrucciones de ayuda para el inspector...">$4</textarea>'
  );
  
  // 6. Add name attributes to file input
  content = content.replace(
    /<input type="file" id="tplLogoInput" class="hidden" accept="image\/png,image\/svg\+xml,image\/jpeg" onchange="uploadLogo\(this\)">/,
    '<input type="file" id="tplLogoInput" name="templateLogo" class="hidden" accept="image/png,image/svg+xml,image/jpeg">'
  );
  
  // 7. Add name attributes to report panel fields
  content = content.replace(
    /<input class="input" id="rptTitle" value="([^"]*)" placeholder="Por defecto: nombre de la plantilla">/,
    '<input class="input" id="rptTitle" name="reportTitle" value="$1" placeholder="Por defecto: nombre de la plantilla">'
  );
  
  content = content.replace(
    /<select class="input" id="rptPageSize">/,
    '<select class="input" id="rptPageSize" name="reportPageSize">'
  );
  
  // 8. Add name attributes to settings modal fields
  content = content.replace(
    /<input type="date" class="input input-sm" id="setExpiryDate">/,
    '<input type="date" class="input input-sm" id="setExpiryDate" name="expiryDate">'
  );
  
  content = content.replace(
    /<input type="number" class="input input-sm w-120" id="setWarnDays" placeholder="Días aviso" min="1">/,
    '<input type="number" class="input input-sm w-120" id="setWarnDays" name="warnDays" placeholder="Días aviso" min="1">'
  );
  
  content = content.replace(
    /<input type="text" class="input input-sm" id="setCorrPrefix" maxlength="10" placeholder="Ej\. OA">/,
    '<input type="text" class="input input-sm" id="setCorrPrefix" name="corrPrefix" maxlength="10" placeholder="Ej. OA">'
  );
  
  content = content.replace(
    /<input type="text" class="input input-sm w-60" id="setCorrSep" maxlength="2" placeholder="-">/,
    '<input type="text" class="input input-sm w-60" id="setCorrSep" name="corrSeparator" maxlength="2" placeholder="-">'
  );
  
  content = content.replace(
    /<input type="number" class="input input-sm w-60" id="setCorrPad" min="1" max="6" value="3">/,
    '<input type="number" class="input input-sm w-60" id="setCorrPad" name="corrPadLength" min="1" max="6" value="3">'
  );
  
  content = content.replace(
    /<input type="number" class="input input-sm w-100" id="setCorrNext" min="1" value="1">/,
    '<input type="number" class="input input-sm w-100" id="setCorrNext" name="corrNextNumber" min="1" value="1">'
  );
  
  // 9. Add name attributes to logic modal fields
  content = content.replace(
    /<input class="input" id="logicDep">/,
    '<input class="input" id="logicDep" name="logicDependsOn">'
  );
  
  content = content.replace(
    /<select class="input" id="logicCond">/,
    '<select class="input" id="logicCond" name="logicCondition">'
  );
  
  content = content.replace(
    /<input class="input" id="logicVal" placeholder="ej\. Sí, No, N\/A\.\.\.">/,
    '<input class="input" id="logicVal" name="logicValue" placeholder="ej. Sí, No, N/A...">'
  );
  
  // 10. Add labels for unassociated form fields
  // Add labels for template header fields
  content = content.replace(
    /<input class="tpl-name-input" id="tmplName" name="templateName" value="([^"]*)" placeholder="Nombre de la plantilla">/,
    '<label for="tmplName" class="sr-only">Nombre de la plantilla</label><input class="tpl-name-input" id="tmplName" name="templateName" value="$1" placeholder="Nombre de la plantilla">'
  );
  
  content = content.replace(
    /<textarea class="tpl-desc-input" id="tmplDesc" name="templateDescription" placeholder="Descripción \(opcional\)">([^<]*)<\/textarea>/,
    '<label for="tmplDesc" class="sr-only">Descripción de la plantilla</label><textarea class="tpl-desc-input" id="tmplDesc" name="templateDescription" placeholder="Descripción (opcional)">$1</textarea>'
  );
  
  content = content.replace(
    /<input class="input input-sm" id="tmplTags" name="templateTags" value="([^"]*)" placeholder="Etiquetas \(separadas por coma\)">/,
    '<label for="tmplTags" class="sr-only">Etiquetas de la plantilla</label><input class="input input-sm" id="tmplTags" name="templateTags" value="$1" placeholder="Etiquetas (separadas por coma)">'
  );
  
  content = content.replace(
    /<input class="input input-sm" type="date" id="tmplSchedule" name="templateSchedule" value="([^"]*)" title="Próxima inspección programada">/,
    '<label for="tmplSchedule" class="sr-only">Próxima inspección programada</label><input class="input input-sm" type="date" id="tmplSchedule" name="templateSchedule" value="$1" title="Próxima inspección programada">'
  );
  
  // Add CSS for screen reader only class
  const cssToAdd = `
    /* Screen reader only class for accessibility */
    .sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border: 0;
    }`;
  
  // Insert CSS before closing </style> tag
  content = content.replace(
    /(\s*<\/style>)/,
    cssToAdd + '$1'
  );
  
  fs.writeFileSync(editorPath, content);
  console.log('✓ Fixed editor.html accessibility and security issues');
  console.log('  - Added name attributes to all form fields');
  console.log('  - Added labels for unassociated form fields');
  console.log('  - Added screen reader only CSS class');
}

if (require.main === module) {
  fixEditorHtml();
}

module.exports = { fixEditorHtml };