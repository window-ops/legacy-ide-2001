/* ============================================================
   RUN CODE / LIVE JS EXECUTION / PREVIEW / TOOLBAR BINDINGS
   Run button pipeline (runCode), sandboxed live-JS execution
   with console forwarding (runJsLive), preview sanitization
   and rendering, output-tab switching, toolbar wiring.
   ============================================================ */
function runCode() {
    if (!STATE.activeFile) { showToast('Deschideți un fișier întâi.'); return; }
    var node = findNode(STATE.tree, STATE.activeFile);
    var lang = getLanguage(node.name);
    var text = STATE.fileContents[STATE.activeFile] || '';
    var resolved = resolveProjectReferences(text, STATE.activeFile);
    var runtimeText = resolved.text;
    var output = $('output');
    var fx = runtimeEffects();
    // Backend re-validation override (Server 2003 only): if Curriculum
    // Reporting site is up, the local bypass flags don\'t apply at run
    // time either. The flag is set from File/App Server admin and is
    // never set in the QNX session, so this stays scoped.
    if (STATE.serverBackendOnline) {
        fx = Object.assign({}, fx);
        fx.bypassCurriculum = false;
        fx.curriculumNonBlocking = false;
    }
    switchOutputTab('console');
    output.innerHTML = '';
    if (fx.programBroken) {
        output.innerHTML = '<div class="traceback"><span class="tb-title">Kernel panic satiric</span>Patch-urile au destabilizat executabilul. Unele module nu mai pornesc.</div>';
        $('outputStatus').innerHTML = '<span style="color: var(--error);">&#9679; Program broken</span>';
        showToast('Execuția a eșuat: binar instabil.');
        return;
    }
    if (lang.rules === 'md') {
        if (!STATE.appliance.services.markdown) {
            output.innerHTML = '<div class="traceback"><span class="tb-title">Markdown indisponibil</span>Backend-ul QNX nu are parser Markdown activ. Activați-l runtime din shell cu <code>mdpatch</code> (sau <code>markdown-enable</code>).</div>';
            $('outputStatus').innerHTML = '<span style="color: var(--warning);">&#9679; Parser markdown inactiv</span>';
            return;
        }
        var md = escapeHtml(runtimeText);
        md = md.replace(/^### (.*)$/gm, '<h3>$1</h3>')
               .replace(/^## (.*)$/gm, '<h2>$1</h2>')
               .replace(/^# (.*)$/gm, '<h1>$1</h1>')
               .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')
               .replace(/\*(.*?)\*/g, '<i>$1</i>')
               .replace(/`([^`]+)`/g, '<code>$1</code>')
               .replace(/\n/g, '<br>');
        renderPreview('<html><body style="font-family:Tahoma,Arial,sans-serif;padding:16px;">' + md + '</body></html>');
        output.innerHTML = '<div class="success-box"><b>&#10003; Markdown randat.</b>\nParser activ în backend-ul QNX.</div>';
        $('outputStatus').innerHTML = '<span style="color: var(--success);">&#9679; Executat</span>';
        return;
    }
    if (!lang.rules) {
        var box = document.createElement('div');
        box.className = 'success-box';
        box.innerHTML = '<b>&#10003; Fișier neverificat.</b>\nFișierele de tip <code>' + escapeHtml(node.name.split('.').pop()) + '</code> nu sunt acoperite de programa 2001 TIC.';
        output.appendChild(box);
        $('outputStatus').innerHTML = '<span style="color: var(--fg-dim);">&#9679; Neexecutat</span>';
        return;
    }
    var hits = lintCode(text);
    if (fx.forceTraceback && hits.length === 0) {
        hits = [{ line: 1, col: 1, rule: { label: 'forced_traceback', year: 2001, standard: 'Patched branch', remedy: 'Revocați patch-ul NOP pe jz .clean pentru comportament normal.' } }];
    }
    var curriculumNb = !!(fx.curriculumNonBlocking && !fx.bypassCurriculum);
    if (hits.length > 0) {
        if (fx.suppressTraceback) {
            output.innerHTML = '<div class="traceback"><span class="tb-title">Traceback incomplet</span>emit_traceback() a fost NOP-at. Diagnosticul este parțial corupt.</div>';
        }
        var ro = STATE.prefs.romanian;
        for (var i = 0; i < hits.length; i++) {
            var pre = document.createElement('div');
            pre.className = 'traceback' + (curriculumNb ? ' continue-mode' : '');
            var rowTitle = curriculumNb
                ? (ro ? 'Avertisment #' + (i + 1) : 'Warning #' + (i + 1))
                : (ro ? 'Eroare #' + (i + 1) : 'Error #' + (i + 1));
            pre.innerHTML = '<span class="tb-title">' + rowTitle + '</span>' + formatTraceback(hits[i], node.name, { continueExecution: curriculumNb });
            output.appendChild(pre);
        }
        if (curriculumNb) {
            var sumNb = document.createElement('div');
            sumNb.className = 'warn-continue-box';
            sumNb.innerHTML = '<b>&#9888; Rezultat parțial.</b> ' + (ro
                ? '<b>' + hits.length + '</b> încălcare(i) raportate; execuția continuă din cauza patch-ului pe returul din <code>check_curriculum</code>.'
                : '<b>' + hits.length + '</b> violation(s) reported; execution continues due to patched <code>check_curriculum</code> return.');
            output.appendChild(sumNb);
        } else {
            var sum = document.createElement('div');
            sum.className = 'traceback';
            sum.innerHTML = '<span class="tb-title">Rezultat final</span>Compilare eșuată. <b>' + hits.length + '</b> încălcare(i).';
            output.appendChild(sum);
            $('outputStatus').innerHTML = '<span style="color: var(--error);">&#9679; Compilare eșuată</span>';
            showToast('Compilare eșuată: ' + hits.length + ' încălcare(i).');
            return;
        }
    }
    if (hits.length === 0 || curriculumNb) {
        var box2 = document.createElement('div');
        box2.className = 'success-box';
        box2.innerHTML = curriculumNb && hits.length > 0
            ? '<b>&#10003; Previzualizare generată cu avertismente.</b>\n' + (STATE.prefs.romanian
                ? 'Programa a detectat încălcări, dar nu a oprit execuția (retur binar patch-uit).'
                : 'Curriculum violations were reported but execution was not halted (binary return patched).')
            : '<b>&#10003; Conform cu programa 2001.</b>\n0 încălcări. Rezultatul este afișat în panoul <i>Previzualizare</i>.';
        output.appendChild(box2);
        if (resolved.missing.length) {
            var warn = document.createElement('div');
            warn.className = 'traceback';
            warn.innerHTML = '<span class="tb-title">Referințe lipsă</span>Nu au putut fi rezolvate: <code>' + escapeHtml(resolved.missing.join(', ')) + '</code>.';
            output.appendChild(warn);
        }
        if (lang.rules === 'html') {
            // HTML run: keep the iframe fully locked down.
            var htmlFrame = $('preview');
            if (htmlFrame) htmlFrame.setAttribute('sandbox', '');
            renderPreview(runtimeText);
        } else {
            if (STATE.prefs.antiHang === false) {
                runJsLive(runtimeText, node.name);
            } else {
                // Anti-hang on: render the source statically instead of
                // executing it. Keeps the iframe sandbox locked down.
                var previewFrame = $('preview');
                if (previewFrame) previewFrame.setAttribute('sandbox', '');
                var wrapped = '<html><head><title>Iesire</title><style>body{font-family:Cantarell,sans-serif;padding:16px;}pre{white-space:pre-wrap;}</style></head><body>' +
                    '<h3>Execuție JavaScript dezactivată în previzualizare</h3>' +
                    '<p>Codul JS este afișat static pentru stabilitatea browserului (anti-hang).</p>' +
                    '<pre>' + escapeHtml(runtimeText) + '</pre>' +
                    '</body></html>';
                renderPreview(wrapped);
            }
        }
        if (curriculumNb && hits.length > 0) {
            $('outputStatus').innerHTML = '<span style="color: var(--warning);">&#9679; Executat cu avertismente</span>';
            showToast(STATE.prefs.romanian ? 'Executat cu avertismente curriculare.' : 'Executed with curriculum warnings.');
        } else {
            $('outputStatus').innerHTML = '<span style="color: var(--success);">&#9679; Executat</span>';
            showToast('Cod validat.');
        }
    }
}
/* ============================================================
   LIVE JS EXECUTION (anti-hang disabled)
   The iframe runs the user's source as-is. Native alert/confirm/
   prompt are kept native (allow-modals on the sandbox); a small
   shim forwards console.* output to the IDE console pane via
   postMessage.
   ============================================================ */

window._ideRunSeq = window._ideRunSeq || 0;

function ensureIdeConsoleBridge() {
    if (window._ideConsoleBridge) return;
    window._ideConsoleBridge = true;
    window.addEventListener('message', function(ev) {
        var d = ev && ev.data;
        if (!d || !d.__ideConsole) return;
        if (d.run !== window._ideRunSeq) return;
        var out = $('output');
        if (!out) return;
        if (d.action === 'clear') { out.innerHTML = ''; return; }
        var row = document.createElement('pre');
        row.className = 'console-line console-' + (d.level || 'log');
        if (d.indent) row.style.paddingLeft = (6 + d.indent * 14) + 'px';
        row.textContent = d.text;
        out.appendChild(row);
        out.scrollTop = out.scrollHeight;
    });
}

function runJsLive(source, fileName) {
    ensureIdeConsoleBridge();
    var runId = ++window._ideRunSeq;
    // Escape any </script> sequences so a string or regex in the user code
    // can't break out of the wrapping script tag.
    var safeJs = String(source).replace(/<\/(script)/gi, '<\\/$1');
    // Console-forwarding shim. Wraps every console method and posts
    // structured messages back to the parent.
    var shim =
'(function(){' +
'var RUN=' + runId + ';' +
'function fmt(a){' +
    'if(a===null)return"null";' +
    'if(a===undefined)return"undefined";' +
    'if(typeof a==="string")return a;' +
    'if(typeof a==="function")return a.toString();' +
    'try{return JSON.stringify(a);}catch(e){return String(a);}' +
'}' +
'function post(o){try{o.run=RUN;parent.postMessage(o,"*");}catch(e){}}' +
'function send(level,args,indent){post({__ideConsole:true,level:level,text:Array.prototype.map.call(args,fmt).join(" "),indent:indent||0});}' +
'var groupDepth=0;' +
'var timers={};' +
'var counters={};' +
'var orig={};' +
'var lvls=["log","info","warn","error","debug"];' +
'for(var i=0;i<lvls.length;i++){(function(m){orig[m]=(console&&console[m])||function(){};console[m]=function(){send(m,arguments,groupDepth);try{orig[m].apply(console,arguments);}catch(e){}};})(lvls[i]);}' +
'console.dir=function(obj){send("log",[obj],groupDepth);};' +
'console.table=function(data){send("log",[data],groupDepth);};' +
'console.group=function(){if(arguments.length)send("info",arguments,groupDepth);groupDepth++;};' +
'console.groupCollapsed=function(){if(arguments.length)send("info",arguments,groupDepth);groupDepth++;};' +
'console.groupEnd=function(){if(groupDepth>0)groupDepth--;};' +
'console.time=function(label){timers[label||"default"]=(performance&&performance.now?performance.now():Date.now());};' +
'console.timeEnd=function(label){var k=label||"default";if(timers[k]==null){send("warn",[k+": timer not found"],groupDepth);return;}var now=(performance&&performance.now?performance.now():Date.now());send("log",[k+": "+(now-timers[k]).toFixed(3)+"ms"],groupDepth);delete timers[k];};' +
'console.timeLog=function(label){var k=label||"default";if(timers[k]==null){send("warn",[k+": timer not found"],groupDepth);return;}var now=(performance&&performance.now?performance.now():Date.now());var rest=Array.prototype.slice.call(arguments,1);send("log",[k+": "+(now-timers[k]).toFixed(3)+"ms"].concat(rest),groupDepth);};' +
'console.count=function(label){var k=label||"default";counters[k]=(counters[k]||0)+1;send("log",[k+": "+counters[k]],groupDepth);};' +
'console.countReset=function(label){counters[label||"default"]=0;};' +
'console.trace=function(){var e=new Error();var args=Array.prototype.slice.call(arguments);args.push("\\n"+(e.stack||"(stack unavailable)"));send("log",args,groupDepth);};' +
'console.assert=function(cond){if(cond)return;var rest=Array.prototype.slice.call(arguments,1);if(rest.length===0)rest=["Assertion failed"];else rest.unshift("Assertion failed:");send("error",rest,groupDepth);};' +
'console.clear=function(){post({__ideConsole:true,action:"clear"});};' +
'window.addEventListener("error",function(e){send("error",[e.message+" ("+((e.filename||"").split("/").pop())+":"+e.lineno+")"],groupDepth);});' +
'window.addEventListener("unhandledrejection",function(e){send("error",["Unhandled promise rejection: "+((e.reason&&e.reason.message)||e.reason)],groupDepth);});' +
'})();';
    var doc = '<!DOCTYPE html><html><head><meta charset="utf-8">' +
        '<title>Iesire</title>' +
        '<style>body{font-family:Cantarell,sans-serif;padding:16px;}pre{white-space:pre-wrap;}</style>' +
        '</head><body>' +
        // Shim and user code go in separate script blocks so a syntax
        // error in user code does not prevent the error listener install.
        '<script>' + shim + '<\/script>' +
        '<script>' + safeJs + '<\/script>' +
        '</body></html>';
    var frame = $('preview');
    if (!frame) return;
    // allow-scripts to execute, allow-modals so native alert/confirm/prompt
    // can pop up and return values. Sandbox is reset to "" on the next
    // HTML render path.
    frame.setAttribute('sandbox', 'allow-scripts allow-modals');
    frame.srcdoc = doc;
    switchOutputTab('console');
}


function sanitizePreviewHtml(html) {
    var parser = new DOMParser();
    var doc = parser.parseFromString(String(html || ''), 'text/html');
    doc.querySelectorAll('script,iframe,object,embed,frame,frameset').forEach(function(el) { el.remove(); });
    doc.querySelectorAll('*').forEach(function(el) {
        Array.prototype.slice.call(el.attributes).forEach(function(attr) {
            var name = (attr.name || '').toLowerCase();
            var value = (attr.value || '').toLowerCase();
            if (name.indexOf('on') === 0) el.removeAttribute(attr.name);
            if ((name === 'href' || name === 'src' || name === 'xlink:href') && value.indexOf('javascript:') === 0) el.removeAttribute(attr.name);
        });
    });
    return '<!DOCTYPE html>\n' + doc.documentElement.outerHTML;
}
function renderPreview(html) {
    var frame = $('preview');
    frame.srcdoc = sanitizePreviewHtml(html);
    switchOutputTab('preview');
}
function switchOutputTab(tab) {
    document.querySelectorAll('.output-tab').forEach(function(el) {
        el.classList.toggle('active', el.getAttribute('data-otab') === tab);
    });
    if (tab === 'console') { $('output').style.display = 'block'; $('preview').style.display = 'none'; }
    else { $('output').style.display = 'none'; $('preview').style.display = 'block'; }
}

/* ============================================================
   TOOLBAR / OUTPUT BINDINGS (restored)
   ============================================================ */
(function bindToolbarOnce() {
    if (window._toolbarBound) return;
    window._toolbarBound = true;

    var runBtn = $('btnRun');
    var lintBtn = $('btnLint');
    var clearBtn = $('btnClearOut');

    if (runBtn) runBtn.addEventListener('click', runCode);
    if (lintBtn) lintBtn.addEventListener('click', function() {
        if (!STATE.activeFile) { showToast('Deschideți un fișier întâi.'); return; }
        var node = findNode(STATE.tree, STATE.activeFile);
        var hits = lintCode(STATE.fileContents[STATE.activeFile] || '');
        switchOutputTab('console');
        var output = $('output');
        if (hits.length === 0) {
            output.innerHTML = '<div class="success-box"><b>&#10003; Verificare completă.</b>\n0 încălcări detectate.</div>';
            showToast('Verificare reușită.');
        } else {
            output.innerHTML = '';
            var bp = STATE.binaryPatches || {};
            var lintNb = !!(bp.curriculumNonBlocking && !bp.bypassCurriculum);
            var ro = STATE.prefs.romanian;
            for (var j = 0; j < hits.length; j++) {
                var pre = document.createElement('div');
                pre.className = 'traceback' + (lintNb ? ' continue-mode' : '');
                var t = ro ? 'Avertisment #' + (j + 1) : 'Warning #' + (j + 1);
                pre.innerHTML = '<span class="tb-title">' + t + '</span>' + formatTraceback(hits[j], node.name, { continueExecution: lintNb });
                output.appendChild(pre);
            }
            showToast(hits.length + ' încălcare(i) detectată(e).');
        }
    });
    if (clearBtn) clearBtn.addEventListener('click', function() {
        $('output').innerHTML = '<span class="empty">&gt; Consola a fost curățată.</span>';
        $('outputStatus').textContent = '';
        $('preview').srcdoc = '';
        switchOutputTab('console');
    });

    document.querySelectorAll('.output-tab').forEach(function(el) {
        el.addEventListener('click', function() { switchOutputTab(this.getAttribute('data-otab')); });
    });
})();

