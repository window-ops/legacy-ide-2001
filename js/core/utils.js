/* ============================================================
   HELPERS
   ============================================================ */
function $(id) { return document.getElementById(id); }
function escapeHtml(s) {
    if (s === null || s === undefined) return '';
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
function runtimeEffects() {
    return (STATE.binaryPatches && STATE.binaryPatches.effects) || {};
}
function isMobileViewport() { return window.innerWidth <= 720; }
var _toastTimer = null;
function showToast(msg) {
    var t = $('toast');
    if (!t) return;
    t.textContent = msg;
    t.classList.add('show');
    if (_toastTimer) clearTimeout(_toastTimer);
    _toastTimer = setTimeout(function() { t.classList.remove('show'); }, 3200);
}
function hasPatch(fn, hookId) {
    var key = findKeyByHook(fn, hookId);
    return !!(key && STATE.patches[key]);
}
function setShellPrompt() {
    $('shellPrompt').textContent = STATE.appliance.user + '@' + STATE.appliance.env.HOSTNAME + ':' + STATE.appliance.cwd + '$';
}
function shellLine(text, cls) {
    var out = $('shellOutput');
    var div = document.createElement('div');
    div.className = 'shell-line' + (cls ? ' ' + cls : '');
    div.innerHTML = text;
    out.appendChild(div);
    out.scrollTop = out.scrollHeight;
}
function pathJoin(base, token) {
    if (!token || token === '.') return base;
    var full = token.charAt(0) === '/' ? token : (base.replace(/\/+$/, '') + '/' + token);
    var parts = full.split('/').filter(function(x){ return x !== ''; });
    var out = [];
    for (var i = 0; i < parts.length; i++) {
        if (parts[i] === '..') out.pop();
        else if (parts[i] !== '.') out.push(parts[i]);
    }
    return '/' + out.join('/');
}
function getLanguage(filename) {
    if (/\.html?$/i.test(filename)) return { name: 'HTML 4.01 Strict', rules: 'html' };
    if (/\.js$/i.test(filename))    return { name: 'ECMAScript Ed. 3 (1999)', rules: 'js' };
    if (/\.md$/i.test(filename))    return { name: 'Markdown (experimental)', rules: 'md' };
    if (/\.css$/i.test(filename))   return { name: 'CSS 2 (1998)', rules: null };
    if (/\.txt$/i.test(filename))   return { name: 'Text brut', rules: null };
    return { name: 'Fără sintaxă recunoscută', rules: null };
}
function findNode(root, id) {
    if (root.id === id) return root;
    if (root.children) for (var i = 0; i < root.children.length; i++) {
        var n = findNode(root.children[i], id); if (n) return n;
    }
    return null;
}
function findParent(root, id, parent) {
    parent = parent || null;
    if (root.id === id) return parent;
    if (root.children) for (var i = 0; i < root.children.length; i++) {
        var p = findParent(root.children[i], id, root); if (p) return p;
    }
    return null;
}
function pathTo(root, id, path) {
    path = path || [];
    if (root.id === id) return path.concat([root.name]);
    if (root.children) for (var i = 0; i < root.children.length; i++) {
        var p = pathTo(root.children[i], id, path.concat([root.name])); if (p) return p;
    }
    return null;
}
function isDescendant(root, ancestorId, descendantId) {
    var anc = findNode(root, ancestorId);
    if (!anc || anc.type !== 'folder') return false;
    return !!findNode(anc, descendantId);
}
function fileIconFor(name) {
    var ext = /\.(html?|js|css|txt)$/i.exec(name);
    var tag = ext ? ext[1].toUpperCase() : '?';
    var color = 'currentColor';
    if (/html?/i.test(tag)) color = '#e5a50a';
    else if (/js/i.test(tag)) color = '#c64600';
    else if (/css/i.test(tag)) color = '#1c71d8';
    return '<svg viewBox="0 0 16 16" fill="' + color + '" opacity="0.85">' +
        '<path d="M3 1h7l3 3v11H3z" opacity="0.25"/>' +
        '<path d="M3 1h7l3 3v11H3zm7 0v3h3" fill="none" stroke="' + color + '"/>' +
        '<text x="5" y="13" font-size="4.5" font-weight="700" font-family="IBM Plex Mono,monospace" fill="' + color + '">' + tag.substring(0, 3) + '</text></svg>';
}
function validateName(n) { return /^[A-Za-z0-9._\- ]{1,48}$/.test(n); }

function nodePathById(id) {
    var parts = pathTo(STATE.tree, id) || [];
    if (!parts.length) return null;
    return '/' + parts.slice(1).join('/');
}

function buildFilePathIndex(root, index, idByPath) {
    index = index || {};
    idByPath = idByPath || {};
    function walk(node, prefix) {
        var path = prefix ? (prefix + '/' + node.name) : ('/' + node.name);
        if (node.type === 'file') {
            index[path] = STATE.fileContents[node.id] || '';
            idByPath[path] = node.id;
        } else if (node.children) {
            for (var i = 0; i < node.children.length; i++) walk(node.children[i], path);
        }
    }
    walk(root, '');
    return { contentByPath: index, idByPath: idByPath };
}

function resolveProjectFilePath(basePath, token) {
    if (!token) return null;
    var norm = token.trim();
    if (!norm) return null;
    if (norm.charAt(0) === '/') return norm;
    var baseDir = '/';
    if (basePath) {
        var parts = basePath.split('/');
        parts.pop();
        baseDir = parts.join('/') || '/';
    }
    return pathJoin(baseDir, norm);
}
