# Ramura defaultuser

Această ramură adaugă contul supervizor `defaultuser` peste sesiunea QNX
existentă, un quiz de portare Windows Server 2003 bazat pe trivia de
nivel power-user, o animație de instalare în CSS pur, și un backend
Windows Server 2003 Classic care înlocuiește complet chrome-ul Photon
după migrare.

---

## Ce conține ramura

### Escaladare la `defaultuser` (tranșa 1)

State machine completă în `js/exploit/defaultuser.js`, cu fazele
`locked → unlocking → unlocked → migration → installing → server2003`.
Fiecare tranziție apelează un hook `window.onDefaultUserPhase(prev, next)`
astfel încât modulele ulterioare să se poată atașa fără a modifica
codul existent.

Jucătorul descoperă contul `defaultuser` rulând `sudo -l` în shell-ul
QNX. Rezultatul arată un sudoers fals care recunoaște existența contului
supervisor și explică faptul că cheia de autentificare este emisă de
`gdx-debugd` după aplicarea patch-ului `check_curriculum`. Același patch
pe care debugger-ul îl producea deja pentru `bypassCurriculum`. Comanda
`su defaultuser` validează cheia și declanșează tranziția.

La escaladare reușită, o taskbar supervisor de 32 px apare lipită de
partea de sus a ferestrei, deasupra tuturor layer-elor IDE (inclusiv
dialogurile modale). Stilul nu copiază Windows; este un session manager
Unix cu accent portocaliu. Meniul Start afișează ca prima informație
revelația narativă că IDE-ul este de fapt un client X11 streamat prin
browser, nu o aplicație web.

Scurtătura de dezvoltator `Ctrl+Shift+Alt+U` declanșează escaladarea fără
a trece prin shell. Utilă pentru testare; calea canonică rămâne prin
comanda `su`.

Starea este persistată în `sessionStorage` sub cheia `ide.defaultuser.v1`.

### Quiz-ul de portare (tranșa 2)

`js/exploit/quiz.js` livrează un bank de 15 întrebări, 10 selectate
aleator per sesiune, prag 7 din 10 pentru admis. Fiecare întrebare
afișează sursa sub variantele de răspuns, astfel încât jucătorul să
poată verifica materialul.

Subiecte acoperite:

- Nume de fișier rezervate DOS (CON, PRN, AUX, NUL) și bypass-ul prin
  namespace-ul Win32 `\\?\`. Sursă: FlyTech.
- `boot.ini` pe NT 5.x versus `BCD` pe Vista+. Sursă: Windows Server
  2003 Resource Kit.
- Cheia de produs de 25 de caractere, algoritm reverse-engineered.
  Sursă: FlyTech.
- `desktop.ini` și cerința ca folderul să aibă atributul system sau
  read-only pentru ca Explorer să citească fișierul. Sursă: FlyTech.
- `Thumbs.db` ca OLE storage. Sursă: FlyTech.
- Last Known Good Configuration, adică salvarea `CurrentControlSet` la
  fiecare logon reușit. Sursă: Windows Server 2003 Resource Kit.
- SID RID 500 ca Administrator builtin. Sursă: Enderman.
- Nume de folder format numai din spații Unicode full-width (U+3000).
  Sursă: FlyTech.
- `shutdown /l` este logoff, nu restart. Sursă: ThioJoe.
- `%SystemRoot%` este `C:\WINDOWS` pe Server 2003, nu `C:\WINNT` ca în
  NT 4.0 / 2000. Sursă: Daniel Myslivets.
- Flow-ul OOBE la Server 2003 (cheie, fus, parola de Administrator,
  nume mașină, rol domeniu sau workgroup). Sursă: Enderman.
- Editarea `boot.ini` în Notepad după ștergerea atributelor
  hidden/system/read-only. Sursă: Daniel Myslivets.
- `ipconfig /flushdns` apărut în Windows 2000 odată cu serviciul DNS
  Client. Sursă: Enderman.
- Vectori de malware `.lnk`, `.hta`, `.pif` care se execută la dublu
  click fără avertisment pe XP RTM. Sursă: Enderman.
- Handler-ul SVG pentru File Explorer al ThioJoe, scris în Rust
  folosind doar Windows API. Sursă: github.com/ThioJoe.

Review-ul post-quiz marchează fiecare întrebare cu verde sau roșu,
afișează răspunsul utilizatorului, răspunsul corect, și o explicație.

După un quiz promovat, dialogul oferă alegerea de snapshot: curat (doar
userspace utilitar) sau complet (include debugger-ul plus patch-urile
`bypassCurriculum`, `curriculumNonBlocking`, `bypassOSCheck`). Alegerea
este persistată în `STATE.defaultuser.migratedSnapshot`. La commit,
tranziția este `unlocked → migration`, iar hook-ul
`onDefaultUserPhase` este apelat.

### Animația de instalare (tranșa 3, partea 1)

`js/exploit/install-animation.js` plus `css/install-animation.css`.
Pornită automat la tranziția `unlocked → migration`. Fără video embedat,
tot conținutul este CSS pur. Patru faze:

Faza albastru text-mode, aproximativ 5.5 secunde. Fundal `#0000a8`,
header gri cu titlul setup-ului, titlu alb centrat care trece prin
„Please wait while Setup starts", „Examining your existing
installation", „Setup is loading files (ntkrnlmp.exe / hal.dll /
kdcom.dll)", „Setup is starting Windows". Bară de progres albă pe
fundal transparent, footer gri cu faza curentă. Font monospace.

