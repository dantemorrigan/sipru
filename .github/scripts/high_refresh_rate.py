#!/usr/bin/env python3
"""Ask Android for the display's highest refresh rate.

`tauri android init` regenerates gen/android on every CI run, so this patch is
applied to the freshly generated MainActivity rather than committed. Without it
the window keeps whatever mode the system picked by default, which on a number
of 90/120 Hz phones is the 60 Hz one; setting preferredRefreshRate lets the
webview animate and scroll at the panel's full rate.

Tauri's real generated MainActivity already has a body (it calls
enableEdgeToEdge() in onCreate), so this parses brace structure instead of
guessing the whole class text, and only ever inserts one line — it never
reconstructs class/method declarations. That keeps whatever else Tauri
generates (edge-to-edge, future additions) intact.

Deliberately conservative: if onCreate can't be located, this prints a notice
and exits 0 so the build carries on with the default refresh rate.
"""
import glob
import re
import sys

PATCH_LINE = (
    "    windowManager.defaultDisplay.supportedModes.maxByOrNull { it.refreshRate }"
    "?.let { window.attributes = window.attributes.apply { preferredRefreshRate = it.refreshRate } }\n"
)

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

m = re.search(r"class\s+MainActivity\s*:\s*TauriActivity\(\)\s*\{", src)
if not m:
    print("notice: MainActivity does not extend TauriActivity() — skipping")
    sys.exit(0)

# Find the class body's matching closing brace by depth-counting from the '{'
# `m` ended on, so this only ever looks *inside* the real class, never guesses
# its shape.
depth = 1
i = m.end()
while i < len(src) and depth > 0:
    if src[i] == "{":
        depth += 1
    elif src[i] == "}":
        depth -= 1
    i += 1
class_end = i
class_body = src[m.end():class_end]

oc = re.search(r"override\s+fun\s+onCreate\([^)]*\)\s*\{", class_body)
if oc:
    # Insert right after the existing onCreate's opening brace — before
    # whatever it already does (super.onCreate, enableEdgeToEdge, …) — so the
    # mode is set as early as possible without touching existing lines.
    insert_at = m.end() + oc.end()
    patched = src[:insert_at] + "\n" + PATCH_LINE + src[insert_at:]
else:
    # No onCreate at all: add a minimal one right inside the class body.
    onc = (
        "\n  override fun onCreate(savedInstanceState: android.os.Bundle?) {\n"
        "    super.onCreate(savedInstanceState)\n"
        + PATCH_LINE
        + "  }\n"
    )
    patched = src[:m.end()] + onc + src[m.end():]

open(path, "w", encoding="utf-8").write(patched)
print("patched " + path + " for adaptive refresh rate:\n")
print(patched)
