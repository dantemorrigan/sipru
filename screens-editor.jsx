/* ============================================================
   Sipru. — Editor (focus mode)
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

/* Shortcut hints have to name the key the reader actually has: ⌘ on a Mac,
   Ctrl everywhere else — a tooltip promising ⌘B on Windows teaches the
   wrong thing. The bindings themselves are read off e.code, so they work
   on every keyboard layout, Cyrillic included. */
const IS_MAC = (() => {
  try { return /Mac|iPhone|iPad|iPod/.test(navigator.platform || navigator.userAgent || ""); }
  catch (e) { return false; }
})();
const MOD = IS_MAC ? "⌘" : "Ctrl+";
const ALTK = IS_MAC ? "⌥" : "Alt+";
const SHIFTK = IS_MAC ? "⇧" : "Shift+";
const KEYS = {
  bold: MOD + "B", italic: MOD + "I", underline: MOD + "U",
  strike: MOD + SHIFTK + "X", highlight: MOD + SHIFTK + "H", link: MOD + "K",
  quote: MOD + SHIFTK + "9", ul: MOD + SHIFTK + "8", ol: MOD + SHIFTK + "7",
  "al-l": MOD + SHIFTK + "L", "al-c": MOD + SHIFTK + "E", "al-r": MOD + SHIFTK + "R", "al-j": MOD + SHIFTK + "J",
  undo: MOD + "Z", redo: MOD + SHIFTK + "Z", save: MOD + "S",
  pagebreak: MOD + "⏎", footnote: MOD + ALTK + "F", focus: MOD + SHIFTK + "F", preview: MOD + SHIFTK + "P",
  h: MOD + ALTK + "1…6",
};
const hint = (label, key) => (key ? label + "  ·  " + key : label);

/* The editor remounts on every document change (App keys it by id), so
   whether the outline is open lives just outside the component — jumping
   between chapters from the outline must not close the outline. */
let OUTLINE_STICKY = false;

/* A contentEditable with *no* element children at all gives the browser
   nowhere to anchor typing: the first character lands as a bare text node
   sitting directly under the editable root instead of inside a paragraph.
   That orphan node is invisible to pagination (which only walks element
   children) and to per-page footnote placement (which looks for markers
   *inside* each block) — so the very first word can drift to the wrong
   page, and a footnote planted right after it never finds its way into any
   page's footnote box. Every place that loads stored HTML into the editor
   goes through this so there is always at least one block to type into. */
const EMPTY_DOC_HTML = "<p><br></p>";
function withFallbackHTML(html) { return html && html !== "" ? html : EMPTY_DOC_HTML; }

