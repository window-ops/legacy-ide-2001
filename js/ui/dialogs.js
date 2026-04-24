/* ============================================================
   DIALOGS / SIDEBAR / NEW FILE
   ============================================================ */
function openDialog(id) { $(id).classList.add('open'); }
function closeDialog(id) { $(id).classList.remove('open'); }

document.querySelectorAll('[data-close]').forEach(function(el) {
    el.addEventListener('click', function() { closeDialog(this.getAttribute('data-close')); });
});
document.querySelectorAll('.dialog-backdrop').forEach(function(el) {
    el.addEventListener('click', function(e) { if (e.target === el) closeDialog(el.id); });
});

function openMobileSidebar() { $('sidebar').classList.add('mobile-open'); $('sidebarScrim').classList.add('open'); }
function closeMobileSidebar() { $('sidebar').classList.remove('mobile-open'); $('sidebarScrim').classList.remove('open'); }

$('btnSidebar').addEventListener('click', function() {
    if (isMobileViewport()) {
        if ($('sidebar').classList.contains('mobile-open')) closeMobileSidebar();
        else openMobileSidebar();
    } else {
        $('sidebar').classList.toggle('collapsed');
    }
});
$('sidebarScrim').addEventListener('click', closeMobileSidebar);
function updateMobileState() {
    STATE.isMobile = isMobileViewport();
    if (!STATE.isMobile) { $('sidebar').classList.remove('mobile-open'); $('sidebarScrim').classList.remove('open'); }
}
window.addEventListener('resize', updateMobileState);

/* Add menu */
$('btnAdd').addEventListener('click', function(e) {
    e.stopPropagation();
    var r = this.getBoundingClientRect();
    var m = $('addMenu');
    m.style.left = Math.max(8, r.right - 220) + 'px';
    m.style.top = (r.bottom + 4) + 'px';
    m.classList.toggle('open');
});

/* Delete active file button */
$('btnDeleteNode').addEventListener('click', function() {
    if (!STATE.activeFile) {
        if (typeof showToast === 'function') showToast('Selectați un fișier deschis pentru ștergere.');
        return;
    }
    var node = findNode(STATE.tree, STATE.activeFile);
    if (!node) return;
    showConfirm('Confirmare ștergere', 'Ștergeți fișierul <b>' + escapeHtml(node.name) + '</b>?')
        .then(function(ok) { if (ok) deleteNode(node.id); });
});

document.querySelectorAll('#addMenu .popover-item').forEach(function(el) {
    el.addEventListener('click', function() {
        $('addMenu').classList.remove('open');
        var act = this.getAttribute('data-action');
        if (act === 'new-file') promptNewFile(STATE.tree.id);
        else if (act === 'new-folder') promptNewFolder(STATE.tree.id);
    });
});

function promptNewFile(parentId) {
    openNewFileDialog().then(function(name) { if (name) addFile(parentId, name); });
}
function promptNewFolder(parentId) {
    showPrompt('Folder nou', 'Nume folder:', 'folder-nou', function(v) {
        if (!v) return 'Introduceți un nume.';
        if (!validateName(v)) return 'Caractere permise: litere, cifre, spațiu, cratimă, underscore.';
        if (/\./.test(v)) return 'Evitați punctele în numele folderelor.';
        return null;
    }).then(function(name) { if (name) addFolder(parentId, name); });
}

/* New file dialog */
var _newFileResolve = null;
function updateNewFileWarning() {
    var ext = $('newFileExtSelect').value;
    if (ext === 'js') {
        $('newFileWarning').innerHTML = 'Avertisment: <code>.js</code> poate ieși din programa TIC dacă folosiți constructe moderne. Folosiți stil legacy sau bypass în debugger.';
        return;
    }
    if (ext === 'md') {
        $('newFileWarning').innerHTML = 'Avertisment: <code>.md</code> nu este predat la școală. Formatarea nu este suportată până nu o activați runtime în backend.';
        return;
    }
    $('newFileWarning').textContent = '';
}
function openNewFileDialog() {
    $('newFileBaseInput').value = 'fisier';
    $('newFileExtSelect').value = 'html';
    $('newFileError').textContent = '';
    updateNewFileWarning();
    openDialog('newFileBackdrop');
    setTimeout(function() { $('newFileBaseInput').focus(); $('newFileBaseInput').select(); }, 30);
    return new Promise(function(resolve) { _newFileResolve = resolve; });
}
$('newFileExtSelect').addEventListener('change', updateNewFileWarning);
$('newFileCancel').onclick = function() {
    closeDialog('newFileBackdrop');
    if (_newFileResolve) _newFileResolve(null);
    _newFileResolve = null;
};
$('newFileOK').onclick = function() {
    var base = $('newFileBaseInput').value.trim();
    var ext = $('newFileExtSelect').value;
    if (!base) { $('newFileError').textContent = 'Introduceți numele fișierului.'; return; }
    if (/[.]/.test(base)) { $('newFileError').textContent = 'Extensia se alege din listă, nu în nume.'; return; }
    if (!/^[A-Za-z0-9_ -]{1,42}$/.test(base)) { $('newFileError').textContent = 'Nume invalid: litere, cifre, spațiu, cratimă, underscore.'; return; }
    var full = base + '.' + ext;
    if (!validateName(full)) { $('newFileError').textContent = 'Nume final invalid.'; return; }
    closeDialog('newFileBackdrop');
    if (_newFileResolve) _newFileResolve(full);
    _newFileResolve = null;
};
$('newFileBaseInput').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') $('newFileOK').click();
    else if (e.key === 'Escape') $('newFileCancel').click();
});
