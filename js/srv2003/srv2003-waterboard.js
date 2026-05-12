/* ============================================================
   WATERBOARD CONSOLE SATIRE
   Post-coreboot environment. After the appliance is flashed
   the user picks one of three homebrew console payloads:

     Waterboard 3 (W3)  Older platform. Modeled on the PS2:
                        no subscription, no per-launch DRM,
                        no account requirement. The reference
                        for what gaming used to be.

     Waterboard 4 (W4)  Modern platform. Modeled on the PS4:
                        per-launch optical-disc check, online
                        play behind a WB Plus subscription
                        wall (even for cross-platform titles
                        that are free-multiplayer on PC), the
                        BIOS gets re-locked on install.

     Waterboard 5 (W5)  Latest platform, "ideal Intercal".
                        Modeled on the PS5: everything W4
                        does plus mandatory account creation,
                        regional restrictions, mandatory
                        firmware updates that occasionally
                        remove features, and games being
                        delisted from your library after
                        license expiry.

   The third pillar of the project's wider satire: at school
   the curriculum locks you out, at home the console locks
   you out. The platform owners decide whether the thing you
   bought continues to work.

   This module is mounted as window.SRV2K3_COREBOOT_TAKEOVER,
   which coreboot's checkBootTakeover() invokes after a
   successful flash and on every subsequent page load while
   the flash flag is set.

   STORAGE_KEY 'ide.waterboard.v1' tracks:
     variant        : 'w3' | 'w4' | 'w5'
     installedAt    : timestamp
     subscribed     : boolean (W4/W5 only)
     account        : string|null (W5 only - requires sign-up)
     poweredOff     : boolean (transient: Power Off renders
                              the safe-off-style screen)
     fwUpdateBlocked: boolean (W5 only, set when user defers)

   Separately stored under STORAGE_BRICK_KEY 'ide.nvram.brick.v1':
     value          : 'w4' | 'w5' (which generation locked the
                                   appliance). The brick variable
                                   models a one-time-programmable
                                   NVRAM fuse: it survives every
                                   reset, every reflash of the
                                   coreboot variant, every power
                                   cycle. Only physically clearing
                                   the storage (developer hatch,
                                   browser data wipe) removes it.
   ============================================================ */
