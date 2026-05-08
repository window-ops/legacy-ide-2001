/* ============================================================
   LINT / CURRICULUM RULES / TRACEBACK FORMATTING
   Curriculum rule set, source linting, live status-bar lint
   display, traceback formatting, and cross-file reference
   resolution.
   ============================================================ */
function getRules() {
    if (!STATE.activeFile) return [];
    var node = findNode(STATE.tree, STATE.activeFile);
    if (!node) return [];
    var lang = getLanguage(node.name);
    if (lang.rules === 'html') return HTML_RULES;
    if (lang.rules === 'js') return JS_RULES;
    return [];
}
function lintCode(text) {
    // Backend re-validation override: when on Server 2003 and the
    // Curriculum Reporting IIS site is Running, the local bypass flag
    // does NOT take effect, validation falls through. Stopping that
    // site from File/App Server admin makes the backend unreachable,
    // so the local patch wins. The flag is only ever set on Server
    // 2003, so the QNX kiosk session is unaffected.
    var bypassed = !!(STATE.binaryPatches && STATE.binaryPatches.bypassCurriculum);
    var backendOverrides = !!(STATE.serverBackendOnline);
    if (bypassed && !backendOverrides) return [];
    var rules = getRules();
    var hits = [];
    // Track positions already claimed by a specific rule, so the generic
    // allowlist pass doesn't double-flag the same region.
    var claimed = [];
    var node = STATE.activeFile ? findNode(STATE.tree, STATE.activeFile) : null;
    var lang = node ? getLanguage(node.name) : { rules: null };
    // Build a "scrubbed" copy of the source with strings, regex literals,
    // and comments replaced by spaces of equal length. Positions are
    // preserved so hit line/col calculations still use the original text.
    // This prevents rules like /\blet\b/ from matching inside a string
    // literal or a comment.
    var scrubbed = (lang.rules === 'js') ? _scrubJsNonCode(text) :
                   (lang.rules === 'html') ? _scrubHtmlComments(text) : text;
    for (var i = 0; i < rules.length; i++) {
        var r = rules[i];
        if (r.prefKey && STATE.prefs[r.prefKey]) continue;
        var m = r.test.exec(scrubbed);
        if (m) {
            var idx = m.index;
            var pre = text.substring(0, idx);
            hits.push({ rule: r, line: pre.split('\n').length, col: idx - pre.lastIndexOf('\n'), match: m[0] });
            claimed.push([idx, idx + m[0].length]);
        }
    }
    // Allowlist-based unknown-identifier pass. Only runs in strict mode
    // and when an allowlist is available for the active language.
    if (node && STATE.prefs.strict) {
        if (lang.rules === 'js') {
            collectUnknownJsIdents(text, hits, claimed);
        } else if (lang.rules === 'html') {
            collectUnknownHtmlTokens(text, hits, claimed);
        }
    }
    return hits;
}

// Replace JS strings/regex/comments with spaces of the same length so
// regex-based rules only match in actual code contexts.
function _scrubJsNonCode(src) {
    var n = src.length;
    var buf = new Array(n);
    var i = 0;
    while (i < n) buf[i] = src[i++];
    function blank(start, end) {
        for (var k = start; k < end && k < n; k++) {
            buf[k] = src[k] === '\n' ? '\n' : ' ';
        }
    }
    i = 0;
    var regexOk = true;
    while (i < n) {
        var ch = src[i], next = i + 1 < n ? src[i + 1] : '';
        if (ch === '/' && next === '/') {
            var s0 = i; while (i < n && src[i] !== '\n') i++;
            blank(s0, i); continue;
        }
        if (ch === '/' && next === '*') {
            var s1 = i; i += 2;
            while (i < n && !(src[i] === '*' && src[i + 1] === '/')) i++;
            if (i < n) i += 2;
            blank(s1, i); continue;
        }
        if (ch === '"' || ch === "'") {
            var s2 = i, q = ch; i++;
            while (i < n && src[i] !== q) { if (src[i] === '\\' && i + 1 < n) i += 2; else i++; }
            if (i < n) i++;
            blank(s2, i); regexOk = false; continue;
        }
        if (ch === '`') {
            // Template literals are left in place so the specific rule
            // for backtick strings can still match. Just skip forward
            // past the body without blanking.
            i++;
            while (i < n && src[i] !== '`') { if (src[i] === '\\' && i + 1 < n) i += 2; else i++; }
            if (i < n) i++;
            regexOk = false; continue;
        }
        if (ch === '/' && regexOk) {
            var s4 = i; i++;
            var inClass = false;
            while (i < n) {
                var c2 = src[i];
                if (c2 === '\\' && i + 1 < n) { i += 2; continue; }
                if (c2 === '[') inClass = true;
                else if (c2 === ']') inClass = false;
                else if (c2 === '/' && !inClass) { i++; break; }
                else if (c2 === '\n') break;
                i++;
            }
            while (i < n && /[gimsuyd]/.test(src[i])) i++;
            blank(s4, i); regexOk = false; continue;
        }
        if (/[a-zA-Z_$0-9]/.test(ch)) { regexOk = false; i++; continue; }
        if (!/\s/.test(ch)) {
            regexOk = '({[,;:!?=<>+-*%&|^~'.indexOf(ch) >= 0;
        }
        i++;
    }
    return buf.join('');
}

