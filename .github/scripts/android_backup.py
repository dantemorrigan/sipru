#!/usr/bin/env python3
"""Turn on Android's Auto Backup so a reinstall restores the user's writing.

Writed. keeps its live data in the webview's localStorage, which lives in the
app's private data directory. Uninstalling an Android app deletes that
directory outright — which is how a reinstall used to wipe every project and
note. The vault (vault.js) writes a copy to a real folder, but Auto Backup is
the belt to that's braces: Google backs the data directory up to the user's
Drive and restores it automatically on the next install, with no action from
the user at all.

`tauri android init` regenerates gen/android on every CI run, so — like
high_refresh_rate.py — this patches the freshly generated manifest rather than
committing one.

android:allowBackup already defaults to true, so the important part here is
the rules files: they exclude the webview's caches (large, worthless in a
backup, and they can push the app past the 25 MB Auto Backup ceiling) while
keeping local storage, which is where the text actually is.

Conservative by design: if the manifest can't be found or already carries the
attributes, this prints a notice and exits 0 so the build carries on.
"""
import glob
import os
import re
import sys

# Two files because the attribute that controls this changed in Android 12:
# older releases read fullBackupContent, 12+ reads dataExtractionRules.
FULL_BACKUP_CONTENT = """<?xml version="1.0" encoding="utf-8"?>
<full-backup-content>
    <include domain="file" path="." />
    <exclude domain="file" path="app_webview/Default/Cache" />
    <exclude domain="file" path="app_webview/Default/Code Cache" />
    <exclude domain="file" path="app_webview/Default/GPUCache" />
    <exclude domain="file" path="cache" />
</full-backup-content>
"""

DATA_EXTRACTION_RULES = """<?xml version="1.0" encoding="utf-8"?>
<data-extraction-rules>
    <cloud-backup>
        <include domain="file" path="." />
        <exclude domain="file" path="app_webview/Default/Cache" />
        <exclude domain="file" path="app_webview/Default/Code Cache" />
        <exclude domain="file" path="app_webview/Default/GPUCache" />
        <exclude domain="file" path="cache" />
    </cloud-backup>
    <device-transfer>
        <include domain="file" path="." />
        <exclude domain="file" path="cache" />
    </device-transfer>
</data-extraction-rules>
"""


def main():
    matches = glob.glob("src-tauri/gen/android/app/src/main/AndroidManifest.xml")
    if not matches:
        print("android_backup: no generated AndroidManifest.xml — skipping")
        return 0
    manifest_path = matches[0]
    res_xml = os.path.join(os.path.dirname(manifest_path), "res", "xml")
    os.makedirs(res_xml, exist_ok=True)
    with open(os.path.join(res_xml, "backup_rules.xml"), "w", encoding="utf-8") as f:
        f.write(FULL_BACKUP_CONTENT)
    with open(os.path.join(res_xml, "data_extraction_rules.xml"), "w", encoding="utf-8") as f:
        f.write(DATA_EXTRACTION_RULES)

    with open(manifest_path, encoding="utf-8") as f:
        manifest = f.read()

    m = re.search(r"<application\b", manifest)
    if not m:
        print("android_backup: no <application> tag found — skipping")
        return 0

    wanted = {
        "android:allowBackup": "true",
        "android:fullBackupContent": "@xml/backup_rules",
        "android:dataExtractionRules": "@xml/data_extraction_rules",
    }
    insert = ""
    for attr, value in wanted.items():
        if re.search(r"\b%s\s*=" % re.escape(attr), manifest):
            print("android_backup: %s already set — leaving it alone" % attr)
            continue
        insert += '\n        %s="%s"' % (attr, value)

    if not insert:
        print("android_backup: manifest already configured")
        return 0

    at = m.end()
    manifest = manifest[:at] + insert + manifest[at:]
    with open(manifest_path, "w", encoding="utf-8") as f:
        f.write(manifest)
    print("android_backup: enabled Auto Backup on <application>")
    return 0


if __name__ == "__main__":
    sys.exit(main())
