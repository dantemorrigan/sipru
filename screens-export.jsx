/* ============================================================
   Sipru. — Book preview + Export builder
   ============================================================ */

function BookPreview({ html, title, edition, lang }) {
  const scrollRef = useRef(null);
  const contentRef = useRef(null);
  const [showTop, setShowTop] = useState(false);
  const [anchorsOpen, setAnchorsOpen] = useState(false);
  const tl = T(lang || "en");

  const { headings, htmlWithIds } = useMemo(() => {
    const div = document.createElement("div");
    /* the preview is a reading view: footnote definitions come out of the
       flow and are set under the text, numbered */
    div.innerHTML = chapterBody(html || "");
    const hs = [];
    let idx = 0;
    div.querySelectorAll("h1, h2, h3").forEach((el) => {
      const id = "bh-" + (idx++);
      el.id = id;
      hs.push({ id, level: parseInt(el.tagName[1]), text: el.textContent.trim() });
    });
    return { headings: hs, htmlWithIds: div.innerHTML };
  }, [html]);

  const pageCount = useMemo(() => {
    const div = document.createElement("div");
    div.innerHTML = html || "";
    const words = (div.textContent || "").trim().split(/\s+/).filter(Boolean).length;
    return Math.max(1, Math.round(words / 280));
  }, [html]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => setShowTop(el.scrollTop > 320);
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  function scrollToTop() {
    scrollRef.current && scrollRef.current.scrollTo({ top: 0, behavior: "smooth" });
  }

  function scrollToHeading(id) {
    const target = contentRef.current && contentRef.current.querySelector("#" + id);
    if (!target || !scrollRef.current) return;
    const containerTop = scrollRef.current.getBoundingClientRect().top;
    const targetTop = target.getBoundingClientRect().top;
    scrollRef.current.scrollBy({ top: targetTop - containerTop - 80, behavior: "smooth" });
  }

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
                  onClick={() => { scrollToHeading(h.id); setAnchorsOpen(false); }}>
                  {h.text}
                </button>
              ))}
            </nav>
          )}
        </div>
      )}
      <div className={"book book--" + edition}>
        <div className="book-page">
          <div className="book-content" ref={contentRef} dangerouslySetInnerHTML={{ __html: htmlWithIds }} />
        </div>
        <div className="book-foot mono">
          {tl("preview_label")} · ≈&thinsp;{pageCount}&thinsp;{lang === "ru" ? "стр." : "p."}
        </div>
      </div>
      {showTop && (
        <button className="scroll-top-btn" onClick={scrollToTop} title={tl("scroll_top")}>
          <Icon name="chevron" size={18} style={{ transform: "rotate(180deg)" }} />
        </button>
      )}
    </div>
  );
}

/* ---- html → plain / markdown ---- */
function htmlToText(html) {
  const d = document.createElement("div"); d.innerHTML = html || "";
  const box = d.querySelector(".fn-defs");
  let tail = "";
  if (box) {
    const notes = Array.prototype.map.call(box.children, (def, i) => (i + 1) + ". " + (def.textContent || ""));
    box.remove();
    if (notes.length) tail = "\n\n---\n" + notes.join("\n");
  }
  return ((d.textContent || "") + tail).replace(/\n{3,}/g, "\n\n").trim();
}
/* A literal *, _, ~, [, ] in prose would otherwise be misread as markup by
   mdToHTML (formats.js) on the way back in — escape it so the vault's md
   files and this export both round-trip losslessly. mdToHTML strips a
   matching \ off these five characters and no others. */
function mdEscapeText(s) {
  return String(s == null ? "" : s).replace(/[\\*_~[\]]/g, (c) => "\\" + c);
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
    const inner = inlineToMd(n);
    if (t === "strong" || t === "b") out += "**" + inner + "**";
    else if (t === "em" || t === "i") out += "*" + inner + "*";
    else if (t === "u") out += "<u>" + inner + "</u>";
    else if (t === "s" || t === "strike") out += "~~" + inner + "~~";
    else if (t === "a") out += "[" + inner + "](" + (n.getAttribute("href") || "") + ")";
    else out += inner;
  });
  return out;
}

