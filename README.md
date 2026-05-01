# Legacy IDE 2001

> Un mediu de dezvoltare web strict conform cu programa analitică de
> Tehnologia Informației și a Comunicațiilor (TIC) din anii 2000,
> rulând pe un backend QNX simulat de o echipă IT la fel de în urmă.

**Acesta este un proiect de satiră.** Nu este un produs oficial, nu
este aprobat sau finanțat de Ministerul Educației și Cercetării, și nu
are nicio legătură cu vreo instituție publică. Satira ar fi fost
demult depășită dacă profesorii ar fi fost mai puțin stricți, dacă
unitățile de învățământ s-ar fi modernizat și dacă programele școlare
ar fi fost actualizate. În loc de asta, iată-ne aici.

Ca deobicei pentru proiectele mai noi, AI a fost folosit pentru a automatiza proiectul, dar programul a fost verificat și este în lucru. Programul este încă în beta, incomplet.

---

## Ce este Legacy IDE 2001

Legacy IDE 2001 este un editor web static (HTML + CSS + JavaScript,
fără backend, fără build step) care simulează un IDE din jurul anului
2001. Programul are două straturi de satiră suprapuse:

1. **Stratul didactic.** IDE-ul refuză orice construcție sintactică,
   etichetă HTML, atribut sau API JavaScript introdus *după* decembrie
   2001. Cu alte cuvinte, dacă scrieți `let`, `=>`, `fetch()`,
   `<section>` sau `placeholder=""`, linter-ul vă informează politicos
   (și în română) că nu sunteți conform cu programa TIC 2001.
   Recomandările date utilizatorului imită sfaturile din
   manualele și auxiliarele epocii: folosiți `<TABLE>` pentru layout,
   `<FONT color size face>`, `onclick=""` inline, `document.write()`,
   `document.cookie` pentru persistență.

2. **Stratul QNX.** Programul include un backend simulat inspirat de
   QNX Neutrino: kernel fals (`procnto`), serviciu fals de debug
   (`gdx-debugd`), sesiune Photon, shell pseudo-POSIX, monitor de
   procese, file browser, network panel. Acest backend este scris
   intenționat în stilul unei echipe IT foarte neglijente: servicii
   greșit documentate, texte de eroare emfatice, jurnale de debug pe
   limba română presărate în locuri nepotrivite, un "exploit" cu
   patch-uri ASM a cărui poveste devine tot mai absurdă pe măsură ce
   avansați în stadii.

Proiectul este complet client-side. Rulează direct în browser, fără
server, fără instalare, fără dependențe. Poate fi arhivat într-un
fișier zip și rulat pe orice calculator de după aproximativ 2018.

---

## Pentru utilizatori

### Cum se pornește

1. Descărcați arhiva zip a proiectului sau clonați depozitul.
2. Deschideți `index.html` într-un browser modern (Firefox, Chrome sau un echivalent derivat).

### Scurt tur al interfeței

- **Panoul stânga:** arborele de fișiere. Creați fișiere noi cu butonul `+`, deschideți-le cu clic, redenumiți sau ștergeți din meniul contextual.
- **Centrul:** editorul. Evidențierea de sintaxă se activează din Preferințe. Tab-urile arată fișierele deschise.
- **Bara de stare:** eticheta `langTag` arată modul efectiv (`HTML 4.01 Transitional`, `HTML 4.01 Strict`, `ECMAScript Ed. 3`, etc.); eticheta `stLint` arată numărul de încălcări curriculare.
- **Panoul dreapta:** ieșirea. Consola primește `console.log()` și erorile; Previzualizarea randează HTML-ul (și JavaScript-ul, dacă ați dezactivat anti-hang).
- **Bara de meniu sus:** Fișier, Editare, Programa școlară (dialogul cu toate construcțiile permise și interzise), Preferințe, Debugger, Ajutor.

### Preferințe notabile

- **Mod 2001 strict** (protejat): activează verificarea curriculară. Poate fi ocolit doar prin patch-uri ASM în debugger, la funcția `check_curriculum`.
- **Acceptă HTML 4.01 Transitional** (implicit activ): permite elemente precum `<IFRAME>`, `<FONT>`, `<CENTER>` și atribute precum `target=""`. Este activ implicit pentru că documentele școlare reale nu declară niciun doctype, iar Transitional este cel mai apropiat DTD real.
- **Protecție anti-hang** (implicit activă): execuția JavaScript în Previzualizare este oprită; codul se afișează static. Dezactivați pentru execuție reală în iframe sandbox-uit. Bucle infinite pot îngheța fila.
- **Evidențiere sintactică**, **Închidere automată etichete HTML**, **Afișare tracebacks în română**, **Mod întunecat**: comportamentul implicit al editorului.

### Debugger

GDX debugger oferă dezasamblare falsă, pas-cu-pas, patching ASM și un scenariu narativ de escaladare în patru stadii. Se deschide cu `Ctrl+Shift+D`. Documentația completă este inclusă ca panou lateral (butonul "Documentație debugger").

### Sesiune QNX

Sesiunea remote Photon se deschide din meniul debuggerului după atingerea stadiului corespunzător de exploit. Oferă un terminal `pterm`, browser fișiere, monitor de procese și un panel de rețea. Comenzile shell sunt filtrate prin același backend simulat.

---

## Pentru dezvoltatori

### Stack tehnic

- HTML static, CSS fără build step, JavaScript modern (nu ES3) în codul sursă.
- Zero dependențe externe la runtime. Fără framework-uri, fără bundler, fără pachete npm.
- Tipografia folosește fontul Cantarell livrat odată cu proiectul (licență OFL), pentru a păstra un aspect consistent indiferent de sistemul de operare.

