/* ============================================================
   Writed. — local data store
   ============================================================ */
(function () {
  const KEY = "writed:v1";
  const listeners = new Set();
  const uid = (p) => p + Math.random().toString(36).slice(2, 9);
  const now = () => Date.now();

  function countWords(html) {
    const t = (html || "").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ");
    const m = t.trim().match(/[^\s]+/g);
    return m ? m.length : 0;
  }

  /* plain-text cache — recomputed only when a document's html changes */
  const textCache = new Map();
  function plainText(id, html) {
    const hit = textCache.get(id);
    if (hit && hit.html === html) return hit.text;
    const text = (html || "").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
      .replace(/\s+/g, " ").trim();
    textCache.set(id, { html, text });
    return text;
  }
  function snippetAt(text, at, len) {
    const from = Math.max(0, at - 40);
    const to = Math.min(text.length, at + len + 60);
    return { before: (from > 0 ? "…" : "") + text.slice(from, at),
      match: text.slice(at, at + len),
      after: text.slice(at + len, to) + (to < text.length ? "…" : "") };
  }

  /* A new install starts genuinely empty: the first screen a writer sees is
     their own blank dashboard, not sample projects they have to delete. */
  function emptyContent() {
    return { projects: [], notes: [] };
  }

  function seed() {
    const { projects, notes } = emptyContent();
    return {
      user: { name: "", theme: "light", editorFont: "book", lang: "en", createdAt: now() },
      onboarded: false,
      projects,
      notes
    };
  }

  const SCHEMA = 2;
  const MAX_SNAPSHOTS = 30;

  /* Non-destructive migration: only adds missing fields, never drops data. */
  function migrate(s) {
    if (!s || typeof s !== "object") return null;
    if (!s.user) s.user = {};
    if (!Array.isArray(s.projects)) s.projects = [];
    if (!Array.isArray(s.notes)) s.notes = [];
    s.projects.forEach((p) => {
      if (!Array.isArray(p.chapters)) p.chapters = [];
      if (p.goal === undefined) p.goal = null;
      p.chapters.forEach((c) => { if (!Array.isArray(c.snapshots)) c.snapshots = []; });
    });
    s.notes.forEach((n) => { if (!Array.isArray(n.snapshots)) n.snapshots = []; });
    s.version = SCHEMA;
    return s;
  }

  let state = load();
  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const parsed = migrate(JSON.parse(raw));
        if (parsed) return parsed;
      }
    } catch (e) {}
    const s = migrate(seed());
    persist(s);
    return s;
  }
  function persist(s) {
    try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {}
  }
  function commit() {
    persist(state);
    listeners.forEach((fn) => fn(state));
  }

  const Store = {
    get: () => state,
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },

    /* ---- user / onboarding ---- */
    completeOnboarding(name, theme, lang) {
      const resolvedLang = lang || "en";
      state.user.lang = resolvedLang;
      state.user.name = name || (resolvedLang === "ru" ? "Автор" : "Author");
      state.user.theme = theme || "light";
      state.onboarded = true;
      commit();
    },
    setUser(patch) { state.user = { ...state.user, ...patch }; commit(); },

    /* ---- guided tour ---- */
    completeTour() { state.tourDone = true; commit(); },
    replayTour() { state.tourDone = false; commit(); },

    /* ---- projects ---- */
    createProject(title) {
      const p = { id: uid("p_"), title: title || "Без названия", status: "draft",
        synopsis: "", createdAt: now(), updatedAt: now(), chapters: [] };
      state.projects.unshift(p); commit(); return p.id;
    },
    updateProject(id, patch) {
      const p = state.projects.find((x) => x.id === id);
      if (p) { Object.assign(p, patch, { updatedAt: now() }); commit(); }
    },
    deleteProject(id) { state.projects = state.projects.filter((p) => p.id !== id); commit(); },
    reorderChapters(pid, ids) {
      const p = state.projects.find((x) => x.id === pid);
      if (p) { p.chapters.sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id)); p.updatedAt = now(); commit(); }
    },
    addChapter(pid, title) {
      const p = state.projects.find((x) => x.id === pid);
      if (!p) return null;
      const c = { id: uid("c_"), title: title || ("Глава " + (p.chapters.length + 1)),
        content: "", updatedAt: now() };
      p.chapters.push(c); p.updatedAt = now(); commit(); return c.id;
    },
    deleteChapter(pid, cid) {
      const p = state.projects.find((x) => x.id === pid);
      if (p) { p.chapters = p.chapters.filter((c) => c.id !== cid); p.updatedAt = now(); commit(); }
    },

    /* ---- notes ---- */
    createNote(title) {
      const n = { id: uid("n_"), title: title || "Новая заметка", status: "draft",
        createdAt: now(), updatedAt: now(), content: "" };
      state.notes.unshift(n); commit(); return n.id;
    },
    deleteNote(id) { state.notes = state.notes.filter((n) => n.id !== id); commit(); },

    /* ---- documents (chapter OR note) ---- */
    findDoc(docId) {
      for (const p of state.projects) {
        const c = p.chapters.find((c) => c.id === docId);
        if (c) return { doc: c, project: p, kind: "chapter" };
      }
      const n = state.notes.find((n) => n.id === docId);
      if (n) return { doc: n, project: null, kind: "note" };
      return null;
    },
    updateDoc(docId, patch) {
      const f = Store.findDoc(docId);
      if (!f) return;
      Object.assign(f.doc, patch, { updatedAt: now() });
      if (patch.content != null) f.doc.words = countWords(patch.content);
      if (f.project) f.project.updatedAt = now();
      commit();
    },
    deleteDoc(docId) {
      const f = Store.findDoc(docId);
      if (!f) return;
      if (f.kind === "note") state.notes = state.notes.filter((n) => n.id !== docId);
      else f.project.chapters = f.project.chapters.filter((c) => c.id !== docId);
      if (f.kind === "chapter" && f.project) f.project.updatedAt = now();
      commit();
    },

    /* ---- writing goal (project level) ---- */
    setGoal(pid, goal) {
      const p = state.projects.find((x) => x.id === pid);
      if (!p) return;
      p.goal = goal ? { target: Math.max(1, Math.round(goal.target) || 0),
        daily: goal.daily ? Math.max(1, Math.round(goal.daily)) : 0,
        dayDate: goal.dayDate || "", dayStart: goal.dayStart || 0 } : null;
      p.updatedAt = now();
      commit();
    },

    /* ---- snapshots (chapter / note versions) ---- */
    snapshots(docId) {
      const f = Store.findDoc(docId);
      return (f && f.doc.snapshots) || [];
    },
    createSnapshot(docId, name) {
      const f = Store.findDoc(docId);
      if (!f) return null;
      if (!Array.isArray(f.doc.snapshots)) f.doc.snapshots = [];
      const content = f.doc.content || "";
      const snap = { id: uid("s_"), name: name || "", createdAt: now(), content, words: countWords(content) };
      f.doc.snapshots.unshift(snap);
      if (f.doc.snapshots.length > MAX_SNAPSHOTS) f.doc.snapshots.length = MAX_SNAPSHOTS;
      commit();
      return snap;
    },
    deleteSnapshot(docId, sid) {
      const f = Store.findDoc(docId);
      if (!f || !f.doc.snapshots) return;
      f.doc.snapshots = f.doc.snapshots.filter((s) => s.id !== sid);
      commit();
    },

    /* ---- search (plain JS, on demand — no index) ---- */
    search(query, projectId) {
      const q = (query || "").trim().toLowerCase();
      if (!q) return [];
      const out = [];
      const scan = (doc, project, kind) => {
        const title = doc.title || "";
        const inTitle = title.toLowerCase().indexOf(q);
        const text = plainText(doc.id, doc.content || "");
        const at = text.toLowerCase().indexOf(q);
        if (inTitle < 0 && at < 0) return;
        out.push({ id: doc.id, kind, title, projectId: project ? project.id : null,
          projectTitle: project ? project.title : "", inTitle: inTitle >= 0,
          snippet: at >= 0 ? snippetAt(text, at, q.length) : null });
      };
      state.projects.forEach((p) => {
        if (projectId && p.id !== projectId) return;
        const syn = (p.synopsis || "");
        const sAt = syn.toLowerCase().indexOf(q);
        if (sAt >= 0) out.push({ id: p.id, kind: "synopsis", title: p.title, projectId: p.id,
          projectTitle: p.title, inTitle: false, snippet: snippetAt(syn, sAt, q.length) });
        p.chapters.forEach((c) => scan(c, p, "chapter"));
      });
      if (!projectId) state.notes.forEach((n) => scan(n, null, "note"));
      return out.slice(0, 60);
    },

    /* ---- stats ---- */
    stats() {
      let words = 0, chapters = 0;
      state.projects.forEach((p) => p.chapters.forEach((c) => { words += countWords(c.content); chapters++; }));
      state.notes.forEach((n) => { words += countWords(n.content); });
      return { words, projects: state.projects.length, notes: state.notes.length, chapters };
    },
    projectWords(p) {
      return p.chapters.reduce((s, c) => s + countWords(c.content), 0);
    },

    /* ---- backup ---- */
    exportAll() { return JSON.stringify(state, null, 2); },
    importAll(json) {
      try { const s = migrate(JSON.parse(json)); if (s && s.user) { state = s; textCache.clear(); commit(); return true; } }
      catch (e) {}
      return false;
    },
    reset() { localStorage.removeItem(KEY); state = migrate(seed()); textCache.clear(); commit(); },

    countWords
  };

  window.WritedStore = Store;
})();
