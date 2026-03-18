'use strict';
var path = require('path');
var fse = require('fs');

module.exports = function buildPdfHtml(ins, uploadsDir) {
  var r = ins.snapshot.report || {};
  var E = function(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); };
  var fmtD = function(iso) {
    if (!iso) return ''; var d = new Date(iso);
    var dd=String(d.getDate()).padStart(2,'0');
    var mm=String(d.getMonth()+1).padStart(2,'0');
    var hh=String(d.getHours()).padStart(2,'0');
    var mn=String(d.getMinutes()).padStart(2,'0');
    return dd+'.'+mm+'.'+d.getFullYear()+' '+hh+':'+mn+' -03';
  };
  var fmtShort = function(iso) {
    if (!iso) return '-'; var d = new Date(iso);
    var months = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
    return String(d.getDate()).padStart(2,'0')+' '+months[d.getMonth()]+' '+d.getFullYear();
  };
  var optFor = function(q,val) {
    if (!q.options) return null;
    return q.options.find(function(o){ return String(o.id)===String(val)||o.label===val; })||null;
  };
  var pill = function(label,color) {
    var bg = color||'#4f46e5';
    return '<span style="background:'+bg+';color:#fff;padding:2px 10px;border-radius:3px;font-size:9pt;font-weight:600">'+E(label)+'</span>';
  };
  var imgSrc = function(mf) {
    var p = uploadsDir ? path.join(uploadsDir,mf) : '';
    return p && fse.existsSync(p) ? 'file:///'+p.split('\\').join('/') : '/uploads/'+mf;
  };

  var css = "* { margin:0; padding:0; box-sizing:border-box; } body { font-family: \"Helvetica Neue\",Helvetica,Arial,sans-serif; font-size:10pt; line-height:1.5; color:#1a1a18; } @page { margin:20mm 20mm 28mm 20mm; } .pdf-hdr { position:fixed; top:-15mm; left:0; right:0; height:12mm; border-bottom:1px solid #e9e8e6; padding:0 4mm; display:flex; justify-content:space-between; align-items:center; font-size:8pt; color:#9b9b97; } .pdf-hdr .tn { font-weight:600; color:#6b6b68; } .pdf-ftr { position:fixed; bottom:-20mm; left:0; right:0; height:10mm; border-top:1px solid #e9e8e6; padding:0 4mm; display:flex; justify-content:space-between; align-items:center; font-size:8pt; color:#9b9b97; } .pdf-ftr .br { color:#d8d6d2; } .pb { page-break-after:always; } .cover-title { font-size:18pt; font-weight:700; color:#1a1a18; text-transform:uppercase; margin-top:24px; line-height:1.3; } .cover-sub { font-size:10pt; color:#6b6b68; display:flex; justify-content:space-between; align-items:center; margin-top:6px; } .app-name { font-size:18pt; font-weight:700; color:#1a1a2e; margin-bottom:24px; } .s-ok { color:#16a34a; font-weight:600; font-size:9pt; } .s-ip { color:#2563eb; font-weight:600; font-size:9pt; } .s-no { color:#dc2626; font-weight:600; font-size:9pt; } hr.div { border:none; border-top:1px solid #e9e8e6; margin:12px 0; } .stats { width:100%; border-collapse:collapse; border:1px solid #e9e8e6; margin:12px 0 16px; } .stats td { padding:8px 12px; background:#f8f8f7; border-right:1px solid #e9e8e6; width:33.33%; vertical-align:top; } .stats td:last-child { border-right:none; } .sl { font-size:9pt; font-weight:700; color:#1a1a18; display:block; margin-bottom:2px; } .sv { font-size:10pt; color:#6b6b68; display:block; } .mt { width:100%; border-collapse:collapse; margin-bottom:16px; } .mt tr { border-bottom:1px solid #e9e8e6; } .mt tr:last-child { border-bottom:none; } .mt td { padding:8px 4px; font-size:10pt; vertical-align:middle; } .ml { font-weight:700; color:#1a1a18; width:55%; } .mv { color:#1a1a18; text-align:right; width:45%; } .sh { background:#e8e7e5; padding:6px 12px; font-size:9pt; color:#6b6b68; text-transform:uppercase; letter-spacing:0.05em; display:block; margin-bottom:0; } .qt { width:100%; border-collapse:collapse; } .qt tr { border-bottom:1px solid #e9e8e6; min-height:32px; } .qt td { padding:8px 12px; vertical-align:middle; } .ql { font-size:10pt; font-weight:700; color:#1a1a18; width:55%; } .av { font-size:10pt; color:#1a1a18; text-align:right; width:45%; } .al { font-size:9pt; color:#6b6b68; line-height:1.6; } .fl { border-left:3px solid #d97706 !important; background:#fffbeb; } .fi { color:#d97706; } .mb { padding:10px 12px; border-bottom:1px solid #e9e8e6; display:flex; flex-wrap:wrap; gap:12px; } .mi { max-width:160px; max-height:120px; object-fit:cover; border-radius:3px; border:1px solid #e9e8e6; display:block; } .mc { font-size:8pt; color:#9b9b97; margin-top:3px; } .pt { font-size:13pt; font-weight:700; color:#1a1a18; margin:16px 0 8px; } .sb-bg { width:100%; height:8px; background:#e9e8e6; border-radius:4px; overflow:hidden; margin-top:8px; } .sb-fi { height:8px; background:#4f46e5; border-radius:4px; } .sp { font-size:18pt; font-weight:700; color:#1a1a18; } .ss { font-size:10pt; color:#6b6b68; } .sig { margin-top:24px; padding-top:16px; border-top:1px solid #e9e8e6; } .sig-l { font-size:10pt; font-weight:700; margin-bottom:10px; display:block; } .sig-i { max-width:200px; max-height:80px; object-fit:contain; border-bottom:1px solid #1a1a18; display:block; margin-bottom:4px; } .sig-n { font-size:10pt; font-weight:700; color:#1a1a18; } .sig-t { font-size:9pt; color:#6b6b68; display:block; } .mg { display:flex; flex-wrap:wrap; gap:16px; padding:12px; } .mgi { width:calc(50% - 8px); } .mgg { width:100%; max-height:220px; object-fit:cover; border:1px solid #e9e8e6; border-radius:4px; display:block; } .cw { padding-bottom:15mm; }";

  var coverPage = ins.snapshot.pages.find(function(p){ return p.type==='cover'; });
  var inspector = '';
  if (coverPage) coverPage.sections.forEach(function(s){ s.questions.forEach(function(q){
    if (q.responseType==='person'||(q.text&&q.text.toLowerCase().includes('inspector'))){
      var a=ins.answers&&ins.answers[q.id]; if(a&&a.value) inspector=a.value;
    }
  }); });
  var flagCount=0, actionCount=0;
  ins.snapshot.pages.forEach(function(p){ p.sections.forEach(function(s){ 
    if (s.repeatable) {
      var instances = ins.repeatableAnswers[s.id] || [];
      instances.forEach(function(inst) {
        s.questions.forEach(function(q){
          var a=inst[q.id];
          if(a&&a.flagged) flagCount++;
          if(a&&a.action) actionCount++;
        });
      });
    } else {
      s.questions.forEach(function(q){
        var a=ins.answers&&ins.answers[q.id];
        if(a&&a.flagged) flagCount++;
        if(a&&a.action) actionCount++;
      }); 
    }
  }); });
  var pct = ins.maxScore>0 ? Math.round(ins.score/ins.maxScore*100) : 0;
  var scoreStr = ins.maxScore>0 ? ins.score+'/'+ins.maxScore+' ('+pct+'%)' : 'N/A';
  var statusCls = ins.status==='completed'?'s-ok':(ins.status==='in_progress'?'s-ip':'s-no');
  var statusLbl = ins.status==='completed'?'Completada':(ins.status==='in_progress'?'En curso':'Incompleta');
  var codeText = ins.code ? '<div style="font-family:monospace; font-size:12pt; font-weight:bold; color:#4f46e5; margin-bottom:8px;">'+E(ins.code)+'</div>' : '';
  var cover = '<div class="app-name">OPEN AUDITOR</div>';
  cover += codeText;
  cover += '<div class="cover-title">'+E(r.title||ins.templateName)+'</div>';
  cover += '<div class="cover-sub"><span>'+fmtShort(ins.completedAt||ins.startedAt)+(inspector?' / '+E(inspector):'')+'</span>';
  cover += '<span class="'+statusCls+'">'+statusLbl+'</span></div>';
  cover += '<hr class="div">';
  cover += '<table class="stats"><tr>';
  cover += '<td><span class="sl">Puntuacion</span><span class="sv">'+scoreStr+'</span></td>';
  cover += '<td><span class="sl">Elementos senalados</span><span class="sv">'+flagCount+'</span></td>';
  cover += '<td><span class="sl">Acciones</span><span class="sv">'+actionCount+'</span></td>';
  cover += '</tr></table>';
  if (coverPage) {
    cover += '<table class="mt">';
    coverPage.sections.forEach(function(s){ s.questions.forEach(function(q){
      var a = ins.answers&&ins.answers[q.id]; var val=a?a.value:'';
      var opt = (q.responseType==='multiple_choice'||q.responseType==='yesno')&&val ? optFor(q,val) : null;
      var valHtml = opt ? pill(opt.label||val,opt.color) : (q.responseType==='date'&&val?E(fmtD(val)):E(val||'-'));
      cover += '<tr><td class="ml">'+E(q.text)+'</td><td class="mv">'+valHtml+'</td></tr>';
    }); });
    cover += '</table>';
  }

  var buildQuestionContent = function(q, a) {
    var a = a||{};
    var val = a.value||'';
    if (!val && !a.note && !a.action && (!a.mediaFiles || !a.mediaFiles.length)) return ''; // Skip empty
    var isFl = a.flagged;
    var rowCls = isFl?' class="fl"':'';
    var isOpt = q.responseType==='multiple_choice'||q.responseType==='yesno';
    var opt = isOpt&&val ? optFor(q,val) : null;
    var isLong = !opt && String(val).length > 80;
    var lbl = (isFl?'<span class="fi">&#9873; </span>':'')+E(q.text)+(q.required?'<span style="color:#dc2626"> *</span>':'');
    if (q.helpText && q.helpTextVisible === 'always') {
      lbl += '<div style="font-size:8.5pt; font-style:italic; color:#6b6b68; margin-top:2px;">'+E(q.helpText)+'</div>';
    }
    var valHtml;
    if (opt) { valHtml = pill(opt.label||val, opt.color); }
    else if (q.responseType==='checkbox') { valHtml = val==='true'?'<span style="color:#16a34a;font-size:12pt">&#9745;</span>':'<span style="color:#9b9b97;font-size:12pt">&#9744;</span>'; }
    else if (q.responseType==='date'&&val) { valHtml = E(fmtD(val)); }
    else { valHtml = E(val||'-'); }
    
    var h = '';
    if (isLong) {
      h += '<tr'+rowCls+'><td colspan="2" class="ql">'+lbl+'</td></tr>';
      h += '<tr'+rowCls+'><td colspan="2" class="al">'+E(val)+'</td></tr>';
    } else {
      h += '<tr'+rowCls+'><td class="ql">'+lbl+'</td><td class="av">'+valHtml+'</td></tr>';
    }
    if (a.note) h += '<tr'+rowCls+'><td class="ql" style="font-weight:400;font-style:italic;color:#6b6b68;font-size:9pt">Nota:</td><td class="al">'+E(a.note)+'</td></tr>';
    if (a.action) h += '<tr'+rowCls+'><td class="ql">&#8594; Accion:</td><td class="al">'+E(a.action)+'</td></tr>';
    return h;
  };

  var buildMediaContent = function(q, a) {
    var a = a||{};
    var h = '';
    if (a.mediaFiles&&a.mediaFiles.length) {
      h += '<div class="mb">';
      a.mediaFiles.forEach(function(mf,mi){
        h += '<div><img class="mi" src="'+imgSrc(mf)+'"><div class="mc">Foto '+(mi+1)+'</div></div>';
      });
      h += '</div>';
    }
    return h;
  };

  var buildPageContent = function(p) {
    var h = '';
    p.sections.forEach(function(s) {
      if (s.repeatable) {
        var instances = ins.repeatableAnswers[s.id] || [];
        instances.forEach(function(inst, idx) {
          h += '<div class="sh">'+E(s.title||'Seccion')+' '+(idx+1)+'</div>';
          h += '<table class="qt">';
          s.questions.forEach(function(q) { h += buildQuestionContent(q, inst[q.id]); });
          h += '</table>';
          s.questions.forEach(function(q) { h += buildMediaContent(q, inst[q.id]); });
        });
      } else {
        if (s.title) h += '<div class="sh">'+E(s.title)+'</div>';
        h += '<table class="qt">';
        s.questions.forEach(function(q) { h += buildQuestionContent(q, ins.answers[q.id]); });
        h += '</table>';
        s.questions.forEach(function(q) { h += buildMediaContent(q, ins.answers[q.id]); });
      }
    });
    return h;
  };

  var buildFlagged = function() {
    var items = [];
    ins.snapshot.pages.forEach(function(p){ p.sections.forEach(function(s){ 
      if (s.repeatable) {
        var instances = ins.repeatableAnswers[s.id] || [];
        instances.forEach(function(inst) {
          s.questions.forEach(function(q){
            var a=inst[q.id];
            if(a&&a.flagged) items.push({q:q,a:a});
          });
        });
      } else {
        s.questions.forEach(function(q){
          var a=ins.answers&&ins.answers[q.id];
          if(a&&a.flagged) items.push({q:q,a:a});
        }); 
      }
    }); });
    if(!items.length) return '';
    var h = '<div class="pb"></div><div class="sh">ELEMENTOS SENALADOS Y ACCIONES</div><table class="qt">';
    items.forEach(function(it){
      var opt=(it.q.responseType==='multiple_choice'||it.q.responseType==='yesno')&&it.a.value?optFor(it.q,it.a.value):null;
      var vH=opt?pill(opt.label||it.a.value,opt.color):E(it.a.value||'-');
      h += '<tr class="fl"><td class="ql"><span class="fi">&#9873; </span>'+E(it.q.text)+'</td><td class="av">'+vH+'</td></tr>';
      if(it.a.note) h += '<tr class="fl"><td class="ql" style="font-weight:400;font-style:italic;font-size:9pt;color:#6b6b68">Nota:</td><td class="al">'+E(it.a.note)+'</td></tr>';
      if(it.a.action) h += '<tr class="fl"><td class="ql">&#8594; Accion:</td><td class="al">'+E(it.a.action)+'</td></tr>';
    });
    return h + '</table>';
  };
  var buildScore = function() {
    if(!ins.maxScore||ins.maxScore===0) return '';
    var pct2 = Math.round(ins.score/ins.maxScore*100);
    return '<div class="pb"></div><div class="sh">PUNTUACION</div><div style="padding:16px 12px"><div class="sp">'+pct2+'%</div><div class="ss">'+ins.score+' de '+ins.maxScore+' puntos</div><div class="sb-bg"><div class="sb-fi" style="width:'+pct2+'%"></div></div></div>';
  };
  var buildSig = function() {
    if(!ins.signature) return '';
    return '<div class="sig"><span class="sig-l">Firma responsable</span><img class="sig-i" src="'+ins.signature+'"><div class="sig-n">'+(ins.signerName||'Inspector')+'</div><span class="sig-t">'+fmtD(ins.completedAt)+'</span></div>';
  };
  var buildMedia = function() {
    var all = [];
    ins.snapshot.pages.forEach(function(p){ p.sections.forEach(function(s){ 
      if (s.repeatable) {
        var instances = ins.repeatableAnswers[s.id] || [];
        instances.forEach(function(inst) {
          s.questions.forEach(function(q){
            var a=inst[q.id];
            if(a&&a.mediaFiles&&a.mediaFiles.length) a.mediaFiles.forEach(function(mf){ all.push({file:mf,qt:q.text}); });
          });
        });
      } else {
        s.questions.forEach(function(q){
          var a=ins.answers&&ins.answers[q.id];
          if(a&&a.mediaFiles&&a.mediaFiles.length) a.mediaFiles.forEach(function(mf){ all.push({file:mf,qt:q.text}); });
        });
      }
    }); });
    if(!all.length) return '';
    var h = '<div class="pb"></div><div class="sh">RESUMEN DE ARCHIVOS MULTIMEDIA</div><div class="mg">';
    all.forEach(function(m,i){ h += '<div class="mgi"><img class="mgg" src="'+imgSrc(m.file)+'"><div class="mc">Foto '+(i+1)+' — '+E(m.qt)+'</div></div>'; });
    return h + '</div>';
  };
  var body = cover;
  body += '<div class="pb"></div>';
  if (r.showTOC) {
    body += '<div class="sh">INDICE DE CONTENIDOS</div><div style="padding:12px">';
    ins.snapshot.pages.forEach(function(p,i){ if(p.type==='cover') return;
      body += '<div style="display:flex;align-items:baseline;padding:4px 0;font-size:10pt"><span>'+E(p.name)+'</span><span style="flex:1;border-bottom:1px dotted #9b9b97;margin:0 6px;height:1em"></span><span style="font-size:9pt;color:#6b6b68">'+(i+1)+'</span></div>';
    });
    body += '</div><div class="pb"></div>';
  }
  var contentPages = ins.snapshot.pages.filter(function(p){ return p.type!=='cover'; });
  contentPages.forEach(function(p,i) {
    if(i>0) body += '<div class="pb"></div>';
    body += '<div class="pt">'+E(p.name)+'</div>';
    body += buildPageContent(p);
  });
  if(r.showFlaggedItems) body += buildFlagged();
  if(r.showScore) body += buildScore();
  body += buildSig();
  body += buildMedia();
  var html = '<!DOCTYPE html><html><head><meta charset="UTF-8"><style>'+css+'</style></head><body>';
  html += '<div class="pdf-hdr"><span class="tn">'+E(ins.templateName)+'</span><span>'+fmtShort(ins.completedAt||ins.startedAt)+(inspector?' / '+E(inspector):'')+'</span></div>';
  html += '<div class="pdf-ftr"><span>'+E(ins.templateName.slice(0,45))+'</span><span class="br">OPEN AUDITOR</span><span>Pagina <span class="pageNumber"></span></span></div>';
  html += '<div class="cw">'+body+'</div>';
  html += '</body></html>';
  return html;
};
