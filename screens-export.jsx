/* ============================================================
   Sipru. — Book preview + Export builder
   ============================================================ */

/* ============================================================
   Preview — the same sheet the editor lays out, minus the caret.

   It used to be a separate "book" layout: one endless column with its own
   typography and no styling at all for tables, code, task lists or any of
   the newer block types, on a sheet whose size had nothing to do with the
   page set up in the editor. Everything below reuses the editor's own
   geometry, pagination and stylesheet instead, so what the writer sees in
   preview is the page they are actually writing — A4 stays A4, landscape
   stays landscape, and a block can only look wrong in preview if it also
   looks wrong in the editor.
   ============================================================ */
function BookPreview({ html, title, page, ctx, lang, font, onMeta }) {
  const scrollRef = useRef(null);
  const areaRef = useRef(null);
  const [showTop, setShowTop] = useState(false);
  const [anchorsOpen, setAnchorsOpen] = useState(false);
  const [avail, setAvail] = useState(0);
  const [pages, setPages] = useState([[]]);
  const reserveRef = useRef([]);
  const passRef = useRef(0);
  const tl = T(lang || "en");

  const pg = page || (window.SipruStore ? window.SipruStore.PAGE_DEFAULTS : {});
  const pgKey = JSON.stringify(pg);
  const geom = useMemo(() => pageGeometry(pg, avail), [pgKey, avail]);

  const { headings, htmlWithIds } = useMemo(() => {
    const div = document.createElement("div");
    div.innerHTML = html || "";
    const hs = [];
    let idx = 0;
    div.querySelectorAll("h1, h2, h3, h4, h5, h6").forEach((el) => {
      const id = "bh-" + (idx++);
      el.id = id;
      hs.push({ id, level: parseInt(el.tagName[1]), text: el.textContent.trim() });
    });
    return { headings: hs, htmlWithIds: div.innerHTML };
  }, [html]);

  const metaRef = useRef(onMeta);
  metaRef.current = onMeta;
  const geomRef = useRef(geom);
  geomRef.current = geom;
  const totalRef = useRef(1);
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => {
      setShowTop(el.scrollTop > 320);
      /* the footer's page counter has to follow the preview's own scroll,
         not stay on wherever the editor was left */
      const g = geomRef.current;
      const cyc = g.pageH + g.gap;
      const at = Math.max(1, Math.min(totalRef.current, Math.floor((el.scrollTop + cyc * 0.35) / cyc) + 1));
      if (metaRef.current) metaRef.current({ page: at, total: totalRef.current });
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);
  useEffect(() => {
    totalRef.current = pages.length;
    if (onMeta) onMeta({ page: Math.min(pages.length, 1), total: pages.length });
  }, [pages.length]);

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
  }, []);

  function repaginate() {
    const area = areaRef.current;
    if (!area) return;
    const notes = footnoteList(area);
    const byId = {};
    notes.forEach((f) => { byId[f.id] = f; });
    const res = paginateArea(area, geom, reserveRef.current);
    setPages(res.notes.map((ids) => ids.map((id) => byId[id]).filter(Boolean)));
  }
  useEffect(() => { passRef.current = 0; repaginate(); }, [htmlWithIds, geom]);
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

  function scrollToTop() {
    scrollRef.current && scrollRef.current.scrollTo({ top: 0, behavior: "smooth" });
  }

  /* The anchor list sits in the flow above the text, so closing it shortens
     the page. Measuring before that happens aimed the scroll at where the
     heading used to be and overshot it by the height of the list. The
     target is recorded here and the scroll runs from an effect below, once
     the list has actually gone and the layout is final. */
  const [pendingAnchor, setPendingAnchor] = useState(null);
  useEffect(() => {
    if (!pendingAnchor) return;
    setPendingAnchor(null);
    const target = areaRef.current && areaRef.current.querySelector("#" + pendingAnchor);
    if (!target || !scrollRef.current) return;
    const containerTop = scrollRef.current.getBoundingClientRect().top;
    const targetTop = target.getBoundingClientRect().top;
    scrollRef.current.scrollBy({ top: targetTop - containerTop - 24, behavior: "smooth" });
  }, [pendingAnchor]);

  const paperH = pages.length * (geom.pageH + geom.gap) - geom.gap;
  const paperStyle = {
    width: geom.pageW, height: paperH,
    "--ed-font": font || "var(--book)",
    "--pg-font": geom.fontPx + "px",
    "--pg-lead": pg.leading,
    "--pg-align": pg.align === "justify" ? "justify" : pg.align,
    "--pg-indent": pg.indent + "em",
    "--pg-padl": pg.padL + "em",
    "--pg-padr": pg.padR + "em",
    "--pg-before": pg.spaceBefore + "em",
    "--pg-after": pg.spaceAfter + "em",
    "--pg-hyphens": pg.hyphens ? "auto" : "manual",
    "--pg-scale": geom.scale,
  };

  return (
    <div className="preview-scroll" ref={scrollRef}>
      {headings.length > 0 && (
        <div className={"preview-anchors" + (anchorsOpen ? " open" : "")}>
          <button className="anchors-toggle" onClick={() => setAnchorsOpen((o) => !o)}>
            <Icon name="panel" size={14} />
            <span>{anchorsOpen ? tl("anchors_hide") : tl("anchors_show")}</span>
          </button>
          {anchorsOpen && (
            <nav className="anchors-nav">
              {headings.map((h) => (
                <button key={h.id} className={"anchor-item anchor-item--h" + h.level}
                  onClick={() => { setAnchorsOpen(false); setPendingAnchor(h.id); }}>
                  {h.text}
                </button>
              ))}
            </nav>
          )}
        </div>
      )}
      <div className="ed-paper ed-paper--preview" style={paperStyle}>
        <PageLayer pages={pages} geom={geom} pg={pg} ctx={ctx || { title: title || "", chapter: title || "" }}
          onFootnote={() => {}} onMeasure={onFootnoteHeights} />
        <div ref={areaRef} className="ed-area ed-area--ro"
          style={{ top: geom.mt, left: geom.ml, width: geom.contentW }}
          dangerouslySetInnerHTML={{ __html: htmlWithIds }} />
      </div>
      <div className="ed-tail" />
      {showTop && (
        <button className="scroll-top-btn" onClick={scrollToTop} title={tl("scroll_top")}>
          <Icon name="chevron" size={18} style={{ transform: "rotate(180deg)" }} />
        </button>
      )}
    </div>
  );
}

/* ---- html → plain / markdown ---- */
/* Reading plain textContent ran every block together — a whole chapter
   arrived as one unbroken wall of prose with no paragraph anywhere in it,
   because textContent knows nothing about block boundaries. Walk instead,
   keeping one blank line between blocks and honouring <br> inside them. */
const TXT_BLOCK = { P: 1, DIV: 1, H1: 1, H2: 1, H3: 1, H4: 1, H5: 1, H6: 1, BLOCKQUOTE: 1,
  LI: 1, UL: 1, OL: 1, FIGURE: 1, FIGCAPTION: 1, ASIDE: 1, HR: 1, PRE: 1, TABLE: 1, TR: 1, SECTION: 1 };
