/* ============================================================
   Sipru. — Dashboard + Project (folder) view
   ============================================================ */

/* ---- Confirm delete dialog ---- */
function ConfirmDelete({ title, what, onConfirm, onCancel, lang }) {
  const tl = T(lang || "en");
  const [closing, close] = useDismiss(onCancel);
  return (
    <div className={"modal-scrim" + closing} onMouseDown={close}>
      <div className="confirm-modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="confirm-icon"><Icon name="trash" size={22} /></div>
        <div className="confirm-title">{tl("confirm_delete_q")} {what}?</div>
        <div className="confirm-name">«{title}»</div>
        <p className="confirm-note mono">{tl("confirm_delete_body")}</p>
        <div className="confirm-actions">
          <button className="btn btn--ghost" onClick={close}>{tl("confirm_cancel")}</button>
          <button className="btn btn--danger" onClick={onConfirm}><Icon name="trash" size={15}/> {tl("confirm_delete_btn")}</button>
        </div>
      </div>
    </div>
  );
}

/* ---- Sort options + helper ---- */
const SORT_KEYS = ["created_desc", "created_asc", "updated_desc", "title_asc"];
function sortItems(arr, sort) {
  const c = (x) => x.createdAt || x.updatedAt || 0;
  const u = (x) => x.updatedAt || x.createdAt || 0;
  const out = arr.slice();
  switch (sort) {
    case "created_asc":  out.sort((a, b) => c(a) - c(b)); break;
    case "updated_desc": out.sort((a, b) => u(b) - u(a)); break;
    case "title_asc":    out.sort((a, b) => (a.title || "").localeCompare(b.title || "")); break;
    case "created_desc":
    default:             out.sort((a, b) => c(b) - c(a)); break;
  }
  return out;
}

/* ---- Sort dropdown menu ---- */
function SortMenu({ value, onChange, lang, compact }) {
  const [open, setOpen] = useState(false);
  const tl = T(lang || "en");
  const SORT_LABELS = {
    created_desc: tl("sort_created_desc"),
    created_asc:  tl("sort_created_asc"),
    updated_desc: tl("sort_updated"),
    title_asc:    tl("sort_title_asc"),
  };
  const cur = SORT_LABELS[value] || SORT_LABELS.created_desc;
  return (
    <div className={"sortmenu" + (compact ? " sortmenu--compact" : "")}>
      <button className={"sortmenu-btn" + (open ? " on" : "")} onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox" aria-expanded={open} title={compact ? tl("sort_btn_title") : null}>
        <Icon name="sort" size={15} />
        {!compact && <>
          <span className="sortmenu-cur">{cur}</span>
          <Icon name="chevron" size={13} className={"sortmenu-chev" + (open ? " open" : "")} />
        </>}
      </button>
      {open && (
        <React.Fragment>
          <div className="sortmenu-scrim" onClick={() => setOpen(false)} />
          <div className="sortmenu-pop" role="listbox">
            <div className="sortmenu-pop-h mono">{tl("sort_header")}</div>
            {SORT_KEYS.map((k) => (
              <button key={k} role="option" aria-selected={value === k}
                className={"sortmenu-opt" + (value === k ? " on" : "")}
                onClick={() => { onChange(k); setOpen(false); }}>
                <span>{SORT_LABELS[k]}</span>
                {value === k && <Icon name="check" size={14} />}
              </button>
            ))}
          </div>
        </React.Fragment>
      )}
    </div>
  );
}

/* ---- file import (txt / md / html) — shared by dashboard & project ---- */
function ImportButton({ lang, onFile, onToast, label, className, children }) {
  const tl = T(lang || "en");
  const ref = useRef(null);
  async function onChange(e) {
    const f = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!f) return;
    try {
      const parsed = await SipruFormats.importFile(f);
      onFile(parsed);
      onToast && onToast(tl("import_ok"));
    } catch (err) {
      onToast && onToast(tl(err && err.message === "unsupported" ? "import_err_type" : "import_err"));
    }
  }
  return (
    <>
      <button className={className || "btn btn--ghost"} onClick={() => ref.current.click()}
        title={tl("import_hint")}>
        {children || (<><Icon name="upload" size={16} /> {label || tl("import_btn")}</>)}
      </button>
      <input ref={ref} type="file" style={{ display: "none" }}
        accept={SipruFormats.IMPORT_ACCEPT} onChange={onChange} />
    </>
  );
}

/* ---- project writing goal ---- */
const todayKey = () => new Date().toISOString().slice(0, 10);

