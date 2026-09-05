/* ============================================================
   Sipru. — shared atoms (icons, logo, hooks)
   ============================================================ */
const { useState, useEffect, useRef, useCallback, useMemo } = React;

/* ---------- store hook ---------- */
function useStore() {
  const [, force] = useState(0);
  useEffect(() => SipruStore.subscribe(() => force((n) => n + 1)), []);
  return SipruStore;
}

/* ---------- icons (geometric, 24px, stroke) ---------- */
const P = { fill: "none", stroke: "currentColor", strokeWidth: 1.6,
  strokeLinecap: "round", strokeLinejoin: "round" };
const ICONS = {
  home: <g {...P}><path d="M3 10l9-7 9 7v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9.5 21.5V13h5v8.5"/></g>,
  sliders: <g {...P}><path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3"/><path d="M1.5 14h5M9.5 12h5M17.5 16h5"/></g>,
  layers: <g {...P}><path d="M12 3l9 5-9 5-9-5z"/><path d="M3 13l9 5 9-5"/></g>,
  star: <g {...P}><path d="M12 3.5l2.7 5.6 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1L3.2 10l6.1-.9z"/></g>,
  bookOpen: <g {...P}><path d="M2 4h6a4 4 0 0 1 4 4v12a3 3 0 0 0-3-3H2z"/><path d="M22 4h-6a4 4 0 0 0-4 4v12a3 3 0 0 1 3-3h7z"/></g>,
  bold: <path {...P} strokeWidth="2" d="M7 5h6a3.5 3.5 0 0 1 0 7H7zM7 12h7a3.5 3.5 0 0 1 0 7H7z" />,
  italic: <g {...P} strokeWidth="2"><line x1="15" y1="5" x2="10" y2="19"/><line x1="9" y1="5" x2="17" y2="5"/><line x1="6" y1="19" x2="14" y2="19"/></g>,
  underline: <g {...P}><path d="M7 4v6a5 5 0 0 0 10 0V4"/><line x1="5" y1="20" x2="19" y2="20"/></g>,
  strike: <g {...P}><line x1="5" y1="12" x2="19" y2="12"/><path d="M8 7a4 3 0 0 1 8 0M8 17a4 3 0 0 0 8 0"/></g>,
  h1: <g {...P}><path d="M4 6v12M12 6v12M4 12h8"/><path d="M16 9l3-1v10" strokeWidth="1.4"/></g>,
  h2: <g {...P}><path d="M4 6v12M12 6v12M4 12h8"/><path d="M16 9a2 2 0 1 1 3 1.6L16 18h4" strokeWidth="1.4"/></g>,
  h3: <g {...P}><path d="M4 6v12M12 6v12M4 12h8"/><path d="M16 8.5a2 2 0 1 1 2.6 2 2 2 0 1 1-2.6 2.2" strokeWidth="1.4"/></g>,
  quote: <g {...P}><path d="M9 7H5v6h4l-2 4M19 7h-4v6h4l-2 4"/></g>,
  hr: <g {...P}><line x1="4" y1="12" x2="20" y2="12"/><circle cx="12" cy="12" r="0.6" fill="currentColor"/></g>,
  ul: <g {...P}><line x1="9" y1="7" x2="20" y2="7"/><line x1="9" y1="12" x2="20" y2="12"/><line x1="9" y1="17" x2="20" y2="17"/><circle cx="5" cy="7" r="1" fill="currentColor"/><circle cx="5" cy="12" r="1" fill="currentColor"/><circle cx="5" cy="17" r="1" fill="currentColor"/></g>,
  ol: <g {...P}><line x1="10" y1="7" x2="20" y2="7"/><line x1="10" y1="12" x2="20" y2="12"/><line x1="10" y1="17" x2="20" y2="17"/><path d="M4 6.5l1-.5v3M4 16h2l-2 2h2" strokeWidth="1.3"/></g>,
  save: <g {...P}><path d="M5 4h11l3 3v13H5zM8 4v5h7V4M8 20v-6h8v6"/></g>,
  rename: <g {...P}><path d="M4 20h16M6 16l9-9 3 3-9 9H6z"/></g>,
  export: <g {...P}><path d="M12 15V4M8 8l4-4 4 4M5 14v5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-5"/></g>,
  download: <g {...P}><path d="M12 4v11M8 11l4 4 4-4M5 20h14"/></g>,
  upload: <g {...P}><path d="M12 16V5M8 9l4-4 4 4M5 20h14"/></g>,
  eye: <g {...P}><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="2.5"/></g>,
  edit: <g {...P}><path d="M4 20h16M6 16l9-9 3 3-9 9H6z"/></g>,
  panel: <g {...P}><rect x="3" y="4" width="18" height="16" rx="1"/><line x1="9" y1="4" x2="9" y2="20"/></g>,
  plus: <g {...P}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></g>,
  folder: <g {...P}><path d="M3 7a1 1 0 0 1 1-1h5l2 2h8a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z"/></g>,
  note: <g {...P}><path d="M6 3h9l3 3v15H6zM9 8h6M9 12h6M9 16h4"/></g>,
  drag: <g {...P}><circle cx="9" cy="6" r="1" fill="currentColor"/><circle cx="9" cy="12" r="1" fill="currentColor"/><circle cx="9" cy="18" r="1" fill="currentColor"/><circle cx="15" cy="6" r="1" fill="currentColor"/><circle cx="15" cy="12" r="1" fill="currentColor"/><circle cx="15" cy="18" r="1" fill="currentColor"/></g>,
  back: <g {...P}><path d="M15 5l-7 7 7 7"/></g>,
  forward: <g {...P}><path d="M9 5l7 7-7 7"/></g>,
  settings: <g {...P}><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2"/></g>,
  search: <g {...P}><circle cx="11" cy="11" r="6"/><line x1="20" y1="20" x2="16" y2="16"/></g>,
  sun: <g {...P}><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M19 5l-1.5 1.5M6.5 17.5L5 19"/></g>,
  moon: <g {...P}><path d="M20 14a8 8 0 1 1-9-11 6.5 6.5 0 0 0 9 11z"/></g>,
  check: <g {...P}><path d="M5 12l5 5 9-11"/></g>,
  table: <g {...P}><rect x="3.5" y="5" width="17" height="14" rx="1.5"/><line x1="3.5" y1="9.6" x2="20.5" y2="9.6"/><line x1="9.7" y1="9.6" x2="9.7" y2="19"/><line x1="15.5" y1="9.6" x2="15.5" y2="19"/></g>,
  code: <g {...P}><path d="M9 8l-4.5 4L9 16"/><path d="M15 8l4.5 4L15 16"/></g>,
  image: <g {...P}><rect x="3.5" y="5" width="17" height="14" rx="1.5"/><circle cx="9" cy="10" r="1.6"/><path d="M4.5 17l4.6-4.3 3.3 3 2.7-2.3 4.4 3.9"/></g>,
  highlight: <g {...P}><path d="M4 19h16"/><path d="M8.5 15.5l7.4-7.4a2 2 0 0 1 2.8 0l.2.2a2 2 0 0 1 0 2.8l-7.4 7.4"/><path d="M8.5 15.5l-2 .6.6-2"/></g>,
  trash: <g {...P}><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/></g>,
  reset: <g {...P}><path d="M4 12a8 8 0 1 1 2.3 5.6M4 18v-4h4"/></g>,
  chevron: <g {...P}><path d="M6 9l6 6 6-6"/></g>,
  sort: <g {...P}><path d="M7 4v16M7 20l-3-3M7 4l3 3M17 20V4M17 4l-3 3M17 20l3-3"/></g>,
  close: <g {...P}><line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/></g>,
  more: <g {...P} strokeWidth="2.4"><circle cx="12" cy="5" r="0.9" fill="currentColor"/><circle cx="12" cy="12" r="0.9" fill="currentColor"/><circle cx="12" cy="19" r="0.9" fill="currentColor"/></g>,
  terminal: <g {...P}><path d="M5 7l4 4-4 4M11 16h7"/><rect x="2" y="3" width="20" height="18" rx="1"/></g>,
  book: <g {...P}><path d="M4 5a1 1 0 0 1 1-1h6v16H5a1 1 0 0 1-1-1zM20 5a1 1 0 0 0-1-1h-6v16h6a1 1 0 0 0 1-1z"/></g>,
  type: <g {...P}><path d="M4 7V5h16v2M9 5v14M12 19H6M15 19h3"/></g>,
  focus: <g {...P}><path d="M4 9V5h4M20 9V5h-4M4 15v4h4M20 15v4h-4"/></g>,
  user: <g {...P}><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></g>,
  undo: <g {...P}><path d="M4 9h11a5 5 0 0 1 0 10h-6"/><path d="M8 5L4 9l4 4"/></g>,
  redo: <g {...P}><path d="M20 9H9a5 5 0 0 0 0 10h6"/><path d="M16 5l4 4-4 4"/></g>,
  history: <g {...P}><path d="M4 12a8 8 0 1 1 2.5 5.8"/><path d="M4 18v-4h4"/><path d="M12 8v4l3 2"/></g>,
  target: <g {...P}><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3.4"/></g>,
  feather: <g {...P}><path d="M20 4c-8 0-14 6-14 14v2h2c8 0 14-6 14-14V4h-2z"/><path d="M19 5 8 16"/><path d="M13 15H9v-4"/></g>,
  clock: <g {...P}><circle cx="12" cy="12" r="8"/><path d="M12 8v4l3 2"/></g>,
  flame: <g {...P}><path d="M12 3s4.2 4.3 4.2 8a4.2 4.2 0 0 1-8.4 0c0-1.5.6-2.6.6-2.6s.9 1.6 1.7 1.6c1 0 1.9-2.4 1.9-7z"/></g>,
  pencil: <g {...P}><path d="M12 20h8"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4z"/></g>,
  link: <g {...P}><path d="M9.5 14.5l5-5"/><path d="M8 16a4 4 0 0 1 0-5.6l2-2a4 4 0 0 1 5.6 5.6l-1 1"/><path d="M16 8a4 4 0 0 1 0 5.6l-2 2a4 4 0 0 1-5.6-5.6l1-1"/></g>,
};
function Icon({ name, size = 20, style, className }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className}
      style={{ display: "block", flex: "0 0 auto", ...style }} aria-hidden="true">
      {ICONS[name] || null}
    </svg>
  );
}

