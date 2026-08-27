/* ============================================================
   Sipru. — Outline

   A drawer over the editor: Project → Parts → Chapters → Scenes.
   Parts and chapter status live in the store (added in schema v3);
   scenes live inside the chapter's own HTML as separators, so a chapter
   that never uses them is exactly the document it always was.
   ============================================================ */

const OL_STATUS = ["draft", "progress", "done"];

/* Clicking a chapter opens it, which remounts the editor and this panel
   with it — so which row is being renamed has to outlive the remount, or
   a double-click rename would be cancelled by its own first click. */
let OL_EDITING = null;

/* Splitting a chapter means parsing its HTML — far too much work to redo
   on every keystroke-driven re-render, so the result is memoised against
   the content it was built from. */
const sceneCache = new Map();
function scenesOf(doc) {
  if (!doc) return [];
  const key = doc.id;
  const hit = sceneCache.get(key);
  const html = doc.content || "";
  if (hit && hit.html === html) return hit.segs;
  const segs = splitScenes(html);
  sceneCache.set(key, { html, segs });
  if (sceneCache.size > 40) sceneCache.delete(sceneCache.keys().next().value);
  return segs;
}
function chapterWords(doc) {
  return window.SipruStore.countWords(doc.content || "");
}

function StatusDot({ status, onClick, lang }) {
  const tl = T(lang || "en");
  return (
    <button className={"ol-status ol-status--" + (status || "draft")}
      title={tl("ol_status_" + (status || "draft"))}
      onClick={(e) => { e.stopPropagation(); onClick(); }} />
  );
}

function Bar({ words, max }) {
  const w = max > 0 ? Math.max(3, Math.round((words / max) * 100)) : 0;
  return <span className="ol-bar"><span className="ol-bar-fill" style={{ width: w + "%" }} /></span>;
}

function OutlineRow({ kind, id, depth, title, words, max, status, open, hasKids, active, dragging, dropPos,
  lang, editing, onEdit, onToggle, onOpen, onStatus, onRename, onDelete, onAddScene, onGrip }) {
  const tl = T(lang || "en");
  const [menu, setMenu] = useState(false);
  const setEditing = onEdit;
  const rowRef = useRef(null);
  useEffect(() => {
    if (!menu) return;
    const off = (e) => { if (rowRef.current && !rowRef.current.contains(e.target)) setMenu(false); };
    document.addEventListener("mousedown", off);
    document.addEventListener("touchstart", off);
    return () => { document.removeEventListener("mousedown", off); document.removeEventListener("touchstart", off); };
  }, [menu]);

  return (
    <div ref={rowRef} data-row={kind + ":" + id} data-depth={depth}
      className={"ol-row ol-row--" + kind + (active ? " on" : "") + (dragging ? " ol-row--drag" : "") +
        (dropPos ? " ol-drop ol-drop--" + dropPos : "") + (menu ? " ol-row--menu-open" : "")}
      style={{ "--ol-depth": depth }}
      onClick={() => !editing && onOpen && onOpen()}>
      <button className="ol-grip" title={tl("ol_drag")} onPointerDown={onGrip}>
        <Icon name="drag" size={14} />
      </button>
      {hasKids
        ? <button className={"ol-caret" + (open ? " open" : "")} title={tl(open ? "ol_collapse" : "ol_expand")}
            onClick={(e) => { e.stopPropagation(); onToggle(); }}><Icon name="chevron" size={13} /></button>
        : <span className="ol-caret ol-caret--none" />}

      {editing ? (
        <input className="ol-rename" autoFocus defaultValue={title} maxLength={SipruStore.LIMITS.titleMax}
          onClick={(e) => e.stopPropagation()}
          onBlur={(e) => { const v = e.target.value.trim(); setEditing(false); if (v && v !== title) onRename(v); }}
          onDoubleClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => { if (e.key === "Enter") e.target.blur(); if (e.key === "Escape") { e.target.value = title; e.target.blur(); } }} />
      ) : (
        <span className="ol-title" onDoubleClick={(e) => { e.stopPropagation(); setEditing(true); }}>
          {title || tl("ol_untitled")}
        </span>
      )}

      {kind !== "part" && <Bar words={words} max={max} />}
      <span className="ol-words mono">{words}</span>
      {status !== undefined && <StatusDot status={status} lang={lang} onClick={onStatus} />}

      <div className="ol-menu-wrap">
        <button className="ol-more" title={tl("ed_more")} onClick={(e) => { e.stopPropagation(); setMenu((m) => !m); }}>
          <Icon name="more" size={14} />
        </button>
        {menu && (
          <div className="ol-menu" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => { setMenu(false); setEditing(true); }}>
              <Icon name="rename" size={14} /> {tl("ol_rename")}</button>
            {onAddScene && <button onClick={() => { setMenu(false); onAddScene(); }}>
              <Icon name="plus" size={14} /> {tl("ol_add_scene")}</button>}
            {status !== undefined && OL_STATUS.map((s) => (
              <button key={s} onClick={() => { setMenu(false); onStatus(s); }}>
                <span className={"ol-status ol-status--" + s} /> {tl("ol_status_" + s)}</button>
            ))}
            <button className="ol-menu-danger" onClick={() => { setMenu(false); onDelete(); }}>
              <Icon name="trash" size={14} /> {tl("ol_delete")}</button>
          </div>
        )}
      </div>
    </div>
  );
}

