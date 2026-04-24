/* ============================================================
   CONTEXT MENU
   ============================================================ */
function openContextMenu(id, x, y) {
    STATE.contextNode = id;
    var el = $('ctxMenu');
    el.classList.add('open');
    var w = 220;
    var left = Math.min(x, window.innerWidth - w - 8);
    var top  = Math.min(y, window.innerHeight - 260);
    el.style.left = Math.max(8, left) + 'px';
    el.style.top  = Math.max(8, top) + 'px';
    var node = findNode(STATE.tree, id);
    el.querySelector('[data-ctx="open"]').style.display = (node.type === 'file') ? '' : 'none';
    el.querySelector('[data-ctx="new-file-in"]').style.display = (node.type === 'folder') ? '' : 'none';
    el.querySelector('[data-ctx="new-folder-in"]').style.display = (node.type === 'folder') ? '' : 'none';
    el.querySelector('[data-ctx="delete"]').style.display = (node.id === STATE.tree.id) ? 'none' : '';
}

document.addEventListener('click', function(e) {
    ['ctxMenu', 'mainMenu', 'addMenu'].forEach(function(id) {
        var el = $(id);
        if (el && el.classList.contains('open') && !el.contains(e.target) && e.target.id !== id) {
            el.classList.remove('open');
            el.classList.remove('anchor-below');
        }
    });
});

document.querySelectorAll('#ctxMenu .popover-item').forEach(function(el) {
    el.addEventListener('click', function() {
        var menu = $('ctxMenu');
        var id = STATE.contextNode;
        var node = id ? findNode(STATE.tree, id) : null;
        menu.classList.remove('open');
        if (!node) return;
        var act = this.getAttribute('data-ctx');
        if (act === 'open' && node.type === 'file') {
            openFile(node.id);
            return;
        }
        if (act === 'new-file-in' && node.type === 'folder') {
            promptNewFile(node.id);
            return;
        }
        if (act === 'new-folder-in' && node.type === 'folder') {
            promptNewFolder(node.id);
            return;
        }
        if (act === 'rename' && node.id !== STATE.tree.id) {
            startRename(node.id);
            return;
        }
        if (act === 'download') {
            if (node.type === 'file') {
                downloadFileByNodeId(node.id);
            } else {
                // A folder-level download uses the project zip logic but
                // only includes files under this folder.
                var files = [];
                (function walk(n, prefix) {
                    var p = prefix ? prefix + '/' + n.name : n.name;
                    if (n.type === 'file') {
                        files.push({ path: p, content: STATE.fileContents[n.id] || '' });
                    } else if (n.children) {
                        for (var i = 0; i < n.children.length; i++) walk(n.children[i], p);
                    }
                })(node, '');
                if (files.length === 0) { showToast('Dosarul este gol.'); return; }
                try {
                    saveBlobAs(buildStoredZip(files), node.name + '.zip');
                    showToast('Arhivă generată (' + files.length + ' fișiere).');
                } catch (err) {
                    showToast('Eroare la arhivare.');
                }
            }
            return;
        }
        if (act === 'delete' && node.id !== STATE.tree.id) {
            showConfirm('Confirmare ștergere', 'Ștergeți <b>' + escapeHtml(node.name) + '</b>?')
                .then(function(ok) { if (ok) deleteNode(node.id); });
        }
    });
});