function GoalBlock({ p, store, words, lang }) {
  const tl = T(lang || "en");
  const locale = lang === "ru" ? "ru-RU" : "en-US";
  const [editing, setEditing] = useState(false);
  const goal = p.goal;

  /* daily goal keeps a single baseline for the current day — no history */
  useEffect(() => {
    if (!goal || !goal.daily) return;
    const day = todayKey();
    if (goal.dayDate !== day) store.setGoal(p.id, { ...goal, dayDate: day, dayStart: words });
  }, [goal && goal.daily, goal && goal.dayDate, p.id]);

  if (editing || !goal) {
    return <GoalEditor p={p} store={store} words={words} lang={lang}
      onDone={() => setEditing(false)} compact={!goal && !editing} onEdit={() => setEditing(true)} />;
  }

  const pct = Math.min(100, Math.round((words / goal.target) * 100));
  const today = goal.daily ? Math.max(0, words - (goal.dayStart || 0)) : 0;
  return (
    <div className="goal-block">
      <div className="goal-line mono">
        <span className="goal-cur">{words.toLocaleString(locale)}</span>
        <span className="goal-sep">/</span>
        <span>{goal.target.toLocaleString(locale)} {tl("word_many")}</span>
        <button className="goal-edit" onClick={() => setEditing(true)} title={tl("goal_edit")}>
          <Icon name="settings" size={13} />
        </button>
      </div>
      <ProgressBar value={words} max={goal.target} accent={words >= goal.target} />
      <div className="goal-meta mono">
        {words >= goal.target ? tl("goal_done") : pct + "%"}
        {goal.daily > 0 && <> · {tl("goal_today")} {today.toLocaleString(locale)}/{goal.daily.toLocaleString(locale)}</>}
      </div>
    </div>
  );
}

function GoalEditor({ p, store, words, lang, onDone, compact, onEdit }) {
  const tl = T(lang || "en");
  const goal = p.goal;
  const [target, setTarget] = useState(String((goal && goal.target) || Math.max(10000, Math.ceil(words / 1000) * 1000)));
  const [daily, setDaily] = useState(String((goal && goal.daily) || ""));

  if (compact) {
    return (
      <button className="status-toggle mono goal-add" onClick={onEdit}>
        <Icon name="target" size={14} /> {tl("goal_set")}
      </button>
    );
  }

  function save() {
    const tgt = parseInt(String(target).replace(/\D/g, ""), 10);
    if (!tgt) return;
    const d = parseInt(String(daily).replace(/\D/g, ""), 10) || 0;
    store.setGoal(p.id, { target: tgt, daily: d, dayDate: d ? todayKey() : "", dayStart: d ? words : 0 });
    onDone();
  }

  return (
    <div className="goal-block goal-block--edit">
      <label className="goal-field mono">{tl("goal_target")}
        <input inputMode="numeric" value={target} onChange={(e) => setTarget(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && save()} />
      </label>
      <label className="goal-field mono">{tl("goal_daily")}
        <input inputMode="numeric" value={daily} placeholder={tl("goal_daily_off")}
          onChange={(e) => setDaily(e.target.value)} onKeyDown={(e) => e.key === "Enter" && save()} />
      </label>
      <div className="goal-actions">
        <button className="btn btn--accent btn--xs" onClick={save}>{tl("goal_save")}</button>
        <button className="btn btn--ghost btn--xs" onClick={onDone}>{tl("confirm_cancel")}</button>
        {p.goal && <button className="btn btn--ghost btn--xs goal-off"
          onClick={() => { store.setGoal(p.id, null); onDone(); }}>{tl("goal_remove")}</button>}
      </div>
    </div>
  );
}

/* ---- Continue where you left off ----
   The single most recently edited document, with its project's progress
   under it. It is the first thing on the dashboard because it is the
   answer to the question the greeting asks. */
function ContinueCard({ store, nav, lang, locale }) {
  const tl = T(lang || "en");
  const last = store.lastWritten();
  if (!last) return null;
  const p = last.project;
  const words = p ? store.projectWords(p) : (last.doc.words || countWords(last.doc.content));
  /* the meter reads against the project's word goal when it has one, and
     against its finished chapters when it does not — a full bar with
     nothing behind it would be a lie either way */
  const target = p && p.goal && p.goal.target ? p.goal.target : 0;
  const done = p ? p.chapters.filter((c) => c.status === "done").length : 0;
  const pct = target ? Math.min(100, Math.round((words / target) * 100))
    : p && p.chapters.length ? Math.round((done / p.chapters.length) * 100) : 0;
  return (
    <button className="cont-card" onClick={() => nav.doc(last.doc.id)}>
      <span className="cont-icon"><Icon name="pencil" size={19} /></span>
      <span className="cont-body">
        <span className="cont-head">
          <span className="eyebrow cont-eyebrow">{tl("dash_continue")}</span>
          <span className="cont-title">{p ? p.title : last.doc.title}</span>
          {p && <><span className="cont-slash">/</span><span className="cont-sub">{last.doc.title}</span></>}
        </span>
        <span className="cont-meter">
          <span className="cont-bar"><i style={{ width: pct + "%" }} /></span>
          <span className="cont-meta mono">
            {p ? pct + " % · " : ""}{words.toLocaleString(locale)} {tl("word_many")} · {timeAgo(last.doc.updatedAt, lang)}
          </span>
        </span>
      </span>
      <span className="btn btn--accent cont-go">{tl("dash_write")} <Icon name="forward" size={15} /></span>
    </button>
  );
}

/* ---- Streak + daily goal ----
   Fourteen bars, one per day, filled for the days that were written in.
   The goal is edited in place: there is no other screen it would belong
   on, and it is a single number. */
function StreakCard({ store, user, lang, locale }) {
  const tl = T(lang || "en");
  const act = store.activity();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(act.goal || ""));
  const peak = Math.max(1, ...act.recent.map((d) => d.words));

  function save() {
    const n = Math.max(0, parseInt(String(draft).replace(/\D/g, ""), 10) || 0);
    store.setUser({ dailyGoal: n });
    setEditing(false);
  }

  return (
    <section className="streak-card">
      <div className="streak-top">
        <span className="eyebrow streak-eyebrow"><Icon name="flame" size={14} /> {tl("dash_streak")}</span>
        <span className="streak-n">{act.streak} <em className="mono">{tl("dash_streak_days")}</em></span>
      </div>
      <div className="streak-bars" aria-hidden="true">
        {act.recent.map((d) => (
          <i key={d.day} className={"streak-bar" + (d.words > 0 ? " on" : "")}
            style={{ "--h": Math.round(28 + 72 * Math.min(1, d.words / peak)) + "%" }} />
        ))}
      </div>
      {editing ? (
        <div className="streak-edit">
          <input className="streak-input mono" inputMode="numeric" autoFocus value={draft}
            aria-label={tl("dash_goal_edit")}
            onChange={(e) => setDraft(e.target.value)} onBlur={save}
            onKeyDown={(e) => { if (e.key === "Enter") save(); if (e.key === "Escape") setEditing(false); }} />
          <span className="streak-edit-l mono">{tl("dash_goal_edit")}</span>
        </div>
      ) : (
        <button className="streak-goal mono" onClick={() => { setDraft(String(act.goal || "")); setEditing(true); }}
          title={tl("dash_goal_edit")}>
          {act.goal
            ? <>{tl("dash_today")} {act.today.toLocaleString(locale)} / {act.goal.toLocaleString(locale)} {tl("word_many")}</>
            : <>{tl("dash_today")} {act.today.toLocaleString(locale)} {tl("word_many")} · {tl("dash_goal_off")}</>}
        </button>
      )}
    </section>
  );
}

