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

            /* ============================================================
               BACKEND × LINT MATRIX
               Four combinations of (patched, backend-on) × (clean code,
               dirty code), verifying:
                 - clean code never produces lint hits regardless of state
                 - dirty code under patch with backend off → bypass works
                 - dirty code under patch with backend on → bypass blocked
                 - dirty code with no patch → always flagged

               Uses a piece of code with `<!DOCTYPE html>` (post-2001) as
               "dirty" and `var x = 1;` as "clean".
               ============================================================ */
            var CLEAN = 'var x = 1;';
            var DIRTY = '<!DOCTYPE html>';

            // Reset state into a known starting position.
            resetAllPatches();
            STATE.serverBackendOnline = false;
            STATE.networkUp = true;

            // 1) No patch, no backend → dirty code always flagged.
            var m1 = lintCode(DIRTY);
            assert(m1.length > 0, 'no-patch + no-backend: dirty flagged');

            // 2) Patched, no backend → dirty code passes (bypass active).
            applyPatch('check_curriculum', 8, { type: 'invert' });
            assert(STATE.binaryPatches.bypassCurriculum === true, 'patch sets bypass');
            var m2 = lintCode(DIRTY);
            assert(m2.length === 0, 'patch + no-backend: bypass works');

            // 3) Patched, backend ON → dirty code STILL flagged.
            STATE.serverBackendOnline = true;
            var m3 = lintCode(DIRTY);
            assert(m3.length > 0, 'patch + backend-on: bypass blocked, hits returned');

            // 4) Backend ON, clean code → no hits regardless.
            var m4 = lintCode(CLEAN);
            assert(m4.length === 0, 'backend-on + clean: no hits');

            // 5) Network gate beats backend even with backend reachable.
            // Disabling network forces serverBackendOnline → false in the
            // tray handler. Simulate the same effect manually.
            STATE.networkUp = false;
            STATE._backendBeforeDown = true;
            STATE.serverBackendOnline = false;
            var m5 = lintCode(DIRTY);
            assert(m5.length === 0, 'patch + network-down: bypass works (network gate beats backend)');

            // Cleanup: reset state to stable defaults.
            resetAllPatches();
            STATE.serverBackendOnline = false;
            STATE.networkUp = true;
            delete STATE._backendBeforeDown;
            log('backend matrix ok');

            /* ============================================================
               PERSISTENCE API
               Verify SRV2K3_STATE round-trips and the event log API
               accepts writes/reads.
               ============================================================ */
            assert(typeof window.SRV2K3_STATE === 'object', 'SRV2K3_STATE present');
            assert(typeof window.SRV2K3_STATE.save === 'function', 'SRV2K3_STATE.save');
            assert(typeof window.SRV2K3_STATE.load === 'function', 'SRV2K3_STATE.load');
            window.SRV2K3_STATE.save({ networkUp: false, sites: [{ desc: 'Curriculum Reporting', state: 'Stopped' }] });
            var rt = window.SRV2K3_STATE.load();
            assert(rt && rt.networkUp === false, 'state round-trip networkUp');
            assert(rt.sites && rt.sites[0].state === 'Stopped', 'state round-trip sites');
            window.SRV2K3_STATE.clear();
            assert(window.SRV2K3_STATE.load() === null, 'state clear works');
            log('persistence ok');

            assert(typeof window.SRV2K3_EVENTLOG === 'object', 'SRV2K3_EVENTLOG present');
            window.SRV2K3_EVENTLOG.write({
                log: 'Application', source: 'smoke-test', type: 'Information',
                eventID: 9999, message: 'smoke test entry'
            });
            var evs = window.SRV2K3_EVENTLOG.read('Application');
            assert(evs.some(function(e) { return e.eventID === 9999; }), 'event log write+read');
            window.SRV2K3_EVENTLOG.clear();
            log('eventlog ok');

            /* ============================================================
               SERVER 2003 MODULES PRESENT
               Verify the modules from the split are loaded and expose
               their entry points.
               ============================================================ */
            assert(typeof window.openCmdPrompt === 'function', 'openCmdPrompt exposed');
            assert(typeof window.openHelpCenter === 'function', 'openHelpCenter exposed');
            assert(typeof window.openBiosSetup === 'function', 'openBiosSetup exposed');
            assert(typeof window.openEventViewer === 'function', 'openEventViewer exposed');
            assert(typeof window.openRegedit === 'function', 'openRegedit exposed');
            assert(typeof window.iconCmd === 'function', 'icons module exposed');
            log('modules ok');

            log('PASS');
        }, 50);
    });
})();