/* ---------- logo with the living dot ---------- */
function Logo({ size = 22, alive = false, onClick, onDotClick, dotTitle, style }) {
  return (
    <span className={"brand" + (alive ? " alive" : "")} onClick={onClick}
      style={{ fontSize: size, cursor: onClick ? "pointer" : "default", ...style }}>
      Sipru<span className="dot"
        onClick={onDotClick ? (e) => { e.stopPropagation(); onDotClick(e); } : undefined}
        title={onDotClick ? dotTitle : undefined}
      />
    </span>
  );
}

/* ---------- stats popup off the dot ---------- */
/* ---------- theme toggle (sliding) ---------- */
function ThemeToggle({ theme, onChange, lang }) {
  const dark = theme === "dark";
  const tl = T(lang || "ru");
  return (
    <button className="icon-btn" title={dark ? tl("theme_to_light") : tl("theme_to_dark")}
      onClick={() => onChange(dark ? "light" : "dark")}
      style={{ position: "relative", overflow: "hidden" }}>
      <span style={{ display: "grid", placeItems: "center", transition: "transform .5s var(--ease-in-out)",
        transform: dark ? "rotate(0deg)" : "rotate(180deg)" }}>
        <Icon name={dark ? "moon" : "sun"} size={18} />
      </span>
    </button>
  );
}

