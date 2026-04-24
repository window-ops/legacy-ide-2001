/* ============================================================
   DEBUGGER — disassembly + patches + step simulator
   ============================================================ */
var CPU = {
    rax: 0, rbx: 0x7ffeeaab0040, rcx: 0, rdx: 1,
    rsi: 0x403020, rdi: 0x7ffeeaab0090,
    rbp: 0x7ffeeaab0000, rsp: 0x7ffeeaab0000,
    r8: 0, r9: 0, r10: 0, r11: 0x246,
    r12: 0x401040, r13: 0x7ffeeaab01a0, r14: 0, r15: 0,
    rip: 0x401180,
    flags: { ZF: 0, CF: 0, SF: 0, OF: 0, PF: 1, DF: 0, IF: 1 }
};
var CPU_CHANGED = {};

var CPU_INITIAL = {
    rax: 0, rbx: 0x7ffeeaab0040, rcx: 0, rdx: 1,
    rsi: 0x403020, rdi: 0x7ffeeaab0090,
    rbp: 0x7ffeeaab0000, rsp: 0x7ffeeaab0000,
    r8: 0, r9: 0, r10: 0, r11: 0x246,
    r12: 0x401040, r13: 0x7ffeeaab01a0, r14: 0, r15: 0,
    rip: 0x401180,
    flags: { ZF: 0, CF: 0, SF: 0, OF: 0, PF: 1, DF: 0, IF: 1 }
};
function dbgResetCpuRegs() {
    for (var k in CPU_INITIAL) {
        if (k === 'flags') {
            for (var f in CPU_INITIAL.flags) CPU.flags[f] = CPU_INITIAL.flags[f];
        } else {
            CPU[k] = CPU_INITIAL[k];
        }
    }
}

var DISASM = {
    __halt: {
        addr: 0x401050,
        desc: 'Synthetic halt',
        stub: true,
        instructions: [
            { bytes: '90', mnem: 'nop', ops: '' }
        ]
    },
    scan_rules: {
        addr: 0x401060,
        desc: 'scan_rules (stub)',
        stub: true,
        instructions: [
            { bytes: '48 C7 C0 01 00 00 00', mnem: 'mov', ops: 'rax, 0x1' },
            { bytes: 'C3', mnem: 'ret', ops: '' }
        ]
    },
    detect_os: {
        addr: 0x401070,
        desc: 'detect_os (stub)',
        stub: true,
        instructions: [
            { bytes: '48 C7 C0 01 00 00 00', mnem: 'mov', ops: 'rax, 0x1' },
            { bytes: 'C3', mnem: 'ret', ops: '' }
        ]
    },
    hide_banner: {
        addr: 0x401080,
        desc: 'hide_banner (stub)',
        stub: true,
        instructions: [
            { bytes: 'C3', mnem: 'ret', ops: '' }
        ]
    },
    show_banner: {
        addr: 0x401090,
        desc: 'show_banner (stub)',
        stub: true,
        instructions: [
            { bytes: 'C3', mnem: 'ret', ops: '' }
        ]
    },
    list_hits: {
        addr: 0x4010A0,
        desc: 'list_hits (stub)',
        stub: true,
        instructions: [
            { bytes: 'C3', mnem: 'ret', ops: '' }
        ]
    },
    'fputs@PLT': {
        addr: 0x4010B0,
        desc: 'fputs@PLT (stub)',
        stub: true,
        instructions: [
            { bytes: 'C3', mnem: 'ret', ops: '' }
        ]
    },
    'printf@PLT': {
        addr: 0x4010C0,
        desc: 'printf@PLT (stub)',
        stub: true,
        instructions: [
            { bytes: 'C3', mnem: 'ret', ops: '' }
        ]
    },
    check_curriculum: {
        addr: 0x401180,
        desc: 'Verifica conformitatea cu programa 2001',
        instructions: [
            { bytes: '55', mnem: 'push', ops: 'rbp' },
            { bytes: '48 89 E5', mnem: 'mov', ops: 'rbp, rsp' },
            { bytes: '48 83 EC 30', mnem: 'sub', ops: 'rsp, 0x30' },
            { bytes: '48 89 7D F8', mnem: 'mov', ops: '[rbp-0x08], rdi', comment: 'code ptr' },
            { bytes: '48 89 75 F0', mnem: 'mov', ops: '[rbp-0x10], rsi', comment: 'ruleset ptr' },
            { bytes: 'E8 5B FF FF FF', mnem: 'call', ops: 'scan_rules', comment: 'rax = hits' },
            { bytes: '48 89 45 E8', mnem: 'mov', ops: '[rbp-0x18], rax' },
            { bytes: '48 85 C0', mnem: 'test', ops: 'rax, rax', id: 'cc_test' },
            { bytes: '0F 84 19 00 00 00', mnem: 'jz', ops: '.clean', id: 'cc_jz', isBranch: true, comment: 'skip if zero hits' },
            { bytes: '48 89 C7', mnem: 'mov', ops: 'rdi, rax' },
            { bytes: '48 8B 75 F8', mnem: 'mov', ops: 'rsi, [rbp-0x08]' },
            { bytes: 'E8 29 01 00 00', mnem: 'call', ops: 'emit_traceback' },
            { bytes: 'B8 01 00 00 00', mnem: 'mov', ops: 'eax, 0x1', id: 'cc_fail_ret', comment: 'return 1 = fail' },
            { bytes: 'C9', mnem: 'leave', ops: '' },
            { bytes: 'C3', mnem: 'ret', ops: '' },
            { label: '.clean:' },
            { bytes: '48 31 C0', mnem: 'xor', ops: 'rax, rax', comment: 'return 0 = success' },
            { bytes: 'C9', mnem: 'leave', ops: '' },
            { bytes: 'C3', mnem: 'ret', ops: '' }
        ]
    },
    verify_os: {
        addr: 0x401240,
        desc: 'Detecteaza SO si decide afisarea bannerului',
        instructions: [
            { bytes: '55', mnem: 'push', ops: 'rbp' },
            { bytes: '48 89 E5', mnem: 'mov', ops: 'rbp, rsp' },
            { bytes: 'E8 8E 00 00 00', mnem: 'call', ops: 'detect_os', comment: 'rax = OS id' },
            { bytes: '48 83 F8 01', mnem: 'cmp', ops: 'rax, 0x1', id: 'vo_cmp', comment: '0x1 = Windows' },
            { bytes: '0F 85 0E 00 00 00', mnem: 'jne', ops: '.show_banner', id: 'vo_jne', isBranch: true },
            { bytes: 'E8 A2 00 00 00', mnem: 'call', ops: 'hide_banner' },
            { bytes: 'EB 05', mnem: 'jmp', ops: '.done' },
            { label: '.show_banner:' },
            { bytes: 'E8 86 00 00 00', mnem: 'call', ops: 'show_banner', id: 'vo_call_banner' },
            { label: '.done:' },
            { bytes: '5D', mnem: 'pop', ops: 'rbp' },
            { bytes: 'C3', mnem: 'ret', ops: '' }
        ]
    },
    emit_traceback: {
        addr: 0x4012C0,
        desc: 'Construieste mesajul de eroare curriculara',
        instructions: [
            { bytes: '55', mnem: 'push', ops: 'rbp' },
            { bytes: '48 89 E5', mnem: 'mov', ops: 'rbp, rsp' },
            { bytes: '48 83 EC 20', mnem: 'sub', ops: 'rsp, 0x20' },
            { bytes: '48 89 7D F8', mnem: 'mov', ops: '[rbp-0x08], rdi', comment: 'hit count' },
            { bytes: '48 89 75 F0', mnem: 'mov', ops: '[rbp-0x10], rsi', comment: 'file name' },
            { bytes: '48 8D 3D 2F 0E 00 00', mnem: 'lea', ops: 'rdi, [rip+0xE2F]', comment: '"EROARE CURRICULARA"' },
            { bytes: 'E8 BC FE FF FF', mnem: 'call', ops: 'fputs@PLT', id: 'et_call_fputs' },
            { bytes: '48 8B 75 F0', mnem: 'mov', ops: 'rsi, [rbp-0x10]' },
            { bytes: '48 8D 3D 4B 0E 00 00', mnem: 'lea', ops: 'rdi, [rip+0xE4B]', comment: '"Fisier: %s"' },
            { bytes: 'B8 00 00 00 00', mnem: 'mov', ops: 'eax, 0x0' },
            { bytes: 'E8 A8 FE FF FF', mnem: 'call', ops: 'printf@PLT' },
            { bytes: '48 8B 7D F8', mnem: 'mov', ops: 'rdi, [rbp-0x08]' },
            { bytes: 'E8 30 01 00 00', mnem: 'call', ops: 'list_hits' },
            { bytes: '48 8D 3D 90 0E 00 00', mnem: 'lea', ops: 'rdi, [rip+0xE90]', comment: '"EXECUTIE OPRITA"' },
            { bytes: 'E8 A1 FE FF FF', mnem: 'call', ops: 'fputs@PLT' },
            { bytes: 'C9', mnem: 'leave', ops: '' },
            { bytes: 'C3', mnem: 'ret', ops: '' }
        ]
    }
};

