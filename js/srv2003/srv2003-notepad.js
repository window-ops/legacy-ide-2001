/* ============================================================
   NOTEPAD
   Notepad window: simple text editor with File / Edit /
   Format menus that mostly toast as not-implemented.
   ============================================================ */
(function() {
    function openNotepad() {
        if (document.getElementById('notepadWin')) {
            var existing = document.getElementById('notepadWin');
            existing.style.zIndex = 999;
            return;
        }
        var bd = document.createElement('div');
        bd.id = 'notepadWin';
        bd.className = 'dialog-backdrop open srv2k3-notepad';
        bd.setAttribute('role', 'dialog');
        bd.setAttribute('aria-modal', 'true');
        bd.innerHTML =
            '<div class="dialog" style="max-width: 600px;">' +
            '<div class="dialog-header">Fără titlu - Notepad</div>' +
            '<div class="np-menubar">' +
            '<button class="np-menu" data-np-menu="file">Fișier</button>' +
            '<button class="np-menu" data-np-menu="edit">Editare</button>' +
            '<button class="np-menu" data-np-menu="format">Format</button>' +
            '<button class="np-menu" data-np-menu="view">Vizualizare</button>' +
            '<button class="np-menu" data-np-menu="help">Ajutor</button>' +
            '</div>' +
            '<textarea class="np-text" id="npText" spellcheck="false"></textarea>' +
            '<div class="dialog-footer">' +
            '<button class="btn suggested" data-run-close>Închide</button>' +
            '</div>' +
            '</div>';
        document.body.appendChild(bd);
        bd.addEventListener('click', function(e) {
            if (e.target === bd || (e.target.getAttribute && e.target.getAttribute('data-run-close') != null)) bd.remove();
        });
        bd.querySelectorAll('.np-menu').forEach(function(m) {
            m.addEventListener('click', function() {
                var which = m.getAttribute('data-np-menu');
                if (which === 'file') showToast('Operațiile pe fișiere nu sunt disponibile în această versiune de Notepad.');
                else if (which === 'edit') document.getElementById('npText').focus();
                else if (which === 'format') {
                    var ta = document.getElementById('npText');
                    ta.classList.toggle('wrap');
                    showToast('Word Wrap ' + (ta.classList.contains('wrap') ? 'enabled' : 'disabled') + '.');
                }
                else if (which === 'view') showToast('Bara de stare este disponibilă doar când Word Wrap este dezactivat.');
                else if (which === 'help') showToast('Despre Notepad: Microsoft \u00ae Windows Server 2003 Notepad. Versiunea 5.2 (Build 3790).');
            });
        });
    }

    window.openNotepad = openNotepad;
})();
