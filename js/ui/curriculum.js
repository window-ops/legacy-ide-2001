
/* ============================================================
   CURRICULUM DIALOG RENDERER
   Rebuilds the #curriculumBackdrop body from the live rule
   tables and allowlists in js/core/state.js. Called just
   before the dialog opens so the content always reflects the
   rules the linter is actually using.
   ============================================================ */
function renderCurriculumDialog() {
    var body = document.getElementById('curriculumDialogBody');
    if (!body) return;

    function esc(s) {
        return String(s)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function groupOpen(title, subtitle) {
        var sub = subtitle ? '<div class="curriculum-group-sub">' + esc(subtitle) + '</div>' : '';
        return '<div class="pref-group"><div class="pref-group-title">' + esc(title) + '</div>' +
               sub +
               '<div class="pref-list curriculum-list">';
    }
    function groupClose() { return '</div></div>'; }

    function tokenRow(label, year, banned) {
        var cls = 'curriculum-row' + (banned ? ' banned' : '');
        var yearStr = year == null ? '' : (typeof year === 'number' ? String(year) : String(year));
        var yearSpan = yearStr ? '<span class="year">' + esc(yearStr) + '</span>' : '';
        return '<div class="' + cls + '"><code>' + esc(label) + '</code>' + yearSpan + '</div>';
    }

    function sortedKeys(obj) {
        var k = [];
        for (var key in obj) if (Object.prototype.hasOwnProperty.call(obj, key)) k.push(key);
        k.sort();
        return k;
    }

    var html = '';

    // HTML ALLOWED: Strict elements
    var strictEls = sortedKeys(HTML401_STRICT_ELEMENTS);
    html += groupOpen('HTML · elemente permise (Strict)',
        strictEls.length + ' etichete din DTD-ul HTML 4.01 Strict');
    strictEls.forEach(function(tag) {
        html += tokenRow('<' + tag.toUpperCase() + '>', 1999, false);
    });
    html += groupClose();

    // HTML ALLOWED: Transitional additions
    if (STATE.prefs.allowTransitional) {
        var transEls = sortedKeys(HTML401_TRANSITIONAL_ELEMENTS);
        html += groupOpen('HTML · elemente suplimentare (Transitional)',
            transEls.length + ' etichete, active doar cu "Acceptă HTML 4.01 Transitional"');
        transEls.forEach(function(tag) {
            html += tokenRow('<' + tag.toUpperCase() + '>', 1999, false);
        });
        html += groupClose();
    }

    // HTML ALLOWED: attributes
    var strictAttrs = sortedKeys(HTML401_STRICT_ATTRS);
    html += groupOpen('HTML · atribute permise',
        strictAttrs.length + ' atribute, inclusiv prezentaționale recomandate de programă');
    strictAttrs.forEach(function(a) { html += tokenRow(a, null, false); });
    html += groupClose();

    if (STATE.prefs.allowTransitional) {
        var transAttrs = sortedKeys(HTML401_TRANSITIONAL_ATTRS);
        html += groupOpen('HTML · atribute suplimentare (Transitional)',
            transAttrs.length + ' atribute, active doar cu "Acceptă HTML 4.01 Transitional"');
        transAttrs.forEach(function(a) { html += tokenRow(a, null, false); });
        html += groupClose();
    }

    // HTML BANNED: from the rule list
    html += groupOpen('HTML · interzis',
        HTML_RULES.length + ' reguli din lista de construcții post-2001');
    HTML_RULES.forEach(function(r) {
        html += tokenRow(r.label, r.year, true);
    });
    html += groupClose();

    // JS ALLOWED: reserved words
    var reserved = sortedKeys(ES3_RESERVED);
    html += groupOpen('JavaScript · cuvinte rezervate ES Ed. 3',
        reserved.length + ' cuvinte rezervate (unele doar ca rezervare pentru viitor)');
    reserved.forEach(function(n) { html += tokenRow(n, 1999, false); });
    html += groupClose();

    // JS ALLOWED: globals
    var globals = sortedKeys(ES3_GLOBALS);
    html += groupOpen('JavaScript · obiecte globale permise',
        globals.length + ' identificatori din ES Ed. 3 și DOM Level 0 al epocii');
    globals.forEach(function(n) { html += tokenRow(n, 1999, false); });
    html += groupClose();

    // JS ALLOWED: prototype methods
    var protoMethods = sortedKeys(ES3_PROTOTYPE_METHODS);
    html += groupOpen('JavaScript · metode și proprietăți permise',
        protoMethods.length + ' membri disponibili pe obiecte, inclusiv DOM Level 0');
    protoMethods.forEach(function(n) { html += tokenRow('.' + n, 1999, false); });
    html += groupClose();

    // JS BANNED: rules
    html += groupOpen('JavaScript · construcții interzise',
        JS_RULES.length + ' reguli din lista de construcții post-2001');
    JS_RULES.forEach(function(r) {
        html += tokenRow(r.label, r.year, true);
    });
    html += groupClose();

    // JS BANNED: hint set
    var hintKeys = sortedKeys(POST2001_IDENT_HINTS);
    html += groupOpen('JavaScript · identificatori post-2001',
        hintKeys.length + ' API-uri și obiecte introduse ulterior ES Ed. 3');
    hintKeys.forEach(function(n) {
        html += tokenRow(n + '  (' + POST2001_IDENT_HINTS[n] + ')', null, true);
    });
    html += groupClose();

    body.innerHTML = html;
}
