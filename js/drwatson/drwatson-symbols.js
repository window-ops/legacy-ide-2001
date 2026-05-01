/* ============================================================
   DR. WATSON: SYMBOLS & FAULT CATALOG
   The symbol table that Dr. Watson uses to resolve return-address
   columns in the stack back-trace. Plus the catalog of recorded
   application errors that the postmortem debugger lists in its
   Application Errors panel.

   Faults come from the migrated snapshot. A clean install has an
   empty fault list; a full install carries over every patched
   curriculum bypass as a c0000005 access-violation entry.

   The format mirrors what real drwtsn32.log writes: module name,
   exception code, exception label, plus a long-form details block
   shown by the View action.
   ============================================================ */
(function() {

    // The user-mode symbol table the gate fault crashed inside.
    // Address columns are baked in to look like real Win32 stack
    // back-traces from a Server 2003 dump file.
    var DRWATSON_SYMBOLS = [
        { addr: '004013A2', mod: 'gdx-debugd.exe',     sym: 'main',                       off: '0x12'  },
        { addr: '77E7B114', mod: 'lint-curriculum.dll', sym: 'lint_strict',                off: '0xa1'  },
        { addr: '77E7A6E2', mod: 'lint-curriculum.dll', sym: 'check_curriculum',           off: '0x42'  },
        { addr: '7C801D77', mod: 'kernel32.dll',       sym: 'GetProcAddress',             off: '0x4d'  },
        { addr: '7C816D4F', mod: 'kernel32.dll',       sym: 'BaseProcessStart',           off: '0x23'  },
        { addr: '77E64829', mod: 'rpcrt4.dll',         sym: 'NdrServerCall2',             off: '0x16f' },
        { addr: '77F45A2C', mod: 'ntdll.dll',          sym: 'KiUserCallbackDispatcher',   off: '0x13'  }
    ];

    function buildFaults(snapshot) {
        var faults = [];
        if (!snapshot || !snapshot.includesDebugger) return faults;

        var now = new Date();
        var when = now.toLocaleString();

        faults.push({
            id: 'gdx-debugd-1',
            module: 'gdx-debugd.exe',
            code:   'c0000005',
            label:  'Access violation',
            pid:    1640,
            when:   when,
            // Patch target the user can edit from the View pane.
            patchTarget: { fn: 'check_curriculum', idx: 12, action: 'nop', effect: 'bypassCurriculum' },
            details: lines([
                'Application exception occurred:',
                '  App: gdx-debugd.exe (pid=1640)',
                '  When: ' + when,
                '  Exception number: c0000005 (access violation)',
                '',
                '*----> System Information <----*',
                '  Computer Name: GDX-APPLIANCE',
                '  User Name: defaultuser',
                '  Number of Processors: 1',
                '  Processor Type: x86 Family 15 Model 2',
                '  Windows Version: 5.2 (Build 3790)',
                '',
                '*----> Task List <----*',
                '   0 System Process',
                '   4 System',
                ' 392 smss.exe',
                ' 472 csrss.exe',
                ' 496 winlogon.exe',
                ' 540 services.exe',
                '1640 gdx-debugd.exe',
                '',
                '*----> State Dump for Thread Id 0xa14 <----*',
                'eax=00000000 ebx=7ffdf000 ecx=0012fe60 edx=00000010 esi=00000001 edi=00000000',
                'eip=77e7a6e2 esp=0012fe40 ebp=0012fe60 iopl=0     nv up ei pl nz na po nc',
                '',
                '*----> Stack Back Trace <----*',
                '  FramePtr  RetAddr   Param#1  Param#2  Function Name',
                '  0012FE40  77E7A6E2  00000000 00000001 lint-curriculum!check_curriculum+0x42',
                '  0012FE60  77E7B114  0012FE80 00000000 lint-curriculum!lint_strict+0xa1',
                '  0012FE80  004013A2  00000001 00000000 gdx-debugd!main+0x12',
                '  0012FEA0  7C816D4F  00000000 00000000 kernel32!BaseProcessStart+0x23'
            ])
        });

        faults.push({
            id: 'lint-curriculum-1',
            module: 'lint-curriculum.exe',
            code:   'c0000005',
            label:  'Access violation',
            pid:    1842,
            when:   when,
            patchTarget: { fn: 'check_curriculum', idx: 7, action: 'invert', effect: 'bypassCurriculum' },
            details: lines([
                'Application exception occurred:',
                '  App: lint-curriculum.exe (pid=1842)',
                '  When: ' + when,
                '  Exception number: c0000005 (access violation)',
                '',
                '  Cause: jump-not-equal at offset 0x7 was inverted by a',
                '         user-installed patch (bypassCurriculum). Control',
                '         transferred to a free()d region.',
                '  Carried over from QNX session by snapshot installer.',
                '',
                '*----> Stack Back Trace <----*',
                '  FramePtr  RetAddr   Param#1  Param#2  Function Name',
                '  0012FF00  77E7B114  00000007 00000000 lint-curriculum!lint_strict+0x07',
                '  0012FF20  004013A2  00000001 00000000 lint-curriculum!main+0x14'
            ])
        });

        faults.push({
            id: 'check_2001-1',
            module: 'check_2001.exe',
            code:   'c00000fd',
            label:  'Stack overflow',
            pid:    2104,
            when:   when,
            patchTarget: { fn: 'verify_os', idx: 3, action: 'nop', effect: 'bypassOSCheck' },
            details: lines([
                'Application exception occurred:',
                '  App: check_2001.exe (pid=2104)',
                '  When: ' + when,
                '  Exception number: c00000fd (stack overflow)',
                '',
                '  Recursive call chain in HTML4_Strict_validate_attribute().',
                '  Patched call to permit Transitional attributes returns to',
                '  itself when allowTransitional is true.',
                '',
                '*----> Stack Back Trace <----*',
                '  FramePtr  RetAddr   Param#1  Param#2  Function Name',
                '  0012F000  00401200  00000000 00000000 check_2001!allowTransitional_validate+0x03',
                '  0012EFE0  00401200  00000000 00000000 check_2001!allowTransitional_validate+0x03',
                '  0012EFC0  00401200  00000000 00000000 check_2001!allowTransitional_validate+0x03',
                '  ...   ',
                '  (stack frame limit reached after 4096 frames)'
            ])
        });

        return faults;
    }

    function lines(arr) { return arr.join('\n'); }

    // Expose on window so the other Dr. Watson modules can pick it up.
    window.DRWATSON_SYMBOLS = DRWATSON_SYMBOLS;
    window.buildDrWatsonFaults = buildFaults;
})();
