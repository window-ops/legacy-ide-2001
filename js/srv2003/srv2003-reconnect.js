/* ============================================================
   RECONNECT TO SERVER
   After a Reset cycle, the user might want to re-enter the
   Server 2003 environment without redoing the migration quiz.
   The Reset handler preserves the migration snapshot under
   STATE.defaultuser.lastSnapshot specifically for this purpose.

   This module shows a small floating badge in the bottom-right
   of the QNX session whenever:
     - STATE.defaultuser.phase === 'locked', AND
     - STATE.defaultuser.lastSnapshot is present.

   Clicking the badge restores the snapshot, sets phase to
   'server2003', and calls mountDesktop(), same path as the
   ?srv2k3=1 URL trigger.

   Persists the dismissed-this-session flag in sessionStorage
   so the badge doesn\'t re-appear after the user dismisses it.
   ============================================================ */
(function() {
    var BADGE_ID = 'reconnectBadge';
    var DISMISSED_KEY = 'ide.srv2k3.reconnectDismissed.v1';

    function isDismissed() {
        try { return sessionStorage.getItem(DISMISSED_KEY) === '1'; } catch (e) { return false; }
    }
    function setDismissed() {
        try { sessionStorage.setItem(DISMISSED_KEY, '1'); } catch (e) {}
    }
    function clearDismissed() {
        try { sessionStorage.removeItem(DISMISSED_KEY); } catch (e) {}
    }

    function shouldShow() {
        if (typeof STATE === 'undefined' || !STATE.defaultuser) return false;
        // Only show when the user has actively re-entered the path
        // toward Server 2003 (defaultuser exploit re-triggered, but
        // they\'re still in the migration flow). After Reset they\'re
        // in 'locked' state; the badge stays hidden until they
        // re-engage the exploit. This avoids surprising users who
        // didn\'t intend to go back.
        var phase = STATE.defaultuser.phase;
        if (phase !== 'unlocked' && phase !== 'migration') return false;
        if (!STATE.defaultuser.lastSnapshot) return false;
        if (isDismissed()) return false;
        return true;
    }

    function reconnect() {
        if (!STATE || !STATE.defaultuser || !STATE.defaultuser.lastSnapshot) return;
        // Move the snapshot back to the active slot.
        STATE.defaultuser.migratedSnapshot = STATE.defaultuser.lastSnapshot;
        STATE.defaultuser.phase = 'server2003';
        try {
            sessionStorage.setItem('ide.defaultuser.v1', JSON.stringify(STATE.defaultuser));
        } catch (e) {}
        document.documentElement.setAttribute('data-du-phase', 'server2003');
        // Hide the badge before mounting so it doesn\'t flash on top.
        var b = document.getElementById(BADGE_ID);
        if (b) b.remove();
        // Mount. mountDesktop() lives in srv2003-desktop.js and is on
        // window.
        if (typeof window.mountDesktop === 'function') {
            window.mountDesktop();
        } else {
            // Fallback: full reload, the URL trigger or phase hook
            // will mount.
            location.reload();
        }
    }

    function makeBadge() {
        var b = document.createElement('div');
        b.id = BADGE_ID;
        b.className = 'reconnect-badge';
        b.setAttribute('role', 'region');
        b.setAttribute('aria-label', 'Reconectare la sesiunea anterioară Windows Server 2003');
        b.innerHTML =
            '<button class="reconnect-badge-close" aria-label="Închide" title="Închide acest mesaj">&times;</button>' +
            '<div class="reconnect-badge-title">Sesiune anterioară detectată</div>' +
            '<div class="reconnect-badge-body">' +
            'O imagine de Windows Server 2003 din această sesiune a fost preluată în arhiva de recuperare. ' +
            'Reconectarea sare peste chestionarul de migrare și remontează direct ecranul Server 2003.' +
            '</div>' +
            '<button class="reconnect-badge-action">Reconectare la Server</button>';
        document.body.appendChild(b);
        b.querySelector('.reconnect-badge-close').addEventListener('click', function() {
            setDismissed();
            b.remove();
        });
        b.querySelector('.reconnect-badge-action').addEventListener('click', reconnect);
        return b;
    }

    function refresh() {
        var existing = document.getElementById(BADGE_ID);
        if (shouldShow()) {
            if (!existing) makeBadge();
        } else {
            if (existing) existing.remove();
        }
    }

    // On Reset the dismissal flag should not persist forever. Clear it
    // when a new lastSnapshot lands. Since lastSnapshot is set inside
    // performShutdown before phase flips to locked, we observe the
    // transition via a polling refresh that runs once a second on the
    // QNX side.
    var lastSnapshotSeen = null;
    function tick() {
        if (!STATE || !STATE.defaultuser) return;
        var s = STATE.defaultuser.lastSnapshot;
        if (s && s !== lastSnapshotSeen) {
            // New snapshot, clear dismissal so the badge reappears.
            clearDismissed();
            lastSnapshotSeen = s;
        }
        refresh();
    }

    function start() {
        refresh();
        setInterval(tick, 1000);
    }

    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        setTimeout(start, 0);
    } else {
        document.addEventListener('DOMContentLoaded', start);
    }

    window.SRV2K3_RECONNECT = {
        refresh: refresh,
        reconnect: reconnect
    };
})();
