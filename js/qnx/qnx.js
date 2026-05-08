/* ============================================================
   QNX APPLIANCE / DESKTOP
   ============================================================ */
function resolveShellFile(path) {
    if (Object.prototype.hasOwnProperty.call(STATE.appliance.files, path)) return STATE.appliance.files[path];
    return null;
}

function appliancePrompt() {
    return STATE.appliance.user + '@' + STATE.appliance.env.HOSTNAME + ':' + STATE.appliance.cwd + '$';
}

function setQnxPromptLabel() {
    $('qnxPromptLabel').textContent = appliancePrompt();
}

function shellList(path) {
    var items = STATE.appliance.fs[path];
    if (!items) return '.';
    return items.join('  ');
}

function fsDirname(path) {
    var parts = path.split('/');
    parts.pop();
    var out = parts.join('/');
    return out || '/';
}

function fsBasename(path) {
    var parts = path.split('/');
    return parts[parts.length - 1] || '';
}

function fsAddEntry(parentPath, name) {
    if (!STATE.appliance.fs[parentPath]) return false;
    if (STATE.appliance.fs[parentPath].indexOf(name) === -1) STATE.appliance.fs[parentPath].push(name);
    STATE.appliance.fs[parentPath].sort();
    return true;
}

function fsCreateFile(path) {
    var parent = fsDirname(path);
    var name = fsBasename(path);
    if (!name || !STATE.appliance.fs[parent]) return false;
    if (!Object.prototype.hasOwnProperty.call(STATE.appliance.files, path)) STATE.appliance.files[path] = '';
    return fsAddEntry(parent, name);
}

function fsCreateDir(path) {
    var parent = fsDirname(path);
    var name = fsBasename(path);
    if (!name || !STATE.appliance.fs[parent]) return false;
    if (!STATE.appliance.fs[path]) STATE.appliance.fs[path] = [];
    return fsAddEntry(parent, name);
}

function getApplianceProcesses() {
    var base = STATE.appliance.processes.slice();
    if (STATE.appliance.connected && STATE.appliance.services.photon) {
        base.push({ pid: 2442, cmd: 'photon-session', stat: 'S' });
    }
    return base;
}

