#!/usr/bin/env python3
"""Ask Android for the display's highest refresh rate.

`tauri android init` regenerates gen/android on every CI run, so this patch is
applied to the freshly generated MainActivity rather than committed. Without it
the window keeps whatever mode the system picked by default, which on a number
of 90/120 Hz phones is the 60 Hz one; setting preferredRefreshRate lets the
webview animate and scroll at the panel's full rate.

Deliberately conservative: if the generated activity does not look the way we
expect, this prints a notice and exits 0 so the build carries on unchanged.
"""
import glob
import re
import sys

matches = glob.glob(
    "src-tauri/gen/android/app/src/main/java/**/MainActivity.kt", recursive=True
)
if not matches:
    print("notice: MainActivity.kt not found — skipping refresh-rate patch")
    sys.exit(0)

path = matches[0]
src = open(path, encoding="utf-8").read()

if "preferredRefreshRate" in src:
    print("notice: refresh-rate patch already present in " + path)
    sys.exit(0)

# The generated activity is a one-liner: `class MainActivity : TauriActivity()`
# (optionally followed by an empty body). Give it a body with an onCreate that
# opts into the fastest supported mode. supportedModes/preferredRefreshRate are
# both API 23+, and Tauri's minSdk is 24, so no version guard is needed.
body = """class MainActivity : TauriActivity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    val fastest = windowManager.defaultDisplay.supportedModes.maxByOrNull { it.refreshRate }
    if (fastest != null) {
      window.attributes = window.attributes.apply { preferredRefreshRate = fastest.refreshRate }
    }
  }
}"""

patched, n = re.subn(
    r"class\s+MainActivity\s*:\s*TauriActivity\(\)\s*(\{\s*\})?", body, src, count=1
)
if n == 0:
    print("notice: unexpected MainActivity shape — skipping refresh-rate patch")
    print(src)
    sys.exit(0)

if "import android.os.Bundle" not in patched:
    patched = re.sub(
        r"(^package .*\n)", r"\1\nimport android.os.Bundle\n", patched, count=1, flags=re.M
    )

open(path, "w", encoding="utf-8").write(patched)
print("patched " + path + " for adaptive refresh rate:\n")
print(patched)
