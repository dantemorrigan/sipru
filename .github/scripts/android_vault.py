#!/usr/bin/env python3
"""Inject the Android vault bridge (Storage Access Framework) into MainActivity.

The desktop vault is a plain folder the writer picks in a system dialog, and
everything about it — durability, visibility, portability — follows from that
one fact. Android has no path a Tauri filesystem API can hand us with the same
properties: app-private storage is deleted on uninstall, and raw writes to
/storage/emulated/0/Documents are refused by scoped storage no matter which
permission is declared.

SAF is the platform's actual answer, and it restores the desktop model exactly:
the writer grants one folder through the system picker, the grant is persisted
across reboots, and the files inside it are ordinary files in shared storage —
visible in Files, readable by any other editor, and untouched by an uninstall.
No permission is declared or requested for any of this.

This bridge gives vault.js the same seven filesystem calls it makes on desktop,
resolved against the granted tree. `tauri android init` regenerates gen/android
on every CI run, so the patch belongs here rather than in a committed source
file.

Unlike the scripts this replaces, a failure to patch exits non-zero: a build
that silently ships without the bridge is a build with no vault at all, which
is the exact failure this is here to end.
"""
import glob
import re
import sys

# Inserted inside the MainActivity class body.
MEMBERS = r'''
  /* ---- Sipru. vault (Storage Access Framework) ---- */

  private var sipruWebView: android.webkit.WebView? = null

  private fun sipruPicked(label: String) {
    val js = "window.__sipruVaultPicked(" + org.json.JSONObject.quote(label) + ")"
    sipruWebView?.post { sipruWebView?.evaluateJavascript(js, null) }
  }

  override fun onWebViewCreate(webView: android.webkit.WebView) {
    super.onWebViewCreate(webView)
    sipruWebView = webView
    webView.addJavascriptInterface(SipruVault(this) { sipruPicked(it) }, "SipruAndroidVault")
  }

  override fun onActivityResult(requestCode: Int, resultCode: Int, data: android.content.Intent?) {
    super.onActivityResult(requestCode, resultCode, data)
    if (requestCode != SipruVault.PICK) return
    val uri = if (resultCode == android.app.Activity.RESULT_OK) data?.data else null
    if (uri == null) { sipruPicked(""); return }
    try {
      /* Without this the grant dies with the Activity; with it the writer
         picks their folder once, and the app still has it after a reboot. */
      contentResolver.takePersistableUriPermission(
        uri,
        android.content.Intent.FLAG_GRANT_READ_URI_PERMISSION or
          android.content.Intent.FLAG_GRANT_WRITE_URI_PERMISSION
      )
      getSharedPreferences(SipruVault.PREFS, android.content.Context.MODE_PRIVATE)
        .edit().putString("tree", uri.toString()).apply()
      SipruVault.cache.clear()
      sipruPicked(SipruVault.labelOf(uri))
    } catch (e: Exception) {
      sipruPicked("")
    }
  }
'''