function htmlToMd(html) {
  const d = document.createElement("div"); d.innerHTML = html || "";
  let out = "";
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
    if (t === "aside" && cls.indexOf("note") >= 0) {
      const text = inlineToMd(n);
      if (!text.trim()) return;
      out += "\n::: note\n" + text + "\n:::\n\n";
      return;
    }
    const txt = inlineToMd(n);
    if (!txt.trim() && t !== "hr") return;
    const al = cls.match(/\bal-(l|c|r|j)\b/);
    if (t === "h1") out += "\n# " + txt + "\n\n";
    else if (t === "h2") out += "\n## " + txt + "\n\n";
    else if (t === "h3") out += "\n### " + txt + "\n\n";
    else if (t === "blockquote") out += "> " + txt.replace(/\n/g, "\n> ") + "\n\n";
    else if (t === "hr") out += "\n---\n\n";
    else if (t === "ul") n.querySelectorAll("li").forEach((li) => out += "- " + inlineToMd(li) + "\n"), out += "\n";
    else if (t === "ol") { let i = 1; n.querySelectorAll("li").forEach((li) => out += (i++) + ". " + inlineToMd(li) + "\n"); out += "\n"; }
    else if (t === "p" && al) out += '<p class="al-' + al[1] + '">' + txt.replace(/\n/g, " ") + "</p>\n\n";
    else out += txt + "\n\n";
  });
  out = out.replace(/\n{3,}/g, "\n\n").trim();
  if (notes.length) {
    out += "\n\n" + notes.map((text, i) => "[^" + (i + 1) + "]: " + text).join("\n");
  }
  return out;
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

const MARGINS = { narrow: "14mm", normal: "22mm", wide: "32mm" };
const SCREEN_PADS = { narrow: "12px", normal: "28px", wide: "60px" };
const PAPER = {
  a4:     { label: "A4",     size: "210mm 297mm", em: "38em" },
  letter: { label: "Letter", size: "8.5in 11in",  em: "40em" },
  a5:     { label: "A5",     size: "148mm 210mm", em: "28em" },
  b5:     { label: "B5",     size: "176mm 250mm", em: "33em" },
  a6:     { label: "A6",     size: "105mm 148mm", em: "22em" },
};

function buildBookHTML(project, opts) {
  const chapters = project.chapters.filter((c) => opts.include[c.id] !== false);
  /* The book's own typography (first line, alignment, paragraph spacing)
     comes from page setup; the sheet and margins stay the export modal's
     explicit choice, exactly as before. */
  const pg = opts.page || null;
  const fontStack = opts.font === "mono"
    ? "'JetBrains Mono', monospace"
    : opts.font === "article" ? "'Spectral', Georgia, serif" : "'Newsreader', Georgia, serif";
  let body = "";
  if (opts.titlePage) {
    body += `<section class="b-title"><div class="b-kicker">SIPRU.</div><h1>${project.title}</h1>${project.synopsis ? `<p class="b-syn">${project.synopsis}</p>` : ""}</section>`;
  }
  if (opts.toc) {
    body += `<section class="b-toc"><h2>${t("toc_title", opts.lang || "ru")}</h2><ol>${chapters.map((c) => `<li><span>${c.title}</span></li>`).join("")}</ol></section>`;
  }
  chapters.forEach((c, i) => {
    body += `<section class="b-chap${opts.merge ? " merged" : ""}">${chapterBody(c.content || "")}</section>`;
  });
  return `<!doctype html><html><head><meta charset="utf-8"><title>${project.title}</title>
  <link href="https://fonts.googleapis.com/css2?family=Newsreader:ital,wght@0,400;0,600;1,400&family=Spectral:wght@400;600&family=JetBrains+Mono&display=swap" rel="stylesheet">
  <style>
    @page { size: ${(PAPER[opts.paperSize] || PAPER.a4).size}; margin: ${MARGINS[opts.margin]}; }
    * { box-sizing: border-box; }
    body { font-family: ${fontStack}; font-size: 12pt; line-height: ${opts.leading}; color: #1f1d18; background: #fff; margin: 0; -webkit-font-smoothing: antialiased; text-rendering: optimizeLegibility; overflow-wrap: break-word; word-break: break-word; }
    .b-kicker { font-family: 'JetBrains Mono', monospace; letter-spacing: .42em; font-size: 9pt; color: #c2542f; text-transform: uppercase; }
    .b-title h1 { font-size: 30pt; line-height: 1.06; margin: 18px 0 16px; font-weight: 600; letter-spacing: -.015em; }
    .b-syn { font-style: italic; color: #6b6457; font-size: 13pt; margin: 0 auto; max-width: 30em; }
    .b-toc h2 { font-size: 15pt; font-weight: 600; margin: 0 0 .9em; letter-spacing: -.01em; }
    .b-toc ol { line-height: 2.05; padding-left: 1.3em; color: #3a382f; margin: 0; }
    h1 { font-size: 21pt; font-weight: 600; margin: 0 0 .8em; letter-spacing: -.01em; }
    h2 { font-size: 15pt; font-weight: 600; margin: 1.3em 0 .4em; }
    h3 { font-size: 12.5pt; font-weight: 600; margin: 1.1em 0 .3em; }
    p { margin: 0 0 ${pg ? pg.spaceAfter : 0}em; text-indent: ${pg ? pg.indent : 1.5}em; text-align: ${pg ? (pg.align === "justify" ? "justify" : pg.align) : "justify"}; }
    h1 + p, h2 + p, h3 + p, blockquote + p, ul + p, ol + p, hr + p, p:first-child { text-indent: 0; }
    blockquote { margin: 1.1em 1.6em; font-style: italic; color: #555; }
    ul, ol { padding-left: 1.5em; margin: .4em 0; } li { margin-bottom: .3em; text-align: left; }
    hr { border: none; text-align: center; margin: 1.6em 0; }
    hr:after { content: "✶"; color: #c2542f; }
${BLOCK_CSS}
    /* on-screen preview: a single clean, centred book column */
    @media screen {
      body { padding: 60px 0 80px; }
      body > section { max-width: ${(PAPER[opts.paperSize] || PAPER.a4).em}; margin: 0 auto; padding: 0 ${SCREEN_PADS[opts.margin]}; }
      .b-title { text-align: center; padding-bottom: 46px; margin-bottom: 46px; border-bottom: ${opts.merge ? "none" : "1px solid #e9e3d5"}; }
      .b-toc { padding-bottom: 40px; margin-bottom: ${opts.merge ? "24px" : "40px"}; border-bottom: ${opts.merge ? "none" : "1px solid #e9e3d5"}; }
      .b-chap + .b-chap { margin-top: ${opts.merge ? "0" : "44px"}; }
      .b-chap h1 { padding-top: ${opts.merge ? "0" : "26px"}; }
      .b-chap:first-of-type h1 { padding-top: 0; }
    }
    /* print / PDF: real pagination */
    @media print {
      .b-title { text-align: center; padding-top: 34vh; page-break-after: always; }
      .b-toc { page-break-after: always; padding-top: 12%; }
      .b-chap { ${opts.merge ? "page-break-before: avoid; break-before: avoid;" : "page-break-before: always; break-before: page;"} }
      .b-chap:first-of-type { page-break-before: avoid; break-before: avoid; }
      h1 { ${opts.merge ? "" : "padding-top: 6%;"} }
    }
  </style></head><body>${body}</body></html>`;
}

function buildPlain(project, opts, md) {
  const chapters = project.chapters.filter((c) => opts.include[c.id] !== false);
  let out = "";
  if (opts.titlePage) out += project.title.toUpperCase() + "\n" + (project.synopsis || "") + "\n\n\n";
  if (opts.toc) out += t("toc_title", opts.lang || "en").toUpperCase() + "\n" + chapters.map((c, i) => (i + 1) + ". " + c.title).join("\n") + "\n\n\n";
  chapters.forEach((c) => { out += (md ? htmlToMd(c.content) : htmlToText(c.content)) + "\n\n\n"; });
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
      pageBreakBefore: opts.titlePage && !opts.merge,
    });
  }
  chapters.forEach((c, i) => {
    sections.push({
      html: c.content || "",
      pageBreakBefore: !opts.merge && (i > 0 || opts.toc || opts.titlePage),
    });
  });
  return SipruFormats.buildDocx({
    title: opts.titlePage ? project.title : "",
    subtitle: opts.titlePage ? (project.synopsis || "") : "",
    sections, paperSize: opts.paperSize, margin: opts.margin, font: opts.font,
    page: opts.page || null, bookTitle: project.title, author: opts.author || "",
  });
}

function ExportModal({ store, projectId, onClose, initialFormat, onToast }) {
  const [closing, close] = useDismiss(onClose);
  const project = store.get().projects.find((p) => p.id === projectId);
  const lang = (store.get().user && store.get().user.lang) || "en";
  const tl = T(lang);
  const [opts, setOpts] = useState(() => ({
    merge: false, titlePage: true, toc: true,
    margin: "normal", font: "book", leading: 1.7,
    paperSize: "a4", lang,
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
            <button className="icon-btn" onClick={close}><Icon name="close" size={18} /></button>
          </div>

          <div className="exp-scroll">
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
              {[["titlePage","exp_title_page"],["toc","exp_toc"],["merge","exp_merge"]].map(([k,lk]) => (
                <label key={k} className="exp-toggle">
                  <span className={"switch" + (opts[k] ? " on" : "")} onClick={() => set({ [k]: !opts[k] })}><span /></span>
                  {tl(lk)}
                </label>
              ))}
            </div>

            <div className="exp-grp">
              <div className="exp-grp-h mono">{tl("exp_section_typeset")}</div>
              <div className="exp-row"><span className="exp-lbl">{tl("exp_paper")}</span>
                <div className="seg seg--sm">{Object.entries(PAPER).map(([k, p]) => (
                  <button key={k} className={"seg-btn"+(opts.paperSize===k?" on":"")} onClick={() => set({paperSize:k})}>{p.label}</button>))}</div>
              </div>
              <div className="exp-row"><span className="exp-lbl">{tl("exp_margins")}</span>
                <div className="seg seg--sm">{[["narrow","exp_margin_narrow"],["normal","exp_margin_normal"],["wide","exp_margin_wide"]].map(([k,lk]) => (
                  <button key={k} className={"seg-btn"+(opts.margin===k?" on":"")} onClick={() => set({margin:k})}>{tl(lk)}</button>))}</div>
              </div>
              <div className="exp-row"><span className="exp-lbl">{tl("exp_font")}</span>
                <div className="seg seg--sm">{[["book","Newsreader"],["article","Spectral"],["mono","Mono"]].map(([k,l]) => (
                  <button key={k} className={"seg-btn"+(opts.font===k?" on":"")} onClick={() => set({font:k})}>{l}</button>))}</div>
              </div>
              <div className="exp-row"><span className="exp-lbl">{tl("exp_leading")}</span>
                <input type="range" min="1.3" max="2.2" step="0.1" value={opts.leading}
                  onChange={(e) => set({ leading: parseFloat(e.target.value) })} className="exp-range" />
                <span className="mono exp-val">{opts.leading.toFixed(1)}</span>
              </div>
            </div>
          </div>

          <div className="exp-actions">
            <button className="btn btn--accent" onClick={() => doExport("pdf")}><Icon name="download" size={15} /> PDF</button>
            <button className="btn" onClick={() => doExport("docx")}>DOCX</button>
            <button className="btn" onClick={() => doExport("txt")}>TXT</button>
            <button className="btn" onClick={() => doExport("md")}>MD</button>
          </div>
        </div>

        <div className="export-preview">
          <div className="export-preview-inner">
            <iframe className="book-iframe" title="preview" srcDoc={previewHTML} />
          </div>
        </div>
      </div>
    </div>
  );
}

function buildNoteHTML(note, opts) {
  const fontStack = opts.font === "mono"
    ? "'JetBrains Mono', monospace"
    : opts.font === "article" ? "'Spectral', Georgia, serif" : "'Newsreader', Georgia, serif";
  return `<!doctype html><html><head><meta charset="utf-8"><title>${note.title}</title>
  <link href="https://fonts.googleapis.com/css2?family=Newsreader:ital,wght@0,400;0,600;1,400&family=Spectral:wght@400;600&family=JetBrains+Mono&display=swap" rel="stylesheet">
  <style>
    @page { size: ${(PAPER[opts.paperSize] || PAPER.a4).size}; margin: ${MARGINS[opts.margin]}; }
    * { box-sizing: border-box; }
    body { font-family: ${fontStack}; font-size: 12pt; line-height: ${opts.leading}; color: #1f1d18; background: #fff; margin: 0; -webkit-font-smoothing: antialiased; overflow-wrap: break-word; word-break: break-word; }
    h1 { font-size: 21pt; font-weight: 600; margin: 0 0 .8em; letter-spacing: -.01em; }
    h2 { font-size: 15pt; font-weight: 600; margin: 1.3em 0 .4em; }
    h3 { font-size: 12.5pt; font-weight: 600; margin: 1.1em 0 .3em; }
    p { margin: 0 0 .8em; }
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
      .n-wrap { max-width: ${(PAPER[opts.paperSize] || PAPER.a4).em}; margin: 0 auto; padding: 0 ${SCREEN_PADS[opts.margin]}; }
    }
  </style></head><body><div class="n-wrap">${opts.titlePage ? `<div class="n-head"><div class="n-kicker">SIPRU.</div><h1 class="n-title">${note.title}</h1></div>` : ""}${chapterBody(note.content || "")}</div></body></html>`;
}

function NoteExportModal({ note, onClose, onToast, lang }) {
  const [closing, close] = useDismiss(onClose);
  const tl = T(lang || "en");
  const [opts, setOpts] = useState({ margin: "normal", font: "book", leading: 1.7, paperSize: "a4", titlePage: true });
  const set = (patch) => setOpts((o) => ({ ...o, ...patch }));

  const previewHTML = useMemo(() => buildNoteHTML(note, opts), [note, opts]);

  function doExport(fmt) {
    const base = note.title.replace(/[^\wа-яёА-ЯЁ\- ]+/gi, "").trim() || "note";
    if (fmt === "pdf") {
      if (window.__TAURI__) {
        if (printHTML(buildNoteHTML(note, opts))) { onToast(tl("exp_toast_pdf")); return; }
        downloadBlob(base + ".html", "text/html;charset=utf-8", buildNoteHTML(note, opts));
        onToast(tl("exp_toast_pdf_tauri"));
        return;
      }
      const w = window.open("", "_blank");
      if (!w) { onToast(tl("exp_err_popup")); return; }
      w.document.write(buildNoteHTML(note, opts));
      w.document.close();
      setTimeout(() => { w.focus(); w.print(); }, 700);
      onToast(tl("exp_toast_pdf"));
    } else if (fmt === "docx") {
      try {
        downloadBlob(base + ".docx", SipruFormats.DOCX_MIME, SipruFormats.buildDocx({
          title: opts.titlePage ? note.title : "",
          sections: [{ html: note.content || "" }],
          paperSize: opts.paperSize, margin: opts.margin, font: opts.font,
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
            <button className="icon-btn" onClick={close}><Icon name="close" size={18} /></button>
          </div>

          <div className="exp-scroll">
            <div className="exp-grp">
              <div className="exp-grp-h mono">{tl("exp_section_decoration")}</div>
              <label className="exp-toggle">
                <span className={"switch" + (opts.titlePage ? " on" : "")} onClick={() => set({ titlePage: !opts.titlePage })}><span /></span>
                {tl("exp_note_title_opt")}
              </label>
            </div>
            <div className="exp-grp">
              <div className="exp-grp-h mono">{tl("exp_section_layout")}</div>
              <div className="exp-row"><span className="exp-lbl">{tl("exp_paper")}</span>
                <div className="seg seg--sm">{Object.entries(PAPER).map(([k, p]) => (
                  <button key={k} className={"seg-btn"+(opts.paperSize===k?" on":"")} onClick={() => set({paperSize:k})}>{p.label}</button>))}</div>
              </div>
              <div className="exp-row"><span className="exp-lbl">{tl("exp_margins")}</span>
                <div className="seg seg--sm">{[["narrow","exp_margin_narrow"],["normal","exp_margin_normal"],["wide","exp_margin_wide"]].map(([k,lk]) => (
                  <button key={k} className={"seg-btn"+(opts.margin===k?" on":"")} onClick={() => set({margin:k})}>{tl(lk)}</button>))}</div>
              </div>
              <div className="exp-row"><span className="exp-lbl">{tl("exp_font")}</span>
                <div className="seg seg--sm">{[["book","Newsreader"],["article","Spectral"],["mono","Mono"]].map(([k,l]) => (
                  <button key={k} className={"seg-btn"+(opts.font===k?" on":"")} onClick={() => set({font:k})}>{l}</button>))}</div>
              </div>
              <div className="exp-row"><span className="exp-lbl">{tl("exp_leading")}</span>
                <input type="range" min="1.3" max="2.2" step="0.1" value={opts.leading}
                  onChange={(e) => set({ leading: parseFloat(e.target.value) })} className="exp-range" />
                <span className="mono exp-val">{opts.leading.toFixed(1)}</span>
              </div>
            </div>
          </div>

          <div className="exp-actions">
            <button className="btn btn--accent" onClick={() => doExport("pdf")}><Icon name="download" size={15} /> PDF</button>
            <button className="btn" onClick={() => doExport("docx")}>DOCX</button>
            <button className="btn" onClick={() => doExport("txt")}>TXT</button>
            <button className="btn" onClick={() => doExport("md")}>MD</button>
          </div>
        </div>

        <div className="export-preview">
          <div className="export-preview-inner">
            <iframe className="book-iframe" title="preview" srcDoc={previewHTML} />
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { BookPreview, ExportModal, NoteExportModal, htmlToText, htmlToMd, downloadBlob, buildBookDocx });
