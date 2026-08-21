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
     <vault>/.writed-vault.json          ← small: user prefs + schema
     <vault>/<Project Title>/
       .writed.json                      ← project metadata + snapshots
       01 Chapter Title.md               ← chapter text, full formatting
     <vault>/Notes/
       .writed.json                      ← note metadata + snapshots
       Note Title.md

   The .md files are the readable, portable copy of *current* text —
   what a writer opens in Obsidian or a plain text editor. Snapshots
   (version history) are not worth one file per revision, so they live
   in the sibling .writed.json instead. Splitting it this way means a
   chapter's own file is never bloated with old versions, and the
   working text is never something only Writed. can read.
   ============================================================ */
(function () {
  var PATH_KEY = "writed:vault";
  var VAULT_META = ".writed-vault.json";
  var ENTITY_META = ".writed.json";
  var NOTES_DIR = "Notes";
  var TRASH_DIR = ".trash";
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
    var dest = path.replace(/\.json$/, "") + ".corrupt-" + Date.now() + ".json";
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
    var meta = await readJSON(join(pdir, ENTITY_META));
    if (!meta.ok) return meta.corrupt ? { corrupt: true, path: join(pdir, ENTITY_META) } : null;
    var m = meta.data;
    if (!m || !m.id || !Array.isArray(m.chapters)) return { corrupt: true, path: join(pdir, ENTITY_META) };
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
    var meta = await readJSON(join(ndir, ENTITY_META));
    if (!meta.ok) return meta.corrupt ? { corrupt: true, path: join(ndir, ENTITY_META) } : { ok: true, notes: [], files: {} };
    if (!meta.data || !Array.isArray(meta.data.notes)) return { corrupt: true, path: join(ndir, ENTITY_META) };
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

    var vmeta = await readJSON(join(vaultDir, VAULT_META));
    var corrupt = [];
    if (vmeta.corrupt) corrupt.push(join(vaultDir, VAULT_META));

    var projects = [];
    var layout = { projectDirs: {}, projectFiles: {}, noteFiles: {} };
    for (var i = 0; i < entries.length; i++) {
      var e = entries[i];
      if (!e.isDirectory || e.name === NOTES_DIR || e.name === TRASH_DIR || e.name.charAt(0) === ".") continue;
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
    if (!T || !T.path) return null;
    var base = null;
    try { base = await T.path.documentDir(); } catch (e) {}
    if (!base) { try { base = await T.path.appDataDir(); } catch (e) {} }
    return base ? join(base, "Writed") : null;
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

  window.WritedVault = {
    available: available,
    canPickFolder: canPickFolder,
    isMobile: isMobile,
    status: function () { return Object.assign({}, status); },
    subscribe: function (fn) { listeners.add(fn); return function () { listeners.delete(fn); }; },
    pick: pick,
    open: open,
    defaultMobileDir: defaultMobileDir,
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
