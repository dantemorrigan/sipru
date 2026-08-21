#!/usr/bin/env python3
"""Declare storage permissions on the generated Android manifest.

Without any <uses-permission> in the manifest, the system Permissions screen
for the app has nothing to show — which is exactly what was reported: no
storage permission ever offered, and the shared Documents/Downloads vault
locations refusing every write under scoped storage.

Three permissions, each for a different Android era:
- READ/WRITE_EXTERNAL_STORAGE, capped with maxSdkVersion, are what pre-11
  devices actually check before touching shared storage.
- MANAGE_EXTERNAL_STORAGE ("All files access") is what 11+ needs for the
  shared Documents/Downloads vault locations; app-private storage (the
  "Хранилище приложения" option) never needed a permission at all and
  keeps working regardless of this.

MANAGE_EXTERNAL_STORAGE has no ordinary runtime dialog — it is granted from
Settings > Apps > Special app access > All files access, which is why this
alone does not turn the shared locations green; it only makes granting them
possible. Declaring it outside Google Play distribution carries none of the
store's review requirements.

Like android_backup.py, this patches the manifest `tauri android init`
regenerates every run rather than committing one, and is conservative: if
the manifest can't be found or already declares these, it prints a notice
and exits 0.
"""
import glob
import re
import sys

PERMISSIONS = [
    '<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" android:maxSdkVersion="32" />',
    '<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" android:maxSdkVersion="29" />',
    '<uses-permission android:name="android.permission.MANAGE_EXTERNAL_STORAGE" />',
]


def main():
    matches = glob.glob("src-tauri/gen/android/app/src/main/AndroidManifest.xml")
    if not matches:
        print("android_storage_permissions: no generated AndroidManifest.xml — skipping")
        return 0
    manifest_path = matches[0]
    with open(manifest_path, encoding="utf-8") as f:
        manifest = f.read()

    m = re.search(r"<application\b", manifest)
    if not m:
        print("android_storage_permissions: no <application> tag found — skipping")
        return 0

    insert = ""
    for perm in PERMISSIONS:
        name = re.search(r'android:name="([^"]+)"', perm).group(1)
        if re.search(r'<uses-permission\s+android:name="%s"' % re.escape(name), manifest):
            print("android_storage_permissions: %s already declared — leaving it alone" % name)
            continue
        insert += "\n    " + perm

    if not insert:
        print("android_storage_permissions: manifest already declares these")
        return 0

    at = m.start()
    manifest = manifest[:at] + insert.lstrip("\n") + "\n\n    " + manifest[at:]
    with open(manifest_path, "w", encoding="utf-8") as f:
        f.write(manifest)
    print("android_storage_permissions: declared storage permissions")
    return 0


if __name__ == "__main__":
    sys.exit(main())
