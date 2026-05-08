/* ============================================================
   TREE
   ============================================================ */
function renderTree() {
    var el = $('fileTree');
    el.innerHTML = '';
    renderNode(STATE.tree, el, 0);
    var dropRoot = document.createElement('div');
    dropRoot.className = 'tree-drop-root';
    dropRoot.id = 'treeDropRoot';
    dropRoot.textContent = 'Plasează aici pentru a muta la rădăcină';
    dropRoot.addEventListener('dragover', handleDragOver);
    dropRoot.addEventListener('drop', handleDrop);
    el.appendChild(dropRoot);
}

function renderNode(node, container, depth) {
    var row = document.createElement('div');
    row.className = 'tree-row ' + (node.type === 'folder' ? 'folder' : 'file');
    if (node.type === 'folder' && node.expanded) row.classList.add('expanded');
    if (node.id === STATE.activeFile) row.classList.add('active');
    row.style.paddingLeft = (4 + depth * 14) + 'px';
    row.setAttribute('data-id', node.id);
    row.setAttribute('data-type', node.type);
    row.draggable = node.id !== STATE.tree.id;

    var chev = document.createElement('span'); chev.className = 'chev'; row.appendChild(chev);

    var icon = document.createElement('span');
    icon.className = 'icon';
    icon.innerHTML = node.type === 'folder'
        ? (node.expanded
            ? '<svg viewBox="0 0 16 16" fill="currentColor" opacity="0.85"><path d="M1 4h4l1 1h9v2H1z"/><path d="M1 6h14l-1 8H2z" fill-opacity="0.7"/></svg>'
            : '<svg viewBox="0 0 16 16" fill="currentColor" opacity="0.85"><path d="M1 4h4l1 1h9v9H1z"/></svg>')
        : fileIconFor(node.name);
    row.appendChild(icon);

    if (node._renaming) {
        var input = document.createElement('input');
        input.className = 'rename-input';
        input.value = node.name;
        input.onclick = function(e) { e.stopPropagation(); };
        input.onkeydown = function(e) {
            if (e.key === 'Enter') finishRename(node.id, input.value);
            else if (e.key === 'Escape') cancelRename(node.id);
        };
        input.onblur = function() { finishRename(node.id, input.value); };
        row.appendChild(input);
        setTimeout(function() { input.focus(); input.select(); }, 0);
    } else {
        var nameEl = document.createElement('span');
        nameEl.className = 'name';
        nameEl.textContent = node.name;
        row.appendChild(nameEl);
    }

    var act = document.createElement('button');
    act.className = 'row-action';
    act.setAttribute('aria-label', 'Opțiuni pentru ' + node.name);
    act.innerHTML = '<svg viewBox="0 0 16 16" fill="currentColor"><circle cx="3" cy="8" r="1.4"/><circle cx="8" cy="8" r="1.4"/><circle cx="13" cy="8" r="1.4"/></svg>';
    act.onclick = function(e) {
        e.stopPropagation();
        var r = this.getBoundingClientRect();
        // Nudge the popover 10 px closer to the button so it visually
        // hugs the row instead of sitting in space to the right.
        openContextMenu(node.id, r.right - 10, r.bottom);
    };
    row.appendChild(act);

    row.onclick = function(e) {
        if (e.target.classList.contains('rename-input') || e.target.classList.contains('row-action')) return;
        if (node.type === 'folder') { node.expanded = !node.expanded; renderTree(); }
        else { openFile(node.id); if (STATE.isMobile) closeMobileSidebar(); }
    };
    row.oncontextmenu = function(e) {
        e.preventDefault();
        openContextMenu(node.id, e.clientX, e.clientY);
    };

    if (row.draggable) {
        row.addEventListener('dragstart', handleDragStart);
        row.addEventListener('dragend', handleDragEnd);
    }
    row.addEventListener('dragover', handleDragOver);
    row.addEventListener('drop', handleDrop);
    row.addEventListener('touchstart', handleTouchStart, { passive: true });

    container.appendChild(row);

    if (node.type === 'folder' && node.expanded && node.children) {
        for (var i = 0; i < node.children.length; i++) renderNode(node.children[i], container, depth + 1);
    }
}

// F2 keyboard shortcut for renaming the active file. Mirrors the
// "Redenumește" entry in the file context menu so the visible label
// matches the actual binding. Capture phase so we win over any
// in-textarea handler; we still ignore F2 when the user is typing
// inside an editable element so it doesn\'t steal focus mid-edit.
document.addEventListener('keydown', function(e) {
    if (e.key !== 'F2') return;
    if (e.ctrlKey || e.altKey || e.metaKey || e.shiftKey) return;
    var t = e.target;
    // If a rename input is already open, let it handle Enter/Escape.
    if (t && t.classList && t.classList.contains('rename-input')) return;
    // Don\'t hijack F2 when typing inside a text field, textarea or
    // contenteditable surface, F2 there might be meaningful for the
    // user (e.g. cell-edit conventions, screen reader bindings).
    var tag = t && t.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || (t && t.isContentEditable)) return;
    if (!STATE.activeFile || STATE.activeFile === STATE.tree.id) return;
    e.preventDefault();
    if (typeof startRename === 'function') startRename(STATE.activeFile);
}, true);
