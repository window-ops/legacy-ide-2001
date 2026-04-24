/* ============================================================
   INIT
   ============================================================ */
function init() {
    STATE.os = detectOS();
    STATE.isMobile = isMobileViewport();
    $('stOS').textContent = 'SO: ' + STATE.os + (STATE.os === 'Windows' ? ' (aprobat)' : ' (neaprobat)');
    renderBanner();
    renderTree();
    renderTabs();
    mountEditor();
    updateBreadcrumb();
    setShellPrompt();
    updateNewFileWarning();
    applyRuntimeEffects();
    updateExploitStage();
    setupQnxWindowDragging();
    setInterval(function() {
        var d = new Date();
        $('qnxClock').textContent = ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2);
    }, 1000);
    renderQnxPanels();
    setQnxPromptLabel();
    window.addEventListener('beforeunload', function() {
        var preview = $('preview');
        if (preview) preview.srcdoc = '';
    });
}
init();