function runApplianceCommand(raw, context) {
    var cmd = (raw || '').trim();
    var out = { lines: [], clear: false };
    if (!cmd) return out;
    var parts = cmd.split(/\s+/);
    var c = parts[0].toLowerCase();
    var arg = parts.slice(1).join(' ');
    if (c === 'sudo') {
        if (!arg) { out.lines.push('usage: sudo <command>'); return out; }
        // sudo -l works at any stage and leaks the existence of the
        // supervisor account. This is the narrative breadcrumb: the
        // IT staff forgot the default sudoers and put everything
        // elevated under "defaultuser" instead of root.
        if (arg === '-l' || arg === '--list') {
            out.lines.push('Matching Defaults entries for ' + STATE.appliance.user + ' on gdx-appliance:');
            out.lines.push('    env_reset, mail_badpass, secure_path=/usr/sbin:/usr/bin');
            out.lines.push('');
            out.lines.push('User ' + STATE.appliance.user + ' may run the following commands on gdx-appliance:');
            out.lines.push('    (root) NOPASSWD: /bin/false');
            out.lines.push('');
            out.lines.push('# /etc/sudoers.d/90-appliance (installed by packager)');
            out.lines.push('# NOTE: root account intentionally empty; elevated operations');
            out.lines.push('# live under user "defaultuser" (internal use only, not for students).');
            out.lines.push('# Switch with: su defaultuser    (needs key from gdx-debugd)');
            return out;
        }
        if (STATE.exploit.stage < 3) { out.lines.push('sudo: permission denied (need deeper debugger patches).'); return out; }
        out.lines.push('[sudo] policy bypass accepted for: ' + arg);
        var nested = runApplianceCommand(arg, context);
        out.lines = out.lines.concat(nested.lines);
        out.clear = nested.clear;
        return out;
    }
    // su defaultuser, the supervisor-account escalation. Requires the
    // "key" produced by the debugger after the check_curriculum bypass
    // patch (stage 3 binaryPatches.bypassCurriculum). Calls into the
    // defaultuser exploit module to switch the visible session.
    if (c === 'su') {
        var target = arg.split(/\s+/)[0] || '';
        if (target !== 'defaultuser') {
            out.lines.push('su: authentication failed or unknown user: ' + (target || '(none)'));
            return out;
        }
        var hasKey = STATE.binaryPatches && (STATE.binaryPatches.bypassCurriculum || STATE.binaryPatches.curriculumNonBlocking);
        if (!hasKey) {
            out.lines.push('su: defaultuser: authentication key missing.');
            out.lines.push('    The key is emitted by gdx-debugd once the curriculum');
            out.lines.push('    check has been patched. Open the debugger and invert the');
            out.lines.push('    jz in check_curriculum (or run the Edit patch on its return).');
            return out;
        }
        if (typeof window.triggerDefaultuserExploit === 'function') {
            out.lines.push('su: authentication key accepted (from gdx-debugd).');
            out.lines.push('su: switching session owner to defaultuser…');
            // Defer the actual visual switch slightly so the shell output
            // has a chance to render before the taskbar animation runs.
            setTimeout(function() { window.triggerDefaultuserExploit('shell'); }, 120);
        } else {
            out.lines.push('su: defaultuser module not loaded.');
        }
        return out;
    }
    if (c === 'help') out.lines.push('Comenzi: help ls cd pwd cat touch mkdir whoami uname ps pidin netstat echo clear startx photon mdpatch markdown-enable sudo su logout exit');
    else if (c === 'pwd') out.lines.push(STATE.appliance.cwd);
    else if (c === 'ls') out.lines.push(shellList(pathJoin(STATE.appliance.cwd, arg || '.')));
    else if (c === 'cd') {
        var next = pathJoin(STATE.appliance.cwd, arg || '/srv');
        if (STATE.appliance.fs[next]) STATE.appliance.cwd = next;
        else out.lines.push('cd: no such directory: ' + arg);
    } else if (c === 'cat') {
        var p = pathJoin(STATE.appliance.cwd, arg);
        var src = resolveShellFile(p);
        if (src === null) out.lines.push('cat: ' + arg + ': No such file');
        else out.lines.push(src);
    } else if (c === 'whoami') out.lines.push(STATE.appliance.user);
    else if (c === 'uname') out.lines.push('QNX Neutrino qnx-appliance 6.5.0 i386');
    else if (c === 'ps' || c === 'pidin') {
        out.lines.push('PID TTY      STAT   CMD');
        getApplianceProcesses().forEach(function(pr) { out.lines.push(pr.pid + '  pts/0    ' + pr.stat + '      ' + pr.cmd); });
    } else if (c === 'netstat') {
        STATE.appliance.sockets.forEach(function(s) { out.lines.push(s); });
    } else if (c === 'touch') {
        if (!arg) out.lines.push('touch: missing file operand');
        else {
            var fp = pathJoin(STATE.appliance.cwd, arg);
            if (!fsCreateFile(fp)) out.lines.push('touch: cannot create file: ' + arg);
            else out.lines.push('created: ' + fp);
        }
    } else if (c === 'mkdir') {
        if (!arg) out.lines.push('mkdir: missing directory operand');
        else {
            var dp = pathJoin(STATE.appliance.cwd, arg);
            if (STATE.appliance.fs[dp]) out.lines.push('mkdir: already exists: ' + arg);
            else if (!fsCreateDir(dp)) out.lines.push('mkdir: cannot create directory: ' + arg);
            else out.lines.push('created dir: ' + dp);
        }
    } else if (c === 'kill') {
        var pid = parseInt(arg, 10);
        if (!pid) out.lines.push('kill: usage kill <pid>');
        else if (pid === 1 || pid === 2001) out.lines.push('kill: operation blocked for protected process ' + pid);
        else {
            var before = STATE.appliance.processes.length;
            STATE.appliance.processes = STATE.appliance.processes.filter(function(pr) { return pr.pid !== pid; });
            out.lines.push(before === STATE.appliance.processes.length ? 'kill: no such pid: ' + pid : 'signal TERM sent to pid ' + pid);
        }
    } else if (c === 'echo') out.lines.push(arg || '');
    else if (c === 'clear') out.clear = true;
    else if (c === 'photon') {
        STATE.appliance.services.photon = true;
        out.lines.push('photon: serviciu activ.');
    } else if (c === 'mdpatch' || c === 'markdown-enable') {
        STATE.appliance.services.markdown = true;
        out.lines.push('markdown: parser activat în backend-ul QNX.');
        out.lines.push('hint: fișierele .md pot fi randate acum din IDE.');
    } else if (c === 'logout') {
        STATE.appliance.user = 'student';
        out.lines.push('session reset to student.');
    } else if (c === 'startx') {
        if (STATE.exploit.stage < 2) { out.lines.push('startx: denied. Unlock reverse shell first by injecting a vulnerability.'); return out; }
        out.lines.push(STATE.exploit.injected.x11 ? '[x11] negotiating MIT-MAGIC-COOKIE-1 token...' : '[x11] warning: auth bypass missing, using degraded stream.');
        out.lines.push('[session] validating user context (' + STATE.appliance.user + ')...');
        out.lines.push('[display] attaching to :0 and loading Photon modules...');
        out.lines.push('[session] opening QNX appliance workspace...');
        out.lines.push('[forwarder] closing x11-forwarding terminal.');
        closeShell();
        openQnxSession();
        STATE.appliance.services.photon = true;
    } else if (c === 'exit') {
        if (context && context.onExit) context.onExit();
    } else out.lines.push(c + ': command not found');
    return out;
}

