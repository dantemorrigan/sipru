/* ============================================================
   Writed. — vault (durable, on-device storage)

   localStorage alone is not storage a writer can trust: an Android
   uninstall wipes it, and a cleared webview profile takes it with it.
   The vault is a real folder on the device — the Obsidian model — that
   outlives the app install, and it looks like one: a project is a
   folder, a chapter or note is a plain .md file a writer can open in
   any other app.

   localStorage stays the live working copy and is never removed; the
   vault is written after every commit. If vault I/O fails the app keeps
   working exactly as it did before, so a broken disk can never cost the
   user their text.

   On disk:
     <vault>/writed-vault.json           ← small: user prefs + schema
     <vault>/<Project Title>/
       writed-meta.json                  ← project metadata + snapshots
       01 Chapter Title.md               ← chapter text, full formatting
     <vault>/Notes/
       writed-meta.json                  ← note metadata + snapshots
       Note Title.md

   The .md files are the readable, portable copy of *current* text —
   what a writer opens in any plain text editor. Snapshots (version
   history) are not worth one file per revision, so they live in the
   sibling writed-meta.json instead. Splitting it this way means a
   chapter's own file is never bloated with old versions, and the
   working text is never something only Writed. can read.
   ============================================================ */
(function () {
  var PATH_KEY = "writed:vault";
  /* Deliberately not dotfiles. Tauri's filesystem scope matches allowed
     paths with a glob that will not cross a leading dot, so a metadata file
     named ".writed-vault.json" is rejected as a forbidden path even when its
     whole folder is allowed. Plain names also mean nothing in the vault is
     hidden from the person who owns it. */
  var VAULT_META = "writed-vault.json";
  var ENTITY_META = "writed-meta.json";
  var NOTES_DIR = "Notes";
  var TRASH_DIR = "Trash";
  /* Vaults written before the rename above still open. */
  var LEGACY_VAULT_META = ".writed-vault.json";
  var LEGACY_ENTITY_META = ".writed.json";
  var LEGACY_TRASH_DIR = ".trash";
  var SAVE_DEBOUNCE = 900;

  var T = window.__TAURI__ || null;
  var listeners = new Set();
  var status = { path: null, ok: false, error: null, savedAt: 0, busy: false };
  var timer = null;
  var queued = false;
  /* What we wrote last flush — the only files/folders a later flush is
     ever allowed to rename or trash, so a folder the user drops into the
     vault by hand is never touched. */
  var lastLayout = { projectDirs: {}, projectFiles: {}, noteFiles: {} };

  function emit() { listeners.forEach(function (fn) { fn(status); }); }
  function set(patch) { Object.assign(status, patch); emit(); }

  function available() { return !!(T && T.fs && T.dialog); }

  /* tauri-plugin-dialog answers FolderPickerNotImplemented on Android/iOS. */
  function canPickFolder() {
    if (!available()) return false;
    var p = (navigator.userAgent || "").toLowerCase();
    return !/android|iphone|ipad/.test(p);
  }
  function isMobile() { return available() && !canPickFolder(); }

  function join() { return Array.prototype.slice.call(arguments).filter(Boolean).join("/").replace(/\/+/g, "/"); }

  function safeName(s, fallback) {
    var out = String(s || "").replace(/[\/\\:*?"<>|]/g, " ")
      .replace(/\s+/g, " ").trim().replace(/[. ]+$/, "").slice(0, 80);
    return out || fallback;
  }
  /* Disambiguate same-titled siblings ("Chapter One" twice) by appending
     a counter — keeps filenames stable across saves as long as the title
     itself doesn't change, instead of an opaque id suffix on every file. */
  function uniqueName(desired, taken) {
    if (!taken.has(desired)) return desired;
    var n = 2;
    while (taken.has(desired + " " + n)) n++;
    return desired + " " + n;
  }

  async function exists(path) {
    try { return await T.fs.exists(path); } catch (e) { return false; }
  }
  async function readJSON(path) {
    try { return { ok: true, data: JSON.parse(await T.fs.readTextFile(path)) }; }
    catch (e) {
      if (await exists(path)) return { ok: false, corrupt: true, error: String((e && e.message) || e) };
      return { ok: false, corrupt: false };
    }
  }
  /* Reads the current metadata name, falling back to the pre-rename dotfile
     so an existing vault keeps opening; the next save writes the new name.
     Reports `path` — whichever of the two it actually read — so a corrupt
     file is quarantined where it really is, not under a name never on disk. */
  async function readMeta(dir, name, legacyName) {
    var res = await readJSON(join(dir, name));
    if (res.ok || res.corrupt) { res.path = join(dir, name); return res; }
    res = await readJSON(join(dir, legacyName));
    res.path = join(dir, legacyName);
    return res;
  }
  async function writeJSON(path, data) {
    await T.fs.writeTextFile(path, JSON.stringify(data, null, 2));
  }
  async function ensureDir(path) { await T.fs.mkdir(path, { recursive: true }).catch(function () {}); }

  /* Move, not delete: a rename we can't complete (cross-device, name
     collision) still leaves the original in place rather than losing it. */
  async function trash(vaultDir, relPath) {
    var src = join(vaultDir, relPath);
    if (!(await exists(src))) return;
    var dest = join(vaultDir, TRASH_DIR, Date.now() + "-" + relPath.replace(/[\/\\]/g, "_"));
    await ensureDir(join(vaultDir, TRASH_DIR));
    try { await T.fs.rename(src, dest); } catch (e) { /* leave it where it was */ }
  }

  async function quarantine(path, raw) {
    /* A legacy vault's corrupt file can itself be a dotfile (LEGACY_*_META);
       strip any leading dot from the base name so the quarantine copy is
       never rejected by the same forbidden-leading-dot scope rule this was
       written to work around elsewhere. */
    var dest = path.replace(/\.json$/, "").replace(/\/\.([^\/]*)$/, "/$1")
      + ".corrupt-" + Date.now() + ".json";
    try { await T.fs.writeTextFile(dest, raw != null ? raw : await T.fs.readTextFile(path)); return dest; }
    catch (e) { return null; }
  }

  /* Resolves what a project folder / entity file should be named this
     flush, renaming on disk when the title changed. Never fabricates a
     rename onto a name that's already taken (keeps the old one instead),
     and if the previously-tracked name is simply gone — the user moved
     or deleted it by hand — falls forward to the fresh name rather than
     recreating something under a name nothing points to any more. */
  async function resolveName(dir, prevName, desiredName) {
    if (!prevName || prevName === desiredName) return prevName || desiredName;
    if (!(await exists(join(dir, prevName)))) return desiredName;
    if (await exists(join(dir, desiredName))) return prevName;
    try { await T.fs.rename(join(dir, prevName), join(dir, desiredName)); return desiredName; }
    catch (e) { return prevName; }
  }

  /* ---------- writing a vault ---------- */

  /* The HTML→Markdown serializer lives in screens-export.js, so vault.js is
     ordered after it in index.html. Assert rather than trust that ordering:
     if it were ever missing, the alternative to failing loudly here is
     writing every chapter to disk as "undefined" or an empty file. */
  async function writeEntity(dir, filename, content) {
    if (typeof window.htmlToMd !== "function") throw new Error("markdown serializer unavailable");
    await T.fs.writeTextFile(join(dir, filename), window.htmlToMd(content || "") + "\n");
  }

  async function writeProject(vaultDir, project, prevLayout) {
    var prevFolder = prevLayout.projectDirs[project.id];
    var desiredFolder = safeName(project.title, "Untitled project");
    var folder = await resolveName(vaultDir, prevFolder, desiredFolder);
    var pdir = join(vaultDir, folder);
    await ensureDir(pdir);

    var prevMeta = prevLayout.projectFiles[project.id] || {};
    var takenNames = new Set();
    var chapterMeta = [];
    var chapters = project.chapters || [];
    for (var i = 0; i < chapters.length; i++) {
      var c = chapters[i];
      var num = String(i + 1).padStart(2, "0");
      var base = num + " " + safeName(c.title, "Chapter " + (i + 1));
      var desired = uniqueName(base, takenNames) + ".md";
      takenNames.add(desired.slice(0, -3));
      var filename = await resolveName(pdir, prevMeta[c.id], desired);
      await writeEntity(pdir, filename, c.content);
      chapterMeta.push({ id: c.id, title: c.title, filename: filename, updatedAt: c.updatedAt, snapshots: c.snapshots || [] });
    }
    /* trash files that belonged to a chapter which no longer exists */
    for (var id in prevMeta) {
      if (!chapters.some(function (c) { return c.id === id; })) await trash(vaultDir, join(folder, prevMeta[id]));
    }

    await writeJSON(join(pdir, ENTITY_META), {
      schema: 1, id: project.id, title: project.title, status: project.status,
      synopsis: project.synopsis, createdAt: project.createdAt, updatedAt: project.updatedAt,
      goal: project.goal, chapters: chapterMeta,
    });

    var fileMap = {};
    chapterMeta.forEach(function (c) { fileMap[c.id] = c.filename; });
    return { folder: folder, files: fileMap };
  }

  async function writeNotes(vaultDir, notes, prevFiles) {
    var ndir = join(vaultDir, NOTES_DIR);
    if (!notes.length && !Object.keys(prevFiles).length) return {};
    await ensureDir(ndir);
    var takenNames = new Set();
    var meta = [];
    for (var i = 0; i < notes.length; i++) {
      var n = notes[i];
      var base = safeName(n.title, "Note " + (i + 1));
      var desired = uniqueName(base, takenNames) + ".md";
      takenNames.add(desired.slice(0, -3));
      var filename = await resolveName(ndir, prevFiles[n.id], desired);
      await writeEntity(ndir, filename, n.content);
      meta.push({ id: n.id, title: n.title, filename: filename, status: n.status,
        createdAt: n.createdAt, updatedAt: n.updatedAt, snapshots: n.snapshots || [] });
    }
    for (var id in prevFiles) {
      if (!notes.some(function (n) { return n.id === id; })) await trash(vaultDir, join(NOTES_DIR, prevFiles[id]));
    }
    await writeJSON(join(ndir, ENTITY_META), { schema: 1, notes: meta });

    var fileMap = {};
    meta.forEach(function (n) { fileMap[n.id] = n.filename; });
    return fileMap;
  }

  async function writeVaultAt(vaultDir, state) {
    /* The root has to exist before anything goes in it. Desktop hid this:
       the picker only ever returns a folder that already exists. On mobile
       the path is derived, not picked, so nothing had created it — and once
       a new install starts empty there is no project or note write to create
       it as a side effect either, so every save failed with ENOENT. */
    await ensureDir(vaultDir);
    var prev = lastLayout;
    var nextDirs = {}, nextFiles = {};
    var projects = state.projects || [];
    for (var i = 0; i < projects.length; i++) {
      var res = await writeProject(vaultDir, projects[i], prev);
      nextDirs[projects[i].id] = res.folder;
      nextFiles[projects[i].id] = res.files;
    }
    /* trash whole project folders that no longer exist in state */
    for (var pid in prev.projectDirs) {
      if (!nextDirs[pid]) await trash(vaultDir, prev.projectDirs[pid]);
    }

    var noteFiles = await writeNotes(vaultDir, state.notes || [], prev.noteFiles);

    lastLayout = { projectDirs: nextDirs, projectFiles: nextFiles, noteFiles: noteFiles };
    await writeJSON(join(vaultDir, VAULT_META), {
      app: "Writed.", schema: 1, savedAt: Date.now(),
      user: state.user, onboarded: state.onboarded, tourDone: state.tourDone,
    });
    return Date.now();
  }

  /* ---------- reading a vault ---------- */

  async function readProjectFolder(vaultDir, folderName) {
    var pdir = join(vaultDir, folderName);
    var meta = await readMeta(pdir, ENTITY_META, LEGACY_ENTITY_META);
    if (!meta.ok) return meta.corrupt ? { corrupt: true, path: meta.path } : null;
    var m = meta.data;
    if (!m || !m.id || !Array.isArray(m.chapters)) return { corrupt: true, path: meta.path };
    var chapters = [];
    for (var i = 0; i < (m.chapters || []).length; i++) {
      var cm = m.chapters[i];
      var raw = null;
      try { raw = await T.fs.readTextFile(join(pdir, cm.filename)); } catch (e) { raw = ""; }
      var html = window.WritedFormats.mdToHTML(raw);
      chapters.push({ id: cm.id, title: cm.title, content: html, updatedAt: cm.updatedAt || Date.now(),
        snapshots: cm.snapshots || [] });
    }
    var files = {};
    (m.chapters || []).forEach(function (cm) { files[cm.id] = cm.filename; });
    return {
      ok: true, folder: folderName, files: files,
      project: { id: m.id, title: m.title, status: m.status || "draft", synopsis: m.synopsis || "",
        createdAt: m.createdAt || Date.now(), updatedAt: m.updatedAt || Date.now(),
        goal: m.goal || null, chapters: chapters },
    };
  }

  async function readNotes(vaultDir) {
    var ndir = join(vaultDir, NOTES_DIR);
    var meta = await readMeta(ndir, ENTITY_META, LEGACY_ENTITY_META);
    if (!meta.ok) return meta.corrupt ? { corrupt: true, path: meta.path } : { ok: true, notes: [], files: {} };
    if (!meta.data || !Array.isArray(meta.data.notes)) return { corrupt: true, path: meta.path };
    var notes = [];
    for (var i = 0; i < (meta.data.notes || []).length; i++) {
      var nm = meta.data.notes[i];
      var raw = null;
      try { raw = await T.fs.readTextFile(join(ndir, nm.filename)); } catch (e) { raw = ""; }
      notes.push({ id: nm.id, title: nm.title, status: nm.status || "draft", content: window.WritedFormats.mdToHTML(raw),
        createdAt: nm.createdAt || Date.now(), updatedAt: nm.updatedAt || Date.now(), snapshots: nm.snapshots || [] });
    }
    var files = {};
    (meta.data.notes || []).forEach(function (nm) { files[nm.id] = nm.filename; });
    return { ok: true, notes: notes, files: files };
  }

  /* Reads everything before touching anything: a folder we can't fully
     parse must never get overwritten by the next flush, so any corrupt
     metadata file found here is quarantined and the whole read is
     reported as incomplete — the caller decides whether that blocks
     connecting to the vault at all. */
  async function readVaultAt(vaultDir) {
    var entries;
    try { entries = await T.fs.readDir(vaultDir); } catch (e) { return { kind: "missing" }; }

    var vmeta = await readMeta(vaultDir, VAULT_META, LEGACY_VAULT_META);
    var corrupt = [];
    if (vmeta.corrupt) corrupt.push(vmeta.path);

    var projects = [];
    var layout = { projectDirs: {}, projectFiles: {}, noteFiles: {} };
    for (var i = 0; i < entries.length; i++) {
      var e = entries[i];
      if (!e.isDirectory) continue;
      if (e.name === NOTES_DIR || e.name === TRASH_DIR || e.name === LEGACY_TRASH_DIR) continue;
      if (e.name.charAt(0) === ".") continue;                /* hidden / OS folders */
      var r = await readProjectFolder(vaultDir, e.name);
      if (!r) continue;                      /* not one of ours — leave it alone */
      if (r.corrupt) { corrupt.push(r.path); continue; }
      projects.push(r.project);
      layout.projectDirs[r.project.id] = r.folder;
      layout.projectFiles[r.project.id] = r.files;
    }
    var notesRes = await readNotes(vaultDir);
    if (notesRes.corrupt) corrupt.push(notesRes.path);
    layout.noteFiles = notesRes.files || {};

    if (corrupt.length) {
      var quarantined = [];
      for (var q = 0; q < corrupt.length; q++) {
        var qp = await quarantine(corrupt[q]);
        if (qp) quarantined.push(qp);
      }
      return { kind: "partial-corrupt", quarantined: quarantined };
    }
    if (!entries.length && !vmeta.ok) return { kind: "missing" };

    var user = (vmeta.ok && vmeta.data.user) || null;
    return {
      kind: "ok", layout: layout,
      state: {
        user: user, onboarded: vmeta.ok ? !!vmeta.data.onboarded : true,
        tourDone: vmeta.ok ? !!vmeta.data.tourDone : true,
        projects: projects, notes: notesRes.notes || [],
      },
    };
  }

  /* ---------- the autosave loop ---------- */

  async function flush() {
    if (!status.path || !available()) return;
    if (status.busy) { queued = true; return; }
    set({ busy: true });
    try {
      await writeVaultAt(status.path, window.WritedStore.get());
      set({ ok: true, error: null, savedAt: Date.now(), busy: false });
    } catch (e) {
      set({ ok: false, error: String((e && e.message) || e), busy: false });
    }
    if (queued) { queued = false; schedule(); }
  }
  function schedule() {
    if (!status.path) return;
    clearTimeout(timer);
    timer = setTimeout(flush, SAVE_DEBOUNCE);
  }

  /* ---------- opening a vault ---------- */

  async function open(dir, opts) {
    if (!available() || !dir) return { ok: false };
    var adopt = !!(opts && opts.adopt);
    var found = await readVaultAt(dir);

    if (found.kind === "partial-corrupt") {
      set({ ok: false, error: "unreadable vault at " + dir });
      return { ok: false, unreadable: true, quarantined: found.quarantined };
    }

    var local = window.WritedStore.get();
    var restored = false;
    if (found.kind === "ok" && (found.state.projects.length || found.state.notes.length) && (adopt || !local.onboarded)) {
      restored = window.WritedStore.importAll(JSON.stringify(found.state));
      if (!restored) { set({ ok: false, error: "unreadable vault at " + dir }); return { ok: false, unreadable: true }; }
    }
    /* Seed filename tracking from what's actually on disk — this is what
       keeps a rename from fabricating a duplicate file after every plain
       app reload, and it's always safe even when local state won by the
       branch above: a disk entity whose id doesn't appear in local state
       just falls out of the next flush's project list and gets trashed,
       never overwritten in place. */
    lastLayout = found.kind === "ok"
      ? { projectDirs: found.layout.projectDirs, projectFiles: found.layout.projectFiles, noteFiles: found.layout.noteFiles }
      : { projectDirs: {}, projectFiles: {}, noteFiles: {} };
    localStorage.setItem(PATH_KEY, dir);
    set({ path: dir, error: null });
    await flush();
    return { ok: true, restored: restored, hadData: found.kind === "ok" };
  }

  /* `recursive` is load-bearing, not a hint: picking a folder is what grants
     this app filesystem access to it, and the dialog plugin forwards this
     flag straight into fs_scope.allow_directory(path, recursive). Without
     it the scope is only "path/*" — direct children — so creating a project
     folder succeeds while writing the .md files *inside* it is denied. */
  async function pick() {
    if (!canPickFolder()) return null;
    var dir = await T.dialog.open({ directory: true, recursive: true, multiple: false, title: "Writed — vault folder" });
    if (!dir) return null;
    return typeof dir === "string" ? dir : (dir.path || null);
  }

  async function defaultMobileDir() {
    var opts = await mobileDirOptions();
    return opts.length ? opts[0].path : null;
  }

  /* Android has no folder picker, so instead of one path taken on faith the
     writer gets the handful of places the app can actually write, each one
     probed for real before it is offered.

     documentDir() on Android resolves inside /Android/data/<pkg>/, which is
     private to the app and deleted when it is uninstalled. The shared
     Documents folder outlives an uninstall, but scoped storage blocks raw
     writes to it on many versions — so it is listed only when the probe
     below actually succeeds, never promised in advance. */
  async function mobileDirOptions() {
    if (!T || !T.path) return [];
    var out = [];
    var appDir = null;
    try { appDir = await T.path.documentDir(); } catch (e) {}
    if (!appDir) { try { appDir = await T.path.appDataDir(); } catch (e) {} }
    if (appDir) out.push({ key: "app", path: join(appDir, "Writed") });

    /* .../Android/data/<pkg>/files/Documents → /storage/emulated/0 */
    var cut = appDir && appDir.indexOf("/Android/data/");
    if (appDir && cut > 0) {
      var root = appDir.slice(0, cut);
      out.push({ key: "shared", path: join(root, "Documents", "Writed") });
      out.push({ key: "download", path: join(root, "Download", "Writed") });
    }
    return out;
  }

  /* Creates the folder and writes a real file into it, because mkdir alone
     succeeds in places that later refuse writes. Cleans up after itself.
     The marker is deliberately not a dotfile: Tauri's fs scope glob does not
     cross a leading dot, so ".writed-probe" was rejected as a forbidden path
     even inside a folder the scope otherwise allows — the exact bug already
     fixed for the vault's own metadata files, reintroduced here. That made
     app-private storage, which needs no permission at all, probe as
     unavailable right alongside the scoped-storage locations that
     legitimately are. */
  async function probe(dir) {
    if (!available() || !dir) return { ok: false, error: "no path" };
    var marker = join(dir, "writed-probe.tmp");
    try {
      await T.fs.mkdir(dir, { recursive: true });
      await T.fs.writeTextFile(marker, "ok");
      await T.fs.remove(marker).catch(function () {});
      return { ok: true };
    } catch (e) {
      return { ok: false, error: String((e && e.message) || e) };
    }
  }

  /* ---------- explicit backup / restore (single-file, every platform) ---------- */

  async function backupToFile() {
    if (!available()) return false;
    var name = "writed-backup-" + new Date().toISOString().slice(0, 10) + ".json";
    var dest = await T.dialog.save({ defaultPath: name, filters: [{ name: "Writed backup", extensions: ["json"] }] });
    if (!dest) return false;
    var payload = { app: "Writed.", schema: 1, savedAt: Date.now(), state: window.WritedStore.get() };
    await T.fs.writeTextFile(dest, JSON.stringify(payload, null, 2));
    return true;
  }

  async function restoreFromFile() {
    if (!available()) return false;
    var src = await T.dialog.open({ multiple: false, filters: [{ name: "Writed backup", extensions: ["json"] }] });
    if (!src) return false;
    var p = typeof src === "string" ? src : (src.path || src);
    var raw = await T.fs.readTextFile(p);
    var data = JSON.parse(raw);
    var state = data && data.state ? data.state : data;
    var ok = window.WritedStore.importAll(JSON.stringify(state));
    if (ok) schedule();
    return ok;
  }

  /* ---------- startup ---------- */

  async function init() {
    if (!available()) return;
    var saved = null;
    try { saved = localStorage.getItem(PATH_KEY); } catch (e) {}
    if (!saved && isMobile()) saved = await defaultMobileDir();
    if (!saved) return;
    await open(saved, { adopt: false });
  }

  /* Where a project folder / chapter / note actually lives on disk, or null
     when this session has not written it yet (nothing to reveal). */
  function locate(kind, id, projectId) {
    if (!status.path) return null;
    if (kind === "vault") return status.path;
    if (kind === "project") {
      var f = lastLayout.projectDirs[id];
      return f ? join(status.path, f) : null;
    }
    if (kind === "note") {
      var nf = lastLayout.noteFiles[id];
      return nf ? join(status.path, NOTES_DIR, nf) : null;
    }
    if (kind === "chapter") {
      var pdir = lastLayout.projectDirs[projectId];
      var files = lastLayout.projectFiles[projectId] || {};
      return pdir && files[id] ? join(status.path, pdir, files[id]) : null;
    }
    return null;
  }

  /* Desktop opens the file manager with the item selected. Android and iOS
     have no such concept — the plugin answers UnsupportedPlatform — so the
     caller is told plainly rather than being left with a dead button. */
  async function reveal(path) {
    if (!path || !T || !T.opener) return false;
    try { await T.opener.revealItemInDir(path); return true; }
    catch (e) {
      try { await T.opener.openPath(path); return true; } catch (e2) {}
      return false;
    }
  }

  window.WritedVault = {
    available: available,
    locate: locate,
    reveal: reveal,
    canReveal: function () { return !!(T && T.opener) && !isMobile(); },
    canPickFolder: canPickFolder,
    isMobile: isMobile,
    status: function () { return Object.assign({}, status); },
    subscribe: function (fn) { listeners.add(fn); return function () { listeners.delete(fn); }; },
    pick: pick,
    open: open,
    defaultMobileDir: defaultMobileDir,
    mobileDirOptions: mobileDirOptions,
    probe: probe,
    backupToFile: backupToFile,
    restoreFromFile: restoreFromFile,
    saveNow: flush,
    schedule: schedule,
    forget: function () {
      try { localStorage.removeItem(PATH_KEY); } catch (e) {}
      lastLayout = { projectDirs: {}, projectFiles: {}, noteFiles: {} };
      set({ path: null, ok: false, error: null, savedAt: 0 });
    },
  };

  if (window.WritedStore) window.WritedStore.subscribe(schedule);
  if (available()) init();
})();
