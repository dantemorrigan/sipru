/* ============================================================
   Sipru. — feedback: haptics + sound, one table
   Every action that should be felt or heard has a name here
   ("tap", "success", "remove"…), and each name maps to one haptic
   and one sound (sound.js). Components never choose a pattern;
   they either do nothing (the delegated handlers below pick one
   from the element they pressed) or call SipruFx.play(name).

   Haptics: inside the Android app they are the system's own haptic
   constants (native.js → Kotlin), which feel like part of the phone
   and respect its touch-feedback setting. Elsewhere on a touch
   screen they fall back to navigator.vibrate. Mice get none.
   Sound: everywhere, quiet, and switched off from the profile.
   ============================================================ */
(function () {
  var COARSE = (function () {
    try { return window.matchMedia("(pointer: coarse)").matches; }
    catch (e) { return false; }
  })();

  /* name → [haptic kind, sound voice] */
  var FX = {
    tap:      ["tap",     "tap"],
    select:   ["select",  "select"],
    press:    ["impact",  "press"],
    on:       ["on",      "on"],
    off:      ["off",     "off"],
    success:  ["success", "success"],
    save:     ["impact",  "save"],
    create:   ["success", "create"],
    remove:   ["danger",  "remove"],
    warn:     ["tap",     "warn"],
    error:    ["error",   "error"],
    exported: ["success", "exported"],
    focusIn:  ["start",   "focusIn"],
    focusOut: ["end",     "focusOut"],
    undo:     ["select",  "undo"],
    redo:     ["select",  "redo"],
    page:     ["select",  "page"]
  };

  /* Web fallback durations — deliberately at the low end: a tap should
     read as texture under the finger, not as a buzz. */
  var VIBRATE = {
    tap: 8, select: 5, impact: 14, on: [6, 30, 10], off: [10, 30, 6],
    danger: [12, 40, 20], success: [10, 45, 16], error: [18, 50, 18, 50, 18],
    start: 9, end: 9
  };

  function prefs() {
    var u = null;
    try { u = window.SipruStore.get().user; } catch (e) {}
    return { sound: !u || u.sound !== false, haptics: !u || u.haptics !== false };
  }

  function hapticsAvailable() {
    var n = window.SipruNative;
    return !!(n && n.available) || (COARSE && !!navigator.vibrate);
  }

  var lastHaptic = 0;
  function haptic(kind) {
    if (!prefs().haptics) return;
    /* two inside one frame-ish window read as a single smear */
    var now = Date.now();
    if (now - lastHaptic < 40) return;
    lastHaptic = now;
    var n = window.SipruNative;
    if (n && n.available) { n.haptic(kind); return; }
    if (!COARSE) return;
    try { navigator.vibrate && navigator.vibrate(VIBRATE[kind] || VIBRATE.tap); } catch (e) {}
  }

  function sound(name) {
    if (!prefs().sound || !window.SipruSound) return;
    window.SipruSound.play(name);
  }

  function play(name) {
    var fx = FX[name];
    if (!fx) return;
    haptic(fx[0]);
    sound(fx[1]);
  }

  /* ---- toasts carry their meaning in their text ----
     The translated message of every result toast is mapped back to what
     it means (failed / exported / saved / removed / created), so one hook
     in the toast gives each action the right feedback. */
  var meaning = null;
  var MEANT = /(toast|^import_|^snap_(saved|restored|deleted)$|^vault_(restored|opened|backup_ok|restore_ok|restore_fail|unreadable|reveal_fail|not_saved_yet|none)$|^exp_(toast|err)_)/;
  function classify(key) {
    if (/(_err|err_|_fail|_full|unreadable|not_saved|^vault_none$)/.test(key)) return "error";
    if (/^exp_toast_|backup_dl|backup_ok/.test(key)) return "exported";
    if (/^snap_deleted$|toast_reset/.test(key)) return "remove";
    if (/toast_project_created|^import_ok$/.test(key)) return "create";
    if (/^snap_(saved|restored)$|toast_(name|avatar)|restore_ok|vault_restored/.test(key)) return "save";
    return "success";
  }
  function buildMeaning() {
    meaning = {};
    var keys = window.I18N_KEYS || [];
    ["ru", "en"].forEach(function (lang) {
      if (!window.T) return;
      var tl = window.T(lang);
      keys.forEach(function (k) {
        if (!MEANT.test(k)) return;
        var msg = tl(k);
        if (msg && !(msg in meaning)) meaning[msg] = classify(k);
      });
    });
  }
  function notify(msg) {
    if (!meaning) buildMeaning();
    play(meaning[msg] || "save");
  }

  /* ---- what a press means, from the element pressed ---- */
  var PRESSABLE = 'button, a, [role="button"], label, .card, .chap-row, .chap, .search-item, .switch, .seg-btn, .tool, .onb-lang-btn, .onb-theme, .tab';

  function nameFor(el) {
    var explicit = el.getAttribute("data-fx");
    if (explicit) return explicit;
    if (el.matches(".btn--danger")) return "remove";
    if (el.matches(".card-delete, .chap-del, .snap-del, .proj-delete-btn")) return "warn";
    if (el.matches(".btn--accent, .btn--solid, .bigaction")) return "press";
    if (el.matches(".seg-btn, .search-item, .tool, .modeswitch-b, .pset-seg-b, .pset-tab, .tab, .onb-lang-btn, .onb-theme")) return "select";
    if (el.matches(".card, .chap-row, .chap")) return "page";
    return "tap";
  }

  function target(e) {
    var el = e.target && e.target.closest && e.target.closest(PRESSABLE);
    if (!el || el.disabled || el.getAttribute("aria-disabled") === "true") return null;
    if (el.getAttribute("data-fx") === "off") return null;
    return el;
  }

  /* pointerdown, not click: the feedback has to land on the press, the way
     a physical key does. Passive — this never blocks the gesture. */
  var pressed = false;
  document.addEventListener("pointerdown", function (e) {
    var el = target(e);
    if (!el) return;
    pressed = true;
    /* a switch is felt for the state it lands in, which is known on click */
    if (el.matches(".switch")) return;
    play(nameFor(el));
  }, { capture: true, passive: true });

  document.addEventListener("click", function (e) {
    var el = target(e);
    if (!el) return;
    var fromPointer = pressed;
    pressed = false;
    if (el.matches(".switch")) {
      requestAnimationFrame(function () {
        var on = el.classList.contains("on") || el.getAttribute("aria-checked") === "true";
        play(on ? "on" : "off");
      });
      return;
    }
    /* Enter or Space on a focused button: no pointerdown came before it */
    if (!fromPointer && e.detail === 0) play(nameFor(el));
  }, { capture: true, passive: true });

  /* ---- something new exists ----
     Projects, chapters and notes are created from half a dozen places;
     rather than a call in each, the store is watched: exactly one more
     of them than a moment ago is a creation (an import or a restore
     adds many at once and stays quiet). */
  (function watchCreation() {
    var S = window.SipruStore;
    if (!S || !S.subscribe) return;
    function total() {
      try {
        var s = S.get(), n = s.projects.length + s.notes.length;
        for (var i = 0; i < s.projects.length; i++) n += s.projects[i].chapters.length;
        return n;
      } catch (e) { return 0; }
    }
    var seen = total();
    S.subscribe(function () {
      var now = total(), d = now - seen;
      seen = now;
      if (d === 1) play("create");
    });
  })();

  window.SipruFx = {
    play: play, notify: notify, haptic: haptic, sound: sound,
    hapticsAvailable: hapticsAvailable, names: Object.keys(FX), classify: classify
  };
  /* the previous name, kept for anything still calling it */
  window.SipruHaptics = { fire: function (name) { if (FX[name]) play(name); else haptic(name); } };
})();