# Appended at the end of the file, at top level.
BRIDGE = r'''

/* ============================================================
   Sipru. — the vault's Android half.

   vault.js drives this with vault-relative paths ("Notes/Idea.md"); every
   method resolves one against the granted tree and answers the same shape
   the desktop Tauri filesystem API answers. Methods run on the WebView's
   JS-bridge thread, never the UI thread, so blocking I/O here is correct.
   ============================================================ */
internal class SipruVault(
  private val act: android.app.Activity,
  private val onPicked: (String) -> Unit
) {
  companion object {
    const val PICK = 0x57A1
    const val PREFS = "sipru_vault"

    /* parent document id -> (display name -> [document id, "d" | "f"]).
       SAF has no path lookup: every segment of every path costs a query
       without this. The app is the only writer, so our own mutations keep
       it honest, and it is dropped whole whenever a vault is opened. */
    val cache = java.util.concurrent.ConcurrentHashMap<String, java.util.HashMap<String, Array<String>>>()

    /* Display only — the writer should see where their book is, not a
       content:// URI. "primary:Documents/Sipru" reads back as the path
       the Files app shows for the same folder. */
    fun labelOf(tree: android.net.Uri): String {
      return try {
        val id = android.provider.DocumentsContract.getTreeDocumentId(tree)
        val i = id.indexOf(':')
        val vol = if (i < 0) id else id.substring(0, i)
        val rel = if (i < 0) "" else id.substring(i + 1)
        val base = if (vol == "primary") "/storage/emulated/0" else "/storage/" + vol
        if (rel.isEmpty()) base else base + "/" + rel
      } catch (e: Exception) { "" }
    }
  }

  private val cr: android.content.ContentResolver get() = act.contentResolver

  /* The saved tree, but only while the grant behind it still stands. An
     uninstall drops the grant and keeps the files, so this going empty is
     the app's cue to ask the writer to point at their folder again rather
     than to fail every write with a SecurityException. */
  private fun tree(): android.net.Uri? {
    val s = act.getSharedPreferences(PREFS, android.content.Context.MODE_PRIVATE)
      .getString("tree", null) ?: return null
    val u = android.net.Uri.parse(s)
    val held = cr.persistedUriPermissions.any {
      it.uri == u && it.isReadPermission && it.isWritePermission
    }
    return if (held) u else null
  }

  private fun docUri(t: android.net.Uri, id: String): android.net.Uri =
    android.provider.DocumentsContract.buildDocumentUriUsingTree(t, id)

  private fun kids(
    t: android.net.Uri,
    parentId: String,
    fresh: Boolean
  ): java.util.HashMap<String, Array<String>> {
    if (!fresh) cache[parentId]?.let { return it }
    val map = java.util.HashMap<String, Array<String>>()
    try {
      cr.query(
        android.provider.DocumentsContract.buildChildDocumentsUriUsingTree(t, parentId),
        arrayOf(
          android.provider.DocumentsContract.Document.COLUMN_DOCUMENT_ID,
          android.provider.DocumentsContract.Document.COLUMN_DISPLAY_NAME,
          android.provider.DocumentsContract.Document.COLUMN_MIME_TYPE
        ), null, null, null
      )?.use { c ->
        while (c.moveToNext()) {
          val id = c.getString(0)
          val name = c.getString(1)
          if (id == null || name == null) continue
          val dir = android.provider.DocumentsContract.Document.MIME_TYPE_DIR == c.getString(2)
          map[name] = arrayOf(id, if (dir) "d" else "f")
        }
      }
    } catch (e: Exception) { }
    cache[parentId] = map
    return map
  }

  private fun displayName(u: android.net.Uri): String? {
    return try {
      cr.query(
        u, arrayOf(android.provider.DocumentsContract.Document.COLUMN_DISPLAY_NAME),
        null, null, null
      )?.use { if (it.moveToFirst()) it.getString(0) else null }
    } catch (e: Exception) { null }
  }

  /* Providers rewrite names on create: they re-derive the extension from the
     mime type, and dedupe a collision to "name (1)". vault.js records the
     name it asked for in its own metadata, so anything but that name is a
     file it will never find again — force it back, and fail loudly if it
     will not hold rather than writing a chapter somewhere unreachable. */
  private fun create(
    t: android.net.Uri, parentId: String, name: String, mime: String
  ): Array<String>? {
    return try {
      val made = android.provider.DocumentsContract.createDocument(
        cr, docUri(t, parentId), mime, name
      ) ?: return null
      var id = android.provider.DocumentsContract.getDocumentId(made)
      var actual = displayName(made) ?: name
      if (actual != name) {
        val renamed = try {
          android.provider.DocumentsContract.renameDocument(cr, made, name)
        } catch (e: Exception) { null }
        if (renamed != null) {
          id = android.provider.DocumentsContract.getDocumentId(renamed)
          actual = displayName(renamed) ?: name
        } else {
          /* renameDocument may answer null on a rename it actually did. */
          val re = kids(t, parentId, true)[name]
          if (re != null) return re
        }
      }
      if (actual != name) return null
      val dir = mime == android.provider.DocumentsContract.Document.MIME_TYPE_DIR
      val entry = arrayOf(id, if (dir) "d" else "f")
      kids(t, parentId, false)[name] = entry
      entry
    } catch (e: Exception) { null }
  }

  /* Walks a vault-relative path to its document id, creating directories on
     the way when asked. "" is the vault root itself. */
  private fun resolve(t: android.net.Uri, rel: String, mkdirs: Boolean): String? {
    var id = android.provider.DocumentsContract.getTreeDocumentId(t)
    for (seg in rel.split('/')) {
      if (seg.isEmpty()) continue
      var hit = kids(t, id, false)[seg]
      if (hit == null && mkdirs) {
        hit = create(t, id, seg, android.provider.DocumentsContract.Document.MIME_TYPE_DIR)
      }
      if (hit == null) return null
      id = hit[0]
    }
    return id
  }

  private fun parentOf(rel: String): Pair<String, String> {
    val p = rel.trim('/')
    val i = p.lastIndexOf('/')
    return if (i < 0) Pair("", p) else Pair(p.substring(0, i), p.substring(i + 1))
  }

  /* Matched to the extension so the provider's own extension fixup is a
     no-op in both directions — it strips ".md" only to re-add it. */
  private fun mimeOf(name: String): String = when (name.substringAfterLast('.', "").lowercase()) {
    "md" -> "text/markdown"
    "json" -> "application/json"
    "txt" -> "text/plain"
    else -> "application/octet-stream"
  }

  /* ---- what vault.js calls ---- */

  @android.webkit.JavascriptInterface
  fun root(): String {
    val t = tree() ?: return ""
    return labelOf(t)
  }

  @android.webkit.JavascriptInterface
  fun refresh() { cache.clear() }

  @android.webkit.JavascriptInterface
  fun forget() {
    act.getSharedPreferences(PREFS, android.content.Context.MODE_PRIVATE)
      .edit().remove("tree").apply()
    cache.clear()
  }

  @android.webkit.JavascriptInterface
  fun pick() {
    act.runOnUiThread {
      val i = android.content.Intent(android.content.Intent.ACTION_OPEN_DOCUMENT_TREE)
      i.addFlags(
        android.content.Intent.FLAG_GRANT_READ_URI_PERMISSION or
          android.content.Intent.FLAG_GRANT_WRITE_URI_PERMISSION or
          android.content.Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION
      )
      /* Open the picker already standing in Documents, so the vault is one
         "create folder" away instead of a hunt through the whole device. */
      if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
        try {
          i.putExtra(
            android.provider.DocumentsContract.EXTRA_INITIAL_URI,
            android.net.Uri.parse(
              "content://com.android.externalstorage.documents/document/primary%3ADocuments"
            )
          )
        } catch (e: Exception) { }
      }
      try {
        act.startActivityForResult(i, PICK)
      } catch (e: Exception) {
        onPicked("")
      }
    }
  }

  @android.webkit.JavascriptInterface
  fun exists(rel: String): Boolean {
    val t = tree() ?: return false
    return resolve(t, rel, false) != null
  }

  @android.webkit.JavascriptInterface
  fun mkdirs(rel: String): Boolean {
    val t = tree() ?: return false
    return resolve(t, rel, true) != null
  }

  @android.webkit.JavascriptInterface
  fun read(rel: String): String? {
    val t = tree() ?: return null
    val id = resolve(t, rel, false) ?: return null
    return try {
      cr.openInputStream(docUri(t, id))?.use { it.readBytes().toString(Charsets.UTF_8) }
    } catch (e: Exception) { null }
  }

  @android.webkit.JavascriptInterface
  fun write(rel: String, text: String): Boolean {
    val t = tree() ?: return false
    val (dir, name) = parentOf(rel)
    if (name.isEmpty()) return false
    val parentId = resolve(t, dir, true) ?: return false
    var hit = kids(t, parentId, false)[name]
    /* A miss is the one case worth a fresh listing: creating a second file
       over one that is already there is how a vault grows "Chapter (1).md". */
    if (hit == null) hit = kids(t, parentId, true)[name]
    if (hit == null) hit = create(t, parentId, name, mimeOf(name))
    if (hit == null) return false
    return try {
      /* "wt" truncates. Plain "w" leaves the tail of a longer previous
         version in place, which on a shortened chapter is silent corruption. */
      val os = cr.openOutputStream(docUri(t, hit[0]), "wt") ?: return false
      os.use { it.write(text.toByteArray(Charsets.UTF_8)) }
      true
    } catch (e: Exception) { false }
  }

  @android.webkit.JavascriptInterface
  fun del(rel: String): Boolean {
    val t = tree() ?: return false
    val (dir, name) = parentOf(rel)
    val parentId = resolve(t, dir, false) ?: return false
    val hit = kids(t, parentId, false)[name] ?: return false
    return try {
      val ok = android.provider.DocumentsContract.deleteDocument(cr, docUri(t, hit[0]))
      if (ok) { kids(t, parentId, false).remove(name); cache.remove(hit[0]) }
      ok
    } catch (e: Exception) { false }
  }

  @android.webkit.JavascriptInterface
  fun move(src: String, dst: String): Boolean {
    val t = tree() ?: return false
    val (sDir, sName) = parentOf(src)
    val (dDir, dName) = parentOf(dst)
    val sParent = resolve(t, sDir, false) ?: return false
    val hit = kids(t, sParent, false)[sName] ?: return false
    val dParent = resolve(t, dDir, true) ?: return false
    if (kids(t, dParent, false)[dName] != null) return false   /* never clobber */
    return try {
      var u = docUri(t, hit[0])
      if (sParent != dParent) {
        u = android.provider.DocumentsContract.moveDocument(
          cr, u, docUri(t, sParent), docUri(t, dParent)
        ) ?: return false
      }
      if (dName != sName) {
        u = android.provider.DocumentsContract.renameDocument(cr, u, dName) ?: u
      }
      kids(t, sParent, false).remove(sName)
      /* A moved or renamed folder takes every document id under it with it,
         so drop the destination listing and the node's own subtree instead
         of trying to patch ids we can no longer predict. */
      cache.remove(dParent)
      cache.remove(hit[0])
      true
    } catch (e: Exception) { false }
  }

  @android.webkit.JavascriptInterface
  fun list(rel: String): String {
    val t = tree() ?: return ""
    val id = resolve(t, rel, false) ?: return ""
    val arr = org.json.JSONArray()
    for ((name, v) in kids(t, id, true)) {
      arr.put(org.json.JSONObject().put("name", name).put("dir", v[1] == "d"))
    }
    return arr.toString()
  }

  /* Tauri's opener plugin does not implement revealItemInDir on Android.
     DocumentsUI opens at a directory document; a file is shown by opening
     the folder that holds it. */
  @android.webkit.JavascriptInterface
  fun reveal(rel: String): Boolean {
    val t = tree() ?: return false
    return try {
      val (dir, name) = parentOf(rel)
      val parentId = resolve(t, dir, false)
      val self = if (parentId == null) null else kids(t, parentId, false)[name]
      /* DocumentsUI opens at a folder, so a file is shown by opening the
         one that holds it. Anything we cannot place falls back to the
         vault root, which is never wrong, only less specific. */
      val id = when {
        self != null && self[1] == "d" -> self[0]
        parentId != null -> parentId
        else -> android.provider.DocumentsContract.getTreeDocumentId(t)
      }
      val view = android.net.Uri.parse(
        "content://" + t.authority + "/document/" + android.net.Uri.encode(id)
      )
      act.runOnUiThread {
        val i = android.content.Intent(android.content.Intent.ACTION_VIEW)
        i.setDataAndType(view, "vnd.android.document/directory")
        i.addFlags(android.content.Intent.FLAG_GRANT_READ_URI_PERMISSION)
        try {
          act.startActivity(i)
        } catch (e: Exception) {
          try {
            val p = android.content.Intent(android.content.Intent.ACTION_OPEN_DOCUMENT_TREE)
            p.putExtra(android.provider.DocumentsContract.EXTRA_INITIAL_URI, t)
            act.startActivity(p)
          } catch (e2: Exception) { }
        }
      }
      true
    } catch (e: Exception) { false }
  }
}
'''


