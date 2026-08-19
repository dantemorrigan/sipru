/* ============================================================
   Writed. — Dashboard + Project (folder) view
   ============================================================ */

function TopBar({ user, store, nav, onTheme, right }) {
  const tl = T(user.lang || "en");
  return (
    <header className="topbar">
      <div className="topbar-l">
        <StatsDot store={store} nav={nav} lang={user.lang} />
      </div>
      <div className="topbar-c"></div>
      <div className="topbar-r">
        {right}
        <button className="user-chip" onClick={() => nav.profile()} title={tl("topbar_profile")}>
          <span className="user-ava mono">
            {user.avatar
              ? <img src={user.avatar} alt="" style={{width:"100%",height:"100%",objectFit:"cover",display:"block"}} />
              : (user.name || tl("default_author").charAt(0)).trim().charAt(0).toUpperCase()
            }
          </span>
          <span className="user-name">{user.name || tl("default_author")}</span>
        </button>
        <ThemeToggle theme={user.theme} onChange={onTheme} lang={user.lang} />
      </div>
    </header>
  );
}

/* ---- Confirm delete dialog ---- */
function ConfirmDelete({ title, what, onConfirm, onCancel, lang }) {
  const tl = T(lang || "en");
  return (
    <div className="modal-scrim" onMouseDown={onCancel}>
      <div className="confirm-modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="confirm-icon"><Icon name="trash" size={22} /></div>
        <div className="confirm-title">{tl("confirm_delete_q")} {what}?</div>
        <div className="confirm-name">«{title}»</div>
        <p className="confirm-note mono">{tl("confirm_delete_body")}</p>
        <div className="confirm-actions">
          <button className="btn btn--ghost" onClick={onCancel}>{tl("confirm_cancel")}</button>
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
function SortMenu({ value, onChange, lang }) {
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
    <div className="sortmenu">
      <button className={"sortmenu-btn" + (open ? " on" : "")} onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox" aria-expanded={open} title={tl("sort_btn_title")}>
        <Icon name="sort" size={15} />
        <span className="sortmenu-cur">{cur}</span>
        <Icon name="chevron" size={13} className={"sortmenu-chev" + (open ? " open" : "")} />
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
function ImportButton({ lang, onFile, onToast, label, className }) {
  const tl = T(lang || "en");
  const ref = useRef(null);
  async function onChange(e) {
    const f = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!f) return;
    try {
      const parsed = await WritedFormats.importFile(f);
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
        <Icon name="upload" size={16} /> {label || tl("import_btn")}
      </button>
      <input ref={ref} type="file" style={{ display: "none" }}
        accept={WritedFormats.IMPORT_ACCEPT} onChange={onChange} />
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

function Dashboard({ store, user, nav, onTheme, onSearch, onToast }) {
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [sort, setSort] = useState("created_desc");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const s = store.get();
  const stats = store.stats();
  const lang = user.lang || "en";
  const tl = T(lang);

  const showProjects = typeFilter !== "notes";
  const showNotes = typeFilter !== "projects";

  let projects = s.projects.filter((p) => statusFilter === "all" ? true : p.status === (statusFilter === "done" ? "done" : "draft"));
  let notes = statusFilter === "done" ? [] : s.notes;
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

  return (
    <div className="app-shell screen-enter">
      <TopBar user={user} store={store} nav={nav} onTheme={onTheme}
        right={<button className="btn btn--ghost btn--search" onClick={onSearch} title={tl("search_title")}>
          <Icon name="search" size={16} /> <span className="btn-search-l">{tl("search_btn")}</span>
        </button>} />
      <div className="scroll-area">
        <div className="wrap">

          <section className="dash-hero">
            <div>
              <div className="eyebrow">{tl(greetKey)}, {user.name || tl("default_author")}</div>
              <h1 className="dash-title">{lang === "ru" ? <>Что напишем<br />сегодня<span style={{ color: "var(--accent)" }}>?</span></> : <>What will you<br />write<span style={{ color: "var(--accent)" }}>?</span></>}</h1>
            </div>
            <div className="dash-stat">
              <div className="dash-stat-num mono">{stats.words.toLocaleString(locale)}</div>
              <div className="dash-stat-lbl mono">
                {tl("dash_words_total")} · {stats.projects} {pluralT(stats.projects, lang, "proj_one", "proj_few", "proj_many")} · {stats.notes} {pluralT(stats.notes, lang, "note_one", "note_few", "note_many")}
              </div>
            </div>
          </section>

          <div className="dash-actions">
            <button className="bigaction" onClick={() => nav.createProject()}>
              <Icon name="folder" size={22} />
              <div><span className="bigaction-t">{tl("btn_new_project")}</span><span className="bigaction-s mono">{tl("desc_project")}</span></div>
              <Icon name="plus" size={18} className="bigaction-plus" />
            </button>
            <button className="bigaction" onClick={() => nav.createNote()}>
              <Icon name="note" size={22} />
              <div><span className="bigaction-t">{tl("btn_new_note")}</span><span className="bigaction-s mono">{tl("desc_note")}</span></div>
              <Icon name="plus" size={18} className="bigaction-plus" />
            </button>
          </div>

          <div className="dash-import">
            <ImportButton lang={lang} onToast={onToast}
              onFile={({ title, html }) => {
                const id = store.createNote(title);
                store.updateDoc(id, { content: html });
                nav.doc(id);
              }} />
            <span className="dash-import-h mono">{tl("import_hint")}</span>
          </div>

          <div className="dash-filter">
            <div className="dash-filter-segs">
              <div className="filtergrp">
                <span className="filtergrp-l mono">{tl("filter_type_label")}</span>
                <div className="seg seg--sm">
                  {[["all","filter_all"],["projects","filter_projects"],["notes","filter_notes"]].map(([k,lk]) => (
                    <button key={k} className={"seg-btn" + (typeFilter === k ? " on" : "")} onClick={() => setTypeFilter(k)}>{tl(lk)}</button>
                  ))}
                </div>
              </div>
              <div className="filtergrp">
                <span className="filtergrp-l mono">{tl("filter_status_label")}</span>
                <div className="seg seg--sm">
                  {[["all","filter_all_status"],["draft","filter_drafts"],["done","filter_done"]].map(([k,lk]) => (
                    <button key={k} className={"seg-btn" + (statusFilter === k ? " on" : "")} onClick={() => setStatusFilter(k)}>{tl(lk)}</button>
                  ))}
                </div>
              </div>
            </div>
            <SortMenu value={sort} onChange={setSort} lang={lang} />
          </div>

          {projects.length > 0 && (
            <section className="dash-section">
              <div className="section-head"><span className="eyebrow">{tl("section_projects")}</span><span className="rule-thin section-rule" /></div>
              <div className="card-grid">
                {projects.map((p, i) => (
                  <ProjectCard key={p.id} p={p} store={store} nav={nav} idx={i} lang={lang}
                    onDelete={() => setDeleteTarget({ kind: "project", id: p.id, title: p.title })} />
                ))}
              </div>
            </section>
          )}

          {notes.length > 0 && (
            <section className="dash-section">
              <div className="section-head"><span className="eyebrow">{tl("section_notes")}</span><span className="rule-thin section-rule" /></div>
              <div className="card-grid">
                {notes.map((n, i) => (
                  <NoteCard key={n.id} n={n} nav={nav} idx={i} lang={lang}
                    onDelete={() => setDeleteTarget({ kind: "note", id: n.id, title: n.title })} />
                ))}
              </div>
            </section>
          )}

          {!projects.length && !notes.length && (
            <div className="empty mono">{tl("empty_state")}</div>
          )}

          <footer className="dash-foot mono">
            {tl("footer_local")} · <Icon name="check" size={13} style={{display:"inline",verticalAlign:"-2px"}} /> persistent storage
          </footer>
        </div>
      </div>

      {deleteTarget && (
        <ConfirmDelete
          title={deleteTarget.title}
          what={tl(deleteTarget.kind === "project" ? "what_project" : "what_note")}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
          lang={lang}
        />
      )}
    </div>
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
    <div className="card card--project fade-up" style={{ animationDelay: idx * 60 + "ms" }}>
      <div className="card-inner" role="button" tabIndex={0}
        onClick={() => nav.project(p.id)}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && nav.project(p.id)}>
        <div className="card-top">
          <Icon name="folder" size={18} />
          <span className={"chip mono " + (p.status === "done" ? "chip--done" : "chip--draft")}>
            {p.status === "done" ? tl("status_done") : tl("status_draft")}
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
          <ProgressBar value={words} max={goal} accent={p.status==="done"} />
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
          <Icon name="note" size={18} />
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

/* ----------------------- PROJECT (folder) ----------------------- */
function ProjectView({ store, user, nav, onTheme, projectId, onSearch, onToast }) {
  const s = store.get();
  const p = s.projects.find((x) => x.id === projectId);
  const [dragId, setDragId] = useState(null);
  const [overId, setOverId] = useState(null);
  const [editTitle, setEditTitle] = useState(false);
  const [editSynopsis, setEditSynopsis] = useState(false);
  const [deleteChap, setDeleteChap] = useState(null);
  const [deleteProjectConfirm, setDeleteProjectConfirm] = useState(false);
  const lang = user.lang || "en";
  const tl = T(lang);
  const locale = lang === "ru" ? "ru-RU" : "en-US";

  if (!p) {
    return (
      <div className="app-shell">
        <TopBar user={user} store={store} nav={nav} onTheme={onTheme} />
        <div className="empty mono">{tl("project_not_found")}</div>
      </div>
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
    <div className="app-shell screen-enter">
      <TopBar user={user} store={store} nav={nav} onTheme={onTheme}
        right={<>
          <button className="btn btn--ghost btn--search" onClick={onSearch} title={tl("search_title")}>
            <Icon name="search" size={16} /> <span className="btn-search-l">{tl("search_btn")}</span>
          </button>
          <button className="btn btn--ghost" data-tour="assemble-book" onClick={() => nav.export(p.id)}><Icon name="book" size={16} /> {tl("assemble_book")}</button>
        </>} />
      <div className="scroll-area">
        <div className="wrap">
          <button className="backlink mono" onClick={() => nav.dashboard()}><Icon name="back" size={14} /> {tl("all_works")}</button>

          <section className="proj-hero">
            <div className="proj-hero-main">
              <div className="eyebrow">{lang === "ru" ? "Проект" : "Project"} · {p.status === "done" ? tl("status_done") : tl("status_draft")}</div>
              {editTitle ? (
                <input className="proj-title-input" autoFocus defaultValue={p.title}
                  onBlur={(e) => { store.updateProject(p.id, { title: e.target.value.trim() || p.title }); setEditTitle(false); }}
                  onKeyDown={(e) => e.key === "Enter" && e.target.blur()} />
              ) : (
                <h1 className="proj-title" onClick={() => setEditTitle(true)} title={tl("rename_hint")}>{p.title}</h1>
              )}
              {editSynopsis ? (
                <textarea className="proj-syn-input" autoFocus defaultValue={p.synopsis} rows={3}
                  onBlur={(e) => { store.updateProject(p.id, { synopsis: e.target.value.trim() }); setEditSynopsis(false); }}
                  onKeyDown={(e) => { if (e.key === "Escape") setEditSynopsis(false); }} />
              ) : p.synopsis ? (
                <p className="proj-syn" onClick={() => setEditSynopsis(true)} title={tl("edit_synopsis_hint")}>{p.synopsis}</p>
              ) : (
                <button className="proj-syn-add mono" onClick={() => setEditSynopsis(true)}>{tl("synopsis_placeholder")}</button>
              )}
            </div>
            <div className="proj-hero-side">
              <div className="proj-bignum mono">{words.toLocaleString(locale)}</div>
              <div className="proj-bignum-lbl mono">{tl("dash_words_total")}</div>
              <GoalBlock p={p} store={store} words={words} lang={lang} />
              <button className={"status-toggle mono" + (p.status==="done"?" on":"")}
                onClick={() => store.updateProject(p.id, { status: p.status === "done" ? "draft" : "done" })}>
                <Icon name="check" size={14} /> {p.status === "done" ? tl("mark_done") : tl("mark_in_progress")}
              </button>
              <button className="status-toggle mono proj-delete-btn" onClick={() => setDeleteProjectConfirm(true)}>
                <Icon name="trash" size={14} /> {tl("delete_project_btn")}
              </button>
            </div>
          </section>

          <div className="section-head"><span className="eyebrow">{tl("section_chapters")}</span><span className="rule-thin section-rule" />
            <ImportButton lang={lang} onToast={onToast} className="addchap mono" label={tl("import_chapter_btn")}
              onFile={({ title, html }) => {
                const id = store.addChapter(p.id, title);
                store.updateDoc(id, { content: html });
                nav.doc(id);
              }} />
            <button className="addchap mono" data-tour="add-chapter" onClick={() => { const id = store.addChapter(p.id); nav.doc(id); }}><Icon name="plus" size={14} /> {tl("add_chapter_btn")}</button>
          </div>

          <ol className="chap-list">
            {p.chapters.map((c, i) => {
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
                  <span className="chap-num mono">{String(i + 1).padStart(2, "0")}</span>
                  <span className="chap-title">{c.title}</span>
                  <span className="chap-words mono">{cw.toLocaleString(locale)} {tl("word_many")}</span>
                  <span className="chap-time mono">{timeAgo(c.updatedAt, lang)}</span>
                  <span className="chap-del" onClick={(e) => { e.stopPropagation(); setDeleteChap({ id: c.id, title: c.title }); }}
                    title={tl("del_chapter_title")}><Icon name="trash" size={15} /></span>
                  <span className="chap-open"><Icon name="forward" size={16} /></span>
                </li>
              );
            })}
            {!p.chapters.length && (
              <li className="chap-empty mono">{tl("no_chapters").replace(" →", "")} <button onClick={() => { const id = store.addChapter(p.id); nav.doc(id); }}>→</button></li>
            )}
          </ol>
          <div style={{ height: 60 }} />
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
    </div>
  );
}

Object.assign(window, { TopBar, Dashboard, ProjectView, ProgressBar, ConfirmDelete, ImportButton, GoalBlock });
