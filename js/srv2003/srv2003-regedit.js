/* ============================================================
   REGISTRY EDITOR (regedit)
   Tree-structured registry editor with three functional keys
   that affect runtime behavior, plus the standard set of empty
   parent keys so the tree feels real.

   FUNCTIONAL KEYS (user can change values, system observes them):

   HKLM\\SOFTWARE\\GDX\\AllowTransitional (DWORD)
     0 = strict programa enforcement (default)
     1 = alternate bypass route, even when the backend is up, the
         lint runs in non-blocking mode. Same effect as setting
         curriculumNonBlocking via Dr. Watson, but persisted in
         the registry so it survives reloads.

   HKLM\\SYSTEM\\CurrentControlSet\\Services\\CurriculumReporting\\Start (DWORD)
     2 = Auto (service running, backend reachable when network up)
     4 = Disabled (service stopped, backend unreachable)
     Mirrors the Curriculum Reporting site state in IIS.

   HKLM\\SYSTEM\\CurrentControlSet\\Services\\Tcpip\\Parameters\\EnableSecurityFilters (DWORD)
     Cosmetic. Demonstrates the UI works on arbitrary keys.

   Storage key: 'ide.srv2k3.registry.v1'
   ============================================================ */
(function() {
    var WIN_ID = 'regeditWin';
    var STORAGE_KEY = 'ide.srv2k3.registry.v1';

    // The registry shape: a tree of keys, each with `values` (a map of
    // value-name → {type, data}) and `children` (a map of subkey name → key).
    function defaultTree() {
        return {
            'HKEY_LOCAL_MACHINE': {
                values: {},
                children: {
                    'HARDWARE':  { values: {}, children: {} },
                    'SAM':       { values: {}, children: {} },
                    'SECURITY':  { values: {}, children: {} },
                    'SOFTWARE': {
                        values: {},
                        children: {
                            'GDX': {
                                values: {
                                    '(Default)':         { type: 'REG_SZ', data: 'GDX School Appliance' },
                                    'AllowTransitional': { type: 'REG_DWORD', data: 0 },
                                    'InstallVersion':    { type: 'REG_SZ', data: '2.0.1.847' }
                                },
                                children: {}
                            },
                            'Microsoft': { values: {}, children: {} },
                            'ODBC':      { values: {}, children: {} }
                        }
                    },
                    'SYSTEM': {
                        values: {},
                        children: {
                            'CurrentControlSet': {
                                values: {},
                                children: {
                                    'Services': {
                                        values: {},
                                        children: {
                                            'CurriculumReporting': {
                                                values: {
                                                    '(Default)':   { type: 'REG_SZ', data: '' },
                                                    'DisplayName': { type: 'REG_SZ', data: 'Curriculum Reporting Service' },
                                                    'ImagePath':   { type: 'REG_EXPAND_SZ', data: '%SystemRoot%\\System32\\svchost.exe -k netsvcs' },
                                                    'Start':       { type: 'REG_DWORD', data: 2 },
                                                    'Type':        { type: 'REG_DWORD', data: 16 }
                                                },
                                                children: {}
                                            },
                                            'Tcpip': {
                                                values: {},
                                                children: {
                                                    'Parameters': {
                                                        values: {
                                                            'EnableSecurityFilters': { type: 'REG_DWORD', data: 1 },
                                                            'Hostname':              { type: 'REG_SZ', data: 'GDX-APPLIANCE' },
                                                            'Domain':                { type: 'REG_SZ', data: 'gdx.local' }
                                                        },
                                                        children: {}
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            },
            'HKEY_CURRENT_USER': { values: {}, children: { 'Software': { values: {}, children: {} }, 'Console': { values: {}, children: {} } } },
            'HKEY_CLASSES_ROOT': { values: {}, children: {} },
            'HKEY_USERS':        { values: {}, children: {} },
            'HKEY_CURRENT_CONFIG': { values: {}, children: {} }
        };
    }

    function loadTree() {
        try {
            var raw = sessionStorage.getItem(STORAGE_KEY);
            if (raw) return JSON.parse(raw);
        } catch (e) {}
        var tree = defaultTree();
        save(tree);
        return tree;
    }
    function save(tree) {
        try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(tree)); } catch (e) {}
    }
    function clear() {
        try { sessionStorage.removeItem(STORAGE_KEY); } catch (e) {}
    }

    // Walk the tree by path string like "HKEY_LOCAL_MACHINE\SOFTWARE\GDX".
    function walk(tree, path) {
        var parts = path.split('\\');
        var node = tree[parts[0]];
        for (var i = 1; i < parts.length && node; i++) {
            node = node.children && node.children[parts[i]];
        }
        return node;
    }

    function esc(s) {
        return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    // Apply a value change to the runtime STATE so it has effect.
    function applyEffect(path, valueName, newValue) {
        if (path === 'HKEY_LOCAL_MACHINE\\SOFTWARE\\GDX' && valueName === 'AllowTransitional') {
            // 1 → curriculumNonBlocking (alternate bypass route).
            STATE.binaryPatches = STATE.binaryPatches || {};
            STATE.binaryPatches.curriculumNonBlocking = (parseInt(newValue, 10) === 1);
            if (typeof srv2k3Notify === 'function') {
                srv2k3Notify(
                    parseInt(newValue, 10) === 1 ?
                        'AllowTransitional=1: programa va rula în mod non-blocking.' :
                        'AllowTransitional=0: programa revine la modul strict.',
                    'regedit'
                );
            }
            if (window.SRV2K3_EVENTLOG) {
                window.SRV2K3_EVENTLOG.write({
                    log: 'System', source: 'Service Control Manager', type: 'Information', eventID: 7040,
                    message: 'Cheia HKLM\\SOFTWARE\\GDX\\AllowTransitional a fost setată la ' + newValue + '.'
                });
            }
        } else if (path === 'HKEY_LOCAL_MACHINE\\SYSTEM\\CurrentControlSet\\Services\\CurriculumReporting' && valueName === 'Start') {
            // 2 → Auto (running), 4 → Disabled (stopped). Update both the
            // backend flag AND the persisted IIS site list so the role
            // admin reflects it on next open.
            var n = parseInt(newValue, 10);
            var running = (n === 2);
            // Honor the network gate.
            var netUp = STATE.networkUp !== false;
            if (netUp) {
                STATE.serverBackendOnline = running;
            } else {
                STATE._backendBeforeDown = running;
                STATE.serverBackendOnline = false;
            }
            // Sync into SRV2K3_STATE so the IIS admin shows it.
            if (window.SRV2K3_STATE) {
                var data = window.SRV2K3_STATE.load() || {};
                if (!data.sites) {
                    data.sites = [
                        { desc: 'Default Web Site', state: 'Running' },
                        { desc: 'Microsoft SharePoint Administration', state: 'Running' },
                        { desc: 'Curriculum Reporting', state: running ? 'Running' : 'Stopped' }
                    ];
                } else {
                    var c = data.sites.find(function(s) { return s.desc === 'Curriculum Reporting'; });
                    if (c) c.state = running ? 'Running' : 'Stopped';
                }
                window.SRV2K3_STATE.save(data);
            }
            if (window.SRV2K3_EVENTLOG) {
                window.SRV2K3_EVENTLOG.write({
                    log: 'System', source: 'Service Control Manager', type: 'Information', eventID: 7036,
                    message: 'Serviciul „CurriculumReporting" este în stare de ' + (running ? 'Pornit' : 'Oprit') + ' (registry).'
                });
            }
            if (typeof srv2k3Notify === 'function') {
                srv2k3Notify(
                    running ?
                        'Serviciul CurriculumReporting este pornit.' :
                        'Serviciul CurriculumReporting este oprit. Backend-ul devine inaccesibil.',
                    'Service Control'
                );
            }
        }
    }

    function openRegedit() {
        if (document.getElementById(WIN_ID)) return;
        var tree = loadTree();
        var activePath = 'HKEY_LOCAL_MACHINE\\SOFTWARE\\GDX';
        var expanded = {
            'HKEY_LOCAL_MACHINE': true,
            'HKEY_LOCAL_MACHINE\\SOFTWARE': true,
            'HKEY_LOCAL_MACHINE\\SYSTEM': true,
            'HKEY_LOCAL_MACHINE\\SYSTEM\\CurrentControlSet': true,
            'HKEY_LOCAL_MACHINE\\SYSTEM\\CurrentControlSet\\Services': true
        };

        var bd = document.createElement('div');
        bd.id = WIN_ID;
        bd.className = 'dialog-backdrop open srv2k3-regedit';
        bd.setAttribute('role', 'dialog');
        bd.setAttribute('aria-modal', 'true');
        bd.setAttribute('aria-label', 'Registry Editor');
        document.body.appendChild(bd);
        render();

        function render() {
            var node = walk(tree, activePath);
            var values = (node && node.values) || {};
            var valueRows = Object.keys(values).map(function(name) {
                var v = values[name];
                var dataDisplay;
                if (v.type === 'REG_DWORD') {
                    dataDisplay = '0x' + (v.data | 0).toString(16).padStart(8, '0') + ' (' + v.data + ')';
                } else if (v.type === 'REG_BINARY') {
                    dataDisplay = '(binary)';
                } else if (v.data === '' || v.data === null || v.data === undefined) {
                    dataDisplay = '(value not set)';
                } else {
                    dataDisplay = v.data;
                }
                return '<tr class="reg-value-row" data-reg-name="' + esc(name) + '">' +
                    '<td><span class="reg-val-icon">ab</span> ' + esc(name) + '</td>' +
                    '<td>' + v.type + '</td>' +
                    '<td class="reg-val-data">' + esc(String(dataDisplay)) + '</td>' +
                    '</tr>';
            }).join('') || '<tr><td colspan="3" class="reg-empty">(această cheie nu are valori)</td></tr>';

            bd.innerHTML =
                '<div class="dialog" style="max-width: 920px;">' +
                '<div class="dialog-header">Registry Editor</div>' +
                '<div class="dialog-body" style="padding: 0;">' +
                '<div class="reg-toolbar">' +
                '<span class="reg-path">' + esc(activePath) + '</span>' +
                '</div>' +
                '<div class="reg-split">' +
                '<div class="reg-tree" id="regTree">' + renderTree(tree, '', 0) + '</div>' +
                '<div class="reg-pane">' +
                '<table class="reg-table">' +
                '<thead><tr><th>Nume</th><th>Tip</th><th>Date</th></tr></thead>' +
                '<tbody>' + valueRows + '</tbody>' +
                '</table>' +
                '</div>' +
                '</div>' +
                '</div>' +
                '<div class="dialog-footer">' +
                '<button class="btn suggested" data-run-close>Închide</button>' +
                '</div>' +
                '</div>';
            wire();
        }

        function renderTree(subtree, parentPath, depth) {
            var html = '';
            var keys = Object.keys(subtree).sort();
            keys.forEach(function(name) {
                var path = parentPath ? (parentPath + '\\' + name) : name;
                var children = subtree[name].children || {};
                var hasChildren = Object.keys(children).length > 0;
                var isExpanded = !!expanded[path];
                var isActive = (path === activePath);
                var twirl = hasChildren ? (isExpanded ? '\u25BC' : '\u25B6') : ' ';
                html += '<div class="reg-tree-item' + (isActive ? ' active' : '') +
                    '" data-reg-path="' + esc(path) + '" style="padding-left:' + (depth * 14 + 4) + 'px;">' +
                    '<span class="reg-twirl" data-reg-twirl="' + esc(path) + '">' + twirl + '</span>' +
                    '<span class="reg-folder-icon">\uD83D\uDCC1</span>' +
                    '<span class="reg-tree-name">' + esc(name) + '</span>' +
                    '</div>';
                if (isExpanded && hasChildren) {
                    html += renderTree(children, path, depth + 1);
                }
            });
            return html;
        }

        function wire() {
            bd.onclick = function(e) {
                if (e.target === bd || (e.target.getAttribute && e.target.getAttribute('data-run-close') != null)) {
                    bd.remove();
                }
            };
            bd.querySelectorAll('[data-reg-twirl]').forEach(function(el) {
                el.addEventListener('click', function(e) {
                    e.stopPropagation();
                    var p = el.getAttribute('data-reg-twirl');
                    expanded[p] = !expanded[p];
                    render();
                });
            });
            bd.querySelectorAll('[data-reg-path]').forEach(function(el) {
                el.addEventListener('click', function() {
                    activePath = el.getAttribute('data-reg-path');
                    expanded[activePath] = true;
                    render();
                });
            });
            bd.querySelectorAll('[data-reg-name]').forEach(function(row) {
                row.addEventListener('dblclick', function() {
                    editValue(row.getAttribute('data-reg-name'));
                });
            });
        }

        function editValue(name) {
            var node = walk(tree, activePath);
            if (!node || !node.values || !node.values[name]) return;
            var v = node.values[name];
            // (Default) is read-only here.
            if (name === '(Default)') return;
            var ed = document.createElement('div');
            ed.className = 'dialog-backdrop open srv2k3-regedit-edit';
            ed.setAttribute('role', 'dialog');
            ed.setAttribute('aria-modal', 'true');
            var fieldHtml;
            if (v.type === 'REG_DWORD') {
                fieldHtml =
                    '<div class="reg-edit-row">' +
                    '<label>Valoare:</label>' +
                    '<input type="number" id="regEditValue" value="' + (v.data | 0) + '" min="0" />' +
                    '</div>' +
                    '<div class="reg-edit-base">' +
                    '<label><input type="radio" name="regBase" value="hex"> Hexazecimal</label>' +
                    '<label><input type="radio" name="regBase" value="dec" checked> Zecimal</label>' +
                    '</div>';
            } else {
                fieldHtml =
                    '<div class="reg-edit-row">' +
                    '<label>Valoare:</label>' +
                    '<input type="text" id="regEditValue" value="' + esc(String(v.data || '')) + '" />' +
                    '</div>';
            }
            ed.innerHTML =
                '<div class="dialog" style="max-width: 420px;">' +
                '<div class="dialog-header">Editare ' + (v.type === 'REG_DWORD' ? 'valoare DWORD' : 'șir') + '</div>' +
                '<div class="dialog-body">' +
                '<div class="reg-edit-row">' +
                '<label>Nume valoare:</label>' +
                '<input type="text" value="' + esc(name) + '" disabled />' +
                '</div>' +
                fieldHtml +
                '</div>' +
                '<div class="dialog-footer">' +
                '<button class="btn suggested" id="regEditOk">OK</button>' +
                '<button class="btn" data-run-close>Anulare</button>' +
                '</div>' +
                '</div>';
            document.body.appendChild(ed);
            ed.onclick = function(ev) {
                if (ev.target === ed || (ev.target.getAttribute && ev.target.getAttribute('data-run-close') != null)) {
                    ed.remove();
                }
            };
            var input = ed.querySelector('#regEditValue');
            if (input) input.focus();
            ed.querySelector('#regEditOk').addEventListener('click', function() {
                var raw = input.value;
                var newData;
                if (v.type === 'REG_DWORD') {
                    newData = parseInt(raw, 10);
                    if (isNaN(newData) || newData < 0) newData = 0;
                } else {
                    newData = raw;
                }
                v.data = newData;
                save(tree);
                applyEffect(activePath, name, newData);
                ed.remove();
                render();
            });
        }
    }

    window.openRegedit = openRegedit;
    window.SRV2K3_REGEDIT = { clear: clear };
})();
