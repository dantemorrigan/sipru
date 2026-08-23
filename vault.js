/* ============================================================
   Sipru. — vault (durable, on-device storage)

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
     <vault>/sipru-vault.json            ← small: user prefs + schema
     <vault>/<Project Title>/
       sipru-meta.json                   ← project metadata + snapshots
       01 Chapter Title.md               ← chapter text, full formatting
     <vault>/Notes/
       sipru-meta.json                   ← note metadata + snapshots
       Note Title.md

   The .md files are the readable, portable copy of *current* text —
   what a writer opens in any plain text editor. Snapshots (version
   history) are not worth one file per revision, so they live in the
   sibling sipru-meta.json instead. Splitting it this way means a
   chapter's own file is never bloated with old versions, and the
   working text is never something only Sipru can read.
   ============================================================ */
(function () {
  var PATH_KEY = "sipru:vault";
  var LEGACY_PATH_KEY = "writed:vault"; /* pre-rename installs still reconnect once */
  /* Deliberately not dotfiles. Tauri's filesystem scope matches allowed
     paths with a glob that will not cross a leading dot, so a metadata file
     named ".sipru-vault.json" is rejected as a forbidden path even when its
     whole folder is allowed. Plain names also mean nothing in the vault is
     hidden from the person who owns it. */
  var VAULT_META = "sipru-vault.json";
  var ENTITY_META = "sipru-meta.json";
  var NOTES_DIR = "Notes";
  var TRASH_DIR = "Trash";
  /* Vaults written before the app was renamed (Writed. → Sipru) still open:
     each metadata read tries the current name, then the pre-rename plain
     name, then the original pre-rename dotfile name. */
  var LEGACY_VAULT_META = ["writed-vault.json", ".writed-vault.json"];
  var LEGACY_ENTITY_META = ["writed-meta.json", ".writed.json"];
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

  /* ---------- where the bytes go ----------

     Desktop writes through Tauri's filesystem plugin to a folder the writer
     picked in a native dialog. Android has no path that plugin can hand us
     with the same properties — app-private storage dies with the install,
     and raw writes under /storage/emulated/0 are refused by scoped storage
     whatever permission is declared. So Android goes through the Storage
     Access Framework instead, via the native bridge in MainActivity: the
     writer grants one folder in the system picker, exactly as they pick one
     on desktop, and the grant persists across reboots.

     Everything below this adapter is one code path. The vault does not know
     or care which platform it is on. */

  function bridge() { return window.SipruAndroidVault || null; }

  var saf = null;      /* the Android bridge, once a vault is connected */
  var safRoot = "";    /* its display path — the prefix vault paths carry */

  function rel(p) {
    if (safRoot && p.indexOf(safRoot) === 0) p = p.slice(safRoot.length);
    return p.replace(/^\/+/, "");
  }
  /* The bridge answers false rather than throwing, so the adapter is what
     turns a refusal back into the rejection the vault's callers expect. */
  function no(what, p) { return Promise.reject(new Error(what + ": " + p)); }

  var FS = {
    exists: function (p) { return saf ? Promise.resolve(saf.exists(rel(p))) : T.fs.exists(p); },
    readText: function (p) {
      if (!saf) return T.fs.readTextFile(p);
      var s = saf.read(rel(p));
      return s == null ? no("not found", p) : Promise.resolve(s);
    },
    writeText: function (p, text) {
      if (!saf) return T.fs.writeTextFile(p, text);
      return saf.write(rel(p), text) ? Promise.resolve() : no("cannot write", p);
    },
    mkdir: function (p) {
      if (!saf) return T.fs.mkdir(p, { recursive: true });
      return saf.mkdirs(rel(p)) ? Promise.resolve() : no("cannot create", p);
    },
    remove: function (p) {
      if (!saf) return T.fs.remove(p);
      return saf.del(rel(p)) ? Promise.resolve() : no("cannot remove", p);
    },
    rename: function (a, b) {
      if (!saf) return T.fs.rename(a, b);
      return saf.move(rel(a), rel(b)) ? Promise.resolve() : no("cannot rename", a);
    },
    readDir: function (p) {
      if (!saf) return T.fs.readDir(p);
      var raw = saf.list(rel(p));
      if (!raw) return no("not a directory", p);
      return Promise.resolve(JSON.parse(raw).map(function (e) {
        return { name: e.name, isDirectory: e.dir };
      }));
    },
  };

  function available() { return !!(T && T.fs && T.dialog) || !!bridge(); }

  /* Desktop opens a native folder dialog; Android opens the SAF tree picker.
     Only iOS, which has neither, is left without one. */
  function canPickFolder() {
    if (bridge()) return true;
    if (!available()) return false;
    return !/android|iphone|ipad/.test((navigator.userAgent || "").toLowerCase());
  }

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

  /* What is already on disk, keyed by path. A flush after one keystroke
     then rewrites the one chapter that changed instead of the whole book —
     which matters most on Android, where every write crosses into the
     system's document provider. Dropped whenever a vault is opened, so
     anything edited outside the app is picked back up on the next launch. */
  var onDisk = {};
  async function put(path, text) {
    if (onDisk[path] === text) return;
    await FS.writeText(path, text);
    onDisk[path] = text;
  }
  /* A path whose file we just moved or deleted is no longer what we think
     it is, and a later write to it must not be skipped as unchanged. */
  function stale(path) { delete onDisk[path]; }

  async function exists(path) {
    try { return await FS.exists(path); } catch (e) { return false; }
  }
  async function readJSON(path) {
    try { return { ok: true, data: JSON.parse(await FS.readText(path)) }; }
    catch (e) {
      if (await exists(path)) return { ok: false, corrupt: true, error: String((e && e.message) || e) };
      return { ok: false, corrupt: false };
    }
  }
  /* Reads the current metadata name, falling back through each pre-rename
     name in turn so an existing vault keeps opening; the next save writes
     the new name. Reports `path` — whichever name it actually read — so a
     corrupt file is quarantined where it really is, not under a name never
     on disk. */
  async function readMeta(dir, name, legacyNames) {
    var res = await readJSON(join(dir, name));
    if (res.ok || res.corrupt) { res.path = join(dir, name); return res; }
    var names = [].concat(legacyNames);
    for (var i = 0; i < names.length; i++) {
      res = await readJSON(join(dir, names[i]));
      res.path = join(dir, names[i]);
      if (res.ok || res.corrupt) return res;
    }
    return res;
  }
  async function writeJSON(path, data) {
    await put(path, JSON.stringify(data, null, 2));
  }
  async function ensureDir(path) { await FS.mkdir(path).catch(function () {}); }

  /* Move, not delete: a rename we can't complete (cross-device, name
     collision) still leaves the original in place rather than losing it. */
  async function trash(vaultDir, relPath) {
    var src = join(vaultDir, relPath);
    if (!(await exists(src))) return;
    var dest = join(vaultDir, TRASH_DIR, Date.now() + "-" + relPath.replace(/[\/\\]/g, "_"));
    await ensureDir(join(vaultDir, TRASH_DIR));
    try { await FS.rename(src, dest); stale(src); } catch (e) { /* leave it where it was */ }
  }

  async function quarantine(path, raw) {
    /* A legacy vault's corrupt file can itself be a dotfile (LEGACY_*_META);
       strip any leading dot from the base name so the quarantine copy is
       never rejected by the same forbidden-leading-dot scope rule this was
       written to work around elsewhere. */
    var dest = path.replace(/\.json$/, "").replace(/\/\.([^\/]*)$/, "/$1")
      + ".corrupt-" + Date.now() + ".json";
    try { await FS.writeText(dest, raw != null ? raw : await FS.readText(path)); return dest; }
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
    try {
      await FS.rename(join(dir, prevName), join(dir, desiredName));
      stale(join(dir, prevName));
      stale(join(dir, desiredName));
      return desiredName;
    } catch (e) { return prevName; }
  }

  /* ---------- writing a vault ---------- */

  /* The HTML→Markdown serializer lives in screens-export.js, so vault.js is
     ordered after it in index.html. Assert rather than trust that ordering:
     if it were ever missing, the alternative to failing loudly here is
     writing every chapter to disk as "undefined" or an empty file. */
  async function writeEntity(dir, filename, content) {
    if (typeof window.htmlToMd !== "function") throw new Error("markdown serializer unavailable");
    await put(join(dir, filename), window.htmlToMd(content || "") + "\n");
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
      chapterMeta.push({ id: c.id, title: c.title, filename: filename, updatedAt: c.updatedAt,
        snapshots: c.snapshots || [], status: c.status || "draft", partId: c.partId || null });
    }
    /* trash files that belonged to a chapter which no longer exists */
    for (var id in prevMeta) {
      if (!chapters.some(function (c) { return c.id === id; })) await trash(vaultDir, join(folder, prevMeta[id]));
    }

    await writeJSON(join(pdir, ENTITY_META), {
      schema: 1, id: project.id, title: project.title, status: project.status,
      synopsis: project.synopsis, createdAt: project.createdAt, updatedAt: project.updatedAt,
      goal: project.goal, chapters: chapterMeta,
      /* structure and page setup travel with the book; an older Sipru
         simply ignores both keys */
      parts: project.parts || [], page: project.page || null,
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
        createdAt: n.createdAt, updatedAt: n.updatedAt, snapshots: n.snapshots || [],
        page: n.page || null });
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
      app: "Sipru.", schema: 1, savedAt: Date.now(),
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
      try { raw = await FS.readText(join(pdir, cm.filename)); } catch (e) { raw = ""; }
      var html = window.SipruFormats.mdToHTML(raw);
      chapters.push({ id: cm.id, title: cm.title, content: html, updatedAt: cm.updatedAt || Date.now(),
        snapshots: cm.snapshots || [], status: cm.status || "draft", partId: cm.partId || null });
    }
    var files = {};
    (m.chapters || []).forEach(function (cm) { files[cm.id] = cm.filename; });
    return {
      ok: true, folder: folderName, files: files,
      project: { id: m.id, title: m.title, status: m.status || "draft", synopsis: m.synopsis || "",
        createdAt: m.createdAt || Date.now(), updatedAt: m.updatedAt || Date.now(),
        goal: m.goal || null, chapters: chapters,
        parts: Array.isArray(m.parts) ? m.parts : [], page: m.page || null },
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
      try { raw = await FS.readText(join(ndir, nm.filename)); } catch (e) { raw = ""; }
      notes.push({ id: nm.id, title: nm.title, status: nm.status || "draft", content: window.SipruFormats.mdToHTML(raw),
        createdAt: nm.createdAt || Date.now(), updatedAt: nm.updatedAt || Date.now(), snapshots: nm.snapshots || [],
        page: nm.page || null });
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
    try { entries = await FS.readDir(vaultDir); } catch (e) { return { kind: "missing" }; }

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
      await writeVaultAt(status.path, window.SipruStore.get());
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
    /* Connect the adapter before the first read: on Android every path
       below is resolved against the granted tree, and `dir` is the label
       those paths are prefixed with. */
    var b = bridge();
    if (b) { saf = b; safRoot = dir; b.refresh(); }
    onDisk = {};
    var found = await readVaultAt(dir);

    if (found.kind === "partial-corrupt") {
      set({ ok: false, error: "unreadable vault at " + dir });
      return { ok: false, unreadable: true, quarantined: found.quarantined };
    }

    var local = window.SipruStore.get();
    var restored = false;
    if (found.kind === "ok" && (found.state.projects.length || found.state.notes.length) && (adopt || !local.onboarded)) {
      restored = window.SipruStore.importAll(JSON.stringify(found.state));
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
    localStorage.removeItem(LEGACY_PATH_KEY);
    set({ path: dir, error: null });
    await flush();
    return { ok: true, restored: restored, hadData: found.kind === "ok" };
  }

  /* The system folder picker, on whichever platform. Both halves answer the
     same thing — the folder the writer chose, or null if they backed out —
     so nothing above this line branches on platform.

     Desktop: `recursive` is load-bearing, not a hint. Picking a folder is
     what grants this app filesystem access to it, and the dialog plugin
     forwards the flag straight into fs_scope.allow_directory(path,
     recursive). Without it the scope is only "path/*" — direct children —
     so creating a project folder succeeds while writing the .md files
     *inside* it is denied.

     Android: the picker is an Activity, so its answer arrives on a callback
     rather than a return value; the bridge calls __sipruVaultPicked when
     the writer is done with it. */
  var picking = null;
  window.__sipruVaultPicked = function (label) {
    var fn = picking;
    picking = null;
    if (fn) fn(label || null);
  };

  async function pick() {
    var b = bridge();
    if (b) {
      if (picking) return null;               /* a picker is already open */
      return new Promise(function (resolve) {
        picking = resolve;
        try { b.pick(); } catch (e) { picking = null; resolve(null); }
      });
    }
    if (!canPickFolder()) return null;
    var dir = await T.dialog.open({ directory: true, recursive: true, multiple: false, title: "Sipru — vault folder" });
    if (!dir) return null;
    return typeof dir === "string" ? dir : (dir.path || null);
  }

  /* ---------- explicit backup / restore (single-file, every platform) ---------- */

  async function backupToFile() {
    if (!available()) return false;
    var name = "sipru-backup-" + new Date().toISOString().slice(0, 10) + ".json";
    var dest = await T.dialog.save({ defaultPath: name, filters: [{ name: "Sipru backup", extensions: ["json"] }] });
    if (!dest) return false;
    var payload = { app: "Sipru.", schema: 1, savedAt: Date.now(), state: window.SipruStore.get() };
    await T.fs.writeTextFile(dest, JSON.stringify(payload, null, 2));
    return true;
  }

  async function restoreFromFile() {
    if (!available()) return false;
    var src = await T.dialog.open({ multiple: false, filters: [{ name: "Sipru backup", extensions: ["json"] }] });
    if (!src) return false;
    var p = typeof src === "string" ? src : (src.path || src);
    var raw = await T.fs.readTextFile(p);
    var data = JSON.parse(raw);
    var state = data && data.state ? data.state : data;
    var ok = window.SipruStore.importAll(JSON.stringify(state));
    if (ok) schedule();
    return ok;
  }

  /* ---------- startup ---------- */

  async function init() {
    if (!available()) return;
    var saved = null;
    /* On Android the grant is the vault, so the bridge — not localStorage —
       is the authority on whether there still is one. An uninstall keeps
       the files and drops the grant, and the bridge reports that as "no
       vault", which is what puts the writer back in front of the picker
       instead of in front of a folder the app can no longer write to. */
    var b = bridge();
    if (b) saved = b.root() || null;
    else { try { saved = localStorage.getItem(PATH_KEY) || localStorage.getItem(LEGACY_PATH_KEY); } catch (e) {} }
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

  /* Desktop opens the file manager with the item selected; Android opens
     DocumentsUI at the folder holding it. iOS has neither — the opener
     plugin answers UnsupportedPlatform — so the caller is told plainly
     rather than being left with a dead button. */
  async function reveal(path) {
    if (!path) return false;
    if (saf) return saf.reveal(rel(path));
    if (!T || !T.opener) return false;
    try { await T.opener.revealItemInDir(path); return true; }
    catch (e) {
      try { await T.opener.openPath(path); return true; } catch (e2) {}
      return false;
    }
  }

  window.SipruVault = {
    available: available,
    locate: locate,
    reveal: reveal,
    canReveal: function () {
      if (bridge()) return true;
      return !!(T && T.opener) && !/android|iphone|ipad/.test((navigator.userAgent || "").toLowerCase());
    },
    canPickFolder: canPickFolder,
    status: function () { return Object.assign({}, status); },
    subscribe: function (fn) { listeners.add(fn); return function () { listeners.delete(fn); }; },
    pick: pick,
    open: open,
    backupToFile: backupToFile,
    restoreFromFile: restoreFromFile,
    saveNow: flush,
    schedule: schedule,
    forget: function () {
      try { localStorage.removeItem(PATH_KEY); localStorage.removeItem(LEGACY_PATH_KEY); } catch (e) {}
      if (saf) { saf.forget(); saf = null; safRoot = ""; }
      lastLayout = { projectDirs: {}, projectFiles: {}, noteFiles: {} };
      onDisk = {};
      set({ path: null, ok: false, error: null, savedAt: 0 });
    },
  };

  if (window.SipruStore) window.SipruStore.subscribe(schedule);
  if (available()) init();
})();
