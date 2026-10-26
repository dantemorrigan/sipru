#!/usr/bin/env python3
"""Install the Android shell: system-bar insets, keyboard height, haptics.

`tauri android init` regenerates gen/android on every CI run, so — like the
vault bridge — this is applied to the freshly generated MainActivity rather
than committed. It must run *after* android_vault.py: it extends the
`onWebViewCreate` override that script adds, instead of declaring a second.

What it gives the page (native.js on the other side):

* The app is drawn edge-to-edge, under the status bar and the gesture bar,
  but Chrome's WebView reports neither through env(safe-area-inset-*), so
  every header and toolbar sat on top of the clock and the gesture handle.
  The insets are measured here and pushed to the page in CSS pixels, with
  the keyboard height as a separate number.
* Status/navigation bar icon colour follows the app's theme.
* Haptics through View.performHapticFeedback — the system's own vibration
  constants, which need no VIBRATE permission and respect the phone's
  touch-feedback setting.

Fails the build instead of skipping when the structure is not the expected
one: an APK without it is an APK with a broken layout nobody notices.
"""
import glob
import sys

# Inserted inside the MainActivity class body, ahead of onWebViewCreate.
MEMBERS = r'''
  /* ---- Sipru. shell: system-bar insets, keyboard, haptics ---- */

  private fun sipruShellAttach(webView: android.webkit.WebView) {
    val shell = SipruShell(this, webView)
    webView.addJavascriptInterface(shell, "SipruAndroidShell")
    /* The WebView resizes a beat after the insets arrive (or not at all),
       and what the keyboard covers depends on its size right now. */
    webView.addOnLayoutChangeListener { _, _, _, _, _, _, _, _, _ -> shell.publish() }
    val decor = window.decorView
    androidx.core.view.ViewCompat.setOnApplyWindowInsetsListener(decor) { v, insets ->
      shell.onInsets(insets)
      /* read-only: hand the insets on exactly as the decor would have */
      androidx.core.view.ViewCompat.onApplyWindowInsets(v, insets)
    }
    androidx.core.view.ViewCompat.requestApplyInsets(decor)
  }

'''

CALL = "    sipruShellAttach(webView)\n"