/* ---- The numbers strip under the hero ---- */
function StatsStrip({ store, stats, lang, locale }) {
  const tl = T(lang || "en");
  const act = store.activity();
  const cells = [
    [stats.words, tl("dash_words_total")],
    [stats.projects, pluralT(stats.projects, lang, "proj_one", "proj_few", "proj_many")],
    [stats.chapters, tl("dash_row_chapters")],
    [stats.notes, pluralT(stats.notes, lang, "note_one", "note_few", "note_many")],
    [act.week, tl("dash_week")],
    [act.streak, tl("dash_row_streak")],
  ];
  return (
    <div className="stats-strip">
      {cells.map(([n, label], i) => (
        <div className="stats-cell" key={i}>
          <span className="stats-n">{n.toLocaleString(locale)}</span>
          <span className="stats-l mono">{label}</span>
        </div>
      ))}
    </div>
  );
}

/* ---- library sidebar: the filter list, the recents and the vault line ---- */
function LibrarySidebar({ store, s, lang, nav, typeFilter, setTypeFilter, sort, setSort, onSearch, open, onClose }) {
  const tl = T(lang || "en");
  const notes = s.notes || [];
  const projects = s.projects || [];
  const starred = projects.filter((p) => p.status === "done").length;

  /* the eight most recently touched things across both kinds — the list a
     writer actually reaches for, rather than a second copy of the grid */
  const recent = projects.map((p) => ({ id: p.id, title: p.title, kind: "project", t: p.updatedAt || p.createdAt || 0 }))
    .concat(notes.map((n) => ({ id: n.id, title: n.title, kind: "note", t: n.updatedAt || n.createdAt || 0 })))
    .sort((a, b) => b.t - a.t).slice(0, 6);

  const rows = [
    { key: "all",      icon: "layers", label: tl("side_all"),      n: projects.length + notes.length },
    { key: "projects", icon: "folder", label: tl("side_projects"), n: projects.length },
    { key: "notes",    icon: "note",   label: tl("side_notes"),    n: notes.length },
    { key: "done",     icon: "star",   label: tl("side_starred"),  n: starred },
  ];

  /* the vault line is the one bit of chrome that tells a writer their words
     are on disk and not just in a tab — short-path it, never the full tree */
  const vpath = (window.SipruVault && window.SipruVault.status && window.SipruVault.status().path) || "";
  const vault = vpath ? vpath.split(/[\\/]/).filter(Boolean).slice(-2).join("/") : "";

  return (
    <Sidebar
      open={open} onClose={onClose}
      title={tl("side_library")}
      action={<SortMenu value={sort} onChange={setSort} lang={lang} compact />}
      foot={vault ? <span className="side-vault"><Icon name="save" size={13} /> {vault}</span> : null}>

      <button className="side-search side-search--btn" onClick={onSearch}>
        <Icon name="search" size={16} />
        <input readOnly placeholder={tl("search_btn")} tabIndex={-1} />
        <kbd>⌘K</kbd>
      </button>

      {rows.map((r) => (
        <button key={r.key} className={"side-row" + (typeFilter === r.key ? " on" : "")}
          onClick={() => setTypeFilter(r.key)}>
          <Icon name={r.icon} size={17} />
          <span className="side-row-l">{r.label}</span>
          <span className="side-row-n">{r.n}</span>
        </button>
      ))}

      {recent.length > 0 && <>
        <span className="side-group">{tl("side_recent")}</span>
        {recent.map((r) => (
          <button key={r.kind + r.id} className="side-row"
            onClick={() => r.kind === "project" ? nav.project(r.id) : nav.doc(r.id)}>
            <Icon name={r.kind === "project" ? "bookOpen" : "note"} size={17} />
            <span className="side-row-l">{r.title}</span>
          </button>
        ))}
      </>}
    </Sidebar>
  );
}