// Replace HTML comments with spaces so rules don't match inside them.
function _scrubHtmlComments(src) {
    var n = src.length;
    var buf = new Array(n);
    var i = 0;
    while (i < n) buf[i] = src[i++];
    function blank(start, end) {
        for (var k = start; k < end && k < n; k++) {
            buf[k] = src[k] === '\n' ? '\n' : ' ';
        }
    }
    i = 0;
    while (i < n - 3) {
        if (src[i] === '<' && src[i + 1] === '!' && src[i + 2] === '-' && src[i + 3] === '-') {
            var s = i; i += 4;
            while (i < n && !(src[i] === '-' && src[i + 1] === '-' && src[i + 2] === '>')) i++;
            if (i < n) i += 3;
            blank(s, i);
            continue;
        }
        i++;
    }
    return buf.join('');
}

function _posAlreadyClaimed(claimed, pos) {
    for (var i = 0; i < claimed.length; i++) {
        if (pos >= claimed[i][0] && pos < claimed[i][1]) return true;
    }
    return false;
}

function _addHit(hits, text, rule, idx, matchText) {
    var pre = text.substring(0, idx);
    hits.push({
        rule: rule,
        line: pre.split('\n').length,
        col: idx - pre.lastIndexOf('\n'),
        match: matchText
    });
}

// Flags post-2001 identifiers from POST2001_IDENT_HINTS that appear as
// free (non-member) tokens and aren't shadowed by user declarations.
// Unknown identifiers in general are not flagged because ES3 permits
// implicit globals; only the curated hint set is checked here.
function collectUnknownJsIdents(src, hits, claimed) {
    var tokens = _tokenizeJs(src);
    // Pass 1: build the user's local symbol set (var, function, params,
    // catch parameter).
    var userSyms = {};
    for (var i = 0; i < tokens.length; i++) {
        var t = tokens[i];
        if (t.kind !== 'id') continue;
        var prev = _prevCodeToken(tokens, i);
        if (!prev) continue;
        if (prev.kind === 'id' && (prev.value === 'var' || prev.value === 'function')) {
            userSyms[t.value] = 1;
            continue;
        }
        // catch (e), identifier immediately follows `catch` `(`.
        if (prev.kind === 'punct' && prev.value === '(') {
            var back = _prevCodeToken(tokens, _indexOfPrev(tokens, i));
            if (back && back.kind === 'id' && back.value === 'catch') {
                userSyms[t.value] = 1;
                continue;
            }
        }
        if (prev.kind === 'punct' && (prev.value === ',' || prev.value === '(')) {
            // Inside a parameter list of a `function ...(...)`.
            var k = i - 1, depth = 0, inParam = false;
            while (k >= 0 && i - k < 200) {
                var pt = tokens[k];
                if (pt.kind === 'punct' && pt.value === ')') depth++;
                else if (pt.kind === 'punct' && pt.value === '(') {
                    if (depth === 0) {
                        var j = k - 1;
                        while (j >= 0) {
                            var jt = tokens[j];
                            if (jt.kind === 'ws') { j--; continue; }
                            if (jt.kind === 'id') {
                                if (jt.value === 'function') inParam = true;
                                break;
                            }
                            break;
                        }
                        break;
                    }
                    depth--;
                }
                k--;
            }
            if (inParam) userSyms[t.value] = 1;
            // `var a, b, c` comma chains
            if (prev.value === ',') {
                var j2 = i - 1, depth2 = 0;
                while (j2 >= 0) {
                    var pt2 = tokens[j2];
                    if (pt2.kind === 'punct' && (pt2.value === ';' || pt2.value === '{' || pt2.value === '}')) break;
                    if (pt2.kind === 'punct' && pt2.value === ')') depth2++;
                    else if (pt2.kind === 'punct' && pt2.value === '(') { if (depth2 === 0) break; depth2--; }
                    if (pt2.kind === 'id' && pt2.value === 'var' && depth2 === 0) { userSyms[t.value] = 1; break; }
                    j2--;
                }
            }
        }
    }
    // Pass 2: flag any free token from the POST2001_IDENT_HINTS set that
    // isn't shadowed and hasn't been claimed already.
    var flaggedNames = {};
    for (var i2 = 0; i2 < tokens.length; i2++) {
        var tk = tokens[i2];
        if (tk.kind !== 'id') continue;
        var name = tk.value;
        if (!Object.prototype.hasOwnProperty.call(POST2001_IDENT_HINTS, name)) continue;
        if (userSyms[name]) continue;
        if (flaggedNames[name]) continue;
        if (_posAlreadyClaimed(claimed, tk.pos)) continue;
        var prev2 = _prevCodeToken(tokens, i2);
        if (prev2 && prev2.kind === 'punct' && prev2.value === '.') continue;
        flaggedNames[name] = 1;
        var standard = POST2001_IDENT_HINTS[name];
        _addHit(hits, src, {
            label: name + ' (identificator post-2001)',
            year: 'post-1999',
            standard: standard,
            remedy: 'Identificatorul "' + name + '" aparține ' + standard + ' și nu face parte din ES Ed. 3 (1999). ' +
                'Folosiți echivalente din programa 2001: funcții constructor cu prototype, setTimeout/setInterval, ' +
                'XMLHttpRequest (doar dacă este predat), document.cookie sau window.name pentru persistență.'
        }, tk.pos, name);
    }
}

