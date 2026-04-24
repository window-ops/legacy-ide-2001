/* ============================================================
   SMOKE TESTS (opt-in via ?smoke=1)
   ============================================================ */
(function() {
    function hasQueryFlag(name) {
        try { return new URLSearchParams(location.search).get(name) === '1'; }
        catch (e) { return false; }
    }
    if (!hasQueryFlag('smoke')) return;

    function assert(cond, msg) {
        if (!cond) throw new Error('SMOKE FAIL: ' + msg);
    }
    function log(msg) {
        try { console.log('[SMOKE]', msg); } catch (e) {}
    }

    window.addEventListener('load', function() {
        setTimeout(function() {
            log('starting');

            /* Core boot */
            assert(typeof openDialog === 'function', 'openDialog defined');
            assert(typeof updateNewFileWarning === 'function', 'updateNewFileWarning defined');
            assert(STATE && STATE.tree && STATE.openTabs, 'STATE initialized');

            /* Editor */
            assert(typeof renderTree === 'function', 'renderTree defined');
            assert(typeof mountEditor === 'function', 'mountEditor defined');
            renderTree();
            renderTabs();
            mountEditor();
            log('editor ok');

            /* Debugger + patches */
            assert(typeof openDebugger === 'function', 'openDebugger defined');
            openDebugger();
            assert($('debugger').classList.contains('open'), 'debugger opens');
            assert($('dbgFuncList').children.length >= 3, 'function list populated');
            assert(typeof dbgLocToVa === 'function' && typeof dbgVaToLoc === 'function', 'vm helpers');
            assert(typeof DbgBackend !== 'undefined' && DbgBackend.getRegisters(), 'DbgBackend');
            var loc180 = dbgVaToLoc(0x401180);
            assert(loc180 && loc180.fn === 'check_curriculum', 'VA map for check_curriculum');
            var entryVa = dbgLocToVa('check_curriculum', dbgFirstExecIdx(DISASM.check_curriculum));
            assert(CPU.rip === entryVa, 'CPU.rip syncs with entry VA');

            /* Retur 0 pe calea de eșec: lint activ, fără bypass total */
            applyPatch('check_curriculum', 12, { type: 'edit', newMnem: 'mov', newOps: 'eax, 0x0', newBytes: 'B8 00 00 00 00' });
            assert(STATE.binaryPatches.bypassCurriculum === false, 'mov eax,0 nu setează bypassCurriculum');
            assert(STATE.binaryPatches.curriculumNonBlocking === true, 'curriculumNonBlocking set');
            var hitsNb = lintCode('let x = 1;');
            assert(Array.isArray(hitsNb) && hitsNb.length > 0, 'lint rulează cu patch retur 0');
            resetAllPatches();
            log('nonblocking cc_fail_ret ok');

            // apply invert patch to cc_jz
            applyPatch('check_curriculum', 8, { type: 'invert' });
            assert(STATE.binaryPatches && STATE.binaryPatches.bypassCurriculum === true, 'bypassCurriculum set');
            log('debugger+patch ok');

            /* Lint gate via patch */
            var hits = lintCode('let x = 1;');
            assert(Array.isArray(hits) && hits.length === 0, 'lint bypassed under patch');
            log('lint gate ok');

            /* Exploit stage */
            injectVulnerability('fmt');
            assert(STATE.exploit.stage >= 2, 'exploit stage >=2 after vuln');
            log('exploit stage ok');

            /* Reverse shell open */
            openShell();
            assert($('shellBackdrop').classList.contains('open'), 'shell dialog opens');
            closeShell();
            log('reverse shell ok');

            /* QNX session open */
            openQnxSession();
            assert($('qnxSession').classList.contains('open'), 'qnx session opens');
            openQnxApp('files');
            assert($('qnxWinFiles').classList.contains('open') || $('qnxWinFiles').classList.contains('minimized') === false, 'qnx files window toggles');
            log('qnx ok');

            /* Docs */
            openDebuggerDocs();
            assert($('dbgDocsPanel').classList.contains('open'), 'debugger docs open');
            assert($('dbgDocsContent').textContent.indexOf('Flux exploit') !== -1, 'exploit docs present');
            closeDebuggerDocs();
            log('docs ok');

            log('PASS');
        }, 50);
    });
})();

