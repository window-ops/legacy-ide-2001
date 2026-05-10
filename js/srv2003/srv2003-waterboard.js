/* ============================================================
   WATERBOARD CONSOLE SATIRE
   Post-coreboot payoff. After the appliance is flashed, the
   user picks one of two homebrew console payloads to load:

     Waterboard 3 (W3)  Older platform, very few restrictions.
                        Buy game once, play it. Nothing else
                        between you and your purchase. Modeled
                        on the PS2: install the game, run it,
                        no subscription, no per-launch DRM.

     Waterboard 4 (W4)  Modern platform, premium experience.
                        Each game launch checks the optical
                        disc (even though the game is fully
                        installed locally), and online play
                        requires a WB Plus subscription
                        (even when the game itself is
                        cross-platform and PC players play
                        the same multiplayer for free).

   Both shells share the same game library. The friction layer
   on W4 is the satire payload; the games themselves are the
   carrot that makes the choice meaningful.

   Three games:
     Snake          single-player, real, playable.
     Pong vs CPU    single-player, real, playable.
     Tank Battle    "online only", fake, exists only to surface
                    the subscription wall on W4.

   Module owns:
     STORAGE_KEY 'ide.waterboard.v1' for picked variant +
       a few per-variant flags (subscribed, achievements).
     showConsolePicker()   - first screen after coreboot.
     installVariant(v)     - simulated payload flash.
     bootWaterboard(v)     - mount the chosen OS shell.
     launchSnake/Pong/TankBattle(v)  - the three games.
     Discrete W4 friction surfaces:
       showDiscCheck(gameName, onProceed, onCancel)
       showSubscriptionWall(gameName, onSubscribe, onCancel)

   Coreboot's runFlashSequence calls window.SRV2K3_COREBOOT_TAKEOVER
   on success. We register that to either resume the previously
   booted console or show the picker.
   ============================================================ */