function Dashboard({ store, user, nav, route, onTheme, onSearch, onToast }) {
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState(() => (route && route.filter) || "all");
  const [sort, setSort] = useState("created_desc");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const s = store.get();
  const stats = store.stats();
  const lang = user.lang || "en";
  const tl = T(lang);

  /* the rail and the mobile tabs can jump straight to a filtered library,
     so a route carrying a filter re-points the list without a remount */
  const routeFilter = route && route.filter;
  useEffect(() => { if (routeFilter) setTypeFilter(routeFilter); }, [routeFilter, route && route.at]);

  /* the sidebar's "starred" row is a status filter wearing a type-filter
     hat — fold it back into the two axes the list actually sorts on */
  const effType   = typeFilter === "done" ? "projects" : typeFilter;
  const effStatus = typeFilter === "done" ? "done" : statusFilter;

  const showProjects = effType !== "notes";
  const showNotes = effType !== "projects";

  let projects = s.projects.filter((p) => effStatus === "all" ? true : p.status === (effStatus === "done" ? "done" : "draft"));
  let notes = effStatus === "done" ? [] : s.notes;
  projects = showProjects ? sortItems(projects, sort) : [];
  notes = showNotes ? sortItems(notes, sort) : [];

  const hour = new Date().getHours();
  const greetKey = hour < 5 ? "greet_night" : hour < 12 ? "greet_morning" : hour < 18 ? "greet_day" : "greet_evening";

  function handleDelete() {
    if (!deleteTarget) return;
    if (deleteTarget.kind === "project") store.deleteProject(deleteTarget.id);
    else store.deleteNote(deleteTarget.id);
    setDeleteTarget(null);
  }

  const locale = lang === "ru" ? "ru-RU" : "en-US";

  const counts = s.projects.length + " " + pluralT(s.projects.length, lang, "proj_one", "proj_few", "proj_many")
    + ", " + s.notes.length + " " + pluralT(s.notes.length, lang, "note_one", "note_few", "note_many");

  return (
    <AppFrame user={user} nav={nav} route={route} onSearch={onSearch} onTheme={onTheme}
      crumbs={[<>{tl("crumb_library")} <span className="crumb-count">· {counts}</span></>]}
      sidebar={<LibrarySidebar store={store} s={s} lang={lang} nav={nav}
        typeFilter={typeFilter} setTypeFilter={setTypeFilter}
        sort={sort} setSort={setSort} onSearch={onSearch} />}
      actions={<>
        <ImportButton lang={lang} onToast={onToast} className="btn btn--ghost"
          onFile={({ title, html }) => {
            const id = store.createNote(title);
            store.updateDoc(id, { content: html });
            nav.doc(id);
          }}>
          <Icon name="upload" size={16} /> <span className="btn-l">{tl("bar_import")}</span>
        </ImportButton>
        <button className="btn btn--ghost" onClick={() => nav.createNote()} title={tl("btn_new_note")}>
          <Icon name="note" size={16} /> <span className="btn-l">{tl("btn_new_note")}</span>
        </button>
        <button className="btn btn--accent btn--fabbed" onClick={() => nav.createProject()}>
          <Icon name="plus" size={16} /> <span className="btn-l">{tl("bar_new_project")}</span>
        </button>
      </>}>

      <div className="wrap screen-enter">

        <div className="dash-top">
          <div className="dash-greet">
            <div className="eyebrow">{tl(greetKey)}, {user.name || tl("default_author")}</div>
            <h1 className="dash-title">{lang === "ru"
              ? <>Что напишем сегодня<span className="q">?</span></>
              : <>What will you write today<span className="q">?</span></>}</h1>
          </div>
          <StreakCard store={store} user={user} lang={lang} locale={locale} />
        </div>

        <ContinueCard store={store} nav={nav} lang={lang} locale={locale} />
        <StatsStrip store={store} stats={stats} lang={lang} locale={locale} />

        <div className="dash-filter">
          <div className="seg">
            {[["all","filter_all"],["projects","filter_projects"],["notes","filter_notes"]].map(([k,lk]) => (
              <button key={k} className={"seg-btn" + (effType === k ? " on" : "")} onClick={() => setTypeFilter(k)}>{tl(lk)}</button>
            ))}
          </div>
          <div className="seg">
            {[["all","filter_all_status"],["draft","filter_drafts"],["done","filter_done"]].map(([k,lk]) => (
              <button key={k} className={"seg-btn" + (effStatus === k ? " on" : "")} onClick={() => { setStatusFilter(k); if (typeFilter === "done") setTypeFilter("projects"); }}>{tl(lk)}</button>
            ))}
          </div>
          <SortMenu value={sort} onChange={setSort} lang={lang} />
        </div>

        {(projects.length > 0 || notes.length > 0) && (
          <div className="card-grid">
            {projects.map((p, i) => (
              <ProjectCard key={p.id} p={p} store={store} nav={nav} idx={i} lang={lang}
                onDelete={() => setDeleteTarget({ kind: "project", id: p.id, title: p.title })} />
            ))}
            {notes.map((n, i) => (
              <NoteCard key={n.id} n={n} nav={nav} idx={projects.length + i} lang={lang}
                onDelete={() => setDeleteTarget({ kind: "note", id: n.id, title: n.title })} />
            ))}
          </div>
        )}

        {!projects.length && !notes.length && (
          <div className="empty mono">{tl("empty_state")}</div>
        )}
      </div>

      {/* phones get the primary action back as a floating button — the top
          bar there is too narrow to hold it next to the breadcrumb */}
      <button className="fab" onClick={() => nav.createProject()} aria-label={tl("bar_new_project")}>
        <Icon name="plus" size={24} />
      </button>

      {deleteTarget && (
        <ConfirmDelete
          title={deleteTarget.title}
          what={tl(deleteTarget.kind === "project" ? "what_project" : "what_note")}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
          lang={lang}
        />
      )}
    </AppFrame>
  );
}

