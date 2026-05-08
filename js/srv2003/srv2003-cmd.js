/* ============================================================
   CMD PROMPT
   A working cmd.exe shell with mock filesystem (C:\, D:\, A:\,
   E:\), tab completion, history, and a small set of internal
   commands (cd, dir, type, echo, ver, cls, ipconfig, ping, time,
   date, exit). Self-contained, no external dependencies.
   ============================================================ */
(function() {
    function openCmdPrompt() {
        if (document.getElementById('cmdWin')) return;
        var bd = document.createElement('div');
        bd.id = 'cmdWin';
        bd.className = 'dialog-backdrop open srv2k3-cmd';
        bd.setAttribute('role', 'dialog');
        bd.setAttribute('aria-modal', 'true');
        bd.innerHTML =
            '<div class="dialog" style="max-width: 640px;">' +
            '<div class="dialog-header">C:\\WINDOWS\\system32\\cmd.exe</div>' +
            '<div class="dialog-body" style="padding: 0;">' +
            '<div class="cmd-screen" id="cmdScreen" tabindex="0">' +
            '<div class="cmd-out" id="cmdOut"></div>' +
            '<div class="cmd-line"><span class="cmd-prompt" id="cmdPrompt"></span><span class="cmd-buf" id="cmdBuf"></span><span class="cmd-caret"></span></div>' +
            '</div>' +
            '</div>' +
            '<div class="dialog-footer">' +
            '<button class="btn suggested" data-run-close>Inchide</button>' +
            '</div>' +
            '</div>';
        document.body.appendChild(bd);
        bd.addEventListener('click', function(e) {
            if (e.target === bd || (e.target.getAttribute && e.target.getAttribute('data-run-close') != null)) bd.remove();
        });

        var out = document.getElementById('cmdOut');
        var promptEl = document.getElementById('cmdPrompt');
        var bufEl = document.getElementById('cmdBuf');
        var screen = document.getElementById('cmdScreen');

        // Mock filesystem with case-insensitive resolution.
        var FS = {
            'C:\\': {
                'Documents and Settings': { type: 'd' },
                'Program Files': { type: 'd' },
                'WINDOWS': { type: 'd' },
                'Inetpub': { type: 'd' },
                'pagefile.sys': { type: 'f', size: 1310720000 },
                'boot.ini': { type: 'f', size: 211 },
                'NTDETECT.COM': { type: 'f', size: 47564 },
                'ntldr': { type: 'f', size: 295536 },
                'AUTOEXEC.BAT': { type: 'f', size: 0 },
                'CONFIG.SYS': { type: 'f', size: 0 }
            },
            'C:\\Documents and Settings': {
                'Administrator': { type: 'd' },
                'All Users': { type: 'd' },
                'Default User': { type: 'd' },
                'defaultuser': { type: 'd' }
            },
            'C:\\Documents and Settings\\defaultuser': {
                'Application Data': { type: 'd' },
                'Desktop': { type: 'd' },
                'Favorites': { type: 'd' },
                'My Documents': { type: 'd' },
                'Start Menu': { type: 'd' },
                'ntuser.dat': { type: 'f', size: 1024 },
                'ntuser.ini': { type: 'f', size: 178 }
            },
            'C:\\Documents and Settings\\defaultuser\\Desktop': {},
            'C:\\Documents and Settings\\defaultuser\\My Documents': {
                'readme.txt': { type: 'f', size: 412 }
            },
            'C:\\Program Files': {
                'Common Files': { type: 'd' },
                'Internet Explorer': { type: 'd' },
                'Microsoft.NET': { type: 'd' },
                'Windows NT': { type: 'd' }
            },
            'C:\\WINDOWS': {
                'system32': { type: 'd' },
                'Help': { type: 'd' },
                'Web': { type: 'd' },
                'Fonts': { type: 'd' },
                'Media': { type: 'd' },
                'explorer.exe': { type: 'f', size: 1037312 },
                'notepad.exe': { type: 'f', size: 70144 },
                'regedit.exe': { type: 'f', size: 146432 },
                'win.ini': { type: 'f', size: 220 },
                'system.ini': { type: 'f', size: 227 }
            },
            'C:\\WINDOWS\\system32': {
                'drivers': { type: 'd' },
                'config': { type: 'd' },
                'cmd.exe': { type: 'f', size: 401408 },
                'kernel32.dll': { type: 'f', size: 998400 },
                'ntdll.dll': { type: 'f', size: 712704 },
                'user32.dll': { type: 'f', size: 580096 },
                'drwtsn32.exe': { type: 'f', size: 121344 },
                'taskmgr.exe': { type: 'f', size: 137216 },
                'shutdown.exe': { type: 'f', size: 21504 }
            },
            'C:\\Inetpub': {
                'wwwroot': { type: 'd' },
                'AdminScripts': { type: 'd' },
                'Logs': { type: 'd' }
            }
        };

        function fsKey(path) {
            var n = path.replace(/\\+/g, '\\').replace(/\\$/, '');
            if (n.length === 2 && n.charAt(1) === ':') n = n + '\\';
            return n;
        }
        function resolveDir(path) {
            var key = fsKey(path);
            if (FS[key]) return key;
            var parts = key.split('\\').filter(function(s) { return s; });
            if (!parts.length || !/^[a-z]:$/i.test(parts[0])) return null;
            var cur = parts[0].toUpperCase() + '\\';
            if (!FS[cur]) return null;
            for (var i = 1; i < parts.length; i++) {
                var node = FS[cur];
                var seg = parts[i];
                var match = null;
                for (var name in node) {
                    if (Object.prototype.hasOwnProperty.call(node, name) &&
                        name.toLowerCase() === seg.toLowerCase() &&
                        node[name].type === 'd') {
                        match = name;
                        break;
                    }
                }
                if (!match) return null;
                cur = (cur.endsWith('\\') ? cur : cur + '\\') + match;
            }
            return cur;
        }

        var cwd = 'C:\\Documents and Settings\\defaultuser';
        var buf = '';

        function refreshPrompt() { promptEl.textContent = cwd + '>'; }
        function refreshBuf() {
            bufEl.textContent = buf;
            screen.scrollTop = screen.scrollHeight;
        }
        function appendLine(text) {
            var div = document.createElement('div');
            div.className = 'cmd-row';
            div.textContent = text || '\u00a0';
            out.appendChild(div);
        }
        function appendBlock(arr) { arr.forEach(appendLine); }

        appendLine('Microsoft Windows [Version 5.2.3790]');
        appendLine('(C) Copyright 1985-2003 Microsoft Corp.');
        appendLine('');
        refreshPrompt();
        refreshBuf();
        screen.focus();
        screen.addEventListener('mousedown', function(e) {
            if (e.target.closest && e.target.closest('.cmd-row')) return;
            e.preventDefault();
            screen.focus();
        });

        function runLine(line) {
            appendLine(cwd + '>' + line);
            var trimmed = line.trim();
            if (!trimmed) return;
            var parts = trimmed.split(/\s+/);
            var cmd = parts[0].toLowerCase();
            var arg = parts.slice(1).join(' ');

            if (cmd === 'ver') {
                appendLine('');
                appendLine('Microsoft Windows [Version 5.2.3790]');
                appendLine('');
            } else if (cmd === 'cls') {
                out.innerHTML = '';
            } else if (cmd === 'exit') {
                document.getElementById('cmdWin').remove();
                return;
            } else if (cmd === 'echo') {
                appendLine(arg.length ? arg : 'ECHO este activat.');
            } else if (cmd === 'whoami') {
                appendLine('GDX-APPLIANCE\\defaultuser');
            } else if (cmd === 'hostname') {
                appendLine('GDX-APPLIANCE');
            } else if (cmd === 'pwd') {
                appendLine(cwd);
            } else if (cmd === 'time') {
                appendLine('Ora curenta este: ' + new Date().toLocaleTimeString());
                appendLine('Introduceti noua ora:');
            } else if (cmd === 'date') {
                appendLine('Data curenta este: ' + new Date().toLocaleDateString());
                appendLine('Introduceti noua data: (ll-zz-aa)');
            } else if (cmd === 'cd' || cmd === 'chdir') {
                handleCd(arg);
            } else if (cmd === 'dir') {
                handleDir(arg);
            } else if (cmd === 'ipconfig') {
                appendBlock([
                    '',
                    'Configuratie IP Windows',
                    '',
                    'Placa Ethernet Local Area Connection:',
                    '',
                    '   Sufix DNS specific conexiunii . . : ',
                    '   Adresa IP . . . . . . . . . . . . : 10.0.0.42',
                    '   Masca subretea  . . . . . . . . . : 255.255.255.0',
                    '   Gateway implicit  . . . . . . . . : 10.0.0.1',
                    ''
                ]);
            } else if (cmd === 'systeminfo') {
                appendBlock([
                    '',
                    'Host Name:                 GDX-APPLIANCE',
                    'Nume SO:                   Microsoft(R) Windows(R) Server 2003, Standard Edition',
                    'Versiune SO:               5.2.3790 Build 3790',
                    'Proprietar inregistrat:    defaultuser',
                    'Memorie fizica totala:     512 MB',
                    'Memorie fizica disponibila:339 MB',
                    'Director Windows:          C:\\WINDOWS',
                    'Director sistem:           C:\\WINDOWS\\system32',
                    ''
                ]);
            } else if (cmd === 'help') {
                appendBlock([
                    'Pentru mai multe informatii despre o comanda, tastati HELP nume-comanda',
                    'CD       Afiseaza numele directorului curent sau il schimba.',
                    'CLS      Curata ecranul.',
                    'DATE     Afiseaza sau seteaza data.',
                    'DIR      Afiseaza lista fisierelor si subdirectoarelor dintr-un director.',
                    'ECHO     Afiseaza mesaje sau activeaza/dezactiveaza ecoul comenzilor.',
                    'EXIT     Paraseste programul CMD.EXE (interpretorul de comenzi).',
                    'HOSTNAME Afiseaza numele de gazda al calculatorului.',
                    'IPCONFIG Afiseaza configuratia IP pentru toate placile de retea.',
                    'SYSTEMINFO Afiseaza informatii detaliate despre configuratie.',
                    'TIME     Afiseaza sau seteaza ora sistemului.',
                    'VER      Afiseaza versiunea Windows.',
                    'WHOAMI   Afiseaza numele utilizatorului curent.',
                    ''
                ]);
            } else {
                appendLine("'" + parts[0] + "' nu este recunoscut ca o comanda interna sau externa,");
                appendLine('un program executabil sau un fisier batch.');
            }
            screen.scrollTop = screen.scrollHeight;
        }

        function handleCd(arg) {
            if (!arg) { appendLine(cwd); return; }
            arg = arg.replace(/^"(.*)"$/, '$1');
            var target;
            if (arg === '\\' || arg === '/') {
                target = 'C:\\';
            } else if (arg === '..') {
                var parts2 = cwd.split('\\').filter(function(s) { return s; });
                if (parts2.length > 1) {
                    parts2.pop();
                    target = parts2.join('\\');
                    if (target.length === 2) target = target + '\\';
                } else {
                    target = cwd;
                }
            } else if (arg === '.') {
                target = cwd;
            } else if (/^[a-z]:\\?/i.test(arg)) {
                target = arg.replace(/\//g, '\\');
            } else {
                target = (cwd.endsWith('\\') ? cwd : cwd + '\\') + arg.replace(/\//g, '\\');
            }
            var resolved = resolveDir(target);
            if (!resolved) {
                appendLine('Sistemul nu poate gasi calea specificata.');
                return;
            }
            cwd = resolved;
            refreshPrompt();
        }

        function handleDir(arg) {
            var target = arg ? ((cwd.endsWith('\\') ? cwd : cwd + '\\') + arg) : cwd;
            var resolved = resolveDir(target);
            if (!resolved) {
                appendLine(' Sistemul nu poate gasi calea specificata.');
                return;
            }
            var node = FS[resolved] || {};
            var dirs = 0, files = 0, totalBytes = 0;
            var rows = [
                ' Volumul din unitatea C nu are eticheta.',
                ' Numarul de serie al volumului este 7F3A-2E91',
                '',
                ' Director: ' + resolved,
                ''
            ];
            var stamp = new Date().toLocaleDateString() + '  04:00 PM';
            if (resolved !== 'C:\\') {
                rows.push(stamp + '    <DIR>          .');
                rows.push(stamp + '    <DIR>          ..');
                dirs += 2;
            }
            for (var name in node) {
                if (!Object.prototype.hasOwnProperty.call(node, name)) continue;
                var entry = node[name];
                if (entry.type === 'd') {
                    rows.push(stamp + '    <DIR>          ' + name);
                    dirs++;
                } else {
                    var sz = String(entry.size || 0);
                    var sizeStr = '                '.slice(sz.length) + sz;
                    rows.push(stamp + '    ' + sizeStr + ' ' + name);
                    files++;
                    totalBytes += entry.size || 0;
                }
            }
            var totalStr = String(totalBytes).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
            rows.push('               ' + files + ' Fisier(e)  ' + totalStr + ' octeti');
            rows.push('               ' + dirs + ' Dir(s)   4.213.432.320 octeti liberi');
            rows.push('');
            appendBlock(rows);
        }

        var history = [];
        var historyIdx = 0;
        screen.addEventListener('keydown', function(e) {
            if (e.ctrlKey || e.metaKey || e.altKey) return;
            if (e.key === 'Enter') {
                e.preventDefault();
                var line = buf;
                history.push(line);
                historyIdx = history.length;
                buf = '';
                refreshBuf();
                runLine(line);
                refreshPrompt();
            } else if (e.key === 'Backspace') {
                e.preventDefault();
                buf = buf.slice(0, -1);
                refreshBuf();
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                if (historyIdx > 0) {
                    historyIdx--;
                    buf = history[historyIdx] || '';
                    refreshBuf();
                }
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                if (historyIdx < history.length - 1) {
                    historyIdx++;
                    buf = history[historyIdx] || '';
                } else {
                    historyIdx = history.length;
                    buf = '';
                }
                refreshBuf();
            } else if (e.key === 'Tab') {
                e.preventDefault();
                var m = buf.match(/^(\s*(cd|chdir|dir)\s+)(.*)$/i);
                if (m) {
                    var prefix = m[1];
                    var partial = m[3].toLowerCase();
                    var node = FS[cwd] || {};
                    var matches = [];
                    for (var name in node) {
                        if (Object.prototype.hasOwnProperty.call(node, name) &&
                            name.toLowerCase().indexOf(partial) === 0) {
                            matches.push(name);
                        }
                    }
                    if (matches.length === 1) {
                        var pick = matches[0];
                        if (pick.indexOf(' ') >= 0) pick = '"' + pick + '"';
                        buf = prefix + pick;
                        refreshBuf();
                    }
                }
            } else if (e.key === 'Escape') {
                e.preventDefault();
                buf = '';
                refreshBuf();
            } else if (e.key.length === 1) {
                e.preventDefault();
                buf += e.key;
                refreshBuf();
            }
        });
    }


    window.openCmdPrompt = openCmdPrompt;
})();
