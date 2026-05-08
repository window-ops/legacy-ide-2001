/* ============================================================
   HELP AND SUPPORT CENTER
   The "Ajutor și Asistență" tabbed dialog explaining how Server
   2003 mode differs from QNX, what's available, how patches and
   the IIS backend interact, and the satire context. Reaches for
   windowsFlagSvg() from the icons module; everything else is
   string content.
   ============================================================ */
(function () {
  function openHelpCenter() {
    if (document.getElementById("helpWin")) return;
    var topics = [
      {
        id: "overview",
        label: "Privire de ansamblu",
        heading: "Bun venit la Ajutor și Asistență",
        body:
          "<p>Acest centru de asistență documentează modul Windows Server 2003 al aplicației <em>Legacy IDE 2001</em> și diferențele față de mediul kiosk QNX Photon.</p>" +
          "<p>Selectați o categorie din partea stângă pentru a citi despre o funcționalitate.</p>" +
          "<p>Toate conținuturile sunt fictive. Numele de produse <strong>Microsoft Windows</strong>, <strong>Windows Server 2003</strong>, <strong>QNX</strong> și <strong>Photon</strong> sunt mărci înregistrate ale proprietarilor lor.</p>",
      },
      {
        id: "differences",
        label: "Diferențe față de QNX",
        heading: "Ce diferă față de modul QNX?",
        body:
          "<p>În modul implicit (kiosk QNX), aplicația simulează o consolă de programare cu programa rigidă. În modul Server 2003 (deblocat prin contul <code>defaultuser</code>) interfața se schimbă fundamental:</p>" +
          "<ul>" +
          "<li><strong>Bara de activități și meniul Start.</strong> Apar în partea de jos, în stilul Classic. Pe QNX nu există bară de activități.</li>" +
          "<li><strong>GDX Debugger este dezactivat.</strong> Locul lui îl ia Dr. Watson, depanatorul postmortem al Windows. Patch-urile aplicate prin Dr. Watson scriu în aceeași zonă <code>STATE.binaryPatches</code> ca cele aplicate prin GDX.</li>" +
          '<li><strong>Validare backend prin IIS.</strong> Site-ul „Curriculum Reporting" rulează în IIS și revalidează codul la <em>Verifică</em> și <em>Execută</em>. Pentru ca patch-urile <code>bypassCurriculum</code> să aibă efect real, trebuie oprit acel site din <em>Administrare Server de Aplicații</em>.</li>' +
          "<li><strong>Aplicații standard.</strong> Linie de comandă, Manager de activități, Computerul meu, Panou de control, Instrumente administrative, Notepad și Coș de reciclare devin disponibile.</li>" +
          '<li><strong>BIOS Setup și Reset.</strong> La închidere, ecranul „Acum puteți opri în siguranță" oferă trei butoane stil BIOS (F1 Power On, F2 Setup, F12 Reset). Reset reformatează partiția aparatului și reinstalează QNX Photon.</li>' +
          "</ul>",
      },
      {
        id: "apps",
        label: "Aplicații disponibile",
        heading: "Aplicații Server 2003",
        body:
          "<p>Modul Server 2003 include următoarele aplicații accesibile din meniul Start sau prin <em>Executare...</em>:</p>" +
          "<ul>" +
          "<li><strong>Linie de comandă</strong> (<code>cmd</code>), interpretor cu sistem de fișiere mock, navigare reală cu <code>cd</code>/<code>dir</code>, completare cu Tab, istoric cu săgeți.</li>" +
          "<li><strong>Manager de activități</strong> (<code>taskmgr</code>), taburi Aplicații / Procese / Performanță cu grafic CPU live.</li>" +
          "<li><strong>Notepad</strong> (<code>notepad</code>), editor simplu cu meniuri Fișier / Editare / Format.</li>" +
          "<li><strong>Computerul meu</strong>, listează unitățile mock C:, D:, A:, E:.</li>" +
          "<li><strong>Panou de control</strong>, 17 applet-uri (Adăugare hardware, Ecran, Sunete, Sistem, Windows Firewall etc).</li>" +
          "<li><strong>Instrumente administrative</strong>, 20 de scurtături MMC (Active Directory, Event Viewer, Services etc).</li>" +
          "<li><strong>Administrare Server</strong>, wizard-ul de gestionare a rolurilor (File Server, Application Server).</li>" +
          "<li><strong>Dr. Watson</strong> (<code>drwtsn32</code>), depanator postmortem cu listă de erori, stare CPU și panou de patch-uri.</li>" +
          "<li><strong>Event Viewer</strong> (<code>eventvwr</code>), jurnale System / Application / Security cu intrări persistente. Patch-urile aplicate, opririle de site IIS și schimbările de rețea apar aici.</li>" +
          "<li><strong>Registry Editor</strong> (<code>regedit</code>), trei chei funcționale: <code>HKLM\\SOFTWARE\\GDX\\AllowTransitional</code>, <code>HKLM\\SYSTEM\\CurrentControlSet\\Services\\CurriculumReporting\\Start</code> și <code>...\\Tcpip\\Parameters\\EnableSecurityFilters</code>.</li>" +
          "<li><strong>Coș de reciclare</strong>, gol implicit.</li>" +
          "</ul>",
      },
      {
        id: "patching",
        label: "Patch-uri și backend",
        heading: "Cum funcționează patch-urile pe Server 2003",
        body:
          "<p>Patch-urile binare aplicate fie prin GDX (în QNX) fie prin Dr. Watson (în Server 2003) scriu în obiectul global <code>STATE.binaryPatches</code>. Lint-ul și runtime-ul citesc flag-urile <code>bypassCurriculum</code>, <code>curriculumNonBlocking</code> și <code>bypassOSCheck</code>.</p>" +
          "<p>Pe Server 2003 există un strat suplimentar: <strong>Curriculum Reporting</strong>, un site IIS care simulează revalidare backend. Cât timp acest site este <em>Pornit</em>, validarea programei se reaplică indiferent de patch-uri locale. Există trei rute care fac backend-ul inaccesibil:</p>" +
          "<ol>" +
          '<li><strong>IIS:</strong> <em>Administrare Server</em> &rarr; <em>Administrați acest server de aplicații</em> &rarr; tabul <em>Web Sites</em> &rarr; <em>Oprește</em> pe rândul „Curriculum Reporting".</li>' +
          "<li><strong>Registry:</strong> <code>regedit</code> &rarr; <code>HKLM\\SYSTEM\\CurrentControlSet\\Services\\CurriculumReporting\\Start</code> &rarr; setați valoarea la <code>4</code> (Disabled).</li>" +
          "<li><strong>Rețea:</strong> click dreapta pe iconița de rețea din tray &rarr; <em>Dezactivează</em>. Cablul devine deconectat, orice backend este inaccesibil.</li>" +
          "</ol>" +
          "<p>O a patra rută este <code>HKLM\\SOFTWARE\\GDX\\AllowTransitional = 1</code>: nu oprește backend-ul, dar setează flag-ul <code>curriculumNonBlocking</code>, lăsând codul să ruleze cu avertismente în loc de erori. Această rută NU funcționează când backend-ul este accesibil, opriți întâi serviciul.</p>" +
          "<p>Toate aceste schimbări sunt înregistrate în <strong>Event Viewer</strong> (jurnalul System pentru rețea / shutdown, jurnalul Application pentru IIS).</p>" +
          "<p>Această stare nu se transferă înapoi în QNX la Reset; flag-ul <code>STATE.serverBackendOnline</code>, jurnalul de evenimente și registry-ul sunt șterse explicit la reinstalare.</p>",
      },
      {
        id: "snapshots",
        label: "Snapshot-uri",
        heading: "Snapshot complet vs. snapshot curat",
        body:
          "<p>La migrarea contului <code>defaultuser</code> către Server 2003, utilizatorul alege între două imagini:</p>" +
          "<ul>" +
          "<li><strong>Snapshot complet</strong>: include depanatorul și patch-urile aplicate. Dr. Watson va lista erori reale corespunzătoare patch-urilor migrate.</li>" +
          "<li><strong>Snapshot curat</strong>: instalare nouă, fără patch-uri, fără cache de credențiale.</li>" +
          "</ul>" +
          "<p>Pentru a sări direct la o imagine fără chestionar, folosiți URL-ul <code>?srv2k3=1</code> pentru cea completă sau <code>?srv2k3=clean</code> pentru cea curată.</p>",
      },
      {
        id: "satire",
        label: "De ce Server 2003?",
        heading: "Locul Server 2003 în satiră",
        body:
          "<p>Windows Server 2003 a fost ales ca a doua componentă a satirei pentru că este, simultan, un sistem foarte vechi de 20 de ani și în același timp un sistem de operare important în istoria Windows.</p>" +
          "<p>Codebase-ul Server 2003 este punctul de plecare pentru linia NT modernă: kernelul, subsistemul Win32 și multe componente de spațiu utilizator au fost preluate în Windows Vista, 7 și ulterior.</p>" +
          '<p>Tot Server 2003 este și ultima versiune NT pentru care proiectul ReactOS poate face inginerie inversă „cleanroom" fără riscuri majore de contaminare cu cod ulterior. Acest lucru face din Server 2003 un reper tehnic și juridic pentru orice efort de a recrea Windows clasic în mod legal.</p>' +
          "<p>Atât kioskul QNX Photon cât și mediul Server 2003 sunt sisteme vechi. Diferența nu e vârsta, ci comportamentul: QNX rulează ca un kiosk strict, iar Server 2003 oferă un mediu de lucru complet cu instrumente administrative și un backend care revalidează codul. Satira pune în paralel cele două experiențe pentru a ilustra cum același sistem vechi poate fi expus în moduri foarte diferite.</p>",
      },
      {
        id: "shortcuts",
        label: "Argumente URL",
        heading: "Argumente URL utile",
        body:
          "<p>Aplicația acceptă următorii parametri în query string pentru testare și depanare:</p>" +
          '<table style="width:100%; border-collapse: collapse; font-size: 11px;">' +
          '<tr><th align="left" style="padding:4px;border-bottom:1px solid #c0c0c0;">Parametru</th><th align="left" style="padding:4px;border-bottom:1px solid #c0c0c0;">Efect</th></tr>' +
          '<tr><td style="padding:4px;"><code>?srv2k3=1</code></td><td style="padding:4px;">Sare peste fluxul defaultuser și migrarea, montează direct ecranul Server 2003 cu snapshot complet (depanator + bypass-uri).</td></tr>' +
          '<tr><td style="padding:4px;"><code>?srv2k3=full</code></td><td style="padding:4px;">Identic cu <code>?srv2k3=1</code>, sintaxa explicită.</td></tr>' +
          '<tr><td style="padding:4px;"><code>?srv2k3=clean</code></td><td style="padding:4px;">Montează Server 2003 cu snapshot curat (fără patch-uri).</td></tr>' +
          '<tr><td style="padding:4px;"><code>?smoke=1</code></td><td style="padding:4px;">Rulează suita de teste smoke a IDE-ului. Verifică debuggerul, lint-ul, persistența, jurnalul de evenimente, matricea backend × programă.</td></tr>' +
          '<tr><td style="padding:4px;"><code>?debug=1</code></td><td style="padding:4px;">Activează panoul de depanare în colțul din dreapta jos. Conținutul se adaptează contextului: GDX Debugger, dialogurile Server 2003 (regedit, Event Viewer, role admin, Dr. Watson), sesiunea QNX, BIOS Setup.</td></tr>' +
          "</table>" +
          '<h3 style="font-size:13px; margin: 12px 0 4px;">Combinații utile</h3>' +
          "<ul>" +
          "<li><code>?srv2k3=1&debug=1</code>: jump direct la Server 2003 cu overlay-ul de debug activ. Util pentru a urmări <code>STATE.serverBackendOnline</code> în timp ce opriți site-ul Curriculum Reporting.</li>" +
          "<li><code>?srv2k3=clean&debug=1</code>: snapshot curat cu overlay activ, pentru a verifica că niciun patch nu este moștenit.</li>" +
          "<li><code>?smoke=1&debug=1</code>: rulează testele smoke cu overlay-ul vizibil pentru a urmări trecerea prin contexte (debugger, dialogs, srv2003, qnx).</li>" +
          "</ul>",
      },
      {
        id: "win-history",
        label: "Istoricul Windows NT",
        heading: "Locul Server 2003 în istoria Windows",
        body:
          "<p>Cronologia liniei NT, din care face parte Server 2003. Fiecare versiune ereditează cod direct din cea anterioară:</p>" +
          '<div class="help-timeline">' +
          '<div class="help-tl-row"><div class="help-tl-year">1993</div><div class="help-tl-name">Windows NT 3.1</div><div class="help-tl-note">Primul kernel NT scris de la zero. Subsisteme Win32, OS/2, POSIX.</div></div>' +
          '<div class="help-tl-row"><div class="help-tl-year">1994</div><div class="help-tl-name">Windows NT 3.5 / 3.51</div><div class="help-tl-note">Suport TCP/IP integrat, performanță îmbunătățită.</div></div>' +
          '<div class="help-tl-row"><div class="help-tl-year">1996</div><div class="help-tl-name">Windows NT 4.0</div><div class="help-tl-note">GDI și USER mutate în kernel pentru viteză. Stilul de interfață al Windows 95.</div></div>' +
          '<div class="help-tl-row"><div class="help-tl-year">2000</div><div class="help-tl-name">Windows 2000 (NT 5.0)</div><div class="help-tl-note">Active Directory, NTFS 3.0, Plug and Play. Fundament pentru toate versiunile ulterioare.</div></div>' +
          '<div class="help-tl-row"><div class="help-tl-year">2001</div><div class="help-tl-name">Windows XP (NT 5.1)</div><div class="help-tl-note">Fork pentru consumatori. Server 2003 va prelua de aici și va merge într-o direcție server.</div></div>' +
          '<div class="help-tl-row help-tl-highlight"><div class="help-tl-year">2003</div><div class="help-tl-name">Windows Server 2003 (NT 5.2)</div><div class="help-tl-note">Acest sistem. Stiva NT optimizată pentru server: IIS 6.0, Active Directory consolidat, Volume Shadow Copy.</div></div>' +
          '<div class="help-tl-row"><div class="help-tl-year">2007</div><div class="help-tl-name">Windows Vista (NT 6.0)</div><div class="help-tl-note">Refactor major. Multe componente Server 2003 sunt înlocuite, dar API-ul Win32 și fundamentul rămân.</div></div>' +
          '<div class="help-tl-row"><div class="help-tl-year">2008</div><div class="help-tl-name">Windows Server 2008 (NT 6.0)</div><div class="help-tl-note">Versiunea server pereche cu Vista. Server 2003 este înlocuit oficial.</div></div>' +
          '<div class="help-tl-row"><div class="help-tl-year">2009</div><div class="help-tl-name">Windows 7 (NT 6.1)</div><div class="help-tl-note">Considerat a deriva parțial și indirect din ramura de cod Server 2003 / Vista. Ultima versiune cu interfața Classic activabilă.</div></div>' +
          '<div class="help-tl-row"><div class="help-tl-year">2012-prezent</div><div class="help-tl-name">Windows 8 / 10 / 11</div><div class="help-tl-note">Linia NT continuă, dar moștenirea estetică a Server 2003 dispare în favoarea Metro / Fluent.</div></div>' +
          "</div>" +
          '<p style="margin-top: 12px;">Server 2003 ocupă o poziție pivot: ultimul Windows cu interfața Classic ca implicit, primul Windows cu Active Directory matur, codbase reutilizat extensiv în Vista și 7.</p>',
      },
      {
        id: "qnx-history",
        label: "Istoricul QNX",
        heading: "Despre QNX",
        body:
          "<p>QNX a fost dezvoltat în 1982 de <strong>Quantum Software Systems</strong>, o companie canadiană fondată de Gordon Bell și Dan Dodge. Spre deosebire de NT, este un microkernel iar fiecare driver rulează în spațiu utilizator. Acest design îl face robust la căderi parțiale și foarte mic (kernel-ul de bază are sub 100 KB). Compania a fost ulterior achiziționată de Harman International în 2004 și apoi de BlackBerry în 2010.</p>" +
          "<p><strong>Photon microGUI</strong> este sistemul grafic clasic QNX, care rulează în mai puțin de 4 MB de RAM. Apare în satira aceasta pentru că funcționează pe calculatoarele din anii 2000 cu hardware lent, cerințe minime și comportament previzibil.</p>" +
          "<p>Câteva utilizări reale ale QNX:</p>" +
          "<ul>" +
          "<li><strong>Controale industriale.</strong> Centrale nucleare, rafinării, sisteme SCADA. Stabilitatea microkernel-ului este indispensabilă.</li>" +
          "<li><strong>Automotive.</strong> QNX putea rula în mașini ca sistem infotainment și navigație.</li>" +
          "<li><strong>BlackBerry 10.</strong> Sistemul de operare al telefoanelor BlackBerry post-2013 era de fapt QNX cu un strat Cascades pe deasupra.</li>" +
          "<li><strong>Echipamente medicale.</strong> CT, RMN, monitoare de pacient.</li>" +
          "</ul>" +
          "<p>Diferența cu Server 2003 nu este vârsta, QNX 6 este și el de două decenii vechime, ci comportamentul. QNX rulează ca un kiosk strict pentru că este proiectat să fie un kiosk strict. Server 2003 rulează ca un mediu administrativ pentru că este proiectat să fie un mediu administrativ. Satira pune în paralel cele două.</p>",
      },
      {
        id: "reactos",
        label: "ReactOS și clean-room",
        heading: "Server 2003 ca reper pentru reverse engineering",
        body:
          "<p><strong>ReactOS</strong> este un proiect open source care încearcă să implementeze, de la zero, un sistem de operare binar compatibil cu Windows. Proiectul a început în 1996 și este încă activ.</p>" +
          "<p>ReactOS folosește metoda <em>clean-room reverse engineering</em>: un grup analizează comportamentul Windows-ului real (intrări, ieșiri, ABI), scrie specificații, iar un al doilea grup, care nu a văzut codul Windows, scrie implementarea pe baza specificațiilor. Această separare este crucială juridic: codul rezultat nu poate fi acuzat că a copiat codul Microsoft, pentru că autorii lui nu l-au văzut.</p>" +
          "<p>Server 2003 este o țintă specială pentru ReactOS din mai multe motive:</p>" +
          "<ul>" +
          "<li><strong>Ultima țintă clean-room.</strong> Începând cu Vista, Microsoft a introdus DRM, code signing, și API-uri proprietare care fac reverse engineering legal mult mai dificil. Server 2003 / XP este ultima versiune în care ABI-ul Win32 este încă rezonabil compatibil cu obiectivele ReactOS.</li>" +
          "<li><strong>Driver model stabil.</strong> Driver-ele Windows XP / Server 2003 (kernel-mode WDM) funcționează în ReactOS cu modificări minore. Aceasta este principala valoare practică a proiectului.</li>" +
          "<li><strong>Estetică reproducibilă.</strong> Tema Classic din Server 2003 / XP este descrisă complet în resursele uxtheme.dll. ReactOS poate replica look-ul fără să copieze cod.</li>" +
          "</ul>" +
          "<p>Includerea acestui mediu în satiră adresează o întrebare reală: <em>cum păstrăm acces la software vechi când companiile care l-au făcut nu mai vor să-l mențină?</em> Server 2003 a primit ultimele patch-uri de securitate în 2015. Soluția pe termen lung este fie emulare (DOSBox, 86Box), fie reimplementare (ReactOS, Wine).</p>" +
          "<p>Acest IDE este un al treilea drum: simulare. Nu rulează cod Windows real, ci doar reproduce experiența vizuală și comportamentală suficient pentru o satiră de două decenii.</p>",
      },
    ];
    var activeIdx = 0;

    var bd = document.createElement("div");
    bd.id = "helpWin";
    bd.className = "dialog-backdrop open srv2k3-help";
    bd.setAttribute("role", "dialog");
    bd.setAttribute("aria-modal", "true");
    document.body.appendChild(bd);
    render();

    function render() {
      var navHtml = topics
        .map(function (t, i) {
          return (
            '<div class="help-nav-item' +
            (i === activeIdx ? " active" : "") +
            '" data-help-idx="' +
            i +
            '">' +
            esc(t.label) +
            "</div>"
          );
        })
        .join("");
      var topic = topics[activeIdx];
      bd.innerHTML =
        '<div class="dialog" style="max-width: 880px;">' +
        '<div class="dialog-header">Ajutor și Asistență, Windows Server 2003</div>' +
        '<div class="dialog-body" style="padding: 0;">' +
        '<div class="help-banner">' +
        '<span class="help-banner-flag">' +
        windowsFlagSvg(28) +
        "</span>" +
        '<span class="help-banner-text">Centru de Ajutor și Asistență</span>' +
        "</div>" +
        '<div class="help-split">' +
        '<div class="help-nav">' +
        navHtml +
        "</div>" +
        '<div class="help-pane">' +
        '<h2 class="help-heading">' +
        esc(topic.heading) +
        "</h2>" +
        '<div class="help-body">' +
        topic.body +
        "</div>" +
        "</div>" +
        "</div>" +
        "</div>" +
        '<div class="dialog-footer">' +
        '<button class="btn suggested" data-run-close>Închide</button>' +
        "</div>" +
        "</div>";
      wire();
    }
    function wire() {
      bd.onclick = function (e) {
        if (
          e.target === bd ||
          (e.target.getAttribute &&
            e.target.getAttribute("data-run-close") != null)
        )
          bd.remove();
      };
      bd.querySelectorAll("[data-help-idx]").forEach(function (el) {
        el.addEventListener("click", function () {
          activeIdx = parseInt(el.getAttribute("data-help-idx"), 10);
          render();
        });
      });
    }
    function esc(s) {
      return String(s)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
    }
  }

  window.openHelpCenter = openHelpCenter;
})();
