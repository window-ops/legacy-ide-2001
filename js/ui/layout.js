/* ============================================================
   MAIN IDE LAYOUT RESIZERS
   ============================================================ */
(function initMainLayoutResizers() {
    var main = $('main');
    var sidebar = $('sidebar');
    var sidebarInner = sidebar ? sidebar.querySelector('.sidebar-inner') : null;
    var sidebarHandle = $('mainResizeHandle');
    var outputPanel = $('outputPanel');
    var outputHandle = $('resizeHandle');
    if (!main || !sidebar || !sidebarInner || !sidebarHandle || !outputPanel || !outputHandle) return;

    function isDesktopLayout() {
        return window.innerWidth > 720 && !sidebar.classList.contains('mobile-open');
    }
    function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }

    function setSidebarWidth(px) {
        var w = Math.round(px);
        main.style.setProperty('--sidebar-w', w + 'px');
    }
    function getSidebarWidth() {
        return parseFloat(getComputedStyle(main).getPropertyValue('--sidebar-w')) || sidebar.getBoundingClientRect().width || 260;
    }

    var sideDrag = null;
    var outDrag = null;

    function endSideDrag() {
        if (!sideDrag) return;
        sideDrag = null;
        document.body.classList.remove('layout-resizing-sidebar');
        document.body.style.userSelect = '';
    }
    function endOutDrag() {
        if (!outDrag) return;
        outDrag = null;
        document.body.classList.remove('layout-resizing-output');
        document.body.style.userSelect = '';
    }

    sidebarHandle.addEventListener('pointerdown', function(e) {
        if (!isDesktopLayout() || sidebar.classList.contains('collapsed')) return;
        sideDrag = { pointerId: e.pointerId };
        document.body.classList.add('layout-resizing-sidebar');
        document.body.style.userSelect = 'none';
        if (sidebarHandle.setPointerCapture) sidebarHandle.setPointerCapture(e.pointerId);
        e.preventDefault();
    });
    sidebarHandle.addEventListener('pointermove', function(e) {
        if (!sideDrag || sideDrag.pointerId !== e.pointerId) return;
        var rect = main.getBoundingClientRect();
        var next = clamp(e.clientX - rect.left, 180, Math.min(520, rect.width - 360));
        setSidebarWidth(next);
        e.preventDefault();
    });
    sidebarHandle.addEventListener('pointerup', function(e) {
        if (!sideDrag || sideDrag.pointerId !== e.pointerId) return;
        if (sidebarHandle.releasePointerCapture) sidebarHandle.releasePointerCapture(e.pointerId);
        endSideDrag();
    });
    sidebarHandle.addEventListener('pointercancel', endSideDrag);

    outputHandle.addEventListener('pointerdown', function(e) {
        var content = outputPanel.parentElement;
        if (!content) return;
        outDrag = {
            pointerId: e.pointerId,
            startY: e.clientY,
            startHeight: outputPanel.getBoundingClientRect().height,
            maxHeight: Math.max(180, content.getBoundingClientRect().height * 0.8)
        };
        document.body.classList.add('layout-resizing-output');
        document.body.style.userSelect = 'none';
        if (outputHandle.setPointerCapture) outputHandle.setPointerCapture(e.pointerId);
        e.preventDefault();
    });
    outputHandle.addEventListener('pointermove', function(e) {
        if (!outDrag || outDrag.pointerId !== e.pointerId) return;
        var dy = outDrag.startY - e.clientY;
        var nextHeight = clamp(outDrag.startHeight + dy, 120, outDrag.maxHeight);
        outputPanel.style.height = Math.round(nextHeight) + 'px';
        e.preventDefault();
    });
    outputHandle.addEventListener('pointerup', function(e) {
        if (!outDrag || outDrag.pointerId !== e.pointerId) return;
        if (outputHandle.releasePointerCapture) outputHandle.releasePointerCapture(e.pointerId);
        endOutDrag();
    });
    outputHandle.addEventListener('pointercancel', endOutDrag);

    window.addEventListener('resize', function() {
        if (!isDesktopLayout()) return;
        if (sidebar.classList.contains('collapsed')) return;
        setSidebarWidth(clamp(getSidebarWidth(), 180, Math.min(520, main.getBoundingClientRect().width - 360)));
    });
})();

