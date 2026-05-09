/* ============================================================
   SERVER 2003 TITLE BAR CLOSE BUTTON
   The Server 2003 dialogs in this app each render their own
   <div class="dialog-header">title</div>, with no close button.
   Real Win32 dialogs always have an [X] in the title bar. Rather
   than touch every dialog's markup (22+ call sites), we use a
   MutationObserver to enrich any Server 2003 dialog as it gets
   appended:

     - Wrap the existing header text in <span class="dialog-header-title">
       so the title remains an ellipsis-truncated flex child.
     - Append a [X] button styled per srv2003-classic.css.
     - Wire its click to remove the closest .dialog-backdrop.

   The observer only acts on backdrops whose className contains
   the srv2k3- prefix, so QNX dialogs (handled by their own QNX
   chrome) are untouched.

   The title-bar [X] uses U+2715 (heavy multiplication X) since
   the Marlett "r" glyph that real Windows uses for [X] won't
   render on most browsers without the proprietary font.
   ============================================================ */
(function () {
  if (typeof window === "undefined") return;

  function enhance(backdrop) {
    if (!backdrop.classList) return;
    if (!backdrop.className) return;
    if (!/srv2k3-/.test(backdrop.className)) return;
    var header = backdrop.querySelector(".dialog-header");
    if (!header) return;
    // Already enhanced if the close button is present.
    if (header.querySelector(".dialog-x")) return;
    // The original header content may be a mix of text + nested
    // tags. Wrap it all in a title span so flex layout puts the
    // [X] on the right.
    var titleText = header.innerHTML;
    var titleSpan = document.createElement("span");
    titleSpan.className = "dialog-header-title";
    titleSpan.innerHTML = titleText;
    header.innerHTML = "";
    header.appendChild(titleSpan);
    var closeBtn = document.createElement("button");
    closeBtn.className = "dialog-x";
    closeBtn.setAttribute("type", "button");
    closeBtn.setAttribute("aria-label", "Închide");
    closeBtn.title = "Închide";
    closeBtn.textContent = "\u2715"; // heavy X
    closeBtn.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      // The dialog markup uses two close conventions: explicit
      // [data-run-close] buttons inside footers (most Server
      // 2003 dialogs) and [data-close="someBackdropId"] (the
      // legacy IDE pattern). Either way, removing the
      // .dialog-backdrop closes the dialog.
      backdrop.remove();
    });
    header.appendChild(closeBtn);
  }

  // Pre-scan: any dialog already in the DOM at script-load time.
  // (Defense; in practice these scripts run before any dialog
  // is appended.)
  function scanExisting() {
    document.querySelectorAll(".dialog-backdrop").forEach(enhance);
  }

  // Observe future appends. Server 2003 dialogs are added to
  // document.body, so a single observer rooted there is enough.
  function start() {
    scanExisting();
    if (!document.body) return;
    var obs = new MutationObserver(function (mutations) {
      mutations.forEach(function (m) {
        m.addedNodes.forEach(function (node) {
          if (node.nodeType !== 1) return; // ELEMENT_NODE
          if (node.classList && node.classList.contains("dialog-backdrop")) {
            enhance(node);
          } else if (node.querySelectorAll) {
            // Some flows append a wrapper containing the dialog.
            node.querySelectorAll(".dialog-backdrop").forEach(enhance);
          }
        });
      });
    });
    obs.observe(document.body, { childList: true, subtree: false });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