function ProgressBar({ value, max, accent }) {
  const pct = max ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return <div className="pbar"><span style={{ width: pct + "%", background: accent ? "var(--accent)" : "var(--ink)" }} /></div>;
}

function ProjectCard({ p, store, nav, idx, onDelete, lang }) {
  const tl = T(lang || "en");
  const locale = lang === "ru" ? "ru-RU" : "en-US";
  const words = store.projectWords(p);
  const goal = (p.goal && p.goal.target) || Math.max(2000, Math.ceil(words / 1000) * 1000 + 1000);
  return (
    <div className={"card card--project fade-up card--" + (p.status === "done" ? "done" : words > 0 ? "active" : "idle")}
      style={{ animationDelay: idx * 60 + "ms" }}>
      <div className="card-inner" role="button" tabIndex={0}
        onClick={() => nav.project(p.id)}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && nav.project(p.id)}>
        <div className="card-top">
          <Icon name="folder" size={17} />
          <span className="card-kind">{tl(p.status === "done" ? "kind_collection" : "kind_project")}</span>
          <span className={"chip mono " + (p.status === "done" ? "chip--done" : words > 0 ? "chip--active" : "chip--draft")}>
            {p.status === "done" ? tl("status_done") : words > 0 ? tl("status_active") : tl("status_draft")}
          </span>
          <button className="card-delete" title={tl("del_project_title")} onClick={(e) => { e.stopPropagation(); onDelete(); }}>
            <Icon name="trash" size={15} />
          </button>
        </div>
        <h3 className="card-title">{p.title}</h3>
        {p.synopsis && <p className="card-syn">{p.synopsis}</p>}
        <div className="card-bottom">
          <div className="card-meta mono">
            <span>{p.chapters.length} {pluralT(p.chapters.length, lang, "chap_one", "chap_few", "chap_many")}</span>
            <span className="dotsep">·</span>
            <span>{words.toLocaleString(locale)} {tl("word_many")}</span>
          </div>
          <ProgressBar value={words} max={goal} accent />
          <div className="card-time mono"><Icon name="clock" size={12} /> {timeAgo(p.updatedAt, lang)}</div>
        </div>
      </div>
    </div>
  );
}