(function () {
  if (typeof window === "undefined") return;

  // ============================================================
  // STATE
  // The waterboard variant + per-install volatile data lives
  // under STORAGE_KEY. The NVRAM brick fuse lives under a
  // separate key so a "reflash coreboot" can clear the variant
  // but cannot clear the brick. This matches real-world
  // platforms where downgrades blow efuse counters or burn
  // anti-rollback bits that hardware refuses to reset.
  // ============================================================
  var STORAGE_KEY = "ide.waterboard.v1";
  var STORAGE_BRICK_KEY = "ide.nvram.brick.v1";

  function loadState() {
    try {
      var raw = sessionStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }
  function saveState(s) {
    try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch (e) {}
  }
  function patchState(patch) {
    var s = loadState() || {};
    for (var k in patch) s[k] = patch[k];
    saveState(s);
    return s;
  }
  function resetState() {
    try { sessionStorage.removeItem(STORAGE_KEY); } catch (e) {}
  }
  // Brick (NVRAM fuse) accessors. The brick value is a single
  // variant string: 'w4' or 'w5'. It is set once at install
  // and never cleared by anything inside the simulation.
  function getBrick() {
    try { return sessionStorage.getItem(STORAGE_BRICK_KEY) || null; } catch (e) { return null; }
  }
  function setBrick(v) {
    try {
      // Refuse to "downgrade" the brick value. Once a higher
      // generation has fused, an older generation cannot
      // overwrite the fuse. This matters when the user
      // installs W5 and later (via reflash) tries to install
      // W4: the fuse stays at "w5".
      var ranks = { w4: 1, w5: 2 };
      var cur = sessionStorage.getItem(STORAGE_BRICK_KEY);
      if (cur && ranks[cur] >= ranks[v]) return;
      sessionStorage.setItem(STORAGE_BRICK_KEY, v);
    } catch (e) {}
  }

  // ============================================================
  // GAMES CATALOG
  // Each entry has an id, display title, subtitle, mode
  // (single or online), available-on list (which variants
  // can install/run it), and a launcher fn key for the two
  // playable ones. New-generation games are NOT available
  // on older consoles, mirroring real cross-gen gating.
  // ============================================================
  var GAMES = [
    {
      id: "snake",
      title: "Serpentine 64",
      sub: "Arcade clasic",
      mode: "single",
      availableOn: ["w3", "w4", "w5"],
      art: "snake",
      launcher: "snake"
    },
    {
      id: "pong",
      title: "Pong vs CPU",
      sub: "Arcade clasic",
      mode: "single",
      availableOn: ["w3", "w4", "w5"],
      art: "pong",
      launcher: "pong"
    },
    {
      id: "tank",
      title: "Tank Battle Online",
      sub: "Acțiune multiplayer",
      mode: "online",
      availableOn: ["w3", "w4", "w5"],
      art: "tank",
      launcher: "tank"
    },
    // New gen titles — not on W3
    {
      id: "racer",
      title: "GT Avantaj",
      sub: "Simulator de curse",
      mode: "single",
      availableOn: ["w4", "w5"],
      art: "racer",
      launcher: "racer"
    },
    {
      id: "stratoblitz",
      title: "Strato Blitz",
      sub: "Strategie tactică",
      mode: "single",
      availableOn: ["w4", "w5"],
      art: "strategy",
      launcher: "strategy"
    },
    // W5 exclusive
    {
      id: "galaxy",
      title: "Star Galaxy VII",
      sub: "RPG pe ture",
      mode: "single",
      availableOn: ["w5"],
      art: "rpg",
      launcher: "rpg"
    },
    {
      id: "platformer",
      title: "Lemur Quest",
      sub: "Platforming aventură",
      mode: "single",
      availableOn: ["w3", "w4", "w5"],
      art: "lemur",
      launcher: "lemur"
    },
    {
      id: "puzzle",
      title: "Cube Logica",
      sub: "Puzzle (Sokoban)",
      mode: "single",
      availableOn: ["w3", "w4", "w5"],
      art: "puzzle",
      launcher: "puzzle"
    }
  ];
  function gamesFor(variant) {
    return GAMES.filter(function (g) { return g.availableOn.indexOf(variant) >= 0; });
  }

  // ============================================================
  // SCREEN MANAGEMENT
  // Both shells take over the screen completely. Tear down
  // every other surface that might still be mounted before
  // rendering. Idempotent and safe to call repeatedly.
  // ============================================================
  function teardownAll() {
    document.body.classList.remove("srv2003-desktop");
    document.body.classList.remove("srv2003-installing");
    document.body.classList.remove("has-su-taskbar");
    document.body.classList.remove("srv2003-min");
    document.body.classList.remove("coreboot-flashing");
    var ids = [
      "srv2003Taskbar", "srv2003StartMenu", "srv2003Icons",
      "srv2003InstallRoot", "suTaskbar", "suStartMenu",
      "biosSetup", "corebootFlashRoot", "corebootSplash", "wbRoot"
    ];
    ids.forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.remove();
    });
    document.querySelectorAll(".dialog-backdrop").forEach(function (el) { el.remove(); });
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
  // BIOS-style. Looks like a low-level firmware boot menu:
  // dark background, monospace, plain bordered rows. The user
  // is in coreboot's payload selector here, NOT in any console
  // OS yet. The title bar reads as a firmware utility header
  // (no tty path, no shell prompt).
  //
  // Lockout reads from the NVRAM brick fuse rather than from
  // a previous-variant marker. Once W4 or W5 has burned the
  // fuse, the legacy generation row is permanently disabled
  // and reflashing coreboot will not bring it back.
  // ============================================================
  function showConsolePicker() {
    teardownAll();
    var root = makeRoot();
    var brick = getBrick();
    var ranks = { w3: 0, w4: 1, w5: 2 };
    function isLocked(v) {
      if (!brick) return false;
      // Generation rule: variants older than the brick's
      // recorded generation are permanently locked out. Same
      // and newer remain installable so a W4 user can still
      // upgrade to W5, and a W5 user can re-install W5.
      return ranks[v] < ranks[brick];
    }
    var rows = [
      {
        v: "w3",
        name: "Waterboard 3",
        kind: "ICE Legacy Series",
        tagline: "Generația PS2. Cumpărați jocul, îl porniți. Fără verificări.",
        size: "47 MB"
      },
      {
        v: "w4",
        name: "Waterboard 4",
        kind: "ICE Modern Series",
        tagline: "Verificare disc la fiecare lansare. Multiplayer cu abonament.",
        size: "1,2 GB"
      },
      {
        v: "w5",
        name: "Waterboard 5",
        kind: "ICE Premium Series",
        tagline: "Cont obligatoriu. Actualizări forțate. Restricții regionale.",
        size: "4,8 GB"
      }
    ];
    var rowsHtml = rows.map(function (r) {
      var locked = isLocked(r.v);
      return (
        '<div class="wbp-row' + (locked ? " wbp-row-locked" : "") +
        '" data-pick="' + r.v + '"' + (locked ? " aria-disabled=\"true\"" : "") + ">" +
        '<div class="wbp-row-key">[' + r.v.toUpperCase() + "]</div>" +
        '<div class="wbp-row-meta">' +
        '<div class="wbp-row-name">' + r.name +
        '<span class="wbp-row-kind"> &nbsp;&middot;&nbsp; ' + r.kind + "</span>" +
        "</div>" +
        '<div class="wbp-row-tag">' + r.tagline + "</div>" +
        "</div>" +
        '<div class="wbp-row-size">' + r.size +
        (locked ? '<div class="wbp-row-locked-note">FUSE BLOWN</div>' : "") +
        "</div>" +
        "</div>"
      );
    }).join("");
    var brickLine = brick
      ? "NVRAM fuse:        " + brick.toUpperCase() + " (blown, permanent)"
      : "NVRAM fuse:        unburned";
    root.innerHTML =
      '<div class="wbp">' +
      '<div class="wbp-titlebar">GDX-APPLIANCE-A04 / coreboot 4.22-gdx / SELECTOR BIOS</div>' +
      '<div class="wbp-inner">' +
      '<pre class="wbp-banner">' +
      "Mainboard:         via/epia-ln, BIOS region 524288 bytes\n" +
      "SPI write-protect: dezactivat (jumper J3)\n" +
      "Supervisor:        nu este setat\n" +
      brickLine + "\n\n" +
      "Selectați BIOS-ul de încărcat:" +
      "</pre>" +
      '<div class="wbp-rows">' + rowsHtml + "</div>" +
      (brick
        ? '<div class="wbp-note">' +
          "O instalare anterioară a Waterboard " + (brick === "w5" ? "5" : "4") + " a inscripționat o variabilă NVRAM permanentă (fuse) care marchează acest aparat ca fiind locked pe generația " + brick.toUpperCase() + " sau mai nouă. Variabila NU poate fi ștearsă, nici prin reset BIOS, nici prin reflashare coreboot, nici prin oprirea aparatului. Modelele mai vechi rămân indisponibile permanent." +
          "</div>"
        : "") +
      '<div class="wbp-footer">' +
      "Selecția va instala BIOS-ul ales pe partiția /storage. Generațiile W4 și W5 ard variabila NVRAM la prima pornire." +
      "</div>" +
      "</div>" +
      "</div>";

    root.querySelectorAll(".wbp-row").forEach(function (el) {
      if (el.classList.contains("wbp-row-locked")) return;
      el.addEventListener("click", function () {
        var v = el.getAttribute("data-pick");
        installVariant(v);
      });
    });
  }

  // ============================================================
  // INSTALL ANIMATION
  // Brief simulated BIOS image write. Per-variant log lines
  // surface the satire framing right from boot. The same
  // BIOS-style chrome as the picker. W4 and W5 burn the
  // permanent NVRAM brick fuse during install, which the next
  // picker pass will read.
  // ============================================================
  function installVariant(variant) {
    teardownAll();
    var root = makeRoot();
    var brandName = variantName(variant);
    root.innerHTML =
      '<div class="wbp">' +
      '<div class="wbp-titlebar">GDX-APPLIANCE-A04 / INSTALARE BIOS / ' + brandName + "</div>" +
      '<div class="wbp-inner">' +
      '<pre class="wbp-banner">' +
      "Se instalează imaginea BIOS " + brandName + " în /storage..." +
      "</pre>" +
      '<div class="wbi-bar"><div class="wbi-bar-fill" id="wbiBar"></div></div>' +
      '<pre class="wbi-log" id="wbiLog"></pre>' +
      "</div>" +
      "</div>";
    var bar = document.getElementById("wbiBar");
    var log = document.getElementById("wbiLog");
    function logLine(t) { log.textContent += t + "\n"; log.scrollTop = log.scrollHeight; }

    var script;
    if (variant === "w3") {
      script = [
        [0,    "[BOOT] Init kernel WB3-2.4.0..."],
        [600,  "[FS]   Mount /storage              ... OK"],
        [1100, "[NET]  Bring up eth0               ... OK"],
        [1700, "[GAME] Index /storage/games        ... 5 titluri"],
        [2400, "[USER] Cont utilizator              ... nu este necesar"],
        [3100, "[DRM]  Subsistem DRM                ... absent (intenționat)"],
        [3800, "[OK]   Sistem gata in 3,8s."]
      ];
    } else if (variant === "w4") {
      script = [
        [0,    "[BOOT] Init kernel WB4-9.51.0 (signed by ICE)..."],
        [500,  "[SEC]  Verify secure-boot chain     ... OK"],
        [900,  "[NVRAM] Read fuse WB_FUSE_GEN       ... unburned"],
        [1300, "[NVRAM] Burn  fuse WB_FUSE_GEN=W4   ... OK (permanent)"],
        [1700, "[NVRAM] Lock  page 0x12 (anti-rollback) ... OK"],
        [2100, "[NET]  Bring up eth0                ... OK"],
        [2500, "[NET]  Auth wb4-auth.intercal.com   ... OK"],
        [2900, "[ACCT] Cont Free                    ... WB Plus: INACTIV"],
        [3400, "[DRM]  Modul optical-disc handshake ... incarcat"],
        [3900, "[GAME] Index /storage/games         ... 7 titluri, 5 cer disc"],
        [4500, "[OK]   Sistem gata in 4,5s."]
      ];
    } else {
      script = [
        [0,    "[BOOT] Init kernel WB5-3.10 (signed by ICE)..."],
        [500,  "[SEC]  Verify secure-boot chain     ... OK"],
        [900,  "[NVRAM] Read fuse WB_FUSE_GEN       ... unburned"],
        [1300, "[NVRAM] Burn  fuse WB_FUSE_GEN=W5   ... OK (permanent)"],
        [1700, "[NVRAM] Lock  page 0x12 (anti-rollback) ... OK"],
        [2100, "[NVRAM] Burn  fuse REGION_PIN=RO     ... OK (permanent)"],
        [2500, "[NET]  Bring up eth0                ... OK"],
        [2900, "[NET]  Auth wb5-auth.intercal.com   ... OK"],
        [3300, "[ACCT] Cont ICE                     ... necesar la prima pornire"],
        [3700, "[REG]  Verificare regiune RO         ... 12 titluri marcate restricționate"],
        [4100, "[DRM]  Modul optical-disc handshake ... incarcat"],
        [4500, "[FW]   Actualizări de firmware       ... 2 obligatorii"],
        [4900, "[GAME] Index /storage/games         ... 8 titluri, 6 cer disc"],
        [5400, "[OK]   Sistem gata in 5,4s."]
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
        logLine(script[idx][1]);
        idx += 1;
      }
      if (t >= maxT) {
        // W4 and W5 burn the NVRAM brick fuse on install. The
        // fuse is recorded in a separate storage key that is
        // not cleared by any reflash or reset path inside the
        // simulation.
        if (variant === "w4" || variant === "w5") {
          setBrick(variant);
        }
        var s = {
          variant: variant,
          installedAt: Date.now(),
          subscribed: false,
          account: null,
          poweredOff: false,
          fwUpdateBlocked: false
        };
        saveState(s);
        setTimeout(function () { bootWaterboard(variant); }, 250);
        return;
      }
      requestAnimationFrame(tick);
    }
    tick();
  }

  function variantName(v) {
    return v === "w3" ? "Waterboard 3" : v === "w4" ? "Waterboard 4" : "Waterboard 5";
  }

  // ============================================================
  // BOOT DISPATCHER + W5 ACCOUNT GATE
  // ============================================================
  function bootWaterboard(variant) {
    var st = loadState() || {};
    if (st.poweredOff) { return renderPowerOff(variant); }
    // W5 mandatory account creation: gate the first boot if
    // no account is associated yet. Closes the picker hatch
    // since W5 actively wants an account file.
    if (variant === "w5" && !st.account) { return showAccountCreate(variant); }
    if (variant === "w3") return bootW3();
    if (variant === "w4") return bootW4();
    return bootW5();
  }

  function showAccountCreate(variant) {
    teardownAll();
    var root = makeRoot();
    root.innerHTML =
      '<div class="wb5-shell wb-shell">' +
      '<div class="wb5-account-screen">' +
      '<div class="wb5-account-card">' +
      '<div class="wb5-account-title">Bine ați venit pe Waterboard 5</div>' +
      '<div class="wb5-account-sub">Pentru a continua, este necesar un cont ICE. Toate funcționalitățile, inclusiv biblioteca locală de jocuri, necesită autentificare.</div>' +
      '<div class="wb5-account-form">' +
      '<label>Nume cont</label>' +
      '<input type="text" id="wb5Acct" placeholder="ex: alex_mihai" autocomplete="off"/>' +
      '<label>Adresă de email</label>' +
      '<input type="email" id="wb5Email" placeholder="alex@example.com" autocomplete="off"/>' +
      '<label class="wb5-checkbox"><input type="checkbox" id="wb5Tos"/> <span>Am citit și sunt de acord cu Termenii Serviciilor ICE (62 de pagini), Politica de confidențialitate și sunt de acord ca datele mele de joc să rămână pe serverele ICE chiar și după ștergerea contului.</span></label>' +
      '<button class="wb5-btn wb5-btn-primary" id="wb5AcctOk">Creează cont și continuă</button>' +
      "</div>" +
      "</div>" +
      "</div>" +
      "</div>";
    document.getElementById("wb5AcctOk").addEventListener("click", function () {
      var name = (document.getElementById("wb5Acct").value || "").trim();
      var tos = document.getElementById("wb5Tos").checked;
      if (!name) { document.getElementById("wb5Acct").focus(); return; }
      if (!tos) { document.getElementById("wb5Tos").focus(); return; }
      patchState({ account: name });
      bootW5();
    });
    document.getElementById("wb5Acct").focus();
  }

  // ============================================================
  // W3 SHELL — PS2-style minimal column UI
  // Black background with a dark blue accent bar. Vertical list
  // of game tiles, system row at the top with About + Power.
  // No nag, no friction, no DRM checks. The point is contrast.
  // ============================================================
  function bootW3() {
    teardownAll();
    var root = makeRoot();
    var games = gamesFor("w3");
    var time = formatClock(new Date());
    root.innerHTML =
      '<div class="wb3-shell wb-shell">' +
      '<div class="wb3-stripe"></div>' +
      '<div class="wb3-topbar">' +
      '<span class="wb3-brand">Waterboard 3</span>' +
      '<span class="wb3-clock" id="wbClock">' + time + "</span>" +
      "</div>" +
      '<div class="wb3-columns">' +
      '<div class="wb3-col-system">' +
      '<div class="wb3-system-title">Sistem</div>' +
      '<div class="wb3-sys-item" data-wb3="about">Despre acest sistem</div>' +
      '<div class="wb3-sys-item" data-wb3="install">Instalează alt sistem</div>' +
      '<div class="wb3-sys-item" data-wb3="power">Oprire</div>' +
      "</div>" +
      '<div class="wb3-col-games">' +
      '<div class="wb3-system-title">Jocuri (' + games.length + ")</div>" +
      games.map(function (g) {
        return (
          '<div class="wb3-game" data-wb-game="' + g.id + '">' +
          '<div class="wb3-game-art">' + tileArt(g.art) + "</div>" +
          '<div class="wb3-game-meta">' +
          '<div class="wb3-game-title">' + g.title + "</div>" +
          '<div class="wb3-game-sub">' + g.sub + "</div>" +
          "</div>" +
          "</div>"
        );
      }).join("") +
      "</div>" +
      "</div>" +
      "</div>";

    wireSystemMenu(root, "w3");
    wireGameTiles(root, "w3", games);
    startClockTicker();
  }

  // ============================================================
  // W4 SHELL — PS4-style horizontal carousel
  // Blue gradient with flowing wave overlay, large square tiles
  // in a horizontal row, active title + game name displayed
  // below. Status bar with profile + trophies + clock at top.
  // The W4 BIOS lock applies on install.
  // ============================================================
  function bootW4() {
    teardownAll();
    var root = makeRoot();
    var st = loadState() || {};
    var games = gamesFor("w4");
    var subscribed = !!st.subscribed;
    root.innerHTML =
      '<div class="wb4-shell wb-shell">' +
      '<div class="wb4-bg-waves"></div>' +
      '<div class="wb4-topbar">' +
      '<div class="wb4-top-left">' +
      '<span class="wb4-icon-tri" aria-hidden="true"></span>' +
      '<span class="wb4-icon-info" aria-hidden="true">i</span>' +
      "</div>" +
      '<div class="wb4-top-center">' +
      '<span class="wb4-friends">friends 0</span>' +
      "</div>" +
      '<div class="wb4-top-right">' +
      '<span class="wb4-profile">' +
      '<span class="wb4-avatar"></span>' +
      '<span class="wb4-username">jucator</span>' +
      "</span>" +
      '<span class="wb4-trophies">' + (subscribed ? "★ 14" : "★ 14") + "</span>" +
      '<span class="wb4-clock" id="wbClock">' + formatClock(new Date()) + "</span>" +
      "</div>" +
      "</div>" +
      // Subtle subscription status pill — replaces the old
      // big yellow nag banner. Just a small line under the
      // top bar, not a screaming attention grab.
      (!subscribed
        ? '<div class="wb4-substrip">' +
          'WB Plus inactiv. Multiplayer indisponibil. ' +
          '<a href="#" data-wb-action="subscribe">Activează abonamentul</a>' +
          "</div>"
        : "") +
      '<div class="wb4-content">' +
      '<div class="wb4-row" id="wb4Row">' +
      // System tile first (combined system menu)
      '<div class="wb4-tile wb4-tile-system" data-wb4-sys="menu" tabindex="0">' +
      '<div class="wb4-tile-art wb4-art-system">' +
      '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><rect width="100" height="100" fill="#1a3580"/><circle cx="50" cy="50" r="22" fill="none" stroke="#a0c8ff" stroke-width="2"/><path d="M50 28 L50 16 M50 84 L50 72 M28 50 L16 50 M84 50 L72 50" stroke="#a0c8ff" stroke-width="2"/></svg>' +
      "</div>" +
      "</div>" +
      games.map(function (g) {
        return (
          '<div class="wb4-tile" data-wb-game="' + g.id + '" tabindex="0">' +
          '<div class="wb4-tile-art">' + tileArt(g.art) + "</div>" +
          "</div>"
        );
      }).join("") +
      "</div>" +
      '<div class="wb4-active-meta" id="wb4Meta">' +
      '<div class="wb4-active-title">Sistem</div>' +
      '<div class="wb4-active-sub">Setări, oprire, despre.</div>' +
      "</div>" +
      "</div>" +
      "</div>";

    // Tile focus updates the meta block below.
    var tiles = root.querySelectorAll("[data-wb-game], [data-wb4-sys]");
    function setActiveMeta(el) {
      var meta = root.querySelector("#wb4Meta");
      if (!meta) return;
      if (el.hasAttribute("data-wb4-sys")) {
        meta.querySelector(".wb4-active-title").textContent = "Sistem";
        meta.querySelector(".wb4-active-sub").textContent = "Setări, oprire, despre.";
      } else {
        var gid = el.getAttribute("data-wb-game");
        var g = games.find(function (x) { return x.id === gid; });
        if (g) {
          meta.querySelector(".wb4-active-title").textContent = g.title;
          meta.querySelector(".wb4-active-sub").textContent = g.sub;
        }
      }
      tiles.forEach(function (t) { t.classList.remove("wb4-tile-active"); });
      el.classList.add("wb4-tile-active");
    }
    if (tiles[0]) setActiveMeta(tiles[0]);
    tiles.forEach(function (t) {
      t.addEventListener("mouseenter", function () { setActiveMeta(t); });
      t.addEventListener("focus", function () { setActiveMeta(t); });
      t.addEventListener("click", function () {
        if (t.hasAttribute("data-wb4-sys")) {
          openSystemMenu("w4");
        } else {
          var gid = t.getAttribute("data-wb-game");
          launchGameWithFriction("w4", gid);
        }
      });
    });
    var subLink = root.querySelector('[data-wb-action="subscribe"]');
    if (subLink) {
      subLink.addEventListener("click", function (e) {
        e.preventDefault();
        showSubscriptionWall("WB Plus", function () {
          patchState({ subscribed: true });
          bootW4();
        }, function () {});
      });
    }
    startClockTicker();
  }

  // ============================================================
  // W5 SHELL — PS5-style with Games / Media tabs
  // Light/grey background with subtle gradient. Top tab row:
  // Games | Media. Smaller square tiles in a horizontal row
  // at the top, news/featured cards below. Search/Settings/
  // Profile/Clock in the top-right. Account-bound.
  // ============================================================
  function bootW5() {
    teardownAll();
    var root = makeRoot();
    var st = loadState() || {};
    var games = gamesFor("w5");
    var subscribed = !!st.subscribed;
    var account = st.account || "jucator";

    // Region restriction: 1 of the games is regionally
    // restricted (Romania not whitelisted). Mark it visually
    // and intercept its launch.
    var regionRestrictedIds = ["galaxy"];

    root.innerHTML =
      '<div class="wb5-shell wb-shell">' +
      '<div class="wb5-topbar">' +
      '<div class="wb5-tabs">' +
      '<span class="wb5-tab wb5-tab-active">Jocuri</span>' +
      '<span class="wb5-tab wb5-tab-disabled">Media</span>' +
      "</div>" +
      '<div class="wb5-top-right">' +
      '<span class="wb5-icon" aria-hidden="true" title="Căutare">⌕</span>' +
      '<span class="wb5-icon" data-wb5-action="settings" title="Setări">⚙</span>' +
      '<span class="wb5-profile" title="' + account + '"><span class="wb5-avatar">' + account.charAt(0).toUpperCase() + "</span></span>" +
      '<span class="wb5-clock" id="wbClock">' + formatClock(new Date()) + "</span>" +
      "</div>" +
      "</div>" +
      '<div class="wb5-content">' +
      '<div class="wb5-tile-row">' +
      '<div class="wb5-tile wb5-tile-system" data-wb5-sys="menu" tabindex="0">' +
      '<div class="wb5-tile-art wb5-art-system">' +
      '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><rect width="100" height="100" fill="#404040"/><path d="M50 24 L50 76 M24 50 L76 50" stroke="#e0e0e0" stroke-width="3"/><circle cx="50" cy="50" r="20" fill="none" stroke="#e0e0e0" stroke-width="2"/></svg>' +
      "</div>" +
      "</div>" +
      games.map(function (g) {
        var locked = regionRestrictedIds.indexOf(g.id) >= 0;
        return (
          '<div class="wb5-tile' + (locked ? " wb5-tile-locked" : "") +
          '" data-wb-game="' + g.id + '" tabindex="0">' +
          '<div class="wb5-tile-art">' + tileArt(g.art) +
          (locked ? '<div class="wb5-region-lock" title="Restricție regională">🌐</div>' : "") +
          "</div>" +
          "</div>"
        );
      }).join("") +
      "</div>" +
      '<div class="wb5-active-meta" id="wb5Meta">' +
      '<div class="wb5-active-tag">SISTEM</div>' +
      '<div class="wb5-active-title">Setări sistem</div>' +
      '<div class="wb5-active-sub">Cont, abonament, despre, oprire.</div>' +
      "</div>" +
      "</div>" +
      "</div>";

    var tiles = root.querySelectorAll("[data-wb-game], [data-wb5-sys]");
    function setActiveMeta(el) {
      var meta = root.querySelector("#wb5Meta");
      if (!meta) return;
      if (el.hasAttribute("data-wb5-sys")) {
        meta.querySelector(".wb5-active-tag").textContent = "SISTEM";
        meta.querySelector(".wb5-active-title").textContent = "Setări sistem";
        meta.querySelector(".wb5-active-sub").textContent = "Cont, abonament, despre, oprire.";
      } else {
        var gid = el.getAttribute("data-wb-game");
        var g = games.find(function (x) { return x.id === gid; });
        if (g) {
          meta.querySelector(".wb5-active-tag").textContent = g.sub.toUpperCase();
          meta.querySelector(".wb5-active-title").textContent = g.title;
          meta.querySelector(".wb5-active-sub").textContent = regionRestrictedIds.indexOf(g.id) >= 0
            ? "Acest titlu nu este disponibil în regiunea dumneavoastră."
            : g.sub;
        }
      }
      tiles.forEach(function (t) { t.classList.remove("wb5-tile-active"); });
      el.classList.add("wb5-tile-active");
    }
    if (tiles[0]) setActiveMeta(tiles[0]);
    tiles.forEach(function (t) {
      t.addEventListener("mouseenter", function () { setActiveMeta(t); });
      t.addEventListener("focus", function () { setActiveMeta(t); });
      t.addEventListener("click", function () {
        if (t.hasAttribute("data-wb5-sys")) {
          openSystemMenu("w5");
        } else {
          var gid = t.getAttribute("data-wb-game");
          if (regionRestrictedIds.indexOf(gid) >= 0) {
            return showRegionLock(gid);
          }
          launchGameWithFriction("w5", gid);
        }
      });
    });

    // Mandatory firmware update prompt on boot. Polite the
    // first time, blocks multiplayer the second time.
    if (!st.fwUpdateBlocked) {
      setTimeout(function () { showFirmwareUpdatePrompt(); }, 600);
    }
    startClockTicker();
  }

  // Settings menu invoked from system tile or W3 menu.
  function openSystemMenu(variant) {
    var bd = document.createElement("div");
    bd.className = "wb-menu-bd";
    bd.innerHTML =
      '<div class="wb-menu">' +
      '<div class="wb-menu-title">Sistem</div>' +
      '<div class="wb-menu-list">' +
      '<button class="wb-menu-item" data-wb-sys="about">Despre acest sistem</button>' +
      '<button class="wb-menu-item" data-wb-sys="install">Instalează alt sistem</button>' +
      (variant === "w4" || variant === "w5"
        ? '<button class="wb-menu-item" data-wb-sys="subscription">Stare abonament WB Plus</button>'
        : "") +
      '<button class="wb-menu-item" data-wb-sys="power">Oprire sistem</button>' +
      '<button class="wb-menu-item wb-menu-item-cancel" data-wb-sys="cancel">Anulează</button>' +
      "</div>" +
      "</div>";
    document.body.appendChild(bd);
    bd.addEventListener("click", function (e) {
      if (e.target === bd) bd.remove();
    });
    bd.querySelectorAll("[data-wb-sys]").forEach(function (b) {
      b.addEventListener("click", function () {
        var act = b.getAttribute("data-wb-sys");
        bd.remove();
        if (act === "about") showAbout(variant);
        else if (act === "install") showInstallOther(variant);
        else if (act === "subscription") showSubscriptionStatus(variant);
        else if (act === "power") confirmPowerOff(variant);
      });
    });
  }

  function wireSystemMenu(root, variant) {
    root.querySelectorAll("[data-wb3]").forEach(function (b) {
      b.addEventListener("click", function () {
        var act = b.getAttribute("data-wb3");
        if (act === "about") showAbout(variant);
        else if (act === "install") showInstallOther(variant);
        else if (act === "power") confirmPowerOff(variant);
      });
    });
  }
  function wireGameTiles(root, variant, games) {
    root.querySelectorAll("[data-wb-game]").forEach(function (el) {
      el.addEventListener("click", function () {
        var gid = el.getAttribute("data-wb-game");
        launchGameWithFriction(variant, gid);
      });
    });
  }

  // ============================================================
  // GAME LAUNCH WITH FRICTION
  // Routes through W4/W5 friction layers: disc check for
  // every game launch, subscription check for online play.
  // W3 launches direct.
  // ============================================================
  function launchGameWithFriction(variant, gameId) {
    var g = GAMES.find(function (x) { return x.id === gameId; });
    if (!g) return;
    // Find launcher
    function fire() {
      if (g.launcher === "snake") return launchSnake(variant);
      if (g.launcher === "pong") return launchPong(variant);
      if (g.launcher === "tank") return launchTankBattle(variant);
      if (g.launcher === "racer") return launchRacer(variant);
      if (g.launcher === "strategy") return launchStrategy(variant);
      if (g.launcher === "rpg") return launchRpg(variant);
      if (g.launcher === "lemur") return launchLemur(variant);
      if (g.launcher === "puzzle") return launchPuzzle(variant);
      return launchStub(g, variant);
    }
    if (variant === "w3") return fire();
    // For W4 and W5: every launch requires disc; online
    // mode additionally requires subscription. The disc
    // check comes first (matches platform behavior).
    function afterDisc() {
      if (g.mode === "online") {
        var st = loadState() || {};
        if (!st.subscribed) {
          showSubscriptionWall(g.title, function () {
            patchState({ subscribed: true });
            fire();
          }, function () {});
          return;
        }
      }
      fire();
    }
    showDiscCheck(g.title, afterDisc, function () {});
  }

  // ============================================================
  // ABOUT SECTION
  // Each variant has its own About page with technical details
  // AND a satirical commentary block. The commentary anchors
  // the satire's third pillar: at school = curriculum lock,
  // at home = console lock, ICE decides whether your
  // purchase keeps working.
  // ============================================================
  function showAbout(variant) {
    var bd = document.createElement("div");
    bd.className = "wb-about-bd";
    var content;
    if (variant === "w3") {
      content =
        '<div class="wb-about-section">' +
        '<div class="wb-about-section-title">Specificații</div>' +
        '<table class="wb-about-table">' +
        '<tr><td>Model</td><td>Waterboard 3 SCPH-50004</td></tr>' +
        '<tr><td>CPU</td><td>Emotion Engine @ 294 MHz (emulat pe VIA C7)</td></tr>' +
        '<tr><td>GPU</td><td>Graphics Synthesizer (emulat)</td></tr>' +
        '<tr><td>Memorie</td><td>32 MB RDRAM (emulat în 256 MB DDR1)</td></tr>' +
        '<tr><td>Stocare</td><td>240 MB pe partiția /storage</td></tr>' +
        '<tr><td>Versiune</td><td>WB3-2.4.0 (2024)</td></tr>' +
        '<tr><td>Producător</td><td>ICE Legacy Series</td></tr>' +
        '<tr><td>Cont necesar</td><td>NU</td></tr>' +
        '<tr><td>Verificare disc</td><td>NU</td></tr>' +
        '<tr><td>Abonament</td><td>NU</td></tr>' +
        '<tr><td>Restricții regionale</td><td>NU</td></tr>' +
        "</table>" +
        "</div>" +
        '<div class="wb-about-section">' +
        '<div class="wb-about-section-title">Despre satira</div>' +
        '<p>Waterboard 3 este forma pe care platformele de jocuri o aveau înainte ca producătorii consolelor să-și revadă politicile de licențiere. Cumpărați un joc, îl porniți, îl jucați. Discul fizic funcționează ca licență. Niciun cont, niciun abonament, niciun server între voi și jocul vostru.</p>' +
        '<p>Satira proiectului are trei părți. La școală, programa analitică hotărăște ce limbaje și ce instrumente puteți folosi. Acasă, când deschideți consola, producătorul ei hotărăște dacă jocul pe care l-ați cumpărat astăzi va mai porni mâine. Waterboard 3 este referința pentru cum nu trebuia să se ajungă, dar s-a ajuns: pe Waterboard 4 și 5 producătorul consolei se interpune între voi și conținutul plătit.</p>' +
        "</div>";
    } else if (variant === "w4") {
      content =
        '<div class="wb-about-section">' +
        '<div class="wb-about-section-title">Specificații</div>' +
        '<table class="wb-about-table">' +
        '<tr><td>Model</td><td>Waterboard 4 CUH-2216</td></tr>' +
        '<tr><td>CPU</td><td>Jaguar 8-core @ 1.6 GHz (emulat)</td></tr>' +
        '<tr><td>GPU</td><td>Liverpool 1.84 TFLOPS (emulat)</td></tr>' +
        '<tr><td>Memorie</td><td>8 GB GDDR5 (emulat în 256 MB DDR1)</td></tr>' +
        '<tr><td>Stocare</td><td>500 GB / 240 MB pe partiția /storage</td></tr>' +
        '<tr><td>Versiune</td><td>WB4-9.51.0 (2024)</td></tr>' +
        '<tr><td>Producător</td><td>Intercal Computer Entertainment</td></tr>' +
        '<tr><td>Cont necesar</td><td>Recomandat</td></tr>' +
        '<tr><td>Verificare disc</td><td>DA, la fiecare lansare</td></tr>' +
        '<tr><td>Abonament</td><td>WB Plus pentru multiplayer online</td></tr>' +
        '<tr><td>Restricții regionale</td><td>Pentru unele titluri</td></tr>' +
        "</table>" +
        "</div>" +
        '<div class="wb-about-section">' +
        '<div class="wb-about-section-title">Despre satira</div>' +
        '<p>Waterboard 4 reproduce comportamentul real al platformelor moderne de jocuri. Cumpărați un joc, îl instalați complet, dar la fiecare lansare consola cere discul fizic în unitate ca să confirme că aveți licența. Pierdeți discul pentru un titlu plătit și instalat: nu mai puteți juca, deși tehnic ar funcționa.</p>' +
        '<p>Multiplayer-ul online este blocat în spatele unui abonament WB Plus, separat de prețul jocului. Pentru titluri cross-platform în care studio-ul a vândut același multiplayer și pe PC fără cost suplimentar, plătiți un al doilea acces: către producătorul consolei, pentru dreptul de a vă conecta la matchmaking.</p>' +
        '<p>Satira proiectului are trei părți. La școală programa decide ce puteți învăța. Acasă consola decide cu ce condiții puteți juca ce ați cumpărat. Producătorul ei se interpune între voi și conținutul plătit, și își rezervă dreptul de a schimba condițiile când vrea.</p>' +
        "</div>";
    } else {
      content =
        '<div class="wb-about-section">' +
        '<div class="wb-about-section-title">Specificații</div>' +
        '<table class="wb-about-table">' +
        '<tr><td>Model</td><td>Waterboard 5 CFI-2016</td></tr>' +
        '<tr><td>CPU</td><td>Zen 2 8-core @ 3.5 GHz (emulat)</td></tr>' +
        '<tr><td>GPU</td><td>RDNA 2 10.28 TFLOPS (emulat)</td></tr>' +
        '<tr><td>Memorie</td><td>16 GB GDDR6 (emulat în 256 MB DDR1)</td></tr>' +
        '<tr><td>Stocare</td><td>825 GB SSD / 240 MB pe partiția /storage</td></tr>' +
        '<tr><td>Versiune</td><td>WB5-3.10 (2024)</td></tr>' +
        '<tr><td>Producător</td><td>Intercal Computer Entertainment</td></tr>' +
        '<tr><td>Cont necesar</td><td>OBLIGATORIU</td></tr>' +
        '<tr><td>Verificare disc</td><td>DA, la fiecare lansare</td></tr>' +
        '<tr><td>Abonament</td><td>WB Plus pentru multiplayer și cloud-saves</td></tr>' +
        '<tr><td>Restricții regionale</td><td>132 țări blocate la lansare</td></tr>' +
        '<tr><td>Actualizări forțate</td><td>DA, ocazional ce elimină funcții</td></tr>' +
        "</table>" +
        "</div>" +
        '<div class="wb-about-section">' +
        '<div class="wb-about-section-title">Despre satira</div>' +
        '<p>Waterboard 5 reprezintă forma ideală a unei console moderne din perspectiva producătorului ei. Tot ce făcea Waterboard 4 (verificare disc, abonament pentru multiplayer), plus: cont obligatoriu de la prima pornire, restricții regionale care vă pot bloca jocuri pe care le-ați plătit dacă vă mutați în țara nepotrivită, actualizări forțate de firmware care ocazional elimină funcții pentru care ați cumpărat consola, și posibilitatea ca jocurile din biblioteca dumneavoastră personală să fie șterse când expiră contractul de licențiere între producător și studio.</p>' +
        '<p>Satira proiectului are trei părți. La școală, programa decide ce limbaje aveți voie să folosiți. Acasă, când vreți să vă jucați, producătorul consolei decide dacă jocul pe care l-ați cumpărat astăzi va mai porni mâine, dacă veți avea acces la el din regiunea în care ați călătorit, dacă serverele vor fi încă pornite peste cinci ani, și dacă funcția pentru care ați cumpărat consola va supraviețui următoarei actualizări obligatorii. Singurul element comun între cele două: cineva între voi și ceea ce ați plătit.</p>' +
        "</div>";
    }
    bd.innerHTML =
      '<div class="wb-about">' +
      '<div class="wb-about-header">' +
      '<div class="wb-about-title">Despre ' + variantName(variant) + "</div>" +
      '<button class="wb-about-close" data-close-about>X</button>' +
      "</div>" +
      '<div class="wb-about-body">' + content + "</div>" +
      "</div>";
    document.body.appendChild(bd);
    bd.addEventListener("click", function (e) {
      if (e.target === bd) bd.remove();
    });
    bd.querySelector("[data-close-about]").addEventListener("click", function () {
      bd.remove();
    });
  }

  // ============================================================
  // INSTALL OTHER OS — gated on W4/W5 by BIOS lock
  // ============================================================
  function showInstallOther(variant) {
    if (variant === "w3") {
      // W3 doesn't burn the NVRAM fuse; user can switch freely
      // by simply clearing the variant and returning to the
      // picker. No coreboot reflash is needed because nothing
      // hardware-level was changed at install.
      resetState();
      showConsolePicker();
      return;
    }
    var brick = getBrick();
    var bd = document.createElement("div");
    bd.className = "wb-friction-bd";
    bd.innerHTML =
      '<div class="wb-friction">' +
      '<div class="wb-friction-title">BIOS blocat prin variabilă NVRAM permanentă</div>' +
      '<div class="wb-friction-body">' +
      "<p>" + variantName(variant) + ' a inscripționat la prima pornire o variabilă NVRAM <code>WB_FUSE_GEN=' + (brick || variant).toUpperCase() + '</code> și a închis fizic pagina 0x12 (anti-rollback). Aceste protecții <strong>nu pot fi ștearse</strong>, nici prin reflashare coreboot, nici prin reset BIOS, nici prin scoaterea bateriei CMOS.</p>' +
      "<p>Reflashing-ul coreboot este în continuare disponibil și va aduce înapoi selectorul de BIOS, dar generațiile anterioare " + (brick || variant).toUpperCase() + " rămân indisponibile permanent: fusul a fost ars la nivel de hardware.</p>" +
      "</div>" +
      '<div class="wb-friction-actions">' +
      '<button class="wb-btn wb-btn-primary" data-wb-install="reflash">Reflash coreboot</button>' +
      '<button class="wb-btn" data-wb-install="cancel">Anulează</button>' +
      "</div>" +
      "</div>";
    document.body.appendChild(bd);
    bd.querySelectorAll("[data-wb-install]").forEach(function (b) {
      b.addEventListener("click", function () {
        var act = b.getAttribute("data-wb-install");
        bd.remove();
        if (act === "reflash") {
          // Clear the waterboard variant only. We keep the
          // coreboot-flashed flag AND the NVRAM brick fuse: the
          // user returns to the BIOS selector in the post-flash
          // environment, not to Windows Server 2003. The brick
          // fuse will continue to lock out older generations
          // when the picker re-renders.
          resetState();
          showConsolePicker();
        }
      });
    });
  }

  // ============================================================
  // POWER OFF
  // Console safe-off-style screen with Power On + (W4/W5 only)
  // Reset BIOS option. Looks like the BIOS-style picker but
  // plainer, since the appliance is genuinely powered down.
  // ============================================================
  function confirmPowerOff(variant) {
    var bd = document.createElement("div");
    bd.className = "wb-friction-bd";
    bd.innerHTML =
      '<div class="wb-friction wb-friction-compact">' +
      '<div class="wb-friction-title">Oprire</div>' +
      '<div class="wb-friction-body">' +
      "<p>Doriți să opriți " + variantName(variant) + "? Sesiunea de joc curentă se va închide.</p>" +
      "</div>" +
      '<div class="wb-friction-actions">' +
      '<button class="wb-btn wb-btn-primary" data-wb-pwr="yes">Oprește</button>' +
      '<button class="wb-btn" data-wb-pwr="no">Anulează</button>' +
      "</div>" +
      "</div>";
    document.body.appendChild(bd);
    bd.querySelectorAll("[data-wb-pwr]").forEach(function (b) {
      b.addEventListener("click", function () {
        var act = b.getAttribute("data-wb-pwr");
        bd.remove();
        if (act === "yes") {
          patchState({ poweredOff: true });
          renderPowerOff(variant);
        }
      });
    });
  }

  function renderPowerOff(variant) {
    teardownAll();
    var root = makeRoot();
    root.innerHTML =
      '<div class="wbp">' +
      '<div class="wbp-titlebar">GDX-APPLIANCE-A04 / OPRIT</div>' +
      '<div class="wbp-inner wb-poff">' +
      '<pre class="wbp-banner">' +
      "Aparatul este oprit. Sistemul de operare " + variantName(variant) + " nu rulează.\n" +
      "Apăsați Power On pentru a relansa sistemul." +
      "</pre>" +
      '<div class="wb-poff-actions">' +
      '<button class="wbp-btn wbp-btn-default" id="wbPoffOn">Power On</button>' +
      (variant === "w4" || variant === "w5"
        ? '<button class="wbp-btn" id="wbPoffReset">Reflash coreboot</button>'
        : "") +
      "</div>" +
      "</div>" +
      "</div>";
    document.getElementById("wbPoffOn").addEventListener("click", function () {
      patchState({ poweredOff: false });
      bootWaterboard(variant);
    });
    var rs = document.getElementById("wbPoffReset");
    if (rs) {
      rs.addEventListener("click", function () {
        if (confirm(
          "Această procedură va șterge contul, abonamentele și starea de instalare a jocurilor, " +
          "apoi va relansa selectorul de BIOS. Variabila NVRAM (fuse) nu va fi ștearsă: generațiile anterioare " +
          "rămân indisponibile. Continuați?"
        )) {
          // Wipe variant only. Keep coreboot.v1 (we stay in
          // the post-flash environment) and keep the NVRAM
          // brick fuse (it cannot be undone).
          resetState();
          showConsolePicker();
        }
      });
    }
  }

  // ============================================================
  // SUBSCRIPTION STATUS (W4/W5)
  // ============================================================
  function showSubscriptionStatus(variant) {
    var st = loadState() || {};
    var sub = !!st.subscribed;
    var bd = document.createElement("div");
    bd.className = "wb-friction-bd";
    bd.innerHTML =
      '<div class="wb-friction">' +
      '<div class="wb-friction-title">Stare abonament WB Plus</div>' +
      '<div class="wb-friction-body">' +
      (sub
        ? "<p>Abonamentul WB Plus este <strong>activ</strong>. Multiplayer-ul online este disponibil pentru toate jocurile compatibile.</p><p>Reînnoire automată la fiecare 12 luni.</p>"
        : "<p>Abonamentul WB Plus este <strong>inactiv</strong>. Multiplayer-ul online nu este disponibil. Activați un nivel pentru a juca cu alți utilizatori.</p>") +
      "</div>" +
      '<div class="wb-friction-actions">' +
      (sub
        ? '<button class="wb-btn" data-wb-substatus="cancel">Anulează abonamentul</button>'
        : '<button class="wb-btn wb-btn-primary" data-wb-substatus="activate">Activează</button>') +
      '<button class="wb-btn" data-wb-substatus="close">Închide</button>' +
      "</div>" +
      "</div>";
    document.body.appendChild(bd);
    bd.querySelectorAll("[data-wb-substatus]").forEach(function (b) {
      b.addEventListener("click", function () {
        var act = b.getAttribute("data-wb-substatus");
        bd.remove();
        if (act === "activate") {
          showSubscriptionWall("WB Plus", function () {
            patchState({ subscribed: true });
            bootWaterboard(variant);
          }, function () {});
        } else if (act === "cancel") {
          patchState({ subscribed: false });
          bootWaterboard(variant);
        }
      });
    });
  }

  // ============================================================
  // FIRMWARE UPDATE PROMPT (W5 only)
  // Polite first time, blocks multiplayer after dismiss.
  // Models PS3 OtherOS removal: feature is removed when you
  // update; refusing the update locks you out of multiplayer.
  // ============================================================
  function showFirmwareUpdatePrompt() {
    var bd = document.createElement("div");
    bd.className = "wb-friction-bd";
    bd.innerHTML =
      '<div class="wb-friction">' +
      '<div class="wb-friction-title">Actualizare de firmware disponibilă</div>' +
      '<div class="wb-friction-body">' +
      "<p>Versiunea WB5-3.11 este disponibilă (2.4 GB).</p>" +
      "<p>Această actualizare aduce îmbunătățiri de securitate și elimină subsistemul de boot pentru sisteme alternative (OtherOS), invocat de o minoritate a utilizatorilor pentru cercetări în afara cazurilor de utilizare aprobate. Funcția va fi eliminată ireversibil la prima pornire după actualizare.</p>" +
      "<p>Refuzul actualizării va bloca conectarea la serverele multiplayer și la magazinul ICE.</p>" +
      "</div>" +
      '<div class="wb-friction-actions">' +
      '<button class="wb-btn wb-btn-primary" data-wb-fw="install">Instalează acum</button>' +
      '<button class="wb-btn" data-wb-fw="defer">Mai târziu</button>' +
      "</div>" +
      "</div>";
    document.body.appendChild(bd);
    bd.querySelectorAll("[data-wb-fw]").forEach(function (b) {
      b.addEventListener("click", function () {
        var act = b.getAttribute("data-wb-fw");
        bd.remove();
        if (act === "defer") {
          patchState({ fwUpdateBlocked: true });
        }
      });
    });
  }

  // ============================================================
  // FRICTION DIALOGS (subtle)
  // No screaming colors, no gold-glow. Just clear modal cards
  // matching the variant's chrome.
  // ============================================================
  function showDiscCheck(gameName, onProceed, onCancel) {
    var bd = document.createElement("div");
    bd.className = "wb-friction-bd";
    bd.innerHTML =
      '<div class="wb-friction">' +
      '<div class="wb-friction-title">Introduceți discul jocului</div>' +
      '<div class="wb-friction-body">' +
      "<p><strong>" + gameName + "</strong> este complet instalat pe acest aparat (5,4 GB pe stocarea internă), însă pentru a-l porni este necesar discul fizic în unitatea optică.</p>" +
      "<p>Verificarea rulează la fiecare lansare, indiferent dacă jocul este sau nu instalat local.</p>" +
      "</div>" +
      '<div class="wb-friction-actions">' +
      '<button class="wb-btn wb-btn-primary" data-wb-disc="ok">Discul este în unitate</button>' +
      '<button class="wb-btn" data-wb-disc="lost">Am pierdut discul</button>' +
      '<button class="wb-btn" data-wb-disc="cancel">Anulează</button>' +
      "</div>" +
      "</div>";
    document.body.appendChild(bd);
    bd.querySelectorAll("[data-wb-disc]").forEach(function (b) {
      b.addEventListener("click", function () {
        var ch = b.getAttribute("data-wb-disc");
        if (ch === "ok") { bd.remove(); onProceed(); }
        else if (ch === "lost") { showLostDiscNag(gameName, function () { bd.remove(); onCancel(); }); }
        else { bd.remove(); onCancel(); }
      });
    });
  }
  function showLostDiscNag(gameName, onClose) {
    var bd = document.createElement("div");
    bd.className = "wb-friction-bd";
    bd.innerHTML =
      '<div class="wb-friction">' +
      '<div class="wb-friction-title">Disc indisponibil</div>' +
      '<div class="wb-friction-body">' +
      "<p>Ne pare rău că ați pierdut discul pentru <strong>" + gameName + "</strong>.</p>" +
      "<p>Pentru a-l reporni, alegeți una dintre următoarele:</p>" +
      "<ul>" +
      "<li>Cumpărați din nou jocul, în ediție digitală: <strong>329 RON</strong> (cont ICE necesar)</li>" +
      "<li>Cumpărați un disc nou de la un comerciant autorizat (de la ~115 RON pentru titluri vechi, ~330 RON pentru lansări noi).</li>" +
      "<li>Contactați ICE Customer Support pentru proceduri de „proof of purchase\" (răspuns 7-14 zile lucrătoare, fără garanție de soluționare).</li>" +
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

  function showSubscriptionWall(gameName, onSubscribe, onCancel) {
    var bd = document.createElement("div");
    bd.className = "wb-friction-bd";
    bd.innerHTML =
      '<div class="wb-friction">' +
      '<div class="wb-friction-title">WB Plus este necesar</div>' +
      '<div class="wb-friction-body">' +
      "<p>Pentru a juca <strong>" + gameName + "</strong> în modul multiplayer online, contul ICE trebuie să aibă un abonament <strong>WB Plus</strong> activ.</p>" +
      "<p>Cerința se aplică inclusiv pentru jocurile <em>cross-platform</em> unde jucătorii de pe PC se conectează la același multiplayer fără cost suplimentar către producătorul consolei. Logica este: ați plătit jocul către studio, dar separat trebuie să-i plătiți și ICE pentru dreptul de a vă conecta la matchmaking.</p>" +
      '<div class="wb-sub-tiers">' +
      "<div class=\"wb-sub-tier\"><strong>WB Plus Essential</strong><br>275 RON pe an</div>" +
      "<div class=\"wb-sub-tier\"><strong>WB Plus Extra</strong><br>460 RON pe an</div>" +
      "<div class=\"wb-sub-tier\"><strong>WB Plus Premium</strong><br>595 RON pe an</div>" +
      "</div>" +
      "</div>" +
      '<div class="wb-friction-actions">' +
      '<button class="wb-btn wb-btn-primary" data-wb-sub="yes">Activează Essential</button>' +
      '<button class="wb-btn" data-wb-sub="paid">Eu am plătit deja studio-ul</button>' +
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
            '<div class="wb-friction">' +
            '<div class="wb-friction-title">Mulțumim pentru observație</div>' +
            '<div class="wb-friction-body">' +
            "<p>Faptul că ați plătit deja studio-ul este corect documentat. Politica ICE rămâne neschimbată: serverele multiplayer ale jocurilor terțe sunt accesibile doar cu abonament WB Plus activ, indiferent de modul în care a fost licențiat jocul în sine.</p>" +
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

  function showRegionLock(gameName) {
    var bd = document.createElement("div");
    bd.className = "wb-friction-bd";
    bd.innerHTML =
      '<div class="wb-friction">' +
      '<div class="wb-friction-title">Titlu indisponibil în regiunea dumneavoastră</div>' +
      '<div class="wb-friction-body">' +
      "<p>Acest titlu nu este disponibil pentru achiziție sau lansare în România. Restricția este pusă de producătorul consolei (ICE), nu de studio-ul care a făcut jocul.</p>" +
      "<p>Aceleași titluri sunt disponibile fără restricții pe versiunea de PC a aceleași jocuri, distribuite tot de același studio. Restricția se aplică numai utilizatorilor de Waterboard 5.</p>" +
      "</div>" +
      '<div class="wb-friction-actions">' +
      '<button class="wb-btn" data-wb-region="close">Înțeleg</button>' +
      "</div>" +
      "</div>";
    document.body.appendChild(bd);
    bd.querySelector('[data-wb-region="close"]').addEventListener("click", function () {
      bd.remove();
    });
  }

  // ============================================================
  // GAMES
  // ============================================================

  function makeGameRoot(title) {
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

  function launchSnake(variant) {
    var bd = makeGameRoot("Serpentine 64");
    var area = bd.querySelector("#wbGameArea");
    var hint = bd.querySelector("#wbGameHint");
    hint.textContent = "Săgețile sau WASD schimbă direcția. Esc închide. Mâncați mărul roșu, evitați pereții și propriul corp.";
    var W = 24, H = 16, cell = 18;
    var canvas = document.createElement("canvas");
    canvas.width = W * cell; canvas.height = H * cell;
    canvas.tabIndex = 0; canvas.style.outline = "none"; canvas.className = "wb-canvas";
    area.appendChild(canvas); canvas.focus();
    var ctx = canvas.getContext("2d");
    var snake = [{ x: 10, y: 8 }, { x: 9, y: 8 }, { x: 8, y: 8 }];
    var dir = { x: 1, y: 0 }, pendingDir = dir;
    var food = placeFood(); var score = 0; var alive = true; var tickMs = 110;
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
      if (head.x < 0 || head.x >= W || head.y < 0 || head.y >= H) return die();
      for (var i = 0; i < snake.length; i++) {
        if (snake[i].x === head.x && snake[i].y === head.y) return die();
      }
      snake.unshift(head);
      if (head.x === food.x && head.y === food.y) {
        score += 10; food = placeFood();
        if (tickMs > 50) tickMs -= 2;
      } else snake.pop();
      draw();
    }
    function die() {
      alive = false;
      ctx.fillStyle = "rgba(0,0,0,0.75)"; ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#ffd34d";
      ctx.font = "bold 28px 'Lucida Console', monospace"; ctx.textAlign = "center";
      ctx.fillText("GAME OVER", canvas.width / 2, canvas.height / 2 - 10);
      ctx.fillStyle = "#ffffff"; ctx.font = "16px 'Lucida Console', monospace";
      ctx.fillText("Scor final: " + score, canvas.width / 2, canvas.height / 2 + 20);
      ctx.fillText("Apăsați R pentru o partidă nouă.", canvas.width / 2, canvas.height / 2 + 44);
    }
    function draw() {
      ctx.fillStyle = "#0a1a0a"; ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = "#1a3a1a"; ctx.lineWidth = 1;
      for (var x = 0; x <= W; x++) { ctx.beginPath(); ctx.moveTo(x * cell, 0); ctx.lineTo(x * cell, canvas.height); ctx.stroke(); }
      for (var y = 0; y <= H; y++) { ctx.beginPath(); ctx.moveTo(0, y * cell); ctx.lineTo(canvas.width, y * cell); ctx.stroke(); }
      ctx.fillStyle = "#df4040"; ctx.fillRect(food.x * cell + 2, food.y * cell + 2, cell - 4, cell - 4);
      for (var i = 0; i < snake.length; i++) {
        ctx.fillStyle = i === 0 ? "#a0ff80" : "#80df80";
        ctx.fillRect(snake[i].x * cell + 1, snake[i].y * cell + 1, cell - 2, cell - 2);
      }
      ctx.fillStyle = "#ffffff"; ctx.font = "bold 12px 'Lucida Console', monospace"; ctx.textAlign = "left";
      ctx.fillText("Scor: " + score, 6, 14);
    }
    function reset() {
      snake = [{ x: 10, y: 8 }, { x: 9, y: 8 }, { x: 8, y: 8 }];
      dir = { x: 1, y: 0 }; pendingDir = dir; food = placeFood(); score = 0; tickMs = 110; alive = true; draw();
    }
    function onKey(e) {
      var k = e.key;
      if (k === "Escape") { bd.remove(); cleanup(); return; }
      if (k === "r" || k === "R") { reset(); return; }
      var nd = null;
      if (k === "ArrowUp" || k === "w" || k === "W") nd = { x: 0, y: -1 };
      else if (k === "ArrowDown" || k === "s" || k === "S") nd = { x: 0, y: 1 };
      else if (k === "ArrowLeft" || k === "a" || k === "A") nd = { x: -1, y: 0 };
      else if (k === "ArrowRight" || k === "d" || k === "D") nd = { x: 1, y: 0 };
      if (nd) { if (nd.x !== -dir.x || nd.y !== -dir.y) pendingDir = nd; e.preventDefault(); }
    }
    var stepTimer = setInterval(function () {
      if (!document.body.contains(bd)) { cleanup(); return; }
      step();
    }, tickMs);
    function cleanup() { clearInterval(stepTimer); window.removeEventListener("keydown", onKey, true); }
    window.addEventListener("keydown", onKey, true);
    draw();
  }

  function launchPong(variant) {
    var bd = makeGameRoot("Pong vs CPU");
    var area = bd.querySelector("#wbGameArea");
    var hint = bd.querySelector("#wbGameHint");
    hint.textContent = "Săgeți Sus / Jos (sau W / S) pentru paleta voastră, în stânga. Esc închide. Primul la 5 puncte câștigă.";
    var canvas = document.createElement("canvas");
    canvas.width = 560; canvas.height = 360;
    canvas.tabIndex = 0; canvas.style.outline = "none"; canvas.className = "wb-canvas";
    area.appendChild(canvas); canvas.focus();
    var ctx = canvas.getContext("2d");
    var pH = 60, pW = 8;
    var p1 = { x: 12, y: canvas.height / 2 - pH / 2, dy: 0 };
    var p2 = { x: canvas.width - 20, y: canvas.height / 2 - pH / 2, dy: 0 };
    var ball, sp1 = 0, sp2 = 0;
    function reset(serveLeft) {
      ball = { x: canvas.width / 2, y: canvas.height / 2, vx: serveLeft ? -3.5 : 3.5, vy: (Math.random() - 0.5) * 4 };
    }
    reset(true);
    var keys = {};
    function onKey(e) {
      if (e.type === "keydown") {
        if (e.key === "Escape") { bd.remove(); cleanup(); return; }
        keys[e.key] = true;
      } else { keys[e.key] = false; }
      if (["ArrowUp", "ArrowDown", "w", "W", "s", "S"].indexOf(e.key) >= 0) e.preventDefault();
    }
    window.addEventListener("keydown", onKey, true);
    window.addEventListener("keyup", onKey, true);
    function frame() {
      if (!document.body.contains(bd)) { cleanup(); return; }
      var spd = 5;
      if (keys.ArrowUp || keys.w || keys.W) p1.y -= spd;
      if (keys.ArrowDown || keys.s || keys.S) p1.y += spd;
      if (p1.y < 0) p1.y = 0;
      if (p1.y > canvas.height - pH) p1.y = canvas.height - pH;
      var center = p2.y + pH / 2;
      if (ball.y < center - 8) p2.y -= 3.6;
      else if (ball.y > center + 8) p2.y += 3.6;
      if (p2.y < 0) p2.y = 0;
      if (p2.y > canvas.height - pH) p2.y = canvas.height - pH;
      ball.x += ball.vx; ball.y += ball.vy;
      if (ball.y < 0) { ball.y = 0; ball.vy *= -1; }
      if (ball.y > canvas.height) { ball.y = canvas.height; ball.vy *= -1; }
      if (ball.x - 3 <= p1.x + pW && ball.y > p1.y && ball.y < p1.y + pH && ball.vx < 0) {
        ball.vx *= -1.05; ball.vy += (ball.y - (p1.y + pH / 2)) * 0.08;
      }
      if (ball.x + 3 >= p2.x && ball.y > p2.y && ball.y < p2.y + pH && ball.vx > 0) {
        ball.vx *= -1.05; ball.vy += (ball.y - (p2.y + pH / 2)) * 0.08;
      }
      if (ball.x < 0) { sp2 += 1; reset(false); }
      else if (ball.x > canvas.width) { sp1 += 1; reset(true); }
      var winner = sp1 >= 5 ? "JUCATOR" : sp2 >= 5 ? "CPU" : null;
      ctx.fillStyle = "#000000"; ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = "#ffffff"; ctx.setLineDash([4, 6]);
      ctx.beginPath(); ctx.moveTo(canvas.width / 2, 0); ctx.lineTo(canvas.width / 2, canvas.height); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(p1.x, p1.y, pW, pH); ctx.fillRect(p2.x, p2.y, pW, pH);
      ctx.fillRect(ball.x - 3, ball.y - 3, 6, 6);
      ctx.font = "bold 28px 'Lucida Console', monospace"; ctx.textAlign = "center";
      ctx.fillText(sp1 + "    " + sp2, canvas.width / 2, 36);
      if (winner) {
        ctx.fillStyle = "rgba(0,0,0,0.7)"; ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "#ffd34d"; ctx.font = "bold 32px 'Lucida Console', monospace";
        ctx.fillText(winner + " a câștigat!", canvas.width / 2, canvas.height / 2 - 8);
        ctx.fillStyle = "#ffffff"; ctx.font = "16px 'Lucida Console', monospace";
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

  function launchTankBattle(variant) {
    var bd = makeGameRoot("Tank Battle Online");
    var area = bd.querySelector("#wbGameArea");
    var hint = bd.querySelector("#wbGameHint");
    hint.textContent = "Se conectează la serverele Tank Battle. Esc închide.";
    area.innerHTML =
      '<div class="wb-tank-stub">' +
      '<div class="wb-tank-status">' +
      '<div class="wb-tank-spinner"></div>' +
      '<div>Se conectează la lobby ' +
      (variant === "w3"
        ? "(server comunitar, găzduit de fani)..."
        : "(prin WB Plus, abonament verificat)...") +
      "</div>" +
      "</div>" +
      '<div class="wb-tank-meta">' +
      "<p>Acest multiplayer este același mod, pe Waterboard 3, Waterboard 4, Waterboard 5 și PC. Pe PC, jucătorii nu plătesc nimic în plus pentru matchmaking.</p>" +
      (variant === "w3"
        ? "<p>Aici sunteți pe W3, deci nu ați plătit nimic în plus.</p>"
        : "<p><strong>Pe " + variantName(variant) + ", ați plătit ICE 275 RON pe an pentru exact același serviciu.</strong></p>") +
      "</div>" +
      "</div>";
    function onKey(e) {
      if (e.key === "Escape") { bd.remove(); window.removeEventListener("keydown", onKey, true); }
    }
    window.addEventListener("keydown", onKey, true);
  }

  function launchStub(g, variant) {
    var bd = makeGameRoot(g.title);
    var area = bd.querySelector("#wbGameArea");
    var hint = bd.querySelector("#wbGameHint");
    hint.textContent = "Esc închide.";
    area.innerHTML =
      '<div class="wb-tank-stub">' +
      '<div class="wb-tank-meta">' +
      "<p><strong>" + g.title + "</strong> (" + g.sub + ")</p>" +
      "<p>Demonstrație simbolică. Acest titlu există în catalogul de jocuri pentru a ilustra disponibilitatea pe diferite generații de console și nu are gameplay implementat în această versiune.</p>" +
      "</div>" +
      "</div>";
    function onKey(e) {
      if (e.key === "Escape") { bd.remove(); window.removeEventListener("keydown", onKey, true); }
    }
    window.addEventListener("keydown", onKey, true);
  }

  // ============================================================
  // GT AVANTAJ  (top-down racer)
  // Endless road, three lanes, obstacles drift down at you.
  // Steer with arrow keys / A / D between lanes. Score is
  // distance survived; speed scales over time.
  // ============================================================
  function launchRacer(variant) {
    var bd = makeGameRoot("GT Avantaj");
    var area = bd.querySelector("#wbGameArea");
    var hint = bd.querySelector("#wbGameHint");
    hint.textContent = "← → sau A / D pentru a schimba banda. Esc închide. Evitați mașinile din față.";
    var W = 360, H = 480;
    var canvas = document.createElement("canvas");
    canvas.width = W; canvas.height = H;
    canvas.className = "wb-canvas"; canvas.tabIndex = 0; canvas.style.outline = "none";
    area.appendChild(canvas); canvas.focus();
    var ctx = canvas.getContext("2d");
    var laneX = [90, 180, 270]; // 3 lanes
    var playerLane = 1;
    var playerY = H - 80;
    var obstacles = []; // {lane, y, color}
    var roadOffset = 0;
    var speed = 4;
    var distance = 0;
    var alive = true;
    var spawnCooldown = 0;
    var colors = ["#df4040", "#ffd34d", "#80a8d0", "#a080ff", "#80df80"];
    function rand(n) { return Math.floor(Math.random() * n); }
    function spawn() {
      var lane = rand(3);
      // Don't make it impossible: never put two near same y
      for (var i = 0; i < obstacles.length; i++) {
        if (obstacles[i].lane === lane && obstacles[i].y < 100) return;
      }
      obstacles.push({ lane: lane, y: -60, color: colors[rand(colors.length)] });
    }
    function reset() {
      obstacles = []; playerLane = 1; speed = 4; distance = 0; alive = true; spawnCooldown = 0;
    }
    function onKey(e) {
      if (e.key === "Escape") { bd.remove(); cleanup(); return; }
      if (!alive && (e.key === "r" || e.key === "R")) { reset(); return; }
      if (!alive) return;
      if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") {
        if (playerLane > 0) playerLane -= 1; e.preventDefault();
      } else if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") {
        if (playerLane < 2) playerLane += 1; e.preventDefault();
      }
    }
    window.addEventListener("keydown", onKey, true);
    function cleanup() { window.removeEventListener("keydown", onKey, true); }
    function frame() {
      if (!document.body.contains(bd)) { cleanup(); return; }
      if (alive) {
        // Advance world
        roadOffset = (roadOffset + speed) % 40;
        distance += speed;
        speed = Math.min(10, 4 + distance / 6000);
        spawnCooldown -= 1;
        if (spawnCooldown <= 0) { spawn(); spawnCooldown = 30 + rand(20); }
        for (var i = obstacles.length - 1; i >= 0; i--) {
          obstacles[i].y += speed;
          if (obstacles[i].y > H + 60) obstacles.splice(i, 1);
        }
        // Collision
        for (var j = 0; j < obstacles.length; j++) {
          var ob = obstacles[j];
          if (ob.lane === playerLane && ob.y > playerY - 40 && ob.y < playerY + 40) {
            alive = false; break;
          }
        }
      }
      // Draw
      ctx.fillStyle = "#152a18"; ctx.fillRect(0, 0, W, H); // grass
      ctx.fillStyle = "#2a2a2a"; ctx.fillRect(40, 0, W - 80, H); // road
      ctx.strokeStyle = "#e8e8e8"; ctx.lineWidth = 3; ctx.setLineDash([18, 22]);
      ctx.lineDashOffset = -roadOffset;
      ctx.beginPath(); ctx.moveTo(135, 0); ctx.lineTo(135, H); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(225, 0); ctx.lineTo(225, H); ctx.stroke();
      ctx.setLineDash([]); ctx.lineWidth = 1;
      // Obstacles
      obstacles.forEach(function (ob) {
        var x = laneX[ob.lane] - 22;
        ctx.fillStyle = ob.color;
        ctx.fillRect(x, ob.y - 28, 44, 56);
        ctx.fillStyle = "#000";
        ctx.fillRect(x + 4, ob.y - 22, 36, 14);   // hood
        ctx.fillRect(x + 4, ob.y + 8, 36, 14);    // trunk
      });
      // Player
      var px = laneX[playerLane] - 22;
      ctx.fillStyle = "#5af0ff"; ctx.fillRect(px, playerY - 28, 44, 56);
      ctx.fillStyle = "#000"; ctx.fillRect(px + 4, playerY - 22, 36, 14);
      ctx.fillRect(px + 4, playerY + 8, 36, 14);
      // HUD
      ctx.fillStyle = "rgba(0,0,0,0.6)"; ctx.fillRect(10, 10, 130, 36);
      ctx.fillStyle = "#fff"; ctx.font = "bold 13px 'Lucida Console', monospace";
      ctx.textAlign = "left";
      ctx.fillText("Distanța: " + Math.floor(distance / 10) + " m", 16, 28);
      ctx.fillText("Viteză:   " + Math.round(speed * 20) + " km/h", 16, 42);
      if (!alive) {
        ctx.fillStyle = "rgba(0,0,0,0.75)"; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = "#ffd34d"; ctx.font = "bold 26px 'Lucida Console', monospace";
        ctx.textAlign = "center";
        ctx.fillText("ACCIDENT", W / 2, H / 2 - 16);
        ctx.fillStyle = "#fff"; ctx.font = "14px 'Lucida Console', monospace";
        ctx.fillText("Distanță finală: " + Math.floor(distance / 10) + " m", W / 2, H / 2 + 14);
        ctx.fillText("Apăsați R pentru o cursă nouă.", W / 2, H / 2 + 38);
      }
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  // ============================================================
  // STRATO BLITZ  (turn-based tactical grid)
  // 6x4 grid. You control 3 green units; CPU controls 3 red.
  // Click your unit, then click an empty cell to move (1
  // square) or click an adjacent enemy to attack. Last team
  // alive wins. Each unit has 3 HP, 1 attack/turn.
  // ============================================================
  function launchStrategy(variant) {
    var bd = makeGameRoot("Strato Blitz");
    var area = bd.querySelector("#wbGameArea");
    var hint = bd.querySelector("#wbGameHint");
    hint.textContent = "Click pe unitatea verde, apoi click pe o celulă vecină pentru mutare, sau pe inamic pentru atac. Esc închide.";
    var COLS = 7, ROWS = 5, CELL = 60;
    var canvas = document.createElement("canvas");
    canvas.width = COLS * CELL; canvas.height = ROWS * CELL + 40;
    canvas.className = "wb-canvas"; canvas.tabIndex = 0; canvas.style.outline = "none";
    area.appendChild(canvas); canvas.focus();
    var ctx = canvas.getContext("2d");
    var units, selected, turn, msg, gameOver, unitActed;
    function reset() {
      units = [
        { id: 1, team: "p", x: 0, y: 1, hp: 3 },
        { id: 2, team: "p", x: 0, y: 2, hp: 3 },
        { id: 3, team: "p", x: 0, y: 3, hp: 3 },
        { id: 4, team: "e", x: 6, y: 1, hp: 3 },
        { id: 5, team: "e", x: 6, y: 2, hp: 3 },
        { id: 6, team: "e", x: 6, y: 3, hp: 3 }
      ];
      selected = null; turn = "p"; msg = "Rândul tău."; gameOver = false; unitActed = {};
      draw();
    }
    function unitAt(x, y) {
      return units.find(function (u) { return u.x === x && u.y === y && u.hp > 0; });
    }
    function adjacent(a, b) {
      return Math.abs(a.x - b.x) + Math.abs(a.y - b.y) === 1;
    }
    function checkWin() {
      var pAlive = units.some(function (u) { return u.team === "p" && u.hp > 0; });
      var eAlive = units.some(function (u) { return u.team === "e" && u.hp > 0; });
      if (!pAlive) { msg = "Ai pierdut. R pentru o nouă bătălie."; gameOver = true; return true; }
      if (!eAlive) { msg = "Ai câștigat! R pentru o nouă bătălie."; gameOver = true; return true; }
      return false;
    }
    function endPlayerTurn() {
      turn = "e"; selected = null; unitActed = {};
      msg = "Rândul CPU...";
      draw();
      setTimeout(cpuTurn, 600);
    }
    function cpuTurn() {
      var enemies = units.filter(function (u) { return u.team === "e" && u.hp > 0; });
      var i = 0;
      function nextEnemy() {
        if (i >= enemies.length) {
          turn = "p"; msg = "Rândul tău.";
          if (!checkWin()) draw();
          return;
        }
        var e = enemies[i]; i += 1;
        // Find nearest player unit
        var targets = units.filter(function (u) { return u.team === "p" && u.hp > 0; });
        if (targets.length === 0) { checkWin(); draw(); return; }
        targets.sort(function (a, b) {
          return (Math.abs(a.x - e.x) + Math.abs(a.y - e.y)) - (Math.abs(b.x - e.x) + Math.abs(b.y - e.y));
        });
        var t = targets[0];
        if (adjacent(e, t)) {
          // Attack
          t.hp -= 1;
          msg = "CPU atacă unitatea ta.";
          draw();
          if (checkWin()) { draw(); return; }
          setTimeout(nextEnemy, 350);
        } else {
          // Move 1 toward target
          var dx = Math.sign(t.x - e.x), dy = Math.sign(t.y - e.y);
          var tryMoves = [[dx, 0], [0, dy], [-dx, 0], [0, -dy]];
          for (var k = 0; k < tryMoves.length; k++) {
            var nx = e.x + tryMoves[k][0], ny = e.y + tryMoves[k][1];
            if (nx >= 0 && nx < COLS && ny >= 0 && ny < ROWS && !unitAt(nx, ny)) {
              e.x = nx; e.y = ny;
              break;
            }
          }
          draw();
          setTimeout(nextEnemy, 350);
        }
      }
      nextEnemy();
    }
    function draw() {
      ctx.fillStyle = "#0a0e1a"; ctx.fillRect(0, 0, canvas.width, canvas.height);
      // Grid
      for (var y = 0; y < ROWS; y++) {
        for (var x = 0; x < COLS; x++) {
          ctx.fillStyle = (x + y) % 2 === 0 ? "#1a2030" : "#152030";
          ctx.fillRect(x * CELL, y * CELL, CELL, CELL);
        }
      }
      // Selection highlight + valid targets
      if (selected) {
        ctx.fillStyle = "rgba(128,223,128,0.30)";
        ctx.fillRect(selected.x * CELL, selected.y * CELL, CELL, CELL);
        // Mark adjacent moveable/attackable
        var dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
        dirs.forEach(function (d) {
          var nx = selected.x + d[0], ny = selected.y + d[1];
          if (nx < 0 || nx >= COLS || ny < 0 || ny >= ROWS) return;
          var t = unitAt(nx, ny);
          if (t && t.team === "e") ctx.fillStyle = "rgba(223,64,64,0.45)";
          else if (!t) ctx.fillStyle = "rgba(255,255,255,0.18)";
          else return;
          ctx.fillRect(nx * CELL, ny * CELL, CELL, CELL);
        });
      }
      // Units
      units.forEach(function (u) {
        if (u.hp <= 0) return;
        var cx = u.x * CELL + CELL / 2, cy = u.y * CELL + CELL / 2;
        ctx.fillStyle = u.team === "p" ? "#80df80" : "#df6060";
        ctx.beginPath(); ctx.arc(cx, cy, CELL * 0.32, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = "#000"; ctx.lineWidth = 2; ctx.stroke();
        // HP pips
        for (var i = 0; i < u.hp; i++) {
          ctx.fillStyle = "#fff";
          ctx.fillRect(u.x * CELL + 8 + i * 8, u.y * CELL + 6, 5, 5);
        }
      });
      // Status bar
      ctx.fillStyle = "#0a0e1a"; ctx.fillRect(0, ROWS * CELL, canvas.width, 40);
      ctx.fillStyle = "#a0c8d0"; ctx.font = "13px 'Tahoma', sans-serif"; ctx.textAlign = "left";
      ctx.fillText(msg, 10, ROWS * CELL + 24);
      ctx.textAlign = "right";
      ctx.fillStyle = "#909090";
      ctx.fillText("Tură: " + (turn === "p" ? "JUCĂTOR" : "CPU"), canvas.width - 10, ROWS * CELL + 24);
    }
    function onClick(e) {
      if (turn !== "p" || gameOver) return;
      var rect = canvas.getBoundingClientRect();
      var x = Math.floor((e.clientX - rect.left) * canvas.width / rect.width / CELL);
      var y = Math.floor((e.clientY - rect.top) * canvas.height / rect.height / CELL);
      if (x < 0 || x >= COLS || y < 0 || y >= ROWS) return;
      var clicked = unitAt(x, y);
      if (!selected) {
        if (clicked && clicked.team === "p" && !unitActed[clicked.id]) selected = clicked;
        draw();
        return;
      }
      // We have a selection — try to act
      if (clicked === selected) { selected = null; draw(); return; }
      if (clicked && clicked.team === "p" && !unitActed[clicked.id]) { selected = clicked; draw(); return; }
      // Adjacent?
      if (Math.abs(x - selected.x) + Math.abs(y - selected.y) === 1) {
        if (clicked && clicked.team === "e") {
          // Attack
          clicked.hp -= 1;
          unitActed[selected.id] = true;
          selected = null;
          if (!checkWin()) {
            // Check if any units left to act
            var anyLeft = units.some(function (u) { return u.team === "p" && u.hp > 0 && !unitActed[u.id]; });
            if (!anyLeft) { endPlayerTurn(); return; }
          }
          draw();
        } else if (!clicked) {
          // Move
          selected.x = x; selected.y = y;
          unitActed[selected.id] = true;
          selected = null;
          var anyLeft = units.some(function (u) { return u.team === "p" && u.hp > 0 && !unitActed[u.id]; });
          if (!anyLeft) { endPlayerTurn(); return; }
          draw();
        }
      }
    }
    canvas.addEventListener("click", onClick);
    function onKey(e) {
      if (e.key === "Escape") { bd.remove(); cleanup(); return; }
      if (e.key === "r" || e.key === "R") reset();
      if (e.key === " " || e.key === "Enter") {
        // Skip remaining player moves
        if (turn === "p" && !gameOver) endPlayerTurn();
      }
    }
    window.addEventListener("keydown", onKey, true);
    function cleanup() { window.removeEventListener("keydown", onKey, true); }
    reset();
  }

  // ============================================================
  // STAR GALAXY VII  (turn-based RPG combat)
  // Player versus a single space-creature. Four actions: Attack
  // (low damage, no cost), Special (high damage, 3 MP), Defend
  // (halve next incoming damage), Healing pulse (restore 6 HP,
  // 4 MP). Enemy AI picks randomly between attack and a heavy
  // attack. First to drop HP to 0 loses. The whole thing is a
  // single screen with stats + log + buttons.
  // ============================================================
  function launchRpg(variant) {
    var bd = makeGameRoot("Star Galaxy VII");
    var area = bd.querySelector("#wbGameArea");
    var hint = bd.querySelector("#wbGameHint");
    hint.textContent = "Alegeți o acțiune. Reduceți HP-ul inamicului la 0. Esc închide.";
    area.innerHTML =
      '<div class="rpg-arena">' +
      '<div class="rpg-side rpg-side-enemy">' +
      '<div class="rpg-portrait rpg-portrait-enemy"></div>' +
      '<div class="rpg-name">Creatura Spectrală</div>' +
      '<div class="rpg-bars">' +
      '<div class="rpg-bar"><span>HP</span><div class="rpg-bar-track"><div class="rpg-bar-fill rpg-bar-hp" id="rpgEHpBar"></div></div><span id="rpgEHpText">20/20</span></div>' +
      "</div>" +
      "</div>" +
      '<div class="rpg-log" id="rpgLog"></div>' +
      '<div class="rpg-side rpg-side-player">' +
      '<div class="rpg-portrait rpg-portrait-player"></div>' +
      '<div class="rpg-name">Comandant Aldrin</div>' +
      '<div class="rpg-bars">' +
      '<div class="rpg-bar"><span>HP</span><div class="rpg-bar-track"><div class="rpg-bar-fill rpg-bar-hp" id="rpgPHpBar"></div></div><span id="rpgPHpText">18/18</span></div>' +
      '<div class="rpg-bar"><span>MP</span><div class="rpg-bar-track"><div class="rpg-bar-fill rpg-bar-mp" id="rpgPMpBar"></div></div><span id="rpgPMpText">8/8</span></div>' +
      "</div>" +
      '<div class="rpg-actions" id="rpgActions">' +
      '<button class="rpg-btn" data-rpg-act="attack">Atac (0 MP)</button>' +
      '<button class="rpg-btn" data-rpg-act="special">Specială (3 MP)</button>' +
      '<button class="rpg-btn" data-rpg-act="defend">Apărare (0 MP)</button>' +
      '<button class="rpg-btn" data-rpg-act="heal">Pulse Vindecare (4 MP)</button>' +
      "</div>" +
      "</div>" +
      "</div>";
    var pHp = 18, pHpMax = 18, pMp = 8, pMpMax = 8;
    var eHp = 20, eHpMax = 20;
    var defending = false;
    var over = false;
    function logLine(t, cls) {
      var lo = document.getElementById("rpgLog");
      var d = document.createElement("div");
      d.className = "rpg-log-line" + (cls ? " " + cls : "");
      d.textContent = t;
      lo.appendChild(d);
      lo.scrollTop = lo.scrollHeight;
    }
    function rand(min, max) { return min + Math.floor(Math.random() * (max - min + 1)); }
    function updateUi() {
      document.getElementById("rpgPHpBar").style.width = (100 * pHp / pHpMax) + "%";
      document.getElementById("rpgPHpText").textContent = pHp + "/" + pHpMax;
      document.getElementById("rpgPMpBar").style.width = (100 * pMp / pMpMax) + "%";
      document.getElementById("rpgPMpText").textContent = pMp + "/" + pMpMax;
      document.getElementById("rpgEHpBar").style.width = (100 * eHp / eHpMax) + "%";
      document.getElementById("rpgEHpText").textContent = eHp + "/" + eHpMax;
    }
    function check() {
      if (eHp <= 0) {
        logLine(">>> Creatura este învinsă. VICTORIE.", "rpg-log-win");
        over = true;
        showRestart();
        return true;
      }
      if (pHp <= 0) {
        logLine(">>> Aldrin a căzut. ÎNFRÂNGERE.", "rpg-log-lose");
        over = true;
        showRestart();
        return true;
      }
      return false;
    }
    function showRestart() {
      document.getElementById("rpgActions").innerHTML =
        '<button class="rpg-btn" id="rpgRestart">Nouă bătălie</button>';
      document.getElementById("rpgRestart").addEventListener("click", function () {
        pHp = pHpMax; pMp = pMpMax; eHp = eHpMax; over = false; defending = false;
        document.getElementById("rpgLog").innerHTML = "";
        logLine("Bătălia reîncepe.");
        renderActions(); updateUi();
      });
    }
    function renderActions() {
      document.getElementById("rpgActions").innerHTML =
        '<button class="rpg-btn" data-rpg-act="attack">Atac (0 MP)</button>' +
        '<button class="rpg-btn" data-rpg-act="special"' + (pMp < 3 ? " disabled" : "") + '>Specială (3 MP)</button>' +
        '<button class="rpg-btn" data-rpg-act="defend">Apărare (0 MP)</button>' +
        '<button class="rpg-btn" data-rpg-act="heal"' + (pMp < 4 ? " disabled" : "") + '>Pulse Vindecare (4 MP)</button>';
      document.getElementById("rpgActions").querySelectorAll("[data-rpg-act]").forEach(function (b) {
        b.addEventListener("click", function () { playerAct(b.getAttribute("data-rpg-act")); });
      });
    }
    function playerAct(act) {
      if (over) return;
      defending = false;
      if (act === "attack") {
        var dmg = rand(3, 5);
        eHp = Math.max(0, eHp - dmg);
        logLine("Aldrin atacă: " + dmg + " daune.");
      } else if (act === "special") {
        if (pMp < 3) return;
        pMp -= 3;
        var dmg2 = rand(6, 10);
        eHp = Math.max(0, eHp - dmg2);
        logLine("Aldrin folosește Specială: " + dmg2 + " daune.");
      } else if (act === "defend") {
        defending = true;
        logLine("Aldrin se pregătește să blocheze următorul atac.");
      } else if (act === "heal") {
        if (pMp < 4) return;
        pMp -= 4;
        pHp = Math.min(pHpMax, pHp + 6);
        logLine("Aldrin se vindecă: +6 HP.");
      }
      updateUi();
      if (check()) return;
      setTimeout(enemyTurn, 700);
    }
    function enemyTurn() {
      if (over) return;
      var heavy = Math.random() < 0.35;
      var dmg = heavy ? rand(5, 8) : rand(2, 4);
      if (defending) dmg = Math.floor(dmg / 2);
      pHp = Math.max(0, pHp - dmg);
      logLine("Creatura " + (heavy ? "lovește puternic" : "lovește") + ": " + dmg + " daune" + (defending ? " (blocate parțial)" : "") + ".");
      pMp = Math.min(pMpMax, pMp + 1);
      updateUi();
      check();
    }
    document.getElementById("rpgActions").querySelectorAll("[data-rpg-act]").forEach(function (b) {
      b.addEventListener("click", function () { playerAct(b.getAttribute("data-rpg-act")); });
    });
    function onKey(e) {
      if (e.key === "Escape") { bd.remove(); window.removeEventListener("keydown", onKey, true); }
    }
    window.addEventListener("keydown", onKey, true);
    logLine("Bătălia începe. Creatura Spectrală vă blochează calea către a 7-a galaxie.");
    updateUi();
  }

  // ============================================================
  // LEMUR QUEST  (side-scroll platformer, single screen)
  // Move with arrows / A D, jump with Space or W. Collect all
  // five fruits, then touch the flag to win. Falling off the
  // bottom resets you to the start. Simple AABB platforming
  // with gravity + jump.
  // ============================================================
  function launchLemur(variant) {
    var bd = makeGameRoot("Lemur Quest");
    var area = bd.querySelector("#wbGameArea");
    var hint = bd.querySelector("#wbGameHint");
    hint.textContent = "← → sau A / D pentru mișcare, Spațiu sau W pentru săritură. Colectați fructele și atingeți steagul. Esc închide.";
    var W = 640, H = 360;
    var canvas = document.createElement("canvas");
    canvas.width = W; canvas.height = H;
    canvas.className = "wb-canvas"; canvas.tabIndex = 0; canvas.style.outline = "none";
    area.appendChild(canvas); canvas.focus();
    var ctx = canvas.getContext("2d");
    // Static level
    var platforms = [
      { x: 0,   y: 320, w: 220, h: 40 },
      { x: 240, y: 280, w: 100, h: 16 },
      { x: 360, y: 240, w: 120, h: 16 },
      { x: 460, y: 320, w: 180, h: 40 },
      { x: 130, y: 230, w: 80,  h: 14 },
      { x: 40,  y: 170, w: 90,  h: 14 },
      { x: 280, y: 170, w: 60,  h: 14 },
      { x: 540, y: 200, w: 80,  h: 14 }
    ];
    var fruits = [
      { x: 80,  y: 140, taken: false },
      { x: 170, y: 200, taken: false },
      { x: 300, y: 140, taken: false },
      { x: 400, y: 210, taken: false },
      { x: 580, y: 170, taken: false }
    ];
    var goal = { x: 600, y: 280, w: 24, h: 40 };
    var player = { x: 20, y: 280, w: 22, h: 28, vx: 0, vy: 0, onGround: false };
    var keys = {};
    var collected = 0;
    var won = false;
    function reset() {
      player.x = 20; player.y = 280; player.vx = 0; player.vy = 0;
      fruits.forEach(function (f) { f.taken = false; });
      collected = 0; won = false;
    }
    function onKey(e) {
      if (e.type === "keydown") {
        if (e.key === "Escape") { bd.remove(); cleanup(); return; }
        if (e.key === "r" || e.key === "R") { reset(); return; }
        keys[e.key] = true;
      } else { keys[e.key] = false; }
      if (["ArrowLeft", "ArrowRight", "ArrowUp", " ", "w", "W", "a", "A", "d", "D"].indexOf(e.key) >= 0) e.preventDefault();
    }
    window.addEventListener("keydown", onKey, true);
    window.addEventListener("keyup", onKey, true);
    function cleanup() {
      window.removeEventListener("keydown", onKey, true);
      window.removeEventListener("keyup", onKey, true);
    }
    function frame() {
      if (!document.body.contains(bd)) { cleanup(); return; }
      // Input
      var ax = 0;
      if (keys.ArrowLeft || keys.a || keys.A) ax -= 1;
      if (keys.ArrowRight || keys.d || keys.D) ax += 1;
      if ((keys[" "] || keys.w || keys.W || keys.ArrowUp) && player.onGround) {
        player.vy = -10; player.onGround = false;
      }
      // Physics
      player.vx = ax * 4;
      player.vy += 0.5; if (player.vy > 12) player.vy = 12;
      // X axis
      player.x += player.vx;
      platforms.forEach(function (p) {
        if (rectIn(player, p)) {
          if (player.vx > 0) player.x = p.x - player.w;
          else if (player.vx < 0) player.x = p.x + p.w;
        }
      });
      if (player.x < 0) player.x = 0;
      if (player.x > W - player.w) player.x = W - player.w;
      // Y axis
      player.y += player.vy;
      player.onGround = false;
      platforms.forEach(function (p) {
        if (rectIn(player, p)) {
          if (player.vy > 0) { player.y = p.y - player.h; player.vy = 0; player.onGround = true; }
          else if (player.vy < 0) { player.y = p.y + p.h; player.vy = 0; }
        }
      });
      // Fall = respawn
      if (player.y > H + 40) reset();
      // Fruits
      fruits.forEach(function (f) {
        if (f.taken) return;
        if (player.x < f.x + 14 && player.x + player.w > f.x && player.y < f.y + 14 && player.y + player.h > f.y) {
          f.taken = true; collected += 1;
        }
      });
      // Goal
      if (!won && collected === fruits.length &&
          player.x < goal.x + goal.w && player.x + player.w > goal.x &&
          player.y < goal.y + goal.h && player.y + player.h > goal.y) {
        won = true;
      }
      // Draw
      ctx.fillStyle = "#205040"; ctx.fillRect(0, 0, W, H);
      // Far hills
      ctx.fillStyle = "#15403a";
      ctx.beginPath();
      ctx.moveTo(0, 240); ctx.quadraticCurveTo(150, 180, 300, 240);
      ctx.quadraticCurveTo(450, 200, 640, 240); ctx.lineTo(640, 320); ctx.lineTo(0, 320); ctx.closePath();
      ctx.fill();
      // Platforms
      platforms.forEach(function (p) {
        ctx.fillStyle = "#3a2018"; ctx.fillRect(p.x, p.y, p.w, p.h);
        ctx.fillStyle = "#5a3018"; ctx.fillRect(p.x, p.y, p.w, 3);
      });
      // Fruits
      fruits.forEach(function (f) {
        if (f.taken) return;
        ctx.fillStyle = "#df4040"; ctx.beginPath();
        ctx.arc(f.x + 7, f.y + 7, 6, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#608040"; ctx.fillRect(f.x + 6, f.y - 2, 3, 4);
      });
      // Goal flag
      ctx.fillStyle = "#3a3a3a";
      ctx.fillRect(goal.x + goal.w / 2 - 1, goal.y, 2, goal.h);
      ctx.fillStyle = collected === fruits.length ? "#ffd34d" : "#808080";
      ctx.beginPath();
      ctx.moveTo(goal.x + goal.w / 2, goal.y);
      ctx.lineTo(goal.x + goal.w / 2 + 14, goal.y + 6);
      ctx.lineTo(goal.x + goal.w / 2, goal.y + 12);
      ctx.closePath(); ctx.fill();
      // Player (lemur)
      ctx.fillStyle = "#a8a8a8";
      ctx.fillRect(player.x, player.y, player.w, player.h);
      ctx.fillStyle = "#000";
      ctx.fillRect(player.x + 4, player.y + 8, 3, 3);
      ctx.fillRect(player.x + player.w - 7, player.y + 8, 3, 3);
      ctx.fillStyle = "#fff";
      ctx.fillRect(player.x + 4, player.y + 4, player.w - 8, 4);
      // HUD
      ctx.fillStyle = "rgba(0,0,0,0.55)"; ctx.fillRect(10, 10, 140, 28);
      ctx.fillStyle = "#fff"; ctx.font = "bold 13px 'Lucida Console', monospace"; ctx.textAlign = "left";
      ctx.fillText("Fructe: " + collected + "/" + fruits.length, 18, 28);
      if (won) {
        ctx.fillStyle = "rgba(0,0,0,0.7)"; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = "#ffd34d"; ctx.font = "bold 28px 'Lucida Console', monospace";
        ctx.textAlign = "center";
        ctx.fillText("AI CÂȘTIGAT!", W / 2, H / 2 - 6);
        ctx.fillStyle = "#fff"; ctx.font = "14px 'Lucida Console', monospace";
        ctx.fillText("Apăsați R pentru o aventură nouă.", W / 2, H / 2 + 24);
      }
      requestAnimationFrame(frame);
    }
    function rectIn(a, b) {
      return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
    }
    requestAnimationFrame(frame);
  }

  // ============================================================
  // CUBE LOGICA  (Sokoban-style puzzle)
  // 10x8 grid, walls, boxes, target squares, player. Push a
  // box by moving into it; the cell behind the box must be
  // empty for the push to succeed. Win when every box rests
  // on a target. Arrow keys / WASD. U undoes. R resets.
  // ============================================================
  function launchPuzzle(variant) {
    var bd = makeGameRoot("Cube Logica");
    var area = bd.querySelector("#wbGameArea");
    var hint = bd.querySelector("#wbGameHint");
    hint.textContent = "← → ↑ ↓ sau WASD pentru a mișca lemurul. U anulează ultima mișcare, R resetează. Esc închide.";
    // Level encoding: # wall, . floor, $ box, * box-on-target,
    // @ player, + player-on-target, space outside.
    var LEVEL = [
      "##########",
      "#........#",
      "#..####..#",
      "#..#.....#",
      "#.@$.$.*.#",
      "#..#.....#",
      "#..####..#",
      "##########"
    ];
    var ROWS = LEVEL.length, COLS = LEVEL[0].length;
    var CELL = 44;
    var canvas = document.createElement("canvas");
    canvas.width = COLS * CELL; canvas.height = ROWS * CELL + 40;
    canvas.className = "wb-canvas"; canvas.tabIndex = 0; canvas.style.outline = "none";
    area.appendChild(canvas); canvas.focus();
    var ctx = canvas.getContext("2d");
    // Static layout: walls + targets
    var walls = [];
    var targets = [];
    var boxes = [];
    var player = { x: 0, y: 0 };
    var history = [];
    var won = false;
    function load() {
      walls = []; targets = []; boxes = []; history = []; won = false;
      for (var y = 0; y < ROWS; y++) {
        for (var x = 0; x < COLS; x++) {
          var c = LEVEL[y][x];
          if (c === "#") walls.push({ x: x, y: y });
          if (c === "." || c === "$" || c === "@") { /* floor */ }
          if (c === "*" || c === "+") targets.push({ x: x, y: y });
          if (c === "$" || c === "*") boxes.push({ x: x, y: y });
          if (c === "@" || c === "+") { player.x = x; player.y = y; }
        }
      }
      // Add a target inside the open area so it's not too trivial
      targets.push({ x: 8, y: 4 });
    }
    function isWall(x, y) {
      return walls.some(function (w) { return w.x === x && w.y === y; });
    }
    function boxAt(x, y) {
      return boxes.find(function (b) { return b.x === x && b.y === y; });
    }
    function move(dx, dy) {
      if (won) return;
      var nx = player.x + dx, ny = player.y + dy;
      if (isWall(nx, ny)) return;
      var b = boxAt(nx, ny);
      if (b) {
        var bx = b.x + dx, by = b.y + dy;
        if (isWall(bx, by) || boxAt(bx, by)) return;
        history.push({ p: { x: player.x, y: player.y }, b: { id: boxes.indexOf(b), x: b.x, y: b.y } });
        b.x = bx; b.y = by;
        player.x = nx; player.y = ny;
      } else {
        history.push({ p: { x: player.x, y: player.y }, b: null });
        player.x = nx; player.y = ny;
      }
      checkWin();
      draw();
    }
    function undo() {
      if (won || !history.length) return;
      var h = history.pop();
      player.x = h.p.x; player.y = h.p.y;
      if (h.b) {
        boxes[h.b.id].x = h.b.x; boxes[h.b.id].y = h.b.y;
      }
      draw();
    }
    function checkWin() {
      var all = boxes.every(function (b) {
        return targets.some(function (t) { return t.x === b.x && t.y === b.y; });
      });
      if (all) won = true;
    }
    function draw() {
      ctx.fillStyle = "#0a1a30"; ctx.fillRect(0, 0, canvas.width, canvas.height);
      // Walls + floors
      for (var y = 0; y < ROWS; y++) {
        for (var x = 0; x < COLS; x++) {
          if (isWall(x, y)) {
            ctx.fillStyle = "#3a3a4a"; ctx.fillRect(x * CELL, y * CELL, CELL, CELL);
            ctx.strokeStyle = "#2a2a3a"; ctx.lineWidth = 2;
            ctx.strokeRect(x * CELL, y * CELL, CELL, CELL);
          } else {
            ctx.fillStyle = "#152030"; ctx.fillRect(x * CELL, y * CELL, CELL, CELL);
          }
        }
      }
      // Targets
      targets.forEach(function (t) {
        ctx.strokeStyle = "#80c0ff"; ctx.lineWidth = 2;
        ctx.strokeRect(t.x * CELL + 8, t.y * CELL + 8, CELL - 16, CELL - 16);
      });
      // Boxes
      boxes.forEach(function (b) {
        var onTarget = targets.some(function (t) { return t.x === b.x && t.y === b.y; });
        ctx.fillStyle = onTarget ? "#80df80" : "#df9020";
        ctx.fillRect(b.x * CELL + 4, b.y * CELL + 4, CELL - 8, CELL - 8);
        ctx.strokeStyle = "#000"; ctx.lineWidth = 2;
        ctx.strokeRect(b.x * CELL + 4, b.y * CELL + 4, CELL - 8, CELL - 8);
        ctx.beginPath();
        ctx.moveTo(b.x * CELL + 4, b.y * CELL + 4);
        ctx.lineTo(b.x * CELL + CELL - 4, b.y * CELL + CELL - 4);
        ctx.moveTo(b.x * CELL + CELL - 4, b.y * CELL + 4);
        ctx.lineTo(b.x * CELL + 4, b.y * CELL + CELL - 4);
        ctx.stroke();
      });
      // Player
      ctx.fillStyle = "#a8a8a8";
      ctx.beginPath();
      ctx.arc(player.x * CELL + CELL / 2, player.y * CELL + CELL / 2, CELL * 0.30, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#000"; ctx.lineWidth = 2; ctx.stroke();
      // Status bar
      var onTargetCount = boxes.filter(function (b) {
        return targets.some(function (t) { return t.x === b.x && t.y === b.y; });
      }).length;
      ctx.fillStyle = "#0a0e1a"; ctx.fillRect(0, ROWS * CELL, canvas.width, 40);
      ctx.fillStyle = "#a0c8d0"; ctx.font = "13px 'Tahoma', sans-serif"; ctx.textAlign = "left";
      ctx.fillText("Cuburi pe țintă: " + onTargetCount + "/" + boxes.length, 10, ROWS * CELL + 24);
      ctx.textAlign = "right"; ctx.fillStyle = "#909090";
      ctx.fillText("Mișcări: " + history.length, canvas.width - 10, ROWS * CELL + 24);
      if (won) {
        ctx.fillStyle = "rgba(0,0,0,0.75)"; ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "#80df80"; ctx.font = "bold 28px 'Lucida Console', monospace"; ctx.textAlign = "center";
        ctx.fillText("PUZZLE REZOLVAT", canvas.width / 2, canvas.height / 2 - 8);
        ctx.fillStyle = "#fff"; ctx.font = "14px 'Lucida Console', monospace";
        ctx.fillText("Rezolvat în " + history.length + " mișcări. R pentru reset.", canvas.width / 2, canvas.height / 2 + 22);
      }
    }
    function onKey(e) {
      if (e.key === "Escape") { bd.remove(); cleanup(); return; }
      if (e.key === "r" || e.key === "R") { load(); draw(); return; }
      if (e.key === "u" || e.key === "U") { undo(); return; }
      if (e.key === "ArrowUp" || e.key === "w" || e.key === "W") { move(0, -1); e.preventDefault(); }
      else if (e.key === "ArrowDown" || e.key === "s" || e.key === "S") { move(0, 1); e.preventDefault(); }
      else if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") { move(-1, 0); e.preventDefault(); }
      else if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") { move(1, 0); e.preventDefault(); }
    }
    window.addEventListener("keydown", onKey, true);
    function cleanup() { window.removeEventListener("keydown", onKey, true); }
    load();
    draw();
  }


  // ============================================================
  // ART HELPERS
  // ============================================================
  function tileArt(name) {
    if (name === "snake") {
      return svg('<rect width="100" height="60" fill="#1a3a1a"/>' +
        '<rect x="20" y="20" width="6" height="6" fill="#80df80"/><rect x="26" y="20" width="6" height="6" fill="#80df80"/><rect x="32" y="20" width="6" height="6" fill="#80df80"/>' +
        '<rect x="32" y="26" width="6" height="6" fill="#80df80"/><rect x="32" y="32" width="6" height="6" fill="#80df80"/><rect x="38" y="32" width="6" height="6" fill="#80df80"/>' +
        '<rect x="44" y="32" width="6" height="6" fill="#80df80"/><rect x="68" y="40" width="6" height="6" fill="#df4040"/>');
    }
    if (name === "pong") {
      return svg('<rect width="100" height="60" fill="#000"/>' +
        '<line x1="50" y1="0" x2="50" y2="60" stroke="#ffffff" stroke-width="1" stroke-dasharray="2 3"/>' +
        '<rect x="6" y="22" width="3" height="16" fill="#fff"/><rect x="91" y="28" width="3" height="16" fill="#fff"/><rect x="56" y="32" width="4" height="4" fill="#fff"/>');
    }
    if (name === "tank") {
      return svg('<rect width="100" height="60" fill="#3a3020"/>' +
        '<rect x="20" y="35" width="28" height="10" fill="#608040"/><rect x="28" y="28" width="14" height="9" fill="#608040"/><line x1="42" y1="32" x2="60" y2="32" stroke="#608040" stroke-width="3"/>' +
        '<rect x="60" y="35" width="28" height="10" fill="#a04040"/><rect x="68" y="28" width="14" height="9" fill="#a04040"/><line x1="68" y1="32" x2="50" y2="32" stroke="#a04040" stroke-width="3"/>');
    }
    if (name === "racer") {
      return svg('<rect width="100" height="60" fill="#202030"/>' +
        '<path d="M 0 50 L 100 50" stroke="#a0a0c0" stroke-width="1.5"/>' +
        '<path d="M 30 30 Q 50 30 50 50" stroke="#404060" stroke-width="2" fill="none"/>' +
        '<rect x="40" y="40" width="20" height="10" fill="#df4040" rx="2"/>' +
        '<rect x="44" y="36" width="12" height="6" fill="#df4040" rx="1"/>' +
        '<circle cx="44" cy="50" r="2.5" fill="#000"/><circle cx="56" cy="50" r="2.5" fill="#000"/>');
    }
    if (name === "strategy") {
      return svg('<rect width="100" height="60" fill="#1a2030"/>' +
        '<g fill="#608040">' +
        '<rect x="14" y="40" width="10" height="10"/><rect x="26" y="40" width="10" height="10"/><rect x="20" y="32" width="10" height="8"/>' +
        '</g>' +
        '<g fill="#a04040">' +
        '<rect x="64" y="40" width="10" height="10"/><rect x="76" y="40" width="10" height="10"/><rect x="70" y="32" width="10" height="8"/>' +
        '</g>' +
        '<line x1="40" y1="30" x2="60" y2="30" stroke="#ffd34d" stroke-width="1" stroke-dasharray="3 2"/>');
    }
    if (name === "rpg") {
      return svg('<rect width="100" height="60" fill="#1a1040"/>' +
        '<g fill="#ffffff" opacity="0.6">' +
        '<circle cx="20" cy="14" r="0.8"/><circle cx="40" cy="8" r="1"/><circle cx="60" cy="20" r="0.8"/><circle cx="80" cy="12" r="1.2"/>' +
        '</g>' +
        '<circle cx="50" cy="36" r="14" fill="#5a4080" opacity="0.7"/>' +
        '<circle cx="50" cy="36" r="8" fill="#ffd34d"/>' +
        '<path d="M 30 50 L 50 36 L 70 50" stroke="#a080ff" stroke-width="1.5" fill="none"/>');
    }
    if (name === "lemur") {
      return svg('<rect width="100" height="60" fill="#205040"/>' +
        '<rect x="0" y="48" width="100" height="12" fill="#3a2018"/>' +
        '<rect x="20" y="36" width="14" height="12" fill="#3a2018"/><rect x="60" y="28" width="14" height="20" fill="#3a2018"/>' +
        '<circle cx="50" cy="42" r="5" fill="#a8a8a8"/>' +
        '<circle cx="48" cy="40" r="1" fill="#000"/><circle cx="52" cy="40" r="1" fill="#000"/>');
    }
    if (name === "puzzle") {
      return svg('<rect width="100" height="60" fill="#0a1a30"/>' +
        '<g fill="none" stroke="#80c0ff" stroke-width="1.5">' +
        '<rect x="30" y="14" width="14" height="14"/><rect x="44" y="14" width="14" height="14"/><rect x="58" y="14" width="14" height="14"/>' +
        '<rect x="30" y="28" width="14" height="14"/><rect x="44" y="28" width="14" height="14"/><rect x="58" y="28" width="14" height="14"/>' +
        '<rect x="30" y="42" width="14" height="14"/><rect x="44" y="42" width="14" height="14"/><rect x="58" y="42" width="14" height="14"/>' +
        '</g>');
    }
    return svg('<rect width="100" height="60" fill="#1a1a1a"/>');
  }
  function svg(inner) {
    return '<svg viewBox="0 0 100 60" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">' + inner + "</svg>";
  }

  // ============================================================
  // CLOCK + UTIL
  // ============================================================
  function formatClock(d) {
    var hh = String(d.getHours()).padStart(2, "0");
    var mm = String(d.getMinutes()).padStart(2, "0");
    return hh + ":" + mm;
  }
  var clockTimer = null;
  function startClockTicker() {
    if (clockTimer) clearInterval(clockTimer);
    clockTimer = setInterval(function () {
      var el = document.getElementById("wbClock");
      if (!el) return;
      el.textContent = formatClock(new Date());
    }, 30000);
  }

  // ============================================================
  // BOOT-TIME REGISTRATION
  // Coreboot's checkBootTakeover invokes this function on
  // every page load if the appliance was previously flashed.
  // We resume the previously chosen variant if any, otherwise
  // show the picker.
  // ============================================================
  window.SRV2K3_COREBOOT_TAKEOVER = function () {
    var st = loadState();
    if (st && st.variant) bootWaterboard(st.variant);
    else showConsolePicker();
  };

  // Public for debugging.
  window.SRV2K3_WATERBOARD = {
    showPicker: showConsolePicker,
    boot: bootWaterboard,
    install: installVariant,
    state: loadState,
    brick: getBrick,
    reset: function () {
      // Full reset clears both the variant state and the
      // NVRAM brick fuse. This is the developer-only escape
      // hatch; the simulation itself never offers it.
      resetState();
      try { sessionStorage.removeItem(STORAGE_BRICK_KEY); } catch (e) {}
    }
  };
})();
