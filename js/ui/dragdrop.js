/* ============================================================
   DRAG & DROP (HTML5 + touch fallback)
   ============================================================ */
var dragState = { dragId: null, lastTarget: null, lastPosition: null };

function handleDragStart(e) {
    var id = this.getAttribute('data-id');
    if (!id || id === STATE.tree.id) { e.preventDefault(); return; }
    dragState.dragId = id;
    this.classList.add('dragging');
    $('fileTree').classList.add('dragging');
    if (e.dataTransfer) {
        e.dataTransfer.effectAllowed = 'move';
        try { e.dataTransfer.setData('text/plain', id); } catch(err) {}
    }
}
function handleDragEnd() {
    this.classList.remove('dragging');
    $('fileTree').classList.remove('dragging');
    clearDropTargets();
    dragState.dragId = null;
    dragState.lastTarget = null;
    dragState.lastPosition = null;
}
function handleDragOver(e) {
    if (!dragState.dragId) return;
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
    var target, position;
    if (this.id === 'treeDropRoot') { target = this; position = 'into-root'; }
    else {
        var type = this.getAttribute('data-type');
        var targetId = this.getAttribute('data-id');
        if (targetId === dragState.dragId) return;
        if (isDescendant(STATE.tree, dragState.dragId, targetId)) return;
        var rect = this.getBoundingClientRect();
        var y = e.clientY - rect.top;
        var h = rect.height;
        if (type === 'folder') {
            if (y < h * 0.25) position = 'before';
            else if (y > h * 0.75) position = 'after';
            else position = 'into';
        } else {
            position = (y < h * 0.5) ? 'before' : 'after';
        }
        target = this;
    }
    if (dragState.lastTarget !== target || dragState.lastPosition !== position) {
        clearDropTargets();
        dragState.lastTarget = target;
        dragState.lastPosition = position;
        if (position === 'into-root' || position === 'into') target.classList.add('drop-target-into');
        else if (position === 'before') target.classList.add('drop-target-before');
        else if (position === 'after')  target.classList.add('drop-target-after');
    }
}
function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    if (!dragState.dragId) return;
    var dragId = dragState.dragId;
    var targetEl = dragState.lastTarget;
    var position = dragState.lastPosition;
    clearDropTargets();
    if (!targetEl || !position) return;
    if (position === 'into-root') {
        moveNode(dragId, STATE.tree.id, 'last');
    } else {
        var targetId = targetEl.getAttribute('data-id');
        if (!targetId || targetId === dragId) return;
        if (isDescendant(STATE.tree, dragId, targetId)) return;
        if (position === 'into') moveNode(dragId, targetId, 'last');
        else {
            var parent = findParent(STATE.tree, targetId);
            if (!parent) return;
            var idx = parent.children.indexOf(findNode(STATE.tree, targetId));
            if (position === 'after') idx++;
            moveNodeToIndex(dragId, parent.id, idx);
        }
    }
    dragState.dragId = null;
    dragState.lastTarget = null;
    dragState.lastPosition = null;
}
function clearDropTargets() {
    document.querySelectorAll('.drop-target-into, .drop-target-before, .drop-target-after').forEach(function(el) {
        el.classList.remove('drop-target-into', 'drop-target-before', 'drop-target-after');
    });
}
function moveNode(dragId, newParentId, where) {
    var node = findNode(STATE.tree, dragId);
    var newParent = findNode(STATE.tree, newParentId);
    if (!node || !newParent || newParent.type !== 'folder') return;
    if (isDescendant(STATE.tree, dragId, newParentId)) return;
    var oldParent = findParent(STATE.tree, dragId);
    if (!oldParent) return;
    oldParent.children.splice(oldParent.children.indexOf(node), 1);
    if (where === 'first') newParent.children.unshift(node);
    else newParent.children.push(node);
    newParent.expanded = true;
    sortChildren(newParent);
    renderTree();
    if (typeof showToast === 'function') showToast('Mutat: ' + node.name);
}
function moveNodeToIndex(dragId, newParentId, index) {
    var node = findNode(STATE.tree, dragId);
    var newParent = findNode(STATE.tree, newParentId);
    if (!node || !newParent || newParent.type !== 'folder') return;
    if (isDescendant(STATE.tree, dragId, newParentId)) return;
    var oldParent = findParent(STATE.tree, dragId);
    if (!oldParent) return;
    var wasInSameParent = (oldParent.id === newParentId);
    var oldIdx = oldParent.children.indexOf(node);
    oldParent.children.splice(oldIdx, 1);
    if (wasInSameParent && oldIdx < index) index--;
    newParent.children.splice(Math.max(0, Math.min(index, newParent.children.length)), 0, node);
    newParent.expanded = true;
    renderTree();
    if (typeof showToast === 'function') showToast('Mutat: ' + node.name);
}