function NoteCard({ n, nav, idx, onDelete, lang }) {
  const tl = T(lang || "en");
  const text = (n.content || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  return (
    <div className="card card--note fade-up" style={{ animationDelay: idx * 60 + "ms" }}>
      <div className="card-inner" role="button" tabIndex={0}
        onClick={() => nav.doc(n.id)}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && nav.doc(n.id)}>
        <div className="card-top">
          <Icon name="note" size={17} />
          <span className="card-kind">{tl("kind_note")}</span>
          <button className="card-delete" title={tl("del_note_title")} onClick={(e) => { e.stopPropagation(); onDelete(); }}>
            <Icon name="trash" size={15} />
          </button>
        </div>
        <h3 className="card-title card-title--note">{n.title}</h3>
        <p className="card-syn card-syn--note">{text || tl("empty_note_preview")}</p>
        <div className="card-time mono"><Icon name="clock" size={12} /> {timeAgo(n.updatedAt, lang)}</div>
      </div>
    </div>
  );
}

/* The store owns these bounds — it enforces them on every write, including
   the ones that never pass through this screen (a restored backup, a vault
   file). Reading them from there keeps the counter the writer sees and the
   limit that actually applies from drifting apart. */
const SYNOPSIS_MIN_WORDS = SipruStore.LIMITS.synopsisMinWords;
const SYNOPSIS_MAX_CHARS = SipruStore.LIMITS.synopsisMaxChars;
const TITLE_MAX = SipruStore.LIMITS.titleMax;

function countWords(text) {
  const m = text.trim().match(/\S+/g);
  return m ? m.length : 0;
}

/* ----------------------- PROJECT (folder) ----------------------- */
/* ---- project sidebar: the book's own chapter list, always in reach ---- */
function ProjectChapterSidebar({ p, store, nav, lang, currentId, open, onClose }) {
  const tl = T(lang || "en");
  const idx = new Map(p.chapters.map((c, i) => [c.id, i]));
  const parts = p.parts || [];
  const loose = p.chapters.filter((c) => !c.partId);
  const row = (c) => (
    <button key={c.id} className={"side-row side-row--sheet" + (currentId === c.id ? " on" : "")}
      onClick={() => nav.doc(c.id)}>
      <span className="side-num">{idx.get(c.id) + 1}</span>
      <span className="side-row-l">{c.title}</span>
    </button>
  );
  return (
    <Sidebar open={open} onClose={onClose} title={p.title}
      back={{ label: tl("side_all_works"), onClick: () => nav.dashboard() }}
      foot={<button className="side-add" onClick={() => { const id = store.addChapter(p.id); nav.doc(id); }}>
        <Icon name="plus" size={16} /> {tl("side_add_chapter")}
      </button>}>
      <div className="side-meta mono">
        {tl(p.kind === "note" ? "what_note" : "what_project")} · {p.chapters.length} {pluralT(p.chapters.length, lang, "chap_one", "chap_few", "chap_many")}
      </div>
      {parts.map((pt) => (
        <React.Fragment key={pt.id}>
          <span className="side-group">{pt.title || tl("ol_untitled")}</span>
          {p.chapters.filter((c) => c.partId === pt.id).map(row)}
        </React.Fragment>
      ))}
      {loose.length > 0 && parts.length > 0 && <span className="side-group">{tl("side_project_chapters")}</span>}
      {loose.map(row)}
      {!p.chapters.length && <div className="side-empty mono">{tl("no_chapters").replace(" \u2192", "")}</div>}
    </Sidebar>
  );
}