function renderQnxPanels() {
    $('qnxSessionStatus').textContent = 'Node: ' + STATE.appliance.env.HOSTNAME + ' · User: ' + STATE.appliance.user;
    setQnxPromptLabel();
    var cwdEntries = (STATE.appliance.fs[STATE.appliance.cwd] || []);
    if (STATE.appliance.filePreviewPath && !Object.prototype.hasOwnProperty.call(STATE.appliance.files, STATE.appliance.filePreviewPath)) {
        STATE.appliance.filePreviewPath = null;
    }
    var filesBody = '<div class="qnx-app-toolbar"><span><b>Path:</b> <code>' + escapeHtml(STATE.appliance.cwd) + '</code></span><span><b>Entries:</b> ' + cwdEntries.length + '</span></div><div class="qnx-file-grid"><div class="qnx-file-pane"><ul class="qnx-list">';
    cwdEntries.forEach(function(it) {
        var candidate = pathJoin(STATE.appliance.cwd, it);
        var isDir = !!STATE.appliance.fs[candidate];
        var action = isDir ? 'cd' : 'open';
        filesBody += '<li><button class="qnx-task-btn" data-qnx-action="' + action + '" data-qnx-target="' + escapeHtml(it) + '">' + escapeHtml(it) + (isDir ? '/' : '') + '</button></li>';
    });
    filesBody += '</ul></div>';
    var previewLabel = STATE.appliance.filePreviewPath ? escapeHtml(STATE.appliance.filePreviewPath) : '(no file open)';
    var previewData = STATE.appliance.filePreviewPath ? escapeHtml(STATE.appliance.files[STATE.appliance.filePreviewPath] || '') : 'Select a file from the list to open it in this panel.';
    filesBody += '<div class="qnx-file-pane"><p><b>Preview:</b> <code>' + previewLabel + '</code></p><pre class="qnx-file-preview">' + previewData + '</pre></div></div>';
    $('qnxFilesBody').innerHTML = filesBody;
    var procs = getApplianceProcesses();
    var procBody = '<div class="qnx-app-toolbar"><span><b>Active processes:</b> ' + procs.length + '</span><span><b>Scheduler:</b> round-robin</span></div><div class="qnx-app-grid"><div class="qnx-grid-head"><span>PID</span><span>Command</span><span>State</span></div>';
    procs.forEach(function(p) {
        var canKill = p.pid !== 1 && p.pid !== 2001;
        procBody += '<div class="qnx-grid-row"><span>' + p.pid + '</span><span>' + escapeHtml(p.cmd);
        if (canKill) procBody += ' <button class="qnx-task-btn" data-qnx-proc-action="kill" data-qnx-pid="' + p.pid + '">Terminate</button>';
        procBody += '</span><span>' + p.stat + '</span></div>';
    });
    procBody += '</div>';
    $('qnxProcessesBody').innerHTML = procBody;
    var net = '<div class="qnx-app-toolbar"><span><b>Services</b>: photon=' + (STATE.appliance.services.photon ? 'up' : 'down') + ', network=' + (STATE.appliance.services.network ? 'up' : 'down') + ', markdown=' + (STATE.appliance.services.markdown ? 'up' : 'down') + '</span></div>';
    net += '<p><button class="qnx-task-btn" data-qnx-net-action="toggle-network">' + (STATE.appliance.services.network ? 'Disable network' : 'Enable network') + '</button> ';
    net += '<button class="qnx-task-btn" data-qnx-net-action="toggle-markdown">' + (STATE.appliance.services.markdown ? 'Disable markdown parser' : 'Enable markdown parser') + '</button></p>';
    net += '<p><b>Open sockets:</b> ' + STATE.appliance.sockets.length + '</p><ul class="qnx-socket-list">';
    STATE.appliance.sockets.forEach(function(s) { net += '<li><code>' + escapeHtml(s) + '</code></li>'; });
    net += '</ul>';
    $('qnxNetworkBody').innerHTML = net;
}

