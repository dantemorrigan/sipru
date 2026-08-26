/* Unit tests for store.js — the one file with no DOM in it and, until now,
   no coverage either. The browser suites drive text through the editor and
   the paginator; none of them touch migration, restore, the content limits
   or what happens when localStorage refuses a write, which is exactly
   where silent data loss lives.

   store.js is a plain IIFE that talks to `window` and `localStorage`, so it
   runs here in a vm sandbox with both faked — no bundler, no browser, and
   the production file is loaded verbatim rather than a copy of it. */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const SRC = fs.readFileSync(path.join(__dirname, "..", "store.js"), "utf8");

const results = [];
function check(name, cond, detail) {
  results.push({ name, ok: !!cond, detail: cond ? "" : (detail || "") });
}
function eq(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  check(name, ok, "expected " + JSON.stringify(expected) + ", got " + JSON.stringify(actual));
}

/* A localStorage good enough for the store: real read-back, and a quota
   that can be closed on demand to reproduce a full disk. */
function makeStorage(opts) {
  const map = new Map();
  const state = { failing: false, limit: (opts && opts.limit) || Infinity, writes: 0 };
  return {
    state,
    api: {
      getItem: (k) => (map.has(k) ? map.get(k) : null),
      setItem: (k, v) => {
        if (state.failing || String(v).length > state.limit) {
          const e = new Error("quota");
          e.name = "QuotaExceededError";
          throw e;
        }
        state.writes++;
        map.set(k, String(v));
      },
      removeItem: (k) => map.delete(k),
    },
  };
}

function freshStore(opts) {
  const storage = makeStorage(opts);
  const sandbox = {
    window: {},
    localStorage: storage.api,
    crypto: require("crypto").webcrypto,
    console,
  };
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(SRC, sandbox, { filename: "store.js" });
  return { store: sandbox.window.SipruStore, storage, sandbox };
}

/* ---------------- ids ---------------- */
{
  const { store } = freshStore();
  const ids = new Set();
  for (let i = 0; i < 2000; i++) ids.add(store.createProject("P" + i));
  check("2000 project ids are all distinct", ids.size === 2000, "got " + ids.size + " unique");
  check("ids keep their type prefix", Array.from(ids).every((id) => id.indexOf("p_") === 0));
}

/* ---------------- content limits ---------------- */
{
  const { store } = freshStore();
  const long = "я".repeat(500);
  const pid = store.createProject(long);
  const p = () => store.get().projects.find((x) => x.id === pid);
  check("a too-long title is capped on create", p().title.length === store.LIMITS.titleMax,
    "length " + p().title.length);

  store.updateProject(pid, { title: long + long });
  check("a too-long title is capped on update", p().title.length === store.LIMITS.titleMax,
    "length " + p().title.length);

  store.updateProject(pid, { title: "  Ровное   название  " });
  eq("a title's whitespace is collapsed and trimmed", p().title, "Ровное название");

  store.updateProject(pid, { title: "   " });
  eq("an all-whitespace title keeps the previous one", p().title, "Ровное название");

  const words = Array.from({ length: 200 }, (_, i) => "слово" + i).join(" ");
  store.updateProject(pid, { synopsis: words });
  const synWords = p().synopsis.split(/\s+/).length;
  eq("a too-long synopsis is capped to the word limit", synWords, store.LIMITS.synopsisMaxWords);
  check("the capped synopsis keeps the first words, in order",
    p().synopsis.indexOf("слово0 слово1 слово2") === 0, p().synopsis.slice(0, 40));

  store.updateProject(pid, { synopsis: "  Ровно три слова  " });
  eq("a synopsis within the limit is kept verbatim (trimmed)", p().synopsis, "Ровно три слова");

  const cid = store.addChapter(pid, long);
  const c = () => p().chapters.find((x) => x.id === cid);
  check("a chapter title is capped too", c().title.length === store.LIMITS.titleMax);
  store.updateDoc(cid, { title: long });
  check("a chapter title is capped on rename", c().title.length === store.LIMITS.titleMax);

  const nid = store.createNote(long);
  const n = () => store.get().notes.find((x) => x.id === nid);
  check("a note title is capped", n().title.length === store.LIMITS.titleMax);

  const partId = store.addPart(pid, long);
  const part = () => p().parts.find((x) => x.id === partId);
  check("a part title is capped", part().title.length === store.LIMITS.titleMax);

  /* the limit is a cap, not a rewrite: ordinary text is untouched */
  store.updateDoc(cid, { title: "Глава 1" });
  eq("an ordinary title passes through unchanged", c().title, "Глава 1");
}

