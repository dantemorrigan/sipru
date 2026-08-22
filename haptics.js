/* ============================================================
   Sipru. — haptics
   Short, quiet system vibrations on touch devices. Desktop and
   mice get nothing: the whole file no-ops unless the primary
   pointer is coarse.

   Delegated from the document, so components stay untouched —
   an element opts in by being a button/switch/card, or by
   carrying data-haptic="<pattern name>" to pick a stronger one.
   ============================================================ */
(function () {
  var COARSE = (function () {
    try { return window.matchMedia("(pointer: coarse)").matches; }
    catch (e) { return false; }
  })();

  /* Durations are deliberately at the low end — a tap should read as
     texture under the finger, not as a buzz. */
  var PATTERNS = {
    tap:     8,            // ordinary button / tool
    select:  5,            // switch, segmented control, list pick
    impact:  14,           // primary action (save, export, create)
    danger:  [12, 40, 20], // destructive confirm
    success: [10, 45, 16]  // completed action
  };

  var last = 0;
  function fire(name) {
    if (!COARSE) return;
    var p = PATTERNS[name] || PATTERNS.tap;
    /* Two taps inside one frame-ish window read as a single smear —
       drop the second rather than stacking motor time. */
    var now = Date.now();
    if (now - last < 40) return;
    last = now;
    var t = window.__TAURI__;
    if (t && t.haptics) {
      /* Tauri's plugin maps onto the platform's own haptic engine, which
         feels better than a raw motor pulse where it is available. */
      try {
        if (Array.isArray(p)) t.haptics.vibrate(p[0]);
        else if (name === "select") t.haptics.selectionFeedback();
        else t.haptics.impactFeedback(name === "impact" ? "medium" : "light");
        return;
      } catch (e) { /* fall through to the web API */ }
    }
    try { navigator.vibrate && navigator.vibrate(p); } catch (e) {}
  }

  if (!COARSE) { window.SipruHaptics = { fire: function () {} }; return; }

  var PRESSABLE = 'button, a, [role="button"], label, .card, .chap-row, .search-item, .switch, .seg-btn, .tool, .onb-lang-btn, .onb-theme';

  /* pointerdown, not click: the feedback has to land on the press, the
     way a physical key does. Passive — this never blocks the gesture. */
  document.addEventListener("pointerdown", function (e) {
    if (e.pointerType === "mouse") return;
    var el = e.target && e.target.closest && e.target.closest(PRESSABLE);
    if (!el || el.disabled) return;
    var explicit = el.getAttribute("data-haptic");
    if (explicit) return fire(explicit);
    if (el.matches(".switch, .seg-btn, .search-item, .tool")) return fire("select");
    if (el.matches(".btn--danger, .card-delete, .chap-del, .snap-del, .proj-delete-btn")) return fire("danger");
    if (el.matches(".btn--accent, .bigaction")) return fire("impact");
    fire("tap");
  }, { passive: true });

  window.SipruHaptics = { fire: fire };
})();