function OutlinePanel({ store, project, docId, lang, nav, onClose, onSceneJump, currentSceneId,
  onChapterContent, onToast }) {
  const tl = T(lang || "en");
  const [collapsed, setCollapsed] = useState({});
  const [query, setQuery] = useState("");
  const [drag, setDrag] = useState(null);          /* {kind,id,fromChapter} */
  const [drop, setDrop] = useState(null);          /* {row, pos} */
  const [confirm, setConfirm] = useState(null);
  const [editingRow, setEditingRowState] = useState(OL_EDITING);
  const setEditingRow = (key) => { OL_EDITING = key; setEditingRowState(key); };
  const listRef = useRef(null);
  const dragRef = useRef(null);
  const dropRef = useRef(null);
  /* Releasing a drag still lands a click on whatever row is under the
     finger — without this guard, every reorder would also open a chapter. */
  const dragEndAt = useRef(0);
  const notAfterDrag = (fn) => () => { if (Date.now() - dragEndAt.current < 260) return; fn(); };

  const chapters = project ? project.chapters : [];
  const parts = project ? project.parts || [] : [];

  const maxWords = useMemo(() => {
    let m = 1;
    chapters.forEach((c) => { m = Math.max(m, chapterWords(c)); });
    return m;
  }, [chapters, project && project.updatedAt]);

  const isOpen = (id) => !collapsed[id];
  const toggle = (id) => setCollapsed((c) => ({ ...c, [id]: !c[id] }));

  /* ---- structure edits ---------------------------------------------- */
  function cycleStatus(cid, cur, explicit) {
    const next = explicit || OL_STATUS[(OL_STATUS.indexOf(cur || "draft") + 1) % OL_STATUS.length];
    store.updateDoc(cid, { status: next });
  }
  function writeChapter(cid, html) {
    store.updateDoc(cid, { content: html });
    if (onChapterContent) onChapterContent(cid, html);
  }
  function addScene(cid) {
    const doc = chapters.find((c) => c.id === cid);
    if (!doc) return;
    const segs = splitScenes(doc.content || "");
    segs.push({ id: "s_" + Math.random().toString(36).slice(2, 9), title: tl("ol_new_scene"),
      status: "draft", lead: false, html: "<p><br></p>" });
    writeChapter(cid, joinScenes(segs));
    setCollapsed((c) => ({ ...c, [cid]: false }));
  }
  function renameScene(cid, sid, title) {
    const doc = chapters.find((c) => c.id === cid);
    if (!doc) return;
    const segs = splitScenes(doc.content || "");
    const s = segs.find((x) => x.id === sid);
    if (!s) return;
    s.title = title;
    writeChapter(cid, joinScenes(segs));
  }
  function setSceneStatus(cid, sid, cur, explicit) {
    const doc = chapters.find((c) => c.id === cid);
    if (!doc) return;
    const segs = splitScenes(doc.content || "");
    const s = segs.find((x) => x.id === sid);
    if (!s) return;
    s.status = explicit || OL_STATUS[(OL_STATUS.indexOf(cur || "draft") + 1) % OL_STATUS.length];
    writeChapter(cid, joinScenes(segs));
  }
  function deleteScene(cid, sid) {
    const doc = chapters.find((c) => c.id === cid);
    if (!doc) return;
    const segs = splitScenes(doc.content || "").filter((x) => x.lead || x.id !== sid);
    writeChapter(cid, joinScenes(segs));
  }
  /* Moving a scene moves its text with it — between positions in one
     chapter, or across chapters entirely. */
  function moveScene(cid, sid, toChapter, index) {
    const from = chapters.find((c) => c.id === cid);
    const to = chapters.find((c) => c.id === toChapter);
    if (!from || !to) return;
    const fromSegs = splitScenes(from.content || "");
    const at = fromSegs.findIndex((x) => !x.lead && x.id === sid);
    if (at < 0) return;
    const [seg] = fromSegs.splice(at, 1);
    if (cid === toChapter) {
      const target = Math.max(1, Math.min(index, fromSegs.length));
      fromSegs.splice(target, 0, seg);
      writeChapter(cid, joinScenes(fromSegs));
      return;
    }
    const toSegs = splitScenes(to.content || "");
    toSegs.splice(Math.max(1, Math.min(index, toSegs.length)), 0, seg);
    writeChapter(cid, joinScenes(fromSegs));
    writeChapter(toChapter, joinScenes(toSegs));
  }

  /* ---- drag & drop (pointer events: one code path for mouse + touch) -- */
  function onGrip(kind, id, extra) {
    return (e) => {
      e.preventDefault();
      e.stopPropagation();
      const start = { kind, id, ...extra };
      dragRef.current = start;
      setDrag(start);
      const target = e.currentTarget;
      try { target.setPointerCapture(e.pointerId); } catch (err) {}
      const move = (ev) => {
        const el = document.elementFromPoint(ev.clientX, ev.clientY);
        const row = el && el.closest ? el.closest("[data-row]") : null;
        if (!row || !listRef.current || !listRef.current.contains(row)) { dropRef.current = null; setDrop(null); return; }
        const key = row.getAttribute("data-row");
        if (key === kind + ":" + id) { dropRef.current = null; setDrop(null); return; }
        const r = row.getBoundingClientRect();
        const pos = (ev.clientY - r.top) / r.height < 0.5 ? "before" : "after";
        const next = { row: key, pos };
        dropRef.current = next;
        setDrop(next);
      };
      const up = () => {
        document.removeEventListener("pointermove", move);
        document.removeEventListener("pointerup", up);
        document.removeEventListener("pointercancel", up);
        const d = dragRef.current, t = dropRef.current;
        dragRef.current = null; dropRef.current = null;
        dragEndAt.current = Date.now();
        setDrag(null); setDrop(null);
        if (d && t) applyDrop(d, t);
      };
      document.addEventListener("pointermove", move);
      document.addEventListener("pointerup", up);
      document.addEventListener("pointercancel", up);
    };
  }

  function applyDrop(d, t) {
    const [tKind, tId] = t.row.split(":");
    if (d.kind === "part") {
      if (tKind !== "part") return;
      const ids = parts.map((p) => p.id).filter((x) => x !== d.id);
      const at = ids.indexOf(tId);
      ids.splice(t.pos === "before" ? Math.max(0, at) : at + 1, 0, d.id);
      store.reorderParts(project.id, ids);
      return;
    }
    if (d.kind === "chapter") {
      if (tKind === "part") {
        /* dropping on a part header files the chapter under it */
        const idx = chapters.findIndex((c) => c.partId === tId);
        store.moveChapter(project.id, d.id, tId, idx >= 0 ? idx : chapters.length);
        return;
      }
      if (tKind === "chapter") {
        const target = chapters.find((c) => c.id === tId);
        if (!target) return;
        const rest = chapters.filter((c) => c.id !== d.id);
        let at = rest.findIndex((c) => c.id === tId);
        if (t.pos === "after") at += 1;
        store.moveChapter(project.id, d.id, target.partId || null, at);
        return;
      }
      if (tKind === "scene" && d.id !== t.chapterId) return;
      return;
    }
    if (d.kind === "scene") {
      if (tKind === "chapter") { moveScene(d.chapterId, d.id, tId, 1); return; }
      if (tKind === "scene") {
        const [toChapter, sid] = tId.split("|");
        const doc = chapters.find((c) => c.id === toChapter);
        if (!doc) return;
        const segs = splitScenes(doc.content || "");
        let at = segs.findIndex((x) => !x.lead && x.id === sid);
        if (at < 0) return;
        if (t.pos === "after") at += 1;
        if (toChapter === d.chapterId) {
          const cur = segs.findIndex((x) => !x.lead && x.id === d.id);
          if (cur >= 0 && cur < at) at -= 1;
        }
        moveScene(d.chapterId, d.id, toChapter, at);
      }
    }
  }

  /* ---- search -------------------------------------------------------- */
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q || !project) return null;
    const out = [];
    chapters.forEach((c) => {
      const inTitle = (c.title || "").toLowerCase().indexOf(q) >= 0;
      const segs = scenesOf(c);
      let hit = inTitle;
      segs.forEach((s) => {
        if (s.lead) return;
        if ((s.title || "").toLowerCase().indexOf(q) >= 0) {
          out.push({ kind: "scene", cid: c.id, sid: s.id, title: s.title, chapter: c.title, snippet: "" });
          hit = true;
        }
      });
      const text = (c.content || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
      const at = text.toLowerCase().indexOf(q);
      if (at >= 0 || inTitle) {
        out.push({ kind: "chapter", cid: c.id, title: c.title,
          snippet: at >= 0 ? text.slice(Math.max(0, at - 30), at + q.length + 50).trim() : "" });
        hit = true;
      }
      return hit;
    });
    return out.slice(0, 60);
  }, [query, chapters, project && project.updatedAt]);

  /* keep the open document (and its current scene) in view */
  useEffect(() => {
    const el = listRef.current && listRef.current.querySelector(".ol-row.on");
    if (el && el.scrollIntoView) el.scrollIntoView({ block: "nearest" });
  }, [docId, currentSceneId, query]);

  if (!project) {
    return (
      <aside className="ed-outline">
        <div className="ol-head">
          <span className="ol-project">{tl("ol_title")}</span>
          <button className="icon-btn" onClick={onClose}><Icon name="close" size={16} /></button>
        </div>
        <div className="ol-empty mono">{tl("ol_note_only")}</div>
      </aside>
    );
  }

  function chapterRows(list, depth) {
    const rows = [];
    list.forEach((c) => {
      const segs = scenesOf(c).filter((s) => !s.lead);
      const words = chapterWords(c);
      rows.push(
        <OutlineRow key={c.id} kind="chapter" id={c.id} depth={depth} title={c.title} words={words} max={maxWords}
          status={c.status || "draft"} open={isOpen(c.id)} hasKids={segs.length > 0}
          active={c.id === docId} lang={lang}
          editing={editingRow === "chapter:" + c.id}
          onEdit={(v) => setEditingRow(v ? "chapter:" + c.id : null)}
          dragging={drag && drag.kind === "chapter" && drag.id === c.id}
          dropPos={drop && drop.row === "chapter:" + c.id ? drop.pos : null}
          onToggle={() => toggle(c.id)}
          onOpen={notAfterDrag(() => { if (c.id !== docId) nav.doc(c.id); })}
          onStatus={(s) => cycleStatus(c.id, c.status, typeof s === "string" ? s : null)}
          onRename={(v) => store.updateDoc(c.id, { title: v })}
          onDelete={() => setConfirm({ kind: "chapter", id: c.id, title: c.title })}
          onAddScene={() => addScene(c.id)}
          onGrip={onGrip("chapter", c.id)} />
      );
      if (isOpen(c.id)) {
        segs.forEach((s) => {
          rows.push(
            <OutlineRow key={c.id + "|" + s.id} kind="scene" id={c.id + "|" + s.id} depth={depth + 1}
              title={s.title} words={s.words} max={maxWords} status={s.status || "draft"}
              open hasKids={false} lang={lang}
              editing={editingRow === "scene:" + c.id + "|" + s.id}
              onEdit={(v) => setEditingRow(v ? "scene:" + c.id + "|" + s.id : null)}
              active={c.id === docId && s.id === currentSceneId}
              dragging={drag && drag.kind === "scene" && drag.id === s.id}
              dropPos={drop && drop.row === "scene:" + c.id + "|" + s.id ? drop.pos : null}
              onToggle={() => {}}
              onOpen={notAfterDrag(() => onSceneJump(c.id, s.id))}
              onStatus={(v) => setSceneStatus(c.id, s.id, s.status, typeof v === "string" ? v : null)}
              onRename={(v) => renameScene(c.id, s.id, v)}
              onDelete={() => setConfirm({ kind: "scene", id: s.id, cid: c.id, title: s.title })}
              onGrip={onGrip("scene", s.id, { chapterId: c.id })} />
          );
        });
      }
    });
    return rows;
  }

  const loose = chapters.filter((c) => !c.partId);

  return (
    <aside className="ed-outline" onMouseDown={(e) => e.stopPropagation()}>
      <div className="ol-head">
        <div className="ol-head-l">
          <Icon name="panel" size={15} />
          <span className="ol-project" title={project.title}>{project.title}</span>
        </div>
        <button className="icon-btn" onClick={onClose} title={tl("ol_close")}><Icon name="close" size={16} /></button>
      </div>

      <div className="ol-search">
        <Icon name="search" size={14} />
        <input value={query} placeholder={tl("ol_search_ph")} onChange={(e) => setQuery(e.target.value)} />
        {query && <button className="ol-search-x" onClick={() => setQuery("")}><Icon name="close" size={13} /></button>}
      </div>

      <div className="ol-list" ref={listRef}>
        {results ? (
          <>
            {!results.length && <div className="ol-empty mono">{tl("ol_no_results")}</div>}
            {results.map((r, i) => (
              <button className="ol-result" key={i}
                onClick={() => { if (r.kind === "scene") onSceneJump(r.cid, r.sid); else nav.doc(r.cid); }}>
                <span className="ol-result-k mono">{tl(r.kind === "scene" ? "ol_scene" : "ol_chapter")}</span>
                <span className="ol-result-t">{r.title || tl("ol_untitled")}</span>
                {r.snippet && <span className="ol-result-s">{r.snippet}</span>}
              </button>
            ))}
          </>
        ) : (
          <>
            {parts.map((pt) => {
              const kids = chapters.filter((c) => c.partId === pt.id);
              return (
                <React.Fragment key={pt.id}>
                  <OutlineRow kind="part" id={pt.id} depth={0} title={pt.title} words={kids.reduce((s, c) => s + chapterWords(c), 0)}
                    max={0} open={isOpen(pt.id)} hasKids={kids.length > 0} lang={lang}
                    editing={editingRow === "part:" + pt.id}
                    onEdit={(v) => setEditingRow(v ? "part:" + pt.id : null)}
                    dragging={drag && drag.kind === "part" && drag.id === pt.id}
                    dropPos={drop && drop.row === "part:" + pt.id ? drop.pos : null}
                    onToggle={() => toggle(pt.id)}
                    onRename={(v) => store.updatePart(project.id, pt.id, { title: v })}
                    onDelete={() => setConfirm({ kind: "part", id: pt.id, title: pt.title })}
                    onGrip={onGrip("part", pt.id)} />
                  {isOpen(pt.id) && chapterRows(kids, 1)}
                </React.Fragment>
              );
            })}
            {chapterRows(loose, parts.length ? 1 : 0)}
            {!chapters.length && !parts.length && <div className="ol-empty mono">{tl("ol_empty")}</div>}
          </>
        )}
      </div>

      <div className="ol-foot">
        <button className="ol-add" onClick={() => { const id = store.addChapter(project.id); nav.doc(id); }}>
          <Icon name="plus" size={14} /> {tl("ol_add_chapter")}
        </button>
        <button className="ol-add ol-add--ghost" onClick={() => store.addPart(project.id, tl("ol_new_part"))}>
          <Icon name="plus" size={14} /> {tl("ol_add_part")}
        </button>
      </div>

      {confirm && (
        <ConfirmDelete title={confirm.title || tl("ol_untitled")}
          what={tl(confirm.kind === "part" ? "what_part" : confirm.kind === "scene" ? "what_scene" : "what_chapter")}
          lang={lang}
          onCancel={() => setConfirm(null)}
          onConfirm={() => {
            if (confirm.kind === "part") store.deletePart(project.id, confirm.id);
            else if (confirm.kind === "scene") deleteScene(confirm.cid, confirm.id);
            else {
              store.deleteDoc(confirm.id);
              if (confirm.id === docId) {
                const next = project.chapters.find((c) => c.id !== confirm.id);
                if (next) nav.doc(next.id); else nav.project(project.id);
              }
            }
            setConfirm(null);
          }} />
      )}
    </aside>
  );
}

/* Closing the outline drops any rename that was left half-finished; a
   remount from opening another chapter deliberately keeps it. */
function clearOutlineEditing() { OL_EDITING = null; }

Object.assign(window, { OutlinePanel, OutlineRow, scenesOf, OL_STATUS, clearOutlineEditing });