var KNOWN_MNEMS = ['mov','push','pop','xor','and','or','add','sub','inc','dec','test','cmp','jmp','je','jz','jne','jnz','jg','jl','jge','jle','ja','jb','jae','jbe','call','ret','leave','lea','nop'];
var KNOWN_REGS = ['rax','rbx','rcx','rdx','rsi','rdi','rbp','rsp','r8','r9','r10','r11','r12','r13','r14','r15','eax','ebx','ecx','edx','esi','edi','ebp','esp','rip'];

function hex64(n) {
    var lo = (n >>> 0).toString(16);
    var hi = Math.floor(n / 0x100000000) >>> 0;
    var hiStr = hi.toString(16);
    return ('0000000000000000' + hiStr + lo).slice(-16);
}
function hexAddr(n) { return '0x' + hex64(n); }
function byteLen(instr) { return dbgVmByteLen(instr); }

function getDisplayedInstr(fnName, idx) {
    var instr = DISASM[fnName].instructions[idx];
    var patch = STATE.patches[fnName + ':' + idx];
    if (!patch) return instr;
    if (patch.type === 'nop') {
        var n = byteLen(instr);
        var bytes = [];
        for (var i = 0; i < n; i++) bytes.push('90');
        return { bytes: bytes.join(' '), mnem: 'nop', ops: '', patchOrig: instr };
    }
    if (patch.type === 'invert') {
        var flip = { je: 'jne', jne: 'je', jz: 'jnz', jnz: 'jz', jg: 'jle', jle: 'jg', jl: 'jge', jge: 'jl', ja: 'jbe', jbe: 'ja', jb: 'jae', jae: 'jb' };
        var newMnem = flip[instr.mnem] || instr.mnem;
        var newBytes = instr.bytes;
        if (/^0F 84/i.test(newBytes)) newBytes = newBytes.replace(/^0F 84/i, '0F 85');
        else if (/^0F 85/i.test(newBytes)) newBytes = newBytes.replace(/^0F 85/i, '0F 84');
        else if (/^74/i.test(newBytes)) newBytes = newBytes.replace(/^74/i, '75');
        else if (/^75/i.test(newBytes)) newBytes = newBytes.replace(/^75/i, '74');
        return { bytes: newBytes, mnem: newMnem, ops: instr.ops, isBranch: true, patchOrig: instr };
    }
    if (patch.type === 'edit') return { bytes: patch.newBytes, mnem: patch.newMnem, ops: patch.newOps, patchOrig: instr };
    return instr;
}

