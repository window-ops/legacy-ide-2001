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
    var STORAGE_KEY = 'ide.srv2k3.registry.v2';

    // The registry shape: a tree of keys, each with `values` (a map of
    // value-name → {type, data}) and `children` (a map of subkey name → key).
    // Helper to keep the literal tree shorter: build a "leaf" key with
    // values but no children.
    function leaf(values) { return { values: values, children: {} }; }

    function defaultTree() {
        return {
            'HKEY_LOCAL_MACHINE': {
                values: {},
                children: {
                    'HARDWARE': {
                        values: {},
                        children: {
                            'ACPI':     leaf({ '(Default)': { type: 'REG_SZ', data: '' } }),
                            'DESCRIPTION': {
                                values: {},
                                children: {
                                    'System': leaf({
                                        '(Default)':            { type: 'REG_SZ', data: '' },
                                        'Component Information': { type: 'REG_BINARY', data: '00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 ff ff ff ff' },
                                        'Identifier':           { type: 'REG_SZ', data: 'AT/AT COMPATIBLE' },
                                        'SystemBiosDate':       { type: 'REG_SZ', data: '08/14/02' },
                                        'SystemBiosVersion':    { type: 'REG_MULTI_SZ', data: 'PhoenixBIOS 4.0 Release 6.0\\nGDX-APPLIANCE-A04' },
                                        'VideoBiosVersion':     { type: 'REG_MULTI_SZ', data: 'NVIDIA RIVA TNT2 BIOS' }
                                    })
                                }
                            },
                            'DEVICEMAP': {
                                values: {},
                                children: {
                                    'SERIALCOMM': leaf({
                                        '\\Device\\Serial0': { type: 'REG_SZ', data: 'COM1' },
                                        '\\Device\\Serial1': { type: 'REG_SZ', data: 'COM2' }
                                    }),
                                    'PARALLEL PORTS':  leaf({ '\\Device\\Parallel0': { type: 'REG_SZ', data: 'LPT1' } }),
                                    'KeyboardClass': leaf({ '\\Device\\KeyboardClass0': { type: 'REG_SZ', data: '\\REGISTRY\\Machine\\System\\ControlSet001\\Services\\i8042prt' } })
                                }
                            },
                            'RESOURCEMAP': leaf({ '(Default)': { type: 'REG_SZ', data: '' } })
                        }
                    },
                    'SAM':      leaf({ '(Default)': { type: 'REG_SZ', data: '' } }),
                    'SECURITY': leaf({ '(Default)': { type: 'REG_SZ', data: '' } }),
                    'SOFTWARE': {
                        values: {
                            '(Default)': { type: 'REG_SZ', data: '' }
                        },
                        children: {
                            'Classes': {
                                values: {},
                                children: {
                                    '.txt':      leaf({ '(Default)': { type: 'REG_SZ', data: 'txtfile' } }),
                                    '.html':     leaf({ '(Default)': { type: 'REG_SZ', data: 'htmlfile' } }),
                                    '.js':       leaf({ '(Default)': { type: 'REG_SZ', data: 'JSFile' } }),
                                    '.exe':      leaf({ '(Default)': { type: 'REG_SZ', data: 'exefile' } }),
                                    'txtfile':   leaf({ '(Default)': { type: 'REG_SZ', data: 'Text Document' }, 'FriendlyTypeName': { type: 'REG_SZ', data: 'Text Document' } }),
                                    'htmlfile':  leaf({ '(Default)': { type: 'REG_SZ', data: 'HTML Document' } })
                                }
                            },
                            'GDX': {
                                values: {
                                    '(Default)':         { type: 'REG_SZ', data: 'GDX School Appliance' },
                                    'AllowTransitional': { type: 'REG_DWORD', data: 0 },
                                    'InstallVersion':    { type: 'REG_SZ', data: '2.0.1.847' },
                                    'InstallDate':       { type: 'REG_SZ', data: '15/09/2003' },
                                    'Vendor':            { type: 'REG_SZ', data: 'GDX Education Systems Romania SRL' },
                                    'SchoolBranch':      { type: 'REG_SZ', data: 'CT-Constanta-3' },
                                    'CurriculumYear':    { type: 'REG_DWORD', data: 2001 }
                                },
                                children: {
                                    'Curriculum': leaf({
                                        '(Default)':       { type: 'REG_SZ', data: '' },
                                        'EnforcementMode': { type: 'REG_SZ', data: 'strict' },
                                        'RuleCount':       { type: 'REG_DWORD', data: 174 },
                                        'LastSyncDate':    { type: 'REG_SZ', data: '12/04/2026' }
                                    }),
                                    'Photon': leaf({
                                        '(Default)': { type: 'REG_SZ', data: '' },
                                        'KioskMode': { type: 'REG_DWORD', data: 1 }
                                    })
                                }
                            },
                            'Microsoft': {
                                values: {},
                                children: {
                                    'Internet Explorer': leaf({
                                        '(Default)': { type: 'REG_SZ', data: '' },
                                        'Version':   { type: 'REG_SZ', data: '6.0.3790.0' },
                                        'Build':     { type: 'REG_SZ', data: '63790' },
                                        'IVer':      { type: 'REG_SZ', data: '603' }
                                    }),
                                    'Windows': {
                                        values: {},
                                        children: {
                                            'CurrentVersion': leaf({
                                                'ProgramFilesDir':   { type: 'REG_SZ', data: 'C:\\Program Files' },
                                                'CommonFilesDir':    { type: 'REG_SZ', data: 'C:\\Program Files\\Common Files' },
                                                'DevicePath':        { type: 'REG_EXPAND_SZ', data: '%SystemRoot%\\inf' }
                                            })
                                        }
                                    },
                                    'Windows NT': {
                                        values: {},
                                        children: {
                                            'CurrentVersion': leaf({
                                                'CurrentBuild':       { type: 'REG_SZ', data: '3790' },
                                                'CurrentVersion':     { type: 'REG_SZ', data: '5.2' },
                                                'ProductName':        { type: 'REG_SZ', data: 'Microsoft Windows Server 2003' },
                                                'ProductId':          { type: 'REG_SZ', data: '69763-OEM-0000007-00101' },
                                                'RegisteredOrganization': { type: 'REG_SZ', data: 'gdx-appliance' },
                                                'RegisteredOwner':    { type: 'REG_SZ', data: 'defaultuser' },
                                                'CSDVersion':         { type: 'REG_SZ', data: 'Service Pack 1' },
                                                'PathName':           { type: 'REG_SZ', data: 'C:\\WINDOWS' },
                                                'SystemRoot':         { type: 'REG_SZ', data: 'C:\\WINDOWS' }
                                            })
                                        }
                                    }
                                }
                            },
                            'ODBC': {
                                values: {},
                                children: {
                                    'ODBC.INI':   leaf({ '(Default)': { type: 'REG_SZ', data: '' } }),
                                    'ODBCINST.INI': {
                                        values: {},
                                        children: {
                                            'SQL Server': leaf({
                                                'Driver':      { type: 'REG_SZ', data: 'C:\\WINDOWS\\System32\\sqlsrv32.dll' },
                                                'APILevel':    { type: 'REG_SZ', data: '2' }
                                            })
                                        }
                                    }
                                }
                            },
                            'Policies': {
                                values: {},
                                children: {
                                    'Microsoft': leaf({ '(Default)': { type: 'REG_SZ', data: '' } })
                                }
                            }
                        }
                    },
                    'SYSTEM': {
                        values: {},
                        children: {
                            'CurrentControlSet': {
                                values: {},
                                children: {
                                    'Control': {
                                        values: {},
                                        children: {
                                            'ComputerName': {
                                                values: {},
                                                children: {
                                                    'ComputerName': leaf({
                                                        'ComputerName': { type: 'REG_SZ', data: 'GDX-APPLIANCE' }
                                                    }),
                                                    'ActiveComputerName': leaf({
                                                        'ComputerName': { type: 'REG_SZ', data: 'GDX-APPLIANCE' }
                                                    })
                                                }
                                            },
                                            'Print': leaf({ '(Default)': { type: 'REG_SZ', data: '' } }),
                                            'Session Manager': leaf({
                                                'BootExecute':       { type: 'REG_MULTI_SZ', data: 'autocheck autochk *' },
                                                'PendingFileRenameOperations': { type: 'REG_MULTI_SZ', data: '' }
                                            }),
                                            'TimeZoneInformation': leaf({
                                                'StandardName': { type: 'REG_SZ', data: 'GTB Standard Time' },
                                                'DaylightName': { type: 'REG_SZ', data: 'GTB Daylight Time' },
                                                'Bias':         { type: 'REG_DWORD', data: -120 }
                                            })
                                        }
                                    },
                                    'Services': {
                                        values: {},
                                        children: {
                                            'BITS': leaf({
                                                'DisplayName': { type: 'REG_SZ', data: 'Background Intelligent Transfer Service' },
                                                'ImagePath':   { type: 'REG_EXPAND_SZ', data: '%SystemRoot%\\System32\\svchost.exe -k netsvcs' },
                                                'Start':       { type: 'REG_DWORD', data: 3 },
                                                'Type':        { type: 'REG_DWORD', data: 32 }
                                            }),
                                            'CurriculumReporting': leaf({
                                                '(Default)':   { type: 'REG_SZ', data: '' },
                                                'DisplayName': { type: 'REG_SZ', data: 'Curriculum Reporting Service' },
                                                'Description': { type: 'REG_SZ', data: 'Verifică conformitatea programei analitice 2001 a codului trimis de utilizatori.' },
                                                'ImagePath':   { type: 'REG_EXPAND_SZ', data: '%SystemRoot%\\System32\\svchost.exe -k netsvcs' },
                                                'Start':       { type: 'REG_DWORD', data: 2 },
                                                'Type':        { type: 'REG_DWORD', data: 16 },
                                                'ObjectName':  { type: 'REG_SZ', data: 'NT AUTHORITY\\NetworkService' }
                                            }),
                                            'Dhcp': leaf({
                                                'DisplayName': { type: 'REG_SZ', data: 'DHCP Client' },
                                                'Start':       { type: 'REG_DWORD', data: 2 },
                                                'Type':        { type: 'REG_DWORD', data: 32 }
                                            }),
                                            'EventLog': leaf({
                                                'DisplayName': { type: 'REG_SZ', data: 'Event Log' },
                                                'ImagePath':   { type: 'REG_EXPAND_SZ', data: '%SystemRoot%\\System32\\services.exe' },
                                                'Start':       { type: 'REG_DWORD', data: 2 }
                                            }),
                                            'IISADMIN': leaf({
                                                'DisplayName': { type: 'REG_SZ', data: 'IIS Admin Service' },
                                                'ImagePath':   { type: 'REG_EXPAND_SZ', data: '%SystemRoot%\\System32\\inetsrv\\inetinfo.exe' },
                                                'Start':       { type: 'REG_DWORD', data: 2 }
                                            }),
                                            'lanmanserver': leaf({
                                                'DisplayName': { type: 'REG_SZ', data: 'Server' },
                                                'Start':       { type: 'REG_DWORD', data: 2 }
                                            }),
                                            'lanmanworkstation': leaf({
                                                'DisplayName': { type: 'REG_SZ', data: 'Workstation' },
                                                'Start':       { type: 'REG_DWORD', data: 2 }
                                            }),
                                            'RpcSs': leaf({
                                                'DisplayName': { type: 'REG_SZ', data: 'Remote Procedure Call (RPC)' },
                                                'Start':       { type: 'REG_DWORD', data: 2 },
                                                'Type':        { type: 'REG_DWORD', data: 32 }
                                            }),
                                            'Spooler': leaf({
                                                'DisplayName': { type: 'REG_SZ', data: 'Print Spooler' },
                                                'Start':       { type: 'REG_DWORD', data: 2 }
                                            }),
                                            'Tcpip': {
                                                values: {
                                                    'DisplayName': { type: 'REG_SZ', data: 'TCP/IP Protocol Driver' },
                                                    'Start':       { type: 'REG_DWORD', data: 1 }
                                                },
                                                children: {
                                                    'Parameters': leaf({
                                                        'EnableSecurityFilters': { type: 'REG_DWORD', data: 1 },
                                                        'Hostname':              { type: 'REG_SZ', data: 'GDX-APPLIANCE' },
                                                        'Domain':                { type: 'REG_SZ', data: 'gdx.local' },
                                                        'NameServer':            { type: 'REG_SZ', data: '10.0.0.1' },
                                                        'EnableICMPRedirect':    { type: 'REG_DWORD', data: 1 },
                                                        'KeepAliveTime':         { type: 'REG_DWORD', data: 7200000 }
                                                    })
                                                }
                                            },
                                            'TermService': leaf({
                                                'DisplayName': { type: 'REG_SZ', data: 'Terminal Services' },
                                                'Start':       { type: 'REG_DWORD', data: 2 }
                                            }),
                                            'W3SVC': leaf({
                                                'DisplayName': { type: 'REG_SZ', data: 'World Wide Web Publishing Service' },
                                                'Start':       { type: 'REG_DWORD', data: 2 },
                                                'ImagePath':   { type: 'REG_EXPAND_SZ', data: '%SystemRoot%\\System32\\svchost.exe -k iissvcs' }
                                            }),
                                            'WinDefend': leaf({
                                                'DisplayName': { type: 'REG_SZ', data: 'Windows Defender' },
                                                'Start':       { type: 'REG_DWORD', data: 4 }
                                            })
                                        }
                                    }
                                }
                            },
                            'Setup': leaf({
                                'OsLoaderPath':       { type: 'REG_SZ', data: '\\' },
                                'SystemPartition':    { type: 'REG_SZ', data: '\\Device\\Harddisk0\\Partition1' }
                            }),
                            'WPA': leaf({ '(Default)': { type: 'REG_SZ', data: '' } })
                        }
                    }
                }
            },
            'HKEY_CURRENT_USER': {
                values: {},
                children: {
                    'AppEvents':         leaf({ '(Default)': { type: 'REG_SZ', data: '' } }),
                    'Console': leaf({
                        'CursorSize':     { type: 'REG_DWORD', data: 25 },
                        'FaceName':       { type: 'REG_SZ', data: 'Lucida Console' },
                        'FontFamily':     { type: 'REG_DWORD', data: 54 },
                        'FontSize':       { type: 'REG_DWORD', data: 786432 },
                        'HistoryBufferSize': { type: 'REG_DWORD', data: 50 }
                    }),
                    'Control Panel': {
                        values: {},
                        children: {
                            'Desktop':  leaf({
                                'Wallpaper':       { type: 'REG_SZ', data: '' },
                                'TileWallpaper':   { type: 'REG_SZ', data: '0' },
                                'ScreenSaveActive': { type: 'REG_SZ', data: '0' }
                            }),
                            'Mouse':    leaf({
                                'DoubleClickSpeed': { type: 'REG_SZ', data: '500' },
                                'MouseSpeed':       { type: 'REG_SZ', data: '1' }
                            }),
                            'International': leaf({
                                'Locale':            { type: 'REG_SZ', data: '00000418' },
                                'LocaleName':        { type: 'REG_SZ', data: 'ro-RO' },
                                's1159':             { type: 'REG_SZ', data: 'AM' },
                                's2359':             { type: 'REG_SZ', data: 'PM' },
                                'sCurrency':         { type: 'REG_SZ', data: 'lei' },
                                'sDecimal':          { type: 'REG_SZ', data: ',' },
                                'sShortDate':        { type: 'REG_SZ', data: 'dd.MM.yyyy' }
                            })
                        }
                    },
                    'Environment': leaf({
                        'TEMP':  { type: 'REG_EXPAND_SZ', data: '%USERPROFILE%\\Local Settings\\Temp' },
                        'TMP':   { type: 'REG_EXPAND_SZ', data: '%USERPROFILE%\\Local Settings\\Temp' }
                    }),
                    'Software': {
                        values: {},
                        children: {
                            'Microsoft': {
                                values: {},
                                children: {
                                    'Windows': {
                                        values: {},
                                        children: {
                                            'CurrentVersion': {
                                                values: {},
                                                children: {
                                                    'Run':       leaf({ '(Default)': { type: 'REG_SZ', data: '' } }),
                                                    'RunOnce':   leaf({ '(Default)': { type: 'REG_SZ', data: '' } }),
                                                    'Explorer':  leaf({
                                                        'ShellState':      { type: 'REG_BINARY', data: '24 00 00 00' }
                                                    })
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
            'HKEY_CLASSES_ROOT': {
                values: {},
                children: {
                    '.txt':     leaf({ '(Default)': { type: 'REG_SZ', data: 'txtfile' } }),
                    '.html':    leaf({ '(Default)': { type: 'REG_SZ', data: 'htmlfile' } }),
                    'CLSID':    leaf({ '(Default)': { type: 'REG_SZ', data: '' } }),
                    'txtfile':  leaf({ '(Default)': { type: 'REG_SZ', data: 'Text Document' } }),
                    'htmlfile': leaf({ '(Default)': { type: 'REG_SZ', data: 'HTML Document' } })
                }
            },
            'HKEY_USERS': {
                values: {},
                children: {
                    '.DEFAULT':    leaf({ '(Default)': { type: 'REG_SZ', data: '' } }),
                    'S-1-5-18':    leaf({ '(Default)': { type: 'REG_SZ', data: '' } }),
                    'S-1-5-19':    leaf({ '(Default)': { type: 'REG_SZ', data: '' } }),
                    'S-1-5-20':    leaf({ '(Default)': { type: 'REG_SZ', data: '' } })
                }
            },
            'HKEY_CURRENT_CONFIG': {
                values: {},
                children: {
                    'Software':  leaf({ '(Default)': { type: 'REG_SZ', data: '' } }),
                    'System':    leaf({ '(Default)': { type: 'REG_SZ', data: '' } })
                }
            }
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
        // Honor BIOS Security > Boot Sector Virus Check. With it
        // Enabled, a balloon fires every time the registry hive is
        // written; the satire frames it as a false-positive boot-
        // sector heuristic that fires on any HKLM modification.
        // This is throttled by a session flag so the balloon shows
        // only once per BIOS Setup session.
        try {
            var bios = (typeof window.STATE !== 'undefined' && window.STATE.bios) || {};
            if (bios.virusCheck === 'Enabled' && !window.__regeditVirusWarned) {
                window.__regeditVirusWarned = true;
                if (typeof window.srv2k3Notify === 'function') {
                    window.srv2k3Notify(
                        'Modificare detectată în zona protejată a regiștrilor. Boot Sector Virus Check a înregistrat evenimentul (fals pozitiv tipic pe scrieri HKLM).',
                        'Boot Sector Virus Check'
                    );
                }
            }
        } catch (e) {}
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
        // Persisted tree-pane width chosen by the user via the
        // resizable divider. Loaded once at open and re-saved by the
        // drag handler. NaN/0 means "use the CSS default (220px)".
        var treeWidth = 0;
        try {
            var saved = parseInt(sessionStorage.getItem('ide.srv2k3.regedit.treeW.v1'), 10);
            if (!isNaN(saved) && saved >= 120) treeWidth = saved;
        } catch (e) {}

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
                '<div class="reg-split" id="regSplit">' +
                '<div class="reg-tree" id="regTree">' + renderTree(tree, '', 0) + '</div>' +
                '<div class="reg-divider" id="regDivider" role="separator" aria-orientation="vertical" aria-label="Redimensionează panoul" tabindex="0"></div>' +
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

            // Pane resizer: drag the .reg-divider to retune how much
            // width the tree gets vs. the value pane. Persists to
            // sessionStorage so the choice survives a re-render. The
            // divider is also keyboard-accessible: Left/Right arrows
            // nudge the width by 16 px steps.
            var divider = bd.querySelector('#regDivider');
            var split   = bd.querySelector('#regSplit');
            if (divider && split) {
                var MIN_W = 120;
                var startX, startW;

                function applyWidth(w) {
                    var rect = split.getBoundingClientRect();
                    var max  = Math.max(MIN_W, rect.width - 200);
                    if (w < MIN_W) w = MIN_W;
                    if (w > max)   w = max;
                    split.style.setProperty('--reg-tree-w', w + 'px');
                    treeWidth = w;
                    try { sessionStorage.setItem('ide.srv2k3.regedit.treeW.v1', String(w)); } catch (e) {}
                }

                function onMove(e) {
                    var x = (e.touches && e.touches[0]) ? e.touches[0].clientX : e.clientX;
                    applyWidth(startW + (x - startX));
                }
                function onUp() {
                    document.removeEventListener('mousemove', onMove);
                    document.removeEventListener('touchmove', onMove);
                    document.removeEventListener('mouseup',   onUp);
                    document.removeEventListener('touchend',  onUp);
                    document.body.classList.remove('srv2k3-regedit-dragging');
                    divider.classList.remove('dragging');
                }
                function onDown(e) {
                    e.preventDefault();
                    var rect = bd.querySelector('#regTree').getBoundingClientRect();
                    startW = rect.width;
                    startX = (e.touches && e.touches[0]) ? e.touches[0].clientX : e.clientX;
                    document.addEventListener('mousemove', onMove);
                    document.addEventListener('touchmove', onMove, { passive: false });
                    document.addEventListener('mouseup',   onUp);
                    document.addEventListener('touchend',  onUp);
                    document.body.classList.add('srv2k3-regedit-dragging');
                    divider.classList.add('dragging');
                }
                divider.addEventListener('mousedown',  onDown);
                divider.addEventListener('touchstart', onDown, { passive: false });

                divider.addEventListener('keydown', function(e) {
                    var rect = bd.querySelector('#regTree').getBoundingClientRect();
                    if (e.key === 'ArrowLeft')  { e.preventDefault(); applyWidth(rect.width - 16); }
                    if (e.key === 'ArrowRight') { e.preventDefault(); applyWidth(rect.width + 16); }
                });

                // Restore persisted width.
                if (treeWidth) {
                    split.style.setProperty('--reg-tree-w', treeWidth + 'px');
                }
            }
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
