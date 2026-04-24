/* ============================================================
   DEBUGGER DOCUMENTATION PANEL
   Tabbed help panel for the GDX debugger. Mounts its markup on
   first open, wires tab nav click/keyboard behaviour, and
   manages open/close state on #dbgDocsPanel.
   ============================================================ */

function bindDebuggerHelpTabs(root) {
    if (!root) return;
    var tabs = Array.prototype.slice.call(root.querySelectorAll('.dbg-help-tab'));
    var pages = Array.prototype.slice.call(root.querySelectorAll('.dbg-help-page'));
    function activate(tab) {
        var target = tab.getAttribute('data-help');
        tabs.forEach(function(t) { t.setAttribute('aria-selected', t === tab ? 'true' : 'false'); });
        pages.forEach(function(p) { p.classList.toggle('active', p.getAttribute('data-help-page') === target); });
    }
    tabs.forEach(function(tab, idx) {
        tab.addEventListener('click', function() {
            activate(tab);
        });
        tab.addEventListener('keydown', function(e) {
            if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp' &&
                e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
            e.preventDefault();
            var forward = e.key === 'ArrowDown' || e.key === 'ArrowRight';
            var next = forward ? (idx + 1) % tabs.length : (idx - 1 + tabs.length) % tabs.length;
            tabs[next].focus();
            activate(tabs[next]);
        });
    });
}

