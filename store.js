/* ============================================================
   Sipru — local data store
   ============================================================ */
(function () {
  const KEY = "sipru:v1";
  const LEGACY_KEY = "writed:v1"; /* pre-rename installs still load once */
  const listeners = new Set();
  /* Ids are compared, never parsed, so the only thing that matters is that
     two of them never collide. The crypto RNG gives that outright; the
     Math.random() tail stays as the fallback for any context that doesn't
     expose one (and every id already written by an older build keeps
     working, since nothing reads structure out of them). */
  function rand() {
    try {
      const c = typeof crypto !== "undefined" ? crypto : null;
      if (c && c.randomUUID) return c.randomUUID().replace(/-/g, "").slice(0, 12);
      if (c && c.getRandomValues) {
        const b = new Uint8Array(6);
        c.getRandomValues(b);
        return Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
      }
    } catch (e) {}
    return Math.random().toString(36).slice(2, 9);
  }
  const uid = (p) => p + rand();
  const now = () => Date.now();

  /* ---- content limits ----
     A title that never ends and a synopsis the length of a chapter both
     break layout somewhere downstream (dashboard cards, the export title
     page). The editing UI enforces these as you type; enforcing them here
     too means text arriving by any other route — a restored backup, a
     vault file written by another build — lands inside the same bounds
     rather than reintroducing the same layout bug. */
  const LIMITS = { titleMax: 120, synopsisMinWords: 3, synopsisMaxChars: 300 };

  function clampTitle(s) {
    const t = String(s == null ? "" : s).replace(/\s+/g, " ").trim();
    return t.length > LIMITS.titleMax ? t.slice(0, LIMITS.titleMax).trim() : t;
  }
  function clampSynopsis(s) {
    const t = String(s == null ? "" : s).trim();
    return t.length > LIMITS.synopsisMaxChars ? t.slice(0, LIMITS.synopsisMaxChars).trim() : t;
  }

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
      user: { name: "", theme: "light", editorFont: "book", lang: "en", dailyGoal: 500, createdAt: now() },
      onboarded: false,
      days: {},
      projects,
      notes
    };
  }

  const SCHEMA = 3;
  const MAX_SNAPSHOTS = 30;
  const SEARCH_LIMIT = 60;

  /* ---- page & typography defaults ----
     Millimetres for the sheet, points for type — the units a writer thinks
     in. Stored per project (a book lays out as one object) and per note.
     Anything missing falls back here, so a project saved before this
     existed simply reads the defaults. */
  const PAGE_DEFAULTS = {
    size: "a4", orient: "portrait", w: 210, h: 297,   /* w/h only used by size:"custom" */
    mt: 20, mr: 18, mb: 20, ml: 18,                   /* margins, mm */
    fontSize: 12,                                     /* pt */
    leading: 1.5,                                     /* line-height multiplier */
    align: "left",                                    /* left | justify | center | right */
    indent: 0,                                        /* first line, em — off by default:
                                                         a fresh document writes flush left,
                                                         like Docs; the writer turns the
                                                         indent on in page setup if they
                                                         want a book indent */
    padL: 0, padR: 0,                                 /* extra block indents, em */
    spaceBefore: 0, spaceAfter: 0.55,                 /* paragraph spacing, em */
    hyphens: true,
    hdr: { on: false, l: "", c: "", r: "" },
    ftr: { on: true, l: "", c: "page", r: "" },
    firstBare: true,                                  /* no header/footer on page 1 */
    mirror: false,                                    /* swap left/right on even pages */
    numFrom: 1,
    zoom: 1
  };
  function resolvePage(src) {
    const p = Object.assign({}, PAGE_DEFAULTS, src || {});
    p.hdr = Object.assign({}, PAGE_DEFAULTS.hdr, (src && src.hdr) || {});
    p.ftr = Object.assign({}, PAGE_DEFAULTS.ftr, (src && src.ftr) || {});
    return p;
  }

  /* Non-destructive migration: only adds missing fields, never drops data.
     It is also the gate every restored backup passes through, so the shape
     checks are real rather than nominal — an array, a string or a number
     parsed out of a JSON file is not a store, and accepting one would
     replace the writer's work with an empty one. */
  function migrate(s) {
    if (!s || typeof s !== "object" || Array.isArray(s)) return null;
    if (!s.user || typeof s.user !== "object" || Array.isArray(s.user)) s.user = {};
    /* the daily writing goal the dashboard's streak card measures against;
       0 turns the card's goal line off, so an explicit 0 is preserved */
    if (typeof s.user.dailyGoal !== "number" || !isFinite(s.user.dailyGoal) || s.user.dailyGoal < 0) s.user.dailyGoal = 500;
    if (!s.days || typeof s.days !== "object" || Array.isArray(s.days)) s.days = {};
    if (!Array.isArray(s.projects)) s.projects = [];
    if (!Array.isArray(s.notes)) s.notes = [];
    /* A malformed entry is dropped rather than left to crash a render
       later: every screen assumes a project has an id and a chapters
       array. */
    s.projects = s.projects.filter((p) => p && typeof p === "object" && !Array.isArray(p));
    s.notes = s.notes.filter((n) => n && typeof n === "object" && !Array.isArray(n));
    s.projects.forEach((p) => {
      if (!p.id) p.id = uid("p_");
      p.title = clampTitle(p.title);
      p.synopsis = clampSynopsis(p.synopsis);
      if (!Array.isArray(p.chapters)) p.chapters = [];
      p.chapters = p.chapters.filter((c) => c && typeof c === "object" && !Array.isArray(c));
      p.chapters.forEach((c) => { if (!c.id) c.id = uid("c_"); c.title = clampTitle(c.title); });
      if (p.goal === undefined) p.goal = null;
      /* v3: structure (parts) + page setup. Both are additive — a project
         written by an older build has neither and reads as "no parts,
         default page", which is exactly what it was. */
      if (!Array.isArray(p.parts)) p.parts = [];
      p.parts = p.parts.filter((x) => x && typeof x === "object" && !Array.isArray(x));
      p.parts.forEach((x) => { if (!x.id) x.id = uid("pt_"); x.title = clampTitle(x.title); });
      if (p.page === undefined) p.page = null;
      p.chapters.forEach((c) => {
        if (!Array.isArray(c.snapshots)) c.snapshots = [];
        if (c.partId === undefined) c.partId = null;
        if (!c.status) c.status = "draft";
      });
      /* a chapter pointing at a part that no longer exists falls back to
         the project root rather than disappearing from the outline */
      const partIds = new Set(p.parts.map((x) => x.id));
      p.chapters.forEach((c) => { if (c.partId && !partIds.has(c.partId)) c.partId = null; });
    });
    s.notes.forEach((n) => {
      if (!n.id) n.id = uid("n_");
      n.title = clampTitle(n.title);
      if (!Array.isArray(n.snapshots)) n.snapshots = [];
      if (n.page === undefined) n.page = null;
      if (!n.status) n.status = "draft";
    });
    s.version = SCHEMA;
    return s;
  }

  /* ---- persistence failures are not a silent condition ----
     localStorage.setItem genuinely fails: a full quota (a long book, or a
     few pasted base64 images), or a browser configured to refuse writes.
     Swallowing that is the worst possible outcome here — the writer keeps
     typing into a store that never reaches disk and finds out only when
     they reload. Anything listening gets told the first time a write
     fails, so the UI can say so while the text is still on screen. */
  const errorListeners = new Set();
  let writable = true;
  /* Size of the last thing written, in characters. Recorded here rather
     than measured on demand: every commit already serializes the whole
     state, and doing it a second time to draw a warning would put a full
     re-serialization of the book on every render. */
  let lastSize = 0;

  function isQuotaError(e) {
    if (!e) return false;
    return e.name === "QuotaExceededError" || e.name === "NS_ERROR_DOM_QUOTA_REACHED" ||
      e.code === 22 || e.code === 1014;
  }

  function persist(s) {
    try {
      const json = JSON.stringify(s);
      lastSize = json.length;
      localStorage.setItem(KEY, json);
      writable = true;
      return true;
    } catch (e) {
      /* Report the transition, not every keystroke after it: an unwritable
         store fails on every commit, and a toast per keystroke would bury
         the app rather than warn about it. */
      const first = writable;
      writable = false;
      if (first) {
        const info = { kind: isQuotaError(e) ? "quota" : "write", error: e };
        errorListeners.forEach((fn) => { try { fn(info); } catch (e2) {} });
      }
      return false;
    }
  }
  /* ---- writing activity ----
     One row per calendar day, two numbers each: the total word count the
     day opened on and the highest it reached. Today's words, the week and
     the streak all derive from those, so a year of history costs a couple
     of kilobytes and nothing has to be recomputed from the text itself.
     `end` tracks the peak rather than the latest total on purpose —
     deleting a chapter in the evening should not erase the morning's
     work from the streak. */
  const ACTIVITY_DAYS = 400;
  const dayKey = (d) => {
    const t = d instanceof Date ? d : new Date(d);
    return new Date(t.getTime() - t.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  };
  function totalWords() {
    let n = 0;
    state.projects.forEach((p) => p.chapters.forEach((c) => {
      n += typeof c.words === "number" ? c.words : countWords(c.content);
    }));
    state.notes.forEach((d) => { n += typeof d.words === "number" ? d.words : countWords(d.content); });
    return n;
  }
  /* Called from every commit, so it is deliberately cheap: the sum above
     reads each document's cached count, and a day already recorded within
     the last few seconds is left alone. */
  let lastTouch = 0;
  function touchActivity() {
    if (!state.days || typeof state.days !== "object" || Array.isArray(state.days)) state.days = {};
    const key = dayKey(new Date());
    const row = state.days[key];
    const stamp = Date.now();
    if (row && stamp - lastTouch < 4000) return;
    lastTouch = stamp;
    const total = totalWords();
    if (!row) state.days[key] = { start: total, end: total };
    else row.end = Math.max(row.end || 0, total);
    const keys = Object.keys(state.days);
    if (keys.length > ACTIVITY_DAYS) {
      keys.sort();
      keys.slice(0, keys.length - ACTIVITY_DAYS).forEach((k) => { delete state.days[k]; });
    }
  }
  function dayWords(key) {
    const row = state.days && state.days[key];
    if (!row) return 0;
    return Math.max(0, (row.end || 0) - (row.start || 0));
  }

  function commit() {
    touchActivity();
    persist(state);
    listeners.forEach((fn) => fn(state));
  }

  /* Declared after persist(): seeding a brand-new install writes through it
     straight away, so it has to already exist by the time this runs. */
  function load() {
    try {
      const raw = localStorage.getItem(KEY) || localStorage.getItem(LEGACY_KEY);
      if (raw) {
        const parsed = migrate(JSON.parse(raw));
        if (parsed) { lastSize = raw.length; return parsed; }
      }
    } catch (e) {}
    const s = migrate(seed());
    persist(s);
    return s;
  }
  let state = load();

  const Store = {
    get: () => state,
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    /* fires once when saving starts failing (quota full, writes refused) */
    onPersistError(fn) { errorListeners.add(fn); return () => errorListeners.delete(fn); },
    isWritable: () => writable,

    /* ---- how close the store is to filling its budget ----
       No browser publishes an exact localStorage quota, but ~5M characters
       is the near-universal floor, so that is what "nearly full" is
       measured against. Reads the size recorded by the last write, so
       asking is free — it is used to nudge for a backup *before* the write
       that fails, not after. */
    LIMITS,
    STORAGE_BUDGET: 5 * 1024 * 1024,
    storageUsage() {
      return { bytes: lastSize, budget: Store.STORAGE_BUDGET, ratio: lastSize / Store.STORAGE_BUDGET };
    },

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
      const p = { id: uid("p_"), title: clampTitle(title) || "Без названия", status: "draft",
        synopsis: "", createdAt: now(), updatedAt: now(), chapters: [], parts: [], page: null };
      state.projects.unshift(p); commit(); return p.id;
    },
    updateProject(id, patch) {
      const p = state.projects.find((x) => x.id === id);
      if (!p) return;
      const next = Object.assign({}, patch);
      if (next.title != null) next.title = clampTitle(next.title) || p.title;
      if (next.synopsis != null) next.synopsis = clampSynopsis(next.synopsis);
      Object.assign(p, next, { updatedAt: now() });
      commit();
    },
    deleteProject(id) { state.projects = state.projects.filter((p) => p.id !== id); commit(); },
    reorderChapters(pid, ids) {
      const p = state.projects.find((x) => x.id === pid);
      if (p) { p.chapters.sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id)); p.updatedAt = now(); commit(); }
    },
    addChapter(pid, title, opts) {
      const p = state.projects.find((x) => x.id === pid);
      if (!p) return null;
      const c = { id: uid("c_"), title: clampTitle(title) || ("Глава " + (p.chapters.length + 1)),
        content: "", updatedAt: now(), status: "draft",
        partId: opts && opts.partId ? opts.partId : null };
      if (opts && Number.isInteger(opts.index)) p.chapters.splice(Math.max(0, Math.min(opts.index, p.chapters.length)), 0, c);
      else p.chapters.push(c);
      p.updatedAt = now(); commit(); return c.id;
    },
    deleteChapter(pid, cid) {
      const p = state.projects.find((x) => x.id === pid);
      if (p) { p.chapters = p.chapters.filter((c) => c.id !== cid); p.updatedAt = now(); commit(); }
    },

    /* ---- structure: parts (an optional layer above chapters) ---- */
    addPart(pid, title) {
      const p = state.projects.find((x) => x.id === pid);
      if (!p) return null;
      const part = { id: uid("pt_"), title: clampTitle(title), createdAt: now() };
      p.parts.push(part); p.updatedAt = now(); commit(); return part.id;
    },
    updatePart(pid, partId, patch) {
      const p = state.projects.find((x) => x.id === pid);
      const part = p && p.parts.find((x) => x.id === partId);
      if (!part) return;
      const next = Object.assign({}, patch);
      if (next.title != null) next.title = clampTitle(next.title);
      Object.assign(part, next); p.updatedAt = now(); commit();
    },
    /* Deleting a part never deletes text: its chapters move back up to the
       project root. */
    deletePart(pid, partId) {
      const p = state.projects.find((x) => x.id === pid);
      if (!p) return;
      p.parts = p.parts.filter((x) => x.id !== partId);
      p.chapters.forEach((c) => { if (c.partId === partId) c.partId = null; });
      p.updatedAt = now(); commit();
    },
    reorderParts(pid, ids) {
      const p = state.projects.find((x) => x.id === pid);
      if (!p) return;
      p.parts.sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id));
      p.updatedAt = now(); commit();
    },
    /* Drag & drop lands here: one call re-parents a chapter and drops it at
       a given position in the flat chapter list, which stays the single
       source of order for export, the vault and the dashboard alike. */
    moveChapter(pid, cid, partId, index) {
      const p = state.projects.find((x) => x.id === pid);
      if (!p) return;
      const from = p.chapters.findIndex((c) => c.id === cid);
      if (from < 0) return;
      const [c] = p.chapters.splice(from, 1);
      c.partId = partId || null;
      const to = Math.max(0, Math.min(index == null ? p.chapters.length : index, p.chapters.length));
      p.chapters.splice(to, 0, c);
      p.updatedAt = now(); commit();
    },

    /* ---- page setup (per project for chapters, per note for notes) ---- */
    PAGE_DEFAULTS,
    resolvePage,
    getPage(docId) {
      const f = Store.findDoc(docId);
      if (!f) return resolvePage(null);
      return resolvePage(f.project ? f.project.page : f.doc.page);
    },
    setPage(docId, patch) {
      const f = Store.findDoc(docId);
      if (!f) return;
      const holder = f.project || f.doc;
      const next = resolvePage(holder.page);
      Object.keys(patch || {}).forEach((k) => {
        if (k === "hdr" || k === "ftr") next[k] = Object.assign({}, next[k], patch[k]);
        else next[k] = patch[k];
      });
      holder.page = next;
      holder.updatedAt = now();
      commit();
    },

    /* ---- notes ---- */
    createNote(title) {
      const n = { id: uid("n_"), title: clampTitle(title) || "Новая заметка", status: "draft",
        createdAt: now(), updatedAt: now(), content: "", page: null };
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
      if (patch && patch.title != null) {
        patch = Object.assign({}, patch, { title: clampTitle(patch.title) || f.doc.title });
      }
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
      /* The list is capped so a very broad query can't render thousands of
         rows, but the cap is reported rather than hidden — "40 results"
         when there were 400 is a wrong answer, not a short one. */
      const shown = out.slice(0, SEARCH_LIMIT);
      shown.total = out.length;
      shown.truncated = out.length > shown.length;
      return shown;
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

    /* Today's words, the last seven days and the run of consecutive days
       with writing in them. The streak counts back from today, but a day
       that has not been written in *yet* does not break it — otherwise
       every morning would show a zero. */
    activity() {
      const today = dayKey(new Date());
      const todayWords = dayWords(today);
      let week = 0;
      const recent = [];
      for (let i = 13; i >= 0; i--) {
        const k = dayKey(Date.now() - i * 86400000);
        const w = dayWords(k);
        recent.push({ day: k, words: w });
        if (i < 7) week += w;
      }
      let streak = 0;
      for (let i = todayWords > 0 ? 0 : 1; i < ACTIVITY_DAYS; i++) {
        if (dayWords(dayKey(Date.now() - i * 86400000)) <= 0) break;
        streak++;
      }
      const goal = Math.max(0, parseInt(state.user && state.user.dailyGoal, 10) || 0);
      return { today: todayWords, goal, week, streak, recent };
    },

    /* The single most recently touched document, with the project it
       belongs to — what the dashboard offers to carry on with. */
    lastWritten() {
      let best = null;
      state.projects.forEach((p) => p.chapters.forEach((c) => {
        if (!best || (c.updatedAt || 0) > (best.doc.updatedAt || 0)) best = { doc: c, project: p, kind: "chapter" };
      }));
      state.notes.forEach((d) => {
        if (!best || (d.updatedAt || 0) > (best.doc.updatedAt || 0)) best = { doc: d, project: null, kind: "note" };
      });
      return best;
    },

    /* ---- backup ---- */
    exportAll() { return JSON.stringify(state, null, 2); },
    /* Restoring replaces everything the writer has, so it only commits once
       the incoming state has both parsed and been written to disk. If the
       write fails (a backup larger than the remaining quota), the previous
       state is put back rather than left half-replaced in memory — the
       reload would otherwise resurrect the old data and silently discard
       the restore the writer thinks succeeded. */
    importAll(json) {
      const backup = state;
      const backupSize = lastSize;
      let s;
      try { s = migrate(JSON.parse(json)); } catch (e) { return false; }
      if (!s || !s.user) return false;
      state = s;
      textCache.clear();
      if (!persist(state)) {
        state = backup;
        lastSize = backupSize;   /* the failed write is not what's on disk */
        textCache.clear();
        return false;
      }
      listeners.forEach((fn) => fn(state));
      return true;
    },
    reset() { localStorage.removeItem(KEY); localStorage.removeItem(LEGACY_KEY); state = migrate(seed()); textCache.clear(); commit(); },

    countWords, clampTitle, clampSynopsis, SEARCH_LIMIT
  };

  window.SipruStore = Store;
})();
