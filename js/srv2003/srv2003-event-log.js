/* ============================================================
   SERVER 2003 EVENT LOG
   Persistent event log for the Event Viewer snap-in. Three logs
   (System, Application, Security), each a ring buffer capped at
   200 entries to keep sessionStorage size bounded.

   Storage key: 'ide.srv2k3.eventlog.v1'
   Shape:
     {
       System:      [{when, source, type, eventID, message}, ...],
       Application: [...],
       Security:    [...]
     }

   Type values match real Windows: 'Information', 'Warning',
   'Error', 'Success Audit', 'Failure Audit'. Most user-facing
   writes are Information; backend rejection is a Warning;
   patches detected by Curriculum Reporting are Errors.

   The QNX Reset flow calls clear() to wipe the log along with
   the rest of Server-2003 state. New sessions start with a
   small bootstrap of plausible boot-time entries so the log
   doesn\'t look unnaturally empty.
   ============================================================ */
(function() {
    var STORAGE_KEY = 'ide.srv2k3.eventlog.v1';
    var CAP = 200;
    var LOGS = ['System', 'Application', 'Security'];

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
        try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch (e) {}
    }

    function bootstrap() {
        // First-boot entries that should appear on a freshly mounted
        // Server 2003. The dates use the Server 2003-era convention.
        var now = Date.now();
        var min = 60 * 1000;
        return {
            System: [
                { when: now - 90 * min, source: 'EventLog',          type: 'Information', eventID: 6005, message: 'Serviciul Event Log a fost pornit.' },
                { when: now - 89 * min, source: 'Service Control Manager', type: 'Information', eventID: 7036, message: 'Serviciul „IIS Admin Service" este în stare de Pornit.' },
                { when: now - 89 * min, source: 'Service Control Manager', type: 'Information', eventID: 7036, message: 'Serviciul „World Wide Web Publishing Service" este în stare de Pornit.' },
                { when: now - 88 * min, source: 'Service Control Manager', type: 'Information', eventID: 7036, message: 'Serviciul „CurriculumReporting" este în stare de Pornit.' },
                { when: now - 60 * min, source: 'TermService',       type: 'Information', eventID: 1006, message: 'Serviciul Terminal Services a primit o cerere de conectare.' }
            ],
            Application: [
                { when: now - 89 * min, source: 'IIS-W3SVC',         type: 'Information', eventID: 1003, message: 'Site-ul „Default Web Site" a fost pornit pe portul 80.' },
                { when: now - 89 * min, source: 'IIS-W3SVC',         type: 'Information', eventID: 1003, message: 'Site-ul „Curriculum Reporting" a fost pornit pe portul 80 (host curriculum.gdx-appliance).' },
                { when: now - 88 * min, source: 'CurriculumReporting', type: 'Information', eventID: 100, message: 'Modulul de revalidare programa s-a inițializat cu succes. Reguli încărcate: 174.' }
            ],
            Security: [
                { when: now - 90 * min, source: 'Security',          type: 'Success Audit', eventID: 528, message: 'Conectare reușită: Utilizator: ADMINISTRATOR, Tip: 2 (Interactive).' }
            ]
        };
    }

    function read(logName) {
        var data = load();
        if (!data) {
            data = bootstrap();
            save(data);
        }
        return (data && data[logName]) || [];
    }

    function readAll() {
        var data = load() || bootstrap();
        return data;
    }

    function write(entry) {
        // entry: { log, source, type, eventID, message }
        var logName = entry.log || 'Application';
        if (LOGS.indexOf(logName) < 0) logName = 'Application';
        var data = load();
        if (!data) data = bootstrap();
        if (!data[logName]) data[logName] = [];
        data[logName].push({
            when: Date.now(),
            source:  entry.source  || 'Application',
            type:    entry.type    || 'Information',
            eventID: entry.eventID || 0,
            message: entry.message || ''
        });
        // Cap at CAP entries, drop oldest first.
        if (data[logName].length > CAP) {
            data[logName] = data[logName].slice(-CAP);
        }
        save(data);
    }

    function clear() {
        try { sessionStorage.removeItem(STORAGE_KEY); } catch (e) {}
    }

    function clearLog(logName) {
        var data = load();
        if (!data) return;
        data[logName] = [];
        save(data);
    }

    window.SRV2K3_EVENTLOG = {
        read: read,
        readAll: readAll,
        write: write,
        clear: clear,
        clearLog: clearLog,
        LOGS: LOGS
    };
})();
