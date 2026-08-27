/* ============================================================
   Sipru. — the text engine: one schema, enforced after every edit.

   Every editor in this class (Obsidian/CodeMirror, ProseMirror, Slate)
   is built the same way: a *document model* declares which nodes may
   exist, what each may contain, and everything that mutates the
   document is passed through a normaliser that re-establishes those
   rules before anything is rendered, saved or exported. contentEditable
   on its own guarantees none of that — Chrome will happily build
   <h1><p>…</p><p>…</p></h1> out of one paste, and from that moment the
   document is no longer describable by the app's own block types:
   pagination sees a single unbreakable block, the style dropdown reports
   the wrapper rather than the text, and "back to body text" has nothing
   valid to convert into.

   So this file is the schema and the normaliser. The DOM stays the
   storage (nothing above it changes — the same contentEditable, the
   same HTML on disk, the same toolbar), but it is no longer allowed to
   hold a shape the schema does not describe.

     SCHEMA        what may live where
     normalize()   repairs a subtree into a schema-valid one, in place
     blockKind()   the schema name of a node ("h1", "note", "list"…)

   Two invariants are worth spelling out, because every bug this file
   exists for came from breaking one of them:

     1. A leaf block (paragraph, heading, note, caption) holds inline
        content only. A block that turns up inside one is *hoisted out*,
        never left nested — a heading can never end up containing the
        rest of the document.
     2. The root holds blocks only. A bare text run under the editable
        root is invisible to pagination and to footnote placement, so it
        is wrapped in a real paragraph.

   Normalisation moves nodes rather than rebuilding them, so a caret or
   a selection sitting inside the text rides along untouched.
   ============================================================ */