function qnxWindowMap() {
    return { terminal: 'qnxWinTerminal', files: 'qnxWinFiles', processes: 'qnxWinProcesses', network: 'qnxWinNetwork' };
}

function applyWindowMeta(name, el) {
    var meta = STATE.appliance.windowMeta[name];
    if (!meta || !el) return;
    el.style.left = meta.left + 'px';
    el.style.top = meta.top + 'px';
    el.style.width = meta.width + 'px';
    el.style.height = meta.height + 'px';
}

function saveWindowMeta(name, el) {
    if (!name || !el || !STATE.appliance.windowMeta[name]) return;
    STATE.appliance.windowMeta[name] = {
        left: Math.round(parseFloat(el.style.left) || el.offsetLeft),
        top: Math.round(parseFloat(el.style.top) || el.offsetTop),
        width: Math.round(el.offsetWidth),
        height: Math.round(el.offsetHeight)
    };
}

function updateQnxTaskbarState() {
    var active = STATE.appliance.activeWindow;
    document.querySelectorAll('.qnx-taskbar [data-open-app]').forEach(function(btn) {
        var app = btn.getAttribute('data-open-app');
        btn.classList.toggle('open', !!STATE.appliance.windows[app]);
        btn.classList.toggle('active', app === active);
    });
}

function openQnxApp(name) {
    var map = qnxWindowMap();
    if (!map[name]) return;
    var el = $(map[name]);
    applyWindowMeta(name, el);
    STATE.appliance.windows[name] = true;
    el.classList.remove('minimized');
    el.classList.add('open');
    focusQnxWindow(el);
    updateQnxTaskbarState();
    renderQnxPanels();
    if (name === 'terminal') setTimeout(function(){ $('qnxTerminalInput').focus(); }, 20);
}

function closeQnxApp(name) {
    var map = qnxWindowMap();
    if (!map[name]) return;
    saveWindowMeta(name, $(map[name]));
    STATE.appliance.windows[name] = false;
    $(map[name]).classList.remove('open');
    if (STATE.appliance.activeWindow === name) STATE.appliance.activeWindow = null;
    updateQnxTaskbarState();
}

function minimizeQnxApp(name) {
    var map = qnxWindowMap();
    if (!map[name]) return;
    var el = $(map[name]);
    saveWindowMeta(name, el);
    el.classList.add('minimized');
    el.classList.remove('open');
    STATE.appliance.windows[name] = false;
    if (STATE.appliance.activeWindow === name) STATE.appliance.activeWindow = null;
    updateQnxTaskbarState();
}

function focusQnxWindow(el) {
    if (!el) return;
    // Renormalize the stack on each focus so the z-index counter
    // doesn't grow unboundedly over a long session.
    var all = Array.prototype.slice.call(document.querySelectorAll('.qnx-window'));
    all.sort(function(a, b) {
        var za = parseInt(a.style.zIndex, 10) || 0;
        var zb = parseInt(b.style.zIndex, 10) || 0;
        return za - zb;
    });
    // Put the focused window at the top of the sorted list.
    var idx = all.indexOf(el);
    if (idx !== -1) all.splice(idx, 1);
    all.push(el);
    var base = 20;
    all.forEach(function(w, i) {
        w.style.zIndex = String(base + i);
        w.classList.toggle('active', w === el);
    });
    STATE.appliance._z = base + all.length;
    STATE.appliance.activeWindow = el.getAttribute('data-app') || null;
    updateQnxTaskbarState();
}

function openQnxSession() {
    STATE.appliance.connected = true;
    $('qnxSession').classList.add('open');
    openQnxApp('terminal');
    if (!$('qnxTerminalOut').textContent.trim()) {
        emitDesktopTerminal(null, ['pterm 6.5 (xterm-256color) ready.', 'Connected to qnx-appliance-01.', 'Type `help` for commands.'], false);
    }
    setQnxPromptLabel();
    renderQnxPanels();
}

function closeQnxSession() {
    STATE.appliance.connected = false;
    STATE.appliance.activeWindow = null;
    $('qnxSession').classList.remove('open');
    updateQnxTaskbarState();
}

