/* ============================================================
   COREBOOT REMOTE FLASH
   Final-act satire payoff. From Server 2003 BIOS Setup, the
   admin (full-snapshot session only) can clear the supervisor
   password + disable the firmware write-protect, which unlocks
   the hidden Firmware tab. From there the user PXE-boots to a
   remote bootstrap server, downloads the coreboot payload, and
   walks through eight stages that nuke the original Phoenix
   BIOS and write coreboot in its place. This is a one-way door:
   once flashed, all prior environments (Server 2003, the
   defaultuser exploit, the QNX kiosk) are gone permanently.

   This file owns:
     - The persisted state (sessionStorage 'ide.coreboot.v1')
     - isFlashed(), getState(), setState(), markFlashed()
     - The hardware schematic (renderSchematic + active-block API)
     - The 8-stage flash overlay (runFlashSequence)
     - The post-flash boot-up takeover (renderPostFlash)

   The BIOS module reads this file's helpers to gate the
   Firmware tab and to launch the flash overlay.
   ============================================================ */
(function () {
  if (typeof window === "undefined") return;

  var STORAGE_KEY = "ide.coreboot.v1";

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
  function isFlashed() {
    var s = loadState();
    return !!(s && s.flashed);
  }
  function getState() {
    return loadState() || { flashed: false };
  }
  function markFlashed() {
    saveState({
      flashed: true,
      flashedAt: Date.now(),
      payloadVersion: "coreboot-4.22-gdx",
    });
  }

  // ============================================================
  // HARDWARE SCHEMATIC
  // Schematic line-art of the GDX appliance mainboard. Three
  // levels of detail: blocks (CPU + chipset + SPI flash + RAM
  // + GbE + USB), buses (FSB, DMI, LPC, SPI, PCI), and chip
  // part numbers (mock VIA-era + Winbond, plausible for the
  // 2003-era kiosk hardware the satire models).
  //
  // renderSchematic(activeBlocks) returns an SVG string with
  // any block named in `activeBlocks` highlighted (yellow
  // stroke, slow pulse). Used during the flash sequence to
  // show which silicon is being touched at each stage.
  // ============================================================
  function renderSchematic(activeBlocks) {
    activeBlocks = activeBlocks || [];
    function active(name) {
      return activeBlocks.indexOf(name) >= 0 ? " arch-active" : "";
    }
    // viewBox 0 0 720 360. Origin top-left. Flat 1 px strokes,
    // monospace labels, mostly black-on-cream with the active
    // block accent color from CSS.
    return (
      '<svg viewBox="0 0 720 360" xmlns="http://www.w3.org/2000/svg" class="arch-svg" aria-label="GDX appliance mainboard schematic">' +
      // PCB outline
      '<rect x="6" y="6" width="708" height="348" fill="#f6f1e1" stroke="#000" stroke-width="1"/>' +
      // ===== CPU socket =====
      // Row 1: chips on y=44 to y=124, buses centered at y=84.
      '<g class="arch-block' + active("cpu") + '" data-arch="cpu">' +
      '<rect x="24" y="44" width="140" height="80" fill="none" stroke="#000" stroke-width="1.4"/>' +
      '<text x="94" y="62" text-anchor="middle" font-family="Lucida Console, Consolas, monospace" font-size="10" font-weight="700">U1 CPU</text>' +
      '<text x="94" y="82" text-anchor="middle" font-family="Lucida Console, Consolas, monospace" font-size="9">VIA C7-D</text>' +
      '<text x="94" y="96" text-anchor="middle" font-family="Lucida Console, Consolas, monospace" font-size="9">1.0 GHz</text>' +
      '<text x="94" y="110" text-anchor="middle" font-family="Lucida Console, Consolas, monospace" font-size="9">NanoBGA2</text>' +
      // Pin rows BELOW the CPU body (chip ends at y=124, pins go y=124 to y=130)
      '<g stroke="#000" stroke-width="0.5">' +
      '<line x1="34" y1="124" x2="34" y2="130"/><line x1="44" y1="124" x2="44" y2="130"/>' +
      '<line x1="54" y1="124" x2="54" y2="130"/><line x1="64" y1="124" x2="64" y2="130"/>' +
      '<line x1="74" y1="124" x2="74" y2="130"/><line x1="84" y1="124" x2="84" y2="130"/>' +
      '<line x1="94" y1="124" x2="94" y2="130"/><line x1="104" y1="124" x2="104" y2="130"/>' +
      '<line x1="114" y1="124" x2="114" y2="130"/><line x1="124" y1="124" x2="124" y2="130"/>' +
      '<line x1="134" y1="124" x2="134" y2="130"/><line x1="144" y1="124" x2="144" y2="130"/>' +
      '<line x1="154" y1="124" x2="154" y2="130"/>' +
      "</g>" +
      "</g>" +
      // ===== FSB bus, CPU(164,84) to NB(244,84) =====
      '<g class="arch-bus' + active("fsb") + '" data-arch="fsb">' +
      '<line x1="164" y1="80" x2="244" y2="80" stroke="#000" stroke-width="1.3"/>' +
      '<line x1="164" y1="88" x2="244" y2="88" stroke="#000" stroke-width="1.3"/>' +
      '<text x="204" y="74" text-anchor="middle" font-family="Lucida Console, Consolas, monospace" font-size="9">FSB 533 MHz</text>' +
      "</g>" +
      // ===== Northbridge =====
      '<g class="arch-block' + active("north") + '" data-arch="north">' +
      '<rect x="244" y="44" width="120" height="80" fill="none" stroke="#000" stroke-width="1.4"/>' +
      '<text x="304" y="62" text-anchor="middle" font-family="Lucida Console, Consolas, monospace" font-size="10" font-weight="700">U2 NB</text>' +
      '<text x="304" y="82" text-anchor="middle" font-family="Lucida Console, Consolas, monospace" font-size="9">VIA CN700</text>' +
      '<text x="304" y="96" text-anchor="middle" font-family="Lucida Console, Consolas, monospace" font-size="9">Northbridge</text>' +
      '<text x="304" y="110" text-anchor="middle" font-family="Lucida Console, Consolas, monospace" font-size="9">+ MC</text>' +
      "</g>" +
      // ===== DMI bus, NB(364,84) to SB(444,84) =====
      '<g class="arch-bus' + active("dmi") + '" data-arch="dmi">' +
      '<line x1="364" y1="80" x2="444" y2="80" stroke="#000" stroke-width="1.3"/>' +
      '<line x1="364" y1="88" x2="444" y2="88" stroke="#000" stroke-width="1.3"/>' +
      '<text x="404" y="74" text-anchor="middle" font-family="Lucida Console, Consolas, monospace" font-size="9">V-Link / DMI</text>' +
      "</g>" +
      // ===== Southbridge =====
      '<g class="arch-block' + active("south") + '" data-arch="south">' +
      '<rect x="444" y="44" width="120" height="80" fill="none" stroke="#000" stroke-width="1.4"/>' +
      '<text x="504" y="62" text-anchor="middle" font-family="Lucida Console, Consolas, monospace" font-size="10" font-weight="700">U3 SB</text>' +
      '<text x="504" y="82" text-anchor="middle" font-family="Lucida Console, Consolas, monospace" font-size="9">VIA VT8237R</text>' +
      '<text x="504" y="96" text-anchor="middle" font-family="Lucida Console, Consolas, monospace" font-size="9">Southbridge</text>' +
      "</g>" +
      // ===== PCI bus, SB(564,84) to ETH(624,84) =====
      '<g class="arch-bus' + active("pci") + '" data-arch="pci">' +
      '<line x1="564" y1="80" x2="624" y2="80" stroke="#000" stroke-width="1.3"/>' +
      '<line x1="564" y1="88" x2="624" y2="88" stroke="#000" stroke-width="1.3"/>' +
      '<text x="594" y="74" text-anchor="middle" font-family="Lucida Console, Consolas, monospace" font-size="9">PCI 33</text>' +
      "</g>" +
      // ===== Ethernet PHY, x=624 starts where PCI bus ends =====
      '<g class="arch-block' + active("eth") + '" data-arch="eth">' +
      '<rect x="624" y="44" width="80" height="80" fill="none" stroke="#000" stroke-width="1.4"/>' +
      '<text x="664" y="62" text-anchor="middle" font-family="Lucida Console, Consolas, monospace" font-size="10" font-weight="700">U8 NIC</text>' +
      '<text x="664" y="82" text-anchor="middle" font-family="Lucida Console, Consolas, monospace" font-size="9">VIA</text>' +
      '<text x="664" y="94" text-anchor="middle" font-family="Lucida Console, Consolas, monospace" font-size="9">VT6105M</text>' +
      '<text x="664" y="108" text-anchor="middle" font-family="Lucida Console, Consolas, monospace" font-size="8">10/100 PHY</text>' +
      "</g>" +
      // RJ-45 connector below the ETH block, connected by a short trace
      '<line x1="664" y1="124" x2="664" y2="138" stroke="#000" stroke-width="0.8"/>' +
      '<g class="arch-block' + active("eth") + '" data-arch="eth">' +
      '<rect x="640" y="138" width="48" height="22" fill="none" stroke="#000" stroke-width="1"/>' +
      '<text x="664" y="152" text-anchor="middle" font-family="Lucida Console, Consolas, monospace" font-size="8">J1 RJ-45</text>' +
      "</g>" +
      // ===== Vertical bus: Northbridge to RAM =====
      // NB bottom at y=124, RAM top at y=180. Bus runs x=304.
      '<g class="arch-bus' + active("ram") + '" data-arch="ram">' +
      '<line x1="304" y1="124" x2="304" y2="180" stroke="#000" stroke-width="1.3"/>' +
      '<text x="312" y="156" font-family="Lucida Console, Consolas, monospace" font-size="9">DDR-400</text>' +
      "</g>" +
      // ===== RAM DIMM, aligned under NB =====
      '<g class="arch-block' + active("ram") + '" data-arch="ram">' +
      '<rect x="244" y="180" width="120" height="40" fill="none" stroke="#000" stroke-width="1.2"/>' +
      '<text x="304" y="198" text-anchor="middle" font-family="Lucida Console, Consolas, monospace" font-size="10" font-weight="700">M1 SO-DIMM</text>' +
      '<text x="304" y="212" text-anchor="middle" font-family="Lucida Console, Consolas, monospace" font-size="9">512 MB DDR1-400</text>' +
      // Pins BELOW the DIMM body (chip ends at y=220, pins go to y=226)
      '<g stroke="#000" stroke-width="0.5">' +
      '<line x1="254" y1="220" x2="254" y2="226"/><line x1="264" y1="220" x2="264" y2="226"/>' +
      '<line x1="274" y1="220" x2="274" y2="226"/><line x1="284" y1="220" x2="284" y2="226"/>' +
      '<line x1="294" y1="220" x2="294" y2="226"/><line x1="304" y1="220" x2="304" y2="226"/>' +
      '<line x1="314" y1="220" x2="314" y2="226"/><line x1="324" y1="220" x2="324" y2="226"/>' +
      '<line x1="334" y1="220" x2="334" y2="226"/><line x1="344" y1="220" x2="344" y2="226"/>' +
      '<line x1="354" y1="220" x2="354" y2="226"/>' +
      "</g>" +
      "</g>" +
      // ===== Vertical bus: Southbridge to SPI flash =====
      // Drops from SB bottom-left (x=494, y=124) to SPI top (y=180).
      '<g class="arch-bus' + active("lpc") + '" data-arch="lpc">' +
      '<line x1="494" y1="124" x2="494" y2="180" stroke="#000" stroke-width="1.3"/>' +
      '<text x="486" y="156" text-anchor="end" font-family="Lucida Console, Consolas, monospace" font-size="9">LPC / SPI</text>' +
      "</g>" +
      // ===== SPI flash chip (the target of the flash) =====
      // SOIC-8 with pins on top and bottom, x=444-544 y=180-240.
      '<g class="arch-block' + active("spi") + '" data-arch="spi">' +
      // Pins on TOP (4 pins, going up from y=180 to y=174)
      '<g stroke="#000" stroke-width="0.6">' +
      '<line x1="460" y1="180" x2="460" y2="174"/>' +
      '<line x1="478" y1="180" x2="478" y2="174"/>' +
      '<line x1="510" y1="180" x2="510" y2="174"/>' +
      '<line x1="528" y1="180" x2="528" y2="174"/>' +
      "</g>" +
      '<rect x="444" y="180" width="100" height="60" fill="none" stroke="#000" stroke-width="1.4"/>' +
      '<text x="494" y="200" text-anchor="middle" font-family="Lucida Console, Consolas, monospace" font-size="10" font-weight="700">U7 BIOS</text>' +
      '<text x="494" y="216" text-anchor="middle" font-family="Lucida Console, Consolas, monospace" font-size="9">Winbond</text>' +
      '<text x="494" y="230" text-anchor="middle" font-family="Lucida Console, Consolas, monospace" font-size="9">W25Q64BV</text>' +
      // Pins on BOTTOM (4 pins, going down from y=240 to y=246)
      '<g stroke="#000" stroke-width="0.6">' +
      '<line x1="460" y1="240" x2="460" y2="246"/>' +
      '<line x1="478" y1="240" x2="478" y2="246"/>' +
      '<line x1="510" y1="240" x2="510" y2="246"/>' +
      '<line x1="528" y1="240" x2="528" y2="246"/>' +
      "</g>" +
      "</g>" +
      // ===== Vertical bus: Southbridge to USB =====
      // Drops from SB bottom-right (x=534, y=124) to USB top (y=180).
      '<g class="arch-bus' + active("usb") + '" data-arch="usb">' +
      '<line x1="534" y1="124" x2="534" y2="156" stroke="#000" stroke-width="1"/>' +
      '<line x1="534" y1="156" x2="620" y2="156" stroke="#000" stroke-width="1"/>' +
      '<line x1="620" y1="156" x2="620" y2="180" stroke="#000" stroke-width="1"/>' +
      '<text x="572" y="150" font-family="Lucida Console, Consolas, monospace" font-size="9">EHCI/OHCI</text>' +
      "</g>" +
      // ===== USB controller =====
      '<g class="arch-block' + active("usb") + '" data-arch="usb">' +
      '<rect x="560" y="180" width="120" height="60" fill="none" stroke="#000" stroke-width="1.4"/>' +
      '<text x="620" y="200" text-anchor="middle" font-family="Lucida Console, Consolas, monospace" font-size="10" font-weight="700">U9 USB</text>' +
      '<text x="620" y="216" text-anchor="middle" font-family="Lucida Console, Consolas, monospace" font-size="9">EHCI / OHCI</text>' +
      '<text x="620" y="230" text-anchor="middle" font-family="Lucida Console, Consolas, monospace" font-size="9">2x USB 2.0</text>' +
      "</g>" +
      // Bottom title strip, well clear of the chips
      '<g>' +
      '<line x1="20" y1="294" x2="700" y2="294" stroke="#000" stroke-width="0.5"/>' +
      '<text x="30" y="316" font-family="Lucida Console, Consolas, monospace" font-size="10" font-weight="700">GDX-APPLIANCE-A04</text>' +
      '<text x="30" y="332" font-family="Lucida Console, Consolas, monospace" font-size="9">REV 1.04 / GDX EDU SRL CT-2003</text>' +
      '<text x="500" y="332" font-family="Lucida Console, Consolas, monospace" font-size="9">SCALE: schematic, not to scale</text>' +
      "</g>" +
      "</svg>"
    );
  }

  // ============================================================
  // FLASH SEQUENCE OVERLAY
  // 8 stages plus a deliberate first-try mismatch on stage 3
  // (checksum) to force the user to back out, re-confirm WP,
  // and retry. The overlay locks the screen for the duration.
  //
  // Stages:
  //   1 PXE handshake (DHCP discover/offer/request/ack)
  //   2 TFTP download of coreboot-gdx.rom (~512 KB)
  //   3 SHA-256 verify (FAIL on first attempt)
  //   4 Architecture confirmation (live schematic, user clicks)
  //   5 Ring 0 entry (cli; wbinvd; mfence)
  //   6 Erase 8 SPI sectors
  //   7 Write payload + verify (chunked)
  //   8 Hot-reset, coreboot SeaBIOS POST animation
  //
  // After stage 8 the overlay calls markFlashed() and then
  // hands off to renderPostFlash() which is a takeover splash.
  // The actual post-flash environment lives in a separate
  // module to keep this file focused on the flash itself.
  // ============================================================
  function runFlashSequence() {
    if (document.getElementById("corebootFlashRoot")) return;
    // Hide everything else IMMEDIATELY by adding a body class that
    // sets all other surfaces (Server 2003 desktop, taskbar, QNX
    // kiosk, install animation, BIOS) to display:none. The flash
    // overlay then mounts on a clean black background and nothing
    // else can flicker through during the transition.
    document.body.classList.add("coreboot-flashing");
    var root = document.createElement("div");
    root.id = "corebootFlashRoot";
    root.className = "coreboot-flash";
    root.setAttribute("role", "dialog");
    root.setAttribute("aria-modal", "true");
    root.setAttribute("aria-label", "Flash coreboot");
    document.body.appendChild(root);

    // State across stages.
    var ctx = {
      attempt: 1,
      cancelled: false,
      sectorsErased: 0,
      bytesWritten: 0,
      totalBytes: 524288,
      payloadHash:
        "fa3c8f17c4be7b5a9c2d4e1f3a8b6c7d9e2f4a1b3c5d7e9f0a2b4c6d8e1f3a5",
    };

    var stages = [
      { id: 1, title: "Etapa 1 din 8: PXE", run: stagePxe },
      { id: 2, title: "Etapa 2 din 8: Descărcare TFTP", run: stageTftp },
      { id: 3, title: "Etapa 3 din 8: Verificare SHA-256", run: stageVerify },
      { id: 4, title: "Etapa 4 din 8: Confirmare arhitectura", run: stageConfirm },
      { id: 5, title: "Etapa 5 din 8: Intrare in Ring 0", run: stageRing0 },
      { id: 6, title: "Etapa 6 din 8: Stergere sectoare SPI", run: stageErase },
      { id: 7, title: "Etapa 7 din 8: Scriere si verificare", run: stageWrite },
      { id: 8, title: "Etapa 8 din 8: Hot-reset", run: stageReset },
    ];
    var stageIdx = 0;

    renderShell();
    runNextStage();

    function renderShell() {
      root.innerHTML =
        '<div class="cb-shell">' +
        '<div class="cb-titlebar">' +
        "GDX-APPLIANCE-A04 / FLASH FIRMWARE / coreboot 4.22-gdx" +
        "</div>" +
        '<div class="cb-body">' +
        '<div class="cb-pane cb-arch-pane" id="cbArchPane">' +
        '<div class="cb-arch-title">SCHEMATIC PLACA DE BAZA</div>' +
        '<div class="cb-arch-svg" id="cbArchSvg">' +
        renderSchematic([]) +
        "</div>" +
        '<div class="cb-arch-legend">' +
        "Blocurile cu marcaj turcoaz indica componentele citite sau scrise in stadiul curent." +
        "</div>" +
        "</div>" +
        '<div class="cb-pane cb-log-pane">' +
        '<div class="cb-stage-title" id="cbStageTitle">' +
        stages[0].title +
        "</div>" +
        '<div class="cb-log" id="cbLog"></div>' +
        '<div class="cb-action" id="cbAction"></div>' +
        "</div>" +
        "</div>" +
        "</div>";
    }
    function setActiveBlocks(blocks) {
      var holder = document.getElementById("cbArchSvg");
      if (holder) holder.innerHTML = renderSchematic(blocks);
    }
    function setStageTitle(t) {
      var el = document.getElementById("cbStageTitle");
      if (el) el.textContent = t;
    }
    function clearLog() {
      var el = document.getElementById("cbLog");
      if (el) el.innerHTML = "";
    }
    // Read the configured log level from the coreboot Setup
    // utility (waterboard module). Real coreboot ships
    // BIOS_LOG_LEVEL: messages tagged with a level above the
    // configured threshold are suppressed. Higher number = more
    // verbose. Default is NOTICE (5) when nothing is configured.
    var CB_LOG_LEVELS = {
      EMERG: 0, ALERT: 1, CRIT: 2, ERR: 3,
      WARNING: 4, NOTICE: 5, INFO: 6, DEBUG: 7, SPEW: 8
    };
    function configuredLogLevel() {
      try {
        var raw = sessionStorage.getItem("ide.coreboot.setup.v2");
        if (!raw) return 5;
        var cfg = JSON.parse(raw);
        var n = CB_LOG_LEVELS[cfg.log_level];
        return (typeof n === "number") ? n : 5;
      } catch (e) { return 5; }
    }
    var activeLogLevel = configuredLogLevel();
    function log(line, levelOrCls, cls) {
      // Backwards-compatible signature: existing callers pass
      // (line) or (line, cls). New callers pass
      // (line, level) or (line, level, cls). Detect by type.
      var level = 5;
      if (typeof levelOrCls === "number") {
        level = levelOrCls;
      } else if (typeof levelOrCls === "string") {
        cls = levelOrCls;
      }
      if (level > activeLogLevel) return;
      var el = document.getElementById("cbLog");
      if (!el) return;
      var d = document.createElement("div");
      d.className = "cb-log-line" + (cls ? " " + cls : "");
      d.textContent = line;
      el.appendChild(d);
      el.scrollTop = el.scrollHeight;
    }
    function setAction(html) {
      var el = document.getElementById("cbAction");
      if (el) el.innerHTML = html;
    }
    function clearAction() {
      setAction("");
    }
    function delay(ms) {
      return new Promise(function (res) {
        setTimeout(res, ms);
      });
    }
    function waitForButton(id) {
      return new Promise(function (res) {
        var b = document.getElementById(id);
        if (!b) return res(null);
        b.addEventListener("click", function () {
          res(b.value || true);
        }, { once: true });
      });
    }
    function abort(reason) {
      ctx.cancelled = true;
      log(reason, "cb-err");
      setAction(
        '<button class="cb-btn cb-btn-default" id="cbAbortClose">Închide</button>',
      );
      var b = document.getElementById("cbAbortClose");
      if (b) b.addEventListener("click", function () {
        // Drop the body class BEFORE removing the flash root.
        // The class hides every other body child via a CSS
        // rule; if we remove the root first and leave the
        // class on, the body has no visible children for one
        // frame and the user sees a flash of blank white.
        document.body.classList.remove("coreboot-flashing");
        root.remove();
      });
    }

    async function runNextStage() {
      if (ctx.cancelled) return;
      var s = stages[stageIdx];
      if (!s) return;
      setStageTitle(s.title);
      try {
        var result = await s.run();
        if (ctx.cancelled) return;
        if (result === "retry") {
          // Stage signaled "back out and retry from stage 1". Used
          // by the deliberate checksum mismatch on attempt 1.
          stageIdx = 0;
          ctx.attempt += 1;
          await delay(400);
          runNextStage();
          return;
        }
        if (result === "abort") {
          // User cancelled, hard stop.
          return abort("Operațiunea a fost anulată de utilizator.");
        }
        stageIdx += 1;
        await delay(150);
        runNextStage();
      } catch (e) {
        abort("Eroare neașteptată: " + (e && e.message ? e.message : e));
      }
    }

    // ---------- Stage 1: PXE handshake ----------
    async function stagePxe() {
      clearLog();
      clearAction();
      setActiveBlocks(["eth", "pci"]);
      // Honor live BIOS settings: if the on-board NIC is disabled
      // or the PXE option ROM is not loaded at POST, the PXE stack
      // can't talk to the bootstrap server. Fail with the same
      // error string a real PXE Boot Agent would print.
      var bios = (typeof window.STATE !== "undefined" && window.STATE.bios) || {};
      if (bios.onboardLan === "Disabled") {
        log("PXE-E51: NIC found, MAC 00:1b:fc:0a:42:7c");
        await delay(300);
        log("On-board LAN is Disabled in BIOS Setup.", "cb-err");
        log("PXE-E61: Media test failure, check cable.", "cb-err");
        log("", "");
        log("Re-enable Advanced > Onboard LAN in BIOS Setup.", "cb-warn");
        return await abortStage(
          'Conexiunea fizică la rețea este indisponibilă (NIC dezactivat).'
        );
      }
      if (bios.pxeRom === "Disabled") {
        log("PXE Option ROM is not loaded.", "cb-err");
        log("PXE-E55: ProxyDHCP service did not reply to request on port 4011.", "cb-err");
        log("", "");
        log("Re-enable Boot > PXE Option ROM in BIOS Setup.", "cb-warn");
        return await abortStage(
          'PXE Boot Agent nu a fost încărcat la POST.'
        );
      }
      log("PXE-E51: NIC found, MAC 00:1b:fc:0a:42:7c");
      log("  pci  0:18.0: VIA VT6105M Rhine III", 7);
      log("    config space: vendor=1106 device=3106 class=020000", 8);
      await delay(400);
      log("DHCP DISCOVER  --> 255.255.255.255");
      log("    xid=0xa1b2c3d4 secs=0 options=53,55,57", 8);
      await delay(450);
      log("DHCP OFFER    <-- 10.0.0.1  (gdx-net.local)");
      log("    siaddr=10.0.0.1 yiaddr=10.0.0.42 lease=86400", 7);
      await delay(350);
      log("DHCP REQUEST   --> 10.0.0.1");
      await delay(350);
      log("DHCP ACK       <-- 10.0.0.1  lease 86400 s");
      await delay(300);
      log("Client IP:    10.0.0.42");
      log("Next-server:  10.0.0.1");
      log("Boot file:    /tftp/coreboot-gdx.rom");
      await delay(450);
      log("Link is up at 100Mbit FullDuplex.", 5, "cb-ok");
    }

    // Helper used by stagePxe when a BIOS-disabled subsystem makes
    // the network unreachable. Surfaces an Abort button so the user
    // can close the flasher and go fix BIOS Setup.
    async function abortStage(reason) {
      setAction(
        '<button class="cb-btn cb-btn-default" id="cbAbortBack">Închide</button>',
      );
      return await new Promise(function (res) {
        document
          .getElementById("cbAbortBack")
          .addEventListener("click", function () {
            log(reason, "cb-err");
            res("abort");
          });
      });
    }

    // ---------- Stage 2: TFTP download ----------
    async function stageTftp() {
      clearLog();
      setActiveBlocks(["eth", "pci", "south"]);
      log("Opening TFTP RRQ tftp://10.0.0.1/coreboot-gdx.rom");
      log("    op=0x01 mode=octet blksize=1428 windowsize=8", 7);
      await delay(400);
      log("Block size negotiated: 1428 (window 8)");
      await delay(300);
      var total = 524288;
      var bytes = 0;
      var step = total / 22;
      for (var i = 0; i < 22; i++) {
        bytes += step;
        if (i % 3 === 0) {
          log(
            "  ... " +
              Math.floor(bytes / 1024) +
              " KB / 512 KB",
          );
        }
        // SPEW-level: per-block ACK trace
        log("    DATA block " + (i + 1) + " (" + Math.floor(step) + " B)  ACK", 8);
        await delay(120);
      }
      log("Transfer complete. 524288 bytes in 2.6 s.", 5, "cb-ok");
      log("    throughput: 202 KB/s  retransmissions: 0", 7);
      await delay(300);
    }

    // ---------- Stage 3: SHA-256 verify (deliberate first-try fail) ----------
    async function stageVerify() {
      clearLog();
      setActiveBlocks([]);
      log("Computing SHA-256 of the received payload...");
      log("    feed: 524288 bytes, block size 64 B, 8192 iterations", 7);
      log("    initial state H0..H7 from FIPS 180-4 §5.3.3", 8);
      await delay(700);
      log("Expected: " + ctx.payloadHash);
      await delay(300);
      // The flash is satirically reliable on this BIOS revision; we
      // don't do the deliberate first-attempt mismatch any more.
      log("Computed: " + ctx.payloadHash);
      await delay(400);
      log("SHA-256 OK.", 5, "cb-ok");
      await delay(300);
    }

    // ---------- Stage 4: architecture confirmation ----------
    async function stageConfirm() {
      clearLog();
      setActiveBlocks(["cpu", "north", "south", "spi"]);
      log("Detected hardware:");
      log("  CPU:   VIA C7-D 1.0 GHz (NanoBGA2)");
      log("  NB:    VIA CN700 + integrated MC, 533 MHz FSB");
      log("  SB:    VIA VT8237R (V-Link, LPC, PCI, 2x USB 2.0)");
      log("  RAM:   1x 512 MB DDR1-400 SO-DIMM");
      log("  Flash: Winbond W25Q64BV (8 MB SPI, 128 sectors x 64 KB)");
      log("  NIC:   VIA VT6105M (10/100, PCI)");
      await delay(400);
      log("");
      log("Coreboot payload built for: VIA EPIA-LN reference");
      log("   - matches CPU family (CentaurHauls family 6 model 13)");
      log("   - matches northbridge ID (8086:0501 / 1106:0259)");
      log("   - matches southbridge ID (1106:3227)");
      log("   - matches SPI flash JEDEC (EF 40 17)");
      await delay(300);
      log("Payload is compatible with this mainboard.", 5, "cb-ok");
      log("");
      // Detect whether this is a fresh flash (Phoenix BIOS still
      // resident) or a reflash (coreboot already installed). The
      // warning + confirmation copy differs: the first time the
      // user is destroying their factory firmware permanently;
      // on a reflash the existing coreboot region is just being
      // rewritten in place. Phoenix is no longer involved.
      var alreadyFlashed = isFlashed();
      if (alreadyFlashed) {
        log(
          "Note: coreboot 4.22-gdx is already resident in this region.",
          4, "cb-warn"
        );
        log(
          "The existing image will be erased and re-written with the",
          4, "cb-warn"
        );
        log("payload received in stage 2.", 4, "cb-warn");
      } else {
        log(
          "WARNING: continuing past this point will erase the original",
          4, "cb-warn"
        );
        log(
          "Phoenix BIOS. Once erased it cannot be restored from this",
          4, "cb-warn"
        );
        log("interface.", 4, "cb-warn");
      }
      setAction(
        '<button class="cb-btn cb-btn-default" id="cbConfirmFlash">' +
        (alreadyFlashed ? "Continuă cu reflash-ul" : "Continuă cu flash-ul") +
        '</button>' +
        '<button class="cb-btn" id="cbConfirmAbort">Anulează</button>',
      );
      var which = await new Promise(function (res) {
        document
          .getElementById("cbConfirmFlash")
          .addEventListener("click", function () {
            res("ok");
          });
        document
          .getElementById("cbConfirmAbort")
          .addEventListener("click", function () {
            res("abort");
          });
      });
      if (which === "abort") return "abort";
    }

    // ---------- Stage 5: ring 0 entry ----------
    async function stageRing0() {
      clearLog();
      clearAction();
      setActiveBlocks(["cpu"]);
      log("Suspending interrupts on all cores...");
      await delay(400);
      log("  cli");
      await delay(150);
      log("  mfence");
      await delay(150);
      log("  wbinvd          ; flush all caches");
      await delay(300);
      log("Disabling SMI delivery via SMI_EN[0] = 0...");
      await delay(400);
      log("Mapping SPI controller MMIO at fed1c000...");
      await delay(350);
      log("Ring 0 entered. Interrupts disabled.", "cb-ok");
      await delay(300);
    }

    // ---------- Stage 6: erase SPI sectors ----------
    async function stageErase() {
      clearLog();
      setActiveBlocks(["spi", "lpc", "south"]);
      log("Erasing 8 SPI flash sectors (4 KB each)...");
      log("Target region: 0x000000 - 0x07FFFF");
      log("    WREN sent, status reg: 0x02 (WEL set)", 7);
      await delay(300);
      var sectors = [
        "0x000000-0x00FFFF",
        "0x010000-0x01FFFF",
        "0x020000-0x02FFFF",
        "0x030000-0x03FFFF",
        "0x040000-0x04FFFF",
        "0x050000-0x05FFFF",
        "0x060000-0x06FFFF",
        "0x070000-0x07FFFF",
      ];
      for (var i = 0; i < sectors.length; i++) {
        if (ctx.cancelled) return "abort";
        log("  Erase " + sectors[i] + " ... ", "");
        log("    opcode 0x20 (SE), poll WIP every 25ms", 8);
        await delay(420 + Math.random() * 200);
        // Append OK to the last line
        var el = document.getElementById("cbLog");
        if (el && el.lastChild) {
          el.lastChild.textContent += "OK";
          el.lastChild.classList.add("cb-ok");
        }
        ctx.sectorsErased = i + 1;
      }
      await delay(250);
      log("All target sectors erased (FFh).", 5, "cb-ok");
      await delay(250);
    }

    // ---------- Stage 7: write payload + verify ----------
    async function stageWrite() {
      clearLog();
      setActiveBlocks(["spi", "lpc", "south", "cpu"]);
      log("Writing coreboot-gdx.rom to SPI flash @ 0x000000");
      log("Page size: 256 bytes, write enable latch each page.");
      log("    opcode 0x02 (PP), CS held low per page", 7);
      await delay(300);
      var pages = 0;
      var totalPages = 64;
      for (var i = 0; i < totalPages; i++) {
        if (ctx.cancelled) return "abort";
        pages = i + 1;
        if (i % 8 === 0) {
          log(
            "  Wrote " +
              pages +
              "/" +
              totalPages +
              " pages   (" +
              Math.floor((pages * 100) / totalPages) +
              "%)",
          );
        }
        // SPEW: per-page trace
        log("    page " + pages + " @0x" + (i * 0x2000).toString(16).padStart(6, "0").toUpperCase() + "  WIP cleared", 8);
        await delay(70);
      }
      await delay(300);
      log("Verifying written region...");
      await delay(500);
      log("  Read-back SHA-256 matches payload.", 5, "cb-ok");
      log("Write complete.", 5, "cb-ok");
      await delay(300);
    }

    // ---------- Stage 8: hot reset → SeaBIOS POST ----------
    async function stageReset() {
      clearLog();
      setActiveBlocks(["cpu", "north", "south", "spi", "ram"]);
      log("Issuing CF9h hot-reset...");
      await delay(400);
      log("System reset.");
      await delay(400);
      // Take over the screen entirely with a SeaBIOS POST.
      root.innerHTML =
        '<div class="cb-postscreen">' +
        '<pre class="cb-postscreen-text" id="cbPostText"></pre>' +
        "</div>";
      var pre = document.getElementById("cbPostText");
      var lines = [
        "coreboot-4.22-gdx Mon May 09 2026 14:22:08 starting...",
        "FMAP: area COREBOOT found @ 0 (524288 bytes)",
        "CBFS: master header loaded.",
        "BS: BS_PRE_DEVICE times (us): entry 0 run 12 exit 1",
        "Found mainboard via/epia-ln",
        "MTRR: Fixed MSRs init... done.",
        "MTRR: Variable MSRs to default state... done.",
        "POST: 0x39",
        "Enabling SMP and APIC...",
        "BS: BS_DEV_INIT_CHIPS times (us): entry 0 run 8920 exit 0",
        "BS: BS_DEV_ENUMERATE times (us): entry 0 run 6210 exit 0",
        "BS: BS_DEV_RESOURCES times (us): entry 0 run 1842 exit 0",
        "BS: BS_DEV_ENABLE times (us): entry 0 run 1108 exit 0",
        "BS: BS_DEV_INIT times (us): entry 0 run 11302 exit 0",
        "BS: BS_POST_DEVICE times (us): entry 0 run 41 exit 0",
        "POST: 0x79",
        "Welcome to SeaBIOS, last booting from",
        "  cbfs:fallback/payload",
        "POST: 0x80",
        "Press F12 for boot menu.",
        "Booting from Hard Disk...",
        "",
        "[ no operating system found on partition table ]",
        "[ this appliance has been wiped ]",
        "[ ready to receive a new OS image ]",
      ];
      var i = 0;
      function next() {
        if (i >= lines.length) {
          setTimeout(finish, 700);
          return;
        }
        pre.textContent += lines[i] + "\n";
        i += 1;
        setTimeout(next, 180 + Math.random() * 100);
      }
      next();
      function finish() {
        // After SeaBIOS finishes POST, commit the flash and hand
        // off directly to the post-flash takeover. We deliberately
        // do NOT insert a safe-off-style confirmation screen here:
        // the flash is complete, there is no Phoenix BIOS to
        // return to, and the new firmware boots straight into the
        // payload selector. The takeover is mandatory.
        markFlashed();
        if (typeof window.SRV2K3_COREBOOT_TAKEOVER === "function") {
          try {
            window.SRV2K3_COREBOOT_TAKEOVER();
            return;
          } catch (e) {}
        }
        renderPostFlashSplash();
      }
    }
  }

  // ============================================================
  // POST-FLASH PLACEHOLDER
  // Once flashed, the original Server 2003 / QNX / defaultuser
  // environment is gone. This is the temporary splash shown
  // until the proper post-flash environment lands in a
  // follow-up module. The splash documents that the appliance
  // is now firmware-free and waiting for a payload.
  //
  // The real environment (PS2-clone homebrew + a small playable
  // game) is a separate file that will register itself as
  // window.SRV2K3_COREBOOT_TAKEOVER and replace this splash.
  // ============================================================
  function renderPostFlashSplash() {
    // Tear down everything else.
    document.body.classList.remove("srv2003-desktop");
    document.body.classList.remove("srv2003-installing");
    document.body.classList.remove("has-su-taskbar");
    var ids = [
      "srv2003Taskbar",
      "srv2003StartMenu",
      "srv2003Icons",
      "srv2003InstallRoot",
      "suTaskbar",
      "suStartMenu",
      "biosSetup",
      "corebootFlashRoot",
    ];
    ids.forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.remove();
    });
    // Also remove any remaining backdrops.
    document.querySelectorAll(".dialog-backdrop").forEach(function (el) {
      el.remove();
    });
    var root = document.createElement("div");
    root.id = "corebootSplash";
    root.className = "coreboot-splash";
    root.innerHTML =
      '<div class="cb-splash-inner">' +
      '<div class="cb-splash-banner">coreboot</div>' +
      '<div class="cb-splash-sub">GDX-APPLIANCE-A04 / 4.22-gdx</div>' +
      '<div class="cb-splash-arch" id="cbSplashArch">' +
      renderSchematic([]) +
      "</div>" +
      '<div class="cb-splash-msg">' +
      "Phoenix BIOS a fost șters. Aparatura este liberă de programa analitică." +
      "<br><br>" +
      "Această sesiune nu mai poate executa Windows Server 2003 sau QNX. " +
      "Imaginea de recuperare a fost pierdută permanent în urma flash-ului. " +
      "Următorul pas: încărcarea unui sistem de tip consolă jocuri." +
      "</div>" +
      "</div>";
    document.body.appendChild(root);
  }

  // ============================================================
  // BOOT-TIME CHECK
  // If the appliance was flashed in a prior page life, restore
  // the post-flash splash before any other module mounts. This
  // is the hard one-way door: every other code path is bypassed.
  // ============================================================
  function checkBootTakeover() {
    if (!isFlashed()) return false;
    // Defer to DOM ready so document.body exists.
    function go() {
      if (typeof window.SRV2K3_COREBOOT_TAKEOVER === "function") {
        try {
          window.SRV2K3_COREBOOT_TAKEOVER();
          return;
        } catch (e) {}
      }
      renderPostFlashSplash();
    }
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", go);
    } else {
      go();
    }
    return true;
  }
  // ============================================================
  // URL PARAMETER OVERRIDE
  // Adds a debug shortcut: `?coreboot=<value>` lets a developer
  // skip past the Server 2003 + BIOS Setup + flash sequence and
  // land directly in any post-flash state. Applied BEFORE
  // checkBootTakeover() so the takeover picks up the writes.
  //
  // Supported values:
  //   flashed / 1 / picker    - coreboot present, picker shows
  //   w3                       - coreboot + Waterboard 3 active
  //   w4                       - coreboot + Waterboard 4 active + brick fuse W4
  //   w5                       - coreboot + Waterboard 5 active + brick fuse W5 + debug account
  //   bricked-w4               - coreboot + picker + brick fuse W4 (no variant installed)
  //   bricked-w5               - coreboot + picker + brick fuse W5
  //   reset / clear / 0        - wipe all coreboot/waterboard state
  // The parameter is applied on every page load. It is NOT
  // removed from the URL afterwards, so refreshing keeps the
  // same debug state. To return to the Server 2003 boot path,
  // load with `?coreboot=reset` once, then remove the param.
  // ============================================================
  function applyCorebootUrlParam() {
    var raw;
    try {
      raw = new URLSearchParams(location.search).get("coreboot");
    } catch (e) { return; }
    if (raw === null) return;
    var v = (raw === "" ? "flashed" : raw).toLowerCase();
    var WB_KEY    = "ide.waterboard.v1";
    var BRICK_KEY = "ide.nvram.brick.v1";
    var LAST_KEY  = "ide.waterboard.lastboot.v1";
    var SETUP_KEY = "ide.coreboot.setup.v2";
    function setFlashed() {
      saveState({
        flashed: true,
        flashedAt: Date.now(),
        payloadVersion: "coreboot-4.22-gdx",
      });
    }
    function setVariant(variant) {
      var state = { variant: variant };
      // W5 has a mandatory account gate at bootWaterboard; a
      // debug placeholder lets it through without showing the
      // account creation screen every page load.
      if (variant === "w5") {
        state.account = { name: "debug", region: "RO", createdAt: Date.now() };
      }
      try { sessionStorage.setItem(WB_KEY, JSON.stringify(state)); } catch (e) {}
      try { sessionStorage.setItem(LAST_KEY, variant); } catch (e) {}
    }
    function setBrick(variant) {
      try { sessionStorage.setItem(BRICK_KEY, variant); } catch (e) {}
    }
    function clearAll() {
      try {
        sessionStorage.removeItem(STORAGE_KEY);
        sessionStorage.removeItem(WB_KEY);
        sessionStorage.removeItem(BRICK_KEY);
        sessionStorage.removeItem(LAST_KEY);
        sessionStorage.removeItem(SETUP_KEY);
      } catch (e) {}
    }
    if (v === "reset" || v === "clear" || v === "0") {
      clearAll();
      return;
    }
    if (v === "flashed" || v === "1" || v === "picker") {
      setFlashed();
      return;
    }
    if (v === "w3") { setFlashed(); setVariant("w3"); return; }
    if (v === "w4") { setFlashed(); setVariant("w4"); setBrick("w4"); return; }
    if (v === "w5") { setFlashed(); setVariant("w5"); setBrick("w5"); return; }
    if (v === "bricked-w4") { setFlashed(); setBrick("w4"); return; }
    if (v === "bricked-w5") { setFlashed(); setBrick("w5"); return; }
    // Unknown value: silently ignored. The accepted values are
    // documented in the GDX debugger and Server 2003 help.
  }
  applyCorebootUrlParam();
  // Run synchronously on script load. Anything that runs after
  // (mountDesktop, etc.) checks the same flag and stays out.
  checkBootTakeover();

  // Public API.
  window.SRV2K3_COREBOOT = {
    isFlashed: isFlashed,
    getState: getState,
    markFlashed: markFlashed,
    runFlashSequence: runFlashSequence,
    renderSchematic: renderSchematic,
    renderPostFlashSplash: renderPostFlashSplash,
  };
})();
