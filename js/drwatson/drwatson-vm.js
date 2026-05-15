/* ============================================================
   DR. WATSON: VM PANEL
   Renders the read-only CPU state and disassembly that real
   drwtsn32 dumps into its log: registers (eax, ebx, ecx, edx,
   esi, edi, eip, esp, ebp, plus EFLAGS), and a small disassembly
   window centered on EIP.

   This is purely cosmetic, the values come from the fault's
   details block (matched against a small parser). It exists so
   the View pane on a fault feels like a real postmortem CPU
   state, not just a text dump.
   ============================================================ */
(function() {

    function parseRegisters(detailsText) {
        var regs = {
            eax: '00000000', ebx: '00000000', ecx: '00000000', edx: '00000000',
            esi: '00000000', edi: '00000000', eip: '00000000', esp: '00000000',
            ebp: '00000000', flags: 'nv up ei pl nz na po nc'
        };
        if (!detailsText) return regs;
        // Real drwtsn32 prints a line like "eax=00000000 ebx=7ffdf000 ...".
        // We parse that with a simple regex over the details block.
        var m = detailsText.match(/eax=([0-9a-f]+)\s+ebx=([0-9a-f]+)\s+ecx=([0-9a-f]+)\s+edx=([0-9a-f]+)\s+esi=([0-9a-f]+)\s+edi=([0-9a-f]+)/i);
        if (m) {
            regs.eax = m[1]; regs.ebx = m[2]; regs.ecx = m[3];
            regs.edx = m[4]; regs.esi = m[5]; regs.edi = m[6];
        }
        var m2 = detailsText.match(/eip=([0-9a-f]+)\s+esp=([0-9a-f]+)\s+ebp=([0-9a-f]+)/i);
        if (m2) { regs.eip = m2[1]; regs.esp = m2[2]; regs.ebp = m2[3]; }
        var m3 = detailsText.match(/iopl=\d+\s+(.+)$/m);
        if (m3) { regs.flags = m3[1].trim(); }
        return regs;
    }

    function renderRegistersHtml(regs) {
        return '<table class="drw-vm-regs">' +
            '<tr><th>EAX</th><td>' + regs.eax + '</td><th>ESI</th><td>' + regs.esi + '</td></tr>' +
            '<tr><th>EBX</th><td>' + regs.ebx + '</td><th>EDI</th><td>' + regs.edi + '</td></tr>' +
            '<tr><th>ECX</th><td>' + regs.ecx + '</td><th>EIP</th><td>' + regs.eip + '</td></tr>' +
            '<tr><th>EDX</th><td>' + regs.edx + '</td><th>ESP</th><td>' + regs.esp + '</td></tr>' +
            '<tr><th>FLG</th><td colspan="3">' + regs.flags + '</td></tr>' +
            '</table>';
    }

    // A short faux disassembly centered on the fault EIP. Real drwtsn32
    // dumps about 12 instructions of context. We render 6, which is
    // enough to feel real without dominating the View pane.
    function renderDisassemblyHtml(fault, regs) {
        var rows = [
            { addr: '77E7A6D8', bytes: '8B 4D 0C',       mnem: 'mov  ecx, [ebp+0Ch]' },
            { addr: '77E7A6DB', bytes: '85 C9',          mnem: 'test ecx, ecx'         },
            { addr: '77E7A6DD', bytes: '74 13',          mnem: 'jz   77E7A6F2'         },
            { addr: '77E7A6DF', bytes: '8B 51 04',       mnem: 'mov  edx, [ecx+04h]'   },
            { addr: '77E7A6E2', bytes: 'FF 12',          mnem: 'call dword ptr [edx]', current: true, faulting: true },
            { addr: '77E7A6E4', bytes: '83 C4 04',       mnem: 'add  esp, 04h'         },
            { addr: '77E7A6E7', bytes: '5D',             mnem: 'pop  ebp'              },
            { addr: '77E7A6E8', bytes: 'C3',             mnem: 'ret'                   }
        ];
        var html = '<table class="drw-vm-disasm">';
        rows.forEach(function(r) {
            var cls = '';
            if (r.faulting) cls = 'drw-vm-fault';
            html += '<tr class="' + cls + '">' +
                '<td class="drw-vm-addr">' + r.addr + '</td>' +
                '<td class="drw-vm-bytes">' + r.bytes + '</td>' +
                '<td class="drw-vm-mnem">' + r.mnem + (r.faulting ? '   <span class="drw-vm-marker">&lt;-- exception</span>' : '') + '</td>' +
                '</tr>';
        });
        html += '</table>';
        return html;
    }

    window.DrWatsonVm = {
        parseRegisters: parseRegisters,
        renderRegistersHtml: renderRegistersHtml,
        renderDisassemblyHtml: renderDisassemblyHtml
    };
})();
