/* ============================================================
   RECYCLE BIN
   Recycle Bin window. Empty by default; the empty state is
   the joke. Single-file module, no external dependencies
   beyond iconRecycle from the icons module.
   ============================================================ */
(function() {
    function openRecycleBin() {
        if (document.getElementById('recycleWin')) return;
        var bd = document.createElement('div');
        bd.id = 'recycleWin';
        bd.className = 'dialog-backdrop open srv2k3-recycle';
        bd.setAttribute('role', 'dialog');
        bd.setAttribute('aria-modal', 'true');
        bd.innerHTML =
            '<div class="dialog" style="max-width: 480px;">' +
            '<div class="dialog-header">Coș de reciclare</div>' +
            '<div class="dialog-body" style="padding: 0;">' +
            '<div class="mycomp-toolbar"><span class="mycomp-addr">Adresă:</span><input type="text" class="srv2k3-run-input" value="Coș de reciclare" readonly></div>' +
            '<div class="recycle-empty">' +
            '<div class="recycle-empty-icon">' + iconRecycle() + '</div>' +
            '<p>Coșul de reciclare este gol.</p>' +
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

    window.openRecycleBin = openRecycleBin;
})();