/* Touch drag (mobile) */
var touchDrag = { active: false, longPressTimer: null, dragId: null, startX: 0, startY: 0, ghost: null };
function handleTouchStart(e) {
    var id = this.getAttribute('data-id');
    if (!id || id === STATE.tree.id) return;
    var self = this;
    var t = e.touches[0];
    touchDrag.startX = t.clientX;
    touchDrag.startY = t.clientY;
    touchDrag.longPressTimer = setTimeout(function() {
        if (touchDrag.active) return;
        beginTouchDrag(self, id, touchDrag.startX, touchDrag.startY);
    }, 380);

    var onMove = function(ev) {
        var mt = ev.touches[0];
        var dx = Math.abs(mt.clientX - touchDrag.startX);
        var dy = Math.abs(mt.clientY - touchDrag.startY);
        if (!touchDrag.active && (dx > 8 || dy > 8)) {
            clearTimeout(touchDrag.longPressTimer);
            touchDrag.longPressTimer = null;
            document.removeEventListener('touchmove', onMove);
            document.removeEventListener('touchend', onEnd);
            return;
        }
        if (touchDrag.active) {
            ev.preventDefault();
            handleTouchDragMove(mt.clientX, mt.clientY);
        }
    };
    var onEnd = function(ev) {
        clearTimeout(touchDrag.longPressTimer);
        touchDrag.longPressTimer = null;
        if (touchDrag.active) {
            var t2 = ev.changedTouches[0];
            endTouchDrag(t2.clientX, t2.clientY);
        }
        document.removeEventListener('touchmove', onMove);
        document.removeEventListener('touchend', onEnd);
        document.removeEventListener('touchcancel', onEnd);
    };
    document.addEventListener('touchmove', onMove, { passive: false });
    document.addEventListener('touchend', onEnd);
    document.addEventListener('touchcancel', onEnd);
}
function beginTouchDrag(rowEl, id, x, y) {
    touchDrag.active = true;
    touchDrag.dragId = id;
    dragState.dragId = id;
    rowEl.classList.add('mobile-drag-active');
    if (navigator.vibrate) navigator.vibrate(20);
    var node = findNode(STATE.tree, id);
    var ghost = document.createElement('div');
    ghost.className = 'dragging-ghost';
    ghost.innerHTML = (node.type === 'folder'
        ? '<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" opacity="0.85"><path d="M1 4h4l1 1h9v2H1z"/></svg>'
        : fileIconFor(node.name)) + '<span>' + escapeHtml(node.name) + '</span>';
    ghost.style.left = x + 'px';
    ghost.style.top = y + 'px';
    document.body.appendChild(ghost);
    touchDrag.ghost = ghost;
    $('fileTree').classList.add('dragging');
}
function handleTouchDragMove(x, y) {
    if (touchDrag.ghost) {
        touchDrag.ghost.style.left = x + 'px';
        touchDrag.ghost.style.top = y + 'px';
    }
    var el = document.elementFromPoint(x, y);
    if (!el) return;
    var row = el.closest ? el.closest('.tree-row') : null;
    if (!row && el.id === 'treeDropRoot') row = el;
    if (!row && el.closest) row = el.closest('#treeDropRoot');
    clearDropTargets();
    if (!row) { dragState.lastTarget = null; dragState.lastPosition = null; return; }
    if (row.id === 'treeDropRoot') {
        row.classList.add('drop-target-into');
        dragState.lastTarget = row;
        dragState.lastPosition = 'into-root';
    } else {
        var targetId = row.getAttribute('data-id');
        if (!targetId || targetId === touchDrag.dragId) return;
        if (isDescendant(STATE.tree, touchDrag.dragId, targetId)) return;
        var type = row.getAttribute('data-type');
        var rect = row.getBoundingClientRect();
        var ry = y - rect.top;
        var h = rect.height;
        var position;
        if (type === 'folder') {
            if (ry < h * 0.25) position = 'before';
            else if (ry > h * 0.75) position = 'after';
            else position = 'into';
        } else {
            position = (ry < h * 0.5) ? 'before' : 'after';
        }
        if (position === 'into') row.classList.add('drop-target-into');
        else if (position === 'before') row.classList.add('drop-target-before');
        else if (position === 'after') row.classList.add('drop-target-after');
        dragState.lastTarget = row;
        dragState.lastPosition = position;
    }
    var treeEl = $('fileTree');
    var treeRect = treeEl.getBoundingClientRect();
    if (y < treeRect.top + 40) treeEl.scrollTop -= 6;
    else if (y > treeRect.bottom - 40) treeEl.scrollTop += 6;
}
function endTouchDrag(x, y) {
    touchDrag.active = false;
    var dragId = touchDrag.dragId;
    var target = dragState.lastTarget;
    var position = dragState.lastPosition;
    document.querySelectorAll('.tree-row.mobile-drag-active').forEach(function(el) { el.classList.remove('mobile-drag-active'); });
    if (touchDrag.ghost) { touchDrag.ghost.remove(); touchDrag.ghost = null; }
    $('fileTree').classList.remove('dragging');
    clearDropTargets();
    touchDrag.dragId = null;
    dragState.dragId = null;
    dragState.lastTarget = null;
    dragState.lastPosition = null;
    if (!target || !position || !dragId) return;
    if (position === 'into-root') moveNode(dragId, STATE.tree.id, 'last');
    else {
        var targetId = target.getAttribute('data-id');
        if (!targetId || targetId === dragId) return;
        if (isDescendant(STATE.tree, dragId, targetId)) return;
        if (position === 'into') moveNode(dragId, targetId, 'last');
        else {
            var parent = findParent(STATE.tree, targetId);
            if (!parent) return;
            var idx = parent.children.indexOf(findNode(STATE.tree, targetId));
            if (position === 'after') idx++;
            moveNodeToIndex(dragId, parent.id, idx);
        }
    }
}