// Helper to locate the index of the previous non-whitespace token.
function _indexOfPrev(tokens, i) {
    for (var j = i - 1; j >= 0; j--) {
        if (tokens[j].kind !== 'ws') return j;
    }
    return -1;
}

// Very small JS tokenizer: returns {kind, value, pos} records for
// identifiers and punctuation; strings/regex/comments/whitespace are
// collapsed to a single 'ws' token so position tracking still works.
function _tokenizeJs(src) {
    var out = [];
    var i = 0, n = src.length;
    var regexOk = true;
    function addWs(start) { out.push({ kind: 'ws', value: '', pos: start }); }
    while (i < n) {
        var ch = src[i];
        var next = i + 1 < n ? src[i + 1] : '';
        if (/\s/.test(ch)) { var s0 = i; while (i < n && /\s/.test(src[i])) i++; addWs(s0); continue; }
        if (ch === '/' && next === '/') { var s1 = i; while (i < n && src[i] !== '\n') i++; addWs(s1); continue; }
        if (ch === '/' && next === '*') {
            var s2 = i; i += 2;
            while (i < n && !(src[i] === '*' && src[i + 1] === '/')) i++;
            if (i < n) i += 2;
            addWs(s2); continue;
        }
        if (ch === '"' || ch === "'") {
            var s3 = i, q = ch; i++;
            while (i < n && src[i] !== q) { if (src[i] === '\\' && i + 1 < n) i += 2; else i++; }
            if (i < n) i++;
            addWs(s3); regexOk = false; continue;
        }
        if (ch === '`') {
            var s4 = i; i++;
            while (i < n && src[i] !== '`') { if (src[i] === '\\' && i + 1 < n) i += 2; else i++; }
            if (i < n) i++;
            addWs(s4); regexOk = false; continue;
        }
        if (ch === '/' && regexOk) {
            var s5 = i; i++;
            var inClass = false;
            while (i < n) {
                var c2 = src[i];
                if (c2 === '\\' && i + 1 < n) { i += 2; continue; }
                if (c2 === '[') inClass = true;
                else if (c2 === ']') inClass = false;
                else if (c2 === '/' && !inClass) { i++; break; }
                else if (c2 === '\n') break;
                i++;
            }
            while (i < n && /[gimsuyd]/.test(src[i])) i++;
            addWs(s5); regexOk = false; continue;
        }
        if (/[a-zA-Z_$]/.test(ch)) {
            var s6 = i;
            while (i < n && /[\w$]/.test(src[i])) i++;
            var val = src.substring(s6, i);
            out.push({ kind: 'id', value: val, pos: s6 });
            regexOk = false; continue;
        }
        if (/\d/.test(ch)) {
            var s7 = i;
            while (i < n && /[\d.eE+\-xXa-fA-F]/.test(src[i])) i++;
            addWs(s7); regexOk = false; continue;
        }
        // Punctuation: record single char; track regexOk state.
        out.push({ kind: 'punct', value: ch, pos: i });
        // After these punctuators, a '/' starts a regex.
        regexOk = '({[,;:!?=<>+-*%&|^~'.indexOf(ch) >= 0;
        i++;
    }
    return out;
}
function _prevCodeToken(tokens, i) {
    for (var j = i - 1; j >= 0; j--) {
        if (tokens[j].kind !== 'ws') return tokens[j];
    }
    return null;
}

