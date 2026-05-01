/* ============================================================
   DR. WATSON: MAIN UI
   The main drwtsn32 window. Property sheet on top with the log
   path / wave file / instruction count / errors-to-save / dump
   type / six options checkboxes (the real Dr. Watson layout).
   Application Errors list below with selectable rows. Buttons:
   View, Clear, Help.

   View opens the per-fault detail dialog. That detail dialog has
   three tabs: Details (the textual log), CPU State (registers +
   disassembly from drwatson-vm.js), and Patch (the patch panel
   from drwatson-patches.js that hooks into applyPatch).

   This module exposes window.openDrWatson(); the Server 2003
   desktop module routes the Start menu and Run dispatcher to it.
   ============================================================ */
(function() {

    function esc(s) {
        return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    var selectedFaultIdx = -1;
    var currentFaults = [];

    function openDrWatson() {
        if (document.getElementById('drwtsn32Win')) return;
        var snap = (window.STATE && window.STATE.defaultuser && window.STATE.defaultuser.migratedSnapshot) || {};
        currentFaults = (typeof window.buildDrWatsonFaults === 'function') ?
            window.buildDrWatsonFaults(snap) : [];
        selectedFaultIdx = -1;

        var bd = document.createElement('div');
        bd.id = 'drwtsn32Win';
        bd.className = 'dialog-backdrop open srv2k3-drwatson';
        bd.innerHTML = buildMainHtml();
        document.body.appendChild(bd);

        bd.addEventListener('click', function(e) {
            if (e.target === bd || (e.target.getAttribute && e.target.getAttribute('data-run-close') != null)) {
                bd.remove();
                return;
            }
            var row = e.target.closest && e.target.closest('[data-drw-fault]');
            if (row) {
                var idx = parseInt(row.getAttribute('data-drw-fault'), 10);
                selectFault(bd, idx);
            }
        });

        document.getElementById('drwView').addEventListener('click', function() {
            if (selectedFaultIdx < 0) return;
            openDrWatsonDetail(currentFaults[selectedFaultIdx]);
        });
        document.getElementById('drwClear').addEventListener('click', function() {
            currentFaults.length = 0;
            selectedFaultIdx = -1;
            document.getElementById('drwList').innerHTML = renderFaultRows();
            refreshButtons();
        });
        document.getElementById('drwHelp').addEventListener('click', function() {
            if (window.showToast) window.showToast('Asistența nu este instalată pe acest server.');
        });
    }

    function selectFault(bd, idx) {
        selectedFaultIdx = idx;
        Array.prototype.forEach.call(bd.querySelectorAll('.drw-fault'), function(r) {
            r.classList.toggle('selected', parseInt(r.getAttribute('data-drw-fault'), 10) === idx);
        });
        refreshButtons();
    }
    function refreshButtons() {
        var v = document.getElementById('drwView');
        if (v) v.disabled = (selectedFaultIdx < 0);
    }

    function renderFaultRows() {
        if (!currentFaults.length) {
            return '<div class="drw-empty">Nu au fost înregistrate erori de aplicații.</div>';
        }
        return currentFaults.map(function(f, i) {
            return '<div class="drw-fault" data-drw-fault="' + i + '">' +
                '<span class="drw-fault-mod">' + esc(f.module) + '</span>' +
                '<span class="drw-fault-lbl">' + esc(f.label) + '</span>' +
                '<span class="drw-fault-code">' + esc(f.code) + '</span>' +
                '</div>';
        }).join('');
    }

    function buildMainHtml() {
        return '<div class="dialog" style="max-width: 540px;">' +
            '<div class="dialog-header">Dr. Watson pentru Windows</div>' +
            '<div class="dialog-body" style="padding: 14px 16px;">' +
            '<div class="drw-row"><label>Cale fișier jurnal:</label>' +
            '<input type="text" class="srv2k3-run-input" readonly value="C:\\Documents and Settings\\defaultuser\\Application Data\\Microsoft\\Dr Watson"></div>' +
            '<div class="drw-row"><label>Crash Dump:</label>' +
            '<input type="text" class="srv2k3-run-input" readonly value="C:\\Documents and Settings\\defaultuser\\Application Data\\Microsoft\\Dr Watson\\user.dmp"></div>' +
            '<div class="drw-row drw-row-split">' +
            '<div><label>Fișier Wave:</label>' +
            '<input type="text" class="srv2k3-run-input" placeholder="(none)"></div>' +
            '<div><label>Număr de instrucțiuni:</label>' +
            '<input type="text" class="srv2k3-run-input" value="10" style="width:60px;"></div>' +
            '<div><label>Număr de erori salvate:</label>' +
            '<input type="text" class="srv2k3-run-input" value="10" style="width:60px;"></div>' +
            '</div>' +
            '<div class="drw-row drw-row-split">' +
            '<div><label>Tip Crash Dump:</label>' +
            '<select class="srv2k3-run-input"><option>Mini</option><option selected>Full</option><option>NT4 compatible Full</option></select></div>' +
            '</div>' +
            '<fieldset class="drw-options"><legend>Opțiuni</legend>' +
            '<label class="drw-check"><input type="checkbox" checked> Dump tabelă simboluri</label>' +
            '<label class="drw-check"><input type="checkbox" checked> Dump pentru toate contextele thread</label>' +
            '<label class="drw-check"><input type="checkbox" checked> Adăugare la fișierul de jurnal existent</label>' +
            '<label class="drw-check"><input type="checkbox"> Notificare vizuală</label>' +
            '<label class="drw-check"><input type="checkbox"> Notificare sonoră</label>' +
            '<label class="drw-check"><input type="checkbox" checked> Creare fișier Crash Dump</label>' +
            '</fieldset>' +
            '<div class="drw-row"><label style="font-weight:700;">Erori aplicații</label></div>' +
            '<div class="drw-list" id="drwList">' + renderFaultRows() + '</div>' +
            '<div class="drw-actions">' +
            '<button class="btn" id="drwView" disabled>Vizualizare</button>' +
            '<button class="btn" id="drwClear">Golire</button>' +
            '</div>' +
            '</div>' +
            '<div class="dialog-footer">' +
            '<button class="btn" data-run-close>Anulare</button>' +
            '<button class="btn" id="drwHelp">Ajutor</button>' +
            '<button class="btn suggested" data-run-close>OK</button>' +
            '</div>' +
            '</div>';
    }

    // ------------------------------------------------------------
    // PER-FAULT DETAIL DIALOG
    // ------------------------------------------------------------
    function openDrWatsonDetail(fault) {
        if (document.getElementById('drwtsn32Detail')) return;
        var bd = document.createElement('div');
        bd.id = 'drwtsn32Detail';
        bd.className = 'dialog-backdrop open srv2k3-drwatson-details';

        var regs = window.DrWatsonVm.parseRegisters(fault.details);
        var disasmHtml = window.DrWatsonVm.renderDisassemblyHtml(fault, regs);
        var regsHtml = window.DrWatsonVm.renderRegistersHtml(regs);

        bd.innerHTML =
            '<div class="dialog" style="max-width: 620px;">' +
            '<div class="dialog-header">' + esc(fault.module) + ' &mdash; ' + esc(fault.label) + '</div>' +
            '<div class="dialog-body" style="padding: 0;">' +
            '<div class="drw-detail-tabs">' +
            '<button class="drw-detail-tab active" data-drw-tab="details">Detalii</button>' +
            '<button class="drw-detail-tab" data-drw-tab="cpu">Stare CPU</button>' +
            '<button class="drw-detail-tab" data-drw-tab="patch">Patch</button>' +
            '</div>' +
            '<div class="drw-detail-pane" data-drw-pane="details">' +
            '<pre class="drw-detail">' + esc(fault.details) + '</pre>' +
            '</div>' +
            '<div class="drw-detail-pane" data-drw-pane="cpu" hidden>' +
            '<div class="drw-vm-header">Registre la momentul excepției</div>' +
            regsHtml +
            '<div class="drw-vm-header">Disasamblare în jurul EIP</div>' +
            disasmHtml +
            '</div>' +
            '<div class="drw-detail-pane" data-drw-pane="patch" hidden>' +
            renderPatchPane(fault) +
            '</div>' +
            '</div>' +
            '<div class="dialog-footer">' +
            '<button class="btn suggested" data-run-close>OK</button>' +
            '</div>' +
            '</div>';
        document.body.appendChild(bd);

        bd.addEventListener('click', function(e) {
            if (e.target === bd || (e.target.getAttribute && e.target.getAttribute('data-run-close') != null)) {
                bd.remove();
                return;
            }
        });

        bd.querySelectorAll('.drw-detail-tab').forEach(function(tab) {
            tab.addEventListener('click', function() {
                var t = tab.getAttribute('data-drw-tab');
                bd.querySelectorAll('.drw-detail-tab').forEach(function(x) { x.classList.toggle('active', x === tab); });
                bd.querySelectorAll('.drw-detail-pane').forEach(function(p) {
                    var on = p.getAttribute('data-drw-pane') === t;
                    if (on) p.removeAttribute('hidden'); else p.setAttribute('hidden', '');
                });
            });
        });

        // Patch pane: wire Apply / Revert buttons
        var applyBtn = bd.querySelector('#drwPatchApply');
        var revertBtn = bd.querySelector('#drwPatchRevert');
        var statusEl = bd.querySelector('#drwPatchStatus');
        function refreshPatchStatus() {
            var on = window.DrWatsonPatch.isPatched(fault);
            if (statusEl) statusEl.textContent = on ?
                'Patch instalat. Programul rulează cu modificarea aplicată.' :
                'Patch neinstalat. Programul rulează în starea originală.';
            if (applyBtn) applyBtn.disabled = on;
            if (revertBtn) revertBtn.disabled = !on;
        }
        if (applyBtn) {
            applyBtn.addEventListener('click', function() {
                var action = bd.querySelector('input[name=drwPatchAction]:checked');
                var act = action ? action.value : 'nop';
                var ok = window.DrWatsonPatch.apply(fault, act);
                if (ok) {
                    if (window.showToast) window.showToast('Patch aplicat pe ' + fault.patchTarget.fn + '+' + fault.patchTarget.idx + '.');
                    refreshPatchStatus();
                } else {
                    if (window.showToast) window.showToast('Nu s-a putut aplica patch-ul. Verificați dacă funcția există.');
                }
            });
        }
        if (revertBtn) {
            revertBtn.addEventListener('click', function() {
                var ok = window.DrWatsonPatch.revert(fault);
                if (ok) {
                    if (window.showToast) window.showToast('Patch retras de pe ' + fault.patchTarget.fn + '+' + fault.patchTarget.idx + '.');
                    refreshPatchStatus();
                }
            });
        }
        refreshPatchStatus();
    }

    function renderPatchPane(fault) {
        if (!fault.patchTarget) {
            return '<div class="drw-patch"><p>Această eroare nu are un punct de patch asociat.</p></div>';
        }
        var t = fault.patchTarget;
        return '<div class="drw-patch">' +
            '<div class="drw-patch-target">' +
            '<span class="drw-patch-target-label">Țintă:</span> ' +
            '<code>' + esc(t.fn) + '+' + t.idx + '</code>' +
            '</div>' +
            '<p class="drw-patch-explain">Dr. Watson poate aplica un patch binar la această instrucțiune. Modificarea se propagă imediat în programul în execuție: Verifică și Execută vor folosi versiunea modificată.</p>' +
            '<fieldset class="drw-patch-actions"><legend>Acțiune</legend>' +
            '<label class="drw-check"><input type="radio" name="drwPatchAction" value="nop"' + (t.action === 'nop' ? ' checked' : '') + '> NOP &mdash; înlocuiește instrucțiunea cu un no-op (90)</label>' +
            '<label class="drw-check"><input type="radio" name="drwPatchAction" value="invert"' + (t.action === 'invert' ? ' checked' : '') + '> INVERT &mdash; inversează direcția unui salt condiționat</label>' +
            '<label class="drw-check"><input type="radio" name="drwPatchAction" value="edit"' + (t.action === 'edit' ? ' checked' : '') + '> EDIT &mdash; mov eax, 0x0 (B8 00 00 00 00)</label>' +
            '</fieldset>' +
            '<div class="drw-patch-buttons">' +
            '<button class="btn" id="drwPatchApply">Aplică patch</button>' +
            '<button class="btn" id="drwPatchRevert">Retrage patch</button>' +
            '</div>' +
            '<div class="drw-patch-status" id="drwPatchStatus"></div>' +
            '</div>';
    }

    // Expose globally so srv2003-desktop.js can route to us.
    window.openDrWatson = openDrWatson;
})();
