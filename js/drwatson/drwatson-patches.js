/* ============================================================
   DR. WATSON: PATCH PANEL
   Real Dr. Watson is a postmortem debugger: it cannot modify a
   running program. This module extends that with a "Patch" tab on
   each fault that lets the user apply / revert binary patches at
   the fault site, hooking into the same applyPatch() global the
   GDX Debugger uses.

   Each fault carries a patchTarget { fn, idx, action } that names
   the function and instruction the access-violation was raised on.
   The user picks NOP, INVERT, or EDIT and Dr. Watson applies the
   change; STATE.binaryPatches is updated identically to what the
   GDX Debugger writes, so Verifică and Execută afterwards behave
   exactly as if the patch had been made from the GDX UI.
   ============================================================ */
(function() {

    function applyFaultPatch(fault, action) {
        if (!fault || !fault.patchTarget) return false;
        if (typeof window.applyPatch !== 'function') return false;
        var t = fault.patchTarget;
        try {
            if (action === 'nop') {
                window.applyPatch(t.fn, t.idx, { type: 'nop' });
            } else if (action === 'invert') {
                window.applyPatch(t.fn, t.idx, { type: 'invert' });
            } else if (action === 'edit') {
                // Default mov-eax-0 patch: clears the EAX register so the
                // following compare always succeeds. Same effect the user
                // would get by typing this into the ASM editor in GDX.
                window.applyPatch(t.fn, t.idx, {
                    type: 'edit',
                    newMnem: 'mov',
                    newOps:  'eax, 0x0',
                    newBytes: 'B8 00 00 00 00'
                });
            } else {
                return false;
            }
        } catch (e) {
            return false;
        }
        return true;
    }

    function revertFaultPatch(fault) {
        if (!fault || !fault.patchTarget) return false;
        if (typeof window.applyPatch !== 'function') return false;
        var t = fault.patchTarget;
        try {
            // The GDX Debugger uses { type: 'revert' } to undo. Same
            // type code is recognized by the same applyPatch global.
            window.applyPatch(t.fn, t.idx, { type: 'revert' });
        } catch (e) {
            return false;
        }
        return true;
    }

    function isPatched(fault) {
        if (!fault || !fault.patchTarget || !window.STATE) return false;
        var p = window.STATE.binaryPatches || {};
        var key = fault.patchTarget.fn + ':' + fault.patchTarget.idx;
        // The GDX Debugger writes a per-call-site map under .effects.
        // We check that map; if the entry exists and is truthy, the
        // patch is in effect.
        return !!(p.effects && p.effects[key]);
    }

    window.DrWatsonPatch = {
        apply:  applyFaultPatch,
        revert: revertFaultPatch,
        isPatched: isPatched
    };
})();