function ensureDebuggerDocsMounted() {
    var mount = $('dbgDocsContent');
    if (!mount || mount.children.length) return;
    mount.innerHTML = '' +
        '<section class="dbg-help" aria-label="Documentație debugger">' +
        '  <nav class="dbg-help-nav" role="tablist" aria-label="Secțiuni documentație">' +
        '    <button class="dbg-help-tab" role="tab" aria-selected="true" data-help="quick">Pornire rapidă</button>' +
        '    <button class="dbg-help-tab" role="tab" aria-selected="false" data-help="instr">Instrucțiuni ASM</button>' +
        '    <button class="dbg-help-tab" role="tab" aria-selected="false" data-help="patches">Rețete de patch</button>' +
        '    <button class="dbg-help-tab" role="tab" aria-selected="false" data-help="runtime">Modificări la runtime</button>' +
        '    <button class="dbg-help-tab" role="tab" aria-selected="false" data-help="markdown">Suport Markdown (IDE)</button>' +
        '    <button class="dbg-help-tab" role="tab" aria-selected="false" data-help="exploit">Flux exploit</button>' +
        '    <button class="dbg-help-tab" role="tab" aria-selected="false" data-help="qnx">Model backend QNX</button>' +
        '    <button class="dbg-help-tab" role="tab" aria-selected="false" data-help="mobile">Accesibilitate mobil</button>' +
        '    <button class="dbg-help-tab" role="tab" aria-selected="false" data-help="limits">Limite simulare</button>' +
        '  </nav>' +
        '  <div class="dbg-help-main">' +
        '    <article class="dbg-help-page active" data-help-page="quick">' +
        '      <h4>Pornire rapidă</h4>' +
        '      <p>Deschideți debuggerul cu <code>Ctrl+Shift+D</code>. Selectați funcția, apoi folosiți <code>Step</code> și <code>Continue</code> pentru a urmări fluxul.</p>' +
        '      <p>Exploit-ul are stadii: <code>0</code> (blocat), <code>2</code> (reverse shell), <code>3</code> (root), <code>4</code> (X11 ready).</p>' +
        '      <div class="dbg-help-callout"><b>Flux recomandat:</b> identificați saltul/return-ul critic, aplicați patch minim (invert/edit), apoi validați efectul în jurnal și în comportament.</div>' +
        '    </article>' +
        '    <article class="dbg-help-page" data-help-page="instr">' +
        '      <h4>Instrucțiuni ASM (x86_64): ghid practic</h4>' +
        '      <p>Debuggerul GDX afișează listare în stil Intel (destinația este primul operand). Modelul de execuție este <b>64-bit</b>, cu registre generale <code>rax..r15</code>, pointeri <code>rbp</code>/<code>rsp</code> și pointerul de instrucțiuni <code>rip</code>.</p>' +
        '      <h5>Formate de operanzi</h5>' +
        '      <ul>' +
        '        <li><b>Registre</b>: <code>rax</code>, <code>rbp</code>, <code>r10</code>.</li>' +
        '        <li><b>Imediate</b>: <code>0x1</code>, <code>0x2a</code> (hex). În UI vei vedea frecvent imediate pentru coduri de retur (<code>mov eax, 0x1</code>).</li>' +
        '        <li><b>Memorie</b>: <code>[rbp-0x08]</code>, <code>[rbp+0x10]</code> (adresare relativă la frame, folosită în prolog/epilog și salvări temporare).</li>' +
        '        <li><b>Label-uri</b>: <code>.clean</code> (ținte pentru <code>j*</code> / <code>jmp</code>).</li>' +
        '      </ul>' +
        '      <h5>Flag-uri relevante (RFLAGS)</h5>' +
        '      <p>Salturile condiționate (<code>Jcc</code>) consultă flag-uri precum <code>ZF</code>, <code>CF</code>, <code>SF</code>, <code>OF</code>. În practică:</p>' +
        '      <ul>' +
        '        <li><b>ZF</b> (zero): setat când rezultatul este 0. <code>JE</code>/<code>JZ</code> sare dacă <code>ZF=1</code>; <code>JNE</code>/<code>JNZ</code> sare dacă <code>ZF=0</code>.</li>' +
        '        <li><b>CF</b> (carry/borrow): folosit la comparații nesemnate. <code>JB</code>/<code>JC</code> pentru <code>CF=1</code>; <code>JAE</code>/<code>JNC</code> pentru <code>CF=0</code>.</li>' +
        '        <li><b>SF/OF</b>: folosite la comparații semnate. De ex. <code>JG</code> sare când <code>ZF=0</code> și <code>SF=OF</code>.</li>' +
        '      </ul>' +
        '      <h5>ABI (System V AMD64): ce înseamnă în debugger</h5>' +
        '      <p>În user-space Linux/ELF, argumentele 1..6 sunt în mod tipic în <code>rdi</code>, <code>rsi</code>, <code>rdx</code>, <code>rcx</code>, <code>r8</code>, <code>r9</code>; valoarea de retur în <code>rax</code>. Stiva este aliniată la 16 bytes la frontiera de <code>call</code> (în termeni ABI, <code>(rsp+8)</code> multiplu de 16). Există și o <b>red zone</b> de 128 bytes sub <code>rsp</code> pentru funcții leaf.</p>' +
        '      <div class="dbg-help-callout"><b>Tipar de patch “forțare succes”:</b> dacă o funcție raportează succes/eroare prin <code>eax</code>/<code>rax</code>, un patch realist este <code>Edit</code> pe instrucțiunea din epilog: <code>mov eax, 0x0</code> (sau <code>mov eax, 0x1</code>) imediat înainte de <code>ret</code>.</div>' +
        '      <h5>Mnemonice uzuale (subset util în această simulare)</h5>' +
        '      <table class="dbg-help-table"><thead><tr><th>Mnemonic</th><th>Rol</th><th>Note practice</th></tr></thead><tbody>' +
        '        <tr><td><code>mov</code></td><td>copiere</td><td>Nu setează flag-uri.</td></tr>' +
        '        <tr><td><code>test</code>/<code>cmp</code></td><td>setează flag-uri</td><td>Controlează <code>Jcc</code> fără a scrie rezultat.</td></tr>' +
        '        <tr><td><code>jz</code>/<code>jnz</code></td><td>branch pe ZF</td><td>Ținte tipice: label-uri ca <code>.clean</code>, <code>.deny</code>.</td></tr>' +
        '        <tr><td><code>call</code>/<code>ret</code></td><td>apel/retur</td><td><code>call</code> împinge adresa de retur pe stivă.</td></tr>' +
        '        <tr><td><code>leave</code></td><td>epilog frame</td><td>Echivalent semantic: <code>mov rsp, rbp; pop rbp</code>.</td></tr>' +
        '        <tr><td><code>nop</code></td><td>no-op</td><td>Opcode 0x90; utilizat la patching.</td></tr>' +
        '      </tbody></table>' +
        '    </article>' +
        '    <article class="dbg-help-page" data-help-page="patches">' +
        '      <h4>Patching la cald: practici și riscuri</h4>' +
        '      <p>Într-un binar real, patching-ul trebuie să respecte <b>lungimea instrucțiunii</b> și <b>efectele secundare</b> (flag-uri, stivă, convenții). În această simulare păstrăm aceleași principii: patch-ul afectează listarea și activează “efecte” în program.</p>' +
        '      <h5>Tehnici</h5>' +
        '      <ul>' +
        '        <li><b>NOP</b>: înlocuiește instrucțiunea cu <code>90</code> repetat (aceeași lungime). Bun pentru neutralizarea unui <code>call</code> sau a unui guard, dar poate lăsa starea inconsistentă.</li>' +
        '        <li><b>Invert</b>: schimbă un <code>Jcc</code> în opusul lui (ex. <code>jz</code> ↔ <code>jnz</code>). Este patch-ul “curat” când vrei doar control-flow.</li>' +
        '        <li><b>Edit</b>: rescrie mnemonic+operanzi. Folosește-l pentru forțare de retur (<code>mov eax, 0x0</code>) sau pentru salt explicit.</li>' +
        '      </ul>' +
        '      <h5>Rețete rapide</h5>' +
        '      <table class="dbg-help-table"><thead><tr><th>Scenariu</th><th>Patch minim</th><th>De ce</th></tr></thead><tbody>' +
        '        <tr><td>Ocolire verificare</td><td><code>Invert</code> pe <code>jz</code>/<code>jne</code></td><td>Nu schimbă starea, doar ramura.</td></tr>' +
        '        <tr><td>Suprimare mesaj</td><td><code>NOP</code> pe <code>call fputs@PLT</code></td><td>Elimină efectul vizibil (traceback).</td></tr>' +
        '        <tr><td>Forțare succes</td><td><code>Edit</code> → <code>mov eax, 0x0</code></td><td>Stabilește explicit codul de retur.</td></tr>' +
        '      </tbody></table>' +
        '      <div class="dbg-help-callout"><b>Validare:</b> după patch, folosiți <code>Reset RIP</code>, executați aceeași secvență și urmăriți în jurnal apariția unui mesaj <code>effect</code>.</div>' +
        '    </article>' +
        '    <article class="dbg-help-page" data-help-page="runtime">' +
        '      <h4>Modificări runtime</h4>' +
        '      <p>Jurnalul separă evenimentele: <code>patch</code> (modificare), <code>effect</code> (impact), <code>warn</code> (risc), <code>err</code> (stare invalidă). Într-un debugger real, acesta ar corespunde combinației dintre log-uri, tracepoints și observații asupra registrelor.</p>' +
        '      <h5>Workflow recomandat</h5>' +
        '      <ol>' +
        '        <li><b>Stabilește “baseline”</b>: 2–3 <code>Step</code> și notează <code>rip</code>, ramura luată și orice schimbare în <code>rax</code>.</li>' +
        '        <li><b>Aplică patch minim</b>: de obicei <code>Invert</code> pe un <code>Jcc</code> imediat după un <code>test/cmp</code>.</li>' +
        '        <li><b>Re-rulează identic</b>: <code>Reset RIP</code>, apoi repetă pașii. Diferența trebuie să fie locală (ramura) și vizibilă în <code>effect</code>.</li>' +
        '      </ol>' +
        '      <div class="dbg-help-callout"><b>Jcc mini-cheat-sheet:</b> <code>je/jz</code>: ZF=1; <code>jne/jnz</code>: ZF=0; <code>ja</code>: CF=0 &amp;&amp; ZF=0 (unsigned); <code>jg</code>: ZF=0 &amp;&amp; SF=OF (signed).</div>' +
        '    </article>' +
        '    <article class="dbg-help-page" data-help-page="markdown">' +
        '      <h4>Suport Markdown în IDE</h4>' +
        '      <p>Suportul Markdown aparține pipeline-ului IDE și backend-ului QNX. Activați parserul cu <code>mdpatch</code> / <code>markdown-enable</code> în shell.</p>' +
        '    </article>' +
        '    <article class="dbg-help-page" data-help-page="exploit">' +
        '      <h4>Flux exploit</h4>' +
        '      <p>Acest IDE simulează o escaladare “enterprise legacy”: patch-uri mici pe ramuri critice, urmate de schimbarea contextului (shell → root → desktop). Stadiile sunt intenționat simplificate, deși apar termeni reali (ABI, control-flow, return codes).</p>' +
        '      <h5>Stadii</h5>' +
        '      <ul>' +
        '        <li><b>Stage 0</b> (blocat): verificări de policy/curriculum și “OS gate”.</li>' +
        '        <li><b>Stage 2</b> (reverse shell): după injectarea vulnerabilității mock, ai un canal de comenzi. Țintă tipică: o ramură după <code>cmp/test</code>.</li>' +
        '        <li><b>Stage 3</b> (root): patch-uri care forțează “OK” pe verificări (de regulă invertarea <code>jz/jnz</code> sau setarea codului de retur în <code>eax</code>).</li>' +
        '        <li><b>Stage 4</b> (X11 ready): trecere la UI/desktop. Din shell, <code>startx</code> deschide desktopul.</li>' +
        '      </ul>' +
        '      <h5>De ce “Invert” e prima opțiune</h5>' +
        '      <p>Într-o verificare clasică, secvența este <code>test/cmp</code> → <code>jcc</code> → bloc <code>deny</code>/<code>allow</code>. Invertarea <code>jcc</code> schimbă doar ramura, fără a inventa valori noi în registre.</p>' +
        '      <div class="dbg-help-callout">La <code>startx</code>, terminalul de forwarder se închide, iar desktopul QNX se deschide.</div>' +
        '    </article>' +
        '    <article class="dbg-help-page" data-help-page="qnx">' +
        '      <h4>Model backend QNX</h4>' +
        '      <p>Simularea folosește un model inspirat din QNX Neutrino: un nucleu minimal, servicii în user-space și interfață Photon conectată la același context runtime. Shell-ul și GUI-ul partajează același spațiu de stare (utilizator curent, cwd, procese, servicii și filesystem), astfel încât acțiunile sunt vizibile bidirecțional.</p>' +
        '      <h5>Componente simulate</h5>' +
        '      <table class="dbg-help-table"><thead><tr><th>Componentă</th><th>Rol</th><th>Observații</th></tr></thead><tbody>' +
        '        <tr><td><code>procnto</code></td><td>kernel/process manager</td><td>PID 1 este protejat și nu poate fi terminat din monitor.</td></tr>' +
        '        <tr><td><code>gdx-debugd</code></td><td>serviciu debugger</td><td>Intermediază patch-uri și efectele runtime în IDE.</td></tr>' +
        '        <tr><td>Photon session</td><td>desktop/UI</td><td>Se activează la <code>startx</code> după stadiul minim exploit.</td></tr>' +
        '        <tr><td>Filesystem virtual</td><td>persistență sesiune</td><td>Foldere și fișiere sunt rezolvate pe căi absolute/relative.</td></tr>' +
        '      </tbody></table>' +
        '      <h5>Flux operațional</h5>' +
        '      <ul>' +
        '        <li><b>Terminal</b>: execută comenzi (ex. <code>ls</code>, <code>cd</code>, <code>cat</code>, <code>touch</code>, <code>mkdir</code>) și modifică direct starea appliance.</li>' +
        '        <li><b>File Browser</b>: navighează același arbore și previzualizează conținutul fișierelor deschise.</li>' +
        '        <li><b>Process Monitor</b>: afișează procese active și permite terminate pentru PID-uri neprotejate.</li>' +
        '        <li><b>Network panel</b>: comută servicii (network, markdown parser) și expune socket-urile deschise.</li>' +
        '      </ul>' +
        '      <div class="dbg-help-callout"><b>Notă practică:</b> activarea <code>markdown-enable</code> în shell schimbă imediat comportamentul rulării fișierelor <code>.md</code> din IDE, deoarece ambele interfețe consumă același backend.</div>' +
        '    </article>' +
        '    <article class="dbg-help-page" data-help-page="mobile">' +
        '      <h4>Accesibilitate pe ecrane mici</h4>' +
        '      <p>Toolbar-ul debuggerului rămâne pe un singur rând și este scrollabil orizontal.</p>' +
        '      <p>Zona <code>dbg-exploit</code> nu face wrap (scroll în toolbar).</p>' +
        '    </article>' +
        '    <article class="dbg-help-page" data-help-page="limits">' +
        '      <h4>Limite simulare</h4>' +
        '      <ul>' +
        '        <li>Disassembly/patch-uri sunt modelate, nu executate pe binar real.</li>' +
        '        <li>Comenzile reușesc/esuază în funcție de stadiul exploit, nu de PAM/NET real.</li>' +
        '      </ul>' +
        '    </article>' +
        '  </div>' +
        '</section>';
    bindDebuggerHelpTabs(mount);
}

function openDebuggerDocs() {
    ensureDebuggerDocsMounted();
    var panel = $('dbgDocsPanel');
    panel.classList.add('open');
    panel.setAttribute('aria-hidden', 'false');
}

function closeDebuggerDocs() {
    var panel = $('dbgDocsPanel');
    panel.classList.remove('open');
    panel.setAttribute('aria-hidden', 'true');
}