/* ---------- relative time (lang-aware via i18n.js) ---------- */
function timeAgo(ts, lang) { return timeAgoT(ts, lang || "ru"); }
function plural(n, one, few, many) {
  const m10 = n % 10, m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return few;
  return many;
}
const wordsLabel = (n, lang) => wordsLabelT(n, lang || "ru");

/* ---------- tiny toast ---------- */
function useToast() {
  const [toast, setToast] = useState(null);
  const show = useCallback((msg) => {
    setToast({ msg, id: Math.random(), closing: false });
  }, []);
  /* Visible for a while, then a brief fade before it actually unmounts —
     an instant disappearance read as a glitch, not a dismissal. */
  useEffect(() => {
    if (!toast || toast.closing) return;
    const t = setTimeout(() => setToast((cur) => (cur ? { ...cur, closing: true } : cur)), 2600);
    return () => clearTimeout(t);
  }, [toast && toast.id]);
  useEffect(() => {
    if (!toast || !toast.closing) return;
    const t = setTimeout(() => setToast(null), 160);
    return () => clearTimeout(t);
  }, [toast && toast.closing]);
  const node = toast ? (
    <div className={"toast" + (toast.closing ? " is-leaving" : "")} key={toast.id}>{toast.msg}</div>
  ) : null;
  return [node, show];
}

