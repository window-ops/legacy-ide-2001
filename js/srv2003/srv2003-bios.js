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
            sysTime:     '14:32:08',
            sysDate:     '01/05/2026',
            cpuFreq:     '1.86 GHz (Intel Pentium 4)',
            totalMem:    '512 MB',
            bootSeq:     ['Floppy Drive', 'Hard Drive', 'CD-ROM Drive', 'Network Boot'],
            quietBoot:   'Disabled',
            quickBoot:   'Enabled',
            numLock:     'On',
            virusCheck:  'Disabled',
            secureBoot:  'Off',
            adminPwd:    'Not Installed',
            userPwd:     'Not Installed',
            sataMode:    'Compatibility',
            usbLegacy:   'Enabled',
            apicMode:    'Enabled'
        };

        var TABS = [
            { id: 'main',     label: 'Main' },
            { id: 'advanced', label: 'Advanced' },
            { id: 'boot',     label: 'Boot' },
            { id: 'security', label: 'Security' },
            { id: 'exit',     label: 'Exit' }
        ];
        // Each tab has its own list of fields. Type 'info' is read-only
        // text; 'toggle' cycles through the choices array; 'time' /
        // 'date' are read-only display fields; 'order' is a reorderable
        // list (Boot Sequence); 'action' fires on Enter.
        var TAB_FIELDS = {
            main: [
                { id: 'sysTime',  label: 'System Time',  type: 'info', help: 'The system time. Format is HH:MM:SS.' },
                { id: 'sysDate',  label: 'System Date',  type: 'info', help: 'The system date. Format is DD/MM/YYYY.' },
                { id: 'cpuFreq',  label: 'CPU Speed',    type: 'info', help: 'The detected processor frequency.' },
                { id: 'totalMem', label: 'Total Memory', type: 'info', help: 'The total amount of installed system memory.' }
            ],
            advanced: [
                { id: 'sataMode',   label: 'SATA Mode',          type: 'toggle', choices: ['Compatibility', 'AHCI', 'RAID'], help: 'Selects the operating mode of the on-board SATA controller. Changing this may render the OS unbootable.' },
                { id: 'usbLegacy',  label: 'USB Legacy Support', type: 'toggle', choices: ['Enabled', 'Disabled'], help: 'Enables BIOS support for USB keyboards and mice in legacy operating systems.' },
                { id: 'apicMode',   label: 'APIC Mode',          type: 'toggle', choices: ['Enabled', 'Disabled'], help: 'Allows the use of advanced interrupt controller features.' },
                { id: 'numLock',    label: 'NumLock at Boot',    type: 'toggle', choices: ['On', 'Off'], help: 'Sets the initial state of the NumLock key after POST.' }
            ],
            boot: [
                { id: 'quickBoot', label: 'Quick Boot', type: 'toggle', choices: ['Enabled', 'Disabled'], help: 'Skips the extended POST tests to speed up boot.' },
                { id: 'quietBoot', label: 'Quiet Boot', type: 'toggle', choices: ['Enabled', 'Disabled'], help: 'Hides the POST messages and shows the OEM logo.' },
                { id: 'bootSeq',   label: 'Boot Sequence', type: 'order', help: 'Reorder the boot devices. Use + and - to move the highlighted device up or down.' }
            ],
            security: [
                { id: 'adminPwd',   label: 'Supervisor Password', type: 'info', help: 'The password protecting BIOS Setup. Press Enter on this field to set or change.' },
                { id: 'userPwd',    label: 'User Password',       type: 'info', help: 'The password required at boot. Press Enter on this field to set or change.' },
                { id: 'secureBoot', label: 'Secure Boot',         type: 'toggle', choices: ['Off', 'On'], help: 'Phoenix-only: not implemented on this BIOS revision.' },
                { id: 'virusCheck', label: 'Virus Check',         type: 'toggle', choices: ['Enabled', 'Disabled'], help: 'Warns when the boot sector is being modified.' }
            ],
            exit: [
                { id: 'saveExit',   label: 'Exit Saving Changes',     type: 'action', help: 'Save the current values and exit. F10.' },
                { id: 'discardExit', label: 'Exit Discarding Changes', type: 'action', help: 'Discard the current values and exit.' },
                { id: 'loadDefaults', label: 'Load Setup Defaults',  type: 'action', help: 'Restore all settings to factory defaults.' },
                { id: 'discardChanges', label: 'Discard Changes',    type: 'action', help: 'Revert the unsaved changes back to their previous values.' }
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
            var tab = TABS[tabIdx];
            var fields = TAB_FIELDS[tab.id];
            if (fieldIdx >= fields.length) fieldIdx = fields.length - 1;
            if (fieldIdx < 0) fieldIdx = 0;
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
                else if (f.type === 'action') val = '';
                return '<div class="bios-field' + sel + '" data-bios-field="' + i + '">' +
                    '<span class="bios-field-label">' + f.label + (f.type === 'action' ? '' : ':') + '</span>' +
                    '<span class="bios-field-value">' + val + '</span>' +
                    '</div>';
            }).join('');
        }

        function moveField(dir) {
            var fields = TAB_FIELDS[TABS[tabIdx].id];
            fieldIdx = (fieldIdx + dir + fields.length) % fields.length;
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
                    render();
                } else if (f.id === 'discardChanges') {
                    render();
                }
            } else if (f.id === 'adminPwd' || f.id === 'userPwd') {
                // No-op: real BIOS pops a password set dialog. We just
                // toast an explanation rather than overlay another modal.
                if (window.showToast) window.showToast('Password set: not implemented on this revision.');
            }
        }
        // Hydrate previously-saved BIOS state (set by F10 / Save Exit)
        // so the same settings persist between visits to Setup.
        try {
            var saved = JSON.parse(sessionStorage.getItem('ide.bios.v1') || 'null');
            if (saved && typeof saved === 'object') {
                for (var k in saved) if (Object.prototype.hasOwnProperty.call(saved, k)) settings[k] = saved[k];
            }
        } catch (e) {}

        function exit(saved) {
            if (saved) {
                try { sessionStorage.setItem('ide.bios.v1', JSON.stringify(settings)); } catch (e) {}
                // Apply impacts immediately. Other parts of the system
                // read window.STATE.bios for things like quick boot and
                // boot device ordering.
                if (!STATE.bios) STATE.bios = {};
                for (var k in settings) STATE.bios[k] = settings[k];
                if (window.showToast) window.showToast('BIOS: setări salvate.');
            }
            root.remove();
            document.removeEventListener('keydown', onKey, true);
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