// Walk an HTML source and flag any tag whose name isn't in the strict
// element allowlist, and any attribute whose name isn't in the strict
// attribute allowlist. Uses a simple state machine. Comments, CDATA,
// and DOCTYPE lines are skipped.
function collectUnknownHtmlTokens(src, hits, claimed) {
    var i = 0, n = src.length;
    var flaggedTags = {}, flaggedAttrs = {};
    while (i < n) {
        if (src[i] === '<' && src[i + 1] === '!') {
            // Skip DOCTYPE and comments.
            if (src.substring(i, i + 4) === '<!--') {
                var end = src.indexOf('-->', i + 4);
                i = end < 0 ? n : end + 3;
            } else {
                var gt = src.indexOf('>', i);
                i = gt < 0 ? n : gt + 1;
            }
            continue;
        }
        if (src[i] !== '<') { i++; continue; }
        var tagStart = i;
        i++;
        if (src[i] === '/') i++;
        if (!/[a-zA-Z]/.test(src[i] || '')) continue;
        var nameStart = i;
        while (i < n && /[a-zA-Z0-9\-]/.test(src[i])) i++;
        var tagName = src.substring(nameStart, i).toLowerCase();
        var tagAllowed = HTML401_STRICT_ELEMENTS[tagName] ||
            (STATE.prefs.allowTransitional && HTML401_TRANSITIONAL_ELEMENTS[tagName]);
        if (!tagAllowed && !flaggedTags[tagName] && !_posAlreadyClaimed(claimed, tagStart)) {
            flaggedTags[tagName] = 1;
            _addHit(hits, src, {
                label: '<' + tagName + '>',
                year: 'post-1999',
                standard: 'În afara DTD HTML 4.01 Strict',
                remedy: 'Elementul <' + tagName.toUpperCase() + '> nu este definit în HTML 4.01 Strict. ' +
                    'Dacă este un element HTML5, înlocuiți-l cu <DIV>, <TABLE>, <SPAN> sau <P> după caz.'
            }, tagStart, '<' + tagName + '>');
        }
        // Now scan attributes until the tag closes.
        while (i < n && src[i] !== '>' && src[i] !== '<') {
            while (i < n && /\s/.test(src[i])) i++;
            if (src[i] === '>' || src[i] === '/' || src[i] === '<') break;
            if (!/[a-zA-Z]/.test(src[i] || '')) { i++; continue; }
            var attrStart = i;
            while (i < n && /[a-zA-Z0-9_:-]/.test(src[i])) i++;
            var attrName = src.substring(attrStart, i).toLowerCase();
            // Skip over optional = "..." / = '...' / = value
            while (i < n && /\s/.test(src[i])) i++;
            if (src[i] === '=') {
                i++;
                while (i < n && /\s/.test(src[i])) i++;
                if (src[i] === '"' || src[i] === "'") {
                    var q = src[i]; i++;
                    while (i < n && src[i] !== q) i++;
                    if (i < n) i++;
                } else {
                    while (i < n && !/[\s>]/.test(src[i])) i++;
                }
            }
            // Skip if this specific attribute name is already covered by
            // a rule (e.g. placeholder, required, style, data-*).
            if (_posAlreadyClaimed(claimed, attrStart)) continue;
            if (HTML401_STRICT_ATTRS[attrName]) continue;
            if (STATE.prefs.allowTransitional && HTML401_TRANSITIONAL_ATTRS[attrName]) continue;
            // Allow event handlers onXxx not in the core list (the list
            // above already has the main DOM Level 0 events; unknown onX
            // attrs are rare enough to flag).
            if (flaggedAttrs[attrName]) continue;
            flaggedAttrs[attrName] = 1;
            _addHit(hits, src, {
                label: 'atribut ' + attrName,
                year: 'post-1999',
                standard: 'În afara DTD HTML 4.01 Strict',
                remedy: 'Atributul ' + attrName + ' nu este definit în HTML 4.01 Strict. ' +
                    'Dacă provine din HTML5, folosiți un atribut echivalent permis (id, class, name, title).'
            }, attrStart, attrName);
        }
        if (src[i] === '>') i++;
    }
}