def main():
    matches = glob.glob(
        "src-tauri/gen/android/app/src/main/java/**/MainActivity.kt", recursive=True
    )
    if not matches:
        print("android_vault: MainActivity.kt not found")
        return 1

    path = matches[0]
    with open(path, encoding="utf-8") as f:
        src = f.read()

    if "SipruAndroidVault" in src:
        print("android_vault: bridge already present — skipping")
        return 0

    if "onWebViewCreate" in src:
        print("android_vault: MainActivity already overrides onWebViewCreate — "
              "the bridge would collide with it")
        return 1

    # Tauri's generated MainActivity has a body today, but the template has
    # shipped as a bodiless `class MainActivity : TauriActivity()` before.
    # Handle both rather than silently no-op'ing on the one we don't expect.
    # The \s* lives inside the optional group on purpose: letting it run
    # outside would swallow the newline after a bodiless declaration and
    # append the body one line too late, as an orphan block.
    m = re.search(r"class\s+MainActivity\s*:\s*TauriActivity\(\)(?:\s*(\{))?", src)
    if not m:
        print("android_vault: MainActivity does not extend TauriActivity()")
        return 1

    if m.group(1):
        patched = src[:m.end()] + MEMBERS + src[m.end():]
    else:
        patched = src[:m.end()] + " {\n" + MEMBERS + "}\n" + src[m.end():]

    with open(path, "w", encoding="utf-8") as f:
        f.write(patched + BRIDGE)
    print("android_vault: patched " + path)
    return 0


if __name__ == "__main__":
    sys.exit(main())
