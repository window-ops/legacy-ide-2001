/* ============================================================
   DR. WATSON: PATCH PANEL
   Real Dr. Watson is a postmortem debugger: it cannot modify a
   running program. This module extends that with a "Patch" tab on
   each fault that lets the user apply / revert binary patches
   that target the same effect store the GDX Debugger writes into:
   STATE.binaryPatches.

   We do NOT call into the GDX Debugger's applyPatch() global
   because that function touches GDX-only DOM (#dbgFnList,
   #dbgDisasm) which doesn't exist when only Dr. Watson is open.
   Instead we set the same effect flags (bypassCurriculum,
   curriculumNonBlocking, bypassOSCheck) directly. The qnx and
   editor modules already read those flags, so Verifică and
   Execută afterwards behave exactly as if the patch had been
   made from the GDX UI.

   Each fault carries a patchTarget { fn, idx, action, effect }.
   `effect` names the binaryPatches flag(s) the patch sets.
   ============================================================ */
(function() {

    function ensureStore() {
        if (!window.STATE) window.STATE = {};
        if (!window.STATE.binaryPatches) window.STATE.binaryPatches = {};
        if (!window.STATE.binaryPatches.effects) window.STATE.binaryPatches.effects = {};
        return window.STATE.binaryPatches;
    }

    function applyFaultPatch(fault, action) {
        if (!fault || !fault.patchTarget) return false;
        var t = fault.patchTarget;
        var store = ensureStore();
        var key = t.fn + ':' + t.idx;
        store.effects[key] = {
            type: action,
            installedBy: 'drwatson',
            when: Date.now()
        };
        var flag = t.effect || 'bypassCurriculum';
        if (action === 'invert') {
            store[flag] = true;
        } else if (action === 'nop') {
            store[flag === 'bypassCurriculum' ? 'curriculumNonBlocking' : flag] = true;
        } else if (action === 'edit') {
            store[flag] = true;
        }
        // Write a System log entry so the patch is auditable in Event
        // Viewer. eventID 1023 is Microsoft's "Application failed to
        // initialize", apt for a postmortem-debugger writing patches.
        if (window.SRV2K3_EVENTLOG) {
            window.SRV2K3_EVENTLOG.write({
                log: 'System',
                source: 'Dr. Watson',
                type: 'Warning',
                eventID: 1023,
                message: 'Patch postmortem aplicat: funcția „' + t.fn + '" la offset ' + t.idx +
                    ' (acțiune: ' + action + ', flag: ' + flag + ').'
            });
        }
        return true;
    }

    function revertFaultPatch(fault) {
        if (!fault || !fault.patchTarget) return false;
        var t = fault.patchTarget;
        var store = ensureStore();
        var key = t.fn + ':' + t.idx;
        if (store.effects[key]) delete store.effects[key];
        var flag = t.effect || 'bypassCurriculum';
        delete store[flag];
        delete store[flag === 'bypassCurriculum' ? 'curriculumNonBlocking' : flag];
        if (window.SRV2K3_EVENTLOG) {
            window.SRV2K3_EVENTLOG.write({
                log: 'System',
                source: 'Dr. Watson',
                type: 'Information',
                eventID: 1024,
                message: 'Patch postmortem retras: funcția „' + t.fn + '" la offset ' + t.idx + '.'
            });
        }
        return true;
    }

    function isPatched(fault) {
        if (!fault || !fault.patchTarget || !window.STATE) return false;
        var p = window.STATE.binaryPatches || {};
        var key = fault.patchTarget.fn + ':' + fault.patchTarget.idx;
        return !!(p.effects && p.effects[key]);
    }

    window.DrWatsonPatch = {
        apply:     applyFaultPatch,
        revert:    revertFaultPatch,
        isPatched: isPatched
    };
})();
