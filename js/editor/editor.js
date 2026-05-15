/* ============================================================
   EDITOR CORE: TABS, MOUNT, INPUT, CURSOR, BREADCRUMB
   Open-tab bar, editor textarea mounting, keyboard/input
   handling, line numbers, cursor position display, breadcrumb.
   ============================================================ */
function renderTabs() {
    var bar = $('tabBar');
    bar.innerHTML = '';
    if (STATE.openTabs.length === 0) {
        bar.innerHTML = '<span class="tab-empty">Niciun fișier deschis</span>';
        return;
    }
    STATE.openTabs.forEach(function(id) {
        var node = findNode(STATE.tree, id);
        if (!node) return;
        var tab = document.createElement('button');
        tab.className = 'tab' + (id === STATE.activeFile ? ' active' : '');
        tab.innerHTML = fileIconFor(node.name) + '<span>' + escapeHtml(node.name) + '</span>';
        tab.onclick = function() {
            STATE.activeFile = id;
            renderTabs(); renderTree(); mountEditor(); updateBreadcrumb();
        };
        var close = document.createElement('span');
        close.className = 'tab-close';
        close.setAttribute('role', 'button');
        close.setAttribute('aria-label', 'Închide ' + node.name);
        close.innerHTML = '<svg viewBox="0 0 16 16" fill="currentColor"><path d="M4 4l8 8m0-8l-8 8" stroke="currentColor" stroke-width="1.5" fill="none"/></svg>';
        close.onclick = function(e) { e.stopPropagation(); closeTab(id); };
        tab.appendChild(close);
        bar.appendChild(tab);
    });
}

function mountEditor() {
    var area = $('editorArea');
    area.innerHTML = '';
    if (!STATE.activeFile) {
        area.innerHTML = '<div class="editor-empty"><div>' +
            '<div class="ee-title">Niciun fișier deschis</div>' +
            '<div class="ee-desc">Creați un fișier cu butonul <b>+</b> din panoul lateral sau deschideți unul existent.</div>' +
            '</div></div>';
        $('stLine').textContent = '';
        $('langTag').textContent = '';
        $('stLint').textContent = 'Programa: , ';
        $('stLint').className = '';
        return;
    }
    var wrap = document.createElement('div');
    wrap.className = 'editor-wrap';
    var lineNums = document.createElement('div');
    lineNums.className = 'line-numbers'; lineNums.id = 'lineNumbers'; lineNums.textContent = '1';
    wrap.appendChild(lineNums);
    var inner = document.createElement('div');
    inner.className = 'editor-inner' + (STATE.prefs.highlight ? ' highlighted' : '');
    inner.id = 'editorInner';
    var overlay = document.createElement('pre');
    overlay.className = 'highlight-overlay'; overlay.id = 'highlight';
    var ta = document.createElement('textarea');
    ta.className = 'code-editor'; ta.id = 'editor';
    ta.spellcheck = false;
    ta.setAttribute('wrap', 'off');
    ta.setAttribute('autocapitalize', 'off');
    ta.setAttribute('autocorrect', 'off');
    ta.value = STATE.fileContents[STATE.activeFile] || '';
    inner.appendChild(overlay); inner.appendChild(ta);
    wrap.appendChild(inner); area.appendChild(wrap);
    var node = findNode(STATE.tree, STATE.activeFile);
    var lang = getLanguage(node.name);
    $('langTag').textContent = computeLangTag(lang);
    ta.addEventListener('input', onEditorInput);
    ta.addEventListener('click', updateCursor);
    ta.addEventListener('keyup', updateCursor);
    ta.addEventListener('scroll', function() {
        lineNums.scrollTop = ta.scrollTop;
        overlay.scrollTop = ta.scrollTop;
        overlay.scrollLeft = ta.scrollLeft;
    });
    ta.addEventListener('keydown', onEditorKey);
    updateLineNumbers(); updateCursor(); updateHighlight(); liveLintStatus();
}

