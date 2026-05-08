/* ============================================================
   EVENT VIEWER
   MMC-style snap-in for browsing the Server 2003 event log.
   Three logs in the left tree (System, Application, Security),
   a list view on the right with Type / Date / Time / Source /
   Event ID / Message columns. Double-click opens a properties
   dialog with the full message and acknowledge button.

   Reads from window.SRV2K3_EVENTLOG (the persistent ring
   buffer). Refreshes on open and re-renders after a clear.
   ============================================================ */
(function() {
    var WIN_ID = 'evtVwrWin';

    function fmt(d) {
        return d.toLocaleString('ro-RO', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit', second: '2-digit'
        });
    }

    function typeIcon(type) {
        // Match real Event Viewer: Information = blue 'i', Warning =
        // yellow '!', Error = red 'x', Audit = key.
        var bg, label, color;
        if (type === 'Error') { bg = '#dc3535'; label = '\u2717'; color = '#ffffff'; }
        else if (type === 'Warning') { bg = '#ffd34d'; label = '!'; color = '#604010'; }
        else if (type && type.indexOf('Audit') >= 0) { bg = '#a08020'; label = '\u2398'; color = '#ffffff'; }
        else { bg = '#3578d8'; label = 'i'; color = '#ffffff'; }
        return '<span class="evt-type-icon" style="background:' + bg + ';color:' + color + ';">' + label + '</span>';
    }

    function esc(s) {
        return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    function openEventViewer() {
        if (document.getElementById(WIN_ID)) return;
        var activeLog = 'System';
        var bd = document.createElement('div');
        bd.id = WIN_ID;
        bd.className = 'dialog-backdrop open srv2k3-evtvwr';
        bd.setAttribute('role', 'dialog');
        bd.setAttribute('aria-modal', 'true');
        bd.setAttribute('aria-label', 'Event Viewer');
        document.body.appendChild(bd);
        render();

        function render() {
            var log = (window.SRV2K3_EVENTLOG && window.SRV2K3_EVENTLOG.read(activeLog)) || [];
            // Sort newest first.
            log = log.slice().sort(function(a, b) { return b.when - a.when; });

            var navHtml = ['System', 'Application', 'Security'].map(function(name) {
                var count = (window.SRV2K3_EVENTLOG && window.SRV2K3_EVENTLOG.read(name).length) || 0;
                return '<div class="evt-nav-item' + (name === activeLog ? ' active' : '') +
                    '" data-evt-log="' + name + '">' +
                    '<span class="evt-nav-name">' + name + '</span>' +
                    '<span class="evt-nav-count">(' + count + ')</span>' +
                    '</div>';
            }).join('');

            var rowsHtml;
            if (!log.length) {
                rowsHtml = '<tr><td colspan="6" class="evt-empty">Acest jurnal nu conține nicio intrare.</td></tr>';
            } else {
                rowsHtml = log.map(function(e, i) {
                    var d = new Date(e.when);
                    return '<tr class="evt-row" data-evt-idx="' + i + '">' +
                        '<td>' + typeIcon(e.type) + ' ' + esc(e.type) + '</td>' +
                        '<td>' + d.toLocaleDateString('ro-RO') + '</td>' +
                        '<td>' + d.toLocaleTimeString('ro-RO') + '</td>' +
                        '<td>' + esc(e.source) + '</td>' +
                        '<td>' + esc(String(e.eventID)) + '</td>' +
                        '<td class="evt-msg-cell">' + esc(e.message) + '</td>' +
                        '</tr>';
                }).join('');
            }

            bd.innerHTML =
                '<div class="dialog" style="max-width: 920px;">' +
                '<div class="dialog-header">Event Viewer</div>' +
                '<div class="dialog-body" style="padding: 0;">' +
                '<div class="evt-toolbar">' +
                '<button class="btn evt-btn-clear" data-evt-action="clear">Goliți jurnalul</button>' +
                '<button class="btn evt-btn-refresh" data-evt-action="refresh">Reîmprospătează</button>' +
                '<span class="evt-toolbar-spacer"></span>' +
                '<span class="evt-toolbar-info">' + log.length + ' intrare(i)</span>' +
                '</div>' +
                '<div class="evt-split">' +
                '<div class="evt-nav">' +
                '<div class="evt-nav-root">Event Viewer (Local)</div>' +
                navHtml +
                '</div>' +
                '<div class="evt-pane">' +
                '<table class="evt-table">' +
                '<thead><tr>' +
                '<th>Tip</th><th>Dată</th><th>Oră</th><th>Sursă</th><th>ID</th><th>Mesaj</th>' +
                '</tr></thead>' +
                '<tbody>' + rowsHtml + '</tbody>' +
                '</table>' +
                '</div>' +
                '</div>' +
                '</div>' +
                '<div class="dialog-footer">' +
                '<button class="btn suggested" data-run-close>Închide</button>' +
                '</div>' +
                '</div>';
            wire(log);
        }

        function wire(log) {
            bd.onclick = function(e) {
                if (e.target === bd || (e.target.getAttribute && e.target.getAttribute('data-run-close') != null)) {
                    bd.remove();
                }
            };
            bd.querySelectorAll('[data-evt-log]').forEach(function(el) {
                el.addEventListener('click', function() {
                    activeLog = el.getAttribute('data-evt-log');
                    render();
                });
            });
            var clearBtn = bd.querySelector('[data-evt-action="clear"]');
            if (clearBtn) clearBtn.addEventListener('click', function() {
                if (window.SRV2K3_EVENTLOG) window.SRV2K3_EVENTLOG.clearLog(activeLog);
                if (typeof srv2k3Notify === 'function') {
                    srv2k3Notify('Jurnalul „' + activeLog + '" a fost golit.', 'Event Viewer');
                }
                render();
            });
            var refreshBtn = bd.querySelector('[data-evt-action="refresh"]');
            if (refreshBtn) refreshBtn.addEventListener('click', render);
            bd.querySelectorAll('.evt-row').forEach(function(row) {
                row.addEventListener('dblclick', function() {
                    var idx = parseInt(row.getAttribute('data-evt-idx'), 10);
                    showProperties(log[idx]);
                });
            });
        }

        function showProperties(e) {
            if (!e) return;
            var pd = document.createElement('div');
            pd.className = 'dialog-backdrop open srv2k3-evtvwr-props';
            pd.setAttribute('role', 'dialog');
            pd.setAttribute('aria-modal', 'true');
            pd.innerHTML =
                '<div class="dialog" style="max-width: 520px;">' +
                '<div class="dialog-header">Proprietăți eveniment</div>' +
                '<div class="dialog-body">' +
                '<div class="evt-props-grid">' +
                '<div class="evt-props-key">Dată:</div><div>' + fmt(new Date(e.when)) + '</div>' +
                '<div class="evt-props-key">Sursă:</div><div>' + esc(e.source) + '</div>' +
                '<div class="evt-props-key">Tip:</div><div>' + typeIcon(e.type) + ' ' + esc(e.type) + '</div>' +
                '<div class="evt-props-key">ID:</div><div>' + esc(String(e.eventID)) + '</div>' +
                '<div class="evt-props-key">Categorie:</div><div>Niciuna</div>' +
                '<div class="evt-props-key">Utilizator:</div><div>N/A</div>' +
                '<div class="evt-props-key">Calculator:</div><div>GDX-APPLIANCE</div>' +
                '</div>' +
                '<div class="evt-props-msg-label">Descriere:</div>' +
                '<div class="evt-props-msg">' + esc(e.message) + '</div>' +
                '</div>' +
                '<div class="dialog-footer">' +
                '<button class="btn suggested" data-evt-props-close>OK</button>' +
                '</div>' +
                '</div>';
            document.body.appendChild(pd);
            pd.onclick = function(ev) {
                if (ev.target === pd || (ev.target.getAttribute && ev.target.getAttribute('data-evt-props-close') != null)) {
                    pd.remove();
                }
            };
        }
    }

    window.openEventViewer = openEventViewer;
})();