/* ---------------- migration / restore ---------------- */
{
  const { store } = freshStore();
  const before = store.exportAll();

  check("a JSON array is rejected as a store", store.importAll("[1,2,3]") === false);
  check("a JSON string is rejected as a store", store.importAll('"nope"') === false);
  check("a number is rejected as a store", store.importAll("42") === false);
  check("malformed JSON is rejected", store.importAll("{oh no") === false);
  eq("a rejected restore leaves the data untouched", store.exportAll(), before);

  const good = JSON.stringify({
    user: { name: "A", lang: "ru" },
    projects: [{ id: "p_1", title: "Книга", chapters: [{ id: "c_1", title: "Глава", content: "<p>x</p>" }] }],
    notes: [],
  });
  check("a well-formed backup restores", store.importAll(good) === true);
  eq("the restored project is there", store.get().projects.length, 1);
  eq("the restored chapter is there", store.get().projects[0].chapters.length, 1);

  /* junk entries are dropped rather than left to crash a render later */
  const messy = JSON.stringify({
    user: { name: "A" },
    projects: [null, "nope", 7, { id: "p_2", title: "Ок", chapters: [null, { id: "c_2", title: "Гл" }] }],
    notes: [null, { id: "n_1", title: "Заметка" }],
  });
  check("a backup with junk entries still restores", store.importAll(messy) === true);
  eq("junk projects are dropped", store.get().projects.length, 1);
  eq("junk chapters are dropped", store.get().projects[0].chapters.length, 1);
  eq("junk notes are dropped", store.get().notes.length, 1);

  /* an entry with no id would collide with every other id-less entry */
  const noIds = JSON.stringify({
    user: {}, notes: [],
    projects: [{ title: "A", chapters: [{ title: "x" }, { title: "y" }] },
               { title: "B", chapters: [] }],
  });
  check("a backup with missing ids restores", store.importAll(noIds) === true);
  const st = store.get();
  const allIds = [st.projects[0].id, st.projects[1].id,
    st.projects[0].chapters[0].id, st.projects[0].chapters[1].id];
  check("missing ids are filled in and unique", new Set(allIds).size === 4 && allIds.every(Boolean),
    JSON.stringify(allIds));

  /* the limits apply to restored data too, not just to typed data */
  const oversize = JSON.stringify({
    user: {}, notes: [],
    projects: [{ id: "p_3", title: "т".repeat(400),
      synopsis: Array.from({ length: 120 }, (_, i) => "w" + i).join(" "), chapters: [] }],
  });
  check("an oversized backup restores", store.importAll(oversize) === true);
  const p3 = store.get().projects[0];
  eq("a restored title is capped", p3.title.length, store.LIMITS.titleMax);
  eq("a restored synopsis is capped", p3.synopsis.split(/\s+/).length, store.LIMITS.synopsisMaxWords);

  /* a chapter pointing at a part that isn't there must not vanish */
  const orphan = JSON.stringify({
    user: {}, notes: [],
    projects: [{ id: "p_4", title: "A", parts: [{ id: "pt_real", title: "Часть" }],
      chapters: [{ id: "c_3", title: "Гл", partId: "pt_gone" }] }],
  });
  check("a backup with an orphaned chapter restores", store.importAll(orphan) === true);
  eq("the orphaned chapter is kept", store.get().projects[0].chapters.length, 1);
  eq("the orphaned chapter falls back to the project root",
    store.get().projects[0].chapters[0].partId, null);
}

/* ---------------- restore rolls back on a failed write ---------------- */
{
  const { store, storage } = freshStore();
  const pid = store.createProject("Настоящая книга");
  store.addChapter(pid, "Глава");
  const before = store.exportAll();

  storage.state.failing = true;
  const big = JSON.stringify({ user: { name: "B" }, projects: [], notes: [] });
  const sizeBefore = store.storageUsage().bytes;
  check("a restore that cannot be written reports failure", store.importAll(big) === false);
  eq("a failed restore leaves the previous data in memory", store.exportAll(), before);
  eq("a failed restore does not report the unwritten size", store.storageUsage().bytes, sizeBefore);
  check("the previous project is still there",
    store.get().projects.length === 1 && store.get().projects[0].title === "Настоящая книга");
}

