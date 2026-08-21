/* Writed. — Android storage fixes only.
   Desktop behavior is intentionally untouched.

   Android cannot use Tauri's desktop folder picker or opener reveal API.
   The Android build injects WritedAndroidFileManager from MainActivity; this
   bridge is used here to expose the same "show in files" behavior on mobile.

   Storage preference:
   1. /storage/emulated/0/Documents/Writed
   2. /storage/emulated/0/Download/Writed
   3. app-private .../Android/data/.../files/Documents/Writed (fallback)

   Existing app-private vaults are copied forward to Documents when that
   location is writable and does not already contain a Writed vault. The old
   copy is deliberately left intact until the user has verified the new one.
*/
(function () {
  if (!/android/i.test(navigator.userAgent || "")) return;

  var V = window.WritedVault;
  var T = window.__TAURI__;
  if (!V || !T || !T.path || !T.fs) return;

  function join() {
    return Array.prototype.slice.call(arguments).filter(Boolean).join("/").replace(/\\+/g, "/");
  }

  async function appDir() {
    try { return await T.path.documentDir(); } catch (e) {}
    try { return await T.path.appDataDir(); } catch (e) {}
    return null;
  }

  async function candidates() {
    var dir = await appDir();
    if (!dir) return [];
    var cut = dir.indexOf("/Android/data/");
    var out = [];
    if (cut > 0) {
      var root = dir.slice(0, cut);
      out.push({ key: "documents", path: join(root, "Documents", "Writed") });
      out.push({ key: "download", path: join(root, "Download", "Writed") });
    }
    out.push({ key: "app", path: join(dir, "Writed") });
    return out;
  }

  async function writable(path) {
    try {
      var r = await V.probe(path);
      return !!(r && r.ok);
    } catch (e) { return false; }
  }

  async function hasVault(path) {
    try { return await T.fs.exists(join(path, "writed-vault.json")); }
    catch (e) { return false; }
  }

  /* The existing Profile button calls defaultMobileDir() on Android. Make
     that action genuinely change the location instead of re-opening the
     same derived app-private path and navigating back to Dashboard. */
  V.defaultMobileDir = async function () {
    var list = await candidates();
    var current = (V.status() || {}).path || "";
    var start = -1;
    for (var i = 0; i < list.length; i++) {
      if (list[i].path === current) { start = i; break; }
    }
    for (var n = 1; n <= list.length; n++) {
      var item = list[(start + n) % list.length];
      if (await writable(item.path)) return item.path;
    }
    return current || null;
  };

  /* Tauri's opener plugin explicitly does not implement revealItemInDir on
     Android. The generated MainActivity provides the native equivalent. */
  V.canReveal = function () {
    return !!(window.WritedAndroidFileManager && typeof window.WritedAndroidFileManager.reveal === "function");
  };
  V.reveal = async function (path) {
    if (!path || !V.canReveal()) return false;
    try {
      window.WritedAndroidFileManager.reveal(path);
      return true;
    } catch (e) { return false; }
  };

  /* Move new installs and existing app-private vaults to user-visible shared
     storage whenever Android permits it. Never overwrite an existing shared
     vault automatically, and never delete the old copy. */
  async function migrateToSharedStorage() {
    for (var attempt = 0; attempt < 20; attempt++) {
      var state = V.status() || {};
      if (state.path) {
        var current = state.path;
        if (current.indexOf("/Android/data/") < 0) return;

        var list = await candidates();
        var target = list.find(function (x) { return x.key === "documents"; });
        if (!target || !(await writable(target.path))) return;
        if (await hasVault(target.path)) return;

        try {
          /* adopt:false preserves the current local WritedStore and writes
             that exact state into the new shared vault. */
          await V.open(target.path, { adopt: false });
        } catch (e) {}
        return;
      }
      await new Promise(function (resolve) { setTimeout(resolve, 150); });
    }
  }

  setTimeout(migrateToSharedStorage, 500);
})();