/* ---------- country flags ----------
   Emoji flags (🇬🇧/🇷🇺) don't render as flags on Windows — most Windows
   fonts have no flag glyphs and fall back to the bare two-letter region
   code, so the language picker showed "GB"/"RU" instead. Inline SVGs
   render identically on every platform. */
function FlagGB() {
  return (
    <svg className="lang-flag-svg" viewBox="0 0 60 36" width="26" height="16" aria-hidden="true">
      <rect width="60" height="36" fill="#00247d" />
      <path d="M0,0 L60,36 M60,0 L0,36" stroke="#fff" strokeWidth="7" />
      <path d="M0,0 L60,36 M60,0 L0,36" stroke="#cf142b" strokeWidth="3" />
      <path d="M30,0 V36 M0,18 H60" stroke="#fff" strokeWidth="11" />
      <path d="M30,0 V36 M0,18 H60" stroke="#cf142b" strokeWidth="6" />
    </svg>
  );
}
function FlagRU() {
  return (
    <svg className="lang-flag-svg" viewBox="0 0 60 36" width="26" height="16" aria-hidden="true">
      <rect width="60" height="12" y="0" fill="#fff" />
      <rect width="60" height="12" y="12" fill="#0039a6" />
      <rect width="60" height="12" y="24" fill="#d52b1e" />
    </svg>
  );
}

/* ---------- storage pressure warning ----------
   Everything lives in localStorage, so the only real safety net is an
   exported backup. The warning fires while there is still room to write
   one — once the quota is actually full, the export itself still works but
   the writing does not, and by then text has already been lost. It also
   shows outright if a save has already failed. */
const STORAGE_WARN_AT = 0.8;
function StorageWarning({ store, lang, onToast }) {
  const tl = T(lang || "en");
  const [dismissed, setDismissed] = useState(false);
  const usage = store.storageUsage();
  const failed = !store.isWritable();
  const tight = !!usage && usage.ratio >= STORAGE_WARN_AT;

  /* A failed save is not dismissible-and-forgotten: it comes back on the
     next render precisely because the condition is still true. */
  if (dismissed && !failed) return null;
  if (!tight && !failed) return null;

  const pct = usage ? Math.min(99, Math.round(usage.ratio * 100)) : null;
  return (
    <div className="stor-warn" role="status">
      <div className="upd-main">
        <div className="upd-title">
          <span className="upd-spark" aria-hidden="true">⚠</span>
          {tl(failed ? "storage_full_title" : "storage_warn_title")}
        </div>
        <div className="upd-notes mono">
          {tl(failed ? "storage_full_body" : "storage_warn_body")}
          {pct != null && !failed ? " · " + pct + "%" : ""}
        </div>
      </div>
      <div className="upd-actions">
        <button className="upd-go" onClick={() => {
          try {
            downloadBlob("sipru-backup-" + new Date().toISOString().slice(0, 10) + ".json",
              "application/json", store.exportAll());
            if (onToast) onToast(tl("toast_backup_dl"));
          } catch (e) { if (onToast) onToast(tl("toast_backup_err")); }
        }}>{tl("storage_warn_backup")}</button>
        {!failed && (
          <button className="upd-x" onClick={() => setDismissed(true)} title={tl("upd_dismiss")}>
            <Icon name="close" size={15} />
          </button>
        )}
      </div>
    </div>
  );
}

