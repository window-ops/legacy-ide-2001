/* ============================================================
   DEBUG OVERLAY (?debug=1)
   Context-aware developer overlay. Detects what the user is
   currently doing and surfaces the relevant state. Always
   shows the phase + a small "context" indicator on top so
   it's clear which bucket of fields is being displayed.

   Contexts (priority order, first match wins):
     1. GDX Debugger open  -> CPU regs, RIP, active patches
     2. Server 2003 dialog -> which dialog + its state
     3. Server 2003 desktop (no dialog) -> backend, network, IIS
     4. BIOS Setup         -> boot sequence
     5. QNX session        -> editor file, lint hits, exploit stage

   Polls 4 times/sec.
   ============================================================ */
(function() {
    if (typeof window === 'undefined') return;
    var enabled = false;
    try {
        enabled = new URLSearchParams(location.search).get('debug') === '1';
    } catch (e) {}
    if (!enabled) return;

    var COLOR_TRUE  = '#7fdf6a';
    var COLOR_FALSE = '#dc6a6a';
    var COLOR_WARN  = '#ffd34d';
    var COLOR_INFO  = '#a8d8f0';
    var COLOR_DIM   = '#888';

    function makePanel() {
        var p = document.createElement('div');
        p.id = 'debugOverlay';
        p.setAttribute('role', 'region');
        p.setAttribute('aria-label', 'Debug overlay');
        p.style.cssText = [
            'position:fixed', 'right:8px', 'bottom:8px',
            'z-index:99999',
            'background:rgba(0,0,0,0.86)',
            'color:#bff080',
            'font:11px/1.42 ui-monospace,Menlo,Consolas,monospace',
            'padding:8px 10px',
            'border:1px solid #4a8fbf',
            'border-radius:4px',
            'min-width:260px',
            'max-width:340px',
            'pointer-events:auto',
            'user-select:text'
        ].join(';') + ';';
        document.body.appendChild(p);
        return p;
    }

    function fmt(v) {
        if (v === undefined) return '<span style="color:' + COLOR_DIM + '">undef</span>';
        if (v === null)      return '<span style="color:' + COLOR_DIM + '">null</span>';
        if (v === true)      return '<span style="color:' + COLOR_TRUE + '">true</span>';
        if (v === false)     return '<span style="color:' + COLOR_FALSE + '">false</span>';
        if (v === '')        return '<span style="color:' + COLOR_DIM + '">""</span>';
        return String(v);
    }
    function row(k, v) { return '<div>' + k + ': ' + fmt(v) + '</div>'; }

    function patchSummary(bp) {
        if (!bp || typeof bp !== 'object') return '<span style="color:' + COLOR_DIM + '">none</span>';
        var keys = Object.keys(bp).filter(function(k) {
            return k !== 'effects' && bp[k] === true;
        });
        if (!keys.length) return '<span style="color:' + COLOR_DIM + '">none</span>';
        return '<span style="color:' + COLOR_WARN + '">' + keys.join(', ') + '</span>';
    }

    function detectContext() {
        var dbg = document.getElementById('debugger');
        if (dbg && dbg.classList && dbg.classList.contains('open')) return 'debugger';
        var dialogs = document.querySelectorAll('.dialog-backdrop.open[class*="srv2k3-"]');
        if (dialogs.length) {
            var last = dialogs[dialogs.length - 1];
            var classes = last.className.split(/\s+/);
            for (var i = 0; i < classes.length; i++) {
                if (classes[i].indexOf('srv2k3-') === 0) return classes[i].replace('srv2k3-', '');
            }
        }
        if (document.body.classList.contains('srv2003-desktop')) return 'srv2003';
        if (document.getElementById('biosSetup')) return 'bios';
        return 'qnx';
    }

    function renderHeader(ctx) {
        var phase = (STATE && STATE.defaultuser && STATE.defaultuser.phase) || '?';
        return '<div style="border-bottom:1px solid #4a8fbf; padding-bottom:4px; margin-bottom:6px">' +
            '<b style="color:' + COLOR_INFO + '">DEBUG</b> ' +
            '<span style="color:' + COLOR_DIM + '">?debug=1</span><br>' +
            '<span style="color:' + COLOR_DIM + '">phase:</span> ' + fmt(phase) +
            ' &middot; ' +
            '<span style="color:' + COLOR_DIM + '">ctx:</span> ' +
            '<span style="color:' + COLOR_INFO + '">' + ctx + '</span>' +
            '</div>';
    }

    function renderDebugger() {
        var bp = STATE.binaryPatches || {};
        var lines = [];
        if (typeof CPU !== 'undefined' && CPU.rip !== undefined) {
            lines.push(row('CPU.rip',  '0x' + (CPU.rip >>> 0).toString(16)));
            if (CPU.rax !== undefined) lines.push(row('CPU.rax', '0x' + (CPU.rax >>> 0).toString(16)));
            if (CPU.rsp !== undefined) lines.push(row('CPU.rsp', '0x' + (CPU.rsp >>> 0).toString(16)));
            if (CPU.flags) lines.push(row('flags', JSON.stringify(CPU.flags)));
        }
        lines.push(row('patches', patchSummary(bp)));
        var effectCount = bp.effects ? Object.keys(bp.effects).length : 0;
        lines.push(row('per-site effects', effectCount));
        return lines.join('');
    }

    function renderSrv2003Desktop() {
        var lines = [];
        lines.push(row('networkUp',           STATE.networkUp !== false));
        lines.push(row('serverBackendOnline', STATE.serverBackendOnline));
        lines.push(row('_backendBeforeDown',  STATE._backendBeforeDown));
        lines.push(row('patches',             patchSummary(STATE.binaryPatches)));
        if (STATE.bios && STATE.bios.bootSeq) {
            lines.push(row('bios.boot[0]',    STATE.bios.bootSeq[0]));
        }
        var snap = STATE.defaultuser && STATE.defaultuser.migratedSnapshot;
        if (snap) {
            lines.push(row('snapshot.dbg',    snap.includesDebugger));
            lines.push(row('snapshot.bypass', snap.includesBypasses));
        }
        return lines.join('');
    }

    function renderDialog(name) {
        var lines = ['<div style="color:' + COLOR_DIM + '">dialog: <b style="color:' + COLOR_INFO + '">' + name + '</b></div>'];
        if (name === 'roleadmin') {
            lines.push(row('serverBackendOnline', STATE.serverBackendOnline));
            lines.push(row('networkUp',           STATE.networkUp !== false));
            if (window.SRV2K3_STATE) {
                var st = window.SRV2K3_STATE.load();
                if (st && st.sites) {
                    var c = st.sites.find(function(s) { return s.desc === 'Curriculum Reporting'; });
                    if (c) lines.push(row('CurriculumReporting',  c.state));
                    var def = st.sites.find(function(s) { return s.desc === 'Default Web Site'; });
                    if (def) lines.push(row('DefaultWebSite', def.state));
                }
            }
        } else if (name === 'mys') {
            // Manage Your Server wizard, the launcher for role admin.
            lines.push(row('serverBackendOnline', STATE.serverBackendOnline));
            lines.push(row('networkUp',           STATE.networkUp !== false));
            lines.push(row('rolesShown',          'File Server, Application Server'));
        } else if (name === 'evtvwr') {
            if (window.SRV2K3_EVENTLOG) {
                var sys = window.SRV2K3_EVENTLOG.read('System').length;
                var app = window.SRV2K3_EVENTLOG.read('Application').length;
                var sec = window.SRV2K3_EVENTLOG.read('Security').length;
                lines.push(row('System log',      sys + ' entries'));
                lines.push(row('Application log', app + ' entries'));
                lines.push(row('Security log',    sec + ' entries'));
            }
        } else if (name === 'evtvwr-props') {
            lines.push('<div style="color:' + COLOR_DIM + '">event properties (read-only)</div>');
        } else if (name === 'regedit') {
            try {
                var raw = sessionStorage.getItem('ide.srv2k3.registry.v2') ||
                          sessionStorage.getItem('ide.srv2k3.registry.v1');
                lines.push(row('registry persisted', raw ? 'yes' : 'no'));
                if (raw) lines.push(row('registry size',  raw.length + ' bytes'));
            } catch (e) {}
            try {
                var w = sessionStorage.getItem('ide.srv2k3.regedit.treeW.v1');
                lines.push(row('tree pane width',  w ? w + ' px' : 'default (220 px)'));
            } catch (e) {}
            lines.push(row('curriculumNonBlocking', !!(STATE.binaryPatches && STATE.binaryPatches.curriculumNonBlocking)));
        } else if (name === 'regedit-edit') {
            lines.push('<div style="color:' + COLOR_DIM + '">editing a registry value</div>');
        } else if (name === 'cmd') {
            lines.push('<div style="color:' + COLOR_DIM + '">cmd.exe (no persisted state)</div>');
            lines.push(row('hostname', 'GDX-APPLIANCE'));
        } else if (name === 'taskmgr') {
            lines.push(row('idle CPU%',  Math.floor(Math.random() * 5)));
            lines.push(row('processCount',  '~24 processes'));
        } else if (name === 'help') {
            lines.push('<div style="color:' + COLOR_DIM + '">read-only docs</div>');
        } else if (name === 'drwatson' || name === 'drwatson-details') {
            lines.push(row('patches',  patchSummary(STATE.binaryPatches)));
            var effects = STATE.binaryPatches && STATE.binaryPatches.effects;
            if (effects) lines.push(row('faults patched', Object.keys(effects).length));
            var snap = STATE.defaultuser && STATE.defaultuser.migratedSnapshot;
            if (snap) lines.push(row('snapshot.dbg',  snap.includesDebugger));
        } else if (name === 'mycomp') {
            lines.push('<div style="color:' + COLOR_DIM + '">drives: C: D: A: E:</div>');
        } else if (name === 'recycle') {
            lines.push('<div style="color:' + COLOR_DIM + '">empty (always)</div>');
        } else if (name === 'notepad') {
            lines.push('<div style="color:' + COLOR_DIM + '">notepad.exe</div>');
        } else if (name === 'cpanel') {
            lines.push('<div style="color:' + COLOR_DIM + '">control panel</div>');
            lines.push(row('startMenuStyle', (STATE.prefs && STATE.prefs.startMenuStyle) || 'modern'));
        } else if (name === 'taskbar-props') {
            lines.push('<div style="color:' + COLOR_DIM + '">taskbar & start menu props</div>');
            lines.push(row('startMenuStyle', (STATE.prefs && STATE.prefs.startMenuStyle) || 'modern'));
        } else if (name === 'about-dialog') {
            lines.push('<div style="color:' + COLOR_DIM + '">winver / about</div>');
            lines.push(row('build', '5.2 (3790)'));
        } else if (name === 'run-dialog') {
            lines.push('<div style="color:' + COLOR_DIM + '">Start, Run prompt</div>');
        } else if (name === 'shutdown') {
            lines.push(row('phase', STATE.defaultuser && STATE.defaultuser.phase));
            lines.push('<div style="color:' + COLOR_DIM + '">shutdown dialog</div>');
        } else {
            // Genuinely unknown class. Show the desktop summary, but
            // do NOT re-prepend the header (the caller already did).
            return renderSrv2003Desktop();
        }
        return lines.join('');
    }

    function renderBios() {
        var lines = [];
        if (STATE.bios) {
            if (STATE.bios.bootSeq) lines.push(row('bootSeq[0]', STATE.bios.bootSeq[0]));
            if (STATE.bios.bootSeq && STATE.bios.bootSeq.length) {
                lines.push(row('bootSeq', STATE.bios.bootSeq.join(' > ')));
            }
        } else {
            lines.push('<div style="color:' + COLOR_DIM + '">no bios state yet</div>');
        }
        return lines.join('');
    }

    function renderQnx() {
        var lines = [];
        var activeName = '';
        if (STATE.activeFile && STATE.tree && typeof findNode === 'function') {
            var node = findNode(STATE.tree, STATE.activeFile);
            if (node) activeName = node.name;
        }
        lines.push(row('activeFile',   activeName || '(none)'));
        if (STATE.openTabs) lines.push(row('openTabs',     STATE.openTabs.length));
        if (STATE.exploit)  lines.push(row('exploitStage', STATE.exploit.stage));
        if (STATE.defaultuser && STATE.defaultuser.lastSnapshot) {
            lines.push(row('lastSnapshot',  'present'));
        }
        lines.push(row('patches',      patchSummary(STATE.binaryPatches)));
        return lines.join('');
    }

    function render(panel) {
        if (typeof STATE === 'undefined') {
            panel.innerHTML = '<b>debug</b> waiting for STATE...';
            return;
        }
        var ctx = detectContext();
        var html = renderHeader(ctx);
        if (ctx === 'debugger')      html += renderDebugger();
        else if (ctx === 'srv2003')  html += renderSrv2003Desktop();
        else if (ctx === 'qnx')      html += renderQnx();
        else if (ctx === 'bios')     html += renderBios();
        else                          html += renderDialog(ctx);
        panel.innerHTML = html;
    }

    function start() {
        var panel = document.getElementById('debugOverlay') || makePanel();
        render(panel);
        setInterval(function() { render(panel); }, 250);
    }

    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        setTimeout(start, 0);
    } else {
        document.addEventListener('DOMContentLoaded', start);
    }
})();
