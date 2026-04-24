/* ============================================================
   Virtual .text segment + stack memory (QNX process simulation)
   ============================================================ */
var DbgVm = {
    vaToLoc: null,
    sortedFns: null,
    _mem: Object.create(null)
};

function dbgVmByteLen(instr) {
    if (!instr || !instr.bytes) return 0;
    return instr.bytes.trim().split(/\s+/).length;
}

function dbgMemKey(va) {
    var lo = (va >>> 0).toString(16);
    var hi = Math.floor((va / 0x100000000) >>> 0).toString(16);
    return ('00000000' + hi).slice(-8) + ('00000000' + lo).slice(-8);
}

function dbgMemRead64(va) {
    var k = dbgMemKey(va);
    if (Object.prototype.hasOwnProperty.call(DbgVm._mem, k)) return DbgVm._mem[k];
    return 0;
}

function dbgMemWrite64(va, val) {
    DbgVm._mem[dbgMemKey(va)] = Number(val) || 0;
}

function dbgMemClear() {
    DbgVm._mem = Object.create(null);
}

function dbgFirstExecIdx(fn) {
    if (!fn || !fn.instructions) return 0;
    for (var i = 0; i < fn.instructions.length; i++) {
        if (!fn.instructions[i].label) return i;
    }
    return 0;
}

function dbgLocToVa(fnName, idx) {
    var fn = typeof DISASM !== 'undefined' ? DISASM[fnName] : null;
    if (!fn) return 0;
    var off = 0;
    for (var i = 0; i < idx && i < fn.instructions.length; i++) {
        off += dbgVmByteLen(fn.instructions[i]);
    }
    return (fn.addr + off) >>> 0;
}

function dbgVaToLoc(va) {
    if (!DbgVm.vaToLoc) return null;
    var k = dbgMemKey(va);
    var loc = DbgVm.vaToLoc[k];
    if (loc) return loc;
    var lo = va >>> 0;
    var k2 = dbgMemKey(lo);
    return DbgVm.vaToLoc[k2] || null;
}

function dbgVmBuildImage(disasm) {
    DbgVm.sortedFns = Object.keys(disasm).filter(function(n) {
        return disasm[n] && typeof disasm[n].addr === 'number';
    }).sort(function(a, b) { return disasm[a].addr - disasm[b].addr; });
    DbgVm.vaToLoc = Object.create(null);
    for (var si = 0; si < DbgVm.sortedFns.length; si++) {
        var fnName = DbgVm.sortedFns[si];
        var fn = disasm[fnName];
        var off = 0;
        for (var i = 0; i < fn.instructions.length; i++) {
            var va = (fn.addr + off) >>> 0;
            var key = dbgMemKey(va);
            DbgVm.vaToLoc[key] = { fn: fnName, idx: i };
            off += dbgVmByteLen(fn.instructions[i]);
        }
    }
}

function dbgParseRbpMem(op) {
    if (!op) return null;
    var s = op.trim().replace(/\s/g, '').toLowerCase();
    var m = /^\[rbp([+-])(0x[0-9a-f]+)\]$/i.exec(s);
    if (!m) return null;
    var disp = parseInt(m[2], 16) * (m[1] === '-' ? -1 : 1);
    return disp;
}

function dbgSyncRipFromCpu() {
    var loc = dbgVaToLoc(CPU.rip);
    if (loc) {
        STATE.activeFn = loc.fn;
        STATE.rip = loc.idx;
    }
}