/* ---------------- persistence failures are reported ---------------- */
{
  const { store, storage } = freshStore();
  const seen = [];
  store.onPersistError((info) => seen.push(info.kind));

  store.createProject("A");
  eq("a healthy write reports nothing", seen.length, 0);
  check("a healthy store reads as writable", store.isWritable() === true);

  storage.state.failing = true;
  store.createProject("B");
  eq("a failed write is reported once", seen, ["quota"]);
  check("the store now reads as not writable", store.isWritable() === false);

  store.createProject("C");
  store.createProject("D");
  eq("further failures do not re-report (no toast per keystroke)", seen, ["quota"]);

  storage.state.failing = false;
  store.createProject("E");
  check("the store reads as writable again once a write succeeds", store.isWritable() === true);
  store.createProject("F");
  eq("nothing new is reported while writes succeed", seen, ["quota"]);

  /* a second failure after a recovery is a new event and is reported */
  storage.state.failing = true;
  store.createProject("G");
  eq("a fresh failure after a recovery is reported again", seen, ["quota", "quota"]);
}

/* ---------------- storage usage ---------------- */
{
  const { store } = freshStore();
  const empty = store.storageUsage();
  check("usage is reported", empty && typeof empty.bytes === "number", JSON.stringify(empty));
  check("a seeded store reports a non-zero size", empty.bytes > 0, "bytes " + empty.bytes);
  check("an empty store is nowhere near the budget", empty.ratio < 0.05, "ratio " + empty.ratio);

  const pid = store.createProject("Большая книга");
  const cid = store.addChapter(pid, "Глава");
  store.updateDoc(cid, { content: "<p>" + "текст ".repeat(50000) + "</p>" });
  const full = store.storageUsage();
  check("usage grows with the text", full.bytes > empty.bytes,
    empty.bytes + " -> " + full.bytes);
  check("the ratio is measured against the budget",
    Math.abs(full.ratio - full.bytes / full.budget) < 1e-9);
}

/* ---------------- search ---------------- */
{
  const { store } = freshStore();
  const pid = store.createProject("Книга про море");
  for (let i = 0; i < 90; i++) {
    const cid = store.addChapter(pid, "Глава " + i);
    store.updateDoc(cid, { content: "<p>Здесь встречается море, много раз.</p>" });
  }
  const r = store.search("море");
  eq("the result list is capped", r.length, store.SEARCH_LIMIT);
  check("the true total is reported", r.total > r.length, "total " + r.total);
  check("the cap is flagged", r.truncated === true);

  const few = store.search("Глава 7");
  check("an uncapped search is not flagged as truncated", few.truncated === false);
  eq("an uncapped search reports its own length as the total", few.total, few.length);

  eq("an empty query finds nothing", store.search("").length, 0);

  /* the synopsis is searchable, and matches the project rather than a doc */
  store.updateProject(pid, { synopsis: "Роман о китобоях и северных водах" });
  const syn = store.search("китобоях");
  check("a synopsis match is returned", syn.length === 1 && syn[0].kind === "synopsis",
    JSON.stringify(syn.map((x) => x.kind)));
}

/* ---------------- structure edits keep text ---------------- */
{
  const { store } = freshStore();
  const pid = store.createProject("Книга");
  const partId = store.addPart(pid, "Часть первая");
  const c1 = store.addChapter(pid, "Глава 1", { partId });
  const c2 = store.addChapter(pid, "Глава 2", { partId });
  store.updateDoc(c1, { content: "<p>Первая.</p>" });
  store.updateDoc(c2, { content: "<p>Вторая.</p>" });

  store.deletePart(pid, partId);
  const p = store.get().projects.find((x) => x.id === pid);
  eq("deleting a part keeps its chapters", p.chapters.length, 2);
  eq("the chapters move back to the project root",
    p.chapters.map((c) => c.partId), [null, null]);
  eq("the text is untouched", p.chapters[0].content, "<p>Первая.</p>");

  store.moveChapter(pid, c1, null, 1);
  eq("moveChapter reorders the flat list",
    store.get().projects.find((x) => x.id === pid).chapters.map((c) => c.id), [c2, c1]);

  eq("word counts follow the text", store.projectWords(store.get().projects.find((x) => x.id === pid)), 2);
}

/* ---------------- snapshots ---------------- */
{
  const { store } = freshStore();
  const pid = store.createProject("Книга");
  const cid = store.addChapter(pid, "Глава");
  for (let i = 0; i < 40; i++) {
    store.updateDoc(cid, { content: "<p>Версия " + i + "</p>" });
    store.createSnapshot(cid, "v" + i);
  }
  const snaps = store.snapshots(cid);
  eq("snapshots are capped at 30", snaps.length, 30);
  eq("the newest snapshot is first", snaps[0].name, "v39");
  eq("a snapshot records its own word count", snaps[0].words, 2);
}

const passed = results.filter((r) => r.ok).length;
console.log(passed + "/" + results.length + " passed");
const failed = results.filter((r) => !r.ok);
if (failed.length) {
  console.error("\nFAILED:\n" + failed.map((f) => "  - " + f.name + (f.detail ? "\n    " + f.detail : "")).join("\n"));
  process.exit(1);
}