function Editor({ store, user, nav, onTheme, docId, apiRef, onToast }) {
  const lang = user.lang || "en";
  const tl = T(lang);
  const found = store.findDoc(docId);
  const ref = useRef(null);
  const scrollRef = useRef(null);
  const barRef = useRef(null);
  const [barH, setBarH] = useState(0);
  const footRef = useRef(null);
  const [footH, setFootH] = useState(0);
  const saved = useRef("");
  const [focusMode, setFocusMode] = useState(false);
  const [mode, setMode] = useState("edit");
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
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef(null);
  /* ---- the page: geometry, pagination, structure ---- */
  const paperRef = useRef(null);
  const [avail, setAvail] = useState(0);
  const [pages, setPages] = useState([[]]);
  const [outlineOpen, setOutlineOpenState] = useState(OUTLINE_STICKY);
  const setOutlineOpen = useCallback((v) => setOutlineOpenState((o) => {
    const next = typeof v === "function" ? v(o) : v;
    OUTLINE_STICKY = next;
    if (!next && window.clearOutlineEditing) window.clearOutlineEditing();
    return next;
  }), []);
  const [setupOpen, setSetupOpen] = useState(false);
  const [setupTab, setSetupTab] = useState("page");
  const [insertOpen, setInsertOpen] = useState(false);
  const [styleOpen, setStyleOpen] = useState(false);
  const [blockStyle, setBlockStyle] = useState("p");
  const [alignCls, setAlignState] = useState("");
  const [fnEdit, setFnEdit] = useState(null);
  const [curScene, setCurScene] = useState("");
  const [curPage, setCurPage] = useState(1);
  const [prevMeta, setPrevMeta] = useState(null);
  const insertRef = useRef(null);
  const styleRef = useRef(null);
  const reserveRef = useRef([]);
  const passRef = useRef(0);
  const pgTimer = useRef(null);
  const pgLast = useRef(0);
  const pendingScene = useRef(null);
  const scrollRaf = useRef(0);
  /* Only load-bearing on mobile, where the header has no room to lay these
     out inline — see .ed-more-menu in ui.css. Desktop keeps the buttons
     inline via `display: contents` and never opens this. */
  useEffect(() => {
    if (!moreOpen) return;
    function onDown(e) { if (moreRef.current && !moreRef.current.contains(e.target)) setMoreOpen(false); }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("touchstart", onDown); };
  }, [moreOpen]);
  const depth = useRef({ u: 0, r: 0 });
  /* React nulls `ref` on unmount, but a detached DOM node still holds its
     content — keeping our own handle lets the final save read live HTML
     instead of a copy we'd otherwise have to refresh on every keystroke. */
  const nodeRef = useRef(null);
  const wordTimer = useRef(null);
  const lastRange = useRef(null);
  const { schedule: doSave, flush: flushSave } =
    useDocSave(docId, store, useCallback(() => serializeArea(nodeRef.current), []));

  /* The mobile toolbar is `position: fixed` so it can float above the
     keyboard, which pulls it out of the normal document flow — nothing
     downstream reserves room for it any more. The footer, still laid out
     in flow as the last child of the same flex column, ends up sized to
     the full remaining height and lands at the very bottom of the
     screen, exactly where the fixed toolbar also sits: the two draw on
     top of each other. Measuring the toolbar's real height (it varies
     with the safe-area inset and whether a menu row wraps) and exposing
     it as a CSS variable lets the footer place itself just above it
     instead of guessing a fixed pixel offset. */
  useEffect(() => {
    const el = barRef.current;
    if (!el) return;
    const measure = () => setBarH(el.offsetHeight);
    measure();
    let ro = null;
    if (window.ResizeObserver) { ro = new ResizeObserver(measure); ro.observe(el); }
    else window.addEventListener("resize", measure);
    return () => { if (ro) ro.disconnect(); else window.removeEventListener("resize", measure); };
  }, []);
  /* Some Android keyboards (Gboard's clipboard tray in particular) insert
     a pasted note without ever firing a ClipboardEvent — only a native
     `beforeinput` with inputType "insertFromPaste" reaches the page.
     React's onBeforeInput prop goes through a legacy emulation layer that
     does not reliably forward a plain native `beforeinput` event, so this
     is a real, non-React listener on the node itself (same technique as
     the pinch handler below) rather than a JSX prop. Left unhandled, the
     browser's own default insertion drops the paste in completely raw:
     "## Heading" stays two literal hash marks instead of becoming a
     heading — this is what closes that gap without touching the normal
     desktop path (there the ClipboardEvent fires first and its own
     preventDefault() stops any of this from running). */
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onBeforeInput = (e) => {
      if (e.inputType !== "insertFromPaste" || !e.dataTransfer) return;
      const text = e.dataTransfer.getData("text/plain");
      if (!text) return;
      e.preventDefault();
      insertMarkdownText(text);
    };
    el.addEventListener("beforeinput", onBeforeInput);
    return () => el.removeEventListener("beforeinput", onBeforeInput);
  }, [docId]);

  useEffect(() => {
    const el = footRef.current;
    if (!el) return;
    const measure = () => setFootH(el.offsetHeight);
    measure();
    let ro = null;
    if (window.ResizeObserver) { ro = new ResizeObserver(measure); ro.observe(el); }
    else window.addEventListener("resize", measure);
    return () => { if (ro) ro.disconnect(); else window.removeEventListener("resize", measure); };
  }, []);

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
      const html = withFallbackHTML(doc.content);
      ref.current.innerHTML = html;
      /* Documents written before the list nesting was fixed are still on
         disk holding <p><ul>…</ul></p>; repair them on the way in so the
         damage doesn't outlive the bug. */
      if (unwrapNestedBlocks(ref.current)) saved.current = serializeArea(ref.current);
      else saved.current = html;
      try { document.execCommand("defaultParagraphSeparator", false, "p"); } catch (e) {}
      setWords(store.countWords(html));
      depth.current = { u: 0, r: 0 };
      setHist({ undo: false, redo: false });
      /* on touch devices, autofocus pops the keyboard before the user has
         asked to type — only desktop (fine pointer) gets it on open.
         Opening a chapter from the outline while renaming another one must
         not yank the caret out of that field, so a focused control inside
         the outline keeps it. */
      if (FINE_POINTER) setTimeout(() => {
        const ae = document.activeElement;
        if (ae && ae.closest && ae.closest(".ed-outline")) return;
        if (ref.current) ref.current.focus();
      }, 60);
      reserveRef.current = [];
      schedulePaginate(true);
    }
  }, [docId]);

  useEffect(() => {
    if (mode === "edit" && ref.current) {
      ref.current.innerHTML = withFallbackHTML(saved.current);
      schedulePaginate(true);
      if (FINE_POINTER) setTimeout(() => ref.current && ref.current.focus(), 40);
    }
  }, [mode]);

  function switchMode(m) {
    if (m === mode) return;
    if (mode === "edit" && ref.current) {
      saved.current = serializeArea(ref.current);
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

  /* Focus mode and the preview switch are about the *screen*, not about the
     text, so they cannot depend on the caret sitting in the editable — in
     preview there is no editable to sit in, and after any toolbar press the
     focus is elsewhere. They listen on the window; typing in a field
     (rename, search, a page-setup number) is left alone. */
  useEffect(() => {
    const onKey = (e) => {
      if (!(e.metaKey || e.ctrlKey)) return;
      const t = e.target;
      if (t && t.tagName && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return;
      const code = e.code || "";
      const k = /^Key[A-Z]$/.test(code) ? code.slice(3).toLowerCase() : (e.key || "").toLowerCase();
      if (e.altKey && k === "p") { e.preventDefault(); switchMode(mode === "edit" ? "preview" : "edit"); }
      else if (e.shiftKey && !e.altKey && k === "f") { e.preventDefault(); setFocusMode((f) => !f); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mode, docId]);

  const refreshRaf = useRef(0);
  useEffect(() => () => cancelAnimationFrame(refreshRaf.current), [docId]);

  function computeActive() {
    try {
      const sel0 = window.getSelection();
      let inMark = false;
      if (sel0 && sel0.anchorNode) {
        const a = sel0.anchorNode.nodeType === 3 ? sel0.anchorNode.parentElement : sel0.anchorNode;
        inMark = !!(a && a.closest && ref.current && ref.current.contains(a) && a.closest("mark"));
      }
      const st = { highlight: inMark,
        bold: document.queryCommandState("bold"), italic: document.queryCommandState("italic"),
        underline: document.queryCommandState("underline"), strike: document.queryCommandState("strikeThrough"),
        ul: document.queryCommandState("insertUnorderedList"), ol: document.queryCommandState("insertOrderedList") };
      const sel = window.getSelection();
      let block = "";
      if (sel && sel.anchorNode) {
        let n = sel.anchorNode.nodeType === 3 ? sel.anchorNode.parentElement : sel.anchorNode;
        while (n && n !== ref.current) { const tg = n.tagName && n.tagName.toLowerCase();
          if (["h1","h2","h3","h4","h5","h6","blockquote","p"].includes(tg)) { block = tg; break; } n = n.parentElement; }
      }
      st.block = block;
      setActive(st);
      const top = topBlock(ref.current);
      setBlockStyle(blockStyleOf(top) || "p");
      setAlignState(top ? (ALIGN_CLASSES.find((c) => top.classList.contains(c)) || "") : "");
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

  /* onMouseUp/onKeyUp/onFocus only cover a subset of the ways a selection
     can change — dragging the native selection handles on touch (the usual
     way to select text on mobile/tablet) fires neither, so extending or
     shrinking a selection there never told the toolbar its format state was
     stale. A "pressed" bold/italic button could then survive a click that
     did toggle the actual formatting, since the click's own refreshActive()
     recomputes from whatever (possibly stale) selection the browser reports
     at that instant. selectionchange is the one event every selection
     change reaches, on every input method, so it closes that gap. */
  useEffect(() => {
    const onSelChange = () => {
      const sel = window.getSelection();
      if (ref.current && sel && sel.anchorNode && ref.current.contains(sel.anchorNode)) {
        /* Clicking a toolbar button moves focus out of the editable for an
           instant; every path that acts on "the block the caret is in"
           needs a range to fall back on, or the button silently does
           nothing — which is why alignment appeared to work only every
           other press. */
        if (sel.rangeCount) lastRange.current = sel.getRangeAt(0).cloneRange();
        refreshActive();
      }
    };
    document.addEventListener("selectionchange", onSelChange);
    return () => document.removeEventListener("selectionchange", onSelChange);
  }, [docId]);

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
  /* Backspacing out the last character of the last block can take the
     block itself with it — contentEditable is happy to leave the root with
     zero element children rather than an empty <p>. From there the very
     next character typed lands as a bare text node directly under the
     editable, the same orphan this app guards against on load (see
     EMPTY_DOC_HTML above): invisible to pagination's block walk and to
     per-page footnote placement. Runs on every edit, not just load, since
     this state is reached live rather than only when opening a document. */
  function ensureNotBare() {
    const area = ref.current;
    if (!area || area.children.length) return;
    const p = document.createElement("p");
    p.innerHTML = "<br>";
    area.appendChild(p);
    caretTo(p, true);
  }
  /* Pressing Enter at the end of a task item copies its "task" class onto
     the new sibling <li> — native list-continuation behavior — but not the
     checkbox itself (that's ordinary content, not something the browser
     knows to duplicate). Left alone, the new line renders with the task
     item's own CSS (no bullet, hanging indent) but no checkbox at all: an
     orphaned, unclickable-looking line. Checking only the block the caret
     is actually in keeps this cheap regardless of document length — a
     stray class can only ever appear here, immediately after Enter creates
     it, never on some other <li> the caret isn't in. */
  function ensureTaskCheckbox() {
    const area = ref.current;
    if (!area) return;
    /* topBlock only returns area's *direct* children (p, ul, blockquote…);
       an <li> lives one level deeper, inside the list, so it has to be
       found by walking up from the caret instead. */
    const sel = window.getSelection();
    if (!sel || !sel.anchorNode) return;
    const start = sel.anchorNode.nodeType === 3 ? sel.anchorNode.parentElement : sel.anchorNode;
    const li = start && start.closest ? start.closest("li") : null;
    if (li && area.contains(li) && li.classList.contains("task") &&
        !li.querySelector(":scope > input[type=\"checkbox\"]")) {
      const box = document.createElement("input");
      box.type = "checkbox"; box.disabled = true;
      li.insertBefore(box, li.firstChild);
      /* The native Enter-in-list caret lands at the very start of the new
         (till now empty) <li>, which is now *before* the checkbox we just
         inserted — left alone, the next character typed would land ahead
         of it instead of continuing the line after it. */
      caretAfterMark(box);
    }
  }
  function commitChange() {
    ensureNotBare();
    ensureTaskCheckbox();
    doSave(null);
    schedulePaginate(false);
    depth.current.u++; depth.current.r = 0;
    setHist((h) => (h.undo && !h.redo) ? h : { undo: true, redo: false });
    clearTimeout(wordTimer.current);
    wordTimer.current = setTimeout(() => {
      const el = nodeRef.current;
      if (el) setWords(countVisibleWords(el));
    }, 200);
  }

  /* Shared undo-safe DOM helpers: raw insertBefore/replaceChild/remove()
     never reach Chrome's contentEditable undo stack (only execCommand and
     real typing do), so every structural edit below routes through
     execCommand instead. A throwaway marker attribute is how we find the
     node execCommand just created, since it hands back no reference. */
  function execInsertHTML(range, html) {
    const area = ref.current;
    if (!area) return null;
    const marker = "ins-" + Math.random().toString(36).slice(2, 9);
    const sel = window.getSelection();
    sel.removeAllRanges(); sel.addRange(range);
    document.execCommand("insertHTML", false, html.replace(/^<(\w+)/, '<$1 data-ins-marker="' + marker + '"'));
    const real = area.querySelector('[data-ins-marker="' + marker + '"]');
    if (real) real.removeAttribute("data-ins-marker");
    return real;
  }
  function replaceNode(node, html) {
    const range = document.createRange();
    range.selectNode(node);
    return execInsertHTML(range, html);
  }
  function insertAfterNode(node, html) {
    const range = document.createRange();
    range.setStartAfter(node); range.collapse(true);
    return execInsertHTML(range, html);
  }
  function appendInside(parent, html) {
    const range = document.createRange();
    range.selectNodeContents(parent); range.collapse(false);
    return execInsertHTML(range, html);
  }
  function removeNode(node) {
    const sel = window.getSelection();
    const range = document.createRange();
    range.selectNode(node);
    sel.removeAllRanges(); sel.addRange(range);
    document.execCommand("delete", false, null);
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
      /* Same trap as the footnote marker (see caretAfterMark): a caret in a
         *zero-length* tail node still reads as inside the <strong>/<em>/<s>
         to the browser's typing style, so the reset below could toggle the
         wrong way and leave the format stuck on for whatever is typed next.
         caretAfterMark guarantees real, non-empty content to land in. */
      caretAfterMark(el);
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
      /* "- [ ] " / "- [x] " — a task item. The plain-bullet check just
         below fires on the very first space, the moment "- " alone is
         typed, converting the line to a <li> *before* "[ ] " even exists
         to look at — so a checkbox can only be recognized as a second
         stage, once the "-" has already become a fresh, otherwise-empty
         <li> and "[ ] " is typed as its first content. Paste/import
         already understood "- [ ] " directly via mdToHTML (there the whole
         line is available at once); only the live-typing path needed this
         two-step version of the same trigger. */
      if (parentBlock && parentBlock.tagName === "LI" && parentBlock.firstChild === node) {
        const taskM = before.match(/^\[([ xX])\] $/);
        if (taskM) {
          const range = document.createRange();
          range.setStart(node, 0); range.setEnd(node, offset);
          sel.removeAllRanges(); sel.addRange(range);
          ref.current.focus();
          document.execCommand("delete", false, null);
          parentBlock.classList.add("task");
          const box = document.createElement("input");
          box.type = "checkbox"; box.disabled = true;
          if (/x/i.test(taskM[1])) { box.checked = true; box.setAttribute("checked", ""); }
          parentBlock.insertBefore(box, parentBlock.firstChild);
          caretAfterMark(box);
          refreshActive();
          return true;
        }
      }
      if (atLineStart) {
        const m = before.match(/^(#{1,6}|>|-|\*|\d+\.) $/);
        if (m) {
          const range = document.createRange();
          range.setStart(node, 0); range.setEnd(node, offset);
          sel.removeAllRanges(); sel.addRange(range);
          ref.current.focus();
          document.execCommand("delete", false, null);
          const marker = m[1];
          if (/^#{1,6}$/.test(marker)) document.execCommand("formatBlock", false, "h" + marker.length);
          else if (marker === ">") document.execCommand("formatBlock", false, "blockquote");
          else if (marker === "-" || marker === "*") document.execCommand("insertUnorderedList", false, null);
          else document.execCommand("insertOrderedList", false, null);
          unwrapNestedBlocks(ref.current);
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
      /* ``` on its own line opens a real code block, the way it does in
         every markdown editor — typing a fence used to leave three
         backticks sitting in the prose and the code after it set in the
         book face. */
      const parentBlock = node.parentElement;
      if (parentBlock && parentBlock.firstChild === node && /^`{3}$/.test(before.trim())) {
        const block = topBlock(ref.current);
        if (block && !/^(PRE|CODE)$/.test(block.tagName)) {
          const pre = document.createElement("pre");
          const code = document.createElement("code");
          code.innerHTML = "<br>";
          pre.appendChild(code);
          const real = replaceNode(block, pre.outerHTML);
          const realCode = real && real.querySelector("code");
          if (realCode) caretTo(realCode, false);
          commitChange();
          schedulePaginate(true);
          return true;
        }
      }
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

  /* Any paste is read as markdown — headings, lists, quotes, and inline
     bold, italic or code markers too, mid-sentence and not just at a
     line's start. mdToHTML always wraps its output in a block; when the whole
     paste turns out to be exactly one <p>, that wrapper is unwrapped and
     only its inner (inline-formatted) HTML is inserted, so a short paste
     mid-paragraph lands inline instead of breaking it into a new block. */
  /* Shared by the standard clipboard 'paste' path and the Android
     fallback below: text in, markdown-transformed HTML into the caret. */
  function insertMarkdownText(text) {
    if (!text) return;
    const box = document.createElement("div");
    box.innerHTML = window.SipruFormats.mdToHTML(text);
    const html = box.children.length === 1 && box.firstElementChild.tagName === "P"
      ? box.firstElementChild.innerHTML
      : box.innerHTML;
    document.execCommand("insertHTML", false, html);
    unwrapNestedBlocks(ref.current);
    commitChange();
    schedulePaginate(true);
  }
  function onPaste(e) {
    const cd = e.clipboardData;
    if (!cd) return;
    const text = cd.getData("text/plain");
    if (!text) return;
    e.preventDefault();
    insertMarkdownText(text);
  }
  /* Some Android keyboards (Gboard's clipboard tray in particular) insert
     a pasted note without ever firing a ClipboardEvent — only a
     `beforeinput` with inputType "insertFromPaste" reaches the page. Left
     unhandled, onPaste above never runs and the browser falls back to its
     own default insertion, dropping the pasted text in completely raw:
     "## Heading" stays two literal hash marks instead of becoming a
     heading. Catching it here, the same way `paste` is caught, closes
     that gap without touching the normal desktop path (there the
     ClipboardEvent already fires and preventDefault()s this one before it
     can act). */

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
      const html = serializeArea(el);
      saved.current = html;
      setWords(store.countWords(html));
      doSave(html);
    }
    setHist({ undo: d.u > 0, redo: d.r > 0 });
    refreshActive();
    schedulePaginate(true);
  }

  /* Epigraph and note are one-shot blocks: a figure holding a quote and its
     author line, and a single-paragraph aside. contentEditable's own Enter
     just splits whatever element the caret is in, which inside these means
     an endless chain of <figcaption>s or a second <aside> — with no way back
     out to ordinary prose. Everything typed after inserting an epigraph
     silently became part of the epigraph. Word and Docs both treat Enter at
     the end of a caption-like block as "leave it", so: inside an epigraph's
     quote, Enter moves to the author line; at the end of the author line (or
     anywhere in a note), it closes the block and opens a plain paragraph
     after it. Shift+Enter still gives a line break inside the block. */
  function exitSpecialBlock() {
    const area = ref.current;
    if (!area) return false;
    const sel = window.getSelection();
    if (!sel || !sel.isCollapsed || !sel.anchorNode) return false;
    const block = topBlock(area);
    if (!block) return false;
    const cls = block.classList;
    const isEpi = block.tagName === "FIGURE" && cls && cls.contains("epigraph");
    const isNote = block.tagName === "ASIDE" && cls && cls.contains("note");
    /* A blockquote is a repeating block — Enter opening another quote line
       is right — but on an *empty* one it has to let go, the way Enter on
       an empty list item ends the list (which Chrome already does for us).
       Without this the only way out of a quote is the toolbar: every Enter
       just adds one more empty <blockquote> and typing resumes inside it. */
    const isEmptyQuote = block.tagName === "BLOCKQUOTE" && !(block.textContent || "").trim();
    if (isEmptyQuote) {
      const real = replaceNode(block, "<p><br></p>");
      if (real) caretTo(real, false);
      commitChange();
      schedulePaginate(true);
      return true;
    }
    if (!isEpi && !isNote) return false;

    let node = sel.anchorNode.nodeType === 3 ? sel.anchorNode.parentElement : sel.anchorNode;
    if (isEpi) {
      const quote = block.querySelector("blockquote");
      let cap = block.querySelector("figcaption");
      if (quote && (node === quote || quote.contains(node))) {
        if (!cap) cap = appendInside(block, "<figcaption></figcaption>");
        if (cap) caretTo(cap, true);
        commitChange();
        return true;
      }
    }
    const real = insertAfterNode(block, "<p><br></p>");
    if (real) caretTo(real, false);
    commitChange();
    schedulePaginate(true);
    return true;
  }

  /* ---- deleting *into* a block, not just inside it ----------------

     contentEditable will happily leave an emptied blockquote, code block,
     epigraph or heading standing there with nothing in it, and then refuse
     to remove it: Backspace has no text left to eat, so every press is a
     no-op and the block looks frozen on the page. The same goes for a page
     break or a scene marker sitting above the caret — nothing native ever
     deletes those, so the extra page they create could not be taken back.

     Word and Docs both answer this the same way: the first Backspace in an
     empty special block turns it back into an ordinary paragraph, and a
     Backspace at the very start of a line eats whatever rule sits above
     it. ------------------------------------------------------------- */
  function isBlockEmpty(el) {
    if (!el) return false;
    if (el.querySelector && el.querySelector("img, table, input, sup.fn, hr")) return false;
    return !(el.textContent || "").replace(/ /g, " ").trim();
  }
  function caretEdge(block, atEnd) {
    const sel = window.getSelection();
    if (!sel || !sel.isCollapsed || !sel.rangeCount) return false;
    const caret = sel.getRangeAt(0);
    try {
      const r = document.createRange();
      r.selectNodeContents(block);
      if (atEnd) r.setStart(caret.endContainer, caret.endOffset);
      else r.setEnd(caret.startContainer, caret.startOffset);
      return !r.toString().replace(/ /g, " ").trim();
    } catch (err) { return false; }
  }
  function siblingBlock(el, dir) {
    let n = dir < 0 ? el.previousElementSibling : el.nextElementSibling;
    while (n && n.classList && (n.classList.contains("pg-spacer") || n.classList.contains("fn-defs"))) {
      n = dir < 0 ? n.previousElementSibling : n.nextElementSibling;
    }
    return n;
  }
  function toParagraph(block) {
    const real = replaceNode(block, "<p><br></p>");
    if (real) caretTo(real, false);
    commitChange();
    schedulePaginate(true);
  }
  const SPECIAL_EMPTY = { BLOCKQUOTE: 1, PRE: 1, ASIDE: 1, FIGURE: 1, H1: 1, H2: 1, H3: 1, H4: 1, H5: 1, H6: 1 };
  function handleDeleteKey(e) {
    const area = ref.current;
    if (!area) return false;
    const sel = window.getSelection();
    if (!sel || !sel.isCollapsed) return false;
    const block = topBlock(area);
    if (!block) return false;
    const back = e.key === "Backspace";
    const empty = isBlockEmpty(block);

    if (back && empty && SPECIAL_EMPTY[block.tagName]) { toParagraph(block); return true; }
    /* An emptied paragraph deleted natively takes a character of the line
       above with it in Chrome (the <br> placeholder confuses the merge).
       Removing it here is both exact and predictable. */
    if (back && empty && block.tagName === "P") {
      const prev = siblingBlock(block, -1);
      if (prev && prev.tagName !== "HR") {
        removeNode(block);
        caretTo(prev.tagName === "TABLE" ? (prev.querySelector("td, th") || prev) : prev, true);
        commitChange();
        schedulePaginate(true);
        return true;
      }
    }
    /* an emptied list item that is the list's only one takes the list with it */
    if (back && empty && (block.tagName === "UL" || block.tagName === "OL") &&
        block.querySelectorAll("li").length <= 1) { toParagraph(block); return true; }

    const near = siblingBlock(block, back ? -1 : 1);
    const atEdge = caretEdge(block, !back);
    if (!atEdge) return false;
    if (near && near.tagName === "HR") {
      /* a page break or a scene marker: the one thing that made an extra
         page impossible to take back */
      removeNode(near);
      commitChange();
      schedulePaginate(true);
      return true;
    }
    if (near && back && empty && SPECIAL_EMPTY[near.tagName] === undefined &&
        (near.tagName === "TABLE" || near.tagName === "PRE" || near.tagName === "FIGURE")) {
      removeNode(block);
      caretTo(near.tagName === "TABLE" ? (near.querySelector("td, th") || near) : near, true);
      commitChange();
      schedulePaginate(true);
      return true;
    }
    /* Nothing above and nothing to delete: swallow the key rather than let
       the browser hunt for a target outside the document. */
    if (back && !near && empty && area.children.length <= 1) return true;
    return false;
  }

  /* Shortcuts read the *physical* key (e.code), not the character it
     produces: on a Cyrillic (or any non-Latin) layout e.key for the B key
     is "и", so every ⌘B/Ctrl+B in the app silently stopped working the
     moment the writer switched layouts — which is most of the time here. */
  function hotKey(e) {
    const code = e.code || "";
    if (/^Key[A-Z]$/.test(code)) return code.slice(3).toLowerCase();
    if (/^Digit[0-9]$/.test(code)) return code.slice(5);
    if (/^Numpad[0-9]$/.test(code)) return code.slice(6);
    return (e.key || "").toLowerCase();
  }
  function onKeyDown(e) {
    if (e.key === "Backspace" || e.key === "Delete") {
      if (handleDeleteKey(e)) { e.preventDefault(); return; }
    }
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); insertPageBreak(); return; }
    if (e.key === "Enter" && !e.shiftKey && !e.metaKey && !e.ctrlKey && exitSpecialBlock()) { e.preventDefault(); return; }
    if (e.key === "Tab" && !e.metaKey && !e.ctrlKey) {
      /* Tab inside a list is indent/outdent, the way every editor does it;
         anywhere else it must not walk the focus out of the document. */
      const cur = topBlock(ref.current);
      if (cur && (cur.tagName === "UL" || cur.tagName === "OL")) {
        e.preventDefault();
        exec(e.shiftKey ? "outdent" : "indent");
        return;
      }
      if (!e.shiftKey) { e.preventDefault(); document.execCommand("insertText", false, "\t"); commitChange(); return; }
    }
    if (!(e.metaKey || e.ctrlKey)) return;
    const k = hotKey(e);
    const alt = e.altKey;

    /* ⌘/Ctrl+Alt+1…6 — headings; 0 — back to body text */
    if (alt && /^[0-6]$/.test(k)) {
      e.preventDefault();
      setStyle(k === "0" ? "p" : "h" + k);
      return;
    }
    if (alt && k === "f") { e.preventDefault(); insertFootnote(); return; }
    if (e.shiftKey) {
      switch (k) {
        case "l": e.preventDefault(); setAlign("al-l"); return;
        case "e": e.preventDefault(); setAlign("al-c"); return;
        case "r": e.preventDefault(); setAlign("al-r"); return;
        case "j": e.preventDefault(); setAlign("al-j"); return;
        case "7": e.preventDefault(); runTool("ol"); return;
        case "8": e.preventDefault(); runTool("ul"); return;
        case "9": e.preventDefault(); runTool("quote"); return;
        case "h": e.preventDefault(); toggleHighlight(); return;
        case "x": e.preventDefault(); exec("strikeThrough"); return;
        case "z": e.preventDefault(); runHistory("redo"); return;
        default: break;
      }
    }
    if (k === "z") { e.preventDefault(); runHistory("undo"); }
    else if (k === "y") { e.preventDefault(); runHistory("redo"); }
    else if (k === "b") { e.preventDefault(); exec("bold"); }
    else if (k === "i") { e.preventDefault(); exec("italic"); }
    else if (k === "u") { e.preventDefault(); exec("underline"); }
    else if (k === "k") { e.preventDefault(); e.stopPropagation(); openLinkPopup(); }
    else if (k === "\\" || e.key === "\\") { e.preventDefault(); exec("removeFormat"); }
  }

  /* Commands that build a block (a list, a heading, a quote) go through
     Chrome's own execCommand, which will happily build it *inside* the
     paragraph it was meant to replace — <p><ul><li>…</li></ul></p>. That is
     invalid, and everything downstream (pagination, the style dropdown,
     block conversion) then treats the pile as one block. Repairing it right
     after the command keeps the damage from ever being saved. */
  const BLOCK_CMD = { insertUnorderedList: 1, insertOrderedList: 1, formatBlock: 1, indent: 1, outdent: 1 };
  function exec(cmd, val) {
    ref.current.focus();
    document.execCommand(cmd, false, val);
    if (BLOCK_CMD[cmd]) unwrapNestedBlocks(ref.current);
    onInput(); refreshActive();
  }
  function block(tag) {
    const cur = active.block;
    exec("formatBlock", cur === tag ? "p" : tag);
  }
  function persistNow() {
    if (!ref.current) return null;
    const html = serializeArea(ref.current);
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
    saved.current = withFallbackHTML(snap.content);
    if (ref.current) ref.current.innerHTML = saved.current;
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

  /* ------------------------------------------------------------------
     The page

     Settings live per project (a book is laid out as one object) and per
     note; the geometry below is derived from them and from how much room
     the column actually has, so a phone shows the same page — to scale —
     as the desktop does.
     ------------------------------------------------------------------ */
  const page = store.getPage(docId);
  const pgKey = JSON.stringify(page);
  const geom = useMemo(() => pageGeometry(page, avail), [pgKey, avail]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const measure = () => {
      if (!el.clientWidth) return;
      const pad = window.innerWidth < 700 ? 20 : 96;
      setAvail(Math.max(160, el.clientWidth - pad));
    };
    measure();
    let ro = null;
    if (window.ResizeObserver) { ro = new ResizeObserver(measure); ro.observe(el); }
    else window.addEventListener("resize", measure);
    return () => { if (ro) ro.disconnect(); else window.removeEventListener("resize", measure); };
  }, [mode]);

  /* One pass = clear the pushes, read every block, apply the new pushes.
     Everything that can change the flow funnels through here. */
  function repaginate() {
    const area = nodeRef.current;
    if (!area || mode !== "edit") return;
    const notes = footnoteList(area);
    const byId = {};
    notes.forEach((f) => { byId[f.id] = f; });
    const res = paginateArea(area, geom, reserveRef.current);
    setPages(res.notes.map((ids) => ids.map((id) => byId[id]).filter(Boolean)));
  }
  /* Debounced so ordinary typing doesn't reflow on every keystroke — but a
     plain debounce can be starved forever by input that keeps arriving
     faster than the wait (holding Enter down, a fast paste-like burst):
     every keystroke pushes the deadline back, so the page boxes (drawn from
     the *last* successful pass) stay put while the text quietly keeps
     growing past them, straight through the footer and footnotes, until
     the user finally pauses. A capped max wait guarantees a pass runs at
     least this often even under continuous input, so the break can never
     fall more than one beat behind — the same guarantee Word/Docs give by
     reflowing on essentially every keystroke. */
  const PAGINATE_MAX_WAIT = 250;
  function schedulePaginate(now) {
    clearTimeout(pgTimer.current);
    passRef.current = 0;
    if (now) { pgLast.current = Date.now(); repaginate(); return; }
    if (Date.now() - pgLast.current >= PAGINATE_MAX_WAIT) { pgLast.current = Date.now(); repaginate(); return; }
    pgTimer.current = setTimeout(() => { pgLast.current = Date.now(); repaginate(); }, 90);
  }
  useEffect(() => () => { clearTimeout(pgTimer.current); cancelAnimationFrame(scrollRaf.current); }, []);
  useEffect(() => { schedulePaginate(true); }, [geom, mode, docId]);

  /* Footnotes take room away from the text on the page they belong to, and
     how much is only knowable once they are rendered — so the measurement
     feeds back into the next pass, converging in one or two rounds. */
  function onFootnoteHeights(hs) {
    const prev = reserveRef.current;
    let changed = false;
    for (let i = 0; i < hs.length; i++) {
      const v = hs[i] ? hs[i] + Math.round(12 * geom.scale) : 0;
      if (Math.abs((prev[i] || 0) - v) > 2) { prev[i] = v; changed = true; }
    }
    if (prev.length > hs.length) { prev.length = hs.length; changed = true; }
    if (changed && passRef.current < 3) { passRef.current++; repaginate(); }
    else passRef.current = 0;
  }

  const pageCount = pages.length;
  const paperH = pageCount * (geom.pageH + geom.gap) - geom.gap;

  /* ---- scenes: the outline follows the caret and the scroll ---- */
  function onScroll() {
    if (scrollRaf.current) return;
    scrollRaf.current = requestAnimationFrame(() => {
      scrollRaf.current = 0;
      const area = nodeRef.current, sc = scrollRef.current;
      if (!area || !sc) return;
      const cyc = geom.pageH + geom.gap;
      const at = Math.max(1, Math.min(pages.length, Math.floor((sc.scrollTop + cyc * 0.35) / cyc) + 1));
      setCurPage((p) => (p === at ? p : at));
      const seps = sceneEls(area);
      if (!seps.length) { setCurScene((c) => (c ? "" : c)); return; }
      const line = sc.getBoundingClientRect().top + 140;
      let cur = "";
      for (let i = 0; i < seps.length; i++) {
        if (seps[i].getBoundingClientRect().top <= line) cur = seps[i].getAttribute("data-id") || "";
        else break;
      }
      setCurScene((c) => (c === cur ? c : cur));
    });
  }
  function jumpToScene(cid, sid) {
    if (cid !== docId) { pendingScene.current = sid; nav.doc(cid); return; }
    const area = nodeRef.current, sc = scrollRef.current;
    const el = area && area.querySelector('hr.scene-sep[data-id="' + String(sid).replace(/["\\]/g, "") + '"]');
    if (!el || !sc) return;
    sc.scrollTo({ top: sc.scrollTop + el.getBoundingClientRect().top - sc.getBoundingClientRect().top - 90,
      behavior: "smooth" });
    setCurScene(sid);
    if (!FINE_POINTER) setOutlineOpen(false);
  }
  useEffect(() => {
    if (!pendingScene.current) return;
    const sid = pendingScene.current;
    pendingScene.current = null;
    const t = setTimeout(() => jumpToScene(docId, sid), 160);
    return () => clearTimeout(t);
  }, [docId]);

  /* An outline edit rewrites the chapter's HTML underneath us — reload the
     live editor so the two can never drift apart. */
  function onOutlineContent(cid, html) {
    if (cid !== docId || !ref.current) return;
    saved.current = withFallbackHTML(html);
    ref.current.innerHTML = saved.current;
    setWords(store.countWords(html));
    depth.current = { u: 0, r: 0 };
    setHist({ undo: false, redo: false });
    schedulePaginate(true);
  }

  /* ---- inserts: page break, scene, footnote ---- */
  /* insertBefore/appendChild never reach the browser's own undo stack —
     Chrome only records execCommand and real typing, so a node inserted
     this way (a page break, a scene, a table…) could never be undone.
     Routing the insert through execCommand("insertHTML") keeps the exact
     same placement but makes it a real, undoable step. A throwaway marker
     attribute is how we find the just-inserted node afterward, since
     execCommand hands back no reference of its own. */
  function insertBlock(node) {
    const area = ref.current;
    if (!area) return null;
    area.focus();
    const cur = topBlock(area);
    const marker = "ins-" + Math.random().toString(36).slice(2, 9);
    node.setAttribute("data-ins-marker", marker);
    const range = document.createRange();
    if (cur) { range.setStartAfter(cur); range.collapse(true); }
    else { range.selectNodeContents(area); range.collapse(false); }
    const sel = window.getSelection();
    sel.removeAllRanges(); sel.addRange(range);
    document.execCommand("insertHTML", false, node.outerHTML + "<p><br></p>");
    const real = area.querySelector('[data-ins-marker="' + marker + '"]');
    if (real) {
      real.removeAttribute("data-ins-marker");
      const p = real.nextElementSibling;
      if (p && p.tagName === "P") caretTo(p, false);
    }
    commitChange();
    schedulePaginate(true);
    return real;
  }
  function insertPageBreak() {
    const hr = document.createElement("hr");
    hr.className = "page-break";
    insertBlock(hr);
  }
  function insertScene() {
    insertBlock(makeSceneEl(tl("ol_new_scene"), "draft"));
  }

  /* execCommand has no highlight of its own, so <mark> is applied and
     removed by hand. Unwrapping the whole mark on any overlap (rather than
     splitting it) keeps the toggle predictable: pressing it again on text
     you just highlighted always clears it. Both branches go through
     execCommand("insertHTML") rather than raw insertBefore/surroundContents
     — direct DOM writes never reach Chrome's undo stack, so toggling a
     highlight used to be permanent. */
  function toggleHighlight() {
    const area = ref.current;
    if (!area) return;
    area.focus();
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return;
    const range = sel.getRangeAt(0);
    const anchor = sel.anchorNode && (sel.anchorNode.nodeType === 3 ? sel.anchorNode.parentElement : sel.anchorNode);
    const existing = anchor && anchor.closest ? anchor.closest("mark") : null;
    if (existing && area.contains(existing)) {
      const inner = existing.innerHTML;
      const r2 = document.createRange();
      r2.selectNode(existing);
      sel.removeAllRanges(); sel.addRange(r2);
      document.execCommand("insertHTML", false, inner);
      area.normalize();
    } else {
      if (range.collapsed) return;
      const tmp = document.createElement("div");
      tmp.appendChild(range.cloneContents());
      const marker = "mark-" + Math.random().toString(36).slice(2, 9);
      document.execCommand("insertHTML", false,
        '<mark data-ins-marker="' + marker + '">' + tmp.innerHTML + "</mark>");
      const real = area.querySelector('[data-ins-marker="' + marker + '"]');
      if (real) {
        real.removeAttribute("data-ins-marker");
        const after = document.createRange();
        after.selectNodeContents(real);
        sel.removeAllRanges(); sel.addRange(after);
      }
    }
    commitChange();
    schedulePaginate(true);
    refreshActive();
  }

  function insertTable() {
    const tbl = document.createElement("table");
    const head = document.createElement("thead");
    const hr2 = document.createElement("tr");
    for (let c = 0; c < 3; c++) { const th = document.createElement("th"); th.innerHTML = "<br>"; hr2.appendChild(th); }
    head.appendChild(hr2);
    const body = document.createElement("tbody");
    for (let r = 0; r < 2; r++) {
      const tr = document.createElement("tr");
      for (let c = 0; c < 3; c++) { const td = document.createElement("td"); td.innerHTML = "<br>"; tr.appendChild(td); }
      body.appendChild(tr);
    }
    tbl.appendChild(head); tbl.appendChild(body);
    /* insertBlock's execCommand parses a fresh copy of this markup into the
       document, so `tbl` itself stays detached — the real inserted node is
       whatever insertBlock hands back. */
    const real = insertBlock(tbl);
    const first = real && real.querySelector("th");
    if (first) caretTo(first, false);
  }

  function insertCodeBlock() {
    const pre = document.createElement("pre");
    const code = document.createElement("code");
    code.innerHTML = "<br>";
    pre.appendChild(code);
    const real = insertBlock(pre);
    const realCode = real && real.querySelector("code");
    if (realCode) caretTo(realCode, false);
  }

  function insertTaskList() {
    const ul = document.createElement("ul");
    const li = document.createElement("li");
    li.className = "task";
    const box = document.createElement("input");
    box.type = "checkbox"; box.disabled = true;
    li.appendChild(box);
    li.appendChild(document.createTextNode(" "));
    ul.appendChild(li);
    const real = insertBlock(ul);
    const realLi = real && real.querySelector("li");
    if (realLi) caretTo(realLi, true);
  }

  function insertImage() {
    const url = window.prompt(tl("img_prompt"), "https://");
    if (!url) return;
    const src = String(url).trim();
    if (!/^https?:\/\//i.test(src)) { if (onToast) onToast(tl("exp_err_popup")); return; }
    const alt = window.prompt(tl("img_alt"), "") || "";
    const img = document.createElement("img");
    img.src = src; img.alt = alt;
    insertBlock(img);
  }
  /* A caret merely *after* a <sup class="fn"> still counts as inside it as
     far as the browser's typing style is concerned \u2014 exactly the trap
     wrapRange() works around for bold/italic/strike above. Left alone, a
     later Enter at that spot splits the paragraph but carries the <sup>
     across the break, cloning the footnote marker (same data-fn id) into
     the new paragraph and pulling whatever is typed next inside it. Every
     path that leaves the caret next to a marker routes through here so
     there is always a real text node outside the <sup> to land in. */
  function caretAfterMark(mark) {
    if (!mark) return;
    let tail = mark.nextSibling;
    /* Range.insertNode can leave a zero-length text node right after the
       inserted element (splitting an existing text node at its own edge) \u2014
       that still passes the nodeType check, but a caret parked at offset 0
       of an empty node gives the browser nothing to anchor "outside the
       <sup>" on, so it resolves as inside it exactly like having no tail
       node at all. */
    if (!tail || tail.nodeType !== 3) {
      tail = document.createTextNode("\u00A0");
      mark.parentNode.insertBefore(tail, mark.nextSibling);
    } else if (!tail.length) {
      tail.nodeValue = "\u00A0";
    }
    const after = document.createRange();
    after.setStart(tail, Math.min(1, tail.length)); after.collapse(true);
    const sel = window.getSelection();
    sel.removeAllRanges(); sel.addRange(after);
  }
  function insertFootnote() {
    const area = ref.current;
    if (!area) return;
    area.focus();
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return;
    const id = "f_" + Math.random().toString(36).slice(2, 9);
    /* Range.insertNode() is a raw DOM write, invisible to Chrome's own undo
       stack — going through execCommand keeps the marker undoable like
       everything else typed around it. */
    sel.getRangeAt(0).collapse(false);
    document.execCommand("insertHTML", false,
      '<sup class="fn" data-fn="' + id + '">1</sup>');
    const sup = area.querySelector('sup.fn[data-fn="' + id + '"]');
    if (sup) caretAfterMark(sup);
    setFnText(area, id, "");
    commitChange();
    schedulePaginate(true);
    setTimeout(() => openFootnote(id), 0);
  }
  /* `at` is where the click actually happened — clicking a note in the
     page footer must open the editor next to *it*, not somewhere else on
     the page beside the marker in the text. */
  function openFootnote(id, at) {
    const area = ref.current;
    if (!area) return;
    const mark = area.querySelector('sup.fn[data-fn="' + String(id).replace(/["\\]/g, "") + '"]');
    let anchor = at;
    if (!anchor) {
      const rect = mark ? mark.getBoundingClientRect()
        : { left: window.innerWidth / 2, width: 0, bottom: Math.min(220, window.innerHeight / 2) };
      anchor = { x: rect.left + rect.width / 2, y: rect.bottom };
    }
    setFnEdit({ id, n: mark ? mark.textContent : "", text: fnText(area, id), anchor });
  }
  function applyFootnote(id, text) {
    const area = ref.current;
    if (!area) return;
    setFnText(area, id, text);
    const mark = area.querySelector('sup.fn[data-fn="' + String(id).replace(/["\\]/g, "") + '"]');
    caretAfterMark(mark);
    area.focus();
    commitChange();
    schedulePaginate(true);
  }
  function deleteFootnote(id) {
    const area = ref.current;
    if (!area) return;
    const mark = area.querySelector('sup.fn[data-fn="' + String(id).replace(/["\\]/g, "") + '"]');
    if (mark) {
      /* Removing the mark and simply refocusing leaves the browser to pick
         its own caret position — which is the editable's very start, not
         where the footnote used to sit, so whatever the user types next
         lands at the wrong end of the document entirely. Land the caret
         exactly where the marker was instead. */
      const parent = mark.parentNode, next = mark.nextSibling;
      mark.remove();
      const r = document.createRange();
      if (next) r.setStartBefore(next);
      else r.setStart(parent, parent.childNodes.length);
      r.collapse(true);
      window.getSelection().removeAllRanges();
      window.getSelection().addRange(r);
    }
    setFnEdit(null);
    area.focus();
    commitChange();
    schedulePaginate(true);
  }
  function onAreaClick(e) {
    const mark = e.target && e.target.closest ? e.target.closest("sup.fn") : null;
    if (mark) {
      e.preventDefault();
      const mr = mark.getBoundingClientRect();
      openFootnote(mark.getAttribute("data-fn"), { x: mr.left + mr.width / 2, y: mr.bottom });
      return;
    }
    /* A checkbox left enabled inside contentEditable is itself editable —
       the caret can land in it, arrow keys can select it away, Backspace
       can delete it. `disabled` avoids all of that, but a disabled control
       swallows every pointer event before it reaches its own listeners
       (and never fires "click"), which is exactly why it never seemed to
       respond to clicking it at all. The click still lands on the <li>
       underneath, so a task item is toggled here by hit-testing the actual
       checkbox's box — clicking anywhere else in the line still just
       places the caret to edit the text, same as any other list item. */
    const item = e.target && e.target.closest ? e.target.closest("li.task") : null;
    const box = item && item.querySelector(":scope > input[type=\"checkbox\"]");
    if (box) {
      const r = box.getBoundingClientRect();
      const pad = 4;
      if (e.clientX >= r.left - pad && e.clientX <= r.right + pad &&
          e.clientY >= r.top - pad && e.clientY <= r.bottom + pad) {
        e.preventDefault();
        if (box.hasAttribute("checked")) box.removeAttribute("checked"); else box.setAttribute("checked", "");
        box.checked = box.hasAttribute("checked");
        commitChange();
        schedulePaginate(false);
      }
    }
  }

  /* ---- block-level style & alignment ---- */
  function setStyle(name) {
    const area = ref.current;
    if (!area) return;
    restoreCaret(area);
    area.focus();
    applyBlockStyle(area, name, tl);
    unwrapNestedBlocks(area);
    setStyleOpen(false);
    commitChange();
    refreshActive();
    schedulePaginate(true);
  }
  const ALIGN_CLASSES = ["al-l", "al-c", "al-r", "al-j"];
  /* Every top-level block the selection touches — pressing "centre" with
     three paragraphs selected has to centre all three, not just the one
     the anchor happens to sit in. */
  function selectedBlocks(area) {
    const out = [];
    const sel = window.getSelection();
    const range = sel && sel.rangeCount && area.contains(sel.anchorNode)
      ? sel.getRangeAt(0) : lastRange.current;
    if (range && area.contains(range.commonAncestorContainer)) {
      for (let i = 0; i < area.children.length; i++) {
        const el = area.children[i];
        if (el.classList && (el.classList.contains("pg-spacer") || el.classList.contains("fn-defs"))) continue;
        let hit = false;
        try { hit = range.intersectsNode(el); } catch (err) { hit = false; }
        if (hit) out.push(el);
      }
    }
    if (out.length) return out;
    const cur = topBlock(area);
    return cur ? [cur] : [];
  }
  /* Restores the caret the toolbar press stole, so a button never lands on
     "no block selected" and quietly does nothing. */
  function restoreCaret(area) {
    const sel = window.getSelection();
    if (sel && sel.anchorNode && area.contains(sel.anchorNode)) return true;
    if (!lastRange.current || !area.contains(lastRange.current.commonAncestorContainer)) return false;
    sel.removeAllRanges(); sel.addRange(lastRange.current);
    return true;
  }
  function setAlign(cls) {
    const area = ref.current;
    if (!area) return;
    restoreCaret(area);
    const blocks = selectedBlocks(area);
    if (!blocks.length) return;
    blocks.forEach((el) => {
      ALIGN_CLASSES.forEach((c) => el.classList.remove(c));
      if (cls) el.classList.add(cls);
      if (!el.getAttribute("class")) el.removeAttribute("class");
    });
    area.focus();
    restoreCaret(area);
    setAlignState(cls);
    commitChange();
    schedulePaginate(true);
  }

  /* ---- page settings ---- */
  const [zoomLive, setZoomLive] = useState(false);
  const zoomTimer = useRef(null);
  /* Only the zoom slider gets a smooth resize — pagination itself re-runs
     on every keystroke and (while footnotes converge) several times per
     render, and animating THAT geometry is what made the page look like
     it was crawling around rather than just being laid out. */
  function setPage(patch) {
    store.setPage(docId, patch);
    if (patch && Object.prototype.hasOwnProperty.call(patch, "zoom")) {
      setZoomLive(true);
      clearTimeout(zoomTimer.current);
      zoomTimer.current = setTimeout(() => setZoomLive(false), 260);
    }
  }
  const setPageRef = useRef(setPage);
  setPageRef.current = setPage;
  const zoomRef = useRef(page.zoom);
  zoomRef.current = page.zoom;

  /* ---- pinch-to-zoom on the page itself ----
     A slider works, but on a phone the natural gesture is two fingers on
     the sheet — the way every PDF reader and Google Docs' own mobile page
     view already does it. React attaches its synthetic touchstart/move
     listeners as passive (matching the browser default, for scroll
     perf), so calling preventDefault() inside a JSX onTouchMove is
     silently ignored and the browser's own page-wide pinch-zoom fires
     instead of ours. A real, non-passive listener is the only way to
     actually claim the gesture. */
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const dist = (t) => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
    let pinch = null;
    const onStart = (e) => {
      if (e.touches.length === 2) pinch = { d0: dist(e.touches), z0: zoomRef.current };
    };
    const onMove = (e) => {
      if (!pinch || e.touches.length !== 2) return;
      e.preventDefault();
      const factor = dist(e.touches) / pinch.d0;
      const z = Math.min(1.6, Math.max(0.5, pinch.z0 * factor));
      setPageRef.current({ zoom: Math.round(z * 100) / 100 });
    };
    const onEnd = (e) => { if (e.touches.length < 2) pinch = null; };
    el.addEventListener("touchstart", onStart, { passive: true });
    el.addEventListener("touchmove", onMove, { passive: false });
    el.addEventListener("touchend", onEnd, { passive: true });
    el.addEventListener("touchcancel", onEnd, { passive: true });
    return () => {
      el.removeEventListener("touchstart", onStart);
      el.removeEventListener("touchmove", onMove);
      el.removeEventListener("touchend", onEnd);
      el.removeEventListener("touchcancel", onEnd);
    };
  }, []);

  /* the two toolbar menus close on an outside press, like the header one */
  useEffect(() => {
    if (!insertOpen && !styleOpen) return;
    function onDown(e) {
      if (insertOpen && insertRef.current && !insertRef.current.contains(e.target)) setInsertOpen(false);
      if (styleOpen && styleRef.current && !styleRef.current.contains(e.target)) setStyleOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("touchstart", onDown); };
  }, [insertOpen, styleOpen]);

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
          case "outline": setOutlineOpen((o) => !o); break;
          case "pagesetup": setSetupTab("page"); setSetupOpen((o) => !o); break;
          case "pagebreak": insertPageBreak(); break;
          case "footnote": insertFootnote(); break;
          case "scene": insertScene(); break;
          case "epigraph": setStyle("epigraph"); break;
          case "notestyle": setStyle("note"); break;
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

  /* The compact contextual toolbar — inline marks only. Anything a writer
     reaches for once an hour lives behind "···" instead. */
  const marks = [["bold", "bold"], ["italic", "italic"], ["underline", "underline"],
    ["strike", "strike"], ["highlight", "highlight"]];
  const lists = [["quote", "quote"], ["ul", "ul"], ["ol", "ol"], ["link", "link"]];
  const aligns = [["al-l", "al_left"], ["al-c", "al_center"], ["al-r", "al_right"], ["al-j", "al_just"]];

  const headCtx = { title: project ? project.title : doc.title, chapter: doc.title, author: user.name || "" };
  const paperStyle = {
    width: geom.pageW, height: paperH,
    "--ed-font": editorFontVar,
    "--pg-font": geom.fontPx + "px",
    "--pg-lead": page.leading,
    "--pg-align": page.align === "justify" ? "justify" : page.align,
    "--pg-indent": page.indent + "em",
    "--pg-padl": page.padL + "em",
    "--pg-padr": page.padR + "em",
    "--pg-before": page.spaceBefore + "em",
    "--pg-after": page.spaceAfter + "em",
    "--pg-hyphens": page.hyphens ? "auto" : "manual",
    "--pg-scale": geom.scale,
  };

  function runTool(cmd) {
    if (cmd === "quote") block("blockquote");
    else if (cmd === "highlight") toggleHighlight();
    else if (cmd === "strike") exec("strikeThrough");
    else if (cmd === "ul") exec("insertUnorderedList");
    else if (cmd === "ol") exec("insertOrderedList");
    else if (cmd === "link") openLinkPopup();
    else exec(cmd);
    schedulePaginate(false);
  }

  return (
    <div className={"editor-root" + (focusMode ? " focus" : "") + (outlineOpen ? " with-outline" : "") + (setupOpen ? " with-setup" : "")}>
      <header className={"ed-head" + (renaming ? " ed-head--renaming" : "")}>
        <div className="ed-head-l">
          <button className="icon-btn" onClick={() => project ? nav.project(project.id) : nav.dashboard()} title={tl("ed_back")}><Icon name="back" size={18} /></button>
          <button className={"icon-btn" + (outlineOpen ? " icon-btn--on" : "")} title={tl("ol_title")}
            onClick={() => setOutlineOpen((o) => !o)}><Icon name="panel" size={18} /></button>
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
          <button className={"icon-btn" + (savedFlash ? " icon-btn--flash" : "")} onClick={saveNow} title={hint(tl("ed_save"), KEYS.save)}><Icon name="save" size={18} /></button>
          <div className={"ed-more" + (moreOpen ? " ed-more--open" : "")} ref={moreRef}>
            <button className="icon-btn ed-more-btn" onClick={() => setMoreOpen((o) => !o)} title={tl("ed_more")}>
              <Icon name="more" size={18} />
            </button>
            <div className="ed-more-menu">
              {window.SipruVault && window.SipruVault.canReveal() && (
                <button className="icon-btn" title={tl("vault_reveal")} onClick={async () => {
                  setMoreOpen(false);
                  const p = window.SipruVault.locate(project ? "chapter" : "note", docId, project && project.id);
                  if (!p) return onToast(tl("vault_not_saved_yet"));
                  if (!(await window.SipruVault.reveal(p))) onToast(tl("vault_reveal_fail"));
                }}><Icon name="folder" size={18} /> <span className="ed-more-label">{tl("vault_reveal")}</span></button>
              )}
              <button className="icon-btn" onClick={() => { setMoreOpen(false); setSnapOpen(true); }} title={tl("snap_btn")}>
                <Icon name="history" size={18} /> <span className="ed-more-label">{tl("snap_btn")}</span></button>
              {project
                ? <button className="icon-btn" onClick={() => { setMoreOpen(false); nav.export(project.id); }} title={tl("ed_export_book")}>
                    <Icon name="export" size={18} /> <span className="ed-more-label">{tl("ed_export_book")}</span></button>
                : <button className="icon-btn" onClick={() => { setMoreOpen(false); persistNow(); setNoteExport(true); }} title={tl("ed_export_note")}>
                    <Icon name="export" size={18} /> <span className="ed-more-label">{tl("ed_export_note")}</span></button>
              }
              <button className="icon-btn icon-btn--danger" onClick={() => { setMoreOpen(false); setConfirmDelete(true); }} title={tl("ed_delete_doc")}>
                <Icon name="trash" size={18} /> <span className="ed-more-label">{tl("ed_delete_doc")}</span></button>
            </div>
          </div>
          <ThemeToggle theme={user.theme} onChange={onTheme} lang={lang} />
        </div>
      </header>

      <div className={"ed-bar" + (mode !== "edit" ? " ed-bar--preview" : "")} ref={barRef}
        style={kbOffset > 0 ? { bottom: kbOffset } : undefined}>
        {mode === "edit" && (
          <>
            <div className="ed-bar-grp">
              <button className="tool" title={hint(tl("ed_undo"), KEYS.undo)} disabled={!hist.undo}
                onMouseDown={(e) => { e.preventDefault(); runHistory("undo"); }}><Icon name="undo" size={18} /></button>
              <button className="tool" title={hint(tl("ed_redo"), KEYS.redo)} disabled={!hist.redo}
                onMouseDown={(e) => { e.preventDefault(); runHistory("redo"); }}><Icon name="redo" size={18} /></button>
            </div>

            <div className="ed-bar-grp ed-stylepick" ref={styleRef}>
              <button className="ed-style-btn" onClick={() => { setStyleOpen((o) => !o); setInsertOpen(false); }}
                title={hint(tl("style_title"), KEYS.h)}>
                <span className="ed-style-cur">{tl("style_" + (blockStyle || "p"))}</span>
                <Icon name="chevron" size={13} />
              </button>
              <BarMenu anchorRef={styleRef} open={styleOpen} className="ed-menu ed-style-menu">
                {BLOCK_STYLES.map((k) => (
                  <button key={k} className={blockStyle === k ? "on" : ""}
                    onMouseDown={(e) => { e.preventDefault(); setStyle(k); }}>
                    <span className={"style-pv style-pv--" + k}>Aa</span>
                    <span className="style-name">{tl("style_" + k)}</span>
                  </button>
                ))}
              </BarMenu>
            </div>

            <div className="ed-bar-grp">
              {marks.map(([icon, cmd]) => (
                <button key={cmd} className={"tool" + (active[cmd] ? " on" : "")} title={hint(tl("tool_" + cmd), KEYS[cmd])}
                  onMouseDown={(e) => { e.preventDefault(); runTool(cmd); }}><Icon name={icon} size={18} /></button>
              ))}
            </div>

            <div className="ed-bar-grp">
              {lists.map(([icon, cmd]) => (
                <button key={cmd} className={"tool" + (active[cmd] || active.block === (cmd === "quote" ? "blockquote" : cmd) ? " on" : "")}
                  title={hint(tl("tool_" + cmd), KEYS[cmd])}
                  onMouseDown={(e) => { e.preventDefault(); runTool(cmd); }}><Icon name={icon} size={18} /></button>
              ))}
            </div>

            <div className="ed-bar-grp ed-bar-grp--align">
              {aligns.map(([cls, key]) => (
                <button key={cls} className={"tool" + (alignCls === cls ? " on" : "")} title={hint(tl(key), KEYS[cls])}
                  onMouseDown={(e) => { e.preventDefault(); setAlign(cls); }}>
                  <span className={"align-pv align-pv--" + cls} />
                </button>
              ))}
            </div>

            <div className="ed-bar-grp ed-insert" ref={insertRef}>
              <button className={"tool" + (insertOpen ? " on" : "")} title={tl("ins_title")}
                onClick={() => { setInsertOpen((o) => !o); setStyleOpen(false); }}><Icon name="more" size={18} /></button>
              <BarMenu anchorRef={insertRef} open={insertOpen} align="right" className="ed-menu ed-insert-menu">
                <div className="ed-menu-lbl mono">{tl("ins_title")}</div>
                <button onMouseDown={(e) => { e.preventDefault(); setInsertOpen(false); insertFootnote(); }}>
                  <Icon name="note" size={15} /> <span>{tl("ins_footnote")}</span>
                  <kbd className="mono">{FINE_POINTER ? KEYS.footnote : ""}</kbd></button>
                <button onMouseDown={(e) => { e.preventDefault(); setInsertOpen(false); insertPageBreak(); }}>
                  <Icon name="book" size={15} /> <span>{tl("ins_pagebreak")}</span>
                  <kbd className="mono">{FINE_POINTER ? KEYS.pagebreak : ""}</kbd></button>
                {project && (
                  <button title={tl("ins_scene_hint")}
                    onMouseDown={(e) => { e.preventDefault(); setInsertOpen(false); insertScene(); }}>
                    <Icon name="panel" size={15} /> <span>{tl("ins_scene")}</span></button>
                )}
                <button onMouseDown={(e) => { e.preventDefault(); setInsertOpen(false); exec("insertHorizontalRule"); }}>
                  <Icon name="hr" size={15} /> <span>{tl("ins_hr")}</span></button>
                <button onMouseDown={(e) => { e.preventDefault(); setInsertOpen(false); insertTable(); }}>
                  <Icon name="table" size={15} /> <span>{tl("ins_table")}</span></button>
                <button onMouseDown={(e) => { e.preventDefault(); setInsertOpen(false); insertCodeBlock(); }}>
                  <Icon name="code" size={15} /> <span>{tl("ins_code")}</span></button>
                <button onMouseDown={(e) => { e.preventDefault(); setInsertOpen(false); insertTaskList(); }}>
                  <Icon name="check" size={15} /> <span>{tl("ins_tasklist")}</span></button>
                <button onMouseDown={(e) => { e.preventDefault(); setInsertOpen(false); insertImage(); }}>
                  <Icon name="image" size={15} /> <span>{tl("ins_image")}</span></button>
              </BarMenu>
            </div>
          </>
        )}

        <div className="ed-bar-end">
          {mode === "edit" && (
            <button className={"tool" + (setupOpen ? " on" : "")} title={tl("pset_title")}
              onClick={() => setSetupOpen((o) => !o)}><Icon name="settings" size={18} /></button>
          )}
          <button className={"tool tool--focusdot" + (focusMode ? " on" : "")} title={hint(tl("focus_mode_btn"), KEYS.focus)}
            onClick={() => setFocusMode((f) => !f)}>
            <span className={"brand-dot-btn" + (focusMode ? " active" : "")} />
          </button>
          <div className="ed-bar-modes">
            <button className={"tool" + (mode === "edit" ? " on" : "")} title={tl("mode_edit")}
              onMouseDown={(e) => { e.preventDefault(); switchMode("edit"); }}><Icon name="edit" size={17} /></button>
            <button className={"tool" + (mode === "preview" ? " on" : "")} title={hint(tl("mode_preview"), KEYS.preview)}
              onMouseDown={(e) => { e.preventDefault(); switchMode("preview"); }}><Icon name="eye" size={17} /></button>
          </div>
        </div>
      </div>

      <div className="ed-body" style={{ "--ed-bar-h": barH + "px", "--ed-foot-h": footH + "px", "--ed-kb": kbOffset + "px" }}>
        {outlineOpen && (
          <>
            <div className="ed-scrim" onMouseDown={() => setOutlineOpen(false)} />
            <OutlinePanel store={store} project={project} docId={docId} lang={lang} nav={nav}
              onClose={() => setOutlineOpen(false)} onSceneJump={jumpToScene} currentSceneId={curScene}
              onChapterContent={onOutlineContent} onToast={onToast} />
          </>
        )}

        <div className="ed-scroll" ref={scrollRef} onScroll={onScroll}
          style={{ display: mode === "edit" ? "" : "none" }}>
          <div className={"ed-paper" + (zoomLive ? " zoom-live" : "")} ref={paperRef} style={paperStyle}>
            <PageLayer pages={pages} geom={geom} pg={page} ctx={headCtx}
              onFootnote={openFootnote} onMeasure={onFootnoteHeights}
              onBand={() => { setSetupTab("head"); setSetupOpen(true); }} />
            <div ref={(el) => { ref.current = el; if (el) nodeRef.current = el; }}
              className="ed-area" contentEditable suppressContentEditableWarning
              spellCheck={true} lang={lang} data-placeholder={tl("editor_placeholder")}
              style={{ top: geom.mt, left: geom.ml, width: geom.contentW }}
              onInput={onInput} onPaste={onPaste} onKeyDown={onKeyDown} onKeyUp={onKeyUp} onClick={onAreaClick}
              onMouseUp={refreshActive} onFocus={refreshActive} />
          </div>
          <div className="ed-tail" />
        </div>

        {mode === "preview" && (
          <BookPreview html={saved.current || doc.content} title={doc.title} lang={lang}
            page={page} ctx={headCtx} font={editorFontVar} onMeta={setPrevMeta} />
        )}

        {setupOpen && mode === "edit" && (
          <>
            <div className="ed-scrim ed-scrim--setup" onMouseDown={() => setSetupOpen(false)} />
            <PageSetupPanel page={page} lang={lang} editorFont={user.editorFont}
              onFont={(f) => store.setUser({ editorFont: f })} tab={setupTab} onTab={setSetupTab}
              onChange={setPage} onClose={() => setSetupOpen(false)} />
          </>
        )}
      </div>

      <footer className="ed-foot" ref={footRef} style={{ "--ed-bar-h": barH + "px", "--ed-kb": kbOffset + "px" }}>
        <div className="ed-foot-meta mono">
          {project ? project.title : tl("note_label")} <span className="ed-foot-sep">·</span> {doc.title}
          {savedFlash && <span className="ed-foot-saved">{tl("saved_flash")}</span>}
        </div>
        <div className="ed-count mono">
          <span className="ed-pageno">{tl("foot_page")}{" "}
            {mode === "preview" && prevMeta ? prevMeta.page : curPage} / {mode === "preview" && prevMeta ? prevMeta.total : pageCount}</span>
          <span className="ed-foot-sep">·</span>
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
          defaultFont={user.editorFont}
          page={page}
        />
      )}
      {fnEdit && (
        <FootnotePopup n={fnEdit.n} text={fnEdit.text} anchor={fnEdit.anchor} lang={lang}
          onApply={(text) => applyFootnote(fnEdit.id, text)}
          onDelete={() => deleteFootnote(fnEdit.id)}
          onClose={() => setFnEdit(null)} />
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
    if (top + h + margin > window.innerHeight) top = anchor.y - h - 10;
    top = Math.max(margin, Math.min(top, window.innerHeight - h - margin));
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
  const [closing, close] = useDismiss(onClose);

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className={"modal-scrim" + closing} onMouseDown={close}>
      <div className="modal snap-modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div><div className="eyebrow">{tl("snap_title")}</div>
            <h2 className="modal-title">{tl("snap_btn")}</h2></div>
          <button className="icon-btn" onClick={close}><Icon name="close" size={18} /></button>
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
  const [closing, close] = useDismiss(onCancel);
  return (
    <div className={"modal-scrim" + closing} onMouseDown={close}>
      <div className="confirm-modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="confirm-icon"><Icon name="reset" size={22} /></div>
        <div className="confirm-title">{tl("snap_confirm_title")}</div>
        <div className="confirm-name">
          {snap.name || new Date(snap.createdAt).toLocaleString(locale, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
        </div>
        <p className="confirm-note mono">{tl("snap_confirm_body")}</p>
        <div className="confirm-actions">
          <button className="btn btn--ghost" onClick={close}>{tl("confirm_cancel")}</button>
          <button className="btn btn--accent" onClick={onConfirm}><Icon name="reset" size={15} /> {tl("snap_confirm_ok")}</button>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { Editor, SnapshotModal, ConfirmRestore });
