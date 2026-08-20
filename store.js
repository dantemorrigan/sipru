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

  function demoContent(lang) {
    if (lang === "ru") {
      const p1 = {
        id: uid("p_"), title: "Северный свет", status: "draft",
        synopsis: "Роман о смотрителе маяка, который начинает получать письма из будущего.",
        createdAt: now() - 86400000 * 40, updatedAt: now() - 3600000 * 5,
        chapters: [
          { id: uid("c_"), title: "Глава I. Туман", updatedAt: now() - 3600000 * 5,
            content: "<h1>Туман</h1><p>Маяк стоял на краю мира, и каждую ночь Эльса считала удары волн о камень — будто кто-то снаружи просился войти.</p><p>В тот вечер море пахло железом. Она поднялась по ста двадцати ступеням, зажгла лампу и впервые за семь лет услышала, как под дверью шуршит бумага.</p><blockquote>«Вы не знаете меня. Но к зиме вы будете знать слишком много.»</blockquote><p>Письмо было датировано числом, которого ещё не наступило.</p>" },
          { id: uid("c_"), title: "Глава II. Сто двадцать ступеней", updatedAt: now() - 86400000 * 2,
            content: "<h1>Сто двадцать ступеней</h1><p>Утром туман не рассеялся. Эльса спустилась к воде с фонарём и нашла на гальке вторую записку — теми же чернилами, тем же быстрым почерком, что и накануне.</p><p>Она перечитала её трижды, прежде чем поняла: почерк был её собственный.</p>" },
          { id: uid("c_"), title: "Глава III. Чужие чернила", updatedAt: now() - 86400000 * 6,
            content: "<h1>Чужие чернила</h1><p>Смотритель с соседнего острова сказал, что чернила такого оттенка перестали выпускать тридцать лет назад. Эльса промолчала о том, что её перо до сих пор пахнет ими.</p>" }
        ]
      };
      const p2 = {
        id: uid("p_"), title: "Тихие города", status: "done",
        synopsis: "Сборник рассказов о местах, которые помнят больше, чем люди.",
        createdAt: now() - 86400000 * 180, updatedAt: now() - 86400000 * 20,
        chapters: [
          { id: uid("c_"), title: "Площадь без названия", updatedAt: now() - 86400000 * 21,
            content: "<h1>Площадь без названия</h1><p>Каждый город хранит одну площадь, имя которой стёрлось со всех карт, но осталось на губах стариков.</p>" },
          { id: uid("c_"), title: "Дом напротив вокзала", updatedAt: now() - 86400000 * 20,
            content: "<h1>Дом напротив вокзала</h1><p>Поезда приходили реже, чем письма, и реже, чем сны о тех, кто уехал.</p>" }
        ]
      };
      const notes = [
        { id: uid("n_"), title: "Идеи для второй части", status: "draft", updatedAt: now() - 3600000 * 30,
          content: "<h2>Куда дальше</h2><ul><li>Письма начинают противоречить друг другу</li><li>Появляется второй смотритель — или это она сама?</li><li>Финал: лампа гаснет в полдень</li></ul>" },
        { id: uid("n_"), title: "Цитаты и эпиграфы", status: "draft", updatedAt: now() - 86400000 * 4,
          content: "<blockquote>«Время — это вода, которую держат в ладонях.»</blockquote><p>— проверить источник</p>" }
      ];
      return { projects: [p1, p2], notes };
    }
    const p1 = {
      id: uid("p_"), title: "Northern Light", status: "draft",
      synopsis: "A novel about a lighthouse keeper who starts receiving letters from the future.",
      createdAt: now() - 86400000 * 40, updatedAt: now() - 3600000 * 5,
      chapters: [
        { id: uid("c_"), title: "Chapter I. Fog", updatedAt: now() - 3600000 * 5,
          content: "<h1>Fog</h1><p>The lighthouse stood at the edge of the world, and every night Elsa counted the waves striking stone — as if something outside were asking to come in.</p><p>That evening the sea smelled of iron. She climbed the hundred and twenty steps, lit the lamp, and for the first time in seven years heard paper rustling under the door.</p><blockquote>“You don't know me. But by winter you will know too much.”</blockquote><p>The letter was dated a day that hadn't come yet.</p>" },
        { id: uid("c_"), title: "Chapter II. A Hundred and Twenty Steps", updatedAt: now() - 86400000 * 2,
          content: "<h1>A Hundred and Twenty Steps</h1><p>By morning the fog hadn't lifted. Elsa went down to the water with a lantern and found a second note on the shingle — same ink, same quick hand as the day before.</p><p>She read it three times before she understood: the handwriting was her own.</p>" },
        { id: uid("c_"), title: "Chapter III. Someone Else's Ink", updatedAt: now() - 86400000 * 6,
          content: "<h1>Someone Else's Ink</h1><p>The keeper on the neighboring island said that shade of ink stopped being made thirty years ago. Elsa said nothing about her pen still smelling of it.</p>" }
      ]
    };
    const p2 = {
      id: uid("p_"), title: "Quiet Towns", status: "done",
      synopsis: "A collection of stories about places that remember more than people do.",
      createdAt: now() - 86400000 * 180, updatedAt: now() - 86400000 * 20,
      chapters: [
        { id: uid("c_"), title: "The Square With No Name", updatedAt: now() - 86400000 * 21,
          content: "<h1>The Square With No Name</h1><p>Every town keeps one square whose name has faded from every map, yet still lives on the lips of the old.</p>" },
        { id: uid("c_"), title: "The House Across From the Station", updatedAt: now() - 86400000 * 20,
          content: "<h1>The House Across From the Station</h1><p>Trains came less often than letters, and less often than dreams of those who'd left.</p>" }
      ]
    };
    const notes = [
      { id: uid("n_"), title: "Ideas for part two", status: "draft", updatedAt: now() - 3600000 * 30,
        content: "<h2>Where to next</h2><ul><li>The letters start contradicting each other</li><li>A second keeper appears — or is it her?</li><li>Ending: the lamp goes out at noon</li></ul>" },
      { id: uid("n_"), title: "Quotes and epigraphs", status: "draft", updatedAt: now() - 86400000 * 4,
        content: "<blockquote>“Time is water held in open hands.”</blockquote><p>— check source</p>" }
    ];
    return { projects: [p1, p2], notes };
  }

  function seed(lang) {
    const { projects, notes } = demoContent(lang);
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
    const guessLang = (typeof navigator !== "undefined" && navigator.language && navigator.language.startsWith("ru")) ? "ru" : "en";
    const s = migrate(seed(guessLang));
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
      if (!state.onboarded) {
        const { projects, notes } = demoContent(resolvedLang);
        state.projects = projects;
        state.notes = notes;
      }
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
