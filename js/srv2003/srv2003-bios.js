/* ============================================================
   BIOS SETUP
   PhoenixBIOS Setup Utility shell. Reached from the safe-off
   F2 button after shutdown. Two-pane layout (settings + help),
   five tabs (Main, Advanced, Security, Boot, Exit), keyboard
   navigation, persists boot sequence to STATE.bios. Calls
   showToast() from core utils.
   ============================================================ */
(function() {
    function openBiosSetup() {
        if (document.getElementById('biosSetup')) return;
        // Settings store, defaults reflect what a real Phoenix BIOS
        // would present for an aging x86 server.
        var settings = {
            // Main
            sysTime:     '14:32:08',
            sysDate:     '01/05/2026',
            cpuType:     'VIA C7-D 1.0 GHz',
            cpuFreq:     '1000 MHz (533 MHz FSB)',
            l1Cache:     '128 KB (64 KB I + 64 KB D)',
            l2Cache:     '128 KB on-die',
            biosVer:     '4.06 Rev 1.04 GDX',
            biosBuild:   '14/08/2002',
            serviceTag:  'GDX-CT-2003-A04 / SVC: GDX2001',
            ideMaster:   'GDX-IDE-FLASH 256 MB',
            ideSlave:    '[ None ]',
            sataPort1:   '[ None ]',
            sataPort2:   '[ None ]',
            baseMem:     '640 KB',
            extMem:      '523264 KB',
            totalMem:    '512 MB DDR1-400',
            // Boot
            bootSeq:     ['Floppy Drive', 'Hard Drive', 'CD-ROM Drive', 'Network Boot'],
            quietBoot:   'Disabled',
            quickBoot:   'Enabled',
            numLock:     'On',
            pxeRom:      'Enabled',
            bootSplash:  'GDX Education',
            postDelay:   '2 sec',
            // Security
            virusCheck:  'Disabled',
            secureBoot:  'Off',
            adminPwd:    'Installed',
            userPwd:     'Not Installed',
            pwdCheck:    'Setup',
            // Advanced (chipset / IO)
            sataMode:    'Compatibility',
            usbLegacy:   'Enabled',
            usbPorts:    '2 x USB 2.0 (EHCI)',
            apicMode:    'Enabled',
            plugAndPlay: 'Yes',
            onboardLan:  'Enabled',
            onboardAudio:'Disabled',
            onboardSerial:'Auto (3F8h, IRQ 4)',
            onboardParallel:'Auto (378h, IRQ 7)',
            // Hardware monitor (read-only info)
            cpuTemp:     '41 °C / 106 °F',
            sysTemp:     '38 °C / 100 °F',
            cpuFan:      '2400 RPM',
            sysFan:      '1900 RPM',
            volt33:      '+3.30 V',
            volt5:       '+5.05 V',
            volt12:      '+11.92 V',
            // Power (new tab)
            acpiFunc:    'Enabled',
            acpiSuspend: 'S3 (Suspend to RAM)',
            wakeOnLan:   'Enabled',
            wakeOnRing:  'Disabled',
            acLossRestart:'Off',
            powerBtn:    'Power Off (4 sec)',
            // Flash Write Protect: Phoenix BIOS exposes this on
            // Advanced as the OEM firmware-lock register. While
            // Enabled, the SPI controller refuses writes to the
            // BIOS region. Disabling it is one of two prerequisites
            // for the Firmware (coreboot flash) tab to appear.
            firmwareWP:  'Enabled'
        };

        // Helpers for the unlock predicate. The Firmware tab is
        // hidden until BOTH the supervisor password is cleared
        // AND firmwareWP is set to Disabled. This mirrors the
        // satire premise that the appliance vendor relies on the
        // BIOS password + write-protect to stop firmware tampering.
        function adminPasswordCleared() {
            return settings.adminPwd === 'Not Installed';
        }
        function flashUnlocked() {
            return settings.firmwareWP === 'Disabled';
        }
        function firmwareTabUnlocked() {
            return adminPasswordCleared() && flashUnlocked();
        }
        // Already-flashed appliances keep the tab visible even
        // though it would have nothing to do; in practice the
        // post-flash takeover prevents reaching BIOS Setup at all,
        // so this is just defense-in-depth.

        // Tab list. The Firmware tab is appended only when the
        // unlock predicates above pass. The list is regenerated on
        // every render() so that toggling WP or clearing the
        // password makes the tab appear immediately.
        function buildTabs() {
            var t = [
                { id: 'main',     label: 'Main' },
                { id: 'advanced', label: 'Advanced' },
                { id: 'power',    label: 'Power' },
                { id: 'boot',     label: 'Boot' },
                { id: 'security', label: 'Security' },
            ];
            if (firmwareTabUnlocked()) {
                t.push({ id: 'firmware', label: 'Firmware' });
            }
            t.push({ id: 'exit', label: 'Exit' });
            return t;
        }
        var TABS = buildTabs();
        // Each tab has its own list of fields. Type 'info' is read-only
        // text; 'toggle' cycles through the choices array; 'time' /
        // 'date' are read-only display fields; 'order' is a reorderable
        // list (Boot Sequence); 'action' fires on Enter; 'separator' is
        // a non-selectable section header inside a tab.
        var TAB_FIELDS = {
            main: [
                { id: '_sysHdr',    label: '> System',                type: 'separator' },
                { id: 'sysTime',    label: 'System Time',             type: 'info', help: 'The system time. Format is HH:MM:SS.' },
                { id: 'sysDate',    label: 'System Date',             type: 'info', help: 'The system date. Format is DD/MM/YYYY.' },
                { id: '_cpuHdr',    label: '> Processor',             type: 'separator' },
                { id: 'cpuType',    label: 'CPU Type',                type: 'info', help: 'The detected processor model. Reported by CPUID family/model bits.' },
                { id: 'cpuFreq',    label: 'CPU Speed',               type: 'info', help: 'The detected processor frequency and front-side bus rate.' },
                { id: 'l1Cache',    label: 'L1 Cache',                type: 'info', help: 'On-die first-level cache. Split between instructions and data.' },
                { id: 'l2Cache',    label: 'L2 Cache',                type: 'info', help: 'On-die second-level unified cache.' },
                { id: '_memHdr',    label: '> Memory',                type: 'separator' },
                { id: 'baseMem',    label: 'Base Memory',             type: 'info', help: 'Conventional memory available below the 1 MB barrier (DOS legacy).' },
                { id: 'extMem',     label: 'Extended Memory',         type: 'info', help: 'Memory available above the 1 MB barrier.' },
                { id: 'totalMem',   label: 'Total Memory',            type: 'info', help: 'The total amount of installed system memory.' },
                { id: '_storHdr',   label: '> Storage',               type: 'separator' },
                { id: 'ideMaster',  label: 'IDE Primary Master',      type: 'info', help: 'Detected master device on the primary IDE channel. The on-board IDE flash module appears here on appliance hardware.' },
                { id: 'ideSlave',   label: 'IDE Primary Slave',       type: 'info', help: 'Detected slave device on the primary IDE channel.' },
                { id: 'sataPort1',  label: 'SATA Port 1',             type: 'info', help: 'Detected device on the first SATA port.' },
                { id: 'sataPort2',  label: 'SATA Port 2',             type: 'info', help: 'Detected device on the second SATA port.' },
                { id: '_sysIdHdr',  label: '> System Identification', type: 'separator' },
                { id: 'biosVer',    label: 'BIOS Version',            type: 'info', help: 'The Phoenix BIOS firmware version installed in the SPI flash.' },
                { id: 'biosBuild',  label: 'BIOS Build Date',         type: 'info', help: 'The date the BIOS image was built by the OEM.' },
                { id: 'serviceTag', label: 'Service Tag',             type: 'info', help: 'Factory service identifier. The string after SVC: is the supervisor password printed on the OEM yellow service sticker on the underside of the chassis. See Help and Support, Actualizare firmware (coreboot) for the full unlock procedure.' }
            ],
            advanced: [
                { id: '_chipHdr',     label: '> Chipset & Buses',       type: 'separator' },
                { id: 'sataMode',     label: 'SATA Mode',               type: 'toggle', choices: ['Compatibility', 'AHCI', 'RAID'], help: 'Selects the operating mode of the on-board SATA controller. Changing this may render the OS unbootable.' },
                { id: 'apicMode',     label: 'APIC Mode',               type: 'toggle', choices: ['Enabled', 'Disabled'], help: 'Allows the use of advanced interrupt controller features. Required by Server 2003 and later.' },
                { id: 'plugAndPlay',  label: 'Plug & Play OS',          type: 'toggle', choices: ['Yes', 'No'], help: 'Set Yes when the OS handles PnP enumeration (any modern Windows). No is for DOS-era systems where BIOS must enumerate.' },
                { id: '_ioHdr',       label: '> Onboard I/O',           type: 'separator' },
                { id: 'usbLegacy',    label: 'USB Legacy Support',      type: 'toggle', choices: ['Enabled', 'Disabled'], help: 'Enables BIOS support for USB keyboards and mice in legacy operating systems.' },
                { id: 'usbPorts',     label: 'USB Ports',               type: 'info',   help: 'Number and type of USB ports exposed by the southbridge.' },
                { id: 'onboardLan',   label: 'Onboard LAN',             type: 'toggle', choices: ['Enabled', 'Disabled'], help: 'Controls power to the on-board VIA VT6105M 10/100 Ethernet PHY. Disabling it removes the device from the OS view and stops PXE boot.' },
                { id: 'onboardAudio', label: 'Onboard Audio',           type: 'toggle', choices: ['Enabled', 'Disabled'], help: 'Controls the AC97 codec on the southbridge. Disabled by default on appliance images.' },
                { id: 'onboardSerial',label: 'Serial Port (COM1)',      type: 'info',   help: 'I/O address and IRQ assigned to the on-board UART.' },
                { id: 'onboardParallel', label: 'Parallel Port (LPT1)', type: 'info',   help: 'I/O address and IRQ assigned to the on-board parallel port.' },
                { id: '_hwmHdr',      label: '> Hardware Monitor',      type: 'separator' },
                { id: 'cpuTemp',      label: 'CPU Temperature',         type: 'info',   help: 'Read from the on-die thermal diode. Not configurable from Setup.' },
                { id: 'sysTemp',      label: 'System Temperature',      type: 'info',   help: 'Ambient temperature inside the chassis, read from the W83627 super-IO sensor.' },
                { id: 'cpuFan',       label: 'CPU Fan Speed',           type: 'info',   help: 'CPU fan tachometer signal. Below 800 RPM the system will halt with POST code F0h.' },
                { id: 'sysFan',       label: 'System Fan Speed',        type: 'info',   help: 'Chassis fan tachometer signal.' },
                { id: 'volt33',       label: 'VCC 3.3 V Rail',          type: 'info',   help: 'Live voltage on the 3.3 V rail. Outside ±5% the system will not POST.' },
                { id: 'volt5',        label: 'VCC 5.0 V Rail',          type: 'info',   help: 'Live voltage on the 5 V rail. Outside ±5% the system will not POST.' },
                { id: 'volt12',       label: 'VCC 12 V Rail',           type: 'info',   help: 'Live voltage on the 12 V rail. Outside ±10% the system will not POST.' },
                { id: '_oemHdr',      label: '> OEM Service',           type: 'separator' },
                { id: 'numLock',      label: 'NumLock at Boot',         type: 'toggle', choices: ['On', 'Off'], help: 'Sets the initial state of the NumLock key after POST.' },
                // Flash Write Protect: hardware-level register on
                // the SPI controller. Disabling it allows writes to
                // the BIOS region. With this Enabled the Firmware
                // tab stays hidden even with a cleared password.
                { id: 'firmwareWP',   label: 'Flash Write Protect',     type: 'toggle', choices: ['Enabled', 'Disabled'], help: 'OEM firmware lock register. Enabled prevents any code from writing to the SPI flash BIOS region. Disabling this is required by service technicians to update firmware. WARNING: setting this Disabled removes the only hardware safeguard against unauthorized firmware modification. With this set Disabled and the Supervisor Password also cleared, a Firmware tab appears at the right of the menu bar with the network flash entry point.' }
            ],
            power: [
                { id: '_acpiHdr',     label: '> ACPI Configuration',    type: 'separator' },
                { id: 'acpiFunc',     label: 'ACPI Function',           type: 'toggle', choices: ['Enabled', 'Disabled'], help: 'Master switch for ACPI. Modern Windows requires this Enabled.' },
                { id: 'acpiSuspend',  label: 'ACPI Suspend Type',       type: 'toggle', choices: ['S1 (POS)', 'S3 (Suspend to RAM)'], help: 'Suspend mode used when the OS requests sleep. S3 cuts power to most rails; S1 keeps clocks running. Server appliances normally use S3.' },
                { id: '_wakeHdr',     label: '> Wake Events',           type: 'separator' },
                { id: 'wakeOnLan',    label: 'Wake on LAN',             type: 'toggle', choices: ['Enabled', 'Disabled'], help: 'Wake the system from S3 when the on-board NIC sees a magic packet. Required for remote administration.' },
                { id: 'wakeOnRing',   label: 'Wake on Modem Ring',      type: 'toggle', choices: ['Enabled', 'Disabled'], help: 'Wake the system when COM1 sees a Ring Indicator transition. Useful with attached modems; otherwise leave Disabled.' },
                { id: '_acHdr',       label: '> AC Behavior',           type: 'separator' },
                { id: 'acLossRestart',label: 'AC Power Loss Restart',   type: 'toggle', choices: ['Off', 'On', 'Last State'], help: 'Behavior when AC power is restored after an outage. Off keeps the appliance off (operator must press power); On always boots; Last State restores the prior power state.' },
                { id: 'powerBtn',     label: 'Power Button Behavior',   type: 'info',   help: 'Hardware-level behavior of the front power button. A long press always forces an immediate hard power-off, regardless of OS state.' }
            ],
            boot: [
                { id: '_bootHdr',  label: '> Boot Settings',           type: 'separator' },
                { id: 'quickBoot', label: 'Quick Boot',                type: 'toggle', choices: ['Enabled', 'Disabled'], help: 'Skips the extended POST tests to speed up boot.' },
                { id: 'quietBoot', label: 'Quiet Boot',                type: 'toggle', choices: ['Enabled', 'Disabled'], help: 'Hides the POST messages and shows the OEM logo.' },
                { id: 'bootSplash',label: 'Boot Splash',               type: 'info',   help: 'OEM splash image displayed during Quiet Boot. Replaced when an OS bootloader takes over the screen.' },
                { id: 'postDelay', label: 'POST Delay',                type: 'info',   help: 'Time the BIOS waits at the OEM splash before invoking the bootloader. Allows F2 / F12 to be caught.' },
                { id: '_devHdr',   label: '> Boot Devices',            type: 'separator' },
                { id: 'bootSeq',   label: 'Boot Sequence',             type: 'order',  help: 'Reorder the boot devices. Click an item, then click again to cycle it down. The first device with a valid boot sector wins.' },
                { id: 'pxeRom',    label: 'PXE Option ROM',            type: 'toggle', choices: ['Enabled', 'Disabled'], help: 'Loads the on-board NIC PXE option ROM during POST. Required for Network Boot. Required for the remote firmware flasher to reach gdx-net.local.' }
            ],
            security: [
                { id: '_pwdHdr',    label: '> Passwords',                type: 'separator' },
                // adminPwd is now an action (Enter prompts). Successfully
                // typing the empty string clears the password.
                { id: 'adminPwd',   label: 'Supervisor Password',        type: 'action', help: 'The password protecting BIOS Setup. Press Enter on this field to set or clear the password. Clearing this password is one of two prerequisites for the hidden Firmware tab to appear (the other is Advanced > Flash Write Protect set to Disabled). The factory password is printed on the OEM service sticker; see Main > Service Tag for its location.' },
                { id: 'userPwd',    label: 'User Password',              type: 'info',   help: 'The password required at boot. Cannot be set on this BIOS revision.' },
                { id: 'pwdCheck',   label: 'Password Check',             type: 'toggle', choices: ['Setup', 'Always'], help: 'Setup: only prompted when entering this Setup utility. Always: also prompted at every boot.' },
                { id: '_protHdr',   label: '> Boot Protection',          type: 'separator' },
                { id: 'secureBoot', label: 'Secure Boot',                type: 'toggle', choices: ['Off', 'On'], help: 'Phoenix-only: not implemented on this BIOS revision.' },
                { id: 'virusCheck', label: 'Boot Sector Virus Check',    type: 'toggle', choices: ['Enabled', 'Disabled'], help: 'Warns when the boot sector is being modified by code other than the BIOS. Generates false positives on legitimate OS installers.' }
            ],
            firmware: [
                { id: '_fwHdr',     label: '> Firmware Identity',     type: 'separator' },
                // The two read-only info rows surface the unlock
                // state plus the chip identity, so the user can
                // verify they're flashing the right hardware.
                { id: 'fwBoard',    label: 'Mainboard',               type: 'info', help: 'The detected mainboard model and revision. The flash payload must match this hardware exactly.' },
                { id: 'fwSpiChip',  label: 'BIOS SPI Chip',           type: 'info', help: 'JEDEC ID of the on-board SPI flash. The payload writer reads back the JEDEC ID to refuse incompatible chips.' },
                { id: 'fwSize',     label: 'Region Size',             type: 'info', help: 'Total size of the BIOS region on the SPI flash, divided into 4 KB sectors.' },
                { id: '_fwUnlockHdr', label: '> Unlock State',         type: 'separator' },
                { id: 'fwLockBit',  label: 'Write Protect',           type: 'info', help: 'Live state of the firmware lock. Mirrors Advanced > Flash Write Protect.' },
                { id: 'fwAdmin',    label: 'Supervisor Password',     type: 'info', help: 'Live state of the supervisor password. Both this and Write Protect must be cleared before remote flashing is enabled.' },
                { id: '_fwActHdr',  label: '> Action',                type: 'separator' },
                // The action that opens the flash overlay.
                { id: 'fwFlash',    label: 'Flash via PXE...',        type: 'action', help: 'WARNING. Connects to the remote firmware bootstrap server (gdx-net.local) and overwrites the SPI flash with a new payload. The factory Phoenix BIOS image is destroyed in the process and CANNOT be recovered through this interface. After flash, the appliance can no longer run Windows Server 2003 or QNX Photon.' }
            ],
            exit: [
                { id: 'saveExit',       label: 'Exit Saving Changes',     type: 'action', help: 'Save the current values and exit. F10.' },
                { id: 'discardExit',    label: 'Exit Discarding Changes', type: 'action', help: 'Discard the current values and exit.' },
                { id: 'loadDefaults',   label: 'Load Setup Defaults',     type: 'action', help: 'Restore all settings to factory defaults. Note: does not re-arm Flash Write Protect or restore the supervisor password if either was cleared.' },
                { id: 'discardChanges', label: 'Discard Changes',         type: 'action', help: 'Revert the unsaved changes back to their previous values.' }
            ]
        };

        var tabIdx = 0;
        var fieldIdx = 0;

        var root = document.createElement('div');
        root.id = 'biosSetup';
        root.className = 'bios-setup';
        root.setAttribute('role', 'application');
        root.setAttribute('aria-label', 'PhoenixBIOS Setup Utility');
        document.body.appendChild(root);
        render();

        function render() {
            // Rebuild TABS each render so the Firmware tab appears
            // / disappears in real time as settings change.
            TABS = buildTabs();
            // Hydrate the live values shown on the Firmware tab.
            // These are read-only mirrors of other settings + the
            // hardware identity, so they update each render.
            settings.fwBoard   = 'GDX-APPLIANCE-A04 (VIA EPIA-LN)';
            settings.fwSpiChip = 'Winbond W25Q64BV (JEDEC EF 40 17)';
            settings.fwSize    = '8 MB / 128 sectoare x 64 KB';
            settings.fwLockBit = settings.firmwareWP === 'Disabled'
                ? 'Cleared (writeable)'
                : 'Set (read-only)';
            settings.fwAdmin   = settings.adminPwd === 'Not Installed'
                ? 'Cleared'
                : 'Installed';
            // Clamp tabIdx in case a tab was removed (Firmware) under us.
            if (tabIdx >= TABS.length) tabIdx = TABS.length - 1;
            if (tabIdx < 0) tabIdx = 0;
            var tab = TABS[tabIdx];
            var fields = TAB_FIELDS[tab.id];
            if (fieldIdx >= fields.length) fieldIdx = fields.length - 1;
            if (fieldIdx < 0) fieldIdx = 0;
            // If the initially-selected field is a separator (which
            // can happen right after a tab switch since separators
            // are usually the first row in a tab), advance to the
            // next selectable field.
            if (fields[fieldIdx] && fields[fieldIdx].type === 'separator') {
                for (var k = 0; k < fields.length; k++) {
                    if (fields[k].type !== 'separator') {
                        fieldIdx = k;
                        break;
                    }
                }
            }
            var helpText = fields[fieldIdx] ? fields[fieldIdx].help : '';
            var html =
                '<div class="bios-screen">' +
                '<div class="bios-banner">PhoenixBIOS Setup Utility</div>' +
                '<div class="bios-tabs">' +
                TABS.map(function(t, i) {
                    return '<span class="bios-tab' + (i === tabIdx ? ' active' : '') + '" data-bios-tab="' + i + '">' + t.label + '</span>';
                }).join('  ') +
                '</div>' +
                '<div class="bios-body">' +
                '<div class="bios-fields">' + renderFields(fields) + '</div>' +
                '<div class="bios-help"><div class="bios-help-title">Item Specific Help</div>' +
                '<div class="bios-help-text">' + helpText + '</div></div>' +
                '</div>' +
                '<div class="bios-footer">' +
                '<span><span class="bios-key">F1</span> Help</span>' +
                '<span><span class="bios-key">↑↓</span> Select Item</span>' +
                '<span><span class="bios-key">+/-</span> Change Values</span>' +
                '<span><span class="bios-key">←→</span> Select Menu</span>' +
                '<span><span class="bios-key">Enter</span> Select &gt; Sub-Menu</span>' +
                '<span><span class="bios-key">F9</span> Setup Defaults</span>' +
                '<span><span class="bios-key">F10</span> Save and Exit</span>' +
                '<span><span class="bios-key">Esc</span> Exit</span>' +
                '</div>' +
                '</div>';
            root.innerHTML = html;
            // Wire click handlers on tabs and fields. Tabs switch the
            // active menu; fields get selected (the help pane updates)
            // and clicking the value cycles it. Tap-friendly.
            root.querySelectorAll('[data-bios-tab]').forEach(function(el) {
                el.addEventListener('click', function() {
                    tabIdx = parseInt(el.getAttribute('data-bios-tab'), 10);
                    fieldIdx = 0;
                    render();
                });
            });
            root.querySelectorAll('[data-bios-field]').forEach(function(el) {
                el.addEventListener('click', function(e) {
                    var i = parseInt(el.getAttribute('data-bios-field'), 10);
                    if (i === fieldIdx) {
                        // Already selected: clicking again cycles or fires.
                        var f = TAB_FIELDS[TABS[tabIdx].id][fieldIdx];
                        if (!f) return;
                        if (f.type === 'toggle' || f.type === 'order') changeValue(1);
                        else if (f.type === 'action') activate();
                    } else {
                        fieldIdx = i;
                        render();
                    }
                });
            });
        }

        function renderFields(fields) {
            return fields.map(function(f, i) {
                var sel = (i === fieldIdx) ? ' bios-field-active' : '';
                var val = '';
                if (f.type === 'separator') {
                    // Section header: not selectable, no help, no value.
                    return '<div class="bios-field-sep">' + f.label + '</div>';
                }
                if (f.type === 'info')   val = settings[f.id];
                else if (f.type === 'toggle') val = '[' + settings[f.id] + ']';
                else if (f.type === 'order') {
                    val = '<div class="bios-order">' +
                        settings.bootSeq.map(function(d, j) {
                            return '<div class="bios-order-row">' + (j + 1) + '. ' + d + '</div>';
                        }).join('') +
                        '</div>';
                    return '<div class="bios-field' + sel + '" data-bios-field="' + i + '"><span class="bios-field-label">' + f.label + ':</span></div>' +
                        '<div class="bios-field-block" data-bios-field="' + i + '">' + val + '</div>';
                }
                else if (f.type === 'action') {
                    // The Supervisor Password field is an action that
                    // also exposes its current state. Showing it on
                    // the same row makes the "cleared" feedback
                    // immediate after the prompt closes.
                    val = (f.id === 'adminPwd') ? '[' + settings.adminPwd + ']' : '';
                }
                return '<div class="bios-field' + sel + '" data-bios-field="' + i + '">' +
                    '<span class="bios-field-label">' + f.label + (f.type === 'action' ? '' : ':') + '</span>' +
                    '<span class="bios-field-value">' + val + '</span>' +
                    '</div>';
            }).join('');
        }

        function moveField(dir) {
            var fields = TAB_FIELDS[TABS[tabIdx].id];
            // Skip over separator rows so arrow-key navigation lands
            // only on selectable fields. Bounded loop just in case
            // a tab is all separators (shouldn't happen).
            for (var attempts = 0; attempts < fields.length * 2; attempts++) {
                fieldIdx = (fieldIdx + dir + fields.length) % fields.length;
                if (fields[fieldIdx].type !== 'separator') break;
            }
            render();
        }
        function moveTab(dir) {
            tabIdx = (tabIdx + dir + TABS.length) % TABS.length;
            fieldIdx = 0;
            render();
        }
        function changeValue(dir) {
            var f = TAB_FIELDS[TABS[tabIdx].id][fieldIdx];
            if (!f) return;
            if (f.type === 'toggle') {
                var cur = settings[f.id];
                var i = f.choices.indexOf(cur);
                i = (i + dir + f.choices.length) % f.choices.length;
                settings[f.id] = f.choices[i];
                render();
            } else if (f.type === 'order' && f.id === 'bootSeq') {
                // Move highlighted boot device. We don\'t track an inner
                // selection cursor, so + moves first device up the list,
                // - moves it down. Good enough to feel real.
                if (dir > 0 && settings.bootSeq.length > 1) {
                    var first = settings.bootSeq.shift();
                    settings.bootSeq.push(first);
                } else if (dir < 0 && settings.bootSeq.length > 1) {
                    var last = settings.bootSeq.pop();
                    settings.bootSeq.unshift(last);
                }
                render();
            }
        }
        function activate() {
            var f = TAB_FIELDS[TABS[tabIdx].id][fieldIdx];
            if (!f) return;
            if (f.type === 'action') {
                if (f.id === 'saveExit') exit(true);
                else if (f.id === 'discardExit') exit(false);
                else if (f.id === 'loadDefaults') {
                    settings.quickBoot = 'Enabled';
                    settings.quietBoot = 'Disabled';
                    settings.numLock = 'On';
                    settings.virusCheck = 'Disabled';
                    settings.bootSeq = ['Floppy Drive', 'Hard Drive', 'CD-ROM Drive', 'Network Boot'];
                    // Note: we don't reset firmwareWP or adminPwd
                    // here. Loading defaults wouldn't undo a service
                    // technician's deliberate firmware-lock state.
                    render();
                } else if (f.id === 'discardChanges') {
                    render();
                } else if (f.id === 'adminPwd') {
                    promptSupervisorPassword();
                } else if (f.id === 'fwFlash') {
                    confirmAndLaunchFlash();
                }
            }
        }

        // Pre-flash confirmation prompt. Flashing the BIOS is the
        // most destructive action available in this Setup utility:
        // the existing PhoenixBIOS image is overwritten in-place
        // and there is no rollback path. Real flashing utilities
        // (DOS flash16, AFUDOS, etc.) always pop a confirmation
        // before doing the actual write, partly because the
        // operation cannot be safely aborted partway through.
        // Mirror that here so the action doesn't feel abrupt.
        function confirmAndLaunchFlash() {
            var bd = document.createElement('div');
            bd.className = 'bios-prompt-backdrop';
            bd.innerHTML =
                '<div class="bios-prompt bios-prompt-warn">' +
                '<div class="bios-prompt-title bios-prompt-title-warn">Confirm Firmware Flash</div>' +
                '<div class="bios-prompt-body bios-prompt-body-warn">' +
                '<p><strong>WARNING:</strong> You are about to overwrite the firmware on the SPI flash chip with the selected image. This operation cannot be undone from within Setup.</p>' +
                '<p>The current PhoenixBIOS 4.06 image will be replaced. After the flash completes, this Setup utility will no longer be available; the new firmware\'s configuration interface (if any) takes its place.</p>' +
                '<p>Do not power off the system during the flash. Interrupting a flash mid-write will brick the appliance.</p>' +
                '<p>Continue?</p>' +
                '</div>' +
                '<div class="bios-prompt-footer">' +
                '<button class="bios-prompt-btn bios-prompt-btn-danger" id="biosFlashOk">Yes, flash now</button>' +
                '<button class="bios-prompt-btn" id="biosFlashCancel">Cancel</button>' +
                '</div>' +
                '</div>';
            root.appendChild(bd);
            var okBtn = document.getElementById('biosFlashOk');
            var cancelBtn = document.getElementById('biosFlashCancel');
            // Default focus on Cancel so accidental Enter does not
            // trigger the flash.
            cancelBtn.focus();
            cancelBtn.addEventListener('click', function() { bd.remove(); });
            okBtn.addEventListener('click', function() {
                bd.remove();
                launchFlashOverlay();
            });
            // Local key handling: Esc cancels, Enter on the focused
            // button triggers that button. We listen on the backdrop
            // and call stopPropagation so the BIOS root handler
            // doesn't also process the same Escape.
            bd.addEventListener('keydown', function(e) {
                if (e.key === 'Escape') {
                    e.preventDefault();
                    e.stopPropagation();
                    bd.remove();
                }
            }, true);
        }

        // Supervisor password prompt. The factory default is the
        // string "GDX2001" (an Easter egg printed on a yellow
        // sticker on the underside of the appliance per the help
        // docs). Typing that string and pressing OK clears the
        // password (sets it to "Not Installed"); typing anything
        // else sets it (which has no effect on the satire). Empty
        // input cancels. The dialog is a small overlay anchored
        // over the BIOS screen; we don't dismiss the BIOS itself.
        function promptSupervisorPassword() {
            // If the password has already been cleared, allow the
            // user to set a new one. The narrative still doesn't
            // care about a new value, but the field flips back
            // to Installed.
            var alreadyCleared = settings.adminPwd === 'Not Installed';
            var bd = document.createElement('div');
            bd.className = 'bios-prompt-backdrop';
            bd.innerHTML =
                '<div class="bios-prompt">' +
                '<div class="bios-prompt-title">' +
                (alreadyCleared
                    ? 'Set Supervisor Password'
                    : 'Enter current Supervisor Password to clear it') +
                '</div>' +
                '<div class="bios-prompt-body">' +
                '<label>' +
                (alreadyCleared
                    ? 'New password (empty cancels):'
                    : 'Current password (empty cancels):') +
                '</label>' +
                '<input type="password" class="bios-prompt-input" id="biosPwdInput" autocomplete="off" />' +
                '</div>' +
                '<div class="bios-prompt-footer">' +
                '<button class="bios-prompt-btn" id="biosPwdOk">OK</button>' +
                '<button class="bios-prompt-btn" id="biosPwdCancel">Cancel</button>' +
                '</div>' +
                '</div>';
            root.appendChild(bd);
            var input = document.getElementById('biosPwdInput');
            if (input) input.focus();
            document.getElementById('biosPwdCancel').addEventListener('click', function() {
                bd.remove();
            });
            document.getElementById('biosPwdOk').addEventListener('click', function() {
                var v = input.value || '';
                bd.remove();
                if (alreadyCleared) {
                    if (v.length > 0) {
                        settings.adminPwd = 'Installed';
                        if (window.showToast) window.showToast('BIOS: Supervisor Password set.');
                    }
                } else {
                    // The factory default is "GDX2001". Anything
                    // else is rejected with an error toast.
                    if (v === 'GDX2001') {
                        settings.adminPwd = 'Not Installed';
                        if (window.showToast) window.showToast('BIOS: Supervisor Password cleared. Firmware tab now available after disabling Flash Write Protect.');
                    } else if (v.length === 0) {
                        // Empty cancels.
                    } else {
                        if (window.showToast) window.showToast('BIOS: incorrect password.');
                    }
                }
                render();
            });
            // Enter / Esc shortcuts.
            input.addEventListener('keydown', function(e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    document.getElementById('biosPwdOk').click();
                } else if (e.key === 'Escape') {
                    e.preventDefault();
                    document.getElementById('biosPwdCancel').click();
                }
            });
        }

        // Hand off to the coreboot module's flash overlay. We close
        // BIOS Setup (saving the current settings) so the overlay
        // owns the screen for its 8-stage sequence. After the flash,
        // the post-flash takeover replaces everything.
        function launchFlashOverlay() {
            if (!window.SRV2K3_COREBOOT || typeof window.SRV2K3_COREBOOT.runFlashSequence !== 'function') {
                if (window.showToast) window.showToast('Modulul de flash nu este disponibil în această imagine.');
                return;
            }
            // Save BIOS state (the user has already disabled WP and
            // cleared the password, both of which need to persist
            // through the flash narrative).
            try { sessionStorage.setItem('ide.bios.v1', JSON.stringify(settings)); } catch (e) {}
            if (!STATE.bios) STATE.bios = {};
            for (var k in settings) STATE.bios[k] = settings[k];
            // Tear down BIOS Setup and the keydown handler.
            root.remove();
            document.removeEventListener('keydown', onKey, true);
            // Run the flash. The overlay hard-locks input until the
            // sequence finishes or the user aborts.
            window.SRV2K3_COREBOOT.runFlashSequence();
        }
        // Hydrate previously-saved BIOS state (set by F10 / Save Exit)
        // so the same settings persist between visits to Setup.
        try {
            var saved = JSON.parse(sessionStorage.getItem('ide.bios.v1') || 'null');
            if (saved && typeof saved === 'object') {
                for (var k in saved) if (Object.prototype.hasOwnProperty.call(saved, k)) settings[k] = saved[k];
            }
        } catch (e) {}

        // Snapshot settings on entry, used by exit() to compute
        // which fields actually changed during this Setup session.
        // The diff drives applyBiosEffects(); fields that didn\'t
        // change emit no balloon and trigger no state flip.
        var entrySnapshot = {};
        for (var ek in settings) entrySnapshot[ek] = settings[ek];

        function exit(saved) {
            if (saved) {
                // Some settings can\'t change at all on this BIOS
                // revision (Secure Boot is documented as unsupported).
                // Force them back to their entry value before save.
                if (settings.secureBoot !== entrySnapshot.secureBoot) {
                    settings.secureBoot = entrySnapshot.secureBoot;
                }
                try { sessionStorage.setItem('ide.bios.v1', JSON.stringify(settings)); } catch (e) {}
                // Apply impacts immediately. Other parts of the system
                // read window.STATE.bios for things like quick boot and
                // boot device ordering.
                if (!STATE.bios) STATE.bios = {};
                for (var k in settings) STATE.bios[k] = settings[k];
                // Tear down BIOS Setup BEFORE dispatching effects so
                // any BSOD / POST / shutdown overlay gets a clean
                // canvas to mount on.
                root.remove();
                document.removeEventListener('keydown', onKey, true);
                applyBiosEffects(entrySnapshot, settings);
                return;
            }
            root.remove();
            document.removeEventListener('keydown', onKey, true);
        }

        // ============================================================
        // BIOS EFFECT DISPATCHER
        // For every setting that actually changed during this Setup
        // session, fire whatever in-app effect the satire associates
        // with it. Effects fall into three buckets:
        //
        //   IMMEDIATE     change is visible right now (network goes
        //                 down, BSOD appears, shutdown screen text
        //                 flips). These also notify so the user sees
        //                 confirmation.
        //   ON NEXT BOOT  change persists in STATE.bios and a future
        //                 path reads it (boot sequence error in safe-
        //                 off screen, install-animation shows POST
        //                 instead of OEM splash). User sees a
        //                 notification explaining this.
        //   COSMETIC      change is only acknowledged by a notify.
        //                 Used for settings whose simulated effect
        //                 doesn\'t involve any other subsystem in
        //                 the current build (Wake on LAN, ACPI
        //                 Suspend Type, AC Power Loss Restart, etc.)
        //
        // Notifications use window.srv2k3Notify when available so the
        // taskbar tray balloon picks them up; fallback to showToast.
        // ============================================================
        function applyBiosEffects(prev, curr) {
            function notify(text, title) {
                if (typeof window.srv2k3Notify === 'function') {
                    window.srv2k3Notify(text, title || 'BIOS');
                } else if (typeof window.showToast === 'function') {
                    window.showToast(text);
                }
            }
            function diff(key) { return prev[key] !== curr[key]; }

            // Standard "saved" toast first; per-effect notifies follow.
            notify('Setări BIOS salvate. Unele schimbări pot afecta pornirea sistemului.', 'BIOS');

            // ---------- IMMEDIATE EFFECTS ----------

            // APIC Mode: Server 2003 needs APIC. Disabling it triggers
            // an immediate STOP 0x000000A5 BSOD (real Windows really
            // does this when ACPI/APIC mismatch happens at boot).
            if (curr.apicMode === 'Disabled') {
                showBsod(
                    'STOP: 0x000000A5 (0x00000011, 0x00000003, 0x00000000, 0x00000000)',
                    'ACPI BIOS ERROR',
                    'The BIOS in this system is not fully ACPI compliant. The OS\\nrequires APIC support to enumerate processor cores.\\n\\nPlease re-enable APIC Mode in BIOS Setup and retry.\\n\\nTechnical information:\\n  *** ACPI.sys - Address F84A26F1 base at F84A1000, DateStamp 41107eea'
                );
                return;
            }

            // Onboard LAN: flipping it changes the live network state.
            // STATE.networkUp is the canonical flag; the taskbar tray
            // updates from it on its next tick. Reconnect badge,
            // role admin "site unreachable" warnings etc. all read it.
            if (diff('onboardLan')) {
                if (curr.onboardLan === 'Disabled') {
                    if (typeof window.STATE !== 'undefined') window.STATE.networkUp = false;
                    notify(
                        'On-board LAN dezactivat. Aparatul este offline. Site-urile IIS și flash-ul firmware prin PXE nu mai sunt accesibile.',
                        'Rețea'
                    );
                } else {
                    if (typeof window.STATE !== 'undefined') window.STATE.networkUp = true;
                    notify(
                        'On-board LAN reactivat. Conexiunea la rețea este disponibilă.',
                        'Rețea'
                    );
                }
            }

            // ---------- BALLOON-NOTICE EFFECTS ----------
            // Each of these documents what the change implies. The
            // change is honored by the relevant subsystem when reached
            // (shutdown flow, install animation, coreboot flash etc.)

            if (diff('acpiFunc')) {
                if (curr.acpiFunc === 'Disabled') {
                    notify(
                        'ACPI dezactivat. Sistemul nu se va opri singur la închidere; ecranul „Acum puteți opri în siguranță\" va cere oprirea manuală a alimentării.',
                        'Power'
                    );
                } else {
                    notify(
                        'ACPI activat. Sistemul se va opri automat la finalul procedurii de închidere.',
                        'Power'
                    );
                }
            }

            if (diff('pxeRom')) {
                if (curr.pxeRom === 'Disabled') {
                    notify(
                        'PXE Option ROM dezactivat. Boot prin rețea este indisponibil; flash-ul coreboot prin PXE va eșua.',
                        'Boot'
                    );
                } else {
                    notify(
                        'PXE Option ROM activat. Boot prin rețea este disponibil.',
                        'Boot'
                    );
                }
            }

            if (diff('sataMode') && curr.sataMode !== 'Compatibility') {
                notify(
                    'SATA Mode = ' + curr.sataMode + '. Driver-ele instalate așteaptă modul Compatibility; OS-ul ar putea să nu mai pornească (STOP 0x0000007B).',
                    'Storage'
                );
            }

            if (diff('usbLegacy') && curr.usbLegacy === 'Disabled') {
                notify(
                    'USB Legacy Support dezactivat. Tastatura și mouse-ul USB nu vor funcționa în modurile pre-Windows (DOS, GRUB, BIOS Setup la următoarea pornire).',
                    'I/O'
                );
            }

            if (diff('plugAndPlay') && curr.plugAndPlay === 'No') {
                notify(
                    'Plug & Play OS = No. BIOS-ul va enumera el însuși dispozitivele PnP la următoarea pornire; unele driver-e Windows pot raporta resurse duplicate.',
                    'Chipset'
                );
            }

            if (diff('onboardAudio')) {
                notify(
                    curr.onboardAudio === 'Disabled'
                        ? 'Codec audio AC97 dezactivat. Niciun semnal audio.'
                        : 'Codec audio AC97 activat.',
                    'Audio'
                );
            }

            if (diff('numLock')) {
                notify(
                    'NumLock la pornire setat pe „' + curr.numLock + '\". Modificarea se aplică la următoarea pornire.',
                    'Keyboard'
                );
            }

            if (diff('quickBoot')) {
                notify(
                    curr.quickBoot === 'Disabled'
                        ? 'Quick Boot dezactivat. POST-ul complet rulează la următoarea pornire (mai lent, dar mai amănunțit).'
                        : 'Quick Boot activat. POST-ul scurt rulează la următoarea pornire.',
                    'Boot'
                );
            }

            if (diff('quietBoot')) {
                notify(
                    curr.quietBoot === 'Disabled'
                        ? 'Quiet Boot dezactivat. Mesajele POST vor fi vizibile la următoarea pornire (în locul siglei OEM).'
                        : 'Quiet Boot activat. Sigla OEM va înlocui mesajele POST la următoarea pornire.',
                    'Boot'
                );
            }

            // bootSeq is an array; compare by JSON string.
            if (JSON.stringify(prev.bootSeq) !== JSON.stringify(curr.bootSeq)) {
                notify(
                    'Secvența de boot schimbată. Primul dispozitiv încercat la pornire: „' + curr.bootSeq[0] + '\".',
                    'Boot'
                );
            }

            if (diff('virusCheck') && curr.virusCheck === 'Enabled') {
                notify(
                    'Boot Sector Virus Check activat. Orice modificare a sectorului de boot va declanșa o avertizare la pornire.',
                    'Security'
                );
            }

            if (diff('pwdCheck') && curr.pwdCheck === 'Always') {
                notify(
                    'Password Check = Always. Parola supervizor va fi cerută la fiecare pornire, nu doar la intrarea în Setup.',
                    'Security'
                );
            }

            if (diff('acpiSuspend')) {
                notify(
                    'ACPI Suspend Type = ' + curr.acpiSuspend + '. Modul aplicat la următoarea cerere de suspendare.',
                    'Power'
                );
            }

            if (diff('wakeOnLan')) {
                notify(
                    curr.wakeOnLan === 'Enabled'
                        ? 'Wake on LAN activat. Magic packet poate trezi aparatul din S3.'
                        : 'Wake on LAN dezactivat. Aparatul poate fi trezit doar local.',
                    'Power'
                );
            }

            if (diff('wakeOnRing') && curr.wakeOnRing === 'Enabled') {
                notify(
                    'Wake on Modem Ring activat. Aparatul se va trezi la primul Ring Indicator pe COM1.',
                    'Power'
                );
            }

            if (diff('acLossRestart')) {
                notify(
                    'AC Power Loss Restart = ' + curr.acLossRestart + '. Comportament la revenirea curentului: ' +
                        (curr.acLossRestart === 'On' ? 'pornește automat.'
                            : curr.acLossRestart === 'Last State' ? 'restaurează starea anterioară.'
                            : 'rămâne oprit (operatorul trebuie să apese power).'),
                    'Power'
                );
            }

            // firmwareWP is already reflected by the Firmware tab
            // becoming visible / hidden, so no extra notification.
            // adminPwd was changed via promptSupervisorPassword which
            // toasts on its own; suppress the diff here.

            if (diff('secureBoot')) {
                notify(
                    'Secure Boot nu este implementat pe această revizie. Modificarea a fost ignorată.',
                    'BIOS'
                );
            }
        }

        // STOP-screen overlay used when an unbootable change is saved
        // (currently APIC Mode = Disabled). Renders an authentic
        // Win32 BSOD palette with a primary STOP code and a
        // technical-information block; clicking anywhere clears the
        // BSOD and reopens BIOS Setup so the user can revert.
        function showBsod(stopLine, errName, info) {
            var bd = document.createElement('div');
            bd.id = 'biosBsod';
            bd.className = 'srv2k3-bsod';
            bd.innerHTML =
                '<div class="srv2k3-bsod-inner">' +
                '<div class="srv2k3-bsod-line">A problem has been detected and Windows has been shut down to prevent damage to your computer.</div>' +
                '<div class="srv2k3-bsod-line">' + errName + '</div>' +
                '<div class="srv2k3-bsod-line">If this is the first time you have seen this Stop error screen,</div>' +
                '<div class="srv2k3-bsod-line">restart your computer. If this screen appears again, follow these steps:</div>' +
                '<div class="srv2k3-bsod-line">&nbsp;</div>' +
                '<div class="srv2k3-bsod-line">' + info.replace(/\\n/g, '</div><div class="srv2k3-bsod-line">') + '</div>' +
                '<div class="srv2k3-bsod-line">&nbsp;</div>' +
                '<div class="srv2k3-bsod-line">' + stopLine + '</div>' +
                '<div class="srv2k3-bsod-line">&nbsp;</div>' +
                '<div class="srv2k3-bsod-line">Click anywhere to return to BIOS Setup.</div>' +
                '</div>';
            document.body.appendChild(bd);
            bd.addEventListener('click', function() {
                bd.remove();
                openBiosSetup();
            });
        }
        function onKey(e) {
            if (e.key === 'ArrowUp')        { moveField(-1); e.preventDefault(); }
            else if (e.key === 'ArrowDown') { moveField(1);  e.preventDefault(); }
            else if (e.key === 'ArrowLeft') { moveTab(-1);   e.preventDefault(); }
            else if (e.key === 'ArrowRight'){ moveTab(1);    e.preventDefault(); }
            else if (e.key === '+' || e.key === '=') { changeValue(1);  e.preventDefault(); }
            else if (e.key === '-' || e.key === '_') { changeValue(-1); e.preventDefault(); }
            else if (e.key === 'Enter') { activate(); e.preventDefault(); }
            else if (e.key === 'Escape') { exit(false); e.preventDefault(); }
            else if (e.key === 'F10') { exit(true); e.preventDefault(); }
            else if (e.key === 'F9')  { settings.quickBoot = 'Enabled'; settings.quietBoot = 'Disabled'; settings.numLock = 'On'; settings.virusCheck = 'Disabled'; render(); e.preventDefault(); }
        }
        document.addEventListener('keydown', onKey, true);
    }


    window.openBiosSetup = openBiosSetup;
})();