function parseInstruction(line) {
    line = line.trim().replace(/\s*;.*$/, '');
    if (!line) return { error: 'Instrucțiune goală.' };
    var m = /^([a-zA-Z][a-zA-Z0-9]*)\s*(.*)$/.exec(line);
    if (!m) return { error: 'Format invalid.' };
    var mnem = m[1].toLowerCase();
    var ops = m[2].trim();
    if (KNOWN_MNEMS.indexOf(mnem) === -1) return { error: 'Mnemonic necunoscut: ' + mnem + ' (#UD: Invalid Opcode).' };
    var nOps = ops === '' ? 0 : ops.split(',').length;
    var expected = { ret:0, leave:0, nop:0, push:1, pop:1, call:1, jmp:1, inc:1, dec:1, je:1, jz:1, jne:1, jnz:1, jg:1, jl:1, jge:1, jle:1, ja:1, jb:1, jae:1, jbe:1, mov:2, xor:2, and:2, or:2, add:2, sub:2, test:2, cmp:2, lea:2 };
    if (nOps !== expected[mnem]) return { error: 'Număr greșit de operanzi pentru ' + mnem + ' (așteptat: ' + expected[mnem] + ', primit: ' + nOps + ').' };
    return { mnem: mnem, ops: ops, operands: ops === '' ? [] : ops.split(',').map(function(s){ return s.trim(); }) };
}