function blockText(root) {
  const parts = [];
  let cur = "";
  const flush = () => {
    const s = cur.split("\n").map((l) => l.replace(/[^\S\n]+/g, " ").trim()).join("\n").replace(/^\n+|\n+$/g, "");
    if (s) parts.push(s);
    cur = "";
  };
  (function walk(n) {
    for (let c = n.firstChild; c; c = c.nextSibling) {
      if (c.nodeType === 3) { cur += c.nodeValue; continue; }
      if (c.nodeType !== 1) continue;
      if (c.tagName === "BR") { cur += "\n"; continue; }
      /* A code block is the one place whitespace *is* the content: its text
         is taken verbatim, indentation and blank lines intact, instead of
         being run through the space-collapsing pass below. */
      if (c.tagName === "PRE") {
        flush();
        parts.push((c.textContent || "").replace(/^\n+|\n+$/g, ""));
        continue;
      }
      /* Cells of one row stay on that row, separated rather than merged —
         "AnnaIvanova28Moscow" is not a table, it is a mistake. */
      if (c.tagName === "TD" || c.tagName === "TH") {
        if (cur.trim()) cur += "  |  ";
        walk(c);
        continue;
      }
      /* An image contributes its alt text, so a caption-bearing figure does
         not silently vanish from a plain-text export. */
      if (c.tagName === "IMG") {
        const alt = (c.getAttribute("alt") || "").trim();
        if (alt) cur += "[" + alt + "]";
        continue;
      }
      if (c.tagName === "INPUT") { cur += c.hasAttribute("checked") ? "[x] " : "[ ] "; continue; }
      if (TXT_BLOCK[c.tagName]) { flush(); walk(c); flush(); }
      else walk(c);
    }
  })(root);
  flush();
  return parts.join("\n\n");
}
function htmlToText(html) {
  const d = document.createElement("div"); d.innerHTML = html || "";
  const box = d.querySelector(".fn-defs");
  let tail = "";
  if (box) {
    const notes = Array.prototype.map.call(box.children, (def, i) => (i + 1) + ". " + (def.textContent || ""));
    box.remove();
    if (notes.length) tail = "\n\n---\n" + notes.join("\n");
  }
  return (blockText(d) + tail).replace(/\n{3,}/g, "\n\n").trim();
}
/* A literal *, _, ~, [, ] in prose would otherwise be misread as markup by
   mdToHTML (formats.js) on the way back in — escape it so the vault's md
   files and this export both round-trip losslessly. mdToHTML strips a
   matching \ off these five characters and no others. */
