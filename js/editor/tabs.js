/* ============================================================
   FILE OPS
   ============================================================ */
function openFile(id) {
    var node = findNode(STATE.tree, id);
    if (!node || node.type !== 'file') return;
    if (STATE.openTabs.indexOf(id) === -1) STATE.openTabs.push(id);
    STATE.activeFile = id;
    renderTabs();
    renderTree();
    mountEditor();
    updateBreadcrumb();
}
function closeTab(id) {
    var i = STATE.openTabs.indexOf(id);
    if (i === -1) return;
    STATE.openTabs.splice(i, 1);
    if (STATE.activeFile === id) {
        STATE.activeFile = STATE.openTabs.length
            ? STATE.openTabs[Math.min(i, STATE.openTabs.length - 1)] : null;
    }
    renderTabs(); renderTree(); mountEditor(); updateBreadcrumb();
}
function addFile(parentId, name) {
    var parent = findNode(STATE.tree, parentId);
    if (!parent || parent.type !== 'folder') return;
    var node = { id: nextId(), type: 'file', name: name };
    STATE.fileContents[node.id] = '';
    parent.expanded = true;
    parent.children.push(node);
    sortChildren(parent);
    renderTree();
    openFile(node.id);
    showToast('Fișier creat: ' + name);
}
function addFolder(parentId, name) {
    var parent = findNode(STATE.tree, parentId);
    if (!parent || parent.type !== 'folder') return;
    var node = { id: nextId(), type: 'folder', name: name, expanded: true, children: [] };
    parent.expanded = true;
    parent.children.push(node);
    sortChildren(parent);
    renderTree();
    showToast('Folder creat: ' + name);
}
function sortChildren(folder) {
    folder.children.sort(function(a, b) {
        if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
        return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
    });
}
function deleteNode(id) {
    var parent = findParent(STATE.tree, id);
    if (!parent) return;
    var node = findNode(STATE.tree, id);
    var idx = parent.children.indexOf(node);
    if (idx === -1) return;
    parent.children.splice(idx, 1);
    collectFileIds(node).forEach(function(fid) {
        delete STATE.fileContents[fid];
        var ti = STATE.openTabs.indexOf(fid);
        if (ti !== -1) STATE.openTabs.splice(ti, 1);
        if (STATE.activeFile === fid) STATE.activeFile = null;
    });
    if (!STATE.activeFile && STATE.openTabs.length) STATE.activeFile = STATE.openTabs[0];
    renderTree(); renderTabs(); mountEditor(); updateBreadcrumb();
    showToast('Șters: ' + node.name);
}
function collectFileIds(node, acc) {
    acc = acc || [];
    if (node.type === 'file') acc.push(node.id);
    else if (node.children) node.children.forEach(function(c) { collectFileIds(c, acc); });
    return acc;
}
function startRename(id) {
    var node = findNode(STATE.tree, id);
    if (!node || node.id === STATE.tree.id) return;
    node._renaming = true;
    renderTree();
}
function finishRename(id, newName) {
    var node = findNode(STATE.tree, id);
    if (!node) return;
    newName = (newName || '').trim();
    if (newName && validateName(newName)) node.name = newName;
    delete node._renaming;
    var parent = findParent(STATE.tree, id);
    if (parent) sortChildren(parent);
    renderTree();
    if (STATE.activeFile === id) { renderTabs(); mountEditor(); updateBreadcrumb(); }
}
function cancelRename(id) {
    var node = findNode(STATE.tree, id);
    if (!node) return;
    delete node._renaming;
    renderTree();
}

