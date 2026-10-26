/* ============================================================
   Sipru. — native shell bridge (Android)

   Inside the Android app the page is drawn edge-to-edge, under the
   status bar and the gesture bar — but Chrome's WebView does not
   report those bars through env(safe-area-inset-*), so every header
   and toolbar sat on top of the clock and the gesture handle.

   The Kotlin shell (.github/scripts/android_shell.py) measures the
   system bars and the keyboard and hands them over here. They land
   as --sat / --sar / --sab / --sal on <html>, which ui.css and
   frame.css already read ahead of env(). It also receives the theme
   (for dark or light status icons) and plays the haptics.

   Outside the Android app none of this exists and the file is inert.
   ============================================================ */
(function () {
  var shell = window.SipruAndroidShell;
  var root = document.documentElement;
  var N = { available: !!shell, ime: 0 };
  window.SipruNative = N;

  function px(v) { return (Math.max(0, +v || 0)) + "px"; }

  var baseH = window.innerHeight;
  /* Without a keyboard the viewport height is the reference: if it has
     already shrunk by the keyboard's height the page needs no extra
     offset (the WebView resized itself); if not, the keyboard is sitting
     on top of it and the page has to lift its bottom bars by hand. */
  window.addEventListener("resize", function () { if (!N.ime) baseH = window.innerHeight; });

  /* How many px of the bottom of the page the keyboard covers that the
     viewport has not already given up. */
  N.keyboardOffset = function () {
    if (!N.ime) return 0;
    var lost = Math.max(0, baseH - window.innerHeight);
    return Math.max(0, Math.round(N.ime - lost));
  };

  function apply(i) {
    root.style.setProperty("--sat", px(i.top));
    root.style.setProperty("--sar", px(i.right));
    root.style.setProperty("--sab", px(i.bottom));
    root.style.setProperty("--sal", px(i.left));
    N.ime = Math.max(0, +i.ime || 0);
    root.classList.add("native-insets");
    try { window.dispatchEvent(new CustomEvent("sipru-insets", { detail: i })); } catch (e) {}
  }

  /* the shell pushes a fresh set whenever the bars or keyboard change */
  window.__sipruInsets = function (json) {
    try { apply(typeof json === "string" ? JSON.parse(json) : json); } catch (e) {}
  };

  N.haptic = function (kind) {
    if (!shell) return false;
    try { shell.haptic(kind); return true; } catch (e) { return false; }
  };

  if (!shell) return;

  try { apply(JSON.parse(shell.getInsets())); } catch (e) {}

  /* system bar icons follow the app's theme, not the phone's */
  function bars() {
    var light = root.getAttribute("data-theme") !== "dark";
    try { shell.setSystemBars(light); } catch (e) {}
  }
  bars();
  try { new MutationObserver(bars).observe(root, { attributes: true, attributeFilter: ["data-theme"] }); } catch (e) {}
})();