function setupQnxWindowDragging() {
    var workspace = $('qnxWorkspace');
    if (!workspace || workspace._dragReady) return;
    workspace._dragReady = true;
    var drag = { active: false, win: null, dx: 0, dy: 0 };
    var resize = { active: false, win: null, app: null, startX: 0, startY: 0, startW: 0, startH: 0 };
    workspace.querySelectorAll('.qnx-window').forEach(function(win) {
        var bar = win.querySelector('.qnx-window-bar');
        var app = win.getAttribute('data-app');
        if (!bar) return;
        bar.addEventListener('mousedown', function(e) {
            if (e.target.closest('.qnx-win-btn')) return;
            drag.active = true;
            drag.win = win;
            var r = win.getBoundingClientRect();
            drag.dx = e.clientX - r.left;
            drag.dy = e.clientY - r.top;
            focusQnxWindow(win);
            document.body.style.userSelect = 'none';
            e.preventDefault();
        });
        var handle = win.querySelector('.qnx-resize-handle');
        if (handle) {
            handle.addEventListener('mousedown', function(e) {
                resize.active = true;
                resize.win = win;
                resize.app = app;
                resize.startX = e.clientX;
                resize.startY = e.clientY;
                resize.startW = win.offsetWidth;
                resize.startH = win.offsetHeight;
                focusQnxWindow(win);
                document.body.style.userSelect = 'none';
                e.preventDefault();
            });
        }
    });
    document.addEventListener('mousemove', function(e) {
        if (!drag.active || !drag.win) return;
        var ws = workspace.getBoundingClientRect();
        var w = drag.win.offsetWidth;
        var h = drag.win.offsetHeight;
        var left = e.clientX - ws.left - drag.dx;
        var top = e.clientY - ws.top - drag.dy;
        left = Math.max(0, Math.min(left, Math.max(0, ws.width - w)));
        top = Math.max(0, Math.min(top, Math.max(0, ws.height - h)));
        drag.win.style.left = left + 'px';
        drag.win.style.top = top + 'px';
    });
    document.addEventListener('mousemove', function(e) {
        if (!resize.active || !resize.win) return;
        var ws = workspace.getBoundingClientRect();
        var winRect = resize.win.getBoundingClientRect();
        var nextW = resize.startW + (e.clientX - resize.startX);
        var nextH = resize.startH + (e.clientY - resize.startY);
        var maxW = ws.right - winRect.left;
        var maxH = ws.bottom - winRect.top;
        nextW = Math.max(320, Math.min(nextW, maxW));
        nextH = Math.max(200, Math.min(nextH, maxH));
        resize.win.style.width = Math.round(nextW) + 'px';
        resize.win.style.height = Math.round(nextH) + 'px';
    });
    document.addEventListener('mouseup', function() {
        if (drag.active && drag.win) {
            saveWindowMeta(drag.win.getAttribute('data-app'), drag.win);
            drag.active = false;
            drag.win = null;
        }
        if (resize.active && resize.win) {
            saveWindowMeta(resize.app, resize.win);
            resize.active = false;
            resize.win = null;
            resize.app = null;
        }
        document.body.style.userSelect = '';
    });
}

function emitDesktopTerminal(prompt, lines, clear) {
    var el = $('qnxTerminalOut');
    if (clear) el.innerHTML = '';
    if (prompt) el.textContent += prompt + '\n';
    lines.forEach(function(l) { el.textContent += l + '\n'; });
    el.scrollTop = el.scrollHeight;
}

