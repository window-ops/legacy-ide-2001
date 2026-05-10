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
     biosLocked     : boolean (W4/W5 set this true on install)
     poweredOff     : boolean (transient: Power Off renders
                              the safe-off-style screen)
     fwUpdateBlocked: boolean (W5 only, set when user defers)
   ============================================================ */
(function () {
  if (typeof window === "undefined") return;

  // ============================================================
  // STATE
  // ============================================================
  var STORAGE_KEY = "ide.waterboard.v1";

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
      launcher: "stub"
    },
    {
      id: "stratoblitz",
      title: "Strato Blitz",
      sub: "Strategie multiplayer",
      mode: "online",
      availableOn: ["w4", "w5"],
      art: "strategy",
      launcher: "stub"
    },
    // W5 exclusive
    {
      id: "galaxy",
      title: "Star Galaxy VII",
      sub: "RPG multiplayer",
      mode: "online",
      availableOn: ["w5"],
      art: "rpg",
      launcher: "stub"
    },
    {
      id: "platformer",
      title: "Lemur Quest",
      sub: "Platforming aventură",
      mode: "single",
      availableOn: ["w3", "w4", "w5"],
      art: "lemur",
      launcher: "stub"
    },
    {
      id: "puzzle",
      title: "Cube Logica",
      sub: "Puzzle",
      mode: "single",
      availableOn: ["w3", "w4", "w5"],
      art: "puzzle",
      launcher: "stub"
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
  // BIOS-style. Looks like a low-level boot menu, NOT a
  // glossy console UI: black background, monospace, plain
  // borders, no shadows or gradients. The user is still in
  // the BIOS payload selection moment, not in any OS yet.
  //
  // opts.lockedFrom : variant currently installed; if present,
  //                   variants other than the current+newer
  //                   are gated with a "BIOS LOCKED" reason.
  // ============================================================
  function showConsolePicker(opts) {
    teardownAll();
    var root = makeRoot();
    var lockedFrom = (opts && opts.lockedFrom) || null;
    var ranks = { w3: 0, w4: 1, w5: 2 };
    function isLocked(v) {
      if (!lockedFrom) return false;
      // Cannot reach an OS older than the one currently
      // installed without a full reflash. Also cannot
      // reinstall the same one (would no-op).
      return ranks[v] <= ranks[lockedFrom];
    }
    var rows = [
      {
        v: "w3",
        name: "Waterboard 3",
        kind: "ICE Legacy Series",
        tagline: "PS2-era. Cumpărați jocul, îl porniți. Fără verificări.",
        size: "47 MB"
      },
      {
        v: "w4",
        name: "Waterboard 4",
        kind: "ICE Modern Series",
        tagline: "Verificare disc la fiecare lansare. Multiplayer cu abonament.",
        size: "1.2 GB"
      },
      {
        v: "w5",
        name: "Waterboard 5",
        kind: "ICE Premium Series",
        tagline: "Cont obligatoriu. Actualizări forțate. Restricții regionale.",
        size: "4.8 GB"
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
        (locked ? '<div class="wbp-row-locked-note">BIOS LOCKED</div>' : "") +
        "</div>" +
        "</div>"
      );
    }).join("");
    root.innerHTML =
      '<div class="wbp">' +
      '<div class="wbp-titlebar">gdx-net.local : payload-select 0.4 : tty0</div>' +
      '<div class="wbp-inner">' +
      '<pre class="wbp-banner">' +
      "GDX-APPLIANCE-A04 / coreboot-4.22-gdx\n" +
      "Mainboard via/epia-ln, BIOS region 524288 bytes\n" +
      "SPI write-protect: DISABLED, Supervisor: NOT INSTALLED\n" +
      "Selectati un payload de incarcat:" +
      "</pre>" +
      '<div class="wbp-rows">' + rowsHtml + "</div>" +
      (lockedFrom
        ? '<div class="wbp-note">' +
          "Imaginea curent instalata (" + (lockedFrom === "w4" ? "Waterboard 4" : "Waterboard 5") + ") a setat protectia SPI la Enabled si a scris o parola supervizor. " +
          "Imaginile mai vechi nu pot fi instalate fara o procedura completa de reflash a coreboot." +
          "</div>"
        : "") +
      '<div class="wbp-footer">' +
      "Selectia este permanenta in sesiunea curenta. Resetul fabricii necesita reflash hardware al coreboot." +
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
  // Brief simulated payload flash. Per-variant log lines
  // surface the satire framing right from boot. The same
  // BIOS-style chrome as the picker.
  // ============================================================
  function installVariant(variant) {
    teardownAll();
    var root = makeRoot();
    var brandName = variantName(variant);
    root.innerHTML =
      '<div class="wbp">' +
      '<div class="wbp-titlebar">gdx-net.local : install-' + variant + ' : tty0</div>' +
      '<div class="wbp-inner">' +
      '<pre class="wbp-banner">' +
      "Installing " + brandName + " payload to /storage..." +
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
        [600,  "[FS]   Mounting /storage  ... OK"],
        [1100, "[NET]  Bringing up eth0   ... OK"],
        [1700, "[GAME] Indexing /storage/games (5 titluri)"],
        [2400, "[USER] Nu este necesar niciun cont pe aceasta platforma."],
        [3100, "[DRM]  Subsistem DRM:  absent (intentionat)."],
        [3800, "[OK]   Sistem gata in 3.8s."]
      ];
    } else if (variant === "w4") {
      script = [
        [0,    "[BOOT] Init kernel WB4-9.51.0 (signed by ICE)..."],
        [500,  "[SEC]  Verifying secure-boot chain ... OK"],
        [900,  "[BIOS] Setting flash write-protect to Enabled."],
        [1300, "[BIOS] Writing supervisor password (random 32 bytes)."],
        [1700, "[NET]  Bringing up eth0  ... OK"],
        [2200, "[NET]  Connecting to wb4-auth.intercal.com ... OK"],
        [2700, "[ACCT] Free Account detected. WB Plus: NOT ACTIVE."],
        [3300, "[DRM]  Loading optical-disc handshake module ... OK"],
        [3900, "[GAME] Indexing /storage/games (7 titluri, 5 necesita disc)"],
        [4500, "[OK]   Sistem gata in 4.5s."]
      ];
    } else {
      script = [
        [0,    "[BOOT] Init kernel WB5-3.10 (signed by ICE)..."],
        [500,  "[SEC]  Verifying secure-boot chain ... OK"],
        [900,  "[BIOS] Setting flash write-protect to Enabled."],
        [1300, "[BIOS] Writing supervisor password (random 32 bytes)."],
        [1700, "[NET]  Bringing up eth0  ... OK"],
        [2100, "[NET]  Connecting to wb5-auth.intercal.com ... OK"],
        [2500, "[ACCT] No ICE account associated. Account creation required at first boot."],
        [3000, "[REG]  Region check: RO (Romania) ... 12 titles flagged as restricted."],
        [3500, "[DRM]  Loading optical-disc handshake module ... OK"],
        [4000, "[FW]   Checking for mandatory firmware updates ... 2 pending."],
        [4500, "[GAME] Indexing /storage/games (8 titluri, 6 necesita disc)"],
        [5000, "[OK]   Sistem gata in 5.0s."]
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
        var s = {
          variant: variant,
          installedAt: Date.now(),
          subscribed: false,
          account: null,
          biosLocked: variant !== "w3",
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
      // W3 doesn't lock the BIOS; user can switch freely.
      // We reset the variant + show the picker.
      resetState();
      showConsolePicker();
      return;
    }
    var bd = document.createElement("div");
    bd.className = "wb-friction-bd";
    bd.innerHTML =
      '<div class="wb-friction">' +
      '<div class="wb-friction-title">BIOS blocat de sistemul de operare</div>' +
      '<div class="wb-friction-body">' +
      "<p>" + variantName(variant) + " a setat protecția SPI a plăcii de bază la <strong>Enabled</strong> și a scris o parolă supervizor BIOS la prima pornire. Această protecție împiedică instalarea unei imagini de OS mai vechi sau diferit fără o procedură completă de reflash a coreboot.</p>" +
      '<p>Procedura de reflash este ireversibilă pentru sesiunea curentă: se vor șterge contul, abonamentele, salvările și starea de instalare a tuturor jocurilor. La final aparatul reîncepe procedura de selectare a payload-ului de la zero.</p>' +
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
          // Wipe waterboard + coreboot flash flag + bios overrides.
          // The page reload then drops the user back at QNX/Server
          // 2003, where they have to redo the whole BIOS unlock
          // chain to flash again.
          resetState();
          try {
            sessionStorage.removeItem("ide.coreboot.v1");
            sessionStorage.removeItem("ide.bios.v1");
          } catch (e) {}
          location.reload();
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
      '<div class="wbp-titlebar">gdx-net.local : powered-off : tty0</div>' +
      '<div class="wbp-inner wb-poff">' +
      '<pre class="wbp-banner">' +
      "Aparatul este oprit. Sistemul de operare " + variantName(variant) + " nu rulează." +
      "</pre>" +
      '<div class="wb-poff-actions">' +
      '<button class="wbp-btn wbp-btn-default" id="wbPoffOn">Power On</button>' +
      (variant === "w4" || variant === "w5"
        ? '<button class="wbp-btn" id="wbPoffReset">Reset BIOS la fabrica</button>'
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
          "Această procedură va șterge contul, abonamentele și starea de instalare a jocurilor. " +
          "Aparatul revine la BIOS-ul din fabrică Phoenix și va trebui să reflashați coreboot pentru a juca din nou. Continuați?"
        )) {
          resetState();
          try {
            sessionStorage.removeItem("ide.coreboot.v1");
            sessionStorage.removeItem("ide.bios.v1");
          } catch (e) {}
          location.reload();
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
    reset: function () { resetState(); }
  };
})();
