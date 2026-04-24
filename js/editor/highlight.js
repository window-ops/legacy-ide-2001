/* ============================================================
   SYNTAX HIGHLIGHT (HTML / JS)
   updateHighlight selects a language-specific highlighter and
   writes the result into the overlay element aligned with the
   editor textarea.
   ============================================================ */
function updateHighlight() {
    var inner = $('editorInner');
    if (!inner) return;
    inner.classList.toggle('highlighted', STATE.prefs.highlight);
    if (!STATE.prefs.highlight) return;
    var ta = $('editor');
    var overlay = $('highlight');
    var node = findNode(STATE.tree, STATE.activeFile);
    var lang = node ? getLanguage(node.name) : { rules: null };
    var text = ta.value;
    if (!text.endsWith('\n')) text += '\n';
    var html;
    if (lang.rules === 'html') html = highlightHTML(text);
    else if (lang.rules === 'js') html = highlightJS(text);
    else html = escapeHtml(text);
    overlay.innerHTML = html;
}
function highlightHTML(text) {
    var t = escapeHtml(text);
    t = t.replace(/(&lt;!--[\s\S]*?--&gt;)/g, '<span class="h-comment">$1</span>');
    t = t.replace(/(&lt;!DOCTYPE[\s\S]*?&gt;)/gi, '<span class="h-doctype">$1</span>');
    // After escapeHtml, attribute values contain HTML entities (&quot;, &#39;)
    // so the attribute group allows '&' but stops at the next '&' that begins
    // '&gt;' (the tag close).
    t = t.replace(/(&lt;\/?)([a-zA-Z][\w-]*)((?:\s+(?:[^&]|&(?!gt;))*?)?)(\s*\/?&gt;)/g,
        function(m, op, tag, attrs, cl) {
            var a = attrs.replace(/([a-zA-Z][\w:-]*)(=)(&quot;(?:[^&]|&(?!quot;))*?&quot;|&#39;(?:[^&]|&(?!#39;))*?&#39;)?/g,
                function(mm, an, eq, av) {
                    return '<span class="h-attr">' + an + '</span>' +
                        (eq ? eq + (av ? '<span class="h-string">' + av + '</span>' : '') : '');
                });
            return '<span class="h-tag-punct">' + op + '</span>' +
                   '<span class="h-tag">' + tag + '</span>' + a +
                   '<span class="h-tag-punct">' + cl + '</span>';
        });
    return t;
}
function highlightJS(text) {
    var t = escapeHtml(text);
    var tokens = [];
    // Placeholders use a letter prefix ('p') so word-boundary regexes
    // applied later cannot treat the numeric index as a standalone token.
    function place(content, cls) {
        tokens.push('<span class="' + cls + '">' + content + '</span>');
        return '\x00p' + (tokens.length - 1) + '\x01';
    }
    t = t.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, function(m) { return place(m, 'h-comment'); });
    t = t.replace(/&quot;(?:[^&\\]|\\.|&(?!quot;))*?&quot;/g, function(m) { return place(m, 'h-string'); });
    t = t.replace(/&#39;(?:[^&\\]|\\.|&(?!#39;))*?&#39;/g, function(m) { return place(m, 'h-string'); });
    t = t.replace(/\b\d+(\.\d+)?\b/g, function(m) { return place(m, 'h-number'); });
    // Function declarations are matched before the generic keyword pass so
    // the function name can be placed with the h-func class in one go.
    t = t.replace(/\bfunction\s+([a-zA-Z_$][\w$]*)/g, function(m, name) {
        return place('function', 'h-keyword') + ' ' + place(name, 'h-func');
    });
    var kw = /\b(var|function|return|if|else|for|while|do|break|continue|switch|case|default|true|false|null|undefined|this|new|typeof|instanceof|in|delete|void|try|catch|finally|throw|with)\b/g;
    t = t.replace(kw, function(m) { return place(m, 'h-keyword'); });
    t = t.replace(/\x00p(\d+)\x01/g, function(m, idx) { return tokens[parseInt(idx, 10)]; });
    return t;
}