function ProjectView({ store, user, nav, route, onTheme, projectId, onSearch, onToast }) {
  const s = store.get();
  const p = s.projects.find((x) => x.id === projectId);
  const [dragId, setDragId] = useState(null);
  const [overId, setOverId] = useState(null);
  const [editTitle, setEditTitle] = useState(false);
  const [editSynopsis, setEditSynopsis] = useState(false);
  const [synDraft, setSynDraft] = useState("");
  const [deleteChap, setDeleteChap] = useState(null);
  const [deleteProjectConfirm, setDeleteProjectConfirm] = useState(false);
  const lang = user.lang || "en";
  const tl = T(lang);
  const locale = lang === "ru" ? "ru-RU" : "en-US";

  if (!p) {
    return (
      <AppFrame user={user} nav={nav} route={route} onSearch={onSearch} onTheme={onTheme}
        crumbs={[tl("crumb_library")]}>
        <div className="wrap"><div className="empty mono">{tl("project_not_found")}</div></div>
      </AppFrame>
    );
  }

  const words = store.projectWords(p);

  function onDrop(targetId) {
    if (!dragId || dragId === targetId) { setDragId(null); setOverId(null); return; }
    const ids = p.chapters.map((c) => c.id);
    const from = ids.indexOf(dragId), to = ids.indexOf(targetId);
    ids.splice(to, 0, ids.splice(from, 1)[0]);
    store.reorderChapters(p.id, ids);
    setDragId(null); setOverId(null);
  }

  function handleDeleteChap() {
    if (!deleteChap) return;
    store.deleteChapter(p.id, deleteChap.id);
    setDeleteChap(null);
  }

  function handleDeleteProject() {
    store.deleteProject(p.id);
    nav.dashboard();
  }

  return (
    <AppFrame user={user} nav={nav} route={route} onSearch={onSearch} onTheme={onTheme}
      crumbs={[<button key="c" className="crumb-link" onClick={() => nav.dashboard()}>{tl("crumb_library")}</button>, p.title]}
      sidebar={<ProjectChapterSidebar p={p} store={store} nav={nav} lang={lang} />}
      actions={<>
        <ImportButton lang={lang} onToast={onToast} className="btn btn--ghost"
          onFile={({ title, html }) => {
            const id = store.addChapter(p.id, title);
            store.updateDoc(id, { content: html });
            nav.doc(id);
          }}>
          <Icon name="upload" size={16} /> <span className="btn-l">{tl("import_chapter_btn")}</span>
        </ImportButton>
        <button className="btn btn--accent btn--assemble" data-tour="assemble-book" onClick={() => nav.export(p.id)}>
          <Icon name="book" size={16} /> <span className="btn-l">{tl("assemble_book")}</span>
        </button>
      </>}>
      <div className="wrap screen-enter">
        <div className="proj-grid">
          <div className="proj-main">

            <div className="proj-chips">
              <span className="chip chip--kind mono">{lang === "ru" ? "Проект" : "Project"}</span>
              <span className={"chip mono " + (p.status === "done" ? "chip--done" : "chip--active")}>
                {p.status === "done" ? tl("status_done") : tl("status_draft")}
              </span>
              <span className="proj-created mono">{tl("created_label")} {new Date(p.createdAt || Date.now()).toLocaleDateString(locale)}</span>
            </div>
              {editTitle ? (
                <input className="proj-title-input" autoFocus defaultValue={p.title} maxLength={TITLE_MAX}
                  onBlur={(e) => { store.updateProject(p.id, { title: e.target.value.trim() || p.title }); setEditTitle(false); }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") e.target.blur();
                    else if (e.key === "Escape") { e.target.value = p.title; setEditTitle(false); }
                  }} />
              ) : (
                <h1 className="proj-title" onClick={() => setEditTitle(true)} title={tl("rename_hint")}>{p.title}</h1>
              )}
              {editSynopsis ? (
                <>
                  <textarea className="proj-syn-input" autoFocus value={synDraft} rows={3} maxLength={SYNOPSIS_MAX_CHARS}
                    onChange={(e) => setSynDraft(e.target.value)}
                    onBlur={() => {
                      const trimmed = synDraft.trim();
                      const wc = countWords(trimmed);
                      /* Too short to keep, but don't trap the writer in the field —
                         just drop back to the unedited synopsis, same as Escape. */
                      if (wc > 0 && wc < SYNOPSIS_MIN_WORDS) { setEditSynopsis(false); return; }
                      store.updateProject(p.id, { synopsis: trimmed });
                      setEditSynopsis(false);
                    }}
                    onKeyDown={(e) => { if (e.key === "Escape") { setEditSynopsis(false); } }} />
                  <p className={"proj-syn-hint mono" + (countWords(synDraft) > 0 && countWords(synDraft) < SYNOPSIS_MIN_WORDS ? " warn" : "")}>
                    {synDraft.length} / {SYNOPSIS_MAX_CHARS} {tl("synopsis_chars_unit")}
                  </p>
                </>
              ) : p.synopsis ? (
                <p className="proj-syn" onClick={() => { setSynDraft(p.synopsis || ""); setEditSynopsis(true); }} title={tl("edit_synopsis_hint")}>{p.synopsis}</p>
              ) : (
                <button className="proj-syn-add mono" onClick={() => { setSynDraft(""); setEditSynopsis(true); }}>{tl("synopsis_placeholder")}</button>
              )}

            <div className="section-head">
              <span className="eyebrow">{tl("section_chapters")}</span>
              <span className="rule-thin section-rule" />
              <button className="addchap" data-tour="add-chapter" onClick={() => { const id = store.addChapter(p.id); nav.doc(id); }}>
                <Icon name="plus" size={14} /> {tl("add_chapter_btn")}
              </button>
            </div>

          <ol className="chap-list">
            {(() => {
              /* Parts group the flat chapter list here exactly as they do in
                 the editor's outline — a book's structure should be visible
                 wherever its chapters are, not only inside one document. */
              const idx = new Map(p.chapters.map((c, i) => [c.id, i]));
              const chapRow = (c) => {
                const cw = store.countWords(c.content);
                return (
                  <li key={c.id} draggable
                    className={"chap" + (dragId === c.id ? " dragging" : "") + (overId === c.id ? " over" : "")}
                    onDragStart={() => setDragId(c.id)}
                    onDragOver={(e) => { e.preventDefault(); setOverId(c.id); }}
                    onDragLeave={() => setOverId((o) => o === c.id ? null : o)}
                    onDrop={() => onDrop(c.id)}
                    onDragEnd={() => { setDragId(null); setOverId(null); }}
                    onClick={() => nav.doc(c.id)}>
                    <span className="chap-grip" onClick={(e)=>e.stopPropagation()}><Icon name="drag" size={16} /></span>
                    <span className="chap-num mono">{String(idx.get(c.id) + 1).padStart(2, "0")}</span>
                    <span className="chap-title">{c.title}</span>
                    <span className="chap-words mono">{cw.toLocaleString(locale)} {tl("word_many")}</span>
                    <span className="chap-time mono">{timeAgo(c.updatedAt, lang)}</span>
                    <span className="chap-del" onClick={(e) => { e.stopPropagation(); setDeleteChap({ id: c.id, title: c.title }); }}
                      title={tl("del_chapter_title")}><Icon name="trash" size={15} /></span>
                    <span className="chap-open"><Icon name="forward" size={16} /></span>
                  </li>
                );
              };
              const parts = p.parts || [];
              const loose = p.chapters.filter((c) => !c.partId);
              return (
                <>
                  {parts.map((pt) => (
                    <React.Fragment key={pt.id}>
                      <li className="chap-part-head mono">{pt.title || tl("ol_untitled")}</li>
                      {p.chapters.filter((c) => c.partId === pt.id).map(chapRow)}
                    </React.Fragment>
                  ))}
                  {loose.map(chapRow)}
                </>
              );
            })()}
            {!p.chapters.length && (
              <li className="chap-empty mono">{tl("no_chapters").replace(" →", "")} <button onClick={() => { const id = store.addChapter(p.id); nav.doc(id); }}>→</button></li>
            )}
          </ol>
          </div>

          <aside className="proj-side">
            <section className="pcard pcard--goal">
              <div className="pcard-head"><Icon name="target" size={15} /> <span>{tl("goal_label")}</span></div>
              <GoalBlock p={p} store={store} words={words} lang={lang} />
            </section>

            <section className="pcard">
              <div className="pcard-head"><span>{tl("section_stats")}</span></div>
              <dl className="pcard-rows">
                <div><dt>{tl("stat_chapters")}</dt><dd className="mono">{p.chapters.length}</dd></div>
                <div><dt>{tl("stat_done")}</dt><dd className="mono">{p.chapters.filter((c) => c.done).length}</dd></div>
                <div><dt>{tl("stat_chars")}</dt><dd className="mono">{p.chapters.reduce((n, c) => n + (c.content || "").replace(/<[^>]+>/g, "").length, 0).toLocaleString(locale)}</dd></div>
                <div><dt>{tl("stat_reading")}</dt><dd className="mono">≈ {Math.max(1, Math.round(words / 180))} {tl("unit_min")}</dd></div>
              </dl>
            </section>

            <div className="proj-side-actions">
              <button className={"pact" + (p.status === "done" ? " on" : "")}
                onClick={() => store.updateProject(p.id, { status: p.status === "done" ? "draft" : "done" })}>
                <Icon name="check" size={15} /> {p.status === "done" ? tl("mark_done") : tl("mark_in_progress")}
              </button>
              {window.SipruVault && window.SipruVault.canReveal() && (
                <button className="pact" onClick={async () => {
                  const path = window.SipruVault.locate("project", p.id);
                  if (!path) return onToast(tl("vault_not_saved_yet"));
                  if (!(await window.SipruVault.reveal(path))) onToast(tl("vault_reveal_fail"));
                }}>
                  <Icon name="folder" size={15} /> {tl("vault_reveal")}
                </button>
              )}
              <button className="pact pact--danger" onClick={() => setDeleteProjectConfirm(true)}>
                <Icon name="trash" size={15} /> {tl("delete_project_btn")}
              </button>
            </div>
          </aside>
        </div>
      </div>

      {deleteChap && (
        <ConfirmDelete
          title={deleteChap.title}
          what={tl("what_chapter")}
          onConfirm={handleDeleteChap}
          onCancel={() => setDeleteChap(null)}
          lang={lang}
        />
      )}
      {deleteProjectConfirm && (
        <ConfirmDelete
          title={p.title}
          what={tl("what_project")}
          onConfirm={handleDeleteProject}
          onCancel={() => setDeleteProjectConfirm(false)}
          lang={lang}
        />
      )}
    </AppFrame>
  );
}

Object.assign(window, { Dashboard, ProjectView, ProgressBar, ConfirmDelete, ImportButton, GoalBlock });