(function () {
  if (typeof window === "undefined") return;

  var STORAGE_KEY = "ide.waterboard.v1";

  function loadState() {
    try {
      var raw = sessionStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  }
  function saveState(s) {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(s));
    } catch (e) {}
  }
  function patchState(patch) {
    var s = loadState() || {};
    for (var k in patch) s[k] = patch[k];
    saveState(s);
    return s;
  }

  // ----------------------------------------------------------
  // CHROME TEAR-DOWN
  // Both W3 and W4 take over the screen completely. Tear down
  // every other surface that might still be mounted; coreboot's
  // post-flash splash already does most of this but we re-do
  // it defensively in case the user reaches us via the picker
  // without going through the flash overlay (e.g. on reload).
  // ----------------------------------------------------------
  function teardownAll() {
    document.body.classList.remove("srv2003-desktop");
    document.body.classList.remove("srv2003-installing");
    document.body.classList.remove("has-su-taskbar");
    document.body.classList.remove("srv2003-min");
    var ids = [
      "srv2003Taskbar",
      "srv2003StartMenu",
      "srv2003Icons",
      "srv2003InstallRoot",
      "suTaskbar",
      "suStartMenu",
      "biosSetup",
      "corebootFlashRoot",
      "corebootSplash",
      "wbRoot",
    ];
    ids.forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.remove();
    });
    document.querySelectorAll(".dialog-backdrop").forEach(function (el) {
      el.remove();
    });
  }
  function makeRoot() {
    var r = document.createElement("div");
    r.id = "wbRoot";
    r.className = "wb-root";
    document.body.appendChild(r);
    return r;
  }

  // ============================================================
  // CONSOLE PICKER
  // First screen after coreboot. Two large cards side by side.
  // Each card carries the brand mark, a one-line tagline, a
  // "what you get / what you give up" comparison block, and a
  // single primary action button. The user picks one and that
  // choice is permanent for the session (rebooting reloads the
  // same variant; clearing sessionStorage resets to the picker).
  // ============================================================
  function showConsolePicker() {
    teardownAll();
    var root = makeRoot();
    root.innerHTML =
      '<div class="wb-picker">' +
      '<div class="wb-picker-header">' +
      '<div class="wb-picker-title">coreboot ready</div>' +
      '<div class="wb-picker-sub">Aparatura GDX-APPLIANCE-A04 este eliberată de firmware-ul Phoenix. Alegeți un payload pe care să-l încărcați.</div>' +
      "</div>" +
      '<div class="wb-picker-cards">' +
      // ----- Waterboard 3 card -----
      '<div class="wb-card wb-card-w3" data-wb-pick="w3">' +
      '<div class="wb-card-brand">' +
      '<div class="wb-brand-mark wb-brand-w3"><span class="wb-brand-wb">WB</span><span class="wb-brand-num">3</span></div>' +
      '<div class="wb-brand-name">Waterboard 3</div>' +
      '<div class="wb-brand-tag">Hardware mai vechi. Foarte puține restricții. Lansat înainte ca ICE să-și revadă politica de licențiere.</div>' +
      "</div>" +
      '<div class="wb-card-body">' +
      '<div class="wb-card-section-title">Ce primiți</div>' +
      '<ul class="wb-card-list wb-good">' +
      "<li>Cumpărați jocul, îl instalați, îl porniți. Atât.</li>" +
      "<li>Multiplayer online inclus, fără abonament suplimentar.</li>" +
      "<li>Discul fizic nu este verificat la pornire (versiunea instalată este suficientă).</li>" +
      "<li>Funcționează complet offline.</li>" +
      "</ul>" +
      '<div class="wb-card-section-title">Ce nu primiți</div>' +
      '<ul class="wb-card-list wb-meh">' +
      "<li>Texturi în 480p. Sunet stereo.</li>" +
      "<li>Lansările noi nu mai apar pentru această platformă.</li>" +
      "</ul>" +
      "</div>" +
      '<button class="wb-card-btn">Instalează Waterboard 3</button>' +
      "</div>" +
      // ----- Waterboard 4 card -----
      '<div class="wb-card wb-card-w4" data-wb-pick="w4">' +
      '<div class="wb-card-brand">' +
      '<div class="wb-brand-mark wb-brand-w4"><span class="wb-brand-wb">WB</span><span class="wb-brand-num">4</span></div>' +
      '<div class="wb-brand-name">Waterboard 4</div>' +
      '<div class="wb-brand-tag">Hardware modern. Experiență premium. Făcut de Intercal Computer Entertainment (ICE).</div>' +
      "</div>" +
      '<div class="wb-card-body">' +
      '<div class="wb-card-section-title">Ce primiți</div>' +
      '<ul class="wb-card-list wb-good">' +
      "<li>Texturi în 4K HDR. Sunet 7.1.</li>" +
      "<li>Trofee, capturi de ecran, transmisii live.</li>" +
      "<li>Lansări noi în fiecare săptămână.</li>" +
      "</ul>" +
      '<div class="wb-card-section-title">Ce nu primiți</div>' +
      '<ul class="wb-card-list wb-bad">' +
      "<li><strong>Multiplayer online cere abonament WB Plus</strong> (59,99 USD pe an), chiar și pentru jocuri cross-platform unde pe PC se joacă fără abonament.</li>" +
      "<li><strong>Verificare disc la fiecare pornire de joc.</strong> Dacă ați pierdut discul (chiar și pentru un joc plătit și deja instalat), nu mai puteți juca.</li>" +
      "<li>Aparatul refuză să pornească dacă nu primește actualizări semnate ICE.</li>" +
      "<li>Datele jocurilor rămân pe serverele ICE și după ștergerea contului.</li>" +
      "</ul>" +
      "</div>" +
      '<button class="wb-card-btn">Instalează Waterboard 4</button>' +
      "</div>" +
      "</div>" +
      '<div class="wb-picker-footer">' +
      "Această alegere este permanentă în sesiunea curentă. Pentru a o reseta, ștergeți datele site-ului din browser." +
      "</div>" +
      "</div>";

    root.querySelectorAll("[data-wb-pick]").forEach(function (card) {
      card.addEventListener("click", function () {
        var v = card.getAttribute("data-wb-pick");
        installVariant(v);
      });
    });
  }

  // ============================================================
  // INSTALL ANIMATION
  // Brief simulated payload flash. Three short stages with a
  // progress bar; total ~6 seconds. Different log lines per
  // variant so the satire framing is preserved.
  // ============================================================
  function installVariant(variant) {
    teardownAll();
    var root = makeRoot();
    var brandClass = variant === "w3" ? "wb-brand-w3" : "wb-brand-w4";
    var brandText = variant === "w3"
      ? '<span class="wb-brand-wb">WB</span><span class="wb-brand-num">3</span>'
      : '<span class="wb-brand-wb">WB</span><span class="wb-brand-num">4</span>';
    var brandName = variant === "w3" ? "Waterboard 3" : "Waterboard 4";
    root.innerHTML =
      '<div class="wb-install">' +
      '<div class="wb-install-header">' +
      '<div class="wb-brand-mark ' + brandClass + '">' + brandText + "</div>" +
      '<div class="wb-install-title">Instalez ' + brandName + "</div>" +
      "</div>" +
      '<div class="wb-install-progress-wrap">' +
      '<div class="wb-install-progress" id="wbInstallBar"></div>' +
      "</div>" +
      '<div class="wb-install-log" id="wbInstallLog"></div>' +
      "</div>";
    var bar = document.getElementById("wbInstallBar");
    var log = document.getElementById("wbInstallLog");
    function logLine(t, cls) {
      var d = document.createElement("div");
      d.className = "wb-install-line" + (cls ? " " + cls : "");
      d.textContent = t;
      log.appendChild(d);
      log.scrollTop = log.scrollHeight;
    }

    var script;
    if (variant === "w3") {
      script = [
        [0,    "[BOOT] Init kernel WB3-2.4.0..."],
        [600,  "[FS]   Mounting /storage  ... OK"],
        [1100, "[NET]  Bringing up eth0   ... OK"],
        [1700, "[GAME] Indexing /storage/games (3 titluri)"],
        [2400, "[USER] Nu este necesar niciun cont pe aceasta platforma."],
        [3100, "[DRM]  Subsistem DRM:  absent (intentionat)."],
        [3800, "[OK]   Sistem gata in 3.8s."],
      ];
    } else {
      script = [
        [0,    "[BOOT] Init kernel WB4-9.51.0 (signed by ICE)..."],
        [500,  "[SEC]  Verifying secure-boot chain ... OK"],
        [1000, "[NET]  Bringing up eth0           ... OK"],
        [1500, "[NET]  Connecting to wb4-auth.intercal.com ... timed out"],
        [2100, "[NET]  Retrying ... OK"],
        [2700, "[ACCT] Free Account detected. WB Plus: NOT ACTIVE."],
        [3300, "[DRM]  Loading optical-disc handshake module ... OK"],
        [3900, "[GAME] Indexing /storage/games (3 titluri, 2 necesită disc)"],
        [4500, "[OK]   Sistem gata in 4.5s. Activati un abonament WB Plus pentru experienta completa."],
      ];
    }

    var maxT = script[script.length - 1][0] + 800;
    var startT = Date.now();
    var idx = 0;
    function tick() {
      var t = Date.now() - startT;
      var pct = Math.min(100, Math.round((t / maxT) * 100));
      bar.style.width = pct + "%";
      while (idx < script.length && script[idx][0] <= t) {
        logLine(script[idx][1], script[idx][2]);
        idx += 1;
      }
      if (t >= maxT) {
        patchState({
          variant: variant,
          installedAt: Date.now(),
          subscribed: false,
        });
        setTimeout(function () {
          bootWaterboard(variant);
        }, 250);
        return;
      }
      requestAnimationFrame(tick);
    }
    tick();
  }

  // ============================================================
  // OS SHELL
  // After install, the chosen variant boots its OS. Both shells
  // have the same skeleton: a top status bar, a centered title,
  // a horizontal carousel of game tiles, a footer hint. They
  // diverge in palette, top-bar contents, and what happens
  // when a game tile is clicked.
  // ============================================================
  function bootWaterboard(variant) {
    teardownAll();
    var root = makeRoot();
    var st = loadState() || {};
    var subscribed = !!st.subscribed;

    var shellClass = variant === "w3" ? "wb-shell-w3" : "wb-shell-w4";
    var brandClass = variant === "w3" ? "wb-brand-w3" : "wb-brand-w4";
    var brandText = variant === "w3"
      ? '<span class="wb-brand-wb">WB</span><span class="wb-brand-num">3</span>'
      : '<span class="wb-brand-wb">WB</span><span class="wb-brand-num">4</span>';
    var brandName = variant === "w3" ? "Waterboard 3" : "Waterboard 4";

    var statusRight;
    if (variant === "w3") {
      statusRight =
        '<span class="wb-status-pill">SOLO</span>' +
        '<span class="wb-status-pill">v2.4.0</span>' +
        '<span class="wb-status-clock" id="wbClock"></span>';
    } else {
      statusRight =
        '<span class="wb-status-pill ' +
        (subscribed ? "wb-pill-on" : "wb-pill-off") +
        '">' +
        (subscribed ? "WB Plus activ" : "Cont gratuit") +
        "</span>" +
        '<span class="wb-status-pill">v9.51</span>' +
        '<span class="wb-status-clock" id="wbClock"></span>';
    }

    root.innerHTML =
      '<div class="wb-shell ' + shellClass + '">' +
      // Top status bar
      '<div class="wb-statusbar">' +
      '<div class="wb-statusbar-left">' +
      '<div class="wb-brand-mark wb-brand-mini ' + brandClass + '">' + brandText + "</div>" +
      '<span class="wb-statusbar-name">' + brandName + "</span>" +
      "</div>" +
      '<div class="wb-statusbar-right">' + statusRight + "</div>" +
      "</div>" +
      // W4 only: subscription nag banner
      (variant === "w4" && !subscribed
        ? '<div class="wb-nag-banner">' +
          "WB Plus inactiv. Multiplayer online indisponibil. " +
          '<button class="wb-nag-cta" data-wb-action="subscribe">Activează (59,99 USD/an)</button>' +
          "</div>"
        : "") +
      // Hero featured-game banner. Promotes the multiplayer
      // title because that is where the satire bites on W4.
      '<div class="wb-hero">' +
      '<div class="wb-hero-card" data-wb-game="tank">' +
      '<div class="wb-hero-art">' + heroArt() + "</div>" +
      '<div class="wb-hero-meta">' +
      '<div class="wb-hero-tag">' +
      (variant === "w3"
        ? "Recomandat pe Waterboard 3"
        : "Recomandat pe Waterboard 4") +
      "</div>" +
      '<div class="wb-hero-title">Tank Battle Online</div>' +
      '<div class="wb-hero-sub">' +
      (variant === "w3"
        ? "Cross-platform. Servere comunitare. Fără abonament."
        : "Cross-platform. Multiplayer prin WB Plus. Disc necesar la fiecare pornire.") +
      "</div>" +
      "</div>" +
      "</div>" +
      "</div>" +
      // Game library
      '<div class="wb-library">' +
      '<div class="wb-library-title">Biblioteca</div>' +
      '<div class="wb-tiles">' +
      gameTile("snake", "Serpentine 64", "Arcade single-player", "snake") +
      gameTile("pong", "Pong vs CPU", "Arcade single-player", "pong") +
      gameTile("tank", "Tank Battle Online", "Acțiune multiplayer", "tank") +
      "</div>" +
      "</div>" +
      // Footer
      '<div class="wb-footer">' +
      (variant === "w3"
        ? "Selectați un joc pentru a-l porni. Pe Waterboard 3 toate jocurile rulează direct, fără verificări suplimentare."
        : "Selectați un joc pentru a-l porni. Pe Waterboard 4 fiecare lansare verifică discul fizic, iar multiplayer-ul cere abonament WB Plus activ.") +
      "</div>" +
      "</div>";

    // Live clock in the status bar. Updates every 30 s; cleared
    // when the shell is replaced (the next teardownAll() removes
    // #wbClock from the DOM and the interval becomes a no-op).
    function tickClock() {
      var el = document.getElementById("wbClock");
      if (!el) return;
      var d = new Date();
      var hh = String(d.getHours()).padStart(2, "0");
      var mm = String(d.getMinutes()).padStart(2, "0");
      el.textContent = hh + ":" + mm;
    }
    tickClock();
    setInterval(tickClock, 30000);

    function gameTile(id, title, sub, art) {
      return (
        '<div class="wb-tile" data-wb-game="' + id + '">' +
        '<div class="wb-tile-art wb-art-' + art + '">' + tileArt(art) + "</div>" +
        '<div class="wb-tile-title">' + title + "</div>" +
        '<div class="wb-tile-sub">' + sub + "</div>" +
        "</div>"
      );
    }

    root.querySelectorAll("[data-wb-game]").forEach(function (el) {
      el.addEventListener("click", function () {
        var g = el.getAttribute("data-wb-game");
        if (g === "snake") onPickSinglePlayer("Serpentine 64", launchSnake, variant);
        else if (g === "pong") onPickSinglePlayer("Pong vs CPU", launchPong, variant);
        else if (g === "tank") onPickOnline("Tank Battle Online", launchTankBattle, variant);
      });
    });
    var nag = root.querySelector('[data-wb-action="subscribe"]');
    if (nag) {
      nag.addEventListener("click", function () {
        showSubscriptionWall(
          "WB Plus",
          function () {
            patchState({ subscribed: true });
            bootWaterboard(variant);
          },
          function () {}
        );
      });
    }
  }

  // Disc-check (W4 only) for single-player game launches.
  function onPickSinglePlayer(gameName, launchFn, variant) {
    if (variant === "w3") {
      launchFn(variant);
      return;
    }
    showDiscCheck(
      gameName,
      function () { launchFn(variant); },
      function () {}
    );
  }
  // Subscription-wall (W4 only) for online game launches.
  function onPickOnline(gameName, launchFn, variant) {
    if (variant === "w3") {
      launchFn(variant);
      return;
    }
    var st = loadState() || {};
    if (st.subscribed) {
      // Even with subscription, W4 still does a disc check.
      showDiscCheck(
        gameName,
        function () { launchFn(variant); },
        function () {}
      );
      return;
    }
    showSubscriptionWall(
      gameName,
      function () {
        patchState({ subscribed: true });
        bootWaterboard(variant);
      },
      function () {}
    );
  }

  // Tile artwork. Cheap inline SVG; conveys genre at a glance.
  // Larger artwork for the hero banner. Two tanks plus battle
  // smoke + a few stars; no labels needed since the meta block
  // overlays the title.
  function heroArt() {
    return (
      '<svg viewBox="0 0 600 240" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">' +
      // sky gradient
      '<defs>' +
      '<linearGradient id="wbHeroSky" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0" stop-color="#1a3060"/>' +
      '<stop offset="1" stop-color="#0a1828"/>' +
      "</linearGradient>" +
      "</defs>" +
      '<rect width="600" height="240" fill="url(#wbHeroSky)"/>' +
      // distant stars
      '<g fill="#ffffff" opacity="0.8">' +
      '<circle cx="80"  cy="40"  r="1"/>' +
      '<circle cx="220" cy="20"  r="1.4"/>' +
      '<circle cx="380" cy="60"  r="1"/>' +
      '<circle cx="500" cy="35"  r="1.2"/>' +
      '<circle cx="560" cy="90"  r="1"/>' +
      "</g>" +
      // ground
      '<rect x="0" y="170" width="600" height="70" fill="#3a3020"/>' +
      '<line x1="0" y1="170" x2="600" y2="170" stroke="#806040" stroke-width="2"/>' +
      // green tank (left)
      '<g transform="translate(100,150)">' +
      '<rect x="-40" y="-10" width="60" height="20" fill="#608040" rx="2"/>' +
      '<rect x="-20" y="-26" width="32" height="20" fill="#608040" rx="2"/>' +
      '<line x1="12" y1="-16" x2="50" y2="-16" stroke="#608040" stroke-width="6" stroke-linecap="round"/>' +
      '<circle cx="-30" cy="14" r="6" fill="#202020"/>' +
      '<circle cx="-10" cy="14" r="6" fill="#202020"/>' +
      '<circle cx="10"  cy="14" r="6" fill="#202020"/>' +
      "</g>" +
      // red tank (right)
      '<g transform="translate(490,150) scale(-1,1)">' +
      '<rect x="-40" y="-10" width="60" height="20" fill="#a04040" rx="2"/>' +
      '<rect x="-20" y="-26" width="32" height="20" fill="#a04040" rx="2"/>' +
      '<line x1="12" y1="-16" x2="50" y2="-16" stroke="#a04040" stroke-width="6" stroke-linecap="round"/>' +
      '<circle cx="-30" cy="14" r="6" fill="#202020"/>' +
      '<circle cx="-10" cy="14" r="6" fill="#202020"/>' +
      '<circle cx="10"  cy="14" r="6" fill="#202020"/>' +
      "</g>" +
      // shell trail across center
      '<path d="M 160 130 Q 300 80 440 130" stroke="#ffd34d" stroke-width="2" fill="none" stroke-dasharray="4 6" opacity="0.7"/>' +
      // smoke puffs
      '<circle cx="270" cy="100" r="14" fill="#604030" opacity="0.6"/>' +
      '<circle cx="290" cy="92"  r="10" fill="#806040" opacity="0.5"/>' +
      '<circle cx="310" cy="98"  r="14" fill="#604030" opacity="0.5"/>' +
      "</svg>"
    );
  }

  function tileArt(name) {
    if (name === "snake") {
      return (
        '<svg viewBox="0 0 100 60" xmlns="http://www.w3.org/2000/svg">' +
        '<rect width="100" height="60" fill="#1a3a1a"/>' +
        '<rect x="20" y="20" width="6" height="6" fill="#80df80"/>' +
        '<rect x="26" y="20" width="6" height="6" fill="#80df80"/>' +
        '<rect x="32" y="20" width="6" height="6" fill="#80df80"/>' +
        '<rect x="32" y="26" width="6" height="6" fill="#80df80"/>' +
        '<rect x="32" y="32" width="6" height="6" fill="#80df80"/>' +
        '<rect x="38" y="32" width="6" height="6" fill="#80df80"/>' +
        '<rect x="44" y="32" width="6" height="6" fill="#80df80"/>' +
        '<rect x="68" y="40" width="6" height="6" fill="#df4040"/>' +
        "</svg>"
      );
    }
    if (name === "pong") {
      return (
        '<svg viewBox="0 0 100 60" xmlns="http://www.w3.org/2000/svg">' +
        '<rect width="100" height="60" fill="#000"/>' +
        '<line x1="50" y1="0" x2="50" y2="60" stroke="#ffffff" stroke-width="1" stroke-dasharray="2 3"/>' +
        '<rect x="6" y="22" width="3" height="16" fill="#fff"/>' +
        '<rect x="91" y="28" width="3" height="16" fill="#fff"/>' +
        '<rect x="56" y="32" width="4" height="4" fill="#fff"/>' +
        "</svg>"
      );
    }
    // tank
    return (
      '<svg viewBox="0 0 100 60" xmlns="http://www.w3.org/2000/svg">' +
      '<rect width="100" height="60" fill="#3a3020"/>' +
      '<rect x="20" y="35" width="28" height="10" fill="#608040"/>' +
      '<rect x="28" y="28" width="14" height="9" fill="#608040"/>' +
      '<line x1="42" y1="32" x2="60" y2="32" stroke="#608040" stroke-width="3"/>' +
      '<rect x="60" y="35" width="28" height="10" fill="#a04040"/>' +
      '<rect x="68" y="28" width="14" height="9" fill="#a04040"/>' +
      '<line x1="68" y1="32" x2="50" y2="32" stroke="#a04040" stroke-width="3"/>' +
      "</svg>"
    );
  }

  // ============================================================
  // W4 FRICTION SURFACES
  // ============================================================

  // "Insert disc" prompt. Three options, each with realistic
  // consequences: Insert (game launches), I lost my disc (re-buy
  // digitally for absurd price), Cancel (go back to library).
  function showDiscCheck(gameName, onProceed, onCancel) {
    var bd = document.createElement("div");
    bd.className = "wb-friction-bd";
    bd.innerHTML =
      '<div class="wb-friction wb-friction-disc">' +
      '<div class="wb-friction-art">' + discIcon() + "</div>" +
      '<div class="wb-friction-title">Vă rugăm introduceți discul jocului</div>' +
      '<div class="wb-friction-body">' +
      '<p><strong>' + gameName + "</strong> este instalat complet pe acest aparat (5.4 GB pe stocarea internă), dar pentru a porni jocul trebuie să introduceți discul fizic în unitatea optică.</p>" +
      "<p>Verificarea rulează la fiecare lansare a unui joc Waterboard 4, indiferent dacă acesta este sau nu instalat local.</p>" +
      "</div>" +
      '<div class="wb-friction-actions">' +
      '<button class="wb-btn wb-btn-primary" data-wb-disc="insert">Introduc discul</button>' +
      '<button class="wb-btn" data-wb-disc="lost">Am pierdut discul</button>' +
      '<button class="wb-btn" data-wb-disc="cancel">Anulează</button>' +
      "</div>" +
      "</div>";
    document.body.appendChild(bd);
    bd.querySelectorAll("[data-wb-disc]").forEach(function (b) {
      b.addEventListener("click", function () {
        var ch = b.getAttribute("data-wb-disc");
        if (ch === "insert") {
          bd.remove();
          onProceed();
        } else if (ch === "lost") {
          showLostDiscNag(gameName, function () {
            bd.remove();
            onCancel();
          });
        } else {
          bd.remove();
          onCancel();
        }
      });
    });
  }
  function showLostDiscNag(gameName, onClose) {
    var bd = document.createElement("div");
    bd.className = "wb-friction-bd";
    bd.innerHTML =
      '<div class="wb-friction wb-friction-lost">' +
      '<div class="wb-friction-title">Disc indisponibil</div>' +
      '<div class="wb-friction-body">' +
      "<p>Ne pare rău că ați pierdut discul pentru <strong>" + gameName + "</strong>.</p>" +
      "<p>Pentru a continua să jucați, trebuie:</p>" +
      "<ul>" +
      "<li>Să cumpărați din nou jocul, în ediție digitală: <strong>69,99 USD</strong> (cont ICE necesar)</li>" +
      '<li>Sau să cumpărați un disc nou de la un comerciant autorizat (preț de la ~25 USD pentru titluri vechi, ~70 USD pentru lansări noi).</li>' +
      "<li>Sau să contactați ICE Customer Support pentru proceduri de „proof of purchase\" (răspuns 7-14 zile lucrătoare, fără garanție de soluționare).</li>" +
      "</ul>" +
      "<p>Faptul că jocul este deja plătit, instalat local și ar funcționa tehnic fără disc nu schimbă politica de licențiere.</p>" +
      "</div>" +
      '<div class="wb-friction-actions">' +
      '<button class="wb-btn" data-wb-lost="close">Înțeleg</button>' +
      "</div>" +
      "</div>";
    document.body.appendChild(bd);
    bd.querySelector('[data-wb-lost="close"]').addEventListener("click", function () {
      bd.remove();
      onClose();
    });
  }

  // Subscription wall. Three options: Subscribe (proceeds, marks
  // state as subscribed), I already pay the publisher (closes
  // with a snarky ack), Cancel.
  function showSubscriptionWall(gameName, onSubscribe, onCancel) {
    var bd = document.createElement("div");
    bd.className = "wb-friction-bd";
    bd.innerHTML =
      '<div class="wb-friction wb-friction-sub">' +
      '<div class="wb-friction-art">' + subIcon() + "</div>" +
      '<div class="wb-friction-title">WB Plus este necesar</div>' +
      '<div class="wb-friction-body">' +
      "<p>Pentru a juca <strong>" + gameName + "</strong> în modul multiplayer online, contul ICE trebuie să aibă un abonament <strong>WB Plus</strong> activ.</p>" +
      "<p>Cerința se aplică inclusiv pentru jocurile <em>cross-platform</em> unde jucătorii de pe PC se conectează la același multiplayer fără niciun cost suplimentar către producătorul consolei. Logica este simplă: ați plătit jocul către editor, dar separat trebuie să-i plătiți și ICE pentru dreptul de a vă conecta la matchmaking.</p>" +
      "<div class=\"wb-sub-tiers\">" +
      "<div class=\"wb-sub-tier\"><strong>WB Plus Essential</strong><br>59,99 USD / an</div>" +
      "<div class=\"wb-sub-tier\"><strong>WB Plus Extra</strong><br>99,99 USD / an</div>" +
      "<div class=\"wb-sub-tier\"><strong>WB Plus Premium</strong><br>129,99 USD / an</div>" +
      "</div>" +
      "</div>" +
      '<div class="wb-friction-actions">' +
      '<button class="wb-btn wb-btn-primary" data-wb-sub="yes">Activează Essential (59,99 USD/an)</button>' +
      '<button class="wb-btn" data-wb-sub="paid">Eu am plătit deja editorul</button>' +
      '<button class="wb-btn" data-wb-sub="cancel">Anulează</button>' +
      "</div>" +
      "</div>";
    document.body.appendChild(bd);
    bd.querySelectorAll("[data-wb-sub]").forEach(function (b) {
      b.addEventListener("click", function () {
        var ch = b.getAttribute("data-wb-sub");
        bd.remove();
        if (ch === "yes") onSubscribe();
        else if (ch === "paid") {
          var ack = document.createElement("div");
          ack.className = "wb-friction-bd";
          ack.innerHTML =
            '<div class="wb-friction wb-friction-snark">' +
            '<div class="wb-friction-title">Mulțumim pentru observație</div>' +
            '<div class="wb-friction-body">' +
            "<p>Faptul că ați plătit deja editorul este corect documentat. Politica ICE rămâne neschimbată: serverele multiplayer ale jocurilor terțe sunt accesibile doar cu abonament WB Plus activ, indiferent de modul în care a fost licențiat jocul în sine.</p>" +
            "<p>Aceasta nu este o eroare. Este modelul de afaceri al platformei.</p>" +
            "</div>" +
            '<div class="wb-friction-actions">' +
            '<button class="wb-btn" data-wb-snark="close">Închide</button>' +
            "</div>" +
            "</div>";
          document.body.appendChild(ack);
          ack.querySelector('[data-wb-snark="close"]').addEventListener("click", function () {
            ack.remove();
            onCancel();
          });
        } else onCancel();
      });
    });
  }

  function discIcon() {
    return (
      '<svg viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg">' +
      '<circle cx="40" cy="40" r="34" fill="#3a3a3a" stroke="#aaa" stroke-width="1"/>' +
      '<circle cx="40" cy="40" r="22" fill="#202020" stroke="#aaa" stroke-width="0.5"/>' +
      '<circle cx="40" cy="40" r="10" fill="#3a3a3a" stroke="#aaa" stroke-width="0.5"/>' +
      '<circle cx="40" cy="40" r="3"  fill="#101010"/>' +
      '<path d="M 40 6 A 34 34 0 0 1 74 40" stroke="#a8c8ff" stroke-width="1" fill="none"/>' +
      "</svg>"
    );
  }
  function subIcon() {
    return (
      '<svg viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg">' +
      '<rect x="6" y="20" width="68" height="44" rx="4" fill="#0a3a8a" stroke="#fff" stroke-width="1"/>' +
      '<rect x="6" y="28" width="68" height="6" fill="#000"/>' +
      '<text x="40" y="56" text-anchor="middle" font-family="Tahoma, sans-serif" font-size="12" font-weight="700" fill="#ffd34d">WB PLUS</text>' +
      "</svg>"
    );
  }

  // ============================================================
  // GAMES
  // Each game opens an in-shell overlay that captures keyboard
  // input and runs an animation loop. Esc closes back to the
  // library. The games are intentionally simple: the satire is
  // not about game depth, it is about whether you get to play
  // them at all.
  // ============================================================

  function makeGameRoot(title, variant) {
    var bd = document.createElement("div");
    bd.className = "wb-game-bd";
    bd.innerHTML =
      '<div class="wb-game-frame">' +
      '<div class="wb-game-titlebar">' +
      '<div class="wb-game-title">' + title + "</div>" +
      '<button class="wb-game-close" data-wb-game-close>X</button>' +
      "</div>" +
      '<div class="wb-game-area" id="wbGameArea"></div>' +
      '<div class="wb-game-hint" id="wbGameHint"></div>' +
      "</div>";
    document.body.appendChild(bd);
    bd.querySelector("[data-wb-game-close]").addEventListener("click", function () {
      bd.remove();
    });
    return bd;
  }

  // ----- Snake -----
  function launchSnake(variant) {
    var bd = makeGameRoot("Serpentine 64", variant);
    var area = bd.querySelector("#wbGameArea");
    var hint = bd.querySelector("#wbGameHint");
    hint.textContent = "Săgețile sau WASD schimbă direcția. Esc închide. Mâncați mărul roșu, evitați pereții și propriul corp.";
    var W = 24, H = 16, cell = 18;
    var canvas = document.createElement("canvas");
    canvas.width = W * cell;
    canvas.height = H * cell;
    canvas.tabIndex = 0;
    canvas.style.outline = "none";
    canvas.className = "wb-canvas";
    area.appendChild(canvas);
    canvas.focus();
    var ctx = canvas.getContext("2d");
    var snake = [{ x: 10, y: 8 }, { x: 9, y: 8 }, { x: 8, y: 8 }];
    var dir = { x: 1, y: 0 };
    var pendingDir = dir;
    var food = placeFood();
    var score = 0;
    var alive = true;
    var tickMs = 110;
    function placeFood() {
      while (true) {
        var f = { x: (Math.random() * W) | 0, y: (Math.random() * H) | 0 };
        var hit = false;
        for (var i = 0; i < snake.length; i++) {
          if (snake[i].x === f.x && snake[i].y === f.y) { hit = true; break; }
        }
        if (!hit) return f;
      }
    }
    function step() {
      if (!alive) return;
      dir = pendingDir;
      var head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };
      if (head.x < 0 || head.x >= W || head.y < 0 || head.y >= H) {
        return die();
      }
      for (var i = 0; i < snake.length; i++) {
        if (snake[i].x === head.x && snake[i].y === head.y) return die();
      }
      snake.unshift(head);
      if (head.x === food.x && head.y === food.y) {
        score += 10;
        food = placeFood();
        if (tickMs > 50) tickMs -= 2;
      } else {
        snake.pop();
      }
      draw();
    }
    function die() {
      alive = false;
      ctx.fillStyle = "rgba(0,0,0,0.75)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#ffd34d";
      ctx.font = "bold 28px 'Lucida Console', monospace";
      ctx.textAlign = "center";
      ctx.fillText("GAME OVER", canvas.width / 2, canvas.height / 2 - 10);
      ctx.fillStyle = "#ffffff";
      ctx.font = "16px 'Lucida Console', monospace";
      ctx.fillText("Scor final: " + score, canvas.width / 2, canvas.height / 2 + 20);
      ctx.fillText("Apăsați R pentru o partidă nouă.", canvas.width / 2, canvas.height / 2 + 44);
    }
    function draw() {
      ctx.fillStyle = "#0a1a0a";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = "#1a3a1a";
      ctx.lineWidth = 1;
      for (var x = 0; x <= W; x++) {
        ctx.beginPath(); ctx.moveTo(x * cell, 0); ctx.lineTo(x * cell, canvas.height); ctx.stroke();
      }
      for (var y = 0; y <= H; y++) {
        ctx.beginPath(); ctx.moveTo(0, y * cell); ctx.lineTo(canvas.width, y * cell); ctx.stroke();
      }
      ctx.fillStyle = "#df4040";
      ctx.fillRect(food.x * cell + 2, food.y * cell + 2, cell - 4, cell - 4);
      for (var i = 0; i < snake.length; i++) {
        ctx.fillStyle = i === 0 ? "#a0ff80" : "#80df80";
        ctx.fillRect(snake[i].x * cell + 1, snake[i].y * cell + 1, cell - 2, cell - 2);
      }
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 12px 'Lucida Console', monospace";
      ctx.textAlign = "left";
      ctx.fillText("Scor: " + score, 6, 14);
    }
    function reset() {
      snake = [{ x: 10, y: 8 }, { x: 9, y: 8 }, { x: 8, y: 8 }];
      dir = { x: 1, y: 0 };
      pendingDir = dir;
      food = placeFood();
      score = 0;
      tickMs = 110;
      alive = true;
      draw();
    }
    function onKey(e) {
      var k = e.key;
      if (k === "Escape") { bd.remove(); cleanup(); return; }
      if (k === "r" || k === "R") { reset(); return; }
      var nd = null;
      if (k === "ArrowUp"    || k === "w" || k === "W") nd = { x: 0, y: -1 };
      else if (k === "ArrowDown"  || k === "s" || k === "S") nd = { x: 0, y: 1 };
      else if (k === "ArrowLeft"  || k === "a" || k === "A") nd = { x: -1, y: 0 };
      else if (k === "ArrowRight" || k === "d" || k === "D") nd = { x: 1, y: 0 };
      if (nd) {
        // Disallow 180-degree reversal in a single tick.
        if (nd.x !== -dir.x || nd.y !== -dir.y) pendingDir = nd;
        e.preventDefault();
      }
    }
    var stepTimer = setInterval(function () {
      if (!document.body.contains(bd)) { cleanup(); return; }
      step();
    }, tickMs);
    function cleanup() {
      clearInterval(stepTimer);
      window.removeEventListener("keydown", onKey, true);
    }
    window.addEventListener("keydown", onKey, true);
    draw();
  }

  // ----- Pong vs CPU -----
  function launchPong(variant) {
    var bd = makeGameRoot("Pong vs CPU", variant);
    var area = bd.querySelector("#wbGameArea");
    var hint = bd.querySelector("#wbGameHint");
    hint.textContent = "Săgeți Sus / Jos (sau W / S) pentru paleta voastră, în stânga. Esc închide. Primul la 5 puncte câștigă.";
    var canvas = document.createElement("canvas");
    canvas.width = 560;
    canvas.height = 360;
    canvas.tabIndex = 0;
    canvas.style.outline = "none";
    canvas.className = "wb-canvas";
    area.appendChild(canvas);
    canvas.focus();
    var ctx = canvas.getContext("2d");
    var pH = 60, pW = 8;
    var p1 = { x: 12, y: canvas.height / 2 - pH / 2, dy: 0 };
    var p2 = { x: canvas.width - 20, y: canvas.height / 2 - pH / 2, dy: 0 };
    var ball, sp1 = 0, sp2 = 0, paused = false;
    function reset(serveLeft) {
      ball = { x: canvas.width / 2, y: canvas.height / 2, vx: serveLeft ? -3.5 : 3.5, vy: (Math.random() - 0.5) * 4 };
    }
    reset(true);
    var keys = {};
    function onKey(e) {
      if (e.type === "keydown") {
        if (e.key === "Escape") { bd.remove(); cleanup(); return; }
        keys[e.key] = true;
      } else {
        keys[e.key] = false;
      }
      if (["ArrowUp", "ArrowDown", "w", "W", "s", "S"].indexOf(e.key) >= 0) e.preventDefault();
    }
    window.addEventListener("keydown", onKey, true);
    window.addEventListener("keyup", onKey, true);
    function frame() {
      if (!document.body.contains(bd)) { cleanup(); return; }
      if (paused) { requestAnimationFrame(frame); return; }
      // Player paddle
      var spd = 5;
      if (keys.ArrowUp || keys.w || keys.W) p1.y -= spd;
      if (keys.ArrowDown || keys.s || keys.S) p1.y += spd;
      if (p1.y < 0) p1.y = 0;
      if (p1.y > canvas.height - pH) p1.y = canvas.height - pH;
      // CPU paddle: track ball with slight delay so it's beatable.
      var center = p2.y + pH / 2;
      if (ball.y < center - 8) p2.y -= 3.6;
      else if (ball.y > center + 8) p2.y += 3.6;
      if (p2.y < 0) p2.y = 0;
      if (p2.y > canvas.height - pH) p2.y = canvas.height - pH;
      // Ball
      ball.x += ball.vx;
      ball.y += ball.vy;
      if (ball.y < 0) { ball.y = 0; ball.vy *= -1; }
      if (ball.y > canvas.height) { ball.y = canvas.height; ball.vy *= -1; }
      // Paddle collisions
      if (ball.x - 3 <= p1.x + pW && ball.y > p1.y && ball.y < p1.y + pH && ball.vx < 0) {
        ball.vx *= -1.05;
        ball.vy += (ball.y - (p1.y + pH / 2)) * 0.08;
      }
      if (ball.x + 3 >= p2.x && ball.y > p2.y && ball.y < p2.y + pH && ball.vx > 0) {
        ball.vx *= -1.05;
        ball.vy += (ball.y - (p2.y + pH / 2)) * 0.08;
      }
      // Score
      if (ball.x < 0) { sp2 += 1; reset(false); }
      else if (ball.x > canvas.width) { sp1 += 1; reset(true); }
      // Win
      var winner = sp1 >= 5 ? "JUCĂTOR" : sp2 >= 5 ? "CPU" : null;
      // Draw
      ctx.fillStyle = "#000000";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = "#ffffff";
      ctx.setLineDash([4, 6]);
      ctx.beginPath();
      ctx.moveTo(canvas.width / 2, 0);
      ctx.lineTo(canvas.width / 2, canvas.height);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(p1.x, p1.y, pW, pH);
      ctx.fillRect(p2.x, p2.y, pW, pH);
      ctx.fillRect(ball.x - 3, ball.y - 3, 6, 6);
      ctx.font = "bold 28px 'Lucida Console', monospace";
      ctx.textAlign = "center";
      ctx.fillText(sp1 + "    " + sp2, canvas.width / 2, 36);
      if (winner) {
        ctx.fillStyle = "rgba(0,0,0,0.7)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "#ffd34d";
        ctx.font = "bold 32px 'Lucida Console', monospace";
        ctx.fillText(winner + " câștigă!", canvas.width / 2, canvas.height / 2 - 8);
        ctx.fillStyle = "#ffffff";
        ctx.font = "16px 'Lucida Console', monospace";
        ctx.fillText("Apăsați Esc pentru a închide.", canvas.width / 2, canvas.height / 2 + 24);
        return;
      }
      requestAnimationFrame(frame);
    }
    function cleanup() {
      window.removeEventListener("keydown", onKey, true);
      window.removeEventListener("keyup", onKey, true);
    }
    requestAnimationFrame(frame);
  }

  // ----- Tank Battle -----
  // Online-only; only reachable on W3 (no friction) or W4 with
  // an active subscription. The game itself is intentionally a
  // stub: the satire payload is the wall, not the gameplay.
  function launchTankBattle(variant) {
    var bd = makeGameRoot("Tank Battle Online", variant);
    var area = bd.querySelector("#wbGameArea");
    var hint = bd.querySelector("#wbGameHint");
    hint.textContent = "Se conectează la serverele Tank Battle. Esc închide.";
    area.innerHTML =
      '<div class="wb-tank-stub">' +
      '<div class="wb-tank-status">' +
      '<div class="wb-tank-spinner"></div>' +
      '<div>Se conectează la lobby ' +
      (variant === "w3"
        ? "(server comunitar, găzduit de fani)"
        : "(prin WB Plus, abonament verificat)") +
      "...</div>" +
      "</div>" +
      '<div class="wb-tank-meta">' +
      "<p>Acest multiplayer este același mod, pe Waterboard 3, Waterboard 4 și PC. Pe PC, jucătorii nu plătesc nimic în plus pentru matchmaking.</p>" +
      (variant === "w4"
        ? "<p><strong>Pe Waterboard 4, ați plătit ICE 59,99 USD/an pentru exact același serviciu.</strong></p>"
        : "<p>Aici sunteți pe W3, deci nu ați plătit nimic în plus.</p>") +
      "</div>" +
      "</div>";
    function onKey(e) {
      if (e.key === "Escape") {
        bd.remove();
        window.removeEventListener("keydown", onKey, true);
      }
    }
    window.addEventListener("keydown", onKey, true);
  }

  // ============================================================
  // BOOT-TIME REGISTRATION
  // Coreboot calls SRV2K3_COREBOOT_TAKEOVER on flash success and
  // on every page load if the appliance was previously flashed.
  // We resume the previously chosen variant if any, otherwise
  // show the picker.
  // ============================================================
  window.SRV2K3_COREBOOT_TAKEOVER = function () {
    var st = loadState();
    if (st && st.variant) {
      bootWaterboard(st.variant);
    } else {
      showConsolePicker();
    }
  };

  // Public for debugging.
  window.SRV2K3_WATERBOARD = {
    showPicker: showConsolePicker,
    boot: bootWaterboard,
    install: installVariant,
    state: loadState,
    reset: function () {
      try { sessionStorage.removeItem(STORAGE_KEY); } catch (e) {}
    },
  };
})();