$('qnxDisconnectBtn').addEventListener('click', closeQnxSession);
$('qnxStartBtn').addEventListener('click', function() { $('qnxLauncher').classList.toggle('open'); });
document.querySelectorAll('[data-open-app]').forEach(function(btn) {
    btn.addEventListener('click', function() {
        var app = btn.getAttribute('data-open-app');
        if (STATE.appliance.windows[app]) {
            var map = qnxWindowMap();
            focusQnxWindow($(map[app]));
        } else {
            openQnxApp(app);
        }
        $('qnxLauncher').classList.remove('open');
    });
});
document.querySelectorAll('[data-close-app]').forEach(function(btn) {
    btn.addEventListener('click', function() { closeQnxApp(btn.getAttribute('data-close-app')); });
});
document.querySelectorAll('[data-min-app]').forEach(function(btn) {
    btn.addEventListener('click', function() { minimizeQnxApp(btn.getAttribute('data-min-app')); });
});
$('qnxWorkspace').addEventListener('mousedown', function(e) {
    var win = e.target.closest && e.target.closest('.qnx-window');
    if (win) focusQnxWindow(win);
});
$('qnxPromptLabel').addEventListener('click', function() { $('qnxTerminalInput').focus(); });
$('qnxTerminalRunBtn').addEventListener('click', function() {
    var val = $('qnxTerminalInput').value.trim();
    if (!val) return;
    var prompt = appliancePrompt() + ' ' + val;
    STATE.appliance.termHistory.push(val);
    STATE.appliance.termHistoryIdx = STATE.appliance.termHistory.length;
    STATE.appliance.user = STATE.exploit.shellUser;
    var res = runApplianceCommand(val, {});
    emitDesktopTerminal(prompt, res.lines, res.clear);
    STATE.exploit.shellCwd = STATE.appliance.cwd;
    $('qnxTerminalInput').value = '';
    setQnxPromptLabel();
    renderQnxPanels();
    setShellPrompt();
    $('qnxTerminalInput').focus();
});
$('qnxTerminalInput').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
        $('qnxTerminalRunBtn').click();
        return;
    }
    if (e.key === 'ArrowUp') {
        if (!STATE.appliance.termHistory.length) return;
        e.preventDefault();
        STATE.appliance.termHistoryIdx = Math.max(0, STATE.appliance.termHistoryIdx - 1);
        this.value = STATE.appliance.termHistory[STATE.appliance.termHistoryIdx] || '';
    } else if (e.key === 'ArrowDown') {
        if (!STATE.appliance.termHistory.length) return;
        e.preventDefault();
        STATE.appliance.termHistoryIdx = Math.min(STATE.appliance.termHistory.length, STATE.appliance.termHistoryIdx + 1);
        this.value = STATE.appliance.termHistory[STATE.appliance.termHistoryIdx] || '';
    }
});
$('qnxFilesBody').addEventListener('click', function(e) {
    var t = e.target;
    if (!t || !t.getAttribute) return;
    var target = t.getAttribute('data-qnx-target');
    var action = t.getAttribute('data-qnx-action');
    if (!target || !action) return;
    if (action === 'open') {
        var filePath = pathJoin(STATE.appliance.cwd, target);
        if (!Object.prototype.hasOwnProperty.call(STATE.appliance.files, filePath)) {
            emitDesktopTerminal(appliancePrompt() + ' open ' + target, ['open: file unavailable: ' + target], false);
            return;
        }
        STATE.appliance.filePreviewPath = filePath;
        emitDesktopTerminal(appliancePrompt() + ' open ' + target, ['opened in File Browser preview: ' + filePath], false);
        renderQnxPanels();
        return;
    }
    var cmd = action + ' ' + target;
    var res2 = runApplianceCommand(cmd, {});
    emitDesktopTerminal(appliancePrompt() + ' ' + cmd, res2.lines, res2.clear);
    if (action === 'cd') STATE.appliance.filePreviewPath = null;
    renderQnxPanels();
});
$('qnxProcessesBody').addEventListener('click', function(e) {
    var t = e.target;
    if (!t || !t.getAttribute) return;
    var act = t.getAttribute('data-qnx-proc-action');
    var pid = t.getAttribute('data-qnx-pid');
    if (!act || !pid) return;
    if (act === 'kill') {
        var res = runApplianceCommand('kill ' + pid, {});
        emitDesktopTerminal(appliancePrompt() + ' kill ' + pid, res.lines, res.clear);
        renderQnxPanels();
    }
});
$('qnxNetworkBody').addEventListener('click', function(e) {
    var t = e.target;
    if (!t || !t.getAttribute) return;
    var act = t.getAttribute('data-qnx-net-action');
    if (!act) return;
    if (act === 'toggle-network') {
        STATE.appliance.services.network = !STATE.appliance.services.network;
        emitDesktopTerminal(appliancePrompt(), ['network service ' + (STATE.appliance.services.network ? 'enabled' : 'disabled') + '.'], false);
    } else if (act === 'toggle-markdown') {
        STATE.appliance.services.markdown = !STATE.appliance.services.markdown;
        emitDesktopTerminal(appliancePrompt(), ['markdown parser ' + (STATE.appliance.services.markdown ? 'enabled' : 'disabled') + '.'], false);
    }
    renderQnxPanels();
});
document.addEventListener('click', function(e) {
    var launcher = $('qnxLauncher');
    var start = $('qnxStartBtn');
    if (!launcher.classList.contains('open')) return;
    if (launcher.contains(e.target) || e.target === start) return;
    launcher.classList.remove('open');
});