### Organizare

Structura de directoare:

```
index.html
css/        stiluri (editor, debugger, dialoguri, meniu, QNX, bază)
js/core/    STATE global, init, utilities, teste smoke
js/editor/  editor, evidențiere, linter, pipeline de rulare, tabs, arbore
js/ui/      dialoguri, drag&drop, layout, meniuri, preferințe, prompts, tema, banner OS, dialogul About
js/debugger/  dezasamblor VM, panou docs, controale, backend
js/qnx/     sesiunea Photon simulată
js/shell/   reverse-shell simulat
js/menu.js  wiring-ul barei de meniu principale
cantarell/  fontul Cantarell (OFL)
```

Ordinea de încărcare a script-urilor este definită în `index.html`.
Nu o rearanjați fără motiv; dependențele între module sunt
documentate în comentariul din `index.html` deasupra blocului de
script-uri.

### Modul pornit (`STATE`, preferințe, reguli)

`js/core/state.js` conține:

- Obiectul global `STATE` cu `prefs`, `tree`, `fileContents`,
  `activeFile`, `binaryPatches`, `appliance` (QNX), `exploit`.
- Rule tables: `HTML_RULES` și `JS_RULES`. Fiecare regulă are
  `{ label, test, year, standard, remedy, prefKey? }`. `test` este o
  expresie regulată; dacă `prefKey` este prezent și preferința
  corespunzătoare este activă, regula este sărită.
- Allowlists: `HTML401_STRICT_ELEMENTS`, `HTML401_TRANSITIONAL_ELEMENTS`,
  `HTML401_STRICT_ATTRS`, `HTML401_TRANSITIONAL_ATTRS`, `ES3_RESERVED`,
  `ES3_GLOBALS`, `ES3_PROTOTYPE_METHODS`.
- `POST2001_IDENT_HINTS`: mapare nume → standard, folosită de
  linter-ul JavaScript ca rețea de siguranță pentru identificatori
  post-2001 care nu sunt prinși de o regulă specifică.

### Cum adaug o regulă nouă

Pentru o construcție post-2001 neacoperită, adăugați o intrare în
`HTML_RULES` sau `JS_RULES`:

```js
{
    label: 'nume afișat',
    test: /regexul de detecție/,
    year: 2019,                        // sau string, ex. 'post-1999'
    standard: 'ES2019',
    remedy: 'sfat concret pentru elev.'
}
```

Dacă doriți ca regula să fie dezactivată de o preferință, adăugați
`prefKey: 'nume_pref'` și declarați preferința în `STATE.prefs`.

Pentru a extinde allowlist-ul, adăugați intrarea în setul potrivit
(`HTML401_STRICT_ELEMENTS`, `ES3_GLOBALS`, etc.). Nu trebuie să
modificați `lint.js` — pasele de allowlist consultă aceste seturi la
runtime.

### Pipeline-ul de rulare (`js/editor/run.js`)

`runCode()` preia conținutul fișierului activ, rulează linter-ul,
formatează traceback-urile și încredințează execuția:

- Pentru `.html`: iframe cu `sandbox=""` (blocat). Conținutul este
  randat static prin `renderPreview()` după o curățare HTML simplă
  (eliminare `<script>`, atribute `on*`, `javascript:` URL-uri).
- Pentru `.js` cu anti-hang activ: același preview static cu sursa
  escape-uită într-un `<pre>`.
- Pentru `.js` cu anti-hang dezactivat: iframe cu
  `sandbox="allow-scripts allow-modals"`. O mică shim instalată
  înaintea codului utilizatorului redirecționează toate metodele
  `console.*` către consola IDE-ului prin `postMessage`.
  `alert()`, `confirm()`, `prompt()` rămân native. Erorile
  necapturate și promise-rejection-urile sunt de asemenea forwardate
  prin `postMessage`.

### Debugger-ul fals (`js/debugger/`)

- `vm.js`: starea CPU simulată, RIP, registre `rax`..`r15`, flag-uri.
- `debugger.js`: UI, listing dezasamblare, patch-uri (NOP, Invert,
  Edit), jurnal.
- `docs.js`: panoul lateral de documentație (9 tab-uri).
- `controls.js`: wiring butoane și taste.
- `backend.js`: logica narativă a stadiilor de exploit.

Nicio execuție reală nu are loc; instrucțiunile ASM și patch-urile
sunt pattern-matching simplu cu efecte pre-scriptate în `backend.js`.

### Sesiunea QNX (`js/qnx/qnx.js`)

Un singur fișier mare care gestionează ferestrele Photon, shell-ul
`pterm`, file browser-ul, monitorul de procese, panoul de rețea,
taskbar-ul, și focus-stack-ul de ferestre. Focus-ul renormalizează
stiva `z-index` la fiecare click, pentru a nu crește nelimitat
într-o sesiune lungă.

### Teste smoke

`js/core/smoke.js` conține o suită minimă de teste care validează
că funcțiile globale critice există și că dialogurile cheie se
deschid. Se rulează manual din consola browserului.

### Contribuții

Acesta este un proiect personal și o satiră. Pull request-urile sunt
acceptate dacă se încadrează în spiritul proiectului și nu rup
satira. Deschideți un issue pe GitLab pentru discuții.

---

## Licență

MIT. Vedeți `LICENSE` în depozitul GitLab.

Fontul Cantarell este distribuit sub SIL Open Font License; a se
vedea `cantarell/OFL.txt`.