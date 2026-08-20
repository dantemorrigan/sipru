/* ============================================================
   Writed. — Editor (focus mode)
   ============================================================ */
/* Debounced save for ordinary typing + a reliable flush of the very last
   state (page hide, tab switch, unmount, doc/mode change, ⌘S).            */
function useDocSave(docId, store, getHTML) {
  const timer = useRef(null);
  const dirty = useRef(false);
  const pending = useRef(null);
  const getRef = useRef(getHTML);
  getRef.current = getHTML;

  const flush = useCallback(() => {
    clearTimeout(timer.current);
    timer.current = null;
    if (!dirty.current) return;
    dirty.current = false;
    /* getHTML reads the editor's DOM node through a ref we own, which keeps
       working after unmount (a detached node still holds its innerHTML), so
       leaving is safe without serializing on every keystroke */
    const live = getRef.current();
    const html = live != null ? live : pending.current;
    pending.current = null;
    if (html != null) store.updateDoc(docId, { content: html });
  }, [docId, store]);

  /* Called once per keystroke, so it must stay O(1): serializing the document
     here was the main source of typing lag on long chapters. The actual
     innerHTML read happens once per flush instead. */
  const schedule = useCallback((html) => {
    dirty.current = true;
    if (html != null) pending.current = html;
    clearTimeout(timer.current);
    timer.current = setTimeout(flush, 500);
  }, [flush]);

  useEffect(() => {
    const onHide = () => flush();
    const onVis = () => { if (document.visibilityState === "hidden") flush(); };
    window.addEventListener("pagehide", onHide);
    window.addEventListener("beforeunload", onHide);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.removeEventListener("pagehide", onHide);
      window.removeEventListener("beforeunload", onHide);
      document.removeEventListener("visibilitychange", onVis);
      flush();                       // component unmount / document change
    };
  }, [flush]);

  return { schedule, flush };
}

const FONT_MAP = { book: "var(--book)", article: "var(--book-alt)", mono: "var(--mono)" };