function liveLintStatus() {
    if (!STATE.activeFile) { $('stLint').textContent = 'Programa: , '; $('stLint').className = ''; return; }
    var node = findNode(STATE.tree, STATE.activeFile);
    var lang = getLanguage(node.name);
    if (!lang.rules) { $('stLint').textContent = 'Programa: neverificat'; $('stLint').className = ''; return; }
    var hits = lintCode(STATE.fileContents[STATE.activeFile] || '');
    var el = $('stLint');
    if (hits.length === 0) { el.textContent = 'Programa: OK'; el.className = 'status-ok'; }
    else { el.textContent = 'Programa: ' + hits.length + ' încălcare(i)'; el.className = 'status-err'; }
}
function formatTraceback(hit, fileName, opts) {
    opts = opts || {};
    var r = hit.rule;
    var ro = STATE.prefs.romanian;
    var E = escapeHtml;
    var remedyBlock = E(r.remedy).replace(/\n/g, '\n  ');
    var out = [];
    if (ro) {
        out.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        out.push(opts.continueExecution ? '[AVERTISMENT CURRICULAR] Construcție nepermisă' : '[EROARE CURRICULARĂ] Construcție nepermisă');
        out.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        out.push('Fișier       : ' + E(fileName));
        out.push('Locație      : linia ' + hit.line + ', coloana ' + hit.col);
        out.push('Element      : <code>' + E(r.label) + '</code>');
        out.push('Introdus în  : ' + (typeof r.year === 'number' ? 'anul ' + r.year : E(String(r.year))) + (r.standard ? '  (' + E(r.standard) + ')' : ''));
        out.push('');
        out.push('<span class="tb-muted">Nu figurează în programa analitică TIC 2001, manualul oficial sau auxiliarul 2006.</span>');
        out.push('');
        out.push('<span class="tb-muted">Recomandare conform programei:</span>');
        out.push('  ' + remedyBlock);
        out.push('');
        out.push(opts.continueExecution
            ? '<b>Execuția continuă</b> &mdash; returul din <code>check_curriculum</code> este patch-uit la 0; diagnosticul este afișat, dar previzualizarea nu este blocată.'
            : '<b>EXECUȚIE OPRITĂ.</b>');
    } else {
        out.push('[CURRICULAR ' + (opts.continueExecution ? 'WARNING' : 'ERROR') + '] File: ' + E(fileName));
        out.push('Location: line ' + hit.line + ', column ' + hit.col);
        out.push('Token: <code>' + E(r.label) + '</code>');
        out.push('Introduced: ' + r.year);
        out.push('Recommended: ' + remedyBlock);
        out.push(opts.continueExecution
            ? '<b>Execution continues</b> &mdash; <code>check_curriculum</code> return is patched to 0; preview is not blocked.'
            : '<b>EXECUTION HALTED.</b>');
    }
    return out.join('\n');
}

function resolveProjectReferences(text, activeFileId) {
    var basePath = nodePathById(activeFileId);
    var idx = buildFilePathIndex(STATE.tree);
    var missing = [];
    var out = String(text || '').replace(/\[\[\s*file\s*:\s*([^\]]+)\s*\]\]|@file\(\s*([^)]+)\s*\)/gi, function(_, p1, p2) {
        var rawPath = (p1 || p2 || '').trim();
        var absPath = resolveProjectFilePath(basePath, rawPath);
        if (!absPath || !Object.prototype.hasOwnProperty.call(idx.contentByPath, absPath)) {
            missing.push(rawPath);
            return '[missing:' + rawPath + ']';
        }
        return idx.contentByPath[absPath];
    });
    return { text: out, missing: missing };
}

