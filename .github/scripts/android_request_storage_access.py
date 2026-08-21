#!/usr/bin/env python3
"""Send the user straight to the "All files access" toggle for this app,
once, the first time it launches on Android 11+.

MANAGE_EXTERNAL_STORAGE (declared by android_storage_permissions.py) is a
"special" permission: Android deliberately has no ordinary runtime dialog
for it, and merely declaring it in the manifest does not make it appear
under the per-app Permissions list either — that list is populated by an
actual runtime permission *request*, and this one has no such call. The
only thing an app can do is open the system Settings screen for it, which
is what real file-manager-style apps do and is the closest thing Android
allows to "requesting" it. Without this the shared Documents/Downloads
vault locations stay permanently blocked with no way to unblock them short
of a user who already knows to dig through Settings by hand.

Guarded with a SharedPreferences flag so it fires once, not on every
launch — a writer who dismisses it should not be sent back every time they
open the app.

Like high_refresh_rate.py, this patches the MainActivity `tauri android
init` regenerates every run rather than committing one, inserting only
inside the existing onCreate — never guessing the rest of the class.
"""
import glob
import re
import sys

PATCH = """
    if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.R &&
        !android.os.Environment.isExternalStorageManager()) {
      val prefs = getSharedPreferences("writed_storage_access", android.content.Context.MODE_PRIVATE)
      if (!prefs.getBoolean("asked", false)) {
        prefs.edit().putBoolean("asked", true).apply()
        try {
          startActivity(android.content.Intent(
            android.provider.Settings.ACTION_MANAGE_APP_ALL_FILES_ACCESS_PERMISSION,
            android.net.Uri.parse("package:" + packageName)))
        } catch (e: Exception) {
          try {
            startActivity(android.content.Intent(android.provider.Settings.ACTION_MANAGE_ALL_FILES_ACCESS_PERMISSION))
          } catch (e2: Exception) { /* no Settings screen for this on this OEM — the in-app hint still explains it */ }
        }
      }
    }
"""


def main():
    matches = glob.glob(
        "src-tauri/gen/android/app/src/main/java/**/MainActivity.kt", recursive=True
    )
    if not matches:
        print("android_request_storage_access: MainActivity.kt not found — skipping")
        return 0

    path = matches[0]
    with open(path, encoding="utf-8") as f:
        src = f.read()

    if "writed_storage_access" in src:
        print("android_request_storage_access: patch already present — skipping")
        return 0

    m = re.search(r"class\s+MainActivity\s*:\s*TauriActivity\(\)\s*\{", src)
    if not m:
        print("android_request_storage_access: MainActivity does not extend TauriActivity() — skipping")
        return 0

    # Depth-count from the class's opening brace to find its real end, so
    # this only ever looks inside the actual class body.
    depth = 1
    i = m.end()
    while i < len(src) and depth > 0:
        if src[i] == "{":
            depth += 1
        elif src[i] == "}":
            depth -= 1
        i += 1
    class_body = src[m.end():i]

    oc = re.search(r"override\s+fun\s+onCreate\([^)]*\)\s*\{", class_body)
    if oc:
        # Land after super.onCreate(...) specifically, not right at the
        # method's opening brace: starting a Settings activity is safest
        # once the Activity has actually finished its own setup. Falls back
        # to right after the brace only if that call isn't found there.
        after_super = re.search(r"super\.onCreate\([^)]*\)\s*\n", class_body[oc.end():])
        insert_at = (m.end() + oc.end() + after_super.end()) if after_super else (m.end() + oc.end())
        patched = src[:insert_at] + PATCH + src[insert_at:]
    else:
        onc = (
            "\n  override fun onCreate(savedInstanceState: android.os.Bundle?) {\n"
            "    super.onCreate(savedInstanceState)\n" + PATCH + "  }\n"
        )
        patched = src[:m.end()] + onc + src[m.end():]

    with open(path, "w", encoding="utf-8") as f:
        f.write(patched)
    print("android_request_storage_access: patched " + path)
    return 0


if __name__ == "__main__":
    sys.exit(main())
