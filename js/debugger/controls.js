/* ============================================================
   DEBUGGER CONTROLS / SHORTCUTS
   ============================================================ */
$('dbgCloseBtn').addEventListener('click', closeDebugger);
$('dbgStepBtn').addEventListener('click', dbgStep);
$('dbgRunBtn').addEventListener('click', dbgContinue);
$('dbgRewindBtn').addEventListener('click', function() { dbgResetRip(); renderDisassembly(); renderRegisters(); });
$('dbgResetPatchesBtn').addEventListener('click', resetAllPatches);
$('dbgDocsBtn').addEventListener('click', function() { openDebuggerDocs(); });
$('dbgDocsCloseBtn').addEventListener('click', function() { closeDebuggerDocs(); });
$('dbgResetLayoutBtn').addEventListener('click', function() {
    var body = $('debugger');
    if (!body) return;
    body.style.setProperty('--dbg-left-col', '220px');
    body.style.setProperty('--dbg-right-col', '300px');
    body.style.setProperty('--dbg-bottom-row', '180px');
    if (typeof showToast === 'function') showToast('Layout debugger resetat.');
});

(function initDebuggerSplitters() {
    var body = $('debugger');
    var grid = document.querySelector('.dbg-body');
    var splitLeft = $('dbgSplitLeft');
    var splitRight = $('dbgSplitRight');
    var splitBottom = $('dbgSplitBottom');
    if (!body || !grid || !splitLeft || !splitRight || !splitBottom) return;

    function pxVar(name, fallback) {
        var v = parseFloat(getComputedStyle(body).getPropertyValue(name));
        return isNaN(v) ? fallback : v;
    }
    function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }
    function isResizableLayout() { return window.innerWidth > 760; }
    function minSizes(width) {
        if (width <= 820) return { left: 120, right: 150, center: 150 };
        if (width <= 980) return { left: 140, right: 180, center: 190 };
        return { left: 160, right: 220, center: 260 };
    }
    function fitColumns(width, left, right) {
        var mins = minSizes(width);
        var maxTotal = Math.max(220, width - mins.center);
        if (left + right > maxTotal) {
            var scale = maxTotal / (left + right);
            left = Math.floor(left * scale);
            right = Math.floor(right * scale);
        }
        left = clamp(left, mins.left, Math.max(mins.left, width - right - mins.center));
        right = clamp(right, mins.right, Math.max(mins.right, width - left - mins.center));
        if (left + right > maxTotal) {
            right = Math.max(mins.right, maxTotal - left);
            left = Math.max(mins.left, maxTotal - right);
        }
        return { left: left, right: right, center: mins.center };
    }
    function fitBottom(height, bottom) {
        var minBottom = height <= 440 ? 90 : 120;
        var maxBottom = Math.max(minBottom, height - 110);
        return clamp(bottom, minBottom, maxBottom);
    }
    function normalizeLayout() {
        var rect = grid.getBoundingClientRect();
        if (!rect.width || !rect.height || !isResizableLayout()) {
            body.classList.remove('resizing');
            return;
        }
        var left = pxVar('--dbg-left-col', 220);
        var right = pxVar('--dbg-right-col', 300);
        var bottom = pxVar('--dbg-bottom-row', 180);
        var cols = fitColumns(rect.width, left, right);
        left = cols.left;
        right = cols.right;
        bottom = fitBottom(rect.height, bottom);
        body.style.setProperty('--dbg-left-col', Math.round(left) + 'px');
        body.style.setProperty('--dbg-right-col', Math.round(right) + 'px');
        body.style.setProperty('--dbg-bottom-row', Math.round(bottom) + 'px');
    }

    var drag = null;
    function onMove(clientX, clientY) {
        if (!drag || !isResizableLayout()) return;
        var rect = grid.getBoundingClientRect();
        var x = clientX - rect.left;
        var y = clientY - rect.top;
        var w = rect.width;
        var h = rect.height;
        var left = pxVar('--dbg-left-col', 220);
        var right = pxVar('--dbg-right-col', 300);
        var bottom = pxVar('--dbg-bottom-row', 180);
        var mins = minSizes(w);

        if (drag.type === 'left') {
            left = clamp(x, mins.left, Math.max(mins.left, w - right - mins.center));
            var colsLeft = fitColumns(w, left, right);
            left = colsLeft.left;
            right = colsLeft.right;
            body.style.setProperty('--dbg-left-col', Math.round(left) + 'px');
            body.style.setProperty('--dbg-right-col', Math.round(right) + 'px');
        } else if (drag.type === 'right') {
            right = clamp(w - x, mins.right, Math.max(mins.right, w - left - mins.center));
            var colsRight = fitColumns(w, left, right);
            left = colsRight.left;
            right = colsRight.right;
            body.style.setProperty('--dbg-left-col', Math.round(left) + 'px');
            body.style.setProperty('--dbg-right-col', Math.round(right) + 'px');
        } else if (drag.type === 'bottom') {
            bottom = fitBottom(h, h - y);
            body.style.setProperty('--dbg-bottom-row', Math.round(bottom) + 'px');
        }
    }
    function stopDrag() {
        drag = null;
        body.classList.remove('resizing');
        document.body.style.userSelect = '';
        normalizeLayout();
    }
    function startDrag(type) {
        if (!isResizableLayout()) return;
        drag = { type: type };
        body.classList.add('resizing');
        document.body.style.userSelect = 'none';
    }

    function bindPointerSplitter(el, type) {
        el.addEventListener('pointerdown', function(e) {
            startDrag(type);
            if (!drag) return;
            drag.pointerId = e.pointerId;
            if (el.setPointerCapture) el.setPointerCapture(e.pointerId);
            e.preventDefault();
        });
        el.addEventListener('pointermove', function(e) {
            if (!drag || drag.pointerId !== e.pointerId) return;
            onMove(e.clientX, e.clientY);
            e.preventDefault();
        });
        el.addEventListener('pointerup', function(e) {
            if (!drag || drag.pointerId !== e.pointerId) return;
            if (el.releasePointerCapture) el.releasePointerCapture(e.pointerId);
            stopDrag();
        });
        el.addEventListener('pointercancel', stopDrag);
    }
    bindPointerSplitter(splitLeft, 'left');
    bindPointerSplitter(splitRight, 'right');
    bindPointerSplitter(splitBottom, 'bottom');
    window.__normalizeDebuggerLayout = function() {
        requestAnimationFrame(function() {
            requestAnimationFrame(normalizeLayout);
        });
    };
    window.addEventListener('resize', function() {
        if (!isResizableLayout()) stopDrag();
        normalizeLayout();
    });
    normalizeLayout();
})();

document.addEventListener('keydown', function(e) {
    if (e.ctrlKey && e.shiftKey && (e.key === 'D' || e.key === 'd')) {
        e.preventDefault();
        if (STATE.dbgOpen) closeDebugger(); else openDebugger();
        return;
    }
    if (!STATE.dbgOpen) return;
    if (e.key === 'Escape') {
        if ($('dbgDocsPanel').classList.contains('open')) { closeDebuggerDocs(); return; }
        closeDebugger();
        return;
    }
    if (e.key === 'F10') { e.preventDefault(); dbgStep(); return; }
    if (e.key === 'F5')  { e.preventDefault(); dbgContinue(); return; }
});
