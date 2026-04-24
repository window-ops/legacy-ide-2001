/* ============================================================
   THEME
   Dark/light toggle. applyTheme reads STATE.prefs.dark and
   toggles the .dark class on <html>; bindThemeControls wires
   the theme toolbar button. Called from js/ui/preferences.js
   and from js/core/init.js on startup.
   ============================================================ */
function applyTheme() {
    document.documentElement.classList.toggle('dark', !!STATE.prefs.dark);
}

function bindThemeControls() {
    var themeBtn = $('btnTheme');
    if (themeBtn) {
        themeBtn.addEventListener('click', function() {
            STATE.prefs.dark = !STATE.prefs.dark;
            if ($('prefDark')) $('prefDark').checked = !!STATE.prefs.dark;
            applyTheme();
        });
    }
}

bindThemeControls();
applyTheme();
