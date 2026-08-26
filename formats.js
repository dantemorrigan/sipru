/* ============================================================
   Sipru. — file formats: import (txt / md / html) + real .docx
   No external dependencies: minimal ZIP writer + Office Open XML.
   ============================================================ */
(function () {

  /* ---------------- shared ---------------- */
  const BLOCKS = ["p","br","h1","h2","h3","h4","h5","h6","blockquote","ul","ol","li","hr",
    "figure","figcaption","aside","pre","table","thead","tbody","tr","th","td"];
  const INLINE = ["strong","b","em","i","u","s","strike","sup","sub","code","mark","a","img","input"];
  const ALLOWED = new Set(BLOCKS.concat(INLINE));
  /* Void elements have no closing tag and no children to walk into. */
  const VOID = new Set(["br","hr","img","input"]);
  /* Generic containers apps paste as one-<div>(or <section>/<li>-less
     list wrapper etc.)-per-paragraph markup (Google Docs, Notion, most
     chat UIs' citation widgets). They render block-level in the source,
     so unwrapping one without marking where its edges were would glue
     the text before and after it into one run with no space at all —
     see the walk() unwrap branch below. */
  const BLOCKISH_UNKNOWN = new Set(["div","section","article","header","footer","nav","main"]);
  /* The only attributes that ever survive a sanitise: the handful of marker
     classes and data-* keys the editor uses to tell its own block types
     apart. Everything else — style, href, on*, id — is still dropped. */
  const CLASS_OK = new Set(["epigraph","note","page-break","scene-sep","fn","fn-defs",
    "al-l","al-c","al-r","al-j","math","task","task-list","ta-l","ta-c","ta-r","mermaid"]);
  const DATA_OK = ["data-fn","data-t","data-s","data-id","data-lang"];
  function keepMarkers(node, el) {
    const cls = (node.getAttribute("class") || "").split(/\s+/).filter((c) => CLASS_OK.has(c));
    if (cls.length) el.setAttribute("class", cls.join(" "));
    DATA_OK.forEach((k) => { if (node.hasAttribute(k)) el.setAttribute(k, node.getAttribute(k)); });
    /* Links, images and task checkboxes are meaningless without the one
       attribute that carries their content, so those specific attributes
       survive — each re-validated here rather than trusted, since this runs
       on imported and pasted HTML from anywhere. Everything else (style,
       on*, id, srcset, formaction …) is still dropped. */
    const tag = el.tagName.toLowerCase();
    if (tag === "a") {
      const href = safeHref(node.getAttribute("href"));
      if (href) {
        el.setAttribute("href", href);
        el.setAttribute("target", "_blank");
        el.setAttribute("rel", "noopener noreferrer");
      }
    } else if (tag === "img") {
      const src = safeSrc(node.getAttribute("src"));
      if (src) el.setAttribute("src", src);
      el.setAttribute("alt", node.getAttribute("alt") || "");
    } else if (tag === "input") {
      /* only the disabled task-list checkbox shape, never a live control */
      el.setAttribute("type", "checkbox");
      el.setAttribute("disabled", "");
      if (node.hasAttribute("checked")) el.setAttribute("checked", "");
    }
    const title = node.getAttribute && node.getAttribute("title");
    if (title && (tag === "a" || tag === "img")) el.setAttribute("title", title);
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
        if (!ALLOWED.has(tag) && !isFnBox) {   // unwrap unknown tags
          const blockish = BLOCKISH_UNKNOWN.has(tag);
          if (blockish && into.lastChild) into.appendChild(document.createElement("br"));
          walk(n, into);
          if (blockish && n.nextSibling) into.appendChild(document.createElement("br"));
          return;
        }
        /* an <input> only survives as a task-list checkbox; any other kind
           of form control is dropped rather than rebuilt as one */
        if (tag === "input" && (n.getAttribute("type") || "").toLowerCase() !== "checkbox") return;
        /* an image whose source did not survive validation is not an image
           any more — drop it rather than leave an empty broken frame */
        if (tag === "img" && !safeSrc(n.getAttribute("src"))) return;
        const norm = tag === "strike" ? "s" : tag;
        const el = document.createElement(norm);
        keepMarkers(n, el);
        into.appendChild(el);
        if (!VOID.has(norm)) walk(n, el);
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
  /* Every character markdown gives a meaning to can be written literally by
     escaping it, so the reader accepts a backslash before any of them —
     "\\# не заголовок" is a paragraph beginning with a hash, not an H1. The
     writer (mdEscapeText in the export) escapes only the subset that would
     actually be ambiguous where it stands, so ordinary prose stays clean. */
  const ESCAPABLE = /\\([\\`*_{}[\]()#+\-.!|>~=$])/g;
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
  /* An <img> source is the same trust boundary, plus inline data: images.
     Only the raster types are let through — "data:image/svg+xml" carries a
     whole document, script included, so it is deliberately not on the
     list. */
  function safeSrc(src) {
    const u = String(src || "").trim();
    if (/^https?:/i.test(u)) return u;
    if (/^data:image\/(png|jpe?g|gif|webp|avif);base64,[a-z0-9+/=\s]+$/i.test(u)) return u;
    return null;
  }

  /* Leftmost-token recursive descent: literal runs between tokens are
     HTML-escaped as they're appended, and a token's captured inner text is
     re-entered through mdInline — never a blanket escape of the whole
     string, which would also mangle the HTML this function itself emits. */
  /* ---------------- inline tokenizer ----------------

     One combined regex, but assembled from a table rather than written out
     by hand: each rule declares how many capture groups it owns, and the
     offsets are computed from that. Hand-numbering is what broke this
     before — inserting ==highlight== in the middle shifted every rule after
     it by one, so bold rendered as <u>, italic as <mark>, strike as <em>
     and so on, all the way down. With the offsets derived, a new rule can
     be dropped in anywhere and nothing after it can silently renumber.

     Order is meaning here:
       - a code span binds tightest, so it comes first: with `_` or `*`
         tried earlier, an underscore in prose could pair with one inside a
         later code span and swallow the backticks into an <em>;
       - an entity is next so &copy; survives the literal-run escaper;
       - the image rule precedes the link rule, since ![x](y) also contains
         a valid [x](y);
       - ***both*** precedes **bold** precedes *italic*, or the extra
         asterisk reads as a stray literal on one side and a lone marker on
         the other.

     A rule's fn returns the HTML for the token, or null to decline the
     match — the tokenizer then emits one literal character and rescans,
     which is how an underscore inside snake_case stays part of the word. */
  const WORD_CH = /[0-9A-Za-zÀ-ɏЀ-ӿ]/;
  /* A URL runs to the first whitespace, but may carry balanced parens —
     real URLs (Wikipedia disambiguation pages, for one) routinely do, and a
     bare "(1)" shouldn't truncate the match at its first close-paren. The
     optional "title" is quoted and sits after whitespace, so it can never
     be mistaken for part of the URL. */
  const URL_PART = '((?:[^\\s()]|\\([^()]*\\))+)(?:\\s+"([^"]*)")?';
  const INLINE_RULES = [
    { re: '(`+)([\\s\\S]*?)\\1', n: 2, fn: (g) => {
        /* literal — no nested markdown inside a code span. One padding
           space either side is dropped, which is how a span can hold code
           that itself starts or ends with a backtick. */
        let code = g[1];
        if (/^ [\s\S]* $/.test(code) && code.trim()) code = code.slice(1, -1);
        return "<code>" + esc(code) + "</code>";
      } },
    /* &copy; &#169; &#x00A9; — a named or numeric entity is passed through
       as itself. Without this the literal-run escaper turns every "&" into
       "&amp;" and the reader sees "&copy;" spelled out instead of "©". */
    { re: '&(#\\d{1,7}|#[xX][0-9a-fA-F]{1,6}|[a-zA-Z][a-zA-Z0-9]{1,31});', n: 1,
      fn: (g) => "&" + g[0] + ";" },
    /* [^1] — a footnote reference; the number is re-derived from document
       order when the editor opens it, so any label works */
    { re: '\\[\\^([^\\]\\s]+)\\]', n: 1,
      fn: (g) => '<sup class="fn" data-fn="fn_' + esc(g[0]) + '">' + esc(g[0]) + "</sup>" },
    { re: '!\\[([^\\]]*)\\]\\(\\s*' + URL_PART + '\\s*\\)', n: 3, fn: (g) => {
        const src = safeSrc(g[1]);
        if (!src) return esc(g[0]);            /* unusable source: keep the alt text */
        return '<img src="' + esc(src) + '" alt="' + esc(g[0]) + '"' +
          (g[2] ? ' title="' + esc(g[2]) + '"' : "") + ">";
      } },
    { re: '\\[([^\\]]*)\\]\\(\\s*' + URL_PART + '\\s*\\)', n: 3, fn: (g, rec) => {
        const href = safeHref(g[1]);
        return href
          ? '<a href="' + esc(href) + '"' + (g[2] ? ' title="' + esc(g[2]) + '"' : "") +
            ">" + rec(g[0]) + "</a>"
          : rec(g[0]);
      } },
    /* <https://example.com> — an autolink shows its own URL as the text */
    { re: '<((?:https?:|mailto:)[^>\\s]+)>', n: 1, fn: (g) => {
        const href = safeHref(g[0]);
        return href ? '<a href="' + esc(href) + '">' + esc(g[0]) + "</a>" : esc("<" + g[0] + ">");
      } },
    { re: '\\*\\*\\*([^*]+)\\*\\*\\*', n: 1, fn: (g, rec) => "<strong><em>" + rec(g[0]) + "</em></strong>" },
    { re: '___([^_]+)___', n: 1, fn: (g, rec) => "<strong><em>" + rec(g[0]) + "</em></strong>" },
    { re: '\\*\\*([^*]+)\\*\\*', n: 1, fn: (g, rec) => "<strong>" + rec(g[0]) + "</strong>" },
    { re: '__([^_]+)__', n: 1, fn: (g, rec) => "<strong>" + rec(g[0]) + "</strong>" },
    { re: '<u>([\\s\\S]*?)</u>', n: 1, fn: (g, rec) => "<u>" + rec(g[0]) + "</u>" },
    { re: '<mark>([\\s\\S]*?)</mark>', n: 1, fn: (g, rec) => "<mark>" + rec(g[0]) + "</mark>" },
    { re: '==([^=]+)==', n: 1, fn: (g, rec) => "<mark>" + rec(g[0]) + "</mark>" },
    { re: '~~([^~]+)~~', n: 1, fn: (g, rec) => "<s>" + rec(g[0]) + "</s>" },
    { re: '\\*([^*\\n]+)\\*', n: 1, fn: (g, rec) => "<em>" + rec(g[0]) + "</em>" },
    /* An underscore inside a word is part of the word: snake_case_name is
       one identifier, not emphasis. Only a "_" with a non-word character
       (or nothing) on both outer sides opens a span. */
    { re: '_([^_\\n]+)_', n: 1, fn: (g, rec, ctx) => {
        if (WORD_CH.test(ctx.before) || WORD_CH.test(ctx.after)) return null;
        return "<em>" + rec(g[0]) + "</em>";
      } },
  ];
  /* group 0 of the combined match is the whole thing, so the first rule's
     captures start at 1 and each rule's base is the running total */
  (function assignBases() {
    let base = 1;
    INLINE_RULES.forEach((r) => { r.base = base; base += r.n; });
  })();
  const INLINE_TOKEN = new RegExp(INLINE_RULES.map((r) => r.re).join("|"));

  function mdInline(raw) {
    let s = String(raw == null ? "" : raw);
    let out = "";
    while (s.length) {
      const m = INLINE_TOKEN.exec(s);
      if (!m) { out += esc(s); break; }
      /* which rule fired: the first whose own capture slots came back set */
      let rule = null;
      for (let i = 0; i < INLINE_RULES.length && !rule; i++) {
        const r = INLINE_RULES[i];
        for (let k = 0; k < r.n; k++) if (m[r.base + k] !== undefined) { rule = r; break; }
      }
      if (!rule) { out += esc(s.slice(0, m.index + 1)); s = s.slice(m.index + 1); continue; }
      const groups = [];
      for (let k = 0; k < rule.n; k++) groups.push(m[rule.base + k]);
      const ctx = {
        before: m.index > 0 ? s.charAt(m.index - 1) : "",
        after: s.charAt(m.index + m[0].length),
      };
      const html = rule.fn(groups, mdInline, ctx);
      if (html === null) {
        /* rule declined — emit the run plus one literal char and rescan */
        out += esc(s.slice(0, m.index + 1));
        s = s.slice(m.index + 1);
        continue;
      }
      out += esc(s.slice(0, m.index)) + html;
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
    /* A verbatim fence (``` code, $$ math) is captured character for
       character: no inline tokenizer, no escape protection, no blank-line
       trimming. Its body is only HTML-escaped on the way into the DOM, so
       `_`, `*`, `\frac`, backslashes and Unicode all survive the trip. */
    let verb = null, verbLines = [], verbLang = "";
    const flushVerb = () => {
      if (!verb) return;
      const body = esc(verbLines.join("\n"));
      verbLines = [];
      if (verb === "math") out += '<pre class="math">' + body + "</pre>";
      else out += "<pre" + (verbLang ? ' data-lang="' + esc(verbLang).replace(/"/g, "&quot;") + '"' : "") +
        "><code>" + body + "</code></pre>";
      verb = null; verbLang = "";
    };
    let table = null;
    /* ":---" left, ":---:" centre, "---:" right — the colons in the rule row
       set each column's alignment, carried onto every cell in that column as
       a marker class the editor and every export already understand. */
    const alignOf = (spec) => {
      const t = String(spec || "").trim();
      const l = t.charAt(0) === ":", r = t.charAt(t.length - 1) === ":";
      return l && r ? " class=\"ta-c\"" : r ? " class=\"ta-r\"" : l ? " class=\"ta-l\"" : "";
    };
    const flushTable = () => {
      if (!table) return;
      const al = table.align || [];
      const row = (cells, tag) => "<tr>" + cells.map((c, i) =>
        "<" + tag + (al[i] || "") + ">" + mdInlineTop(c) + "</" + tag + ">").join("") + "</tr>";
      out += "<table><thead>" + row(table.head, "th") + "</thead><tbody>" +
        table.rows.map((r) => row(r, "td")).join("") + "</tbody></table>";
      table = null;
    };
    const splitRow = (l) => l.trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim());
    const notes = [];
    const flushPara = () => { if (para.length) { out += "<p>" + para.map(mdInlineTop).join("<br>") + "</p>"; para = []; } };
    /* A quote line keeps whatever ">" markers are left after this level has
       taken its own, so ">> deeper" arrives here as "> deeper" and recurses
       into a nested <blockquote> instead of printing a literal "&gt;". */
    const renderQuote = (lines) => {
      let html = "<blockquote>", i = 0;
      while (i < lines.length) {
        if (/^>/.test(lines[i])) {
          const sub = [];
          while (i < lines.length && /^>/.test(lines[i])) { sub.push(lines[i].replace(/^>\s?/, "")); i++; }
          html += renderQuote(sub);
        } else {
          const run = [];
          while (i < lines.length && !/^>/.test(lines[i])) { run.push(lines[i]); i++; }
          const body = run.map(mdInlineTop).join("<br>");
          if (body.trim()) html += body;
        }
      }
      return html + "</blockquote>";
    };
    const flushQuote = () => { if (quote.length) { out += renderQuote(quote); quote = []; } };
    /* Items carry the indent they were written at; a deeper one becomes a
       list nested inside the previous item rather than another sibling, so
       "  - a" under "- one" reads as a sub-list the way it does everywhere
       else. Runs of differing marker type at one level stay separate lists,
       so a bulleted group followed by a numbered one is two lists, not a
       numbered continuation of the first. */
    const renderItems = (items) => {
      let html = "", i = 0;
      while (i < items.length) {
        const tag = items[i].tag;
        html += "<" + tag + ">";
        while (i < items.length && items[i].tag === tag) {
          const it = items[i];
          const box = it.checked == null ? ""
            : '<input type="checkbox"' + (it.checked ? " checked" : "") + " disabled> ";
          html += "<li" + (it.checked == null ? "" : ' class="task"') + ">" + box + mdInlineTop(it.text) +
            (it.kids.length ? renderItems(it.kids) : "") + "</li>";
          i++;
        }
        html += "</" + tag + ">";
      }
      return html;
    };
    const pushItem = (indent, tag, text, checked) => {
      const item = { indent, tag, text, checked, kids: [] };
      if (!list) { list = { items: [item] }; return; }
      /* walk down from the root to the deepest run whose indent is still
         smaller than this one, and append there */
      let level = list.items;
      for (;;) {
        const last = level[level.length - 1];
        if (last && indent > last.indent) { level = last.kids; if (!level.length) { level.push(item); return; } continue; }
        level.push(item);
        return;
      }
    };
    const flushList = () => { if (list) { out += renderItems(list.items); list = null; } };
    const flushAll = () => { flushPara(); flushQuote(); flushList(); flushTable(); };
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

    lines.forEach((raw, li) => {
      /* Inside a verbatim fence the raw line is kept exactly as read —
         trailing whitespace included — before anything else looks at it. */
      if (verb) {
        if (verb === "code" ? /^\s*```/.test(raw) : /^\s*\$\$\s*$/.test(raw)) flushVerb();
        else verbLines.push(raw);
        return;
      }
      const line = raw.replace(/\s+$/, "");
      if (fence) {
        if (/^:::\s*$/.test(line.trim())) flushFence();
        else fenceLines.push(line);
        return;
      }
      let m;
      if ((m = line.match(/^\s*```\s*([\w+-]*)\s*$/))) { flushAll(); verb = "code"; verbLang = m[1] || ""; return; }
      if (/^\s*\$\$\s*$/.test(line)) { flushAll(); verb = "math"; return; }
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
      /* Headings: now support all six levels H1-H6 as per full Markdown spec */
      if ((m = line.match(/^(#{1,6})\s+(.*)$/))) { flushAll(); out += "<h" + m[1].length + ">" + mdInlineTop(m[2]) + "</h" + m[1].length + ">"; return; }
      if (/^(-{3,}|\*{3,}|_{3,})$/.test(line.trim())) { flushAll(); out += "<hr>"; return; }
      if ((m = line.match(/^>\s?(.*)$/))) { flushPara(); flushList(); quote.push(m[1]); return; }
      /* A tab indents as far as four spaces do, so both styles nest alike. */
      const indentOf = (t) => t.replace(/\t/g, "    ").match(/^ */)[0].length;
      /* "- [x] done" / "- [ ] todo" — a task item is a list item that also
         carries a checkbox, so it goes through the same nesting path. */
      if ((m = line.match(/^(\s*)[-*+]\s+\[([ xX])\]\s+(.*)$/))) {
        flushPara(); flushQuote(); flushTable();
        pushItem(indentOf(m[1]), "ul", m[3], m[2].toLowerCase() === "x");
        return;
      }
      if ((m = line.match(/^(\s*)[-*+]\s+(.*)$/))) {
        flushPara(); flushQuote(); flushTable();
        pushItem(indentOf(m[1]), "ul", m[2], null);
        return;
      }
      if ((m = line.match(/^(\s*)\d+[.)]\s+(.*)$/))) {
        flushPara(); flushQuote(); flushTable();
        pushItem(indentOf(m[1]), "ol", m[2], null);
        return;
      }
      /* A pipe table: a header row, a |---|---| rule, then body rows. The
         rule is what tells a table apart from a paragraph that merely
         contains a pipe, so it is required before any row is claimed. */
      const isRule = /^\s*\|?[\s:|-]*-[\s:|-]*\|?\s*$/.test(line) && /\|/.test(line);
      if (table && isRule) { table.align = splitRow(line).map(alignOf); return; }   // the header rule itself
      if (/\|/.test(line)) {
        if (table) { table.rows.push(splitRow(line)); return; }
        const next = lines[li + 1];
        if (next && /^\s*\|?[\s:|-]*-[\s:|-]*\|?\s*$/.test(next) && /\|/.test(next)) {
          flushPara(); flushQuote(); flushList();
          table = { head: splitRow(line), rows: [], rule: false };
          return;
        }
      }
      flushQuote(); flushList(); flushTable();
      para.push(line);
    });
    flushVerb();
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
    /* A leading heading becomes the document's title — and is then removed
       from the body. Leaving it in place meant every export wrote the title
       back out as an <h1>, which the next import promoted again: one extra
       copy of the title per round-trip. */
    let title = baseTitle, body = html;
    const hm = html.match(/^<h[1-3]>([\s\S]*?)<\/h[1-3]>/i);
    if (hm) {
      const d = document.createElement("div"); d.innerHTML = hm[1];
      const t = (d.textContent || "").trim();
      if (t) { title = t; body = html.slice(hm[0].length); }
    }
    return { title: title || baseTitle || "Untitled", html: body || "<p></p>" };
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
  function runsFrom(node, fmt, runs, raw) {
    node.childNodes.forEach((n) => {
      if (n.nodeType === 3) {
        const text = raw ? n.nodeValue : n.nodeValue.replace(/\s+/g, " ");
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
      if (tag === "sub") next.sub = true;
      if (tag === "mark") next.hl = true;
      /* an <img> carries no text of its own; Word gets its alt text so the
         sentence around it still reads, rather than a silent gap */
      if (tag === "img") {
        const alt = (n.getAttribute("alt") || "").trim();
        if (alt) runs.push({ text: "[" + alt + "]", i: true, ...fmt });
        return;
      }
      if (tag === "input") {
        runs.push({ text: n.hasAttribute("checked") ? "\u2611 " : "\u2610 ", ...fmt });
        return;
      }
      runsFrom(n, next, runs, raw);
    });
    return runs;
  }
  /* <pre> keeps every space and line break verbatim (an ASCII diagram or
     box-drawing table lives or dies on exact column alignment), so its
     text goes through runsFrom in "raw" mode and each embedded newline
     becomes its own run break rather than collapsing like normal prose. */
  function expandPreBreaks(runs) {
    const out = [];
    runs.forEach((r) => {
      if (r.br) { out.push(r); return; }
      String(r.text).split("\n").forEach((part, i) => {
        if (i > 0) out.push({ br: true });
        if (part) out.push({ ...r, text: part });
      });
    });
    return out;
  }
  function runXML(r) {
    if (r.br) return "<w:r><w:br/></w:r>";
    let rpr = "";
    if (r.b) rpr += "<w:b/>";
    if (r.i) rpr += "<w:i/>";
    if (r.u) rpr += '<w:u w:val="single"/>';
    if (r.s) rpr += "<w:strike/>";
    if (r.sup) rpr += '<w:vertAlign w:val="superscript"/>';
    if (r.sub) rpr += '<w:vertAlign w:val="subscript"/>';
    if (r.hl) rpr += '<w:highlight w:val="yellow"/>';
    return "<w:r>" + (rpr ? "<w:rPr>" + rpr + "</w:rPr>" : "") +
      '<w:t xml:space="preserve">' + esc(r.text) + "</w:t></w:r>";
  }
  function paraXML(runs, style, numId) {
    const ppr = (style ? '<w:pStyle w:val="' + style + '"/>' : "") +
      (numId ? '<w:numPr><w:ilvl w:val="0"/><w:numId w:val="' + numId + '"/></w:numPr>' : "");
    return "<w:p>" + (ppr ? "<w:pPr>" + ppr + "</w:pPr>" : "") + runs.map(runXML).join("") + "</w:p>";
  }

  /* A real Word table rather than the run-together paragraphs a <table>
     used to collapse into.

     OOXML requires a <w:tblGrid> — one <w:gridCol> per column, stating its
     width — as the basis every cell's own width is read against. Without
     it (the previous "w:type=auto, no grid" version) Word has nothing to
     distribute the page width across and falls back to sizing each column
     off its own content, which for the short cells a table usually holds
     (a name, a number, a date) means every column comes in a few
     characters wide and the whole table renders crushed into a strip down
     the page — this was that. Explicit widths that already sum to the
     page's own text width, plus a fixed layout so Word does not recompute
     them off content, is what a table export actually needs.

     Column widths are even; a cell's alignment marker class rides across
     as the paragraph's own justification so ":---:" still centres. */
  const CELL_JC = { "ta-c": "center", "ta-r": "right", "ta-l": "left" };
  function tableXML(tbl, pageWidth) {
    const rows = tbl.querySelectorAll("tr");
    if (!rows.length) return "";
    const cols = Math.max.apply(null, Array.prototype.map.call(rows, (tr) => tr.children.length));
    if (!cols) return "";
    /* pageWidth may be unset (a caller with no page geometry to hand):
       6.5in of usable width, Word's own default page minus 1in margins,
       is a sane floor rather than falling back to "auto" again. */
    const total = Math.max(cols * 400, Math.round(pageWidth) || 9360);
    const colW = Math.floor(total / cols);
    const widths = new Array(cols).fill(colW);
    widths[cols - 1] += total - colW * cols;    /* remainder to the last column, not lost to rounding */
    let xml = '<w:tbl><w:tblPr>' +
      '<w:tblW w:w="' + total + '" w:type="dxa"/>' +
      '<w:tblLayout w:type="fixed"/>' +
      '<w:tblBorders>' +
      ["top", "left", "bottom", "right", "insideH", "insideV"].map((e) =>
        '<w:' + e + ' w:val="single" w:sz="4" w:space="0" w:color="BFBAAB"/>').join("") +
      "</w:tblBorders></w:tblPr>" +
      "<w:tblGrid>" + widths.map((w) => '<w:gridCol w:w="' + w + '"/>').join("") + "</w:tblGrid>";
    Array.prototype.forEach.call(rows, (tr) => {
      xml += "<w:tr>";
      Array.prototype.forEach.call(tr.children, (cell, i) => {
        const head = cell.tagName.toLowerCase() === "th";
        const cls = cell.getAttribute("class") || "";
        const jc = Object.keys(CELL_JC).reduce((a, k) => (cls.indexOf(k) >= 0 ? CELL_JC[k] : a), "");
        const runs = runsFrom(cell, head ? { b: true } : {}, []);
        const ppr = "<w:pPr>" + (jc ? '<w:jc w:val="' + jc + '"/>' : "") +
          '<w:spacing w:after="0"/><w:ind w:firstLine="0"/></w:pPr>';
        xml += '<w:tc><w:tcPr><w:tcW w:w="' + (widths[i] || colW) + '" w:type="dxa"/>' +
          (head ? '<w:shd w:val="clear" w:fill="F4F0E6"/>' : "") + "</w:tcPr>" +
          "<w:p>" + ppr + (runs.length ? runs.map(runXML).join("") : "") + "</w:p></w:tc>";
      });
      xml += "</w:tr>";
    });
    return xml + "</w:tbl>";
  }

  /* Converts a chunk of editor HTML into an array of <w:p> strings.
     pageWidth (twips, usable width — page minus margins) sizes any table
     in the chunk to the page it will actually sit on; omit it only when
     no page geometry exists yet, and tableXML falls back to a standard
     page's width rather than to Word's own content-fit sizing. */
  function htmlToDocxParas(html, pageWidth) {
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
        if (tag === "table") { out.push(tableXML(n, pageWidth)); return; }
        if (tag === "h1") emit(n, "Heading1");
        else if (tag === "h2") emit(n, "Heading2");
        else if (tag === "h3") emit(n, "Heading3");
        else if (tag === "h4") emit(n, "Heading4");
        else if (tag === "h5") emit(n, "Heading5");
        else if (tag === "h6") emit(n, "Heading6");
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
        else if (tag === "pre") {
          const runs = expandPreBreaks(runsFrom(n, {}, [], true));
          if (runs.length) out.push(paraXML(runs, "Code", null));
        }
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
      heading("Heading4", "heading 4", "26", "220") +
      heading("Heading5", "heading 5", "24", "200") +
      heading("Heading6", "heading 6", "22", "200") +
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
      '<w:style w:type="paragraph" w:styleId="Code"><w:name w:val="Code"/><w:basedOn w:val="Normal"/>' +
      '<w:pPr><w:ind w:left="0" w:firstLine="0"/><w:spacing w:before="120" w:after="120" w:line="264" w:lineRule="auto"/></w:pPr>' +
      '<w:rPr><w:rFonts w:ascii="JetBrains Mono" w:hAnsi="JetBrains Mono" w:cs="JetBrains Mono"/><w:sz w:val="19"/></w:rPr></w:style>' +
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

    const width = size.w - mgL - mgR;
    let body = "";
    if (o.title) {
      body += paraXML([{ text: o.title }], "Title");
      if (o.subtitle) body += paraXML([{ text: o.subtitle }], "Subtitle");
    }
    (o.sections || []).forEach((sec, i) => {
      if (sec.pageBreakBefore && (body || i > 0)) body += PAGE_BREAK;
      if (sec.heading) body += paraXML([{ text: sec.heading }], "Heading1");
      body += htmlToDocxParas(sec.html, width).join("");
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
