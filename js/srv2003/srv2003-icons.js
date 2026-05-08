/* ============================================================
   SERVER 2003 ICONS
   All SVG icon helpers used by the Server 2003 desktop modules.
   Each helper returns a string of SVG markup. Exposed on window
   so the rest of the srv2003-* modules can use them without
   importing.

   Conventions:
   - svg(content, size) is the base wrapper. Default size 16.
   - windowsFlagSvg(size) is the canonical Windows flag, used in
     the Start menu, About dialog, shutdown screens, etc.
   - iconCp* are Control Panel applet icons (17 distinct designs).
   - iconCm* (no, not a category, most others are domain-named).
   ============================================================ */
(function() {
    function svg(content, size) {
        size = size || 16;
        return '<svg width="' + size + '" height="' + size +
            '" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
            content + '</svg>';
    }
    function windowsFlagSvg(size) {
        // Classic four-pane Windows flag with subtle perspective wave.
        // Drawn as four rectangles at canonical Windows colors: red,
        // green, blue, yellow. The skew transform on the SVG gives it
        // the iconic 2003-era flag perspective.
        size = size || 16;
        return '<svg width="' + size + '" height="' + size +
            '" viewBox="0 0 22 18" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
            '<g transform="skewY(-6) translate(0 1)">' +
            '<rect x="2" y="1"  width="8" height="6" fill="#dc3535"/>' +
            '<rect x="11" y="1" width="8" height="6" fill="#3aab3a"/>' +
            '<rect x="2" y="8"  width="8" height="6" fill="#3578d8"/>' +
            '<rect x="11" y="8" width="8" height="6" fill="#f3c220"/>' +
            '</g>' +
            '</svg>';
    }
    function iconNetwork() {
        return svg(
            '<rect x="2" y="9" width="5" height="4" fill="#c8c8c8" stroke="#404040" stroke-width="0.5"/>' +
            '<rect x="9" y="9" width="5" height="4" fill="#c8c8c8" stroke="#404040" stroke-width="0.5"/>' +
            '<line x1="4.5" y1="9" x2="4.5" y2="6" stroke="#404040" stroke-width="0.7"/>' +
            '<line x1="11.5" y1="9" x2="11.5" y2="6" stroke="#404040" stroke-width="0.7"/>' +
            '<line x1="4.5" y1="6" x2="11.5" y2="6" stroke="#404040" stroke-width="0.7"/>' +
            '<rect x="6" y="3" width="4" height="3" fill="#3aab3a"/>',
            14
        );
    }
    function iconShield() {
        return svg(
            '<path d="M8 1 L13 3 L13 8 Q13 12 8 14.5 Q3 12 3 8 L3 3 Z" fill="#3578d8" stroke="#1a3a78" stroke-width="0.6"/>' +
            '<path d="M5.5 8 L7.5 10 L11 6" stroke="#ffffff" stroke-width="1.4" fill="none"/>',
            14
        );
    }
    function iconTrayInfo() {
        // Pale gray speech-bubble with an "i" inside, used as the
        // dedicated non-network notification tray icon.
        return svg(
            '<path d="M2 3 L13 3 L13 10 L9 10 L7 13 L7 10 L2 10 Z" fill="#ffffff" stroke="#404040" stroke-width="0.6"/>' +
            '<circle cx="7.5" cy="5" r="0.7" fill="#0a246a"/>' +
            '<rect x="7" y="6.5" width="1" height="2.5" fill="#0a246a"/>',
            14
        );
    }
    // MMC toolbar arrows: blue Back / Forward / Up like real Windows
    // Server 2003 MMC (matches the IE 6 chevron style of that era).
    function iconArrowBack() {
        return svg(
            '<path d="M10 3 L4 8 L10 13 Z" fill="#3578d8"/>'
        );
    }
    function iconArrowForward() {
        return svg(
            '<path d="M6 3 L12 8 L6 13 Z" fill="#3578d8"/>'
        );
    }
    function iconArrowUp() {
        return svg(
            '<path d="M2 7 L7 7 L7 2 L9 2 L9 7 L14 7 L8 13 Z" fill="#a08020" stroke="#604010" stroke-width="0.4"/>'
        );
    }
    function iconTreeToggle() {
        // Collapsible tree icon, 3 stacked bars of decreasing length.
        return svg(
            '<rect x="2" y="3" width="12" height="2" fill="#404040"/>' +
            '<rect x="4" y="7" width="10" height="2" fill="#404040"/>' +
            '<rect x="6" y="11" width="8" height="2" fill="#404040"/>'
        );
    }
    function iconActionToggle() {
        // Right-side action pane indicator: vertical ribbon + handle.
        return svg(
            '<rect x="2" y="2" width="8" height="12" fill="#ffffff" stroke="#404040" stroke-width="0.6"/>' +
            '<rect x="11" y="2" width="3" height="12" fill="#a8c0e0" stroke="#404040" stroke-width="0.6"/>'
        );
    }
    function iconRefresh() {
        return svg(
            '<path d="M3 8 a5 5 0 0 1 9 -3 L13 3 L13 7 L9 7" fill="none" stroke="#1a8a3a" stroke-width="1.4"/>' +
            '<path d="M13 8 a5 5 0 0 1 -9 3 L3 13 L3 9 L7 9" fill="none" stroke="#1a8a3a" stroke-width="1.4"/>'
        );
    }
    function iconExport() {
        return svg(
            '<path d="M3 2 L10 2 L13 5 L13 14 L3 14 Z" fill="#ffffff" stroke="#404040" stroke-width="0.6"/>' +
            '<path d="M10 2 L10 5 L13 5" fill="#dfdfdf" stroke="#404040" stroke-width="0.4"/>' +
            '<rect x="5" y="9" width="6" height="0.8" fill="#3578d8"/>' +
            '<path d="M9 8 L11 9.4 L9 10.8" fill="#3578d8"/>'
        );
    }
    function iconHelp() {
        return svg(
            '<circle cx="8" cy="8" r="6" fill="#ffeb70" stroke="#a08020" stroke-width="0.6"/>' +
            '<text x="8" y="11" text-anchor="middle" font-family="Tahoma" font-size="9" font-weight="700" fill="#604010">?</text>'
        );
    }
    function iconConsoleRoot() {
        // The little MMC root icon, a tiny blue console window glyph.
        return svg(
            '<rect x="2" y="3" width="12" height="9" fill="#3578d8" stroke="#1a3a78" stroke-width="0.6"/>' +
            '<rect x="3" y="5" width="10" height="6" fill="#000000"/>' +
            '<rect x="4" y="6" width="2" height="0.8" fill="#80ff80"/>' +
            '<rect x="4" y="8" width="6" height="0.6" fill="#a0a0a0"/>',
            14
        );
    }
    function iconFolderShare() {
        // File Server Management snap-in icon, folder + hand under it.
        return svg(
            '<path d="M1 5 L5 5 L7 6 L15 6 L15 13 L1 13 Z" fill="#f0c870" stroke="#7a4a10" stroke-width="0.5"/>' +
            '<path d="M5 11 L8 9 L11 11 L13 11" fill="none" stroke="#7a4a10" stroke-width="0.7"/>',
            14
        );
    }
    function iconWebGlobe() {
        // Application Server Management snap-in icon, small globe.
        return svg(
            '<circle cx="8" cy="8" r="5.5" fill="#a8d8f0" stroke="#1a3a78" stroke-width="0.6"/>' +
            '<path d="M2.5 8 L13.5 8 M8 2.5 a 4 5.5 0 0 0 0 11 a 4 5.5 0 0 0 0 -11" fill="none" stroke="#1a3a78" stroke-width="0.5"/>' +
            '<path d="M3.5 5.5 L12.5 5.5 M3.5 10.5 L12.5 10.5" fill="none" stroke="#1a3a78" stroke-width="0.4"/>',
            14
        );
    }
    function iconHelpBook() {
        // Book with a question mark, Server 2003 Help and Support icon.
        return svg(
            '<path d="M2 3 L14 3 L14 13 L2 13 Z" fill="#1a3a78" stroke="#000000" stroke-width="0.6"/>' +
            '<path d="M2 3 L8 5 L14 3 L14 13 L8 11 L2 13 Z" fill="#3578d8" stroke="#000000" stroke-width="0.5"/>' +
            '<line x1="8" y1="5" x2="8" y2="11" stroke="#000000" stroke-width="0.4"/>' +
            '<text x="8" y="9.5" text-anchor="middle" font-family="Tahoma" font-size="6" font-weight="700" fill="#ffffff">?</text>'
        );
    }

    // ============================================================
    // CONTROL PANEL APPLET ICONS
    // 17 distinct SVGs matching real Server 2003 Control Panel.
    // Each icon is its own helper so we can reuse them elsewhere
    // (e.g., the System Properties window can pull iconCpSystem).
    // ============================================================
    function iconCpAddHardware() {
        // Expansion card with a plus sign, adding new hardware.
        return svg(
            '<rect x="2" y="4" width="9" height="9" fill="#3aab3a" stroke="#1a5a1a" stroke-width="0.6"/>' +
            '<rect x="3" y="5" width="7" height="6" fill="#000000"/>' +
            '<rect x="2" y="13" width="2" height="2" fill="#a08020"/>' +
            '<rect x="6" y="13" width="2" height="2" fill="#a08020"/>' +
            '<rect x="9" y="13" width="2" height="2" fill="#a08020"/>' +
            '<circle cx="13" cy="4" r="2.5" fill="#ffe580" stroke="#a08020" stroke-width="0.6"/>' +
            '<rect x="12.5" y="2.5" width="1" height="3" fill="#604010"/>' +
            '<rect x="11.5" y="3.5" width="3" height="1" fill="#604010"/>'
        );
    }
    function iconCpAddRemovePrograms() {
        // CD over a small box, install/uninstall.
        return svg(
            '<rect x="2" y="9" width="12" height="5" fill="#dfdfdf" stroke="#000000" stroke-width="0.6"/>' +
            '<circle cx="8" cy="6" r="4.5" fill="#a8c8e8" stroke="#1a3a78" stroke-width="0.6"/>' +
            '<circle cx="8" cy="6" r="1.4" fill="#ffffff" stroke="#1a3a78" stroke-width="0.4"/>' +
            '<path d="M5 4 a 3 2 0 0 1 6 0" fill="none" stroke="#ffffff" stroke-width="0.5"/>'
        );
    }
    function iconCpAdminTools() {
        // Wrench + hammer crossed (smaller version of iconAdminTools).
        return svg(
            '<g transform="rotate(45 8 8)">' +
            '<rect x="2.5" y="7.3" width="11" height="1.4" fill="#9a9a9a" stroke="#404040" stroke-width="0.3"/>' +
            '<circle cx="3" cy="8" r="1.6" fill="none" stroke="#404040" stroke-width="0.6"/>' +
            '</g>' +
            '<g transform="rotate(-45 8 8)">' +
            '<rect x="2.5" y="7.3" width="8" height="1.4" fill="#7a4a10"/>' +
            '<rect x="9.5" y="6.3" width="3.5" height="3.4" fill="#404040" stroke="#000000" stroke-width="0.3"/>' +
            '</g>'
        );
    }
    function iconCpDateTime() {
        // Analog clock face.
        return svg(
            '<circle cx="8" cy="8" r="6" fill="#ffffff" stroke="#000000" stroke-width="0.7"/>' +
            '<rect x="7.7" y="2.4" width="0.6" height="1.4" fill="#000000"/>' +
            '<rect x="12.2" y="7.7" width="1.4" height="0.6" fill="#000000"/>' +
            '<rect x="7.7" y="12.2" width="0.6" height="1.4" fill="#000000"/>' +
            '<rect x="2.4" y="7.7" width="1.4" height="0.6" fill="#000000"/>' +
            '<line x1="8" y1="8" x2="8" y2="4.5" stroke="#000000" stroke-width="0.8"/>' +
            '<line x1="8" y1="8" x2="11" y2="8" stroke="#000000" stroke-width="0.6"/>' +
            '<circle cx="8" cy="8" r="0.6" fill="#dc3535"/>'
        );
    }
    function iconCpDisplay() {
        // CRT monitor with a colorful image on screen.
        return svg(
            '<rect x="1.5" y="2" width="13" height="9" fill="#dfdfdf" stroke="#000000" stroke-width="0.6"/>' +
            '<rect x="2.5" y="3" width="11" height="7" fill="#3578d8"/>' +
            '<path d="M2.5 10 L6 6 L9 9 L11 7 L13.5 10 Z" fill="#1a8a3a"/>' +
            '<circle cx="11" cy="5" r="0.9" fill="#ffe580"/>' +
            '<rect x="6" y="11" width="4" height="2" fill="#c8c8c8" stroke="#000000" stroke-width="0.4"/>' +
            '<rect x="3.5" y="13" width="9" height="1.5" fill="#c8c8c8" stroke="#000000" stroke-width="0.4"/>'
        );
    }
    function iconCpFolderOptions() {
        // Folder with a small magnifying glass, folder view options.
        return svg(
            '<path d="M1 5 L6 5 L7.5 6 L15 6 L15 13 L1 13 Z" fill="#f0c870" stroke="#7a4a10" stroke-width="0.5"/>' +
            '<path d="M1 7 L15 7 L15 13 L1 13 Z" fill="#f7d890" stroke="#7a4a10" stroke-width="0.5"/>' +
            '<circle cx="11" cy="11" r="2.2" fill="#ffffff" stroke="#000000" stroke-width="0.7"/>' +
            '<line x1="12.5" y1="12.5" x2="14" y2="14" stroke="#000000" stroke-width="1.2"/>'
        );
    }
    function iconCpInternetOptions() {
        // Globe with a chain link beside it, IE / Internet Options.
        return svg(
            '<circle cx="6" cy="8" r="4.5" fill="#a8d8f0" stroke="#1a3a78" stroke-width="0.6"/>' +
            '<path d="M1.5 8 L10.5 8 M6 3.5 a 3 4.5 0 0 0 0 9 a 3 4.5 0 0 0 0 -9" fill="none" stroke="#1a3a78" stroke-width="0.5"/>' +
            '<rect x="9" y="9.5" width="2.5" height="2" fill="none" stroke="#a08020" stroke-width="1"/>' +
            '<rect x="11" y="11" width="2.5" height="2" fill="none" stroke="#a08020" stroke-width="1"/>'
        );
    }
    function iconCpMouse() {
        // PS/2 mouse with cable.
        return svg(
            '<path d="M5 4 Q8 2 11 4 L11 11 Q11 13 8 13 Q5 13 5 11 Z" fill="#dfdfdf" stroke="#000000" stroke-width="0.6"/>' +
            '<line x1="8" y1="4" x2="8" y2="7" stroke="#000000" stroke-width="0.5"/>' +
            '<line x1="6.5" y1="6" x2="9.5" y2="6" stroke="#000000" stroke-width="0.4"/>' +
            '<path d="M8 4 Q8 1 10 1" fill="none" stroke="#404040" stroke-width="0.6"/>'
        );
    }
    function iconCpNetwork() {
        // Two computers connected by a line, Network Connections.
        return svg(
            '<rect x="1" y="3" width="5" height="4" fill="#c8c8c8" stroke="#404040" stroke-width="0.5"/>' +
            '<rect x="1.5" y="3.4" width="4" height="3.2" fill="#3578d8"/>' +
            '<rect x="10" y="9" width="5" height="4" fill="#c8c8c8" stroke="#404040" stroke-width="0.5"/>' +
            '<rect x="10.5" y="9.4" width="4" height="3.2" fill="#3578d8"/>' +
            '<path d="M3.5 7 L3.5 9 L12.5 9" fill="none" stroke="#1a8a3a" stroke-width="0.7"/>'
        );
    }
    function iconCpPhoneModem() {
        // Telephone handset.
        return svg(
            '<path d="M3 4 Q3 2 5 2 L7 2 L8 4 L7 6 L9 8 L11 7 L13 8 L13 10 Q13 12 11 12 Q5 12 3 6 Z" fill="#1a3a78" stroke="#000000" stroke-width="0.6"/>'
        );
    }
    function iconCpPower() {
        // Power button, circle with notch.
        return svg(
            '<circle cx="8" cy="8.5" r="5.5" fill="none" stroke="#1a8a3a" stroke-width="1.4"/>' +
            '<rect x="7.2" y="2" width="1.6" height="5" fill="#1a8a3a"/>'
        );
    }
    function iconCpRegional() {
        // Flag and globe, Regional and Language Options.
        return svg(
            '<circle cx="6" cy="8" r="4.5" fill="#a8d8f0" stroke="#1a3a78" stroke-width="0.5"/>' +
            '<path d="M1.5 8 L10.5 8 M6 3.5 a 3 4.5 0 0 0 0 9 a 3 4.5 0 0 0 0 -9" fill="none" stroke="#1a3a78" stroke-width="0.4"/>' +
            '<rect x="11" y="2" width="0.6" height="12" fill="#404040"/>' +
            '<path d="M11.6 2 L15 3 L11.6 5 Z" fill="#dc3535" stroke="#7a1010" stroke-width="0.3"/>'
        );
    }
    function iconCpScheduledTasks() {
        // Calendar grid with a clock overlay.
        return svg(
            '<rect x="1.5" y="3" width="10" height="10" fill="#ffffff" stroke="#000000" stroke-width="0.6"/>' +
            '<rect x="1.5" y="3" width="10" height="2" fill="#3578d8"/>' +
            '<line x1="3.5" y1="2" x2="3.5" y2="4" stroke="#000000" stroke-width="0.6"/>' +
            '<line x1="9.5" y1="2" x2="9.5" y2="4" stroke="#000000" stroke-width="0.6"/>' +
            '<line x1="4" y1="7" x2="9" y2="7" stroke="#c0c0c0" stroke-width="0.3"/>' +
            '<line x1="4" y1="9" x2="9" y2="9" stroke="#c0c0c0" stroke-width="0.3"/>' +
            '<line x1="4" y1="11" x2="9" y2="11" stroke="#c0c0c0" stroke-width="0.3"/>' +
            '<circle cx="12" cy="11" r="3" fill="#ffffff" stroke="#000000" stroke-width="0.5"/>' +
            '<line x1="12" y1="11" x2="12" y2="9" stroke="#000000" stroke-width="0.5"/>' +
            '<line x1="12" y1="11" x2="13.5" y2="11" stroke="#000000" stroke-width="0.5"/>'
        );
    }
    function iconCpSounds() {
        // Speaker with sound waves.
        return svg(
            '<path d="M2 6 L5 6 L8 3 L8 13 L5 10 L2 10 Z" fill="#404040" stroke="#000000" stroke-width="0.5"/>' +
            '<path d="M10 5 Q12 8 10 11" fill="none" stroke="#3578d8" stroke-width="0.8"/>' +
            '<path d="M11.5 3 Q14.5 8 11.5 13" fill="none" stroke="#3578d8" stroke-width="0.7"/>'
        );
    }
    function iconCpSystem() {
        // Tower computer with a small exclamation badge.
        return svg(
            '<rect x="2" y="2" width="7" height="12" fill="#dfdfdf" stroke="#000000" stroke-width="0.6"/>' +
            '<rect x="3" y="3" width="5" height="2" fill="#3578d8"/>' +
            '<rect x="3" y="6" width="5" height="0.5" fill="#404040"/>' +
            '<rect x="3" y="7.5" width="5" height="0.5" fill="#404040"/>' +
            '<circle cx="5.5" cy="11" r="0.5" fill="#1a8a3a"/>' +
            '<circle cx="13" cy="4" r="2.5" fill="#3578d8" stroke="#1a3a78" stroke-width="0.5"/>' +
            '<text x="13" y="6" text-anchor="middle" font-family="Tahoma" font-size="3.5" font-weight="700" fill="#ffffff">i</text>'
        );
    }
    function iconCpUserAccounts() {
        // Two head silhouettes, user accounts.
        return svg(
            '<circle cx="6" cy="6" r="2.4" fill="#f0c8a8" stroke="#604010" stroke-width="0.5"/>' +
            '<path d="M2 14 Q2 10 6 10 Q10 10 10 14 Z" fill="#f0c8a8" stroke="#604010" stroke-width="0.5"/>' +
            '<circle cx="11" cy="5" r="2" fill="#dfb888" stroke="#604010" stroke-width="0.4"/>' +
            '<path d="M8 14 Q8 9 11 9 Q14 9 14 14 Z" fill="#dfb888" stroke="#604010" stroke-width="0.4"/>'
        );
    }
    function iconCpFirewall() {
        // Brick wall with a small flame in front of it.
        return svg(
            '<rect x="1.5" y="3" width="13" height="11" fill="#a85030" stroke="#604010" stroke-width="0.4"/>' +
            '<line x1="1.5" y1="6" x2="14.5" y2="6" stroke="#604010" stroke-width="0.4"/>' +
            '<line x1="1.5" y1="9" x2="14.5" y2="9" stroke="#604010" stroke-width="0.4"/>' +
            '<line x1="1.5" y1="12" x2="14.5" y2="12" stroke="#604010" stroke-width="0.4"/>' +
            '<line x1="5" y1="3" x2="5" y2="6" stroke="#604010" stroke-width="0.4"/>' +
            '<line x1="11" y1="3" x2="11" y2="6" stroke="#604010" stroke-width="0.4"/>' +
            '<line x1="3" y1="6" x2="3" y2="9" stroke="#604010" stroke-width="0.4"/>' +
            '<line x1="8" y1="6" x2="8" y2="9" stroke="#604010" stroke-width="0.4"/>' +
            '<line x1="13" y1="6" x2="13" y2="9" stroke="#604010" stroke-width="0.4"/>' +
            '<line x1="5" y1="9" x2="5" y2="12" stroke="#604010" stroke-width="0.4"/>' +
            '<line x1="11" y1="9" x2="11" y2="12" stroke="#604010" stroke-width="0.4"/>' +
            '<path d="M7 14 Q5 10 8 8 Q9 11 11 9 Q12 13 9 14 Z" fill="#ffd34d" stroke="#dc3535" stroke-width="0.4"/>'
        );
    }
    function iconCpAccessibility() {
        // Stylized human figure (the standard "person in motion" glyph)
        // matching the Windows accessibility-options icon.
        return svg(
            '<circle cx="8" cy="3.5" r="1.6" fill="#3578d8" stroke="#1a3a78" stroke-width="0.4"/>' +
            // Body
            '<path d="M5.5 6 L10.5 6 L10 11 L8.7 11 L8.7 14 L7.3 14 L7.3 11 L6 11 Z" fill="#3578d8" stroke="#1a3a78" stroke-width="0.4"/>' +
            // Outstretched arms suggesting motion
            '<path d="M5.5 6 L3 8 L3.5 9 L6 7" fill="#3578d8" stroke="#1a3a78" stroke-width="0.4"/>' +
            '<path d="M10.5 6 L13 8 L12.5 9 L10 7" fill="#3578d8" stroke="#1a3a78" stroke-width="0.4"/>'
        );
    }
    function iconDocument() {
        return svg(
            '<path d="M3 1 L10 1 L13 4 L13 15 L3 15 Z" fill="#ffffff" stroke="#000000" stroke-width="0.7"/>' +
            '<path d="M10 1 L10 4 L13 4" fill="#dfdfdf" stroke="#000000" stroke-width="0.7"/>' +
            '<line x1="5" y1="6" x2="11" y2="6" stroke="#3578d8" stroke-width="0.6"/>' +
            '<line x1="5" y1="8" x2="11" y2="8" stroke="#000000" stroke-width="0.5"/>' +
            '<line x1="5" y1="10" x2="11" y2="10" stroke="#000000" stroke-width="0.5"/>' +
            '<line x1="5" y1="12" x2="9" y2="12" stroke="#000000" stroke-width="0.5"/>'
        );
    }
    function iconCmd() {
        return svg(
            '<rect x="1" y="3" width="14" height="11" fill="#000000" stroke="#000000" stroke-width="0.5"/>' +
            '<text x="3" y="11" font-family="Lucida Console, monospace" font-size="6" fill="#c0c0c0" font-weight="700">C:\\</text>'
        );
    }
    function iconDoctor() {
        return svg(
            '<rect x="2" y="2" width="12" height="12" fill="#ffffff" stroke="#000000" stroke-width="0.7"/>' +
            '<rect x="6.5" y="3.5" width="3" height="9" fill="#dc3535"/>' +
            '<rect x="3.5" y="6.5" width="9" height="3" fill="#dc3535"/>'
        );
    }
    function iconChart() {
        return svg(
            '<rect x="2" y="2" width="12" height="12" fill="#ffffff" stroke="#000000" stroke-width="0.7"/>' +
            '<rect x="3.5" y="9" width="2" height="4" fill="#3aab3a"/>' +
            '<rect x="6.5" y="6" width="2" height="7" fill="#3aab3a"/>' +
            '<rect x="9.5" y="3.5" width="2" height="9.5" fill="#3aab3a"/>'
        );
    }
    function iconMonitor() {
        return svg(
            '<rect x="1.5" y="2" width="13" height="9" fill="#3578d8" stroke="#000000" stroke-width="0.6"/>' +
            '<rect x="2.5" y="3" width="11" height="7" fill="#a8c8e8"/>' +
            '<rect x="6" y="11" width="4" height="2" fill="#c8c8c8" stroke="#000000" stroke-width="0.4"/>' +
            '<rect x="3.5" y="13" width="9" height="1.5" fill="#c8c8c8" stroke="#000000" stroke-width="0.4"/>'
        );
    }
    function iconGear() {
        return svg(
            '<circle cx="8" cy="8" r="3.5" fill="#c8c8c8" stroke="#000000" stroke-width="0.6"/>' +
            '<circle cx="8" cy="8" r="1.6" fill="#000000"/>' +
            '<g stroke="#000000" stroke-width="1.2">' +
            '<line x1="8" y1="2" x2="8" y2="4"/>' +
            '<line x1="8" y1="12" x2="8" y2="14"/>' +
            '<line x1="2" y1="8" x2="4" y2="8"/>' +
            '<line x1="12" y1="8" x2="14" y2="8"/>' +
            '<line x1="3.5" y1="3.5" x2="5" y2="5"/>' +
            '<line x1="11" y1="11" x2="12.5" y2="12.5"/>' +
            '<line x1="12.5" y1="3.5" x2="11" y2="5"/>' +
            '<line x1="5" y1="11" x2="3.5" y2="12.5"/>' +
            '</g>'
        );
    }
    function iconKey() {
        return svg(
            '<circle cx="5" cy="8" r="3" fill="none" stroke="#c08020" stroke-width="1.4"/>' +
            '<rect x="7.5" y="7.2" width="6.5" height="1.6" fill="#c08020"/>' +
            '<rect x="11" y="8.8" width="1.4" height="2" fill="#c08020"/>' +
            '<rect x="13" y="8.8" width="1" height="2" fill="#c08020"/>'
        );
    }
    function iconControlPanel() {
        // Control Panel icon: a beige folder with three colored category
        // cards peeking out the top, like the actual Server 2003 Control
        // Panel folder.
        return svg(
            '<path d="M1 5 L6 5 L7.5 6 L15 6 L15 14 L1 14 Z" fill="#f0c870" stroke="#7a4a10" stroke-width="0.6"/>' +
            '<rect x="3"  y="2.5" width="3" height="3" fill="#3578d8" stroke="#1a3a78" stroke-width="0.4"/>' +
            '<rect x="6.5" y="2"   width="3" height="3.5" fill="#dc3535" stroke="#7a1010" stroke-width="0.4"/>' +
            '<rect x="10" y="2.5" width="3" height="3" fill="#3aab3a" stroke="#1a5a1a" stroke-width="0.4"/>' +
            '<path d="M1 7 L15 7 L15 14 L1 14 Z" fill="#f7d890" stroke="#7a4a10" stroke-width="0.6"/>'
        );
    }
    function iconAdminTools() {
        // Administrative Tools icon: a folder with crossed hammer +
        // wrench overlay, the canonical Server 2003 Admin Tools glyph.
        return svg(
            '<path d="M1 5 L6 5 L7.5 6 L15 6 L15 14 L1 14 Z" fill="#f0c870" stroke="#7a4a10" stroke-width="0.6"/>' +
            '<path d="M1 7 L15 7 L15 14 L1 14 Z" fill="#f7d890" stroke="#7a4a10" stroke-width="0.6"/>' +
            '<g transform="rotate(35 6 9.7)">' +
            '<rect x="3" y="9" width="6" height="1.4" fill="#7a4a10"/>' +
            '<rect x="2.5" y="8" width="3" height="2.6" fill="#404040" stroke="#000000" stroke-width="0.3"/>' +
            '</g>' +
            '<g transform="rotate(-35 10 10.1)">' +
            '<rect x="7" y="9.5" width="6" height="1.2" fill="#9a9a9a" stroke="#404040" stroke-width="0.3"/>' +
            '<circle cx="12.5" cy="10.1" r="1.6" fill="none" stroke="#404040" stroke-width="0.6"/>' +
            '</g>'
        );
    }
    function iconRun() {
        return svg(
            '<rect x="2" y="3" width="12" height="9" fill="#ffffff" stroke="#000000" stroke-width="0.7"/>' +
            '<text x="3" y="10" font-family="Lucida Console, monospace" font-size="7" fill="#000000" font-weight="700">>_</text>'
        );
    }
    function iconInfo() {
        return svg(
            '<circle cx="8" cy="8" r="6.2" fill="#3578d8" stroke="#1a3a78" stroke-width="0.7"/>' +
            '<text x="8" y="11.5" font-family="Times, serif" font-size="9" fill="#ffffff" font-style="italic" font-weight="700" text-anchor="middle">i</text>'
        );
    }
    function iconLogoff() {
        return svg(
            '<path d="M5 4 L9 4 L9 12 L5 12 Z" fill="none" stroke="#000000" stroke-width="1"/>' +
            '<path d="M11 8 L8 5.5 L8 7 L4 7 L4 9 L8 9 L8 10.5 Z" fill="#3578d8" stroke="#1a3a78" stroke-width="0.4"/>'
        );
    }
    function iconPower() {
        return svg(
            '<circle cx="8" cy="8.5" r="5.5" fill="none" stroke="#000000" stroke-width="1.2"/>' +
            '<rect x="7.2" y="2" width="1.6" height="5" fill="#000000"/>'
        );
    }

    function iconRecycle() {
        return svg(
            '<path d="M3 5 L13 5 L12 14 L4 14 Z" fill="#c0c0c0" stroke="#404040" stroke-width="0.6"/>' +
            '<line x1="6" y1="7" x2="6" y2="12" stroke="#404040" stroke-width="0.6"/>' +
            '<line x1="8" y1="7" x2="8" y2="12" stroke="#404040" stroke-width="0.6"/>' +
            '<line x1="10" y1="7" x2="10" y2="12" stroke="#404040" stroke-width="0.6"/>' +
            '<rect x="2" y="3" width="12" height="2" fill="#a0a0a0" stroke="#404040" stroke-width="0.4"/>' +
            '<rect x="6" y="2" width="4" height="1.5" fill="#a0a0a0" stroke="#404040" stroke-width="0.4"/>'
        );
    }

    // Expose every helper on window so the other modules can call
    // them without an explicit import.
    window.svg = svg;
    window.windowsFlagSvg = windowsFlagSvg;
    window.iconNetwork = iconNetwork;
    window.iconShield = iconShield;
    window.iconTrayInfo = iconTrayInfo;
    window.iconArrowBack = iconArrowBack;
    window.iconArrowForward = iconArrowForward;
    window.iconArrowUp = iconArrowUp;
    window.iconTreeToggle = iconTreeToggle;
    window.iconActionToggle = iconActionToggle;
    window.iconRefresh = iconRefresh;
    window.iconExport = iconExport;
    window.iconHelp = iconHelp;
    window.iconConsoleRoot = iconConsoleRoot;
    window.iconFolderShare = iconFolderShare;
    window.iconWebGlobe = iconWebGlobe;
    window.iconHelpBook = iconHelpBook;
    window.iconCpAddHardware = iconCpAddHardware;
    window.iconCpAddRemovePrograms = iconCpAddRemovePrograms;
    window.iconCpAdminTools = iconCpAdminTools;
    window.iconCpDateTime = iconCpDateTime;
    window.iconCpDisplay = iconCpDisplay;
    window.iconCpFolderOptions = iconCpFolderOptions;
    window.iconCpInternetOptions = iconCpInternetOptions;
    window.iconCpMouse = iconCpMouse;
    window.iconCpNetwork = iconCpNetwork;
    window.iconCpPhoneModem = iconCpPhoneModem;
    window.iconCpPower = iconCpPower;
    window.iconCpRegional = iconCpRegional;
    window.iconCpScheduledTasks = iconCpScheduledTasks;
    window.iconCpSounds = iconCpSounds;
    window.iconCpSystem = iconCpSystem;
    window.iconCpUserAccounts = iconCpUserAccounts;
    window.iconCpFirewall = iconCpFirewall;
    window.iconCpAccessibility = iconCpAccessibility;
    window.iconDocument = iconDocument;
    window.iconCmd = iconCmd;
    window.iconDoctor = iconDoctor;
    window.iconChart = iconChart;
    window.iconMonitor = iconMonitor;
    window.iconGear = iconGear;
    window.iconKey = iconKey;
    window.iconControlPanel = iconControlPanel;
    window.iconAdminTools = iconAdminTools;
    window.iconRun = iconRun;
    window.iconInfo = iconInfo;
    window.iconLogoff = iconLogoff;
    window.iconPower = iconPower;
    window.iconRecycle = iconRecycle;
})();