function isReg64(s) { return KNOWN_REGS.indexOf(s) !== -1; }
function randomRel32() { var out = []; for (var i = 0; i < 4; i++) out.push(('0' + Math.floor(Math.random() * 256).toString(16).toUpperCase()).slice(-2)); return out.join(' '); }
function padImm8(imm) { var n = parseInt(imm, 16) & 0xff; return ('0' + n.toString(16).toUpperCase()).slice(-2); }
function mockModrm(dst, src) {
    var tbl = { rax:0, rcx:1, rdx:2, rbx:3, rsp:4, rbp:5, rsi:6, rdi:7 };
    var a = tbl[dst] || 0, b = tbl[src] || 0;
    return ('0' + (0xc0 | (b << 3) | a).toString(16).toUpperCase()).slice(-2);
}
function mockModrmImm(dst, mnem) {
    var subop = { cmp:7, add:0, sub:5, and:4, or:1, xor:6 }[mnem] || 0;
    var tbl = { rax:0, rcx:1, rdx:2, rbx:3, rsp:4, rbp:5, rsi:6, rdi:7 };
    return ('0' + (0xc0 | (subop << 3) | (tbl[dst] || 0)).toString(16).toUpperCase()).slice(-2);
}
function pushPopOpcode(reg, base) {
    var order = ['rax','rcx','rdx','rbx','rsp','rbp','rsi','rdi'];
    var ext = ['r8','r9','r10','r11','r12','r13','r14','r15'];
    var i = order.indexOf(reg);
    if (i !== -1) return ('0' + (base + i).toString(16).toUpperCase()).slice(-2);
    var j = ext.indexOf(reg);
    if (j !== -1) return '41 ' + ('0' + (base + j).toString(16).toUpperCase()).slice(-2);
    return '55';
}
function assembleBytes(parsed, targetLen) {
    var m = parsed.mnem;
    var simpleMap = { ret: 'C3', leave: 'C9', nop: '90' };
    if (simpleMap[m]) return simpleMap[m];
    var condJump32 = { je:'0F 84', jz:'0F 84', jne:'0F 85', jnz:'0F 85', jg:'0F 8F', jl:'0F 8C', jge:'0F 8D', jle:'0F 8E', ja:'0F 87', jb:'0F 82', jae:'0F 83', jbe:'0F 86' };
    if (condJump32[m]) return (condJump32[m] + ' ' + randomRel32()).trim();
    if (m === 'jmp') return 'E9 ' + randomRel32();
    if (m === 'call') return 'E8 ' + randomRel32();
    if (m === 'mov' || m === 'xor' || m === 'and' || m === 'or' || m === 'add' || m === 'sub' || m === 'test' || m === 'cmp' || m === 'lea') {
        var dst = (parsed.operands[0] || '').toLowerCase();
        var src = (parsed.operands[1] || '').toLowerCase();
        if (isReg64(dst) && isReg64(src)) {
            var op = { mov:'89', add:'01', sub:'29', xor:'31', and:'21', or:'09', test:'85', cmp:'39' }[m] || '89';
            return '48 ' + op + ' ' + mockModrm(dst, src);
        }
        if (isReg64(dst) && /^0x[0-9a-f]+$/i.test(src)) {
            if (m === 'mov') return 'B8 ' + randomRel32();
            return '48 83 ' + mockModrmImm(dst, m) + ' ' + padImm8(src);
        }
        if (/^\[/.test(dst) || /^\[/.test(src)) return '48 ' + (m === 'mov' ? '8B' : '39') + ' 45 F8';
    }
    if (m === 'push') { var r = (parsed.operands[0] || '').toLowerCase(); if (isReg64(r)) return pushPopOpcode(r, 0x50); }
    if (m === 'pop')  { var r2 = (parsed.operands[0] || '').toLowerCase(); if (isReg64(r2)) return pushPopOpcode(r2, 0x58); }
    if (m === 'inc' || m === 'dec') return '48 FF ' + (m === 'inc' ? 'C0' : 'C8');
    var b = [];
    for (var i = 0; i < Math.max(1, targetLen || 1); i++) b.push('90');
    return b.join(' ');
}

function renderAsmOps(opsStr) {
    if (!opsStr) return '';
    return opsStr.split(',').map(function(p) {
        var op = p.trim();
        if (/^\[.+\]$/.test(op)) return '<span class="asm-mem">' + escapeHtml(op) + '</span>';
        if (/^0x[0-9a-fA-F]+$/.test(op)) return '<span class="asm-imm">' + escapeHtml(op) + '</span>';
        if (/^\./.test(op)) return '<span class="asm-label-ref">' + escapeHtml(op) + '</span>';
        var lower = op.toLowerCase();
        if (KNOWN_REGS.indexOf(lower) !== -1 || /^r\d+$/i.test(lower)) return '<span class="asm-reg">' + escapeHtml(op) + '</span>';
        if (/^[a-zA-Z_][\w@]*$/.test(op)) return '<span class="asm-label-ref">' + escapeHtml(op) + '</span>';
        return escapeHtml(op);
    }).join('<span class="asm-punct">, </span>');
}
function mnemClass(m) {
    if (/^j/.test(m)) return 'jump';
    if (m === 'call') return 'call';
    if (m === 'ret' || m === 'leave') return 'ret';
    return '';
}

function openDebugger() {
    STATE.dbgOpen = true;
    $('debugger').classList.add('open');
    if (typeof window.__normalizeDebuggerLayout === 'function') window.__normalizeDebuggerLayout();
    if (typeof DbgBackend !== 'undefined' && DbgBackend.attach) DbgBackend.attach();
    dbgResetRip();
    renderFuncList();
    renderDisassembly();
    renderRegisters();
    renderStack();
    if (!STATE._dbgLogSeeded) {
        STATE._dbgLogSeeded = true;
        dbgLog('info', 'GDX debugger v0.91 &middot; target attached (PID 2001).');
        dbgLog('info', 'Simboluri încărcate din legacy-ide.so.debug.');
        dbgLog('info', 'Apăsați F10 pentru single-step sau hoverați o instrucțiune pentru acțiuni de patching.');
    }
}
function closeDebugger() {
    STATE.dbgOpen = false;
    closeDebuggerDocs();
    $('debugger').classList.remove('open');
}

function renderFuncList() {
    var el = $('dbgFuncList');
    el.innerHTML = '';
    Object.keys(DISASM).forEach(function(name) {
        var fn = DISASM[name];
        if (fn.stub) return;
        var row = document.createElement('div');
        row.className = 'dbg-func-item' + (name === STATE.activeFn ? ' active' : '');
        if (fnHasPatches(name)) row.classList.add('patched');
        row.setAttribute('data-fn', name);
        row.innerHTML = '<span>' + escapeHtml(name) + '</span><span class="fn-addr">' + hexAddr(fn.addr) + '</span>';
        row.title = fn.desc;
        row.addEventListener('click', onFuncRowClick);
        el.appendChild(row);
    });
}
function onFuncRowClick() {
    var clickedName = this.getAttribute('data-fn');
    if (!clickedName || !DISASM[clickedName] || clickedName === STATE.activeFn) return;
    STATE.activeFn = clickedName;
    dbgResetRip();
    setTimeout(function() {
        renderFuncList();
        renderDisassembly();
        renderRegisters();
        renderStack();
    }, 0);
}
function fnHasPatches(name) {
    return Object.keys(STATE.patches).some(function(k) { return k.indexOf(name + ':') === 0; });
}

function renderDisassembly() {
    var fn = DISASM[STATE.activeFn];
    $('dbgDisasmTitle').innerHTML = '<b>' + escapeHtml(STATE.activeFn) + '</b> @ ' + hexAddr(fn.addr) + '  <span style="font-weight:400; color:#5a6b7b;">&middot; ' + escapeHtml(fn.desc) + '</span>';
    var el = $('dbgDisasm');
    el.innerHTML = '';
    var addr = fn.addr;
    fn.instructions.forEach(function(raw, idx) {
        if (raw.label) {
            var lbl = document.createElement('div');
            lbl.className = 'disasm-line label';
            lbl.textContent = raw.label;
            el.appendChild(lbl);
            return;
        }
        var instr = getDisplayedInstr(STATE.activeFn, idx);
        var patch = STATE.patches[STATE.activeFn + ':' + idx];
        var line = document.createElement('div');
        line.className = 'disasm-line' + (patch ? ' patched' : '') + (idx === STATE.rip ? ' rip' : '');

        var marker = '<span class="disasm-rip-marker"></span>';
        var addrStr = '<span class="disasm-addr">' + hexAddr(addr) + '</span>';
        var bytesStr = '<span class="disasm-bytes' + (instr.mnem === 'nop' && patch ? ' nop' : '') + '">' + escapeHtml(instr.bytes || '') + '</span>';
        var mnemHtml = '<span class="asm-mnem ' + mnemClass(instr.mnem) + '">' + escapeHtml(instr.mnem) + '</span>';
        var opsHtml = renderAsmOps(instr.ops || '');
        var commentHtml = instr.comment ? '<span class="asm-comment">  ; ' + escapeHtml(instr.comment) + '</span>' : '';

        var asmCell;
        if (patch && patch.type === 'invert') {
            asmCell = '<span class="asm-cell"><span class="asm-strike">' + escapeHtml(raw.mnem) + '</span> <span class="asm-new">&rarr; ' + escapeHtml(instr.mnem) + ' ' + escapeHtml(instr.ops) + '</span></span>';
        } else if (patch && patch.type === 'nop') {
            asmCell = '<span class="asm-cell"><span class="asm-mnem" style="color:#e5821a;">nop</span> <span class="asm-comment">; was ' + escapeHtml(raw.mnem + ' ' + (raw.ops || '')) + '</span></span>';
        } else if (patch && patch.type === 'edit') {
            asmCell = '<span class="asm-cell">' + mnemHtml + ' ' + opsHtml + '<span class="asm-comment">  ; was ' + escapeHtml(raw.mnem + ' ' + (raw.ops || '')) + '</span></span>';
        } else {
            asmCell = '<span class="asm-cell">' + mnemHtml + (instr.ops ? ' ' : '') + opsHtml + commentHtml + '</span>';
        }

        var actions = '<span class="disasm-actions">';
        if (patch) {
            actions += '<button class="disasm-action-btn revert" data-act="revert">Revocă</button>';
            actions += '<button class="disasm-action-btn" data-act="edit">Edit</button>';
        } else {
            actions += '<button class="disasm-action-btn" data-act="nop">NOP</button>';
            if (raw.isBranch) actions += '<button class="disasm-action-btn" data-act="invert">Invert</button>';
            actions += '<button class="disasm-action-btn" data-act="edit">Edit</button>';
        }
        actions += '</span>';

        line.innerHTML = marker + addrStr + bytesStr + asmCell + actions;
        line.querySelectorAll('.disasm-action-btn').forEach(function(b) {
            b.addEventListener('click', function(ev) {
                ev.stopPropagation();
                var act = b.getAttribute('data-act');
                if (act === 'nop') applyPatch(STATE.activeFn, idx, { type: 'nop' });
                else if (act === 'invert') applyPatch(STATE.activeFn, idx, { type: 'invert' });
                else if (act === 'revert') revertPatch(STATE.activeFn, idx);
                else if (act === 'edit') openAsmEditInline(STATE.activeFn, idx);
            });
        });
        line.addEventListener('click', function() {
            STATE.rip = idx;
            CPU.rip = dbgLocToVa(STATE.activeFn, STATE.rip);
            renderDisassembly();
            renderRegisters();
            renderStack();
        });

        el.appendChild(line);
        addr += byteLen(raw);
    });
}

function renderRegisters() {
    var el = $('dbgRegs');
    el.innerHTML = '';
    var regs = ['rax','rbx','rcx','rdx','rsi','rdi','rbp','rsp','r8','r9','r10','r11','r12','r13','r14','r15','rip'];
    regs.forEach(function(r) {
        var row = document.createElement('div');
        row.className = 'reg-row' + (CPU_CHANGED[r] ? ' changed' : '');
        var v = CPU[r];
        row.innerHTML = '<span class="reg-name">' + r.toUpperCase() + '</span><span class="reg-val' + (v === 0 ? ' zero' : '') + '">0x' + hex64(v) + '</span>';
        el.appendChild(row);
    });
    var flagDiv = document.createElement('div');
    flagDiv.className = 'reg-flags';
    ['ZF','CF','SF','OF','PF','DF','IF'].forEach(function(f) {
        flagDiv.innerHTML += '<span class="flag-bit' + (CPU.flags[f] ? ' set' : '') + '">' + f + '=' + CPU.flags[f] + '</span>';
    });
    el.appendChild(flagDiv);
    CPU_CHANGED = {};
}

function renderStack() {
    var el = $('dbgStack');
    el.innerHTML = '';
    var base = CPU.rsp;
    for (var i = -1; i < 8; i++) {
        var addr = base + i * 8;
        var val = Math.floor(Math.random() * 0x100000000);
        if (i === 0) val = 0x7ffeeaab01a0;
        if (i === 1) val = 0x401a20;
        var row = document.createElement('div');
        row.className = 'stack-row' + (addr === CPU.rsp ? ' rsp' : '') + (addr === CPU.rbp ? ' rbp' : '');
        var note = addr === CPU.rsp ? '<span class="s-note">← RSP</span>' : (addr === CPU.rbp ? '<span class="s-note">← RBP</span>' : '');
        row.innerHTML = '<span class="s-addr">0x' + hex64(addr) + '</span><span class="s-val">0x' + hex64(val) + '</span>' + note;
        el.appendChild(row);
    }
}

function dbgLog(kind, msg) {
    var log = $('dbgLog');
    var now = new Date();
    var ts = ('0' + now.getHours()).slice(-2) + ':' + ('0' + now.getMinutes()).slice(-2) + ':' + ('0' + now.getSeconds()).slice(-2);
    var entry = document.createElement('div');
    entry.className = 'log-entry ' + (kind || 'info');
    entry.innerHTML = '<span class="ts">[' + ts + ']</span> ' + msg;
    log.appendChild(entry);
    log.scrollTop = log.scrollHeight;
}

function dbgResetRip() {
    dbgMemClear();
    dbgVmBuildImage(DISASM);
    dbgResetCpuRegs();
    var fnName = STATE.activeFn || 'check_curriculum';
    if (!DISASM[fnName]) fnName = 'check_curriculum';
    STATE.activeFn = fnName;
    var fn = DISASM[fnName];
    STATE.rip = dbgFirstExecIdx(fn);
    CPU.rsp = 0x7ffeeaab1000;
    CPU.rbp = 0x7ffeeaab1100;
    dbgMemWrite64(CPU.rsp, dbgLocToVa('__halt', dbgFirstExecIdx(DISASM.__halt)));
    CPU.rip = dbgLocToVa(STATE.activeFn, STATE.rip);
}

var DBG_REG32_TO_64 = { eax: 'rax', ebx: 'rbx', ecx: 'rcx', edx: 'rdx', esi: 'rsi', edi: 'rdi', ebp: 'rbp', esp: 'rsp' };

function dbgStep() {
    var fn = DISASM[STATE.activeFn];
    if (!fn || STATE.rip >= fn.instructions.length) { dbgLog('info', 'Sfârșitul listării. Apăsați Reset RIP.'); return; }
    var old = {}; for (var k in CPU) if (k !== 'flags') old[k] = CPU[k];
    var idx = STATE.rip;
    var instr = getDisplayedInstr(STATE.activeFn, idx);
    var raw = fn.instructions[idx];
    if (raw.label) { STATE.rip++; return dbgStep(); }
    var m = instr.mnem;
    var advanced = false;
    if (m === 'push') {
        var pu = (instr.ops || '').trim().toLowerCase();
        CPU.rsp -= 8;
        dbgMemWrite64(CPU.rsp, CPU.hasOwnProperty(pu) ? CPU[pu] : 0);
    } else if (m === 'pop') {
        var po = (instr.ops || '').trim().toLowerCase();
        var popv = dbgMemRead64(CPU.rsp);
        CPU.rsp += 8;
        if (CPU.hasOwnProperty(po)) CPU[po] = popv;
    } else if (m === 'mov') {
        var p = (instr.ops || '').split(',').map(function(s){ return s.trim().toLowerCase(); });
        var dst = p[0];
        var src = p[1];
        var dMem = dbgParseRbpMem(dst);
        var sMem = dbgParseRbpMem(src);
        if (dMem !== null && src !== undefined) {
            var mval = 0;
            if (CPU.hasOwnProperty(src)) mval = CPU[src];
            else if (/^0x/.test(src)) mval = parseInt(src, 16);
            dbgMemWrite64((CPU.rbp + dMem) >>> 0, mval);
        } else if (sMem !== null && dst !== undefined) {
            var dst64m = DBG_REG32_TO_64.hasOwnProperty(dst) ? DBG_REG32_TO_64[dst] : (CPU.hasOwnProperty(dst) ? dst : null);
            var use32m = DBG_REG32_TO_64.hasOwnProperty(dst);
            var mv = dbgMemRead64((CPU.rbp + sMem) >>> 0);
            if (dst64m) CPU[dst64m] = use32m ? (mv >>> 0) : mv;
        } else {
            var dst64 = DBG_REG32_TO_64.hasOwnProperty(dst) ? DBG_REG32_TO_64[dst] : (CPU.hasOwnProperty(dst) ? dst : null);
            var use32 = DBG_REG32_TO_64.hasOwnProperty(dst);
            if (dst64 && src !== undefined) {
                if (CPU.hasOwnProperty(src)) {
                    CPU[dst64] = use32 ? (CPU[src] >>> 0) : CPU[src];
                } else if (/^0x/.test(src)) {
                    var immv = parseInt(src, 16);
                    CPU[dst64] = use32 ? (immv >>> 0) : immv;
                }
            }
        }
    } else if (m === 'lea') {
        var lp = (instr.ops || '').split(',').map(function(s){ return s.trim().toLowerCase(); });
        var ldst = lp[0];
        var lsrc = lp[1] || '';
        if (CPU.hasOwnProperty(ldst) && /\[rip\+/i.test(lsrc)) {
            CPU[ldst] = 0x404800;
        }
    } else if (m === 'xor') {
        var p2 = instr.ops.split(',').map(function(s){ return s.trim().toLowerCase(); });
        var x0 = DBG_REG32_TO_64[p2[0]] || p2[0];
        var x1 = DBG_REG32_TO_64[p2[1]] || p2[1];
        if (x0 === x1 && CPU.hasOwnProperty(x0)) {
            CPU[x0] = 0; CPU.flags.ZF = 1; CPU.flags.SF = 0; CPU.flags.CF = 0; CPU.flags.OF = 0;
        }
    } else if (m === 'sub') {
        var sp = instr.ops.split(',').map(function(s){ return s.trim().toLowerCase(); });
        if (sp[0] === 'rsp' && /^0x/.test(sp[1])) CPU.rsp -= parseInt(sp[1], 16);
    } else if (m === 'add') {
        var ap = instr.ops.split(',').map(function(s){ return s.trim().toLowerCase(); });
        if (ap[0] === 'rsp' && /^0x/.test(ap[1])) CPU.rsp += parseInt(ap[1], 16);
    } else if (m === 'test') {
        var tp = instr.ops.split(',').map(function(s){ return s.trim().toLowerCase(); });
        if (tp[0] === tp[1] && CPU.hasOwnProperty(tp[0])) CPU.flags.ZF = CPU[tp[0]] === 0 ? 1 : 0;
    } else if (m === 'cmp') {
        var cp = instr.ops.split(',').map(function(s){ return s.trim().toLowerCase(); });
        var a = CPU.hasOwnProperty(cp[0]) ? CPU[cp[0]] : 0;
        var b = CPU.hasOwnProperty(cp[1]) ? CPU[cp[1]] : (/^0x/.test(cp[1]) ? parseInt(cp[1], 16) : 0);
        CPU.flags.ZF = (a === b) ? 1 : 0;
        CPU.flags.SF = (a < b) ? 1 : 0;
        CPU.flags.CF = (a < b) ? 1 : 0;
    } else if (m === 'je' || m === 'jz') {
        if (CPU.flags.ZF) { jumpToLabel(instr.ops); advanced = true; }
    } else if (m === 'jne' || m === 'jnz') {
        if (!CPU.flags.ZF) { jumpToLabel(instr.ops); advanced = true; }
    } else if (m === 'jmp') {
        jumpToLabel(instr.ops); advanced = true;
    } else if (m === 'call') {
        var curVa = dbgLocToVa(STATE.activeFn, idx);
        var nextVa = (curVa + byteLen(raw)) >>> 0;
        CPU.rsp -= 8;
        dbgMemWrite64(CPU.rsp, nextVa);
        var target = (instr.ops || '').trim();
        if (DISASM[target]) {
            STATE.activeFn = target;
            STATE.rip = dbgFirstExecIdx(DISASM[target]);
            fn = DISASM[STATE.activeFn];
            while (STATE.rip < fn.instructions.length && fn.instructions[STATE.rip].label) STATE.rip++;
            dbgLog('info', 'Apel <code>' + escapeHtml(target) + '</code> @ ' + hexAddr(dbgLocToVa(STATE.activeFn, STATE.rip)) + '.');
            advanced = true;
        } else {
            dbgLog('warn', 'Țintă necunoscută <code>' + escapeHtml(target) + '</code>.');
        }
    } else if (m === 'ret') {
        var retVa = dbgMemRead64(CPU.rsp);
        CPU.rsp += 8;
        dbgLog('info', 'Retur din funcție. RAX = 0x' + hex64(CPU.rax) + ' &rarr; 0x' + hexAddr(retVa) + '.');
        var loc = dbgVaToLoc(retVa);
        if (loc) {
            STATE.activeFn = loc.fn;
            STATE.rip = loc.idx;
            fn = DISASM[STATE.activeFn];
            while (STATE.rip < fn.instructions.length && fn.instructions[STATE.rip].label) STATE.rip++;
            advanced = true;
        } else {
            dbgLog('warn', 'Adresa de retur 0x' + hexAddr(retVa) + ' nu e în .text mapat.');
            STATE.rip++;
            advanced = true;
        }
    } else if (m === 'leave') {
        CPU.rsp = CPU.rbp;
        CPU.rbp = dbgMemRead64(CPU.rsp);
        CPU.rsp += 8;
    }
    if (!advanced) STATE.rip++;
    fn = DISASM[STATE.activeFn];
    while (fn && STATE.rip < fn.instructions.length && fn.instructions[STATE.rip].label) STATE.rip++;
    CPU.rip = dbgLocToVa(STATE.activeFn, Math.min(STATE.rip, (fn && fn.instructions) ? fn.instructions.length : 0));
    for (var kk in old) if (CPU[kk] !== old[kk]) CPU_CHANGED[kk] = true;
    renderDisassembly(); renderRegisters(); renderStack();
}

function jumpToLabel(label) {
    var fn = DISASM[STATE.activeFn];
    for (var i = 0; i < fn.instructions.length; i++) {
        if (fn.instructions[i].label === label + ':') {
            STATE.rip = i + 1;
            while (STATE.rip < fn.instructions.length && fn.instructions[STATE.rip].label) STATE.rip++;
            return;
        }
    }
    STATE.rip++;
}

function dbgContinue() {
    for (var i = 0; i < 60; i++) {
        var fn = DISASM[STATE.activeFn];
        if (STATE.rip >= fn.instructions.length) break;
        var instr = getDisplayedInstr(STATE.activeFn, STATE.rip);
        dbgStep();
        if (instr.mnem === 'ret') break;
    }
}

function applyPatch(fn, idx, patch) {
    var key = fn + ':' + idx;
    var instr = DISASM[fn].instructions[idx];
    STATE.patches[key] = patch;
    recomputeBinaryPatches();
    var desc = patchDescription(fn, idx, patch);
    dbgLog('patch', 'Patch aplicat la <b>' + fn + '+0x' + offsetOf(fn, idx).toString(16) + '</b>: ' + desc);
    var effect = effectDescription(instr.id, patch);
    if (effect) dbgLog('effect', '&#10003; Efect în binar: ' + effect);
    renderFuncList(); renderDisassembly(); renderRegisters();
    if (typeof showToast === 'function') showToast('Patch aplicat.');
}
function revertPatch(fn, idx) {
    var key = fn + ':' + idx;
    if (!STATE.patches[key]) return;
    delete STATE.patches[key];
    recomputeBinaryPatches();
    dbgLog('info', 'Patch revocat la <b>' + fn + '+0x' + offsetOf(fn, idx).toString(16) + '</b>.');
    renderFuncList(); renderDisassembly();
    if (typeof showToast === 'function') showToast('Patch revocat.');
}
function resetAllPatches() {
    STATE.patches = {};
    recomputeBinaryPatches();
    dbgLog('info', 'Toate patch-urile au fost revocate. Binarul revine la starea originală.');
    renderFuncList(); renderDisassembly();
    if (typeof showToast === 'function') showToast('Toate patch-urile revocate.');
}
function offsetOf(fn, idx) {
    var sum = 0;
    for (var i = 0; i < idx; i++) sum += byteLen(DISASM[fn].instructions[i]);
    return sum;
}
/** Edit pe cc_fail_ret: forțează retur 0 fără a ocoli scanarea: lint-ul rulează în continuare. */
function patchForcesZeroFailReturn(patch) {
    if (!patch || patch.type !== 'edit') return false;
    var s = ((patch.newMnem || '') + ' ' + (patch.newOps || '')).trim().toLowerCase();
    if (/^mov\s+eax\s*,\s*0x0\b/.test(s)) return true;
    if (/^mov\s+eax\s*,\s*0\b/.test(s)) return true;
    if (/^xor\s+eax\s*,\s*eax\b/.test(s)) return true;
    return false;
}

function patchDescription(fn, idx, patch) {
    var instr = DISASM[fn].instructions[idx];
    if (patch.type === 'nop') return 'NOP-at peste <code>' + escapeHtml(instr.mnem + ' ' + (instr.ops || '')) + '</code>';
    if (patch.type === 'invert') return 'saltul <code>' + escapeHtml(instr.mnem) + '</code> inversat';
    if (patch.type === 'edit') return '<code>' + escapeHtml(instr.mnem + ' ' + (instr.ops || '')) + '</code> &rarr; <code>' + escapeHtml(patch.newMnem + ' ' + (patch.newOps || '')) + '</code>';
    return 'modificat';
}
function effectDescription(hookId, patch) {
    if (hookId === 'cc_jz') {
        if (patch.type === 'invert') return 'verificarea curriculară ocolită, codul trece fără restricții.';
        if (patch.type === 'nop') return 'saltul către <code>.clean</code> neutralizat - traceback <i>întotdeauna</i> emis.';
        if (patch.type === 'edit') return 'comportamentul saltului redefinit manual.';
    }
    if (hookId === 'cc_fail_ret' && patch.type === 'nop') {
        return 'instrucțiunea de return a eșecului eliminată - verificarea curriculară este ocolită.';
    }
    if (hookId === 'cc_fail_ret' && patchForcesZeroFailReturn(patch)) {
        return 'valoarea de retur forțată la 0 - verificarea va raporta dar nu va opri execuția.';
    }
    if (hookId === 'vo_jne') {
        if (patch.type === 'invert') return 'logica detecției SO inversată, bannerul nu mai apare.';
        if (patch.type === 'nop') return '<code>hide_banner</code> se execută pentru toate SO.';
    }
    if (hookId === 'vo_cmp' && patch.type === 'edit' && /rax\s*,\s*rax/i.test(patch.newOps || '')) return 'comparația cu Windows transformată în tautologie.';
    if (hookId === 'vo_call_banner' && patch.type === 'nop') return 'apelul <code>show_banner</code> suprimat.';
    if (hookId === 'et_call_fputs' && patch.type === 'nop') return 'redactarea tracebackului parțial suprimată.';
    return '';
}
function recomputeBinaryPatches() {
    var p = { bypassCurriculum: false, curriculumNonBlocking: false, bypassOSCheck: false, suppressTraceback: false, forceTraceback: false, programBroken: false };
    var ccJz = findKeyByHook('check_curriculum', 'cc_jz');
    if (ccJz && STATE.patches[ccJz]) {
        var pt = STATE.patches[ccJz];
        if (pt.type === 'invert') p.bypassCurriculum = true;
        if (pt.type === 'edit' && /^jmp\b/i.test((pt.newMnem || '').trim())) p.bypassCurriculum = true;
        if (pt.type === 'nop') p.forceTraceback = true;
    }
    var ccFail = findKeyByHook('check_curriculum', 'cc_fail_ret');
    if (ccFail && STATE.patches[ccFail]) {
        var pt2 = STATE.patches[ccFail];
        if (pt2.type === 'nop') p.bypassCurriculum = true;
        if (pt2.type === 'edit' && patchForcesZeroFailReturn(pt2)) p.curriculumNonBlocking = true;
    }
    var voJne = findKeyByHook('verify_os', 'vo_jne');
    if (voJne && STATE.patches[voJne]) {
        var pt3 = STATE.patches[voJne];
        if (pt3.type === 'invert' || pt3.type === 'nop') p.bypassOSCheck = true;
        if (pt3.type === 'edit' && /^j(e|z|mp)\b/i.test((pt3.newMnem || '').trim())) p.bypassOSCheck = true;
    }
    var voCall = findKeyByHook('verify_os', 'vo_call_banner');
    if (voCall && STATE.patches[voCall] && STATE.patches[voCall].type === 'nop') p.bypassOSCheck = true;
    var voCmp = findKeyByHook('verify_os', 'vo_cmp');
    if (voCmp && STATE.patches[voCmp] && STATE.patches[voCmp].type === 'edit' && /rax\s*,\s*rax/i.test(STATE.patches[voCmp].newOps || '')) p.bypassOSCheck = true;
    var etCall = findKeyByHook('emit_traceback', 'et_call_fputs');
    if (etCall && STATE.patches[etCall] && STATE.patches[etCall].type === 'nop') p.suppressTraceback = true;

    STATE.binaryPatches = STATE.binaryPatches || {};
    STATE.binaryPatches.bypassCurriculum = p.bypassCurriculum;
    STATE.binaryPatches.curriculumNonBlocking = p.curriculumNonBlocking;
    STATE.binaryPatches.bypassOSCheck = p.bypassOSCheck;
    STATE.binaryPatches.effects = p;
    var strictSwitch = $('prefStrictSwitch');
    var badge = $('strictLockBadge');
    var curriculumPatched = p.bypassCurriculum || p.curriculumNonBlocking;
    if (strictSwitch && badge) {
        strictSwitch.classList.toggle('locked', !curriculumPatched);
        if (p.bypassCurriculum) {
            badge.textContent = 'Patched';
            badge.style.background = 'rgba(229,130,26,0.15)';
            badge.style.color = '#e5821a';
        } else if (p.curriculumNonBlocking) {
            badge.textContent = 'Retur patch-uit';
            badge.style.background = 'rgba(229,130,26,0.12)';
            badge.style.color = '#c97816';
        } else {
            badge.textContent = 'Protejat';
            badge.style.background = '';
            badge.style.color = '';
        }
    }
    if (typeof renderBanner === 'function') renderBanner();
    if (typeof liveLintStatus === 'function') liveLintStatus();
}
function findKeyByHook(fn, hookId) {
    var insts = DISASM[fn].instructions;
    for (var i = 0; i < insts.length; i++) if (insts[i].id === hookId) return fn + ':' + i;
    return null;
}
function applyRuntimeEffects() {
    recomputeBinaryPatches();
}

function openAsmEditInline(fn, idx) {
    var instr = DISASM[fn].instructions[idx];
    var current = STATE.patches[fn + ':' + idx] ? getDisplayedInstr(fn, idx) : instr;
    _asmEditCtx = { fn: fn, idx: idx };
    $('asmEditCtx').textContent =
        hexAddr(DISASM[fn].addr + offsetOf(fn, idx)) + '    ' +
        (instr.bytes || '') + '    ' + instr.mnem + (instr.ops ? ' ' + instr.ops : '');
    $('asmEditInput').value = current.mnem + (current.ops ? ' ' + current.ops : '');
    $('asmEditError').textContent = '';
    openDialog('asmEditBackdrop');
    setTimeout(function() { $('asmEditInput').focus(); $('asmEditInput').select(); }, 50);
}

var _asmEditCtx = null;
function commitAsmEditDialog() {
    if (!_asmEditCtx) return;
    var rawValue = $('asmEditInput').value;
    if (!rawValue || !rawValue.trim()) {
        $('asmEditError').textContent = 'Introduceți o instrucțiune.';
        return;
    }
    var parsed = parseInstruction(rawValue);
    if (parsed.error) {
        $('asmEditError').textContent = parsed.error;
        return;
    }
    var orig = DISASM[_asmEditCtx.fn].instructions[_asmEditCtx.idx];
    var targetLen = byteLen(orig);
    var bytes = assembleBytes(parsed, targetLen);
    var bArr = bytes.split(/\s+/);
    while (bArr.length < targetLen) bArr.push('90');
    if (bArr.length > targetLen) bArr = bArr.slice(0, targetLen);
    applyPatch(_asmEditCtx.fn, _asmEditCtx.idx, {
        type: 'edit',
        newMnem: parsed.mnem,
        newOps: parsed.ops || '',
        newBytes: bArr.join(' ')
    });
    closeDialog('asmEditBackdrop');
    _asmEditCtx = null;
}

/* Debugger documentation panel logic lives in js/debugger/docs.js */


$('asmEditOK').addEventListener('click', commitAsmEditDialog);
$('asmEditCancel').addEventListener('click', function() {
    closeDialog('asmEditBackdrop');
    _asmEditCtx = null;
});
$('asmEditRevert').addEventListener('click', function() {
    if (!_asmEditCtx) return;
    revertPatch(_asmEditCtx.fn, _asmEditCtx.idx);
    closeDialog('asmEditBackdrop');
    _asmEditCtx = null;
});
$('asmEditInput').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') commitAsmEditDialog();
    else if (e.key === 'Escape') $('asmEditCancel').click();
});
