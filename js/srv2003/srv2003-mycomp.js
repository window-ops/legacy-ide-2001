/* ============================================================
   MY COMPUTER
   My Computer window: lists the four mock drives (C:, D:,
   A:, E:) with sizes and types. Self-contained.
   ============================================================ */
(function() {
    function openMyComputer() {
        if (document.getElementById('mycompWin')) return;
        var bd = document.createElement('div');
        bd.id = 'mycompWin';
        bd.className = 'dialog-backdrop open srv2k3-mycomp';
        bd.setAttribute('role', 'dialog');
        bd.setAttribute('aria-modal', 'true');
        bd.innerHTML =
            '<div class="dialog" style="max-width: 540px;">' +
            '<div class="dialog-header">Computerul meu</div>' +
            '<div class="dialog-body" style="padding: 0;">' +
            '<div class="mycomp-toolbar"><span class="mycomp-addr">Adresă:</span><input type="text" class="srv2k3-run-input" value="Computerul meu" readonly></div>' +
            '<div class="mycomp-grid">' +
            '<div class="mycomp-section"><div class="mycomp-section-title">Unități hard disk</div>' +
            '<div class="mycomp-items">' +
            '<div class="mycomp-item"><div class="mycomp-icon mycomp-icon-disk"></div><div class="mycomp-name">Disc local (C:)</div><div class="mycomp-sub">3,92 GO liberi din 19,5 GO</div></div>' +
            '<div class="mycomp-item"><div class="mycomp-icon mycomp-icon-disk"></div><div class="mycomp-name">Disc local (D:)</div><div class="mycomp-sub">12,0 GO liberi din 12,0 GO</div></div>' +
            '</div></div>' +
            '<div class="mycomp-section"><div class="mycomp-section-title">Dispozitive cu stocare amovibilă</div>' +
            '<div class="mycomp-items">' +
            '<div class="mycomp-item"><div class="mycomp-icon mycomp-icon-floppy"></div><div class="mycomp-name">Dischetă 3&#189; (A:)</div></div>' +
            '<div class="mycomp-item"><div class="mycomp-icon mycomp-icon-cd"></div><div class="mycomp-name">Unitate CD (E:)</div></div>' +
            '</div></div>' +
            '</div>' +
            '</div>' +
            '<div class="dialog-footer">' +
            '<button class="btn suggested" data-run-close>Închide</button>' +
            '</div>' +
            '</div>';
        document.body.appendChild(bd);
        bd.addEventListener('click', function(e) {
            if (e.target === bd || (e.target.getAttribute && e.target.getAttribute('data-run-close') != null)) bd.remove();
        });
    }

    window.openMyComputer = openMyComputer;
})();