Flash de reboot la GUI, aproximativ 1 secundă. Fundal negru cu keyframe
steppat care dă senzația de hardware reset.

Faza GUI, aproximativ 11 secunde. Rail stânga cu cele cinci etape
oficiale (Collecting information, Dynamic Update, Preparing
installation, Installing Windows, Finalizing installation), fiecare cu
un dot care trece prin stările inactiv, curent pulsatoriu galben, și
terminat albastru. ETA numărat descrescător de la 39 de minute. Log în
timp real pe dreapta. Taskbar fals jos cu drapel și status „Installing...".
Linia „Carrying over: gdx-debugd patches (bypassCurriculum)" apare doar
dacă jucătorul a ales snapshot-ul complet.

First boot splash, aproximativ 2.6 secunde. Drapel Windows din patru
gradiente suprapuse, wordmark „Windows Server 2003 Standard Edition",
bară de progres indeterminată, footer copyright.

Dacă pagina este reîncărcată în timpul animației, modulul sare direct
la faza `server2003` în loc să replaye 20 de secunde de instalare. Nu
mai rulează nimic la încărcarea inițială decât dacă a avut loc o
tranziție explicită.

### Backend Windows Server 2003 Classic (tranșa 3, partea 2)

`js/exploit/srv2003-desktop.js` plus `css/srv2003-classic.css`. Se
activează la tranziția `migration → server2003` (sau direct la reload
dacă faza stocată este deja `server2003`).

Tema respectă cu acuratețe paleta Win32 Classic. Fața 3D gri `#d4d0c8`,
nu beige-ul Luna `#ece9d8`. Bevel-uri flat `#808080` / `#404040` /
`#ffffff` / `#dfdfdf`. Titlebar cu gradient clasic `#0a246a → #a6caf0`.
Taskbar gri, nu XP Luna blue. Start button gri cu drapel Windows, nu
butonul verde italic de pe XP.

Re-skin-ul acoperă:

- Toate ferestrele QNX (terminal, file browser, process monitor,
  network panel) primesc chrome Classic prin cascade CSS pe
  `body.srv2003-desktop`, fără modificări JS.
- Header-bar-ul IDE, sidebar-ul, status bar-ul, tabs-urile, editor-ul,
  output panel-ul. Tot ce ținea de aspectul „modern" al IDE-ului
  primește font Tahoma și bevel Classic.
- Chrome-ul debugger-ului, inclusiv titlebar, butoane, listing de
  dezasamblare, log.
- Terminalul devine cmd.exe (fundal negru, text `#c0c0c0`, font
  Lucida Console).
- File browser primește header gradient și selecție albastru profund
  `#0a246a` cu text alb, ca în Explorer Classic.