/* ---------- project / global search (⌘K) ---------- */
function SearchModal({ store, lang, projectId, onPick, onClose }) {
  const tl = T(lang || "en");
  const [q, setQ] = useState("");
  const [query, setQuery] = useState("");
  const [sel, setSel] = useState(0);
  const listRef = useRef(null);
  const [closing, close] = useDismiss(onClose);

  /* debounce so a long project isn't rescanned on every keystroke */
  useEffect(() => {
    const t = setTimeout(() => { setQuery(q); setSel(0); }, 140);
    return () => clearTimeout(t);
  }, [q]);

  const results = useMemo(
    () => (query.trim() ? store.search(query, projectId) : []),
    [query, projectId, store]
  );

  useEffect(() => {
    const el = listRef.current && listRef.current.children[sel];
    if (el && el.scrollIntoView) el.scrollIntoView({ block: "nearest" });
  }, [sel]);

  /* Escape closes the search even when focus has left the input */
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function onKeyDown(e) {
    if (e.key === "Escape") { e.preventDefault(); onClose(); }
    else if (e.key === "ArrowDown") { e.preventDefault(); setSel((i) => Math.max(0, Math.min(results.length - 1, i + 1))); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setSel((i) => Math.max(0, i - 1)); }
    else if (e.key === "Enter") { e.preventDefault(); if (results[sel]) onPick(results[sel]); }
  }

  return (
    <div className={"modal-scrim search-scrim" + closing} onMouseDown={close}>
      <div className="modal search-modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="search-bar">
          <Icon name="search" size={18} />
          <input className="search-input" autoFocus value={q} onChange={(e) => setQ(e.target.value)}
            onKeyDown={onKeyDown} placeholder={tl(projectId ? "search_placeholder_project" : "search_placeholder")} />
          {results.length > 0 && (
            <span className="search-count mono">{results.total || results.length} {tl("search_results_n")}</span>
          )}
          <button className="search-esc mono" onClick={close} title={tl("confirm_cancel")}>esc</button>
        </div>

        <div className="search-list" ref={listRef}>
          {!query.trim() && <div className="search-note mono">{tl("search_start")}</div>}
          {query.trim() && !results.length && <div className="search-note mono">{tl("search_empty")}</div>}
          {results.map((r, i) => (
            <button key={r.kind + r.id} className={"search-item" + (i === sel ? " on" : "")}
              onMouseEnter={() => setSel(i)} onClick={() => onPick(r)}>
              <span className="search-item-top">
                <Icon name={r.kind === "note" ? "note" : r.kind === "synopsis" ? "folder" : "book"} size={14} />
                <span className="search-item-title">{r.title}</span>
                {r.kind === "chapter" && r.projectTitle &&
                  <span className="search-item-proj mono">{r.projectTitle}</span>}
                {r.kind === "synopsis" && <span className="search-item-proj mono">{tl("search_synopsis")}</span>}
                {r.inTitle && !r.snippet && <span className="search-item-proj mono">{tl("search_in_title")}</span>}
              </span>
              {r.snippet && (
                <span className="search-item-snip">
                  {r.snippet.before}<mark>{r.snippet.match}</mark>{r.snippet.after}
                </span>
              )}
            </button>
          ))}
        </div>
        <div className="search-foot mono">
          {results.length
            ? (results.truncated
                ? tl("search_results_first") + " " + results.length + " " + tl("search_results_of") + " " + results.total
                : results.length + " " + tl("search_results_n")) + " · "
            : ""}{tl("search_hint")}
        </div>
      </div>
    </div>
  );
}

const FONT_LABEL = { book: "Source Serif 4", article: "Lora", mono: "JetBrains Mono" };