(function () {

  /* ---------------- the schema ----------------

     content:
       "inline"  — inline nodes and text only (a leaf block)
       "block"   — other blocks (the root, a quote, a table cell)
       "list"    — list items only
       "item"    — inline content plus nested lists
       "verbatim"— text only, kept character for character         */
  const SCHEMA = {
    ROOT:       { content: "block" },
    P:          { content: "inline", top: true },
    H1:         { content: "inline", top: true },
    H2:         { content: "inline", top: true },
    H3:         { content: "inline", top: true },
    H4:         { content: "inline", top: true },
    H5:         { content: "inline", top: true },
    H6:         { content: "inline", top: true },
    BLOCKQUOTE: { content: "block",  top: true },
    UL:         { content: "list",   top: true },
    OL:         { content: "list",   top: true },
    LI:         { content: "item" },
    PRE:        { content: "verbatim", top: true },
    HR:         { content: "void",   top: true },
    FIGURE:     { content: "block",  top: true },
    FIGCAPTION: { content: "inline" },
    ASIDE:      { content: "inline", top: true },
    TABLE:      { content: "block",  top: true },
    THEAD:      { content: "block" },
    TBODY:      { content: "block" },
    TR:         { content: "block" },
    TH:         { content: "inline" },
    TD:         { content: "inline" },
    DIV:        { content: "block",  top: true },   /* only ever .fn-defs */
  };
  /* Inline nodes: allowed anywhere text is, never promoted to a block. */
  const INLINE = { STRONG: 1, B: 1, EM: 1, I: 1, U: 1, S: 1, STRIKE: 1, SUP: 1, SUB: 1,
    CODE: 1, MARK: 1, A: 1, IMG: 1, INPUT: 1, BR: 1, SPAN: 1, FONT: 1 };

  const isEl = (n) => n && n.nodeType === 1;
  const isText = (n) => n && n.nodeType === 3;
  function tagOf(n) { return isEl(n) ? n.tagName : null; }
  function isBlock(n) { const t = tagOf(n); return !!(t && SCHEMA[t] && !INLINE[t]); }
  function isInline(n) { return isText(n) || (isEl(n) && !!INLINE[tagOf(n)]); }
  function contentOf(n) { const s = SCHEMA[tagOf(n)]; return s ? s.content : null; }

  /* The one <div> the document may contain is the hidden footnote store;
     any other one is a contentEditable artefact and gets unwrapped. */
  function isFnBox(n) {
    return tagOf(n) === "DIV" && n.classList && n.classList.contains("fn-defs");
  }
  /* Blocks the layout owns rather than the text: never touched, never
     counted as content. */
  function isMachinery(n) {
    return isEl(n) && n.classList &&
      (n.classList.contains("pg-spacer") || n.classList.contains("fn-defs"));
  }

  /* The schema name of a block, as the style dropdown and the outline
     speak of it — the tag alone can't tell an epigraph from a figure. */
  function blockKind(el) {
    const t = tagOf(el);
    if (!t) return "";
    if (t === "FIGURE") return el.classList.contains("epigraph") ? "epigraph" : "figure";
    if (t === "ASIDE") return el.classList.contains("note") ? "note" : "aside";
    if (t === "UL" || t === "OL") return "list";
    if (t === "PRE") return el.classList.contains("math") ? "math" : "code";
    return t.toLowerCase();
  }

  /* A block holding nothing but the <br> contentEditable parks in every
     empty line is empty — that placeholder is not content. Anything that
     carries meaning without text (an image, a checkbox, a rule) is. */
  function isEmptyBlock(el) {
    if (!isEl(el)) return false;
    if (tagOf(el) === "HR" || tagOf(el) === "BR") return false;
    if (el.querySelector && el.querySelector("img, input, hr")) return false;
    return !(el.textContent || "").trim();
  }

  /* ---------------- the normaliser ----------------

     One pass over the tree, depth first, applying the rules below to
     every node; repeated until a pass changes nothing (a hoist can
     expose the next violation one level up). Returns true if anything
     was repaired, so callers can re-save only when it matters. */
  function normalize(root) {
    if (!root) return false;
    let changed = false;
    for (let pass = 0; pass < 8; pass++) {
      if (!normalizePass(root)) break;
      changed = true;
    }
    if (ensureNotEmpty(root)) changed = true;
    return changed;
  }

  function normalizePass(root) {
    let changed = false;

    /* --- 1. unwrap containers the schema doesn't know ---
       <div> from a stray Enter, <section> from an old import, or one
       paragraph-per-<div> markup pasted from another app (Google Docs,
       Notion, various chat UIs' citation widgets): keep the children,
       drop the wrapper. A div/section/etc. is block-level, so it always
       implied a line break against whatever inline text sat right next
       to it — dropping the wrapper without replacing that break glues
       the two runs into one, letters touching with no space between
       them once wrapLooseRuns (step 4) folds them into a single <p>. */
    const strays = root.querySelectorAll("div, section, article, main, header, footer, nav");
    for (let i = 0; i < strays.length; i++) {
      const el = strays[i];
      /* the footnote store and the pagination spacers are the layout's own
         nodes, not text the writer typed */
      if (isFnBox(el) || isMachinery(el)) continue;
      /* only where inline text actually meets inline text: if the wrapper
         opens or closes with a block of its own, that block's own edge is
         already the break, and adding one here leaves a stray empty line. */
      if (isInline(el.firstChild) && isInline(el.previousSibling)) el.parentNode.insertBefore(document.createElement("br"), el);
      if (isInline(el.lastChild) && isInline(el.nextSibling)) el.parentNode.insertBefore(document.createElement("br"), el.nextSibling);
      unwrapInto(el);
      changed = true;
    }

    /* --- 2. a leaf block may not contain a block ---
       This is the rule the paste bug broke: Chrome dropped four <p>s
       inside the <h1> the caret happened to sit in, and the whole
       document became one heading. The blocks are hoisted out to the
       leaf's own level, in order, and the inline runs around them stay
       behind in copies of the leaf — so a heading with text pasted into
       its middle stays a heading, and the pasted paragraphs land as
       paragraphs beside it. */
    const leaves = root.querySelectorAll("p, h1, h2, h3, h4, h5, h6, aside, figcaption, li, td, th");
    for (let i = 0; i < leaves.length; i++) {
      const leaf = leaves[i];
      const mode = contentOf(leaf);
      if (mode !== "inline" && mode !== "item") continue;
      if (!hasBlockChild(leaf, mode)) continue;
      /* A table cell is the one leaf that cannot split: hoisting its
         blocks would put them between the row's cells and break the
         table. Its content flattens into lines instead. */
      const t = tagOf(leaf);
      if (t === "TD" || t === "TH") { if (flattenBlocks(leaf)) changed = true; continue; }
      if (hoistBlocks(leaf, mode)) changed = true;
    }

    /* --- 3. a list holds list items only --- */
    const lists = root.querySelectorAll("ul, ol");
    for (let i = 0; i < lists.length; i++) {
      if (repairList(lists[i])) changed = true;
    }

    /* --- 4. the root holds blocks only ---
       A bare text run here is invisible to pagination and to per-page
       footnote placement; wrap consecutive runs into one paragraph. */
    if (wrapLooseRuns(root)) changed = true;

    return changed;
  }

  function hasBlockChild(el, mode) {
    for (let c = el.firstChild; c; c = c.nextSibling) {
      if (!isBlock(c)) continue;
      /* a nested list is legal content of a list item */
      if (mode === "item" && (tagOf(c) === "UL" || tagOf(c) === "OL")) continue;
      return true;
    }
    return false;
  }

  /* Splits `el` around every block child, in place. The inline runs
     before and after each block are kept in clones of `el` (same tag,
     same marker classes), so nothing about the surviving text's style
     changes; empty clones are dropped. */
  function hoistBlocks(el, mode) {
    const parent = el.parentNode;
    if (!parent) return false;
    const frag = document.createDocumentFragment();
    const runs = [];
    let run = null;
    const openRun = () => {
      if (run) return run;
      run = el.cloneNode(false);                  /* same tag, same marker classes */
      runs.push(run);
      frag.appendChild(run);
      return run;
    };
    while (el.firstChild) {
      const c = el.firstChild;
      const nested = mode === "item" && (tagOf(c) === "UL" || tagOf(c) === "OL");
      if (isBlock(c) && !nested) {
        run = null;
        frag.appendChild(c);                      /* moved, not rebuilt */
      } else {
        openRun().appendChild(c);
      }
    }
    /* A run that caught nothing but whitespace was never text the writer
       typed — only the seam either side of the hoisted block. */
    runs.forEach((r) => { if (isEmptyBlock(r) && !r.querySelector("ul, ol")) r.remove(); });
    if (!frag.firstChild) { el.remove(); return true; }
    parent.insertBefore(frag, el);
    el.remove();
    return true;
  }
  /* Every block inside `el` becomes a line of it: the block's own content
     stays, separated from what came before by a line break. */
  function flattenBlocks(el) {
    let changed = false;
    for (let c = el.firstChild; c; ) {
      const next = c.nextSibling;
      if (isBlock(c)) {
        if (c.previousSibling) el.insertBefore(document.createElement("br"), c);
        unwrapInto(c);
        changed = true;
      }
      c = next;
    }
    return changed;
  }
  function unwrapInto(el) {
    const parent = el.parentNode;
    if (!parent) return;
    while (el.firstChild) parent.insertBefore(el.firstChild, el);
    el.remove();
  }

  function repairList(list) {
    let changed = false;
    let bucket = null;
    const kids = Array.prototype.slice.call(list.childNodes);
    kids.forEach((c) => {
      if (tagOf(c) === "LI") { bucket = null; return; }
      if (isText(c) && !(c.nodeValue || "").trim()) return;
      /* a block that fell into the list becomes its own item; loose
         inline runs join the item being built */
      if (isBlock(c) && tagOf(c) !== "UL" && tagOf(c) !== "OL") {
        const li = document.createElement("li");
        list.insertBefore(li, c);
        while (c.firstChild) li.appendChild(c.firstChild);
        c.remove();
        bucket = null;
      } else if (isInline(c)) {
        if (!bucket) { bucket = document.createElement("li"); list.insertBefore(bucket, c); }
        bucket.appendChild(c);
      } else {
        return;
      }
      changed = true;
    });
    return changed;
  }

  function wrapLooseRuns(root) {
    let changed = false;
    let run = null;
    const kids = Array.prototype.slice.call(root.childNodes);
    kids.forEach((c) => {
      if (isBlock(c) || isMachinery(c)) { run = null; return; }
      if (isText(c) && !(c.nodeValue || "").trim()) { root.removeChild(c); changed = true; return; }
      if (!isInline(c)) { root.removeChild(c); changed = true; return; }
      if (!run) { run = document.createElement("p"); root.insertBefore(run, c); }
      run.appendChild(c);
      changed = true;
    });
    return changed;
  }

  /* An editable with no element children is one keystroke away from a
     bare text node under the root, which is rule 4 all over again. */
  function ensureNotEmpty(root) {
    for (let c = root.firstChild; c; c = c.nextSibling) {
      if (isBlock(c) && !isMachinery(c)) return false;
    }
    const p = document.createElement("p");
    p.innerHTML = "<br>";
    root.appendChild(p);
    return true;
  }

  /* ---------------- normalising something not yet in the document ----

     The paste path: markdown-rendered HTML is normalised in an inert
     <div> before a single node of it reaches the editable, so the
     document is never *temporarily* invalid — and the caller learns
     whether what it holds is one paragraph (insert it inline, mid
     sentence) or a sequence of blocks (insert it as blocks). */
  function normalizeFragment(html) {
    const box = document.createElement("div");
    box.innerHTML = html || "";
    normalize(box);
    const blocks = Array.prototype.filter.call(box.children, (el) => !isMachinery(el));
    const single = blocks.length === 1 && tagOf(blocks[0]) === "P" ? blocks[0] : null;
    return {
      html: box.innerHTML,
      blocks: blocks.length,
      /* the inline content of a lone paragraph, for a mid-sentence paste */
      inline: single ? single.innerHTML : null,
    };
  }

  window.SipruEngine = {
    SCHEMA, INLINE, normalize, normalizeFragment, blockKind,
    isBlock, isInline, isEmptyBlock,
  };
})();
