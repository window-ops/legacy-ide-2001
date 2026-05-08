/* ============================================================
   DbgBackend, facade (simulated QNX procnto + legacy-ide.so attach)
   ============================================================ */
var DbgBackend = {
    _attached: false,
    attach: function() {
        if (this._attached) return;
        this._attached = true;
        if (typeof dbgVmBuildImage === 'function' && typeof DISASM !== 'undefined') dbgVmBuildImage(DISASM);
        if (typeof dbgLog === 'function') {
            dbgLog('info', 'procnto: attach la proces <code>legacy-ide.so</code> (PID 2001), thread 1.');
            dbgLog('info', 'qnx: mapare .text + stivă utilizator; sursa este modelată local în VM.');
        }
    },
    getRegisters: function() {
        return typeof CPU !== 'undefined' ? CPU : null;
    },
    readMem: function(va, len) {
        len = len || 8;
        var out = [];
        for (var i = 0; i < len; i += 8) {
            out.push(dbgMemRead64((va + i) >>> 0));
        }
        return out;
    },
    step: function() {
        if (typeof dbgStep === 'function') dbgStep();
    },
    continueUntil: function(maxSteps) {
        maxSteps = maxSteps || 60;
        for (var i = 0; i < maxSteps; i++) {
            if (typeof dbgStep === 'function') dbgStep();
        }
    }
};
