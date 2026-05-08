/* ============================================================
   SERVER 2003 STATE PERSISTENCE
   Persists Server-2003-specific state across page reloads using
   sessionStorage. Covers: networkUp (whether the user disabled
   the network from the tray), IIS site states (whether the user
   stopped Curriculum Reporting), and a savedBackend flag so
   re-enabling the network restores the prior backend state.

   Storage key: 'ide.srv2k3.state.v1'
   Shape:
     {
       networkUp: boolean,
       backendBeforeDown: boolean,
       sites: [
         { desc: string, state: 'Running' | 'Stopped' }
       ]
     }
   ============================================================ */
(function() {
    var STORAGE_KEY = 'ide.srv2k3.state.v1';

    function load() {
        try {
            var raw = sessionStorage.getItem(STORAGE_KEY);
            if (!raw) return null;
            return JSON.parse(raw);
        } catch (e) {
            return null;
        }
    }

    function save(data) {
        try {
            sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        } catch (e) {}
    }

    function clear() {
        try { sessionStorage.removeItem(STORAGE_KEY); } catch (e) {}
    }

    // Hydrate the runtime STATE from persisted data. Called once at
    // mountDesktop time so a page reload after disabling the network
    // (or stopping Curriculum Reporting) preserves the prior state.
    function hydrate() {
        var data = load();
        if (!data) return null;
        if (typeof data.networkUp === 'boolean') {
            STATE.networkUp = data.networkUp;
        }
        if (typeof data.backendBeforeDown === 'boolean') {
            STATE._backendBeforeDown = data.backendBeforeDown;
        }
        return data;  // Caller may use data.sites to seed role admin state.
    }

    // Persist the current runtime state. Called whenever the user
    // toggles the network or starts/stops a site. The role admin
    // module owns its per-instance .sites list and pushes it through
    // saveSites(); other modules push through saveNetwork().
    function saveNetwork() {
        var existing = load() || {};
        existing.networkUp = STATE.networkUp !== false;
        if (typeof STATE._backendBeforeDown === 'boolean') {
            existing.backendBeforeDown = STATE._backendBeforeDown;
        } else {
            delete existing.backendBeforeDown;
        }
        save(existing);
    }

    function saveSites(sites) {
        var existing = load() || {};
        // Only the description and state columns are worth persisting;
        // host header, IP, port etc. don\'t change at runtime.
        existing.sites = sites.map(function(s) {
            return { desc: s.desc, state: s.state };
        });
        save(existing);
    }

    // Apply persisted site states on top of a default site list. Used
    // by the role admin to merge persisted Stopped/Running flags onto
    // the default sites array on open.
    function applySitesTo(defaultSites) {
        var data = load();
        if (!data || !data.sites) return defaultSites;
        defaultSites.forEach(function(site) {
            var match = data.sites.find(function(s) { return s.desc === site.desc; });
            if (match) site.state = match.state;
        });
        return defaultSites;
    }

    window.SRV2K3_STATE = {
        load: load,
        save: save,
        clear: clear,
        hydrate: hydrate,
        saveNetwork: saveNetwork,
        saveSites: saveSites,
        applySitesTo: applySitesTo
    };
})();
