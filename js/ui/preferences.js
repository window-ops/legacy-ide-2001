/* ============================================================
   PREFERENCES DIALOG WIRING
   Generic pref checkbox binder (bindPref), the locked "strict"
   preference with its unlock dialog, and the single place that
   wires every checkbox in the #prefsBackdrop dialog.
   Depends on js/ui/theme.js (applyTheme), js/editor/lint.js
   (liveLintStatus), js/editor/highlight.js (updateHighlight),
   and js/ui/osbanner.js (renderBanner).
   ============================================================ */
function bindPref(id, key, onChange) {
    var el = $(id);
    if (!el) return;
    el.checked = !!STATE.prefs[key];
    el.addEventListener('change', function() {
        STATE.prefs[key] = !!el.checked;
        if (onChange) onChange();
    });
}

function openLockDialog(which) {
    var body;
    if (which === 'strict') {
        body = 'Setarea <code>Mod 2001 strict</code> nu poate fi dezactivată prin interfață. ' +
            'Verificarea curriculară este implementată în binar și poate fi ocolită doar prin patching ASM ' +
            'în funcția <code>check_curriculum</code>.<br><br>' +
            'Deschideți debuggerul și modificați ramura <code>jz .clean</code> pentru a schimba comportamentul verificării.';
    } else {
        body = 'Această setare este protejată și necesită editarea directă a codului binar.';
    }
    $('lockBody').innerHTML = body;
    openDialog('lockBackdrop');
}

function bindStrictPref() {
    var strictEl = $('prefStrict');
    if (!strictEl) return;
    strictEl.checked = true;
    STATE.prefs.strict = true;
    strictEl.addEventListener('change', function() {
        if (!strictEl.checked && !(STATE.binaryPatches && (STATE.binaryPatches.bypassCurriculum || STATE.binaryPatches.curriculumNonBlocking))) {
            strictEl.checked = true;
            openLockDialog('strict');
            return;
        }
        STATE.prefs.strict = !!strictEl.checked;
        liveLintStatus();
        refreshLangTag();
    });
}

function bindPreferenceControls() {
    bindStrictPref();
    bindPref('prefRO', 'romanian');
    bindPref('prefAllowTransitional', 'allowTransitional', function() {
        liveLintStatus();
        refreshLangTag();
    });
    bindPref('prefInlineStyle', 'inlineStyle', liveLintStatus);
    bindPref('prefHighlight', 'highlight', function() {
        updateHighlight();
        var inner = $('editorInner');
        if (inner) inner.classList.toggle('highlighted', !!STATE.prefs.highlight);
    });
    bindPref('prefAutoClose', 'autoClose');
    bindPref('prefOSBanner', 'osBanner', function() {
        STATE.bannerDismissed = false;
        renderBanner();
    });
    bindPref('prefAntiHang', 'antiHang', refreshLangTag);
    bindPref('prefDark', 'dark', applyTheme);
}

if ($('lockOpenDbg')) {
    $('lockOpenDbg').addEventListener('click', function() {
        closeDialog('lockBackdrop');
        closeDialog('prefsBackdrop');
        openDebugger();
    });
}

bindPreferenceControls();