function onEditorInput() {
    if (!STATE.activeFile) return;
    var ta = $('editor');
    STATE.fileContents[STATE.activeFile] = ta.value;
    updateLineNumbers(); updateCursor(); updateHighlight(); liveLintStatus();
}
function downloadActiveFile() {
    // Ctrl+S used to show a "autosave active" toast, which was
    // confusing because users expected a file save. Now it
    // triggers a browser download of the current tab's content.
    // We commit the textarea value first so any unflushed
    // edits land in STATE.fileContents before we read it.
    if (!STATE.activeFile) { showToast('Nu există fișier activ.'); return; }
    var ta = $('editor');
    if (ta) STATE.fileContents[STATE.activeFile] = ta.value;
    var content = STATE.fileContents[STATE.activeFile] || '';
    var name = STATE.activeFile;
    // Best-effort MIME: pick from extension so editors on the
    // user's machine open the saved file with the right tool.
    var lower = name.toLowerCase();
    var mime = 'text/plain';
    if (lower.endsWith('.html') || lower.endsWith('.htm')) mime = 'text/html';
    else if (lower.endsWith('.css')) mime = 'text/css';
    else if (lower.endsWith('.js'))  mime = 'application/javascript';
    else if (lower.endsWith('.json')) mime = 'application/json';
    else if (lower.endsWith('.xml')) mime = 'application/xml';
    else if (lower.endsWith('.svg')) mime = 'image/svg+xml';
    try {
        var blob = new Blob([content], { type: mime + ';charset=utf-8' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = name;
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        // Free the object URL on next tick so the click has
        // committed before revoke.
        setTimeout(function () { URL.revokeObjectURL(url); }, 0);
        showToast('Descărcat: ' + name);
    } catch (err) {
        showToast('Descărcare eșuată.');
    }
}
function onEditorKey(e) {
    var ta = $('editor');
    if (e.key === 'Tab') {
        e.preventDefault();
        var s = ta.selectionStart, en = ta.selectionEnd;
        ta.value = ta.value.substring(0, s) + '    ' + ta.value.substring(en);
        ta.selectionStart = ta.selectionEnd = s + 4;
        onEditorInput();
        return;
    }
    if (e.ctrlKey && (e.key === 'r' || e.key === 'R')) { e.preventDefault(); runCode(); return; }
    if (e.ctrlKey && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        downloadActiveFile();
        return;
    }
    if (e.key === 'F2' && STATE.activeFile) { e.preventDefault(); startRename(STATE.activeFile); return; }
    if (STATE.prefs.autoClose && e.key === '>' && STATE.activeFile) {
        var node = findNode(STATE.tree, STATE.activeFile);
        if (node && /\.html?$/i.test(node.name)) {
            var pos = ta.selectionStart;
            var before = ta.value.substring(0, pos);
            var m = /<([a-zA-Z][\w]*)(\s[^<>]*?)?$/.exec(before);
            if (m) {
                var tag = m[1].toLowerCase();
                var voidEls = ['br','hr','img','input','meta','link','area','base','col','embed','param','source','track','wbr','!doctype'];
                var isSelfClose = /\/\s*$/.test(before.replace(/\s*$/, ''));
                if (voidEls.indexOf(tag) === -1 && !isSelfClose) {
                    e.preventDefault();
                    var after = ta.value.substring(pos);
                    ta.value = before + '></' + m[1] + '>' + after;
                    ta.selectionStart = ta.selectionEnd = pos + 1;
                    onEditorInput();
                    return;
                }
            }
        }
    }
    if (STATE.prefs.autoIndent && e.key === 'Enter' && STATE.activeFile) {
        // Preserve leading whitespace of the current line on Enter,
        // plus one extra level (4 spaces) when the line opens a
        // block: trailing { ( [ for JS/CSS, or a non-void opening
        // HTML tag for .html files. If the cursor sits between an
        // open/close pair on the same line (e.g. {| } ), additionally
        // push the closing pair onto its own line, indented one
        // level less than the inner block.
        var aiPos = ta.selectionStart;
        var aiBefore = ta.value.substring(0, aiPos);
        var aiAfter = ta.value.substring(ta.selectionEnd);
        var aiLineStart = aiBefore.lastIndexOf('\n') + 1;
        var aiCurrentLine = aiBefore.substring(aiLineStart);
        var aiIndentMatch = /^([ \t]*)/.exec(aiCurrentLine);
        var aiIndent = aiIndentMatch ? aiIndentMatch[1] : '';
        var aiTrimmedRight = aiCurrentLine.replace(/\s+$/, '');
        var aiNode = findNode(STATE.tree, STATE.activeFile);
        var aiIsHTML = aiNode && /\.html?$/i.test(aiNode.name);
        var aiExtra = '';
        var aiOpensPair = false;
        var aiPairClose = '';
        if (/[\{\(\[]$/.test(aiTrimmedRight)) {
            aiExtra = '    ';
            var aiOpenChar = aiTrimmedRight.charAt(aiTrimmedRight.length - 1);
            aiPairClose = aiOpenChar === '{' ? '}' :
                          aiOpenChar === '(' ? ')' : ']';
            aiOpensPair = (aiAfter.charAt(0) === aiPairClose);
        } else if (aiIsHTML) {
            var aiTagMatch = /<([a-zA-Z][\w]*)([^<>]*)?>$/.exec(aiTrimmedRight);
            if (aiTagMatch) {
                var aiTag = aiTagMatch[1].toLowerCase();
                var aiAttrs = aiTagMatch[2] || '';
                var aiVoidEls = ['br','hr','img','input','meta','link','area','base','col','embed','param','source','track','wbr'];
                var aiSelfClose = /\/\s*$/.test(aiAttrs);
                if (aiVoidEls.indexOf(aiTag) === -1 && !aiSelfClose) {
                    aiExtra = '    ';
                    aiOpensPair = new RegExp('^</' + aiTag + '>', 'i').test(aiAfter);
                }
            }
        }
        e.preventDefault();
        var aiInsert, aiCaret;
        if (aiOpensPair) {
            aiInsert = '\n' + aiIndent + aiExtra + '\n' + aiIndent;
            aiCaret = aiPos + 1 + aiIndent.length + aiExtra.length;
        } else {
            aiInsert = '\n' + aiIndent + aiExtra;
            aiCaret = aiPos + aiInsert.length;
        }
        ta.value = aiBefore + aiInsert + aiAfter;
        ta.selectionStart = ta.selectionEnd = aiCaret;
        onEditorInput();
        return;
    }
}
function updateLineNumbers() {
    var ta = $('editor'); if (!ta) return;
    var lines = ta.value.split('\n').length;
    var str = '';
    for (var i = 1; i <= lines; i++) str += i + '\n';
    $('lineNumbers').textContent = str;
}
function updateCursor() {
    var ta = $('editor'); if (!ta) return;
    var pos = ta.selectionStart;
    var text = ta.value.substring(0, pos);
    var line = text.split('\n').length;
    var col = pos - text.lastIndexOf('\n');
    $('stLine').textContent = 'Lin ' + line + ', Col ' + col;
}
function updateBreadcrumb() {
    var b = $('breadcrumb');
    if (!STATE.activeFile) { b.innerHTML = '&mdash;'; return; }
    var path = pathTo(STATE.tree, STATE.activeFile) || [];
    var parts = [];
    for (var i = 0; i < path.length; i++) {
        var isFile = (i === path.length - 1);
        parts.push('<span class="' + (isFile ? 'crumb-file' : '') + '">' + escapeHtml(path[i]) + '</span>');
    }
    b.innerHTML = parts.join('<span class="crumb-sep">/</span>');
}

// Produce the status-bar language/mode tag for a file. Reflects the
// effective DTD or language profile plus any preference toggles that
// change what's accepted (strict mode, transitional HTML, anti-hang).
function computeLangTag(lang) {
    if (!lang || !lang.name) return '';
    var p = STATE.prefs || {};
    if (lang.rules === 'html') {
        var base = p.allowTransitional ? 'HTML 4.01 Transitional' : 'HTML 4.01 Strict';
        if (!p.strict) return base + ' · strict oprit';
        return base;
    }
    if (lang.rules === 'js') {
        var label = 'ECMAScript Ed. 3';
        var flags = [];
        if (!p.strict) flags.push('strict oprit');
        if (p.antiHang === false) flags.push('anti-hang oprit');
        return flags.length ? label + ' · ' + flags.join(' · ') : label;
    }
    return lang.name;
}

// Re-renders the #langTag status based on current prefs. Called from
// preference change handlers so the tag reacts to toggles live.
function refreshLangTag() {
    var tagEl = $('langTag');
    if (!tagEl) return;
    if (!STATE.activeFile) { tagEl.textContent = ''; return; }
    var node = findNode(STATE.tree, STATE.activeFile);
    if (!node) { tagEl.textContent = ''; return; }
    tagEl.textContent = computeLangTag(getLanguage(node.name));
}