# Appended at the end of the file, at top level.
SHELL = r'''

/* ============================================================
   Sipru. — the page's view of the phone.
   Exposed to JavaScript as window.SipruAndroidShell (native.js).
   ============================================================ */
class SipruShell(
  private val activity: android.app.Activity,
  private val webView: android.webkit.WebView
) {
  @Volatile private var json = "{\"top\":0,\"right\":0,\"bottom\":0,\"left\":0,\"ime\":0,\"kb\":0}"
  private var last: androidx.core.view.WindowInsetsCompat? = null

  /* Runs on the UI thread for every insets change (bars, cutout, keyboard). */
  fun onInsets(insets: androidx.core.view.WindowInsetsCompat) {
    last = insets
    publish()
  }

  /* Also runs whenever the WebView is laid out again. */
  fun publish() {
    val insets = last ?: return
    val bars = insets.getInsets(
      androidx.core.view.WindowInsetsCompat.Type.systemBars() or
        androidx.core.view.WindowInsetsCompat.Type.displayCutout()
    )
    val ime = insets.getInsets(androidx.core.view.WindowInsetsCompat.Type.ime()).bottom
    val density = activity.resources.displayMetrics.density
    fun css(px: Int): Int = Math.round(px / density)
    /* a raised keyboard covers the gesture bar, so nothing is left to clear */
    val bottom = if (ime > 0) 0 else bars.bottom
    /* How much of the WebView's own area the keyboard sits on *right now*.
       Zero once the WebView has already been resized to end above it —
       lifting the bottom bars by the keyboard's height as well put them a
       third of a screen too high, with the empty page showing below. */
    var covered = 0
    if (ime > 0) {
      val at = IntArray(2)
      webView.getLocationInWindow(at)
      val webBottom = at[1] + webView.height
      val imeTop = activity.window.decorView.height - ime
      covered = Math.max(0, webBottom - imeTop)
    }
    val next = "{\"top\":" + css(bars.top) + ",\"right\":" + css(bars.right) +
      ",\"bottom\":" + css(bottom) + ",\"left\":" + css(bars.left) +
      ",\"ime\":" + css(ime) + ",\"kb\":" + css(covered) + "}"
    if (next == json) return
    json = next
    webView.post {
      webView.evaluateJavascript(
        "window.__sipruInsets&&window.__sipruInsets(" + org.json.JSONObject.quote(next) + ")", null
      )
    }
  }

  @android.webkit.JavascriptInterface
  fun getInsets(): String = json

  /* Light bars = dark icons, for the app's light theme. */
  @android.webkit.JavascriptInterface
  fun setSystemBars(light: Boolean) {
    activity.runOnUiThread {
      val w = activity.window
      val c = androidx.core.view.WindowCompat.getInsetsController(w, w.decorView)
      c?.isAppearanceLightStatusBars = light
      c?.isAppearanceLightNavigationBars = light
      if (android.os.Build.VERSION.SDK_INT >= 29) w.isNavigationBarContrastEnforced = false
    }
  }

  /* HapticFeedbackConstants, by number so the newer ones compile against any
     compileSdk: 0 LONG_PRESS, 1 VIRTUAL_KEY, 3 KEYBOARD_TAP, 4 CLOCK_TICK,
     6 CONTEXT_CLICK, 12 GESTURE_START, 13 GESTURE_END, 16 CONFIRM, 17 REJECT,
     21 TOGGLE_ON, 22 TOGGLE_OFF, 24 SEGMENT_TICK. Each falls back to an
     older constant on a phone that predates it. */
  @android.webkit.JavascriptInterface
  fun haptic(kind: String) {
    val sdk = android.os.Build.VERSION.SDK_INT
    val c = when (kind) {
      "select" -> if (sdk >= 34) 24 else 4
      "impact" -> if (sdk >= 23) 6 else 1
      "on" -> if (sdk >= 34) 21 else if (sdk >= 23) 6 else 1
      "off" -> if (sdk >= 34) 22 else 4
      "success" -> if (sdk >= 30) 16 else if (sdk >= 23) 6 else 1
      "error", "danger" -> if (sdk >= 30) 17 else 0
      "start" -> if (sdk >= 30) 12 else 4
      "end" -> if (sdk >= 30) 13 else 4
      else -> 3
    }
    /* FLAG_IGNORE_VIEW_SETTING (1): the WebView's own switch is not the
       user's; the system-wide touch-feedback setting still applies. */
    webView.post { webView.performHapticFeedback(c, 1) }
  }
}
'''


def main():
    matches = glob.glob(
        "src-tauri/gen/android/app/src/main/java/**/MainActivity.kt", recursive=True
    )
    if not matches:
        print("android_shell: MainActivity.kt not found")
        return 1

    path = matches[0]
    with open(path, encoding="utf-8") as f:
        src = f.read()

    if "SipruAndroidShell" in src:
        print("android_shell: already present — skipping")
        return 0

    anchor = "override fun onWebViewCreate(webView: android.webkit.WebView) {"
    if anchor not in src or "sipruWebView = webView" not in src:
        print("android_shell: the vault bridge's onWebViewCreate was not found — "
              "run android_vault.py first")
        return 1

    # the member goes in right before the override that will call it
    start = src.index(anchor)
    line_start = src.rfind("\n", 0, start) + 1
    patched = src[:line_start] + MEMBERS + src[line_start:]

    marker = "sipruWebView = webView\n"
    at = patched.index(marker) + len(marker)
    patched = patched[:at] + CALL + patched[at:]

    with open(path, "w", encoding="utf-8") as f:
        f.write(patched + SHELL)
    print("android_shell: patched " + path)
    return 0


if __name__ == "__main__":
    sys.exit(main())
