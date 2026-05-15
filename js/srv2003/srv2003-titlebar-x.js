/* ============================================================
   SERVER 2003 TITLE BAR CLOSE BUTTON
   The Server 2003 dialogs in this app each render their own
   <div class="dialog-header">title</div>, with no close button.
   Real Win32 dialogs always have an [X] in the title bar. Rather
   than touch every dialog's markup (22+ call sites), we enrich
   any Server 2003 dialog as it gets appended:

     - Wrap the existing header text in <span class="dialog-header-title">
       so the title remains an ellipsis-truncated flex child.
     - Append a small [X] button styled per srv2003-classic.css.
     - Wire its click to remove the closest .dialog-backdrop.

   The observer watches the entire subtree of document.body
   because several dialogs (Manage Server, Event Viewer) rebuild
   their inner markup on tab change with bd.innerHTML = ..., which
   replaces the .dialog-header element wholesale. A subtree
   observer catches those rebuilds and re-injects the [X].

   The injection is gated by STATE.prefs.dialogCloseStyle:
     'bar'   - default; do not inject the title-bar X. Users
               close via existing footer buttons (Cancel / OK /
               Close) or by clicking the backdrop.
     'frame' - inject the [X] in every title bar.

   Switching modes is exposed via two helpers on
   window.SRV2K3_TITLEBAR_X so the Properties dialog can
   re-apply the choice retroactively to already-open dialogs:
     enhanceAll()  - inject [X] in every existing dialog.
     stripAll()    - remove [X] from every existing dialog.

   The title-bar [X] uses U+2715 (heavy multiplication X) since
   the Marlett "r" glyph that real Windows uses for [X] won't
   render on most browsers without the proprietary font.
   ============================================================ */
(function () {
  if (typeof window === "undefined") return;

  // Read the current preference fresh on every call. STATE may
  // not exist when this script first loads, so guard.
  function shouldInject() {
    if (typeof window.STATE === "undefined") return false;
    var prefs = window.STATE.prefs;
    if (!prefs) return false;
    return prefs.dialogCloseStyle === "frame";
  }

  function injectInto(header, backdrop) {
    if (!header) return;
    if (header.querySelector(".dialog-x")) return; // already enhanced
    // Find or create the title text wrapper. The title may already
    // be wrapped from a previous enhance() call that survived; if
    // not, wrap the entire current contents.
    var titleSpan = header.querySelector(".dialog-header-title");
    if (!titleSpan) {
      var titleText = header.innerHTML;
      titleSpan = document.createElement("span");
      titleSpan.className = "dialog-header-title";
      titleSpan.innerHTML = titleText;
      header.innerHTML = "";
      header.appendChild(titleSpan);
    }
    var closeBtn = document.createElement("button");
    closeBtn.className = "dialog-x";
    closeBtn.setAttribute("type", "button");
    closeBtn.setAttribute("aria-label", "Închide");
    closeBtn.title = "Închide";
    closeBtn.textContent = "\u2715"; // heavy X
    closeBtn.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      backdrop.remove();
    });
    header.appendChild(closeBtn);
  }

  // A footer is "redundant" when it contains nothing but a single
  // close-equivalent button. In that case, with [X] mounted in the
  // title bar, the footer adds no information and just wastes
  // vertical space. We tag it with a class and let CSS hide it.
  // Detection: button with data-run-close attribute, OR data-close
  // attribute, OR text that exactly matches "Închide" / "Inchide" /
  // "Close" (case-insensitive). The footer must contain that one
  // button and nothing else interactive.
  function isFooterRedundant(footer) {
    if (!footer) return false;
    var buttons = footer.querySelectorAll("button");
    if (buttons.length !== 1) return false;
    var b = buttons[0];
    if (b.hasAttribute("data-run-close")) return true;
    if (b.hasAttribute("data-close")) return true;
    var txt = (b.textContent || "").trim().toLowerCase();
    if (txt === "închide" || txt === "inchide" || txt === "close") return true;
    return false;
  }
  function markFooterIfRedundant(backdrop) {
    var footers = backdrop.querySelectorAll(".dialog-footer");
    footers.forEach(function (f) {
      if (f.closest(".dialog-backdrop") !== backdrop) return;
      if (isFooterRedundant(f)) {
        f.classList.add("srv2k3-footer-redundant");
      } else {
        f.classList.remove("srv2k3-footer-redundant");
      }
    });
  }
  function unmarkFooters(backdrop) {
    var footers = backdrop.querySelectorAll(".dialog-footer");
    footers.forEach(function (f) {
      f.classList.remove("srv2k3-footer-redundant");
    });
  }

  function stripFrom(header) {
    if (!header) return;
    var x = header.querySelector(".dialog-x");
    if (x) x.remove();
  }

  function enhance(backdrop) {
    if (!backdrop || !backdrop.classList) return;
    if (!backdrop.className) return;
    if (!/srv2k3-/.test(backdrop.className)) return;
    if (!shouldInject()) return;
    var headers = backdrop.querySelectorAll(".dialog-header");
    headers.forEach(function (h) {
      if (h.closest(".dialog-backdrop") === backdrop) {
        injectInto(h, backdrop);
      }
    });
    // Hide the footer if it only contains a redundant close button.
    markFooterIfRedundant(backdrop);
  }

  function strip(backdrop) {
    if (!backdrop || !backdrop.classList) return;
    var headers = backdrop.querySelectorAll(".dialog-header");
    headers.forEach(stripFrom);
    // Restore the footer (it has the only close-equivalent button
    // available now).
    unmarkFooters(backdrop);
  }

  function enhanceAll() {
    document.querySelectorAll(".dialog-backdrop").forEach(enhance);
  }
  function stripAll() {
    document.querySelectorAll(".dialog-backdrop").forEach(strip);
  }

  // Public so the Properties dialog can call these on apply.
  window.SRV2K3_TITLEBAR_X = {
    enhanceAll: enhanceAll,
    stripAll: stripAll,
    enhance: enhance,
    strip: strip,
  };

  // ----------------------------------------------------------
  // OBSERVERS
  // childList + subtree on document.body catches both new
  // backdrops being appended AND existing backdrops having
  // their innerHTML replaced (the Manage Server / Event
  // Viewer tab-change pattern). On any mutation we re-scan
  // all current backdrops and enhance them; enhance() is
  // idempotent (skips if X already present) so running it
  // many times is cheap.
  //
  // We debounce with rAF so a burst of mutations during a
  // re-render only triggers one pass.
  // ----------------------------------------------------------
  function start() {
    enhanceAll();
    if (!document.body) return;
    var queued = false;
    function schedule() {
      if (queued) return;
      queued = true;
      requestAnimationFrame(function () {
        queued = false;
        enhanceAll();
      });
    }
    var obs = new MutationObserver(function () {
      schedule();
    });
    obs.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