function mdEscapeText(s) {
  return String(s == null ? "" : s).replace(/[\\*_~[\]`$]/g, (c) => "\\" + c);
}

/* Inline serializer: walks bold/italic/underline/strike/link nodes (the
   editor toolbar's full inline set) into their markdown/HTML-passthrough
   form. Recursive so nested combinations (a bold link, italic inside a
   quote) come back through mdToHTML the way they went in — a plain
   textContent grab, which is what this replaced, silently threw all of
   that formatting away on every export and every vault write alike. */
function inlineToMd(node) {
  let out = "";
  node.childNodes.forEach((n) => {
    if (n.nodeType === 3) { out += mdEscapeText(n.textContent); return; }
    if (n.nodeType !== 1) return;
    const t = n.tagName.toLowerCase();
    if (t === "br") { out += "  \n"; return; }
    if (t === "sup" && n.classList && n.classList.contains("fn")) {
      out += "[^" + (n.textContent || "").trim() + "]";
      return;
    }
    /* Literal, never escaped and never re-entered: whatever is between the
       backticks is the code. A longer fence is used when the code itself
       contains backticks, so the span still closes where it should. */
    if (t === "code") {
      const raw = n.textContent || "";
      let tick = "`";
      while (raw.indexOf(tick) >= 0) tick += "`";
      const pad = /^`|`$/.test(raw) ? " " : "";
      out += tick + pad + raw + pad + tick;
      return;
    }
    /* An image is a leaf: it has no text of its own, so it is written from
       its attributes rather than from any inner content. */
    if (t === "img") {
      const src = n.getAttribute("src") || "";
      const title = n.getAttribute("title");
      out += "![" + mdEscapeText(n.getAttribute("alt") || "") + "](" + src +
        (title ? ' "' + title.replace(/"/g, "") + '"' : "") + ")";
      return;
    }
    /* A task checkbox is written by the list serializer as "[x] " / "[ ] "
       ahead of the item text; reaching one here means it is loose in prose,
       where it has no markdown spelling worth inventing. */
    if (t === "input") return;
    const inner = inlineToMd(n);
    if (t === "strong" || t === "b") out += "**" + inner + "**";
    else if (t === "em" || t === "i") out += "*" + inner + "*";
    else if (t === "u") out += "<u>" + inner + "</u>";
    else if (t === "mark") out += "==" + inner + "==";
    else if (t === "s" || t === "strike") out += "~~" + inner + "~~";
    else if (t === "a") {
      const href = n.getAttribute("href") || "";
      const title = n.getAttribute("title");
      /* <https://…> when the link shows nothing but its own URL */
      if (!title && inner.trim() === href.trim() && /^(https?:|mailto:)/i.test(href)) out += "<" + href + ">";
      else out += "[" + inner + "](" + href + (title ? ' "' + title.replace(/"/g, "") + '"' : "") + ")";
    }
    else out += inner;
  });
  return out;
}

/* A list goes back out with its nesting intact: each level is indented by
   two spaces per depth, and a task item keeps its "[x]"/"[ ]" box. Reading
   every <li> with querySelectorAll would flatten the tree, so only the
   direct children of this list are walked and any nested list inside an
   item recurses one level deeper. */
function listToMd(el, depth, pad) {
  const ordered = el.tagName.toLowerCase() === "ol";
  /* A nested item has to be indented past its parent's marker to count as
     nested at all — two spaces clears "- " but not "1. ", which other
     renderers then read as a sibling rather than a sub-item. */
  pad = pad || "";
  let out = "", i = 1;
  Array.prototype.forEach.call(el.children, (li) => {
    if (li.tagName.toLowerCase() !== "li") return;
    const sub = [];
    /* the item's own text is everything except the lists nested under it */
    const holder = document.createElement("div");
    Array.prototype.forEach.call(li.childNodes, (c) => {
      const tag = c.nodeType === 1 ? c.tagName.toLowerCase() : "";
      if (tag === "ul" || tag === "ol") sub.push(c);
      else holder.appendChild(c.cloneNode(true));
    });
    const box = li.querySelector(":scope > input[type=checkbox]")
      ? (li.querySelector(":scope > input[type=checkbox]").hasAttribute("checked") ? "[x] " : "[ ] ")
      : "";
    const text = inlineToMd(holder).replace(/\s*\n\s*/g, " ").trim();
    const marker = ordered ? (i++) + ". " : "- ";
    out += pad + marker + box + text + "\n";
    sub.forEach((sl) => { out += listToMd(sl, depth + 1, pad + " ".repeat(marker.length)); });
  });
  return out;
}

/* A quote inside a quote is another <blockquote>, not text — reading the
   whole thing with the inline serializer flattened all three levels of
   "> / >> / >>>" into one run-together line. Each nested quote is walked on
   its own and comes back carrying one more ">" than its parent. */
function quoteToMd(el) {
  const parts = [];
  let run = null;
  Array.prototype.forEach.call(el.childNodes, (n) => {
    const tag = n.nodeType === 1 ? n.tagName.toLowerCase() : "";
    if (tag === "blockquote") {
      run = null;
      parts.push(quoteToMd(n).replace(/^/gm, "> "));
      return;
    }
    if (!run) { run = document.createElement("div"); parts.push(run); }
    run.appendChild(n.cloneNode(true));
  });
  return parts.map((p) => (typeof p === "string" ? p : inlineToMd(p)))
    .filter((t) => t.trim()).join("\n").replace(/\s+$/, "");
}

/* A paragraph that happens to begin with "#", ">", "-" or "1." would be
   read back as a heading, a quote or a list rather than the prose it is.
   Only the first character needs the backslash, and only when it sits at
   the very start — escaping these everywhere would litter ordinary
   sentences with slashes. */
function guardBlockStart(text) {
  /* Every line, not just the first: a paragraph carries its own line breaks
     through as "  \n", so a "# не заголовок" sitting after one starts a line
     of its own on the way back in and would be read as a heading there. */
  return String(text || "").split("\n").map((line) =>
    line.replace(/^(\s*)(#{1,6}\s|>|[-*+]\s|\d+[.)]\s|={3,}$|-{3,}$)/,
      (all, pad, marker) => pad + "\\" + marker)).join("\n");
}

function htmlToMd(html) {
  const d = document.createElement("div"); d.innerHTML = html || "";
  let out = "";
  /* Verbatim blocks are parked behind a sentinel while the whitespace of
     the surrounding prose is normalised, then dropped back in untouched —
     otherwise the blank-line collapse below would rewrite the inside of a
     code block. */
  const verbatim = [];
  const park = (text) => { verbatim.push(text); return "\x01v" + (verbatim.length - 1) + "\x02"; };
  /* Footnote definitions leave the flow and come back as standard
     markdown definitions at the end of the file. */
  const notes = [];
  const box = d.querySelector(".fn-defs");
  if (box) {
    Array.prototype.forEach.call(box.children, (def) => notes.push((def.textContent || "").replace(/\s*\n\s*/g, " ")));
    box.remove();
  }
  d.childNodes.forEach((n) => {
    if (n.nodeType === 3) { out += mdEscapeText(n.textContent); return; }
    const t = n.tagName ? n.tagName.toLowerCase() : "";
    const cls = n.getAttribute ? (n.getAttribute("class") || "") : "";
    if (t === "hr" && cls.indexOf("page-break") >= 0) { out += "\n<!-- page-break -->\n\n"; return; }
    if (t === "hr" && cls.indexOf("scene-sep") >= 0) {
      out += "\n<!-- scene: " + (n.getAttribute("data-t") || "").replace(/[|\-]{2,}|-->/g, " ") +
        " | " + (n.getAttribute("data-s") || "draft") + " -->\n\n";
      return;
    }
    if (t === "figure" && cls.indexOf("epigraph") >= 0) {
      const body = n.querySelector("blockquote");
      const cap = n.querySelector("figcaption");
      const text = body ? inlineToMd(body) : "";
      const author = cap ? inlineToMd(cap) : "";
      if (!text.trim() && !author.trim()) return;
      out += "\n::: epigraph\n" + text + "\n" + (author.trim() ? "-- " + author + "\n" : "") + ":::\n\n";
      return;
    }
    /* Verbatim blocks go back out character for character — no inline
       serializer, no backslash escaping. A code fence is grown past any
       run of backticks inside the code so it still closes correctly. */
    if (t === "pre") {
      const code = n.querySelector("code");
      const raw = (code || n).textContent || "";
      if (cls.indexOf("math") >= 0) { out += "\n" + park("$$\n" + raw + "\n$$") + "\n\n"; return; }
      let fence = "```";
      while (new RegExp("^\\s*" + fence, "m").test(raw)) fence += "`";
      out += "\n" + park(fence + (n.getAttribute("data-lang") || "") + "\n" + raw + "\n" + fence) + "\n\n";
      return;
    }
    if (t === "table") {
      const rows = Array.prototype.map.call(n.querySelectorAll("tr"), (tr) =>
        Array.prototype.map.call(tr.children, (c) => inlineToMd(c).replace(/\n/g, " ").replace(/\|/g, "\\|").trim()));
      if (!rows.length) return;
      const width = rows.reduce((w, r) => Math.max(w, r.length), 0);
      const pad = (r) => { const c = r.slice(); while (c.length < width) c.push(""); return "| " + c.join(" | ") + " |"; };
      /* the rule row carries each column's alignment back out as :--- / :---: / ---: */
      const head = n.querySelector("tr");
      const cells = head ? Array.prototype.slice.call(head.children) : [];
      const rule = [];
      for (let i = 0; i < width; i++) {
        const cl = cells[i] ? (cells[i].getAttribute("class") || "") : "";
        rule.push(cl.indexOf("ta-c") >= 0 ? ":---:" : cl.indexOf("ta-r") >= 0 ? "---:"
          : cl.indexOf("ta-l") >= 0 ? ":---" : "---");
      }
      out += "\n" + pad(rows[0]) + "\n| " + rule.join(" | ") + " |\n" +
        rows.slice(1).map(pad).join("\n") + "\n\n";
      return;
    }
    if (t === "aside" && cls.indexOf("note") >= 0) {
      const text = inlineToMd(n);
      if (!text.trim()) return;
      out += "\n::: note\n" + text + "\n:::\n\n";
      return;
    }
    const txt = inlineToMd(n);
    if (!txt.trim() && t !== "hr") return;
    const al = cls.match(/\bal-(l|c|r|j)\b/);
    if (/^h[1-6]$/.test(t)) out += "\n" + "#".repeat(+t.charAt(1)) + " " + txt + "\n\n";
    else if (t === "blockquote") out += quoteToMd(n).replace(/^/gm, "> ") + "\n\n";
    else if (t === "hr") out += "\n---\n\n";
    else if (t === "ul" || t === "ol") out += "\n" + listToMd(n, 0) + "\n";
    else if (t === "p" && al) out += '<p class="al-' + al[1] + '">' + txt.replace(/\n/g, " ") + "</p>\n\n";
    else out += guardBlockStart(txt) + "\n\n";
  });
  out = out.replace(/\n{3,}/g, "\n\n").trim();
  if (notes.length) {
    out += "\n\n" + notes.map((text, i) => "[^" + (i + 1) + "]: " + text).join("\n");
  }
  return out.replace(/\x01v(\d+)\x02/g, (_, i) => verbatim[+i]);
}

/* The footnote store is not prose: a plain-text export lists the notes
   under the text, numbered, instead of running them into the last
   paragraph. */
function splitNotes(html) {
  const d = document.createElement("div"); d.innerHTML = html || "";
  const box = d.querySelector(".fn-defs");
  const notes = [];
  if (box) {
    Array.prototype.forEach.call(box.children, (def) => notes.push(def.textContent || ""));
    box.remove();
  }
  return { html: d.innerHTML, notes };
}

/* ============================================================
   Book export preview — real pages, not a flowing column.

   The exported PDF/HTML/DOCX are still built by buildBookHTML/buildBookDocx
   below and are untouched by this: those remain the flat, print-CSS-driven
   documents they always were. This is only what the export modal *shows*
   while you set it up — and it reuses the editor's own pagination engine
   (paginateArea / PageLayer from editor-page.jsx) so a footnote lands on
   the physical page it's actually on, exactly like the editor itself.
   ============================================================ */
const EXPORT_FONT_MAP = { book: "var(--book)", article: "var(--book-alt)", mono: "var(--mono)" };
const PAGE_MM = {
  a4:     { w: 210,   h: 297 },
  a5:     { w: 148,   h: 210 },
  b5:     { w: 176,   h: 250 },
  a6:     { w: 105,   h: 148 },
  letter: { w: 215.9, h: 279.4 },
  legal:  { w: 215.9, h: 355.6 },
};
function pageDimsMM(pg) {
  const base = (pg && pg.size === "custom") ? { w: pg.w || 210, h: pg.h || 297 } : (PAGE_MM[pg && pg.size] || PAGE_MM.a4);
  return (pg && pg.orient === "landscape") ? { w: base.h, h: base.w } : base;
}

/* The export always uses the project's own page setup (size, margins,
   typography) — the same one shown in the editor's Page Setup panel.
   Headers/footers are left off: the actual HTML/PDF export doesn't draw
   them either (only the .docx export does), so the preview doesn't
   promise a running head it can't deliver. */
function exportPageGeom(pg) {
  const p = pg || {};
  return {
    ...p,
    hdr: { on: false, l: "", c: "", r: "" }, ftr: { on: false, l: "", c: "", r: "" },
    firstBare: true, mirror: false, numFrom: 1, zoom: 1, noFluid: true,
  };
}

/* A static, single-page sheet — the title page and the table of contents
   don't paginate, they just need to look like the same kind of page. */
function StaticSheet({ geom, children }) {
  return (
    <div className="ed-paper exp-sheet" style={{ width: geom.pageW, height: geom.pageH }}>
      <div className="ed-pagelayer">
        <div className="ed-pagebox" style={{ top: 0, width: geom.pageW, height: geom.pageH }} />
      </div>
      <div className="exp-sheet-body" style={{ top: geom.mt, left: geom.ml, width: geom.contentW, height: geom.contentH, fontSize: (16 * geom.scale) + "px" }}>
        {children}
      </div>
    </div>
  );
}

/* One chapter, paginated for real: same iterative footnote-reservation
   pass the editor runs (a footnote pushes into the page it's rendered on,
   which can change how much text fits above it, which can change which
   page the footnote lands on — converges in a couple of passes). */
function PaginatedChapter({ html, geom, title }) {
  const areaRef = useRef(null);
  const reserveRef = useRef([]);
  const passRef = useRef(0);
  const [pages, setPages] = useState([[]]);

  function repaginate() {
    const area = areaRef.current;
    if (!area) return;
    const notes = footnoteList(area);
    const byId = {};
    notes.forEach((f) => { byId[f.id] = f; });
    const res = paginateArea(area, geom, reserveRef.current);
    setPages(res.notes.map((ids) => ids.map((id) => byId[id]).filter(Boolean)));
  }

  useEffect(() => {
    /* The chapter's title heads its first page, exactly as it does in the
       built HTML/PDF and .docx — the preview is meant to be what the
       export produces, and the title arrived here as a prop that nothing
       ever rendered. It goes through the same pagination as the prose, so
       an <h1> stranded at the foot of a page moves on with its text. */
    if (areaRef.current) {
      areaRef.current.innerHTML = (title ? "<h1>" + escText(title) + "</h1>" : "") + (html || "");
    }
    reserveRef.current = [];
    passRef.current = 0;
    repaginate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [html, geom, title]);

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
  const paperStyle = {
    width: geom.pageW, height: paperH,
    "--pg-font": geom.fontPx + "px", "--pg-lead": geom.leading,
    "--pg-align": geom.align === "justify" ? "justify" : geom.align,
    "--pg-indent": geom.indent + "em", "--pg-padl": geom.padL + "em", "--pg-padr": geom.padR + "em",
    "--pg-before": geom.spaceBefore + "em", "--pg-after": geom.spaceAfter + "em",
    "--pg-hyphens": geom.hyphens ? "auto" : "manual",
  };

  return (
    <div className="ed-paper" style={paperStyle}>
      <PageLayer pages={pages} geom={geom} pg={geom.pg} ctx={{}} onFootnote={() => {}} onMeasure={onFootnoteHeights} />
      <div ref={areaRef} className="ed-area exp-area"
        style={{ top: geom.mt, left: geom.ml, width: geom.contentW }} />
    </div>
  );
}

function BookPagedPreview({ project, opts, lang }) {
  const tl = T(lang || "en");
  const scrollRef = useRef(null);
  const [avail, setAvail] = useState(0);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const measure = () => { if (el.clientWidth) setAvail(Math.max(160, el.clientWidth - 48)); };
    measure();
    let ro = null;
    if (window.ResizeObserver) { ro = new ResizeObserver(measure); ro.observe(el); }
    else window.addEventListener("resize", measure);
    return () => { if (ro) ro.disconnect(); else window.removeEventListener("resize", measure); };
  }, []);

  const pgBase = useMemo(() => exportPageGeom(opts.page), [JSON.stringify(opts.page)]);
  const geom = useMemo(() => {
    const g = pageGeometry(pgBase, avail);
    g.leading = pgBase.leading; g.align = pgBase.align; g.indent = pgBase.indent;
    g.padL = pgBase.padL; g.padR = pgBase.padR; g.spaceBefore = pgBase.spaceBefore; g.spaceAfter = pgBase.spaceAfter;
    g.hyphens = pgBase.hyphens; g.pg = pgBase;
    return g;
  }, [pgBase, avail]);

  const chapters = project.chapters.filter((c) => opts.include[c.id] !== false);
  const fontVar = EXPORT_FONT_MAP[opts.font] || EXPORT_FONT_MAP.book;

  return (
    <div className="exp-pages" ref={scrollRef} style={{ "--ed-font": fontVar }}>
      {opts.titlePage && (
        <StaticSheet geom={geom}>
          <div className="exp-title-page">
            <div className="b-kicker">SIPRU.</div>
            <h1>{project.title}</h1>
            {project.synopsis && <p className="b-syn">{project.synopsis}</p>}
          </div>
        </StaticSheet>
      )}
      {opts.toc && (
        <StaticSheet geom={geom}>
          <div className="exp-toc-page">
            <h2>{tl("toc_title")}</h2>
            <ol>{chapters.map((c) => <li key={c.id}>{c.title}</li>)}</ol>
          </div>
        </StaticSheet>
      )}
      {chapters.map((c) => <PaginatedChapter key={c.id} html={c.content || ""} geom={geom} title={c.title} />)}
      {!chapters.length && <div className="exp-pages-empty mono">{tl("exp_of")}</div>}
    </div>
  );
}

/* Same real pagination as the book preview above, for a single note —
   the page count and numbering the export shows now always match what
   the editor itself paginates the note to. */
function NotePagedPreview({ note, opts }) {
  const scrollRef = useRef(null);
  const [avail, setAvail] = useState(0);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const measure = () => { if (el.clientWidth) setAvail(Math.max(160, el.clientWidth - 48)); };
    measure();
    let ro = null;
    if (window.ResizeObserver) { ro = new ResizeObserver(measure); ro.observe(el); }
    else window.addEventListener("resize", measure);
    return () => { if (ro) ro.disconnect(); else window.removeEventListener("resize", measure); };
  }, []);

  const pgBase = useMemo(() => exportPageGeom(opts.page), [JSON.stringify(opts.page)]);
  const geom = useMemo(() => {
    const g = pageGeometry(pgBase, avail);
    g.leading = pgBase.leading; g.align = pgBase.align; g.indent = pgBase.indent;
    g.padL = pgBase.padL; g.padR = pgBase.padR; g.spaceBefore = pgBase.spaceBefore; g.spaceAfter = pgBase.spaceAfter;
    g.hyphens = pgBase.hyphens; g.pg = pgBase;
    return g;
  }, [pgBase, avail]);

  const fontVar = EXPORT_FONT_MAP[opts.font] || EXPORT_FONT_MAP.book;

  return (
    <div className="exp-pages" ref={scrollRef} style={{ "--ed-font": fontVar }}>
      {opts.titlePage && (
        <StaticSheet geom={geom}>
          <div className="exp-title-page">
            <div className="b-kicker">SIPRU.</div>
            <h1>{note.title}</h1>
          </div>
        </StaticSheet>
      )}
      <PaginatedChapter html={note.content || ""} geom={geom} title={note.title} />
    </div>
  );
}

/* Print-to-PDF.

   On the web a new tab is fine. Inside Tauri window.open() has no browser
   chrome to come back from — on Android's WebView it can strand the user on
   a blank screen — so the print-ready document is rendered into a hidden
   same-origin iframe and printed from there, which keeps the app window
   underneath and gives the OS print dialog ("Save as PDF" on macOS, the
   Microsoft Print to PDF printer on Windows).

   Returns false when there is no print pipeline to use, so the caller can
   fall back to saving the HTML rather than appearing to do nothing. */
function printHTML(html) {
  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  /* Off-screen rather than display:none — a hidden frame has no layout, and
     some engines then print a blank page. */
  frame.style.cssText = "position:fixed;left:-10000px;top:0;width:820px;height:1160px;border:0;opacity:0;";
  document.body.appendChild(frame);
  const cleanup = () => setTimeout(() => frame.remove(), 60000);
  try {
    const doc = frame.contentDocument;
    doc.open(); doc.write(html); doc.close();
    const go = () => {
      try {
        frame.contentWindow.focus();
        frame.contentWindow.print();
      } catch (e) { /* nothing else to try — the HTML fallback already ran */ }
      cleanup();
    };
    /* Give webfonts and layout a beat; onload alone fires before either. */
    if (doc.readyState === "complete") setTimeout(go, 500);
    else frame.contentWindow.addEventListener("load", () => setTimeout(go, 500));
    return true;
  } catch (e) {
    frame.remove();
    return false;
  }
}

function downloadBlob(name, mime, content) {
  /* Inside the Tauri app (desktop and Android alike) an <a download> click
     doesn't reach a real save location — Android's WebView in particular
     has nowhere to put it. Route through the native save dialog + fs
     write instead, so the user picks a destination via the system picker
     exactly like any other Android app. Plain web/browser build (no
     window.__TAURI__) keeps the original <a download> behavior. */
  const tauri = window.__TAURI__;
  if (tauri && tauri.dialog && tauri.fs) {
    const bytes = content instanceof Uint8Array ? content : new TextEncoder().encode(content);
    const ext = name.includes(".") ? name.slice(name.lastIndexOf(".") + 1) : "";
    tauri.dialog.save({ defaultPath: name, filters: ext ? [{ name: ext.toUpperCase(), extensions: [ext] }] : undefined })
      .then((path) => path && tauri.fs.writeFile(path, bytes))
      .catch(() => {});
    return;
  }
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

/* Styling shared by every HTML/PDF export so an epigraph, a note, a
   footnote, a scene break and a forced page break look — and paginate —
   the way they do in the editor. */
const BLOCK_CSS = `
    sup.fn { font-size: .68em; vertical-align: super; line-height: 0; color: #c2542f; }
    .fn-defs { display: none; }
    .b-notes { margin: 1.8em 0 0; padding: .9em 0 0 1.4em; border-top: 1px solid #e2ddcf;
      font-size: 9.5pt; line-height: 1.45; color: #5c564a; }
    .b-notes li { margin-bottom: .3em; text-align: left; text-indent: 0; }
    figure.epigraph { margin: 1.8em 0 2em auto; max-width: 24em; font-style: italic; color: #5c564a; }
    figure.epigraph blockquote { margin: 0; font-style: italic; color: inherit; text-align: right; }
    figure.epigraph figcaption { margin-top: .45em; text-align: right; font-style: normal;
      font-size: .86em; letter-spacing: .02em; color: #8a8474; }
    aside.note { margin: 1.3em 0; padding: .55em 0 .55em .95em; border-left: 2px solid #ddd7c8;
      font-size: .92em; color: #5c564a; text-indent: 0; }
    hr.page-break { border: none; height: 0; margin: 0; page-break-after: always; break-after: page; }
    hr.page-break::after { content: none; }
    hr.scene-sep { border: none; text-align: center; margin: 1.7em 0; }
    hr.scene-sep::after { content: "· · ·"; color: #b9b2a1; letter-spacing: .2em; }
    p.al-l { text-align: left; } p.al-j { text-align: justify; }
    p.al-c { text-align: center; text-indent: 0; } p.al-r { text-align: right; text-indent: 0; }
    /* justify stretches every forced line of a paragraph, not just its
       wrapped ones — a paragraph built from manual line breaks (an
       address, a diagram, a few short verse lines) has too few words per
       line for that, and blows apart into huge gaps. */
    p:has(br) { text-align: left; }
    /* ---- the wider markdown set, printed the way the editor shows it ---- */
    blockquote blockquote { margin: .6em 0; border-left-color: #ddd7c8; }
    li > ul, li > ol { margin: .35em 0 .1em; }
    li.task { list-style: none; margin-left: -1.15em; }
    li.task > input[type="checkbox"] { margin-right: .5em; }
    mark { background: #f6e2b8; color: inherit; padding: .05em .18em; }
    img { max-width: 100%; height: auto; display: block; margin: 1.2em auto; }
    table { width: 100%; border-collapse: collapse; margin: 1.3em 0; text-indent: 0;
      font-size: .94em; page-break-inside: avoid; break-inside: avoid; }
    th, td { border: 1px solid #ddd7c8; padding: .42em .6em; text-align: left; vertical-align: top; }
    thead th { background: #f4f0e6; font-weight: 600; }
    .ta-l { text-align: left; } .ta-c { text-align: center; } .ta-r { text-align: right; }
    pre { margin: 1.3em 0; padding: .85em 1em; text-indent: 0; overflow-x: auto;
      background: #f4f0e6; border: 1px solid #e2ddcf; border-radius: 6px;
      page-break-inside: avoid; break-inside: avoid; }
    pre code { display: block; background: none; border: none; padding: 0;
      font-size: .84em; line-height: 1.5; white-space: pre-wrap; }
    pre[data-lang]::before { content: attr(data-lang); display: block; margin: -.25em 0 .5em;
      font-family: 'JetBrains Mono', monospace; font-size: .66em; letter-spacing: .08em;
      text-transform: uppercase; color: #a09a89; }
    code { font-family: 'JetBrains Mono', monospace; font-size: .87em;
      background: #f4f0e6; border: 1px solid #e2ddcf; border-radius: 3px; padding: .1em .35em; }
    h4 { font-size: 1.05em; font-weight: 600; margin: 1.1em 0 .35em; text-indent: 0; }
    h5 { font-size: 1em; font-weight: 600; margin: 1em 0 .3em; text-indent: 0; }
    h6 { font-size: .92em; font-weight: 600; margin: 1em 0 .3em; text-indent: 0;
      letter-spacing: .04em; text-transform: uppercase; }
`;

/* Footnote definitions live hidden inside the text; on the way out they
   become a numbered block under the chapter they belong to. */
function escText(s) {
  return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function chapterBody(html) {
  const { html: body, notes } = splitNotes(html);
  if (!notes.length) return body;
  return body + '<ol class="b-notes">' + notes.map((n) => "<li>" + escText(n) + "</li>").join("") + "</ol>";
}

/* The sheet, margins and typography here all come from the project's own
   page setup (opts.page) — the same one shown in the editor's Page Setup
   panel. There is no separate "layout" choice in the export modal any
   more; export always renders exactly what the editor is set up to. */
function buildBookHTML(project, opts) {
  const chapters = project.chapters.filter((c) => opts.include[c.id] !== false);
  const pg = opts.page || {};
  const d = pageDimsMM(pg);
  const mt = pg.mt != null ? pg.mt : 20, mr = pg.mr != null ? pg.mr : 18, mb = pg.mb != null ? pg.mb : 20, ml = pg.ml != null ? pg.ml : 18;
  const screenEm = Math.round(d.w / 5.4) + "em";
  const screenPad = Math.round(Math.min(ml, mr) * 2.6) + "px";
  const fontStack = opts.font === "mono"
    ? "'JetBrains Mono', monospace"
    : opts.font === "article" ? "'Lora', Georgia, serif" : "'Source Serif 4', Georgia, serif";
  let body = "";
  if (opts.titlePage) {
    body += `<section class="b-title"><div class="b-kicker">SIPRU.</div><h1>${project.title}</h1>${project.synopsis ? `<p class="b-syn">${project.synopsis}</p>` : ""}</section>`;
  }
  if (opts.toc) {
    body += `<section class="b-toc"><h2>${t("toc_title", opts.lang || "ru")}</h2><ol>${chapters.map((c) => `<li><span>${c.title}</span></li>`).join("")}</ol></section>`;
  }
  chapters.forEach((c, i) => {
    body += `<section class="b-chap"><h1>${escText(c.title)}</h1>${chapterBody(c.content || "")}</section>`;
  });
  return `<!doctype html><html><head><meta charset="utf-8"><title>${project.title}</title>
  <link href="https://fonts.googleapis.com/css2?family=Source+Serif+4:ital,wght@0,400;0,600;1,400&family=Lora:wght@400;600&family=JetBrains+Mono&display=swap" rel="stylesheet">
  <style>
    @page { size: ${d.w}mm ${d.h}mm; margin: ${mt}mm ${mr}mm ${mb}mm ${ml}mm; }
    * { box-sizing: border-box; }
    body { font-family: ${fontStack}; font-size: ${pg.fontSize || 12}pt; line-height: ${pg.leading || 1.7}; color: #1f1d18; background: #fff; margin: 0; -webkit-font-smoothing: antialiased; text-rendering: optimizeLegibility; overflow-wrap: break-word; word-break: break-word; }
    .b-kicker { font-family: 'JetBrains Mono', monospace; letter-spacing: .42em; font-size: 9pt; color: #c2542f; text-transform: uppercase; }
    .b-title h1 { font-size: 30pt; line-height: 1.06; margin: 18px 0 16px; font-weight: 600; letter-spacing: -.015em; }
    .b-syn { font-style: italic; color: #6b6457; font-size: 13pt; margin: 0 auto; max-width: 30em; }
    .b-toc h2 { font-size: 15pt; font-weight: 600; margin: 0 0 .9em; letter-spacing: -.01em; }
    .b-toc ol { line-height: 2.05; padding-left: 1.3em; color: #3a382f; margin: 0; }
    h1 { font-size: 21pt; font-weight: 600; margin: 0 0 .8em; letter-spacing: -.01em; }
    h2 { font-size: 15pt; font-weight: 600; margin: 1.3em 0 .4em; }
    h3 { font-size: 12.5pt; font-weight: 600; margin: 1.1em 0 .3em; }
    p { margin: 0 0 ${pg.spaceAfter != null ? pg.spaceAfter : 0.6}em; text-indent: ${pg.indent != null ? pg.indent : 1.5}em; text-align: ${(pg.align || "justify") === "justify" ? "justify" : pg.align}; }
    h1 + p, h2 + p, h3 + p, h4 + p, h5 + p, h6 + p, blockquote + p, ul + p, ol + p, hr + p, p:first-child { text-indent: 0; }
    blockquote { margin: 1.1em 1.6em; font-style: italic; color: #555; }
    ul, ol { padding-left: 1.5em; margin: .4em 0; } li { margin-bottom: .3em; text-align: left; }
    hr { border: none; text-align: center; margin: 1.6em 0; }
    hr:after { content: "✶"; color: #c2542f; }
${BLOCK_CSS}
    /* on-screen preview: a single clean, centred book column */
    @media screen {
      body { padding: 60px 0 80px; }
      body > section { max-width: ${screenEm}; margin: 0 auto; padding: 0 ${screenPad}; }
      .b-title { text-align: center; padding-bottom: 46px; margin-bottom: 46px; border-bottom: 1px solid #e9e3d5; }
      .b-toc { padding-bottom: 40px; margin-bottom: 40px; border-bottom: 1px solid #e9e3d5; }
      .b-chap + .b-chap { margin-top: 44px; }
      .b-chap h1 { padding-top: 26px; }
      .b-chap:first-of-type h1 { padding-top: 0; }
    }
    /* print / PDF: real pagination */
    @media print {
      .b-title { text-align: center; padding-top: 34vh; page-break-after: always; }
      .b-toc { page-break-after: always; padding-top: 12%; }
      .b-chap { page-break-before: always; break-before: page; }
      .b-chap:first-of-type { page-break-before: avoid; break-before: avoid; }
      h1 { padding-top: 6%; }
    }
  </style></head><body>${body}</body></html>`;
}

function buildPlain(project, opts, md) {
  const chapters = project.chapters.filter((c) => opts.include[c.id] !== false);
  let out = "";
  if (opts.titlePage) out += project.title.toUpperCase() + "\n" + (project.synopsis || "") + "\n\n\n";
  if (opts.toc) out += t("toc_title", opts.lang || "en").toUpperCase() + "\n" + chapters.map((c, i) => (i + 1) + ". " + c.title).join("\n") + "\n\n\n";
  /* The chapter's own title heads its text. Without it the table of
     contents promises ten chapters and the body delivers one unbroken run
     of prose with nothing marking where any of them begin. */
  chapters.forEach((c) => {
    const title = (c.title || "").trim();
    if (title) out += (md ? "# " + title : title.toUpperCase()) + "\n\n";
    out += (md ? htmlToMd(c.content) : htmlToText(c.content)) + "\n\n\n";
  });
  return out.trim() + "\n";
}

/* Real Office Open XML .docx — same chapter selection and book options. */
function buildBookDocx(project, opts) {
  const chapters = project.chapters.filter((c) => opts.include[c.id] !== false);
  const sections = [];
  if (opts.toc) {
    sections.push({
      heading: t("toc_title", opts.lang || "en"),
      html: "<ol>" + chapters.map((c) => "<li>" + c.title.replace(/[<>&]/g, " ") + "</li>").join("") + "</ol>",
      pageBreakBefore: opts.titlePage,
    });
  }
  chapters.forEach((c, i) => {
    sections.push({
      heading: c.title || "",
      html: c.content || "",
      pageBreakBefore: i > 0 || opts.toc || opts.titlePage,
    });
  });
  return SipruFormats.buildDocx({
    title: opts.titlePage ? project.title : "",
    subtitle: opts.titlePage ? (project.synopsis || "") : "",
    sections, font: opts.font,
    page: opts.page || null, bookTitle: project.title, author: opts.author || "",
  });
}

function ExportModal({ store, projectId, onClose, initialFormat, onToast }) {
  const [closing, close] = useDismiss(onClose);
  const project = store.get().projects.find((p) => p.id === projectId);
  const lang = (store.get().user && store.get().user.lang) || "en";
  const tl = T(lang);
  /* The book already has a chosen writer's font — asking again here would
     just be the same choice with extra steps. */
  const defaultFont = (store.get().user && store.get().user.editorFont) || "book";
  /* the chosen output format is now a first-class choice made up front,
     not four buttons in the footer — the preview reads the same either way */
  const [fmt, setFmt] = useState(initialFormat || "pdf");
  const [opts, setOpts] = useState(() => ({
    titlePage: true, toc: true, font: defaultFont, lang,
    include: {},
  }));
  const set = (patch) => setOpts((o) => ({ ...o, ...patch }));
  if (!project) return null;

  /* Page setup travels with the export: typography in the HTML/PDF build,
     and real running heads in the .docx one. */
  const page = store.resolvePage(project.page);
  const eopts = { ...opts, page, author: (store.get().user && store.get().user.name) || "" };
  const previewHTML = useMemo(() => buildBookHTML(project, eopts), [project, opts, JSON.stringify(page)]);
  const included = project.chapters.filter((c) => opts.include[c.id] !== false).length;

  function doExport(fmt) {
    const base = project.title.replace(/[^\wа-яёА-ЯЁ\- ]+/gi, "").trim() || "book";
    if (fmt === "pdf") {
      if (window.__TAURI__) {
        if (printHTML(buildBookHTML(project, eopts))) { onToast(tl("exp_toast_pdf")); return; }
        /* No print pipeline available — hand over the print-ready HTML
           through the native picker rather than doing nothing at all. */
        downloadBlob(base + ".html", "text/html;charset=utf-8", buildBookHTML(project, eopts));
        onToast(tl("exp_toast_pdf_tauri"));
        return;
      }
      const w = window.open("", "_blank");
      if (!w) { onToast(tl("exp_err_popup")); return; }
      w.document.write(buildBookHTML(project, eopts));
      w.document.close();
      setTimeout(() => { w.focus(); w.print(); }, 700);
      onToast(tl("exp_toast_pdf"));
    } else if (fmt === "docx") {
      try {
        downloadBlob(base + ".docx", SipruFormats.DOCX_MIME, buildBookDocx(project, eopts));
        onToast(tl("exp_toast_docx_real"));
      } catch (e) { onToast(tl("exp_err_docx")); }
    } else if (fmt === "txt") {
      downloadBlob(base + ".txt", "text/plain;charset=utf-8", buildPlain(project, eopts, false));
      onToast(tl("exp_toast_txt"));
    } else if (fmt === "md") {
      downloadBlob(base + ".md", "text/markdown;charset=utf-8", buildPlain(project, eopts, true));
      onToast(tl("exp_toast_md"));
    }
  }

  return (
    <div className={"modal-scrim" + closing} onMouseDown={close}>
      <div className="modal export-modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="export-side">
          <div className="modal-head">
            <div><div className="eyebrow">{tl("exp_book_eyebrow")}</div><h2 className="modal-title">{project.title}</h2></div>
            <div className="modal-head-actions">
              <button className="pset-reset" onClick={() => set({
                titlePage: true, toc: true, font: defaultFont,
              })} title={tl("exp_reset")}><Icon name="reset" size={13} /> {tl("exp_reset")}</button>
              <button className="icon-btn" onClick={close}><Icon name="close" size={18} /></button>
            </div>
          </div>

          <div className="exp-scroll">
            <div className="exp-grp">
              <div className="exp-grp-h mono">{tl("exp_format_label")}</div>
              <div className="exp-formats">
                {[["pdf", "export"], ["docx", "note"], ["txt", "type"], ["md", "code"]].map(([f, icon]) => (
                  <button key={f} className={"exp-fmt" + (fmt === f ? " on" : "")} onClick={() => setFmt(f)}>
                    <Icon name={icon} size={20} />
                    <span className="mono">{f.toUpperCase()}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="exp-grp">
              <div className="exp-grp-h mono">{tl("exp_chapters_label")} · {included} {tl("exp_of")} {project.chapters.length}</div>
              <ul className="exp-chaps">
                {project.chapters.map((c, i) => (
                  <li key={c.id} className="exp-chap">
                    <label>
                      <input type="checkbox" checked={opts.include[c.id] !== false}
                        onChange={(e) => set({ include: { ...opts.include, [c.id]: e.target.checked } })} />
                      <span className="exp-chap-num mono">{String(i + 1).padStart(2, "0")}</span>
                      <span className="exp-chap-t">{c.title}</span>
                    </label>
                  </li>
                ))}
              </ul>
            </div>

            <div className="exp-grp">
              <div className="exp-grp-h mono">{tl("exp_section_structure")}</div>
              {[["titlePage","exp_title_page"],["toc","exp_toc"]].map(([k,lk]) => (
                <label key={k} className="exp-toggle">
                  <span className={"switch" + (opts[k] ? " on" : "")} onClick={() => set({ [k]: !opts[k] })}><span /></span>
                  {tl(lk)}
                </label>
              ))}
            </div>
          </div>

          <div className="exp-actions">
            <button className="btn btn--accent exp-go" onClick={() => doExport(fmt)}>
              <Icon name="download" size={16} /> {tl("exp_do")} · {fmt.toUpperCase()}
            </button>
          </div>
        </div>

        <div className="export-preview export-preview--pages">
          <div className="export-preview-inner export-preview-inner--pages">
            <BookPagedPreview project={project} opts={eopts} lang={lang} />
          </div>
        </div>
      </div>
    </div>
  );
}

function buildNoteHTML(note, opts) {
  const fontStack = opts.font === "mono"
    ? "'JetBrains Mono', monospace"
    : opts.font === "article" ? "'Lora', Georgia, serif" : "'Source Serif 4', Georgia, serif";
  const pg = opts.page || {};
  const d = pageDimsMM(pg);
  const mt = pg.mt != null ? pg.mt : 20, mr = pg.mr != null ? pg.mr : 18, mb = pg.mb != null ? pg.mb : 20, ml = pg.ml != null ? pg.ml : 18;
  const screenEm = Math.round(d.w / 5.4) + "em";
  const screenPad = Math.round(Math.min(ml, mr) * 2.6) + "px";
  return `<!doctype html><html><head><meta charset="utf-8"><title>${note.title}</title>
  <link href="https://fonts.googleapis.com/css2?family=Source+Serif+4:ital,wght@0,400;0,600;1,400&family=Lora:wght@400;600&family=JetBrains+Mono&display=swap" rel="stylesheet">
  <style>
    @page { size: ${d.w}mm ${d.h}mm; margin: ${mt}mm ${mr}mm ${mb}mm ${ml}mm; }
    * { box-sizing: border-box; }
    body { font-family: ${fontStack}; font-size: ${pg.fontSize || 12}pt; line-height: ${pg.leading || 1.7}; color: #1f1d18; background: #fff; margin: 0; -webkit-font-smoothing: antialiased; overflow-wrap: break-word; word-break: break-word; }
    h1 { font-size: 21pt; font-weight: 600; margin: 0 0 .8em; letter-spacing: -.01em; }
    h2 { font-size: 15pt; font-weight: 600; margin: 1.3em 0 .4em; }
    h3 { font-size: 12.5pt; font-weight: 600; margin: 1.1em 0 .3em; }
    p { margin: 0 0 ${pg.spaceAfter != null ? pg.spaceAfter : 0.8}em; text-indent: ${pg.indent != null ? pg.indent : 0}em; text-align: ${(pg.align || "left") === "justify" ? "justify" : pg.align || "left"}; }
    p:first-child { text-indent: 0; }
    blockquote { margin: 1.1em 1.6em; font-style: italic; color: #555; border-left: 3px solid #c2542f; padding-left: 1em; }
    ul, ol { padding-left: 1.5em; margin: .4em 0; } li { margin-bottom: .3em; }
    hr { border: none; text-align: center; margin: 1.6em 0; }
    hr:after { content: "✶"; color: #c2542f; }
${BLOCK_CSS}
    .n-head { margin-bottom: 2em; padding-bottom: 1em; border-bottom: 1px solid #e9e3d5; }
    .n-kicker { font-family: 'JetBrains Mono', monospace; letter-spacing: .42em; font-size: 9pt; color: #c2542f; text-transform: uppercase; margin-bottom: 10px; }
    .n-title { font-size: 26pt; font-weight: 600; letter-spacing: -.015em; line-height: 1.1; margin: 0; }
    @media screen {
      body { padding: 60px 0 80px; }
      .n-wrap { max-width: ${screenEm}; margin: 0 auto; padding: 0 ${screenPad}; }
    }
  </style></head><body><div class="n-wrap">${opts.titlePage ? `<div class="n-head"><div class="n-kicker">SIPRU.</div><h1 class="n-title">${note.title}</h1></div>` : ""}${chapterBody(note.content || "")}</div></body></html>`;
}

function NoteExportModal({ note, onClose, onToast, lang, defaultFont, page }) {
  const [closing, close] = useDismiss(onClose);
  const tl = T(lang || "en");
  const [fmt, setFmt] = useState("pdf");
  const [opts, setOpts] = useState({ font: defaultFont || "book", titlePage: true });
  const set = (patch) => setOpts((o) => ({ ...o, ...patch }));
  const eopts = { ...opts, page };

  function doExport(fmt) {
    const base = note.title.replace(/[^\wа-яёА-ЯЁ\- ]+/gi, "").trim() || "note";
    if (fmt === "pdf") {
      if (window.__TAURI__) {
        if (printHTML(buildNoteHTML(note, eopts))) { onToast(tl("exp_toast_pdf")); return; }
        downloadBlob(base + ".html", "text/html;charset=utf-8", buildNoteHTML(note, eopts));
        onToast(tl("exp_toast_pdf_tauri"));
        return;
      }
      const w = window.open("", "_blank");
      if (!w) { onToast(tl("exp_err_popup")); return; }
      w.document.write(buildNoteHTML(note, eopts));
      w.document.close();
      setTimeout(() => { w.focus(); w.print(); }, 700);
      onToast(tl("exp_toast_pdf"));
    } else if (fmt === "docx") {
      try {
        downloadBlob(base + ".docx", SipruFormats.DOCX_MIME, SipruFormats.buildDocx({
          title: opts.titlePage ? note.title : "",
          sections: [{ html: note.content || "" }],
          font: opts.font, page: page || null,
        }));
        onToast(tl("exp_toast_docx_real"));
      } catch (e) { onToast(tl("exp_err_docx")); }
    } else if (fmt === "txt") {
      downloadBlob(base + ".txt", "text/plain;charset=utf-8", htmlToText(note.content));
      onToast(tl("exp_toast_txt"));
    } else if (fmt === "md") {
      downloadBlob(base + ".md", "text/markdown;charset=utf-8", "# " + note.title + "\n\n" + htmlToMd(note.content));
      onToast(tl("exp_toast_md"));
    }
  }

  return (
    <div className={"modal-scrim" + closing} onMouseDown={close}>
      <div className="modal export-modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="export-side">
          <div className="modal-head">
            <div><div className="eyebrow">{tl("exp_note_eyebrow")}</div><h2 className="modal-title">{note.title}</h2></div>
            <div className="modal-head-actions">
              <button className="pset-reset" onClick={() => set({
                font: defaultFont || "book", titlePage: true,
              })} title={tl("exp_reset")}><Icon name="reset" size={13} /> {tl("exp_reset")}</button>
              <button className="icon-btn" onClick={close}><Icon name="close" size={18} /></button>
            </div>
          </div>

          <div className="exp-scroll">
            <div className="exp-grp">
              <div className="exp-grp-h mono">{tl("exp_format_label")}</div>
              <div className="exp-formats">
                {[["pdf", "export"], ["docx", "note"], ["txt", "type"], ["md", "code"]].map(([f, icon]) => (
                  <button key={f} className={"exp-fmt" + (fmt === f ? " on" : "")} onClick={() => setFmt(f)}>
                    <Icon name={icon} size={20} />
                    <span className="mono">{f.toUpperCase()}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="exp-grp">
              <div className="exp-grp-h mono">{tl("exp_section_decoration")}</div>
              <label className="exp-toggle">
                <span className={"switch" + (opts.titlePage ? " on" : "")} onClick={() => set({ titlePage: !opts.titlePage })}><span /></span>
                {tl("exp_note_title_opt")}
              </label>
            </div>
          </div>

          <div className="exp-actions">
            <button className="btn btn--accent exp-go" onClick={() => doExport(fmt)}>
              <Icon name="download" size={16} /> {tl("exp_do")} · {fmt.toUpperCase()}
            </button>
          </div>
        </div>

        <div className="export-preview export-preview--pages">
          <div className="export-preview-inner export-preview-inner--pages">
            <NotePagedPreview note={note} opts={eopts} />
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { BookPreview, ExportModal, NoteExportModal, htmlToText, htmlToMd, downloadBlob, buildBookDocx });
