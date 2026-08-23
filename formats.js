/* ============================================================
   Sipru. — file formats: import (txt / md / html) + real .docx
   No external dependencies: minimal ZIP writer + Office Open XML.
   ============================================================ */
(function () {

  /* ---------------- shared ---------------- */
  const BLOCKS = ["p","br","h1","h2","h3","blockquote","ul","ol","li","hr",
    "figure","figcaption","aside"];
  const INLINE = ["strong","b","em","i","u","s","strike","sup"];
  const ALLOWED = new Set(BLOCKS.concat(INLINE));
  /* The only attributes that ever survive a sanitise: the handful of marker
     classes and data-* keys the editor uses to tell its own block types
     apart. Everything else — style, href, on*, id — is still dropped. */
  const CLASS_OK = new Set(["epigraph","note","page-break","scene-sep","fn","fn-defs",
    "al-l","al-c","al-r","al-j"]);
  const DATA_OK = ["data-fn","data-t","data-s","data-id"];
  function keepMarkers(src, el) {
    const cls = (src.getAttribute("class") || "").split(/\s+/).filter((c) => CLASS_OK.has(c));
    if (cls.length) el.setAttribute("class", cls.join(" "));
    DATA_OK.forEach((k) => { if (src.hasAttribute(k)) el.setAttribute(k, src.getAttribute(k)); });
  }

  const esc = (s) => String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  /* ---------------- HTML sanitiser ----------------
     Parses in an inert document, keeps only editor-safe tags,
     drops every attribute (so no href/style/on* survives).      */
  function sanitizeHTML(html) {
    let doc;
    try { doc = new DOMParser().parseFromString("<body>" + (html || "") + "</body>", "text/html"); }
    catch (e) { return esc(html); }
    const src = doc.body;
    const out = document.createElement("div");

    function walk(node, into) {
      node.childNodes.forEach((n) => {
        if (n.nodeType === 3) { into.appendChild(document.createTextNode(n.nodeValue)); return; }
        if (n.nodeType !== 1) return;
        const tag = n.tagName.toLowerCase();
        if (tag === "script" || tag === "style" || tag === "iframe" ||
            tag === "object" || tag === "embed" || tag === "svg" || tag === "template") return;
        /* a <div> only survives as the footnote store; every other one is
           unwrapped exactly as it always was */
        const isFnBox = tag === "div" && (n.getAttribute("class") || "").indexOf("fn-defs") >= 0;
        if (!ALLOWED.has(tag) && !isFnBox) { walk(n, into); return; }   // unwrap unknown tags
        const norm = tag === "strike" ? "s" : tag;
        const el = document.createElement(norm);
        keepMarkers(n, el);
        into.appendChild(el);
        if (norm !== "br" && norm !== "hr") walk(n, el);
      });
    }
    walk(src, out);
    return out.innerHTML;
  }

  /* ---------------- TXT → HTML ---------------- */
  function txtToHTML(text) {
    const paras = String(text || "").replace(/\r\n?/g, "\n").replace(/^\n+|\s+$/g, "").split(/\n{2,}/);
    return paras.map((p) => {
      const body = p.replace(/\n+$/, "").split("\n").map(esc).join("<br>");
      return body.trim() ? "<p>" + body + "</p>" : "";
    }).join("") || "<p></p>";
  }

  /* ---------------- Markdown subset → HTML ----------------
     Mirrors exactly what Sipru's export produces:
     #, ##, ###, >, -, 1., ---, paragraphs, plus **bold**, *italic* / _italic_,
     <u>underline</u>, ~~strike~~ and [link](url) — the editor toolbar's full
     inline set, so a vault file round-trips through disk without silently
     dropping formatting.

     A leftover backslash-escape (\*, \_, \~, \[, \]) — written by htmlToMd's
     mdEscapeText so a literal "*" in prose can't be mistaken for markup — is
     protected behind a sentinel before the tokenizer runs, so it survives
     as plain text rather than being read back as emphasis. */
  const ESCAPABLE = /\\([\\*_~[\]])/g;
  const SENTINEL_RE = /\x01(\d+)\x02/g;
  function protectEscapes(s) {
    return String(s || "").replace(ESCAPABLE, (_, c) => "\x01" + c.charCodeAt(0) + "\x02");
  }
  function restoreEscapes(html) {
    return html.replace(SENTINEL_RE, (_, code) => esc(String.fromCharCode(+code)));
  }

  /* Only these link schemes are ever written into a clickable href — a
     vault file can be hand-edited outside the app, so this is the same
     trust boundary as importing any other external document. */
  function safeHref(href) {
    const h = String(href || "").trim();
    return /^(https?:|mailto:)/i.test(h) ? h : null;
  }

  /* Leftmost-token recursive descent: literal runs between tokens are
     HTML-escaped as they're appended, and a token's captured inner text is
     re-entered through mdInline — never a blanket escape of the whole
     string, which would also mangle the HTML this function itself emits. */
  /* Bold+italic over exactly the same span comes out of htmlToMd as
     "***text***" (the natural result of wrapping "*text*" in "**…**"); it
     has to be matched before the plain "**" case or the third asterisk
     reads as a stray literal one side and a lone italic marker the other.
     The link URL allows one level of nested parens — real URLs (Wikipedia
     disambiguation pages, for one) routinely have them, and a bare "(1)"
     shouldn't truncate the match at its first close-paren. */
  const INLINE_TOKEN = /\[\^([^\]\s]+)\]|\[([^\]]*)\]\(((?:[^()]|\([^()]*\))*)\)|\*\*\*([^*]+)\*\*\*|\*\*([^*]+)\*\*|<u>([\s\S]*?)<\/u>|~~([^~]+)~~|\*([^*\n]+)\*|_([^_\n]+)_|`([^`\n]+)`/;
  function mdInline(raw) {
    let s = String(raw == null ? "" : raw);
    let out = "";
    while (s.length) {
      const m = INLINE_TOKEN.exec(s);
      if (!m) { out += esc(s); break; }
      out += esc(s.slice(0, m.index));
      if (m[1] !== undefined) {
        /* [^1] — a footnote reference; the number is re-derived from
           document order when the editor opens it, so any label works */
        out += '<sup class="fn" data-fn="fn_' + esc(m[1]) + '">' + esc(m[1]) + "</sup>";
      } else if (m[2] !== undefined) {
        const href = safeHref(m[3]);
        out += href ? ('<a href="' + esc(href) + '">' + mdInline(m[2]) + "</a>") : mdInline(m[2]);
      } else if (m[4] !== undefined) out += "<strong><em>" + mdInline(m[4]) + "</em></strong>";
      else if (m[5] !== undefined) out += "<strong>" + mdInline(m[5]) + "</strong>";
      else if (m[6] !== undefined) out += "<u>" + mdInline(m[6]) + "</u>";
      else if (m[7] !== undefined) out += "<s>" + mdInline(m[7]) + "</s>";
      else if (m[10] !== undefined) out += "<code>" + esc(m[10]) + "</code>";  // literal — no nested markdown inside a code span
      else out += "<em>" + mdInline(m[8] !== undefined ? m[8] : m[9]) + "</em>";
      s = s.slice(m.index + m[0].length);
    }
    return out;
  }
  function mdInlineTop(raw) { return restoreEscapes(mdInline(protectEscapes(raw))); }

  /* Sipru's own block types travel through markdown as readable markers, so
     a vault file stays hand-editable and a round-trip through disk loses
     nothing:

       <!-- page-break -->            a forced page break
       <!-- scene: Title | draft -->  a scene separator
       ::: epigraph … -- author :::   an epigraph block
       ::: note … :::                 a note block
       text[^1] / [^1]: note text     footnotes (standard markdown)
       <p class="al-c">…</p>          a paragraph with its own alignment  */
  const ALIGN_LINE = /^<p class="al-(l|c|r|j)">([\s\S]*)<\/p>$/;
  function mdToHTML(md) {
    const lines = String(md || "").replace(/\r\n?/g, "\n").split("\n");
    let out = "", list = null, para = [], quote = [], fence = null, fenceLines = [];
    const notes = [];
    const flushPara = () => { if (para.length) { out += "<p>" + para.map(mdInlineTop).join("<br>") + "</p>"; para = []; } };
    const flushQuote = () => { if (quote.length) { out += "<blockquote>" + quote.map(mdInlineTop).join("<br>") + "</blockquote>"; quote = []; } };
    const flushList = () => { if (list) { out += "<" + list.tag + ">" + list.items.map((i) => "<li>" + mdInlineTop(i) + "</li>").join("") + "</" + list.tag + ">"; list = null; } };
    const flushAll = () => { flushPara(); flushQuote(); flushList(); };
    const flushFence = () => {
      if (!fence) return;
      const body = fenceLines.filter((l) => l.trim() !== "");
      fenceLines = [];
      if (fence === "epigraph") {
        let author = "";
        if (body.length && /^\s*(--|—)\s*/.test(body[body.length - 1])) {
          author = body.pop().replace(/^\s*(--|—)\s*/, "");
        }
        out += '<figure class="epigraph"><blockquote>' + body.map(mdInlineTop).join("<br>") +
          "</blockquote><figcaption>" + mdInlineTop(author) + "</figcaption></figure>";
      } else {
        out += '<aside class="note">' + body.map(mdInlineTop).join("<br>") + "</aside>";
      }
      fence = null;
    };

    lines.forEach((raw) => {
      const line = raw.replace(/\s+$/, "");
      if (fence) {
        if (/^:::\s*$/.test(line.trim())) flushFence();
        else fenceLines.push(line);
        return;
      }
      let m;
      if ((m = line.match(/^:::\s*(epigraph|note)\s*$/))) { flushAll(); fence = m[1]; return; }
      if (/^<!--\s*page-break\s*-->$/.test(line.trim())) { flushAll(); out += '<hr class="page-break">'; return; }
      if ((m = line.trim().match(/^<!--\s*scene:\s*([\s\S]*?)\s*-->$/))) {
        flushAll();
        const bits = m[1].split("|");
        const title = (bits[0] || "").trim();
        const st = (bits[1] || "draft").trim();
        out += '<hr class="scene-sep" data-t="' + esc(title).replace(/"/g, "&quot;") +
          '" data-s="' + esc(st).replace(/"/g, "&quot;") + '" data-id="s_' +
          Math.random().toString(36).slice(2, 9) + '">';
        return;
      }
      if ((m = line.match(/^\[\^([^\]\s]+)\]:\s*([\s\S]*)$/))) {
        flushAll();
        notes.push({ id: m[1], text: m[2] });
        return;
      }
      if ((m = line.match(ALIGN_LINE))) {
        flushAll();
        out += '<p class="al-' + m[1] + '">' + mdInlineTop(m[2]) + "</p>";
        return;
      }
      if (!line.trim()) { flushAll(); return; }
      if ((m = line.match(/^(#{1,3})\s+(.*)$/))) { flushAll(); out += "<h" + m[1].length + ">" + mdInlineTop(m[2]) + "</h" + m[1].length + ">"; return; }
      if (/^(-{3,}|\*{3,}|_{3,})$/.test(line.trim())) { flushAll(); out += "<hr>"; return; }
      if ((m = line.match(/^>\s?(.*)$/))) { flushPara(); flushList(); quote.push(m[1]); return; }
      if ((m = line.match(/^\s*[-*+]\s+(.*)$/))) { flushPara(); flushQuote();
        if (!list || list.tag !== "ul") { flushList(); list = { tag: "ul", items: [] }; }
        list.items.push(m[1]); return; }
      if ((m = line.match(/^\s*\d+[.)]\s+(.*)$/))) { flushPara(); flushQuote();
        if (!list || list.tag !== "ol") { flushList(); list = { tag: "ol", items: [] }; }
        list.items.push(m[1]); return; }
      flushQuote(); flushList();
      para.push(line);
    });
    flushFence();
    flushAll();
    if (notes.length) {
      out += '<div class="fn-defs">' + notes.map((n) =>
        '<p data-fn="fn_' + esc(n.id).replace(/"/g, "&quot;") + '">' + esc(n.text) + "</p>").join("") + "</div>";
    }
    return out || "<p></p>";
  }

  /* ---------------- file → { title, html } ---------------- */
  function readFile(file) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result || ""));
      r.onerror = () => reject(r.error || new Error("read"));
      r.readAsText(file, "utf-8");
    });
  }
  const IMPORT_ACCEPT = ".txt,.md,.markdown,.html,.htm,text/plain,text/markdown,text/html";
  function importKind(file) {
    const n = (file.name || "").toLowerCase();
    if (/\.(md|markdown)$/.test(n)) return "md";
    if (/\.(html?|xhtml)$/.test(n)) return "html";
    if (/\.txt$/.test(n)) return "txt";
    if ((file.type || "").indexOf("html") >= 0) return "html";
    if ((file.type || "").indexOf("markdown") >= 0) return "md";
    return /\.\w+$/.test(n) && !/\.te?xt$/.test(n) ? null : "txt";
  }
  async function importFile(file) {
    const kind = importKind(file);
    if (!kind) throw new Error("unsupported");
    const raw = await readFile(file);
    const html = kind === "md" ? mdToHTML(raw) : kind === "html" ? sanitizeHTML(raw) : txtToHTML(raw);
    const baseTitle = (file.name || "").replace(/\.[^.]+$/, "").trim();
    // prefer a leading heading as the title, if the file has one
    let title = baseTitle;
    const hm = html.match(/^<h[1-3]>([\s\S]*?)<\/h[1-3]>/i);
    if (hm) {
      const d = document.createElement("div"); d.innerHTML = hm[1];
      const t = (d.textContent || "").trim();
      if (t) title = t;
    }
    return { title: title || baseTitle || "Untitled", html };
  }

  /* ============================================================
     Minimal ZIP writer (store, no compression) — enough for .docx
     ============================================================ */
  const CRC_TABLE = (() => {
    const t = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      t[i] = c >>> 0;
    }
    return t;
  })();
  function crc32(bytes) {
    let c = 0xffffffff;
    for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  }
  function zip(files) {
    const enc = new TextEncoder();
    const parts = [], central = [];
    let offset = 0;
    files.forEach((f) => {
      const name = enc.encode(f.name);
      const data = enc.encode(f.data);
      const crc = crc32(data);
      const local = new Uint8Array(30 + name.length);
      const dv = new DataView(local.buffer);
      dv.setUint32(0, 0x04034b50, true);
      dv.setUint16(4, 20, true);          // version needed
      dv.setUint16(6, 0x0800, true);      // UTF-8 filename flag
      dv.setUint16(8, 0, true);           // stored
      dv.setUint16(10, 0, true); dv.setUint16(12, 0x21, true); // time / date (1980-01-01)
      dv.setUint32(14, crc, true);
      dv.setUint32(18, data.length, true);
      dv.setUint32(22, data.length, true);
      dv.setUint16(26, name.length, true);
      dv.setUint16(28, 0, true);
      local.set(name, 30);
      parts.push(local, data);

      const cd = new Uint8Array(46 + name.length);
      const cv = new DataView(cd.buffer);
      cv.setUint32(0, 0x02014b50, true);
      cv.setUint16(4, 20, true); cv.setUint16(6, 20, true);
      cv.setUint16(8, 0x0800, true);
      cv.setUint16(10, 0, true);
      cv.setUint16(12, 0, true); cv.setUint16(14, 0x21, true);
      cv.setUint32(16, crc, true);
      cv.setUint32(20, data.length, true);
      cv.setUint32(24, data.length, true);
      cv.setUint16(28, name.length, true);
      cv.setUint32(42, offset, true);
      cd.set(name, 46);
      central.push(cd);
      offset += local.length + data.length;
    });
    const cdSize = central.reduce((s, c) => s + c.length, 0);
    const end = new Uint8Array(22);
    const ev = new DataView(end.buffer);
    ev.setUint32(0, 0x06054b50, true);
    ev.setUint16(8, files.length, true);
    ev.setUint16(10, files.length, true);
    ev.setUint32(12, cdSize, true);
    ev.setUint32(16, offset, true);
    const all = parts.concat(central, [end]);
    const total = all.reduce((s, p) => s + p.length, 0);
    const out = new Uint8Array(total);
    let pos = 0;
    all.forEach((p) => { out.set(p, pos); pos += p.length; });
    return out;
  }

  /* ============================================================
     HTML → Office Open XML (WordprocessingML)
     ============================================================ */
  function runsFrom(node, fmt, runs) {
    node.childNodes.forEach((n) => {
      if (n.nodeType === 3) {
        const text = n.nodeValue.replace(/\s+/g, " ");
        if (text) runs.push({ text, ...fmt });
        return;
      }
      if (n.nodeType !== 1) return;
      const tag = n.tagName.toLowerCase();
      if (tag === "br") { runs.push({ br: true }); return; }
      const next = { ...fmt };
      if (tag === "sup") next.sup = true;
      if (tag === "strong" || tag === "b") next.b = true;
      if (tag === "em" || tag === "i") next.i = true;
      if (tag === "u") next.u = true;
      if (tag === "s" || tag === "strike" || tag === "del") next.s = true;
      runsFrom(n, next, runs);
    });
    return runs;
  }
  function runXML(r) {
    if (r.br) return "<w:r><w:br/></w:r>";
    let rpr = "";
    if (r.b) rpr += "<w:b/>";
    if (r.i) rpr += "<w:i/>";
    if (r.u) rpr += '<w:u w:val="single"/>';
    if (r.s) rpr += "<w:strike/>";
    if (r.sup) rpr += '<w:vertAlign w:val="superscript"/>';
    return "<w:r>" + (rpr ? "<w:rPr>" + rpr + "</w:rPr>" : "") +
      '<w:t xml:space="preserve">' + esc(r.text) + "</w:t></w:r>";
  }
  function paraXML(runs, style, numId) {
    const ppr = (style ? '<w:pStyle w:val="' + style + '"/>' : "") +
      (numId ? '<w:numPr><w:ilvl w:val="0"/><w:numId w:val="' + numId + '"/></w:numPr>' : "");
    return "<w:p>" + (ppr ? "<w:pPr>" + ppr + "</w:pPr>" : "") + runs.map(runXML).join("") + "</w:p>";
  }

  /* Converts a chunk of editor HTML into an array of <w:p> strings. */
  function htmlToDocxParas(html) {
    const holder = document.createElement("div");
    holder.innerHTML = html || "";
    const out = [];
    const emit = (node, style, numId) => {
      const runs = runsFrom(node, {}, []);
      if (!runs.length && !numId) return;
      out.push(paraXML(runs, style, numId));
    };
    const walk = (parent) => {
      parent.childNodes.forEach((n) => {
        if (n.nodeType === 3) {
          const t = n.nodeValue.trim();
          if (t) out.push(paraXML([{ text: t }], null, null));
          return;
        }
        if (n.nodeType !== 1) return;
        const tag = n.tagName.toLowerCase();
        const cls = n.getAttribute ? (n.getAttribute("class") || "") : "";
        if (tag === "div" && cls.indexOf("fn-defs") >= 0) return;   /* collected separately */
        if (tag === "h1") emit(n, "Heading1");
        else if (tag === "h2") emit(n, "Heading2");
        else if (tag === "h3") emit(n, "Heading3");
        else if (tag === "blockquote") emit(n, "Quote");
        else if (tag === "figure" && cls.indexOf("epigraph") >= 0) {
          const body = n.querySelector("blockquote");
          const cap = n.querySelector("figcaption");
          if (body) emit(body, "Epigraph");
          if (cap && (cap.textContent || "").trim()) {
            out.push(paraXML([{ text: "— " + cap.textContent.trim(), i: true }], "EpigraphBy"));
          }
        }
        else if (tag === "aside" && cls.indexOf("note") >= 0) emit(n, "NoteBlock");
        else if (tag === "hr" && cls.indexOf("page-break") >= 0) out.push(PAGE_BREAK);
        else if (tag === "hr" && cls.indexOf("scene-sep") >= 0) {
          const t = n.getAttribute("data-t");
          out.push(paraXML([{ text: t ? t : "* * *" }], "Separator"));
        }
        else if (tag === "hr") out.push(paraXML([{ text: "* * *" }], "Separator"));
        else if (tag === "ul" || tag === "ol") {
          const numId = tag === "ul" ? 1 : 2;
          n.querySelectorAll(":scope > li").forEach((li) => emit(li, "ListParagraph", numId));
        } else if (tag === "p" || tag === "div") emit(n, null);
        else if (tag === "section" || tag === "article") walk(n);
        else emit(n, null);
      });
    };
    walk(holder);
    /* Word's own footnote part is a different document altogether; the
       notes are written out as a numbered block at the end of the chapter
       instead, keeping their numbers and their text. */
    const box = holder.querySelector(".fn-defs");
    if (box && box.children.length) {
      out.push(paraXML([{ text: "" }], "Separator"));
      Array.prototype.forEach.call(box.children, (def, i) => {
        out.push(paraXML([{ text: (i + 1) + ". " + (def.textContent || "") }], "NoteBlock"));
      });
    }
    return out;
  }

  const CONTENT_TYPES = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
    '<Default Extension="xml" ContentType="application/xml"/>' +
    '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>' +
    '<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>' +
    '<Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/>' +
    '</Types>';

  const RELS = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>' +
    '</Relationships>';

  const DOC_RELS = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>' +
    '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering" Target="numbering.xml"/>' +
    '</Relationships>';

  function stylesXML(fontName) {
    const heading = (id, name, size, before) =>
      '<w:style w:type="paragraph" w:styleId="' + id + '"><w:name w:val="' + name + '"/>' +
      '<w:basedOn w:val="Normal"/><w:qFormat/>' +
      '<w:pPr><w:keepNext/><w:spacing w:before="' + before + '" w:after="120"/><w:ind w:firstLine="0"/></w:pPr>' +
      '<w:rPr><w:b/><w:sz w:val="' + size + '"/></w:rPr></w:style>';
    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' +
      '<w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="' + esc(fontName) + '" w:hAnsi="' + esc(fontName) +
      '" w:cs="' + esc(fontName) + '"/><w:sz w:val="24"/><w:szCs w:val="24"/><w:lang w:val="en-US"/></w:rPr></w:rPrDefault>' +
      '<w:pPrDefault><w:pPr><w:spacing w:after="120" w:line="300" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>' +
      '<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style>' +
      heading("Heading1", "heading 1", "40", "360") +
      heading("Heading2", "heading 2", "32", "280") +
      heading("Heading3", "heading 3", "28", "240") +
      '<w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:basedOn w:val="Normal"/><w:qFormat/>' +
      '<w:pPr><w:jc w:val="center"/><w:spacing w:before="480" w:after="240"/></w:pPr>' +
      '<w:rPr><w:b/><w:sz w:val="56"/></w:rPr></w:style>' +
      '<w:style w:type="paragraph" w:styleId="Subtitle"><w:name w:val="Subtitle"/><w:basedOn w:val="Normal"/><w:qFormat/>' +
      '<w:pPr><w:jc w:val="center"/><w:spacing w:after="240"/></w:pPr><w:rPr><w:i/></w:rPr></w:style>' +
      '<w:style w:type="paragraph" w:styleId="Quote"><w:name w:val="Quote"/><w:basedOn w:val="Normal"/><w:qFormat/>' +
      '<w:pPr><w:ind w:left="720" w:right="720"/></w:pPr><w:rPr><w:i/></w:rPr></w:style>' +
      '<w:style w:type="paragraph" w:styleId="Epigraph"><w:name w:val="Epigraph"/><w:basedOn w:val="Normal"/>' +
      '<w:pPr><w:ind w:left="1440"/><w:jc w:val="right"/><w:spacing w:before="240" w:after="60"/></w:pPr>' +
      '<w:rPr><w:i/><w:sz w:val="22"/></w:rPr></w:style>' +
      '<w:style w:type="paragraph" w:styleId="EpigraphBy"><w:name w:val="Epigraph By"/><w:basedOn w:val="Normal"/>' +
      '<w:pPr><w:ind w:left="1440"/><w:jc w:val="right"/><w:spacing w:after="240"/></w:pPr>' +
      '<w:rPr><w:sz w:val="20"/></w:rPr></w:style>' +
      '<w:style w:type="paragraph" w:styleId="NoteBlock"><w:name w:val="Note"/><w:basedOn w:val="Normal"/>' +
      '<w:pPr><w:ind w:left="360"/><w:spacing w:before="120" w:after="120"/></w:pPr>' +
      '<w:rPr><w:sz w:val="20"/></w:rPr></w:style>' +
      '<w:style w:type="paragraph" w:styleId="Separator"><w:name w:val="Separator"/><w:basedOn w:val="Normal"/>' +
      '<w:pPr><w:jc w:val="center"/><w:spacing w:before="240" w:after="240"/></w:pPr></w:style>' +
      '<w:style w:type="paragraph" w:styleId="RunHead"><w:name w:val="Running Head"/><w:basedOn w:val="Normal"/>' +
      '<w:pPr><w:spacing w:after="0"/></w:pPr><w:rPr><w:sz w:val="18"/></w:rPr></w:style>' +
      '<w:style w:type="paragraph" w:styleId="ListParagraph"><w:name w:val="List Paragraph"/><w:basedOn w:val="Normal"/><w:qFormat/>' +
      '<w:pPr><w:ind w:left="720"/><w:spacing w:after="60"/></w:pPr></w:style>' +
      '</w:styles>';
  }

  const NUMBERING = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<w:numbering xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' +
    '<w:abstractNum w:abstractNumId="1"><w:multiLevelType w:val="hybridMultilevel"/>' +
    '<w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val="•"/>' +
    '<w:lvlJc w:val="left"/><w:pPr><w:ind w:left="720" w:hanging="360"/></w:pPr></w:lvl></w:abstractNum>' +
    '<w:abstractNum w:abstractNumId="2"><w:multiLevelType w:val="hybridMultilevel"/>' +
    '<w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="decimal"/><w:lvlText w:val="%1."/>' +
    '<w:lvlJc w:val="left"/><w:pPr><w:ind w:left="720" w:hanging="360"/></w:pPr></w:lvl></w:abstractNum>' +
    '<w:num w:numId="1"><w:abstractNumId w:val="1"/></w:num>' +
    '<w:num w:numId="2"><w:abstractNumId w:val="2"/></w:num>' +
    '</w:numbering>';

  const PAGE_SIZES = {
    a4:     { w: 11906, h: 16838 },
    letter: { w: 12240, h: 15840 },
    a5:     { w: 8391,  h: 11906 },
    b5:     { w: 9979,  h: 14175 },
    a6:     { w: 5954,  h: 8391 },
  };
  const PAGE_MARGINS = { narrow: 794, normal: 1247, wide: 1814 };
  const DOCX_FONTS = { book: "Newsreader", article: "Spectral", mono: "JetBrains Mono" };
  const PAGE_BREAK = '<w:p><w:r><w:br w:type="page"/></w:r></w:p>';

  /* ---- running heads ----
     Word draws its own headers and footers, so the editor's page setup
     carries over literally: the same slots, the same first-page rule, the
     same even/odd mirroring, and real PAGE / STYLEREF fields rather than
     text frozen at export time. */
  const MM_TO_TW = 1440 / 25.4;
  const HF_NS = ' xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"' +
    ' xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"';
  function fieldRun(instr) {
    return '<w:fldSimple w:instr="' + esc(instr) + '"><w:r><w:t>1</w:t></w:r></w:fldSimple>';
  }
  function slotXML(value, ctx) {
    if (!value) return "";
    if (value === "page") return fieldRun(" PAGE ");
    if (value === "pages") return fieldRun(" PAGE ") + '<w:r><w:t xml:space="preserve"> / </w:t></w:r>' + fieldRun(" NUMPAGES ");
    if (value === "chapter") return fieldRun(' STYLEREF "heading 1" \\* MERGEFORMAT ');
    const text = value === "title" ? (ctx.title || "") : value === "author" ? (ctx.author || "") : String(value);
    return text ? '<w:r><w:t xml:space="preserve">' + esc(text) + "</w:t></w:r>" : "";
  }
  function hfPartXML(tag, slots, ctx, width) {
    const centre = Math.round(width / 2), right = width;
    const pPr = '<w:pPr><w:pStyle w:val="RunHead"/><w:tabs>' +
      '<w:tab w:val="center" w:pos="' + centre + '"/><w:tab w:val="right" w:pos="' + right + '"/>' +
      "</w:tabs></w:pPr>";
    const body = slotXML(slots.l, ctx) + "<w:r><w:tab/></w:r>" +
      slotXML(slots.c, ctx) + "<w:r><w:tab/></w:r>" + slotXML(slots.r, ctx);
    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      "<w:" + tag + HF_NS + "><w:p>" + pPr + body + "</w:p></w:" + tag + ">";
  }

  /* opts: { title, subtitle, sections: [{ heading?, html, pageBreakBefore? }],
             paperSize, margin, font, page? }
     `page` is the editor's resolved page setup — when present it decides
     the sheet, the margins and the running heads; without it the export
     behaves exactly as it did before.                                     */
  function buildDocx(opts) {
    const o = opts || {};
    const pg = o.page || null;
    let size = PAGE_SIZES[o.paperSize] || PAGE_SIZES.a4;
    let mgT, mgR, mgB, mgL;
    if (PAGE_MARGINS[o.margin] != null) { mgT = mgR = mgB = mgL = PAGE_MARGINS[o.margin]; }
    else { mgT = mgR = mgB = mgL = PAGE_MARGINS.normal; }
    if (pg) {
      const d = (pg.size === "custom") ? { w: pg.w, h: pg.h }
        : ({ a4: { w: 210, h: 297 }, a5: { w: 148, h: 210 }, b5: { w: 176, h: 250 }, a6: { w: 105, h: 148 },
             letter: { w: 215.9, h: 279.4 }, legal: { w: 215.9, h: 355.6 } }[pg.size] || { w: 210, h: 297 });
      const dim = pg.orient === "landscape" ? { w: d.h, h: d.w } : d;
      size = { w: Math.round(dim.w * MM_TO_TW), h: Math.round(dim.h * MM_TO_TW) };
      mgT = Math.round(pg.mt * MM_TO_TW); mgR = Math.round(pg.mr * MM_TO_TW);
      mgB = Math.round(pg.mb * MM_TO_TW); mgL = Math.round(pg.ml * MM_TO_TW);
    }

    let body = "";
    if (o.title) {
      body += paraXML([{ text: o.title }], "Title");
      if (o.subtitle) body += paraXML([{ text: o.subtitle }], "Subtitle");
    }
    (o.sections || []).forEach((sec, i) => {
      if (sec.pageBreakBefore && (body || i > 0)) body += PAGE_BREAK;
      if (sec.heading) body += paraXML([{ text: sec.heading }], "Heading1");
      body += htmlToDocxParas(sec.html).join("");
    });
    if (!body) body = paraXML([{ text: "" }], null);

    /* header / footer parts */
    const files = [];
    const rels = [
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>',
      '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering" Target="numbering.xml"/>',
      '<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/settings" Target="settings.xml"/>',
    ];
    const overrides = [];
    let refs = "";
    let rid = 4;
    const ctx = { title: o.title || o.bookTitle || "", author: o.author || "" };
    const width = size.w - mgL - mgR;
    if (pg) {
      [["hdr", "hdr", "header"], ["ftr", "ftr", "footer"]].forEach(([key, , kind]) => {
        const band = pg[key];
        if (!band || !band.on) return;
        const bands = [{ type: "default", slots: band }];
        if (pg.firstBare) bands.push({ type: "first", slots: { l: "", c: "", r: "" } });
        if (pg.mirror) bands.push({ type: "even", slots: { l: band.r, c: band.c, r: band.l } });
        bands.forEach((b) => {
          const name = kind + rid + ".xml";
          files.push({ name: "word/" + name, data: hfPartXML(kind, b.slots, ctx, width) });
          rels.push('<Relationship Id="rId' + rid + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/' +
            kind + '" Target="' + name + '"/>');
          overrides.push('<Override PartName="/word/' + name + '" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.' +
            kind + '+xml"/>');
          refs += "<w:" + kind + 'Reference w:type="' + b.type + '" r:id="rId' + rid + '"/>';
          rid++;
        });
      });
    }

    const sectPr = "<w:sectPr>" + refs +
      '<w:pgSz w:w="' + size.w + '" w:h="' + size.h + '"' + (pg && pg.orient === "landscape" ? ' w:orient="landscape"' : "") + "/>" +
      '<w:pgMar w:top="' + mgT + '" w:right="' + mgR + '" w:bottom="' + mgB + '" w:left="' + mgL +
      '" w:header="' + Math.round(mgT / 2) + '" w:footer="' + Math.round(mgB / 2) + '"/>' +
      (pg && pg.numFrom > 1 ? '<w:pgNumType w:start="' + Math.round(pg.numFrom) + '"/>' : "") +
      (pg && pg.firstBare ? "<w:titlePg/>" : "") +
      "</w:sectPr>";

    const document_xml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"' +
      ' xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
      "<w:body>" + body + sectPr + "</w:body></w:document>";

    const settings_xml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<w:settings xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' +
      (pg && pg.mirror ? "<w:evenAndOddHeaders/>" : "") + "</w:settings>";

    return zip([
      { name: "[Content_Types].xml", data: CONTENT_TYPES.replace("</Types>",
        '<Override PartName="/word/settings.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml"/>' +
        overrides.join("") + "</Types>") },
      { name: "_rels/.rels", data: RELS },
      { name: "word/document.xml", data: document_xml },
      { name: "word/_rels/document.xml.rels", data:
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
        rels.join("") + "</Relationships>" },
      { name: "word/settings.xml", data: settings_xml },
      { name: "word/styles.xml", data: stylesXML(DOCX_FONTS[o.font] || DOCX_FONTS.book) },
      { name: "word/numbering.xml", data: NUMBERING },
    ].concat(files));
  }

  const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

  Object.assign(window, {
    SipruFormats: { sanitizeHTML, txtToHTML, mdToHTML, importFile, importKind, IMPORT_ACCEPT,
      buildDocx, htmlToDocxParas, zip, DOCX_MIME },
  });
})();