O nouă taskbar este montată jos cu buton Start, listă de task-uri, tray
cu iconițe de security și network, și ceas. Start menu-ul este
single-column, cu o bandă verticală albastră pe stânga care afișează
„Windows Server 2003" în rotație, ca pe Server 2003-ul real.

Intrările din meniu:

- Legacy IDE, Command Prompt, Dr. Watson, Task Manager (prima secțiune
  de aplicații)
- My Computer, Control Panel, Administrative Tools (secțiunea sistem)
- Run..., About the system (utilitare)
- Log Off..., Shut Down... (la final)

Run... acceptă `cmd`, `cmd.exe`, `taskmgr`, `drwtsn32`, `winver`.
`regedit` este blocat cu mesajul „Registry Editor a fost dezactivat
prin politica domeniului". Pentru tot restul, eroare standard
„Fișierul nu a putut fi găsit".

About the system (winver) păstrează chrome-ul real Server 2003. Afișează
„Microsoft Windows Server 2003 Standard Edition", versiunea 5.2 build
3790, utilizatorul înregistrat, product ID, și memoria fizică. Nu
conține referințe la QNX, X11 sau kiosk; este o fereastră winver
autentică.

Dacă snapshot-ul ales la portare a fost curat, Dr. Watson (debugger-ul)
nu se deschide și un toast explicativ apare: „Dr. Watson nu este
instalat. Imaginea aleasă la portare nu îl conține." Pentru snapshot
complet, debugger-ul se deschide cu patch-urile aplicate.

Shut Down... afișează dialogul Classic „Shut Down Windows" cu
dropdown-ul clasic (Shut down, Restart, Log off defaultuser). OK
resetează toată aventura: șterge `sessionStorage`, demontează chrome-ul
Server 2003, și întoarce jucătorul la faza `locked`.

---

## Fișiere

### Noi în această ramură

```
js/exploit/defaultuser.js            State machine, taskbar, reveal
js/exploit/quiz.js                   Quiz portare + alegere snapshot
js/exploit/install-animation.js      Secvența de instalare
js/exploit/srv2003-desktop.js        Backend Server 2003 Classic
css/defaultuser.css                  Taskbar supervizor + quiz
css/install-animation.css            Cele patru faze ale instalării
css/srv2003-classic.css              Tema Classic + taskbar + Start menu
BRANCH_NOTES.md                      Acest fișier
```

### Modificate față de main

```
index.html                           Încarcă cele trei CSS-uri și cele patru module noi
js/qnx/qnx.js                        Comenzi sudo -l și su defaultuser
js/shell/reverse-shell.js            Prompt student_<id>
```

### State

```
STATE.defaultuser = {
    phase: 'locked' | 'unlocking' | 'unlocked' | 'migration' | 'installing' | 'server2003',
    studentId: string,           14 hex chars, generat la prima încărcare
    migratedSnapshot: null | { includesDebugger: bool, includesBypasses: bool }
}
```

Persistat în `sessionStorage` sub cheia `ide.defaultuser.v1`.

---

## Cum se testează flow-ul complet

1. Deschide `index.html`. Ești în faza `locked` ca `student_<id>`.
2. Deschide debugger-ul cu `Ctrl+Shift+D`, injectează o vulnerabilitate,
   aplică patch-ul `bypassCurriculum`.
3. În shell, `sudo -l` arată existența contului supervisor. `su defaultuser`
   validează cheia.
4. Taskbar-ul supervisor coboară. Meniul Start explică reveal-ul X11.
5. Click „Portează către Windows Server 2003". Răspunde la 10 întrebări.
   Configurează snapshot-ul. Pornește instalarea.
6. Animația de 20 de secunde rulează până la first boot.
7. Desktop-ul Classic apare cu taskbar-ul gri jos. IDE-ul, debugger-ul,
   și toate ferestrele QNX arată ca pe Server 2003.
8. Start, Run, About, Shut Down funcționează. Shut Down resetează toată
   aventura.
9. Reload mid-install sare direct la Server 2003. Reload pe Server 2003
   restaurează desktop-ul fără a reporni animația.
10. `Ctrl+Shift+Alt+U` sare peste escaladare pentru testare rapidă.
