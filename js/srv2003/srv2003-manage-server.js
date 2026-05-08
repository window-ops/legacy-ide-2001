/* ============================================================
   MANAGE YOUR SERVER + ROLE ADMIN
   The Server 2003 wizard that opens at first logon, plus the
   File Server / Application Server administration consoles
   reachable from it. The role admin owns the IIS sites list
   (where Curriculum Reporting can be stopped) and persists
   site state through SRV2K3_STATE.

   External dependencies:
     window.STATE                  - global state object
     window.srv2k3Notify           - tray balloon notification
     window.iconKey, iconCpAdminTools, iconWebGlobe, iconFolderShare,
       iconCpInternetOptions, iconConsoleRoot - SVG helpers
     window.SRV2K3_STATE.applySitesTo / saveSites - persistence
     window.SRV2K3_EVENTLOG.write  - Application/IIS log entries
   ============================================================ */
(function() {
    function openManageYourServer() {
        if (document.getElementById('mysWin')) return;
        var bd = document.createElement('div');
        bd.id = 'mysWin';
        bd.className = 'dialog-backdrop open srv2k3-mys';
        bd.setAttribute('role', 'dialog');
        bd.setAttribute('aria-modal', 'true');
        bd.innerHTML =
            '<div class="dialog" style="max-width: 600px;">' +
            '<div class="dialog-header">Administrare server</div>' +
            '<div class="dialog-body" style="padding: 0;">' +
            '<div class="mys-banner">' +
            '<div class="mys-banner-flag">' + windowsFlagSvg(36) + '</div>' +
            '<div>' +
            '<div class="mys-banner-title">Administrare server</div>' +
            '<div class="mys-banner-sub">Server: GDX-APPLIANCE</div>' +
            '</div>' +
            '</div>' +
            '<div class="mys-content">' +
            '<p style="margin: 0 0 10px;">Folosiți instrumentele și informațiile de aici pentru a adăuga sau elimina roluri și pentru a efectua sarcinile administrative zilnice.</p>' +
            '<p style="margin: 0 0 14px;">Serverul a fost configurat cu următoarele roluri:</p>' +
            '<div class="mys-role">' +
            '<div class="mys-role-title">Server de fișiere</div>' +
            '<div class="mys-role-desc">Serverele de fișiere furnizează și gestionează accesul la fișiere. <a href="#" data-mys-role="file">Administrați acest server de fișiere</a></div>' +
            '</div>' +
            '<div class="mys-role">' +
            '<div class="mys-role-title">Server de aplicații (IIS, ASP.NET)</div>' +
            '<div class="mys-role-desc">Serverele de aplicații furnizează tehnologiile esențiale pentru a construi, implementa și opera servicii Web XML și aplicații Web. <a href="#" data-mys-role="app">Administrați acest server de aplicații</a></div>' +
            '</div>' +
            '</div>' +
            '</div>' +
            '<div class="dialog-footer">' +
            '<button class="btn suggested" data-run-close>Închide</button>' +
            '</div>' +
            '</div>';
        document.body.appendChild(bd);
        bd.addEventListener('click', function(e) {
            if (e.target === bd || (e.target.getAttribute && e.target.getAttribute('data-run-close') != null)) {
                bd.remove();
                return;
            }
            var roleLink = e.target.closest && e.target.closest('[data-mys-role]');
            if (roleLink) {
                e.preventDefault();
                var role = roleLink.getAttribute('data-mys-role');
                openRoleAdmin(role);
            }
        });
    }

    // Role admin window. Opens different mock-administration UI based
    // on which role the user picked. Both have a tabbed left nav and
    // a Save button that confirms via toast/balloon.
    function openRoleAdmin(role) {
        var winId = 'roleAdmin-' + role;
        if (document.getElementById(winId)) return;

        // Per-role state. Both tabs and shares persist per-instance so
        // adding a share doesn\'t blow away when you tab to Sessions and
        // back.
        var state = (role === 'file') ? {
            activeTab: 'shares',
            shares: [
                { name: 'ADMIN$',     path: 'C:\\WINDOWS',                 type: 'Windows', conn: 0 },
                { name: 'C$',         path: 'C:\\',                        type: 'Windows', conn: 0 },
                { name: 'IPC$',       path: ', ',                           type: 'Windows', conn: 1 },
                { name: 'SYSVOL',     path: 'C:\\WINDOWS\\SYSVOL\\sysvol', type: 'Windows', conn: 0 },
                { name: 'StudentWork', path: 'D:\\Shares\\StudentWork',    type: 'Windows', conn: 0 }
            ]
        } : {
            activeTab: 'sites',
            sites: [
                { desc: 'Default Web Site',                     state: 'Running', host: '(implicit)',                ip: '(Toate)',           port: 80 },
                { desc: 'Microsoft SharePoint Administration', state: 'Running', host: '(implicit)',                ip: '(Toate)',           port: 17012 },
                { desc: 'Curriculum Reporting',                 state: 'Running', host: 'curriculum.gdx-appliance', ip: '10.0.0.42',         port: 80 }
            ],
            asp: { ver: 'v1.1.4322 SP1', debug: false }
        };

        // Merge persisted site states (e.g., user previously stopped
        // Curriculum Reporting and reloaded the page) onto the default
        // sites array so the role admin reopens with the correct state.
        if (role === 'app' && window.SRV2K3_STATE) {
            window.SRV2K3_STATE.applySitesTo(state.sites);
        }

        var FILE_TABS = [
            { id: 'shares',      label: 'Resurse partajate' },
            { id: 'sessions',    label: 'Sesiuni' },
            { id: 'openfiles',   label: 'Fișiere deschise' },
            { id: 'quotas',      label: 'Cote de spațiu' },
            { id: 'replication', label: 'Replicare' }
        ];
        var APP_TABS = [
            { id: 'sites',  label: 'Site-uri Web' },
            { id: 'pools',  label: 'Pool-uri de aplicații' },
            { id: 'ftp',    label: 'Site-uri FTP' },
            { id: 'smtp',   label: 'Server SMTP virtual' },
            { id: 'aspnet', label: 'ASP.NET' }
        ];

        var bd = document.createElement('div');
        bd.id = winId;
        bd.className = 'dialog-backdrop open srv2k3-roleadmin';
        bd.setAttribute('role', 'dialog');
        bd.setAttribute('aria-modal', 'true');
        document.body.appendChild(bd);
        // If we\'re opening the app role admin, sync the backend flag
        // from whatever state.sites was loaded with so reopening the
        // window doesn\'t lose the flag (state is per-instance, but the
        // flag lives on STATE which persists across opens).
        if (role === 'app') {
            var c = state.sites.find(function(s) { return s.desc === 'Curriculum Reporting'; });
            var siteUpInit = !!(c && c.state === 'Running');
            var netUpInit = STATE.networkUp !== false;
            if (netUpInit) {
                STATE.serverBackendOnline = siteUpInit;
            } else {
                STATE._backendBeforeDown = siteUpInit;
                STATE.serverBackendOnline = false;
            }
        }
        render();

        function render() {
            var tabs = (role === 'file') ? FILE_TABS : APP_TABS;
            var title = (role === 'file') ? 'Administrare Server de Fișiere' : 'Administrare Server de Aplicații';
            var statusText = (role === 'file') ? 'Server de Fișiere - Pornit' : 'IIS 6.0 - Pornit';
            var navHtml = tabs.map(function(t) {
                return '<div class="ra-nav-item' + (state.activeTab === t.id ? ' active' : '') + '" data-ra-tab="' + t.id + '">' + t.label + '</div>';
            }).join('');
            bd.innerHTML =
                '<div class="dialog" style="max-width: 880px;">' +
                '<div class="dialog-header">' + esc(title) + '</div>' +
                '<div class="dialog-body" style="padding: 0;">' +
                '<div class="ra-toolbar"><span>Server: GDX-APPLIANCE</span><span class="ra-status">Stare: <strong style="color:#006400;">' + esc(statusText) + '</strong></span></div>' +
                '<div class="ra-split">' +
                '<div class="ra-nav">' + navHtml + '</div>' +
                '<div class="ra-pane">' + renderPane() + '</div>' +
                '</div>' +
                '</div>' +
                '<div class="dialog-footer">' +
                '<button class="btn suggested" data-run-close>Închide</button>' +
                '</div>' +
                '</div>';
            wire();
        }

        function esc(s) {
            return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
        }

        function renderPane() {
            if (role === 'file') {
                if (state.activeTab === 'shares') {
                    return '<table class="ra-table">' +
                        '<thead><tr><th>Nume resursă</th><th>Cale director</th><th>Tip</th><th>Conexiuni</th></tr></thead>' +
                        '<tbody>' +
                        state.shares.map(function(s) {
                            return '<tr><td>' + esc(s.name) + '</td><td>' + esc(s.path) + '</td><td>' + esc(s.type) + '</td><td>' + s.conn + '</td></tr>';
                        }).join('') +
                        '</tbody></table>' +
                        '<div class="ra-form">' +
                        '<label>Nume resursă nouă:</label><input type="text" class="srv2k3-run-input" id="raShareName" placeholder="ex: ProiecteHTML">' +
                        '<label>Cale director:</label><input type="text" class="srv2k3-run-input" id="raSharePath" placeholder="D:\\Shares\\ProiecteHTML">' +
                        '<button class="btn" id="raAddShare">Adaugă resursă</button>' +
                        '</div>';
                }
                if (state.activeTab === 'sessions') {
                    return '<table class="ra-table">' +
                        '<thead><tr><th>Utilizator</th><th>Computer</th><th>Tip</th><th>Fișiere deschise</th><th>Timp conectat</th><th>Timp inactiv</th></tr></thead>' +
                        '<tbody>' +
                        '<tr><td>defaultuser</td><td>GDX-APPLIANCE</td><td>Windows</td><td>0</td><td>00:14:32</td><td>00:00:08</td></tr>' +
                        '</tbody></table>' +
                        '<p style="font-size:11px; color:#404040; margin-top:8px;">1 sesiune conectată.</p>';
                }
                if (state.activeTab === 'openfiles') {
                    return '<table class="ra-table">' +
                        '<thead><tr><th>ID fișier</th><th>Cale</th><th>Utilizator</th><th>Blocaje</th><th>Mod deschidere</th></tr></thead>' +
                        '<tbody><tr><td colspan="5" style="text-align:center; padding:24px; color:#606060;">Niciun fișier nu este deschis în acest moment.</td></tr></tbody>' +
                        '</table>';
                }
                if (state.activeTab === 'quotas') {
                    return '<p style="font-size:11px; margin-bottom:10px;">Cotele de spațiu nu sunt activate pe niciun volum.</p>' +
                        '<div class="ra-form">' +
                        '<label class="ra-check"><input type="checkbox" id="raQuotaEnable"> Activează gestionarea cotelor pe C:</label>' +
                        '<label>Limită implicită:</label><input type="text" class="srv2k3-run-input" value="100 MB" disabled>' +
                        '<label>Nivel avertizare:</label><input type="text" class="srv2k3-run-input" value="80 MB" disabled>' +
                        '<button class="btn" id="raQuotaApply">Aplică</button>' +
                        '</div>';
                }
                if (state.activeTab === 'replication') {
                    return '<p style="font-size:11px; margin-bottom:10px;">Replicarea DFS nu este configurată pe acest server.</p>' +
                        '<div class="ra-form">' +
                        '<label>Nume grup de replicare:</label><input type="text" class="srv2k3-run-input" id="raRepName" placeholder="StudentWork-Replicate">' +
                        '<label>Program:</label><select class="srv2k3-run-input"><option>Continuu</option><option>La fiecare oră</option><option>Zilnic</option></select>' +
                        '<button class="btn" id="raRepCreate">Creează grup</button>' +
                        '</div>';
                }
            } else {
                if (state.activeTab === 'sites') {
                    return '<table class="ra-table">' +
                        '<thead><tr><th>Descriere</th><th>Stare</th><th>Antet gazdă</th><th>Adresă IP</th><th>Port</th><th>Acțiune</th></tr></thead>' +
                        '<tbody>' +
                        state.sites.map(function(s, i) {
                            var color = (s.state === 'Running') ? '#006400' : '#800000';
                            var stateLabel = (s.state === 'Running') ? 'Pornit' : 'Oprit';
                            var btnLabel = (s.state === 'Running') ? 'Oprește' : 'Pornește';
                            return '<tr data-ra-site="' + esc(s.desc) + '"><td>' + esc(s.desc) + '</td>' +
                                '<td><span style="color:' + color + ';">' + stateLabel + '</span></td>' +
                                '<td>' + esc(s.host) + '</td><td>' + esc(s.ip) + '</td><td>' + s.port + '</td>' +
                                '<td><button class="btn ra-row-btn" data-ra-site-idx="' + i + '">' + btnLabel + '</button></td></tr>';
                        }).join('') +
                        '</tbody></table>' +
                        '<div class="ra-form ra-form-row">' +
                        '<button class="btn" id="raSiteStart">Pornește toate</button>' +
                        '<button class="btn" id="raSiteStop">Oprește toate</button>' +
                        '</div>';
                }
                if (state.activeTab === 'pools') {
                    return '<table class="ra-table">' +
                        '<thead><tr><th>Pool de aplicații</th><th>Stare</th><th>.NET Framework</th><th>Identitate</th></tr></thead>' +
                        '<tbody>' +
                        '<tr><td>DefaultAppPool</td><td><span style="color:#006400;">Pornit</span></td><td>v1.1</td><td>NETWORK SERVICE</td></tr>' +
                        '<tr><td>MSSharePointAppPool</td><td><span style="color:#006400;">Pornit</span></td><td>v1.1</td><td>LocalSystem</td></tr>' +
                        '<tr><td>CurriculumPool</td><td><span style="color:#800000;">Oprit</span></td><td>v1.1</td><td>NETWORK SERVICE</td></tr>' +
                        '</tbody></table>';
                }
                if (state.activeTab === 'ftp') {
                    return '<p style="font-size:11px; margin-bottom:10px;">Serviciul FTP nu este pornit.</p>' +
                        '<div class="ra-form">' +
                        '<label class="ra-check"><input type="checkbox" id="raFtpEnable"> Activează serverul FTP pe portul 21</label>' +
                        '<label>Acces anonim:</label><select class="srv2k3-run-input"><option>Dezactivat</option><option>Doar citire</option></select>' +
                        '<button class="btn" id="raFtpApply">Aplică</button>' +
                        '</div>';
                }
                if (state.activeTab === 'smtp') {
                    return '<table class="ra-table">' +
                        '<thead><tr><th>Descriere</th><th>Stare</th><th>Adresă IP</th><th>Port</th></tr></thead>' +
                        '<tbody><tr><td>Server SMTP virtual implicit</td><td><span style="color:#006400;">Pornit</span></td><td>(Toate)</td><td>25</td></tr></tbody>' +
                        '</table>' +
                        '<div class="ra-form">' +
                        '<label>Smart host:</label><input type="text" class="srv2k3-run-input" id="raSmartHost" placeholder="mail.gdx-appliance">' +
                        '<button class="btn" id="raSmtpApply">Aplică</button>' +
                        '</div>';
                }
                if (state.activeTab === 'aspnet') {
                    return '<div class="ra-form">' +
                        '<label>Versiune ASP.NET:</label>' +
                        '<select class="srv2k3-run-input" id="raAspVer">' +
                        ['v1.1.4322', 'v1.1.4322 SP1'].map(function(v) {
                            return '<option' + (state.asp.ver === v ? ' selected' : '') + '>' + v + '</option>';
                        }).join('') +
                        '</select>' +
                        '<label class="ra-check"><input type="checkbox" id="raAllowDebug"' + (state.asp.debug ? ' checked' : '') + '> Permite debugging la distanță</label>' +
                        '<button class="btn" id="raApplyAsp">Aplică</button>' +
                        '</div>';
                }
            }
            return '<p style="font-size:11px; padding:12px;">Snap-in nu este disponibil.</p>';
        }

        // Sync STATE.serverBackendOnline based on whether the Curriculum
        // Reporting site is Running. Only meaningful for the App Server
        // role admin (which is the only one that owns that site list);
        // calling it from the File role admin is harmless.
        function syncBackendFlag() {
            if (role !== 'app' || !state.sites) return;
            var curriculum = state.sites.find(function(s) {
                return s.desc === 'Curriculum Reporting';
            });
            var siteUp = !!(curriculum && curriculum.state === 'Running');
            // The backend is reachable only if BOTH the site is up AND
            // the network connection is up. Disabling the network in
            // the tray takes the IDE offline regardless of IIS state.
            var netUp = STATE.networkUp !== false;
            if (netUp) {
                STATE.serverBackendOnline = siteUp;
            } else {
                STATE._backendBeforeDown = siteUp;
                STATE.serverBackendOnline = false;
            }
        }

        function wire() {
            // Backdrop / close.
            bd.onclick = function(e) {
                if (e.target === bd || (e.target.getAttribute && e.target.getAttribute('data-run-close') != null)) {
                    bd.remove();
                }
            };
            // Tab switching.
            bd.querySelectorAll('[data-ra-tab]').forEach(function(el) {
                el.addEventListener('click', function() {
                    state.activeTab = el.getAttribute('data-ra-tab');
                    render();
                });
            });
            // Per-tab buttons.
            var addBtn = bd.querySelector('#raAddShare');
            if (addBtn) addBtn.addEventListener('click', function() {
                var name = (bd.querySelector('#raShareName').value || '').trim();
                var path = (bd.querySelector('#raSharePath').value || '').trim();
                if (!name || !path) {
                    srv2k3Notify('Numele share-ului și calea folderului sunt obligatorii.', 'File Server');
                    return;
                }
                state.shares.push({ name: name, path: path, type: 'Windows', conn: 0 });
                srv2k3Notify('Share-ul „' + name + '" a fost creat la ' + path + '.', 'File Server');
                render();
            });
            var quotaBtn = bd.querySelector('#raQuotaApply');
            if (quotaBtn) quotaBtn.addEventListener('click', function() {
                var on = bd.querySelector('#raQuotaEnable').checked;
                srv2k3Notify(on ? 'Cotele de disc au fost activate pe C:.' : 'Cotele de disc au fost dezactivate.', 'Disk Quotas');
            });
            var repBtn = bd.querySelector('#raRepCreate');
            if (repBtn) repBtn.addEventListener('click', function() {
                var name = (bd.querySelector('#raRepName').value || '').trim();
                if (!name) { srv2k3Notify('Numele grupului de replicare este obligatoriu.', 'DFS Replication'); return; }
                srv2k3Notify('Grupul de replicare „' + name + '" a fost creat.', 'DFS Replication');
            });
            var siteStart = bd.querySelector('#raSiteStart');
            var siteStop  = bd.querySelector('#raSiteStop');
            if (siteStart) siteStart.addEventListener('click', function() {
                state.sites.forEach(function(s) { if (s.state === 'Stopped') s.state = 'Running'; });
                syncBackendFlag();
                if (window.SRV2K3_STATE) window.SRV2K3_STATE.saveSites(state.sites);
                srv2k3Notify('Toate site-urile au fost pornite.', 'IIS');
                if (window.SRV2K3_EVENTLOG) {
                    window.SRV2K3_EVENTLOG.write({
                        log: 'Application', source: 'IIS-W3SVC', type: 'Information', eventID: 1005,
                        message: 'Toate site-urile au fost pornite din administratorul IIS.'
                    });
                }
                render();
            });
            if (siteStop) siteStop.addEventListener('click', function() {
                state.sites.forEach(function(s) { if (s.state === 'Running') s.state = 'Stopped'; });
                syncBackendFlag();
                if (window.SRV2K3_STATE) window.SRV2K3_STATE.saveSites(state.sites);
                srv2k3Notify('Toate site-urile au fost oprite.', 'IIS');
                if (window.SRV2K3_EVENTLOG) {
                    window.SRV2K3_EVENTLOG.write({
                        log: 'Application', source: 'IIS-W3SVC', type: 'Warning', eventID: 1006,
                        message: 'Toate site-urile au fost oprite din administratorul IIS.'
                    });
                }
                render();
            });
            // Per-row Start/Stop button: toggles a single site\'s state
            // and re-renders. This is the verb users actually need to
            // stop only Curriculum Reporting (the validation backend),
            // leaving Default Web Site and SharePoint alone.
            bd.querySelectorAll('[data-ra-site-idx]').forEach(function(btn) {
                btn.addEventListener('click', function(e) {
                    e.stopPropagation();
                    var idx = parseInt(btn.getAttribute('data-ra-site-idx'), 10);
                    var s = state.sites[idx];
                    if (!s) return;
                    var was = s.state;
                    s.state = (was === 'Running') ? 'Stopped' : 'Running';
                    syncBackendFlag();
                    if (window.SRV2K3_STATE) window.SRV2K3_STATE.saveSites(state.sites);
                    var verb = (s.state === 'Running') ? 'pornit' : 'oprit';
                    srv2k3Notify('Site-ul „' + s.desc + '" a fost ' + verb + '.', 'IIS');
                    if (window.SRV2K3_EVENTLOG) {
                        window.SRV2K3_EVENTLOG.write({
                            log: 'Application',
                            source: 'IIS-W3SVC',
                            type: 'Information',
                            eventID: s.state === 'Running' ? 1003 : 1004,
                            message: 'Site-ul „' + s.desc + '" a fost ' + verb + '.'
                        });
                    }
                    render();
                });
            });
            var ftpBtn = bd.querySelector('#raFtpApply');
            if (ftpBtn) ftpBtn.addEventListener('click', function() {
                var on = bd.querySelector('#raFtpEnable').checked;
                srv2k3Notify(on ? 'Serviciul FTP a fost pornit pe portul 21.' : 'Serviciul FTP a fost oprit.', 'FTP');
            });
            var smtpBtn = bd.querySelector('#raSmtpApply');
            if (smtpBtn) smtpBtn.addEventListener('click', function() {
                var host = (bd.querySelector('#raSmartHost').value || '').trim();
                srv2k3Notify(host ? 'Smart host setat la ' + host + '.' : 'Smart host eliminat.', 'SMTP');
            });
            var applyBtn = bd.querySelector('#raApplyAsp');
            if (applyBtn) applyBtn.addEventListener('click', function() {
                state.asp.ver = bd.querySelector('#raAspVer').value;
                state.asp.debug = bd.querySelector('#raAllowDebug').checked;
                srv2k3Notify('IIS reconfigurat: ASP.NET ' + state.asp.ver + (state.asp.debug ? ', debugging la distanță activat.' : ', debugging la distanță dezactivat.'), 'IIS');
            });
        }
    }

    window.openManageYourServer = openManageYourServer;
    window.openRoleAdmin = openRoleAdmin;
})();
