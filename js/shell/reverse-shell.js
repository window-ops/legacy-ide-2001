/* ============================================================
   REVERSE SHELL / EXPLOIT STAGES
   ============================================================ */
function updateExploitStage() {
    var ex = STATE.exploit;
    var oldStage = ex.stage;
    var stage = 0;
    var injectedCount = 0;
    Object.keys(ex.injected).forEach(function(k) { if (ex.injected[k]) injectedCount++; });
    if (injectedCount >= 1) stage = 2;
    if (stage >= 2 && (STATE.binaryPatches.bypassCurriculum || STATE.binaryPatches.curriculumNonBlocking || STATE.binaryPatches.bypassOSCheck || injectedCount >= 2)) {
        stage = 3;
    }
    if (stage >= 3 && ex.injected.x11) stage = 4;
    ex.stage = stage;
    ex.shellUser = ex.stage >= 3 ? 'root' : 'student';
    ex.x11Ready = ex.stage >= 4;
    STATE.appliance.user = ex.shellUser;
    if (ex.stage !== oldStage) {
        if (ex.stage === 2) dbgLog('warn', 'Reverse shell deblocat după injectarea vulnerabilității. Profesorul deja se sperie.');
        if (ex.stage === 3) dbgLog('effect', 'Escaladare privilegii completă: context root obținut.');
        if (ex.stage === 4) dbgLog('effect', 'Tunel X11 pregătit. Comanda <code>startx</code> este acum disponibilă.');
    }
    setShellPrompt();
}

function injectVulnerability(kind) {
    if (!STATE.exploit.injected.hasOwnProperty(kind)) return;
    STATE.exploit.injected[kind] = true;
    dbgLog('patch', 'Mock-vuln injectat: <code>' + escapeHtml(kind) + '</code>.');
    dbgLog('warn', 'Avertisment: profesorul va fi speriat atât de debugger, cât și de reverse shell.');
    updateExploitStage();
    if (STATE.exploit.stage >= 2) dbgLog('info', 'Puteți deschide acum <b>Reverse shell</b> direct din toolbar.');
}

function openShell() {
    openDialog('shellBackdrop');
    STATE.appliance.user = STATE.exploit.shellUser;
    if (!$('shellOutput').children.length) {
        shellLine('reverse@legacy: connection established from 10.0.0.13:4444');
        shellLine('Type `help` for available commands.');
    }
    setShellPrompt();
    setTimeout(function(){ $('shellInput').focus(); }, 20);
}

function closeShell() {
    closeDialog('shellBackdrop');
}

function runShellCommand(raw) {
    var cmd = (raw || '').trim();
    if (!cmd) return;
    STATE.exploit.shellHistory.push(cmd);
    shellLine(escapeHtml($('shellPrompt').textContent + ' ' + cmd));
    STATE.appliance.user = STATE.exploit.shellUser;
    STATE.appliance.cwd = STATE.exploit.shellCwd;
    var res = runApplianceCommand(cmd, { onExit: closeShell });
    if (res.clear) $('shellOutput').innerHTML = '';
    res.lines.forEach(function(l) { shellLine(escapeHtml(l)); });
    STATE.exploit.shellCwd = STATE.appliance.cwd;
    setShellPrompt();
    renderQnxPanels();
}

$('dbgInjectVulnBtn').addEventListener('click', function() { injectVulnerability($('dbgVulnSelect').value); });
$('dbgOpenShellBtn').addEventListener('click', function() {
    if (STATE.exploit.stage < 2) {
        dbgLog('warn', 'Reverse shell indisponibil. Injectați cel puțin o vulnerabilitate mock.');
        showToast('Reverse shell blocat: injectați o vulnerabilitate.');
        return;
    }
    STATE.appliance.user = STATE.exploit.shellUser;
    STATE.appliance.cwd = STATE.exploit.shellCwd;
    setShellPrompt();
    openShell();
});

$('shellCloseBtn').addEventListener('click', closeShell);
$('shellClearBtn').addEventListener('click', function() { $('shellOutput').innerHTML = ''; });
$('shellRunBtn').addEventListener('click', function() {
    runShellCommand($('shellInput').value);
    $('shellInput').value = '';
    $('shellInput').focus();
});
$('shellInput').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') $('shellRunBtn').click();
    if (e.key === 'Escape') closeShell();
});