/* Any dropdown anchored inside the mobile toolbar has to escape it: the
   bar scrolls sideways (overflow-x: auto), and giving one axis a scroll
   box forces the other non-visible too — overflow-y is clipped right
   along with it. A menu positioned by the ordinary `position: absolute`
   relative to a button in that bar was being clipped by its own parent's
   overflow-y before it ever reached the viewport, so it opened invisible
   and un-clickable while the button underneath kept lighting up as
   "pressed". Portaling the menu to <body> and placing it by the anchor's
   own bounding rect sidesteps every ancestor's overflow entirely — the
   same fix a native <select> or Radix/Headless popover relies on. */
function BarMenu({ anchorRef, open, className, children, align }) {
  const [rect, setRect] = useState(null);
  const boxRef = useRef(null);
  /* First pass places the menu near the anchor so it can measure its own
     (invisible) size; the second pass clamps *that* size into the
     viewport. Clamping only the anchor's own left/right earlier still let
     a menu wider than the room to its right run straight off the far edge
     — the anchor was on-screen, the menu's far edge wasn't. */
  const [fit, setFit] = useState(null);
  useEffect(() => {
    if (!open || !anchorRef.current) { setRect(null); setFit(null); return; }
    const place = () => {
      if (!anchorRef.current) return;
      setRect(anchorRef.current.getBoundingClientRect());
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => { window.removeEventListener("resize", place); window.removeEventListener("scroll", place, true); };
  }, [open, anchorRef]);
  useEffect(() => {
    if (!rect || !boxRef.current) return;
    const margin = 8;
    const el = boxRef.current;
    const w = el.offsetWidth, h = el.offsetHeight;
    const vw = window.innerWidth, vh = window.innerHeight;
    let left = align === "right" ? rect.right - w : rect.left;
    left = Math.max(margin, Math.min(left, vw - w - margin));
    let top, useBottom = false, val;
    if (rect.bottom + h + 10 > vh && rect.top - h - 10 > margin) {
      useBottom = true; val = Math.max(margin, vh - rect.top + 10);
    } else {
      val = Math.max(margin, Math.min(rect.bottom + 10, vh - h - margin));
    }
    setFit({ left, top: useBottom ? undefined : val, bottom: useBottom ? val : undefined });
  }, [rect, align]);
  if (!open || !rect) return null;
  const margin = 8;
  const style = fit
    ? { position: "fixed", zIndex: 70, left: fit.left, top: fit.top, bottom: fit.bottom, visibility: "visible" }
    /* invisible pre-measure pass: placed near the anchor, off the
       accessibility tree's radar, so offsetWidth/Height are real before
       anything is clamped or shown */
    : { position: "fixed", zIndex: 70, left: Math.max(margin, rect.left), top: Math.min(rect.bottom + 10, window.innerHeight - margin), visibility: "hidden" };
  return ReactDOM.createPortal(
    <div ref={boxRef} className={className} style={style} onMouseDown={(e) => e.stopPropagation()}>{children}</div>,
    document.body
  );
}

/* Lets a modal play its exit animation before it unmounts: the scrim
   takes `cls` for one animation's length, then the real onClose runs.
   Desktop keeps the instant close — the exit is a touch affordance. */
const DISMISS_MS = 190;
function useDismiss(onClose) {
  const [closing, setClosing] = useState(false);
  const timer = useRef(null);
  useEffect(() => () => clearTimeout(timer.current), []);
  const close = useCallback(() => {
    let coarse = false;
    try { coarse = window.matchMedia("(pointer: coarse)").matches; } catch (e) {}
    if (!coarse) return onClose();
    if (timer.current) return;              /* already on the way out */
    setClosing(true);
    timer.current = setTimeout(onClose, DISMISS_MS);
  }, [onClose]);
  return [closing ? " is-closing" : "", close];
}

Object.assign(window, {
  useStore, Icon, ICONS, Logo, ThemeToggle, timeAgo, plural, wordsLabel, useToast, FONT_LABEL, T, SearchModal,
  useDismiss, BarMenu, StorageWarning, FlagGB, FlagRU,
});
