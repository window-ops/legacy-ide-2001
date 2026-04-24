/* ============================================================
   PROMPT / CONFIRM DIALOG HELPERS
   Promise-returning wrappers around the #promptBackdrop and
   #confirmBackdrop dialogs. Shared UI primitives used by the
   editor, tab bar, and file tree.
   ============================================================ */
var _promptResolve = null;
function showPrompt(title, label, defaultValue, validator) {
    $('promptTitle').textContent = title;
    $('promptLabel').textContent = label;
    $('promptInput').value = defaultValue || '';
    $('promptError').textContent = '';
    openDialog('promptBackdrop');
    setTimeout(function() { $('promptInput').focus(); $('promptInput').select(); }, 50);
    return new Promise(function(resolve) { _promptResolve = { resolve: resolve, validator: validator }; });
}
$('promptOK').onclick = function() {
    var val = $('promptInput').value.trim();
    var v = _promptResolve && _promptResolve.validator;
    var err = v ? v(val) : null;
    if (err) { $('promptError').textContent = err; return; }
    closeDialog('promptBackdrop');
    if (_promptResolve) _promptResolve.resolve(val);
    _promptResolve = null;
};
$('promptCancel').onclick = function() {
    closeDialog('promptBackdrop');
    if (_promptResolve) _promptResolve.resolve(null);
    _promptResolve = null;
};
$('promptInput').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') $('promptOK').click();
    else if (e.key === 'Escape') $('promptCancel').click();
});
var _confirmResolve = null;
function showConfirm(title, body, okLabel) {
    $('confirmTitle').textContent = title;
    $('confirmBody').innerHTML = body;
    $('confirmOK').textContent = okLabel || 'Șterge';
    openDialog('confirmBackdrop');
    return new Promise(function(resolve) { _confirmResolve = resolve; });
}
$('confirmOK').onclick = function() { closeDialog('confirmBackdrop'); if (_confirmResolve) _confirmResolve(true); _confirmResolve = null; };
$('confirmCancel').onclick = function() { closeDialog('confirmBackdrop'); if (_confirmResolve) _confirmResolve(false); _confirmResolve = null; };
