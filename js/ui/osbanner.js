/* ============================================================
   OS BANNER
   ============================================================ */
function detectOS() {
    var ua = navigator.userAgent || '';
    var platform = (navigator.platform || '').toLowerCase();
    if (/Win/i.test(ua) || platform.indexOf('win') === 0) return 'Windows';
    if (/Android/i.test(ua)) return 'Android';
    if (/iPhone|iPad|iPod/i.test(ua)) return 'iOS';
    if (/Mac/i.test(ua) || platform.indexOf('mac') === 0) return 'macOS';
    if (/Linux|X11|Ubuntu|Fedora|Debian/i.test(ua)) return 'Linux';
    return 'necunoscut';
}
function renderBanner() {
    var el = $('banner');
    if (STATE.binaryPatches && STATE.binaryPatches.bypassOSCheck) { el.innerHTML = ''; return; }
    if (runtimeEffects().programBroken) { el.innerHTML = ''; return; }
    if (!STATE.prefs.osBanner || STATE.bannerDismissed || STATE.os === 'Windows') { el.innerHTML = ''; return; }
    var osName = STATE.os;
    var msg;
    if (osName === 'macOS' || osName === 'Linux') msg = '<b>Sistem de operare nesuportat:</b> ' + osName + '. Calculatoarele din laboratorul de informatică rulează <b>Microsoft Windows</b>.';
    else if (osName === 'iOS' || osName === 'Android') msg = '<b>Dispozitiv mobil detectat (' + osName + '):</b> programa 2001 nu prevede dispozitive portabile.';
    else msg = '<b>Sistem de operare nedetectat:</b> programa prevede strict <b>Microsoft Windows</b>.';
    el.innerHTML = '<div class="banner">' +
        '<svg viewBox="0 0 16 16" fill="currentColor"><path d="M8 1L1 14h14L8 1zm0 4l4.5 7.5h-9L8 5zm-.5 2v3h1V7h-1zm0 4v1h1v-1h-1z"/></svg>' +
        '<div class="banner-text">' + msg + '</div>' +
        '<button class="banner-btn" id="bannerPrefs">Preferințe</button>' +
        '<button class="banner-close" id="bannerClose" aria-label="Închide">' +
        '<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M4 4l8 8m0-8l-8 8" stroke="currentColor" stroke-width="1.5" fill="none"/></svg>' +
        '</button></div>';
    $('bannerClose').onclick = function() { STATE.bannerDismissed = true; renderBanner(); };
    $('bannerPrefs').onclick = function() { openDialog('prefsBackdrop'); };
}
