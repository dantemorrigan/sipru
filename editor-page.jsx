/* ============================================================
   Sipru. — the page: geometry, pagination, decorations, setup panel

   The editor stays a single contentEditable element — the same one the
   rest of the app already saves, exports and syncs to the vault. What
   changes is that it is laid out *inside a stack of real sheets*: the
   page frames, headers, footers, numbers and footnotes are drawn in a
   layer behind/around the text, and the text itself is nudged down at
   the points where a page ends.

   The nudge is presentational only — a padding-top on the block that
   would otherwise straddle a page break — and it is stripped again on
   the way to storage (see serializeArea), so nothing about the stored
   HTML changes because of pagination.
   ============================================================ */

const PX_PER_MM = 96 / 25.4;
const PT_PER_PX = 96 / 72;
const PAGE_GAP_MM = 8;            /* the visible gutter between two sheets */

const PAGE_SIZES = {
  a4:     { w: 210,   h: 297 },
  a5:     { w: 148,   h: 210 },
  letter: { w: 215.9, h: 279.4 },
  legal:  { w: 215.9, h: 355.6 },
};
const PAGE_SIZE_ORDER = ["a4", "a5", "letter", "legal", "custom"];

function pageDims(pg) {
  const base = pg.size === "custom"
    ? { w: clampNum(pg.w, 60, 600, 210), h: clampNum(pg.h, 60, 900, 297) }
    : (PAGE_SIZES[pg.size] || PAGE_SIZES.a4);
  return pg.orient === "landscape" ? { w: base.h, h: base.w } : { w: base.w, h: base.h };
}
function clampNum(v, min, max, fallback) {
  const n = typeof v === "number" ? v : parseFloat(v);
  if (!isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

/* Below this, type stops being text and becomes texture. */
const MIN_FONT_PX = 15;

/* Everything the layout needs, in device pixels, for one zoom level.

   On a phone an A4 sheet shrunk to the screen would render 7px type — a
   picture of a page rather than something anyone can write in. So when the
   sheet has to shrink that far, the page goes *fluid*: it still fills the
   column and still paginates, but the type is set at a readable size and
   the sheet grows taller to keep the same proportions of text to margin.
   Desktop, where the page fits at its true size, never enters this. */
function pageGeometry(pg, avail) {
  const d = pageDims(pg);
  const natural = d.w * PX_PER_MM;
  const fit = Math.min(1, avail > 0 ? avail / natural : 1);
  const zoom = clampNum(pg.zoom, 0.4, 2, 1);
  const scale = clampNum(fit * zoom, 0.18, 2, 1);
  const pt = clampNum(pg.fontSize, 6, 48, 12) * PT_PER_PX;
  const k = PX_PER_MM * scale;

  let fontPx = pt * scale;
  let vScale = scale;                       /* vertical stretch of the sheet */
  let fluid = false;
  if (fit < 0.85 && zoom <= 1 && fontPx < MIN_FONT_PX) {
    fluid = true;
    fontPx = MIN_FONT_PX;
    vScale = scale * (MIN_FONT_PX / (pt * scale));
  }

  const kv = PX_PER_MM * vScale;
  const mt = Math.round(clampNum(pg.mt, 0, 100, 20) * kv);
  const mb = Math.round(clampNum(pg.mb, 0, 100, 20) * kv);
  const mr = Math.round(clampNum(pg.mr, 0, 100, 18) * k);
  const ml = Math.round(clampNum(pg.ml, 0, 100, 18) * k);
  const pageW = Math.round(d.w * k);
  const pageH = Math.round(d.h * vScale * PX_PER_MM);
  return {
    scale, vScale, fluid, pageW, pageH, mt, mr, mb, ml,
    contentW: Math.max(80, pageW - ml - mr),
    contentH: Math.max(120, pageH - mt - mb),
    gap: Math.max(10, Math.round(PAGE_GAP_MM * k)),
    fontPx,
  };
}

/* ---- what counts as one laid-out block ---- */
function isHiddenBlock(el) {
  return el.classList && (el.classList.contains("fn-defs") || el.hasAttribute("hidden"));
}
function isPageBreak(el) {
  return el.tagName === "HR" && el.classList && el.classList.contains("page-break");
}
/* A heading or a scene marker stranded on the last line of a page, with its
   text overleaf, is the one break a typesetter never allows. */
function keepsWithNext(el) {
  const tag = el.tagName;
  return tag === "H1" || tag === "H2" || tag === "H3" ||
    (tag === "HR" && el.classList && el.classList.contains("scene-sep")) ||
    (tag === "FIGURE" && el.classList && el.classList.contains("epigraph"));
}

/* ------------------------------------------------------------
   The pagination pass.

   Three phases, in this order, so the whole thing costs one reflow:
   clear every push (write) → read every geometry (read) → apply the new
   pushes (write). Interleaving reads and writes here is what would make
   a long chapter crawl.
   ------------------------------------------------------------ */
function paginateArea(area, geom, reserved) {
  const step = geom.mt + geom.mb + geom.gap;      /* dead space between two content areas */
  const cycle = geom.contentH + step;             /* content-area top to content-area top */
  const blocks = [];
  for (let i = 0; i < area.children.length; i++) {
    const el = area.children[i];
    if (!isHiddenBlock(el)) blocks.push(el);
  }

  for (let i = 0; i < blocks.length; i++) blocks[i].style.paddingTop = "";

  const tops = new Array(blocks.length);
  const heights = new Array(blocks.length);
  for (let i = 0; i < blocks.length; i++) {
    tops[i] = blocks[i].offsetTop;
    heights[i] = blocks[i].offsetHeight;
  }
  const baseTop = blocks.length ? tops[0] : 0;

  const avail = (p) => Math.max(60, geom.contentH - (reserved && reserved[p] ? reserved[p] : 0));
  const pushes = new Array(blocks.length).fill(0);
  const pageOf = new Array(blocks.length).fill(0);

  let acc = 0, page = 0, forceBreak = false;
  for (let i = 0; i < blocks.length; i++) {
    const h = heights[i];
    let top = tops[i] - baseTop + acc;
    const room = avail(page);
    const pageTop = page * cycle;
    const pageEnd = pageTop + room;

    const straddles = top + h > pageEnd && h <= room;
    /* keep-with-next: a heading needs room for its own box plus the first
       line or two of whatever follows it */
    let stranded = false;
    if (!straddles && keepsWithNext(blocks[i]) && i + 1 < blocks.length) {
      const lead = Math.min(heights[i + 1], Math.round(geom.fontPx * 3.2));
      stranded = top + h + lead > pageEnd && h + lead <= room;
    }
    if (forceBreak || top >= pageEnd || straddles || stranded) {
      page++;
      const next = page * cycle;
      if (next > top) { pushes[i] = next - top; acc += next - top; top = next; }
      forceBreak = false;
    }
    pageOf[i] = page;
    /* A single block taller than a whole page (a very long paragraph) has
       nowhere to break — it flows on, and the page counter catches up to
       wherever it actually ended. */
    if (h > avail(page)) page = Math.max(page, Math.floor((top + h - 1) / cycle));
    if (isPageBreak(blocks[i])) forceBreak = true;
  }

  for (let i = 0; i < blocks.length; i++) {
    blocks[i].style.paddingTop = pushes[i] ? pushes[i] + "px" : "";
  }

  const total = Math.max(1, page + 1);
  /* The editable box reaches the bottom of the last sheet's text area, so
     clicking in the empty space under the last paragraph still lands the
     caret at the end of the document. */
  area.style.minHeight = ((total - 1) * cycle + geom.contentH) + "px";

  /* which footnote markers ended up on which page */
  const notes = [];
  for (let p = 0; p < total; p++) notes.push([]);
  for (let i = 0; i < blocks.length; i++) {
    const marks = blocks[i].querySelectorAll ? blocks[i].querySelectorAll("sup.fn") : [];
    for (let m = 0; m < marks.length; m++) {
      const id = marks[m].getAttribute("data-fn");
      const p = Math.min(total - 1, pageOf[i]);
      if (id) notes[p].push(id);
    }
  }
  return { total, notes, cycle, step };
}

/* Pagination artefacts never reach storage: the saved HTML of a document
   is exactly what it would have been without any of this. */
function serializeArea(el) {
  if (!el) return null;
  const clone = el.cloneNode(true);
  const styled = clone.querySelectorAll("[style]");
  for (let i = 0; i < styled.length; i++) {
    styled[i].style.removeProperty("padding-top");
    if (!styled[i].getAttribute("style")) styled[i].removeAttribute("style");
  }
  if (clone.style) clone.removeAttribute("style");
  return clone.innerHTML;
}

/* ============================================================
   Footnotes

   A marker lives inline in the text (<sup class="fn" data-fn="…">) and its
   text lives in a hidden trailing block, so a footnote travels with the
   document through save, export, snapshot and vault alike.
   ============================================================ */
function fnDefs(area, create) {
  let box = area.querySelector(":scope > .fn-defs");
  if (!box && create) {
    box = document.createElement("div");
    box.className = "fn-defs";
    area.appendChild(box);
  }
  return box;
}
function fnText(area, id) {
  const box = fnDefs(area, false);
  const el = box && box.querySelector('[data-fn="' + cssEsc(id) + '"]');
  return el ? el.textContent : "";
}
function setFnText(area, id, text) {
  const box = fnDefs(area, true);
  let el = box.querySelector('[data-fn="' + cssEsc(id) + '"]');
  if (!el) { el = document.createElement("p"); el.setAttribute("data-fn", id); box.appendChild(el); }
  el.textContent = text;
}
function cssEsc(s) { return String(s || "").replace(/["\\]/g, "\\$&"); }

/* Numbering follows the markers, always: renumber after every edit and a
   footnote deleted mid-chapter closes the gap on its own. */
function renumberFootnotes(area) {
  const marks = area.querySelectorAll("sup.fn");
  const box = fnDefs(area, false);
  const seen = [];
  for (let i = 0; i < marks.length; i++) {
    const id = marks[i].getAttribute("data-fn");
    if (!id) continue;
    seen.push(id);
    const n = String(seen.length);
    if (marks[i].textContent !== n) marks[i].textContent = n;
  }
  if (box) {
    /* drop orphaned definitions, then re-order to match the markers */
    const defs = box.children;
    for (let i = defs.length - 1; i >= 0; i--) {
      if (seen.indexOf(defs[i].getAttribute("data-fn")) < 0) box.removeChild(defs[i]);
    }
    seen.forEach((id) => {
      const el = box.querySelector('[data-fn="' + cssEsc(id) + '"]');
      if (el) box.appendChild(el);
    });
    if (!box.children.length) box.remove();
  }
  return seen;
}
function footnoteList(area) {
  const ids = renumberFootnotes(area);
  return ids.map((id, i) => ({ id, n: i + 1, text: fnText(area, id) }));
}

/* ============================================================
   Scenes — a scene is a marker plus the blocks that follow it, so a
   chapter with no scenes is byte-for-byte the document it always was.
   ============================================================ */
function sceneEls(area) {
  return Array.prototype.slice.call(area.querySelectorAll(":scope > hr.scene-sep"));
}
function makeSceneEl(title, status) {
  const hr = document.createElement("hr");
  hr.className = "scene-sep";
  hr.setAttribute("data-t", title || "");
  hr.setAttribute("data-s", status || "draft");
  hr.setAttribute("data-id", "s_" + Math.random().toString(36).slice(2, 9));
  return hr;
}

/* Splits a chapter's HTML into [lead, ...scenes]; every segment keeps its
   own blocks so reordering is a matter of re-joining them. */
function splitScenes(html) {
  const holder = document.createElement("div");
  holder.innerHTML = html || "";
  const segs = [{ id: "", title: "", status: "", nodes: [], lead: true }];
  Array.prototype.slice.call(holder.childNodes).forEach((n) => {
    if (n.nodeType === 1 && n.tagName === "HR" && n.classList.contains("scene-sep")) {
      segs.push({ id: n.getAttribute("data-id") || "", title: n.getAttribute("data-t") || "",
        status: n.getAttribute("data-s") || "draft", nodes: [], lead: false, el: n });
    } else {
      segs[segs.length - 1].nodes.push(n);
    }
  });
  segs.forEach((s) => {
    const box = document.createElement("div");
    s.nodes.forEach((n) => box.appendChild(n.cloneNode(true)));
    s.html = box.innerHTML;
    s.words = window.SipruStore.countWords(box.innerHTML);
  });
  return segs;
}
function joinScenes(segs) {
  const out = document.createElement("div");
  segs.forEach((s) => {
    if (!s.lead) {
      const hr = document.createElement("hr");
      hr.className = "scene-sep";
      hr.setAttribute("data-t", s.title || "");
      hr.setAttribute("data-s", s.status || "draft");
      hr.setAttribute("data-id", s.id || ("s_" + Math.random().toString(36).slice(2, 9)));
      out.appendChild(hr);
    }
    const box = document.createElement("div");
    box.innerHTML = s.html || "";
    while (box.firstChild) out.appendChild(box.firstChild);
  });
  return out.innerHTML;
}

/* ============================================================
   Paragraph styles
   ============================================================ */
const BLOCK_STYLES = ["p", "h1", "h2", "h3", "blockquote", "epigraph", "note"];

function topBlock(area) {
  const sel = window.getSelection();
  if (!sel || !sel.anchorNode) return null;
  let n = sel.anchorNode.nodeType === 3 ? sel.anchorNode.parentElement : sel.anchorNode;
  while (n && n.parentElement && n !== area) {
    if (n.parentElement === area) return n;
    n = n.parentElement;
  }
  return null;
}
function blockStyleOf(el) {
  if (!el) return "";
  const tag = (el.tagName || "").toLowerCase();
  if (tag === "figure" && el.classList.contains("epigraph")) return "epigraph";
  if (tag === "aside" && el.classList.contains("note")) return "note";
  if (["h1", "h2", "h3", "blockquote", "p"].indexOf(tag) >= 0) return tag;
  return "";
}
function caretTo(node, atEnd) {
  const sel = window.getSelection();
  const r = document.createRange();
  r.selectNodeContents(node);
  r.collapse(!atEnd);
  sel.removeAllRanges(); sel.addRange(r);
}

/* Epigraph and note are real block types rather than a styled paragraph:
   they survive export, markdown round-trip and re-import as themselves. */
function makeEpigraph(text, author) {
  const fig = document.createElement("figure");
  fig.className = "epigraph";
  const q = document.createElement("blockquote");
  q.textContent = text || "";
  const cap = document.createElement("figcaption");
  cap.textContent = author || "";
  fig.appendChild(q); fig.appendChild(cap);
  return fig;
}
function makeNoteBlock(text) {
  const el = document.createElement("aside");
  el.className = "note";
  el.textContent = text || "";
  return el;
}

function applyBlockStyle(area, style, tl) {
  const cur = topBlock(area);
  const curStyle = blockStyleOf(cur);
  if (!cur) {
    if (["p", "h1", "h2", "h3", "blockquote"].indexOf(style) >= 0) {
      document.execCommand("formatBlock", false, style === "p" ? "p" : style);
    }
    return;
  }
  const next = curStyle === style ? "p" : style;

  if (next === "epigraph" || next === "note") {
    const text = cur.textContent || "";
    const el = next === "epigraph"
      ? makeEpigraph(text || tl("epi_text_hint"), "")
      : makeNoteBlock(text || tl("note_text_hint"));
    cur.replaceWith(el);
    caretTo(next === "epigraph" ? el.firstChild : el, true);
    return;
  }
  if (curStyle === "epigraph" || curStyle === "note") {
    const p = document.createElement("p");
    p.textContent = (cur.textContent || "").trim();
    cur.replaceWith(p);
    caretTo(p, true);
    if (next !== "p") document.execCommand("formatBlock", false, next);
    return;
  }
  document.execCommand("formatBlock", false, next);
}

/* ============================================================
   Header / footer slots
   ============================================================ */
const SLOT_TOKENS = ["", "title", "chapter", "author", "page", "pages"];
function resolveSlot(value, ctx) {
  switch (value) {
    case "": return "";
    case "title": return ctx.title || "";
    case "chapter": return ctx.chapter || "";
    case "author": return ctx.author || "";
    case "page": return String(ctx.page);
    case "pages": return ctx.page + " / " + ctx.total;
    default: return String(value || "");
  }
}
/* Even/odd mirroring is the book convention: the outer edge of the spread
   keeps the same slot, so left and right swap on every second page. */
function slotsFor(band, pageIdx, pg) {
  const mirror = pg.mirror && pageIdx % 2 === 1;
  return mirror ? { l: band.r, c: band.c, r: band.l } : { l: band.l, c: band.c, r: band.r };
}

/* ============================================================
   The drawn page stack: sheets, running heads, numbers, footnotes
   ============================================================ */
function PageLayer({ pages, geom, pg, ctx, onFootnote, onMeasure }) {
  const boxes = useRef([]);
  useEffect(() => {
    if (!onMeasure) return;
    onMeasure(boxes.current.map((el) => (el ? el.offsetHeight : 0)));
  });
  return (
    <div className="ed-pagelayer">
      {pages.map((pageNotes, i) => {
        const bare = pg.firstBare && i === 0;
        const hdr = slotsFor(pg.hdr, i, pg);
        const ftr = slotsFor(pg.ftr, i, pg);
        const num = (parseInt(pg.numFrom, 10) || 1) + i;
        const sctx = { ...ctx, page: num, total: pages.length };
        return (
          <div className="ed-pagebox" key={i}
            style={{ top: i * (geom.pageH + geom.gap), width: geom.pageW, height: geom.pageH }}>
            <div className="ed-page-margins"
              style={{ top: geom.mt, left: geom.ml, right: geom.mr, bottom: geom.mb }} />
            {pg.hdr.on && !bare && (
              <div className="ed-band ed-band--hdr"
                style={{ top: Math.max(6, geom.mt * 0.42), left: geom.ml, right: geom.mr }}>
                <span>{resolveSlot(hdr.l, sctx)}</span>
                <span>{resolveSlot(hdr.c, sctx)}</span>
                <span>{resolveSlot(hdr.r, sctx)}</span>
              </div>
            )}
            {pg.ftr.on && !bare && (
              <div className="ed-band ed-band--ftr"
                style={{ bottom: Math.max(6, geom.mb * 0.36), left: geom.ml, right: geom.mr }}>
                <span>{resolveSlot(ftr.l, sctx)}</span>
                <span>{resolveSlot(ftr.c, sctx)}</span>
                <span>{resolveSlot(ftr.r, sctx)}</span>
              </div>
            )}
            <div className="ed-fnotes" ref={(el) => { boxes.current[i] = el; }}
              style={{ left: geom.ml, width: geom.contentW, bottom: geom.mb }}>
              {pageNotes.map((f) => (
                <div className="ed-fnote" key={f.id} onMouseDown={(e) => { e.preventDefault(); onFootnote(f.id); }}>
                  <sup>{f.n}</sup>
                  <span>{f.text || "…"}</span>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ============================================================
   Page setup — one compact panel, never a ribbon
   ============================================================ */
function NumField({ value, min, max, step, suffix, onChange }) {
  const [draft, setDraft] = useState(String(value));
  const last = useRef(value);
  useEffect(() => { if (last.current !== value) { last.current = value; setDraft(String(value)); } }, [value]);
  function commit(raw) {
    const n = parseFloat(String(raw).replace(",", "."));
    const v = isFinite(n) ? Math.min(max, Math.max(min, n)) : value;
    last.current = v;
    setDraft(String(v));
    if (v !== value) onChange(v);
  }
  return (
    <label className="pset-num">
      <input className="mono" inputMode="decimal" value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={(e) => commit(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") { e.preventDefault(); e.target.blur(); }
          else if (e.key === "ArrowUp" || e.key === "ArrowDown") {
            e.preventDefault();
            commit((parseFloat(draft.replace(",", ".")) || 0) + (e.key === "ArrowUp" ? 1 : -1) * (step || 1));
          }
        }} />
      {suffix && <span className="pset-suffix mono">{suffix}</span>}
    </label>
  );
}

function Seg({ options, value, onChange, compact }) {
  return (
    <div className={"pset-seg" + (compact ? " pset-seg--compact" : "")}>
      {options.map((o) => (
        <button key={o.v} className={"pset-seg-b" + (o.v === value ? " on" : "")}
          title={o.title || o.l} onClick={() => onChange(o.v)}>{o.l}</button>
      ))}
    </div>
  );
}

function PageSetupPanel({ page, lang, editorFont, onFont, onChange, onClose }) {
  const tl = T(lang || "en");
  const [tab, setTab] = useState("page");
  const set = (patch) => onChange(patch);
  const slotOpts = [
    { v: "", l: "—", title: tl("pset_slot_none") },
    { v: "title", l: tl("pset_slot_title_s"), title: tl("pset_slot_title") },
    { v: "chapter", l: tl("pset_slot_chapter_s"), title: tl("pset_slot_chapter") },
    { v: "page", l: tl("pset_slot_page_s"), title: tl("pset_slot_page") },
  ];
  const band = (key) => {
    const b = page[key];
    return (
      <div className="pset-band">
        <div className="pset-row pset-row--switch">
          <span className="pset-lbl">{tl(key === "hdr" ? "pset_header" : "pset_footer")}</span>
          <button className={"pset-toggle" + (b.on ? " on" : "")} role="switch" aria-checked={b.on}
            onClick={() => set({ [key]: { on: !b.on } })}><span /></button>
        </div>
        {b.on && ["l", "c", "r"].map((slot) => (
          <div className="pset-row" key={slot}>
            <span className="pset-lbl pset-lbl--sub">{tl("pset_slot_" + slot)}</span>
            <Seg compact options={slotOpts} value={SLOT_TOKENS.indexOf(b[slot]) >= 0 ? b[slot] : ""}
              onChange={(v) => set({ [key]: { [slot]: v } })} />
          </div>
        ))}
      </div>
    );
  };

  return (
    <aside className="ed-setup" onMouseDown={(e) => e.stopPropagation()}>
      <div className="pset-head">
        <div className="pset-tabs">
          {["page", "type", "head"].map((k) => (
            <button key={k} className={"pset-tab" + (tab === k ? " on" : "")}
              onClick={() => setTab(k)}>{tl("pset_tab_" + k)}</button>
          ))}
        </div>
        <button className="icon-btn" onClick={onClose} title={tl("pset_close")}><Icon name="close" size={16} /></button>
      </div>

      <div className="pset-body">
        {tab === "page" && (
          <>
            <div className="pset-row">
              <span className="pset-lbl">{tl("pset_size")}</span>
              <Seg options={PAGE_SIZE_ORDER.map((k) => ({ v: k, l: k === "custom" ? tl("pset_custom_s") : (PAGE_SIZES[k] ? k.toUpperCase() : k) }))}
                value={page.size} onChange={(v) => set({ size: v })} />
            </div>
            {page.size === "custom" && (
              <div className="pset-row">
                <span className="pset-lbl pset-lbl--sub">{tl("pset_custom")}</span>
                <div className="pset-pair">
                  <NumField value={page.w} min={60} max={600} step={1} suffix="mm" onChange={(v) => set({ w: v })} />
                  <span className="pset-x mono">×</span>
                  <NumField value={page.h} min={60} max={900} step={1} suffix="mm" onChange={(v) => set({ h: v })} />
                </div>
              </div>
            )}
            <div className="pset-row">
              <span className="pset-lbl">{tl("pset_orient")}</span>
              <Seg options={[{ v: "portrait", l: tl("pset_portrait") }, { v: "landscape", l: tl("pset_landscape") }]}
                value={page.orient} onChange={(v) => set({ orient: v })} />
            </div>
            <div className="pset-sep" />
            <div className="pset-row pset-row--grid">
              <span className="pset-lbl">{tl("pset_margins")}</span>
              <div className="pset-margins">
                {[["mt", "pset_m_top"], ["mb", "pset_m_bottom"], ["ml", "pset_m_left"], ["mr", "pset_m_right"]].map(([k, label]) => (
                  <div className="pset-margin" key={k}>
                    <span className="mono">{tl(label)}</span>
                    <NumField value={page[k]} min={0} max={100} step={1} suffix="mm" onChange={(v) => set({ [k]: v })} />
                  </div>
                ))}
              </div>
            </div>
            <div className="pset-sep" />
            <div className="pset-row">
              <span className="pset-lbl">{tl("pset_zoom")}</span>
              <div className="pset-slider">
                <input type="range" min="0.5" max="1.6" step="0.05" value={page.zoom}
                  onChange={(e) => set({ zoom: parseFloat(e.target.value) })} />
                <span className="mono">{Math.round(page.zoom * 100)}%</span>
              </div>
            </div>
          </>
        )}

        {tab === "type" && (
          <>
            <div className="pset-row">
              <span className="pset-lbl">{tl("pset_font")}</span>
              <Seg options={["book", "article", "mono"].map((f) => ({ v: f, l: FONT_LABEL[f].split(" ")[0], title: FONT_LABEL[f] }))}
                value={editorFont} onChange={onFont} />
            </div>
            <div className="pset-row">
              <span className="pset-lbl">{tl("pset_fontsize")}</span>
              <NumField value={page.fontSize} min={6} max={48} step={0.5} suffix="pt" onChange={(v) => set({ fontSize: v })} />
            </div>
            <div className="pset-row">
              <span className="pset-lbl">{tl("pset_leading")}</span>
              <NumField value={page.leading} min={1} max={3} step={0.05} suffix="×" onChange={(v) => set({ leading: v })} />
            </div>
            <div className="pset-row">
              <span className="pset-lbl">{tl("pset_align")}</span>
              <Seg options={[{ v: "left", l: tl("al_left_s"), title: tl("al_left") },
                { v: "justify", l: tl("al_just_s"), title: tl("al_just") },
                { v: "center", l: tl("al_center_s"), title: tl("al_center") },
                { v: "right", l: tl("al_right_s"), title: tl("al_right") }]}
                value={page.align} onChange={(v) => set({ align: v })} />
            </div>
            <div className="pset-sep" />
            <div className="pset-row">
              <span className="pset-lbl">{tl("pset_indent")}</span>
              <NumField value={page.indent} min={0} max={6} step={0.1} suffix="em" onChange={(v) => set({ indent: v })} />
            </div>
            <div className="pset-row">
              <span className="pset-lbl">{tl("pset_pad")}</span>
              <div className="pset-pair">
                <NumField value={page.padL} min={0} max={8} step={0.25} suffix="em" onChange={(v) => set({ padL: v })} />
                <span className="pset-x mono">·</span>
                <NumField value={page.padR} min={0} max={8} step={0.25} suffix="em" onChange={(v) => set({ padR: v })} />
              </div>
            </div>
            <div className="pset-row">
              <span className="pset-lbl">{tl("pset_space")}</span>
              <div className="pset-pair">
                <NumField value={page.spaceBefore} min={0} max={4} step={0.05} suffix="em" onChange={(v) => set({ spaceBefore: v })} />
                <span className="pset-x mono">·</span>
                <NumField value={page.spaceAfter} min={0} max={4} step={0.05} suffix="em" onChange={(v) => set({ spaceAfter: v })} />
              </div>
            </div>
            <div className="pset-row pset-row--switch">
              <span className="pset-lbl">{tl("pset_hyphens")}</span>
              <button className={"pset-toggle" + (page.hyphens ? " on" : "")} role="switch" aria-checked={page.hyphens}
                onClick={() => set({ hyphens: !page.hyphens })}><span /></button>
            </div>
          </>
        )}

        {tab === "head" && (
          <>
            {band("hdr")}
            <div className="pset-sep" />
            {band("ftr")}
            <div className="pset-sep" />
            <div className="pset-row pset-row--switch">
              <span className="pset-lbl">{tl("pset_first_bare")}</span>
              <button className={"pset-toggle" + (page.firstBare ? " on" : "")} role="switch" aria-checked={page.firstBare}
                onClick={() => set({ firstBare: !page.firstBare })}><span /></button>
            </div>
            <div className="pset-row pset-row--switch">
              <span className="pset-lbl">{tl("pset_mirror")}</span>
              <button className={"pset-toggle" + (page.mirror ? " on" : "")} role="switch" aria-checked={page.mirror}
                onClick={() => set({ mirror: !page.mirror })}><span /></button>
            </div>
            <div className="pset-row">
              <span className="pset-lbl">{tl("pset_num_from")}</span>
              <NumField value={page.numFrom} min={1} max={9999} step={1} suffix="" onChange={(v) => set({ numFrom: Math.round(v) })} />
            </div>
          </>
        )}
      </div>
      <div className="pset-foot mono">{tl("pset_hint")}</div>
    </aside>
  );
}

/* ---- footnote editor: a small popover, never a modal ---- */
function FootnotePopup({ n, text, anchor, lang, onApply, onDelete, onClose }) {
  const tl = T(lang || "en");
  const [val, setVal] = useState(text || "");
  const [style, setStyle] = useState({ opacity: 0 });
  const boxRef = useRef(null);
  const inputRef = useRef(null);
  useEffect(() => { setTimeout(() => inputRef.current && inputRef.current.focus(), 30); }, []);
  useEffect(() => {
    const el = boxRef.current;
    if (!el || !anchor) return;
    const m = 12, w = el.offsetWidth, h = el.offsetHeight;
    const left = Math.max(m, Math.min(anchor.x - w / 2, window.innerWidth - w - m));
    let top = anchor.y + 10;
    if (top + h + m > window.innerHeight) top = anchor.y - h - 24;
    /* a marker can sit anywhere in a long document — clamp into the
       viewport rather than trusting the anchor to be on screen */
    top = Math.max(m, Math.min(top, window.innerHeight - h - m));
    setStyle({ left, top, opacity: 1 });
  }, [anchor]);
  return (
    <div className="link-pop-scrim" onMouseDown={() => { onApply(val); onClose(); }}>
      <div ref={boxRef} className="link-pop fn-pop" style={style} onMouseDown={(e) => e.stopPropagation()}>
        <div className="fn-pop-head">
          <span className="fn-pop-n mono">{tl("fn_label")} {n}</span>
          <button className="link-pop-rm" title={tl("fn_delete")} onMouseDown={(e) => { e.preventDefault(); onDelete(); }}>
            <Icon name="trash" size={14} />
          </button>
        </div>
        <textarea ref={inputRef} className="fn-pop-input" rows={3} value={val}
          placeholder={tl("fn_placeholder")}
          onChange={(e) => setVal(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") { e.preventDefault(); onApply(val); onClose(); }
            else if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); onApply(val); onClose(); }
          }} />
        <button className="link-pop-ok" onMouseDown={(e) => { e.preventDefault(); onApply(val); onClose(); }}>
          {tl("fn_apply")}
        </button>
      </div>
    </div>
  );
}

Object.assign(window, {
  PX_PER_MM, PAGE_SIZES, PAGE_SIZE_ORDER, pageDims, pageGeometry, paginateArea, serializeArea,
  fnDefs, fnText, setFnText, renumberFootnotes, footnoteList,
  splitScenes, joinScenes, sceneEls, makeSceneEl,
  BLOCK_STYLES, topBlock, blockStyleOf, applyBlockStyle, makeEpigraph, makeNoteBlock, caretTo,
  resolveSlot, slotsFor, SLOT_TOKENS, PageLayer, PageSetupPanel, FootnotePopup, Seg, NumField,
});