function Editor({ store, user, nav, onTheme, docId, apiRef, onToast }) {
  const lang = user.lang || "en";
  const tl = T(lang);
  const found = store.findDoc(docId);
  const ref = useRef(null);
  const scrollRef = useRef(null);
  const saved = useRef("");
  const [focusMode, setFocusMode] = useState(false);
  const [mode, setMode] = useState("edit");
  const [edition] = useState("novel");
  const [active, setActive] = useState({});
  const [words, setWords] = useState(0);
  const [renaming, setRenaming] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [noteExport, setNoteExport] = useState(false);
  const [kbOffset, setKbOffset] = useState(0);
  const [snapOpen, setSnapOpen] = useState(false);
  const [restoreTarget, setRestoreTarget] = useState(null);
  const [hist, setHist] = useState({ undo: false, redo: false });
  const [linkPopup, setLinkPopup] = useState(null);
  const depth = useRef({ u: 0, r: 0 });
  /* React nulls `ref` on unmount, but a detached DOM node still holds its
     content — keeping our own handle lets the final save read live HTML
     instead of a copy we'd otherwise have to refresh on every keystroke. */
  const nodeRef = useRef(null);
  const wordTimer = useRef(null);
  const { schedule: doSave, flush: flushSave } =
    useDocSave(docId, store, useCallback(() => (nodeRef.current ? nodeRef.current.innerHTML : null), []));

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () => {
      const off = window.innerHeight - vv.offsetTop - vv.height;
      setKbOffset(Math.max(0, Math.round(off)));
    };
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => { vv.removeEventListener("resize", update); vv.removeEventListener("scroll", update); };
  }, []);

  const doc = found && found.doc;
  const project = found && found.project;

  useEffect(() => {
    if (ref.current && doc) {
      const html = doc.content || "";
      saved.current = html;
      ref.current.innerHTML = html;
      try { document.execCommand("defaultParagraphSeparator", false, "p"); } catch (e) {}
      setWords(store.countWords(html));
      depth.current = { u: 0, r: 0 };
      setHist({ undo: false, redo: false });
      setTimeout(() => ref.current && ref.current.focus(), 60);
    }
  }, [docId]);

  useEffect(() => {
    if (mode === "edit" && ref.current) {
      ref.current.innerHTML = saved.current;
      setTimeout(() => ref.current && ref.current.focus(), 40);
    }
  }, [mode]);

  function switchMode(m) {
    if (m === mode) return;
    if (mode === "edit" && ref.current) {
      saved.current = ref.current.innerHTML;
      flushSave();
      store.updateDoc(docId, { content: saved.current });
    }
    setMode(m);
  }

  const editorFontVar = FONT_MAP[user.editorFont] || FONT_MAP.book;

  useEffect(() => {
    if (!focusMode) return;
    const onKey = (e) => { if (e.key === "Escape") setFocusMode(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [focusMode]);

  const refreshRaf = useRef(0);
  useEffect(() => () => cancelAnimationFrame(refreshRaf.current), [docId]);

  function computeActive() {
    try {
      const st = { bold: document.queryCommandState("bold"), italic: document.queryCommandState("italic"),
        underline: document.queryCommandState("underline"), strike: document.queryCommandState("strikeThrough"),
        ul: document.queryCommandState("insertUnorderedList"), ol: document.queryCommandState("insertOrderedList") };
      const sel = window.getSelection();
      let block = "";
      if (sel && sel.anchorNode) {
        let n = sel.anchorNode.nodeType === 3 ? sel.anchorNode.parentElement : sel.anchorNode;
        while (n && n !== ref.current) { const tg = n.tagName && n.tagName.toLowerCase();
          if (["h1","h2","h3","blockquote","p"].includes(tg)) { block = tg; break; } n = n.parentElement; }
      }
      st.block = block;
      setActive(st);
    } catch (e) {}
  }
  /* queryCommandState (×6) forces a synchronous selection/style recalc in
     the browser; onKeyUp fires it after every single keystroke, which is
     the main source of typing lag on heavier documents. Formatting state
     essentially never changes mid-word, so coalescing to once per frame
     costs nothing perceptible and collapses a burst of keystrokes (fast
     typing, IME, paste) into a single recalculation. */
  function refreshActive() {
    if (refreshRaf.current) return;
    refreshRaf.current = requestAnimationFrame(() => { refreshRaf.current = 0; computeActive(); });
  }

  /* Typing a character cannot change which formats are active — only moving
     the caret can. Skipping the recalc for ordinary keys keeps the style
     recalc out of the typing path entirely; navigation keys still refresh. */
  const NAV_KEYS = { ArrowLeft: 1, ArrowRight: 1, ArrowUp: 1, ArrowDown: 1,
    Home: 1, End: 1, PageUp: 1, PageDown: 1, Enter: 1, Backspace: 1, Delete: 1 };
  function onKeyUp(e) {
    if (NAV_KEYS[e.key] || e.ctrlKey || e.metaKey) refreshActive();
  }

  /* Words from textContent, counted without building an array of every match:
     countWords() strips tags off a full innerHTML copy, which is far too much
     work to repeat per keystroke on a long chapter. */
  function countVisibleWords(el) {
    const t = el.textContent;
    let n = 0, inWord = false;
    for (let i = 0; i < t.length; i++) {
      const c = t.charCodeAt(i);
      const ws = c === 32 || c === 9 || c === 10 || c === 13 || c === 160;
      if (ws) inWord = false;
      else if (!inWord) { inWord = true; n++; }
    }
    return n;
  }

  /* Runs on every keystroke, so it stays O(1): no innerHTML serialization and
     no full-document word count. The counter refreshes on a short idle pause,
     which also collapses a burst of typing into one React re-render. */
  function commitChange() {
    doSave(null);
    depth.current.u++; depth.current.r = 0;
    setHist((h) => (h.undo && !h.redo) ? h : { undo: true, redo: false });
    clearTimeout(wordTimer.current);
    wordTimer.current = setTimeout(() => {
      const el = nodeRef.current;
      if (el) setWords(countVisibleWords(el));
    }, 200);
  }

  /* ---- inline text replacement helper: swaps [start,end) of a text node
     for <tag>innerText</tag> and leaves the caret right after it ---- */
  function wrapRange(node, start, end, tagName, innerText) {
    const range = document.createRange();
    range.setStart(node, start); range.setEnd(node, end);
    range.deleteContents();
    const el = document.createElement(tagName);
    el.textContent = innerText;
    range.insertNode(el);

    /* A caret sitting merely *after* the new element still counts as being
       inside it, so everything typed next would nest into the <strong> — which
       is how "**a** and *b*" ended up as one deeply nested run. For the tags
       execCommand knows, toggling the format off resets that sticky typing
       style; <code> has no such command, so it gets a real trailing space to
       land the caret in (nbsp here matches what the editor already produces
       for any trailing space). */
    const sel = window.getSelection();
    const RESET = { strong: "bold", em: "italic", s: "strikeThrough" };
    const after = document.createRange();
    if (RESET[tagName]) {
      let tail = el.nextSibling;
      if (!tail || tail.nodeType !== 3) {
        tail = document.createTextNode("");
        el.parentNode.insertBefore(tail, el.nextSibling);
      }
      after.setStart(tail, 0); after.collapse(true);
      sel.removeAllRanges(); sel.addRange(after);
      if (document.queryCommandState(RESET[tagName])) {
        document.execCommand(RESET[tagName], false, null);
      }
    } else {
      /* nbsp, not a plain space: Chrome collapses trailing whitespace at the
         end of a block, which would drop the separator and pull typing back
         inside the <code>. */
      const tail = document.createTextNode("\u00A0");
      el.parentNode.insertBefore(tail, el.nextSibling);
      after.setStart(tail, tail.length); after.collapse(true);
      sel.removeAllRanges(); sel.addRange(after);
    }
  }

  const URL_RE = /^(https?:\/\/[^\s]+|www\.[^\s]+\.[^\s]+)$/i;

  /* ---- Obsidian-style live markdown: "# " → H1, "**x**" → bold, a typed
     URL followed by a space → auto-link, etc. Runs inside onInput right
     after the browser has already inserted the triggering character. */
  function tryMarkdownTransform(e) {
    if (!e || !e.nativeEvent) return false;
    const data = e.nativeEvent.data;
    if (!data) return false;
    const sel = window.getSelection();
    if (!sel || !sel.isCollapsed || !sel.anchorNode || sel.anchorNode.nodeType !== 3) return false;
    const node = sel.anchorNode;
    const offset = sel.anchorOffset;
    const text = node.textContent;
    /* a lone/trailing space in contentEditable is often inserted as
       U+00A0 nbsp rather than a plain space — normalize before matching */
    const before = text.slice(0, offset).replace(/\u00A0/g, " ");
    const isSpace = data === " " || data === "\u00A0";

    if (isSpace) {
      const parentBlock = node.parentElement;
      const atLineStart = parentBlock && parentBlock.firstChild === node;
      if (atLineStart) {
        const m = before.match(/^(#{1,3}|>|-|\*|\d+\.) $/);
        if (m) {
          const range = document.createRange();
          range.setStart(node, 0); range.setEnd(node, offset);
          sel.removeAllRanges(); sel.addRange(range);
          ref.current.focus();
          document.execCommand("delete", false, null);
          const marker = m[1];
          if (marker === "#") document.execCommand("formatBlock", false, "h1");
          else if (marker === "##") document.execCommand("formatBlock", false, "h2");
          else if (marker === "###") document.execCommand("formatBlock", false, "h3");
          else if (marker === ">") document.execCommand("formatBlock", false, "blockquote");
          else if (marker === "-" || marker === "*") document.execCommand("insertUnorderedList", false, null);
          else document.execCommand("insertOrderedList", false, null);
          refreshActive();
          return true;
        }
      }
      /* auto-link a typed URL followed by a space */
      const wm = before.match(/(\S+) $/);
      if (wm && URL_RE.test(wm[1]) && !(node.parentElement && node.parentElement.closest("a"))) {
        const word = wm[1];
        const start = offset - wm[0].length, end = start + word.length;
        const href = /^https?:\/\//i.test(word) ? word : "https://" + word;
        const a = document.createElement("a");
        a.href = href; a.target = "_blank"; a.rel = "noopener noreferrer"; a.className = "ed-link";
        a.textContent = word;
        const range = document.createRange();
        range.setStart(node, start); range.setEnd(node, end);
        range.deleteContents(); range.insertNode(a);
        const after = document.createRange();
        after.setStartAfter(a); after.collapse(true);
        sel.removeAllRanges(); sel.addRange(after);
        return true;
      }
      return false;
    }

    if (data === "-") {
      const parentBlock = node.parentElement;
      const atLineStart = parentBlock && parentBlock.firstChild === node;
      if (atLineStart && before === "---") {
        const range = document.createRange();
        range.setStart(node, 0); range.setEnd(node, offset);
        sel.removeAllRanges(); sel.addRange(range);
        ref.current.focus();
        document.execCommand("delete", false, null);
        document.execCommand("insertHorizontalRule", false, null);
        return true;
      }
      return false;
    }

    if (data === "*") {
      const bold = before.match(/\*\*([^*\n]+)\*\*$/);
      if (bold) { wrapRange(node, offset - bold[0].length, offset, "strong", bold[1]); return true; }
      const em = before.match(/\*([^*\n]+)\*$/);
      if (em && before[before.length - em[0].length - 1] !== "*") {
        wrapRange(node, offset - em[0].length, offset, "em", em[1]); return true;
      }
      return false;
    }
    if (data === "_") {
      const em = before.match(/_([^_\n]+)_$/);
      if (em) { wrapRange(node, offset - em[0].length, offset, "em", em[1]); return true; }
      return false;
    }
    if (data === "~") {
      const s = before.match(/~~([^~\n]+)~~$/);
      if (s) { wrapRange(node, offset - s[0].length, offset, "s", s[1]); return true; }
      return false;
    }
    if (data === "`") {
      const c = before.match(/`([^`\n]+)`$/);
      if (c) { wrapRange(node, offset - c[0].length, offset, "code", c[1]); return true; }
      return false;
    }
    return false;
  }

  function onInput(e) {
    tryMarkdownTransform(e);
    commitChange();
  }

  /* ---- link insert/edit popover ---- */
  function expandToWord(range) {
    const node = range.startContainer;
    if (node.nodeType !== 3) return null;
    const text = node.textContent;
    let start = range.startOffset, end = range.startOffset;
    while (start > 0 && !/\s/.test(text[start - 1])) start--;
    while (end < text.length && !/\s/.test(text[end])) end++;
    if (start === end) return null;
    const r = document.createRange();
    r.setStart(node, start); r.setEnd(node, end);
    return r;
  }
  function openLinkPopup() {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    let range = sel.getRangeAt(0);
    if (range.collapsed) {
      const expanded = expandToWord(range);
      if (!expanded) return;
      range = expanded;
      sel.removeAllRanges(); sel.addRange(range);
    }
    const anchorEl = sel.anchorNode && (sel.anchorNode.nodeType === 3 ? sel.anchorNode.parentElement : sel.anchorNode);
    const linkEl = anchorEl && anchorEl.closest && anchorEl.closest("a");
    const rect = range.getBoundingClientRect();
    setLinkPopup({ range: range.cloneRange(), href: linkEl ? (linkEl.getAttribute("href") || "") : "",
      anchor: { x: rect.left + rect.width / 2, y: rect.bottom } });
  }
  function applyLink(url) {
    if (!linkPopup) return;
    const sel = window.getSelection();
    sel.removeAllRanges(); sel.addRange(linkPopup.range);
    ref.current.focus();
    const clean = (url || "").trim();
    if (!clean) {
      document.execCommand("unlink", false, null);
    } else {
      const href = /^https?:\/\//i.test(clean) || /^mailto:/i.test(clean) ? clean : "https://" + clean;
      document.execCommand("createLink", false, href);
      ref.current.querySelectorAll('a[href="' + href.replace(/"/g, '\\"') + '"]').forEach((a) => {
        a.target = "_blank"; a.rel = "noopener noreferrer"; a.classList.add("ed-link");
      });
    }
    setLinkPopup(null);
    commitChange();
    refreshActive();
  }

  /* Native contentEditable history — reliable on desktop and mobile alike.
     Depth counters drive the disabled state and self-correct when the
     browser's own stack turns out to be shorter than we assumed.          */
  function runHistory(cmd) {
    const el = ref.current;
    if (!el) return;
    const before = el.innerHTML;
    el.focus();
    try { document.execCommand(cmd, false, null); } catch (e) { return; }
    const d = depth.current;
    if (el.innerHTML === before) {
      if (cmd === "undo") d.u = 0; else d.r = 0;
    } else {
      if (cmd === "undo") { d.u = Math.max(0, d.u - 1); d.r++; }
      else { d.r = Math.max(0, d.r - 1); d.u++; }
      const html = el.innerHTML;
      saved.current = html;
      setWords(store.countWords(html));
      doSave(html);
    }
    setHist({ undo: d.u > 0, redo: d.r > 0 });
    refreshActive();
  }

  function onKeyDown(e) {
    if (!(e.metaKey || e.ctrlKey)) return;
    const k = (e.key || "").toLowerCase();
    if (k === "z") { e.preventDefault(); runHistory(e.shiftKey ? "redo" : "undo"); }
    else if (k === "y") { e.preventDefault(); runHistory("redo"); }
    else if (k === "b") { e.preventDefault(); exec("bold"); }
    else if (k === "i") { e.preventDefault(); exec("italic"); }
    else if (k === "u") { e.preventDefault(); exec("underline"); }
    else if (k === "k") { e.preventDefault(); e.stopPropagation(); openLinkPopup(); }
    else if (e.shiftKey && k === "x") { e.preventDefault(); exec("strikeThrough"); }
  }

  function exec(cmd, val) {
    ref.current.focus();
    document.execCommand(cmd, false, val);
    onInput(); refreshActive();
  }
  function block(tag) {
    const cur = active.block;
    exec("formatBlock", cur === tag ? "p" : tag);
  }
  function persistNow() {
    if (!ref.current) return null;
    const html = ref.current.innerHTML;
    flushSave();
    store.updateDoc(docId, { content: html });
    saved.current = html;
    return html;
  }
  function saveNow() {
    if (persistNow() == null) return;
    setSavedFlash(true); setTimeout(() => setSavedFlash(false), 1400);
  }

  /* ---- snapshots ---- */
  function saveSnapshot(name) {
    persistNow();
    store.createSnapshot(docId, name);
    if (onToast) onToast(tl("snap_saved"));
  }
  function doRestore(snap) {
    persistNow();
    store.createSnapshot(docId, tl("snap_auto_name"));
    store.updateDoc(docId, { content: snap.content });
    saved.current = snap.content;
    if (ref.current) ref.current.innerHTML = snap.content;
    setWords(store.countWords(snap.content));
    depth.current = { u: 0, r: 0 };
    setHist({ undo: false, redo: false });
    setRestoreTarget(null);
    setSnapOpen(false);
    if (onToast) onToast(tl("snap_restored"));
  }

  function handleDelete() {
    store.deleteDoc(docId);
    if (project) nav.project(project.id);
    else nav.dashboard();
  }

  useEffect(() => {
    if (!apiRef) return;
    apiRef.current = {
      run(name, rest) {
        switch (name) {
          case "bold": exec("bold"); break;
          case "italic": exec("italic"); break;
          case "underline": exec("underline"); break;
          case "strike": exec("strikeThrough"); break;
          case "h1": block("h1"); break;
          case "h2": block("h2"); break;
          case "h3": block("h3"); break;
          case "quote": block("blockquote"); break;
          case "ul": exec("insertUnorderedList"); break;
          case "ol": exec("insertOrderedList"); break;
          case "hr": exec("insertHorizontalRule"); break;
          case "link": openLinkPopup(); break;
          case "save": saveNow(); break;
          case "undo": runHistory("undo"); break;
          case "redo": runHistory("redo"); break;
          case "snapshots": setSnapOpen(true); break;
          case "rename": rest ? store.updateDoc(docId, { title: rest }) : setRenaming(true); break;
          /* switchMode (not setMode) so the preview reads the live document
             rather than whatever was last serialized */
          case "preview": switchMode("preview"); break;
          case "edit": switchMode("edit"); break;
          case "focus": setFocusMode((f) => !f); break;
          case "chapter": if (project) { const id = store.addChapter(project.id, rest); nav.doc(id); } break;
          case "export": if (project) nav.export(project.id, rest); break;
          default: return false;
        }
        return true;
      }
    };
    return () => { if (apiRef) apiRef.current = null; };
  });

  const readMins = Math.max(1, Math.round(words / 200));

  if (!doc) return <div className="app-shell"><div className="empty mono">{tl("doc_not_found")}</div></div>;

  const tools = [
    { g: [["bold","bold"],["italic","italic"],["underline","underline"],["strike","strike"]] },
    { g: [["h1","h1"],["h2","h2"],["h3","h3"]] },
    { g: [["quote","quote"],["ul","ul"],["ol","ol"],["hr","hr"]] },
    { g: [["link","link"]] },
  ];

  const FONT_MAP_FAMILY = { book: "var(--book)", article: "var(--book-alt)", mono: "var(--mono)" };

  return (
    <div className={"editor-root" + (focusMode ? " focus" : "")}>
      <header className={"ed-head" + (renaming ? " ed-head--renaming" : "")}>
        <div className="ed-head-l">
          <button className="icon-btn" onClick={() => project ? nav.project(project.id) : nav.dashboard()} title={tl("ed_back")}><Icon name="back" size={18} /></button>
          <div className="ed-crumb">
            {project && <span className="ed-crumb-proj" onClick={() => nav.project(project.id)}>{project.title}</span>}
            {project && <span className="ed-crumb-sep mono">/</span>}
            {renaming ? (
              <input className="ed-rename" autoFocus defaultValue={doc.title}
                onBlur={(e) => { store.updateDoc(docId, { title: e.target.value.trim() || doc.title }); setRenaming(false); }}
                onKeyDown={(e) => e.key === "Enter" && e.target.blur()} />
            ) : (
              <span className="ed-crumb-doc" onClick={() => setRenaming(true)} title={tl("ed_rename")}>{doc.title}</span>
            )}
          </div>
        </div>
        <div className="ed-head-r">
          <div className="modeswitch">
            <button className={"modeswitch-b" + (mode==="edit"?" on":"")} onClick={() => switchMode("edit")}><Icon name="edit" size={15} /> {tl("mode_edit")}</button>
            <button className={"modeswitch-b" + (mode==="preview"?" on":"")} onClick={() => switchMode("preview")}><Icon name="eye" size={15} /> {tl("mode_preview")}</button>
          </div>
          <button className="icon-btn" onClick={() => setSnapOpen(true)} title={tl("snap_btn")}><Icon name="history" size={18} /></button>
          <button className={"icon-btn" + (savedFlash ? " icon-btn--flash" : "")} onClick={saveNow} title={tl("ed_save")}><Icon name="save" size={18} /></button>
          {project
            ? <button className="icon-btn" onClick={() => nav.export(project.id)} title={tl("ed_export_book")}><Icon name="export" size={18} /></button>
            : <button className="icon-btn" onClick={() => { persistNow(); setNoteExport(true); }} title={tl("ed_export_note")}><Icon name="export" size={18} /></button>
          }
          <button className="icon-btn icon-btn--danger" onClick={() => setConfirmDelete(true)} title={tl("ed_delete_doc")}><Icon name="trash" size={18} /></button>
          <ThemeToggle theme={user.theme} onChange={onTheme} lang={lang} />
        </div>
      </header>

      <div className="ed-body">
        <aside className={"ed-tools" + (mode !== "edit" ? " ed-tools--preview" : "")}
          style={kbOffset > 0 ? { bottom: kbOffset } : undefined}>
          {mode === "edit" && (
            <div className="ed-tools-grp">
              <button className="tool" title={tl("ed_undo")} disabled={!hist.undo}
                onMouseDown={(e) => { e.preventDefault(); runHistory("undo"); }}>
                <Icon name="undo" size={19} />
              </button>
              <button className="tool" title={tl("ed_redo")} disabled={!hist.redo}
                onMouseDown={(e) => { e.preventDefault(); runHistory("redo"); }}>
                <Icon name="redo" size={19} />
              </button>
            </div>
          )}
          {mode === "edit" && tools.map((grp, gi) => (
            <div className="ed-tools-grp" key={gi}>
              {grp.g.map(([icon, cmd]) => (
                <button key={cmd} className={"tool" + (active[cmd] || active.block===cmd ? " on" : "")}
                  title={cmd === "link" ? tl("ed_link") : cmd} onMouseDown={(e) => { e.preventDefault();
                    if (["h1","h2","h3","quote"].includes(cmd)) block(cmd==="quote"?"blockquote":cmd);
                    else if (cmd==="strike") exec("strikeThrough");
                    else if (cmd==="ul") exec("insertUnorderedList");
                    else if (cmd==="ol") exec("insertOrderedList");
                    else if (cmd==="hr") exec("insertHorizontalRule");
                    else if (cmd==="link") openLinkPopup();
                    else exec(cmd); }}>
                  <Icon name={icon} size={19} />
                </button>
              ))}
            </div>
          ))}
          {mode === "edit" && (
            <div className="ed-tools-grp ed-tools-fonts">
              {["book","article","mono"].map((f) => (
                <button key={f} className={"tool tool--font" + (user.editorFont===f?" on":"")}
                  title={FONT_LABEL[f]}
                  style={{ fontFamily: FONT_MAP_FAMILY[f], fontSize: 13, letterSpacing: f==="mono"?"-0.03em":"0.01em" }}
                  onMouseDown={(e) => { e.preventDefault(); store.setUser({ editorFont: f }); }}>
                  Aa
                </button>
              ))}
            </div>
          )}
          <div className="ed-tools-grp ed-tools-modes">
            <button className={"tool tool--focusdot" + (focusMode?" on":"")} title={tl("focus_mode_btn")}
              onClick={() => setFocusMode((f)=>!f)}>
              <span className={"brand-dot-btn" + (focusMode?" active":"")} />
            </button>
          </div>
          <div className="ed-tools-grp ed-tools-modetab">
            <button className={"tool" + (mode==="edit"?" on":"")} title={tl("mode_edit")}
              onMouseDown={(e) => { e.preventDefault(); switchMode("edit"); }}>
              <Icon name="edit" size={18} />
            </button>
            <button className={"tool" + (mode==="preview"?" on":"")} title={tl("mode_preview")}
              onMouseDown={(e) => { e.preventDefault(); switchMode("preview"); }}>
              <Icon name="eye" size={18} />
            </button>
          </div>
        </aside>

        <div className="ed-scroll" ref={scrollRef}
          style={{ display: mode === "edit" ? "" : "none" }}>
          <div className="sheet" style={{ "--ed-font": editorFontVar }}>
            <div className="sheet-edge" />
            <div ref={(el) => { ref.current = el; if (el) nodeRef.current = el; }}
              className="ed-area" contentEditable suppressContentEditableWarning
              spellCheck={true} data-placeholder={tl("editor_placeholder")}
              onInput={onInput} onKeyDown={onKeyDown} onKeyUp={onKeyUp}
              onMouseUp={refreshActive} onFocus={refreshActive} />
          </div>
          <div style={{ height: "120px" }} />
        </div>
        {mode === "preview" && (
          <BookPreview html={saved.current || doc.content} title={doc.title} edition={edition} lang={lang} />
        )}
      </div>

      <footer className="ed-foot">
        <div className="ed-foot-meta mono">
          {project ? project.title : tl("note_label")} <span className="ed-foot-sep">·</span> {doc.title}
          {savedFlash && <span className="ed-foot-saved">{tl("saved_flash")}</span>}
        </div>
        <div className="ed-count mono">
          <span className={"wc" + (savedFlash?" wc--saved":"")}>{wordsLabel(words, lang)}</span>
          {words > 0 && <><span className="ed-foot-sep">·</span><span>≈ {readMins} {tl("read_min")}</span></>}
        </div>
      </footer>

      {focusMode && (
        <>
          <div className="focus-hint mono">{tl("focus_exit_hint")}</div>
          <button className="focus-exit-btn" onClick={() => setFocusMode(false)} title={tl("focus_exit_btn")}>
            <Icon name="close" size={18} />
          </button>
        </>
      )}

      {confirmDelete && (
        <ConfirmDelete
          title={doc.title}
          what={tl(project ? "what_chapter" : "what_note")}
          onConfirm={handleDelete}
          onCancel={() => setConfirmDelete(false)}
          lang={lang}
        />
      )}
      {snapOpen && (
        <SnapshotModal
          snapshots={store.snapshots(docId)}
          lang={lang}
          onSave={saveSnapshot}
          onDelete={(sid) => { store.deleteSnapshot(docId, sid); if (onToast) onToast(tl("snap_deleted")); }}
          onRestore={(snap) => setRestoreTarget(snap)}
          onClose={() => setSnapOpen(false)}
        />
      )}
      {restoreTarget && (
        <ConfirmRestore snap={restoreTarget} lang={lang}
          onConfirm={() => doRestore(restoreTarget)}
          onCancel={() => setRestoreTarget(null)} />
      )}
      {noteExport && !project && (
        <NoteExportModal
          note={{ ...doc, content: saved.current || doc.content }}
          onClose={() => setNoteExport(false)}
          onToast={onToast || (() => {})}
          lang={lang}
        />
      )}
      {linkPopup && (
        <LinkPopup href={linkPopup.href} anchor={linkPopup.anchor} lang={lang}
          onApply={applyLink} onClose={() => setLinkPopup(null)} />
      )}
    </div>
  );
}

/* ---- inline link editor popover ---- */
function LinkPopup({ href, anchor, lang, onApply, onClose }) {
  const tl = T(lang);
  const [url, setUrl] = useState(href || "");
  const [style, setStyle] = useState({ opacity: 0 });
  const inputRef = useRef(null);
  const popRef = useRef(null);
  useEffect(() => { setTimeout(() => inputRef.current && inputRef.current.focus(), 30); }, []);
  useEffect(() => {
    const el = popRef.current;
    if (!el || !anchor) return;
    const margin = 12;
    const w = el.offsetWidth, h = el.offsetHeight;
    let left = anchor.x - w / 2;
    left = Math.max(margin, Math.min(left, window.innerWidth - w - margin));
    let top = anchor.y + 10;
    if (top + h + margin > window.innerHeight) top = Math.max(margin, anchor.y - h - 10);
    setStyle({ left, top, opacity: 1 });
  }, [anchor]);
  return (
    <div className="link-pop-scrim" onMouseDown={onClose}>
      <div ref={popRef} className="link-pop" style={style} onMouseDown={(e) => e.stopPropagation()}>
        <Icon name="link" size={16} />
        <input ref={inputRef} className="link-pop-input mono" value={url}
          placeholder={tl("link_url_placeholder")}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") { e.preventDefault(); onApply(url); }
            else if (e.key === "Escape") { e.preventDefault(); onClose(); }
          }} />
        {href && <button className="link-pop-rm" title={tl("link_remove")} onClick={() => onApply("")}>
          <Icon name="close" size={15} />
        </button>}
        <button className="link-pop-ok" onClick={() => onApply(url)}>{tl("link_apply")}</button>
      </div>
    </div>
  );
}

/* ============================================================
   Snapshots — versions of a single chapter / note
   ============================================================ */
function snapPreview(html) {
  return (html || "").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/\s+/g, " ").trim().slice(0, 130);
}

function SnapshotModal({ snapshots, lang, onSave, onDelete, onRestore, onClose }) {
  const tl = T(lang || "en");
  const [name, setName] = useState("");
  const locale = lang === "ru" ? "ru-RU" : "en-US";

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="modal-scrim" onMouseDown={onClose}>
      <div className="modal snap-modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div><div className="eyebrow">{tl("snap_title")}</div>
            <h2 className="modal-title">{tl("snap_btn")}</h2></div>
          <button className="icon-btn" onClick={onClose}><Icon name="close" size={18} /></button>
        </div>

        <form className="snap-new" onSubmit={(e) => { e.preventDefault(); onSave(name.trim()); setName(""); }}>
          <input className="snap-input" value={name} maxLength={60}
            placeholder={tl("snap_name_placeholder")} onChange={(e) => setName(e.target.value)} />
          <button type="submit" className="btn btn--accent"><Icon name="save" size={15} /> {tl("snap_save")}</button>
        </form>

        <div className="snap-list">
          {!snapshots.length && <div className="snap-empty mono">{tl("snap_empty")}</div>}
          {snapshots.map((sn) => (
            <div className="snap-item" key={sn.id}>
              <div className="snap-item-head">
                <span className="snap-item-name">{sn.name || new Date(sn.createdAt).toLocaleString(locale, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                <span className="snap-item-meta mono">{wordsLabel(sn.words || 0, lang)}</span>
              </div>
              {sn.name ? <div className="snap-item-date mono">{new Date(sn.createdAt).toLocaleString(locale, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</div> : null}
              <div className="snap-item-prev">{snapPreview(sn.content) || "—"}</div>
              <div className="snap-item-actions">
                <button className="btn btn--ghost btn--xs" onClick={() => onRestore(sn)}>
                  <Icon name="reset" size={14} /> {tl("snap_restore")}
                </button>
                <button className="btn btn--ghost btn--xs snap-del" title={tl("snap_delete")}
                  onClick={() => onDelete(sn.id)}><Icon name="trash" size={14} /></button>
              </div>
            </div>
          ))}
        </div>
        <div className="snap-foot mono">{tl("snap_limit")}</div>
      </div>
    </div>
  );
}

function ConfirmRestore({ snap, lang, onConfirm, onCancel }) {
  const tl = T(lang || "en");
  const locale = lang === "ru" ? "ru-RU" : "en-US";
  return (
    <div className="modal-scrim" onMouseDown={onCancel}>
      <div className="confirm-modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="confirm-icon"><Icon name="reset" size={22} /></div>
        <div className="confirm-title">{tl("snap_confirm_title")}</div>
        <div className="confirm-name">
          {snap.name || new Date(snap.createdAt).toLocaleString(locale, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
        </div>
        <p className="confirm-note mono">{tl("snap_confirm_body")}</p>
        <div className="confirm-actions">
          <button className="btn btn--ghost" onClick={onCancel}>{tl("confirm_cancel")}</button>
          <button className="btn btn--accent" onClick={onConfirm}><Icon name="reset" size={15} /> {tl("snap_confirm_ok")}</button>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { Editor, SnapshotModal, ConfirmRestore });
