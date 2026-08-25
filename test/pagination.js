/* Page-format regression tests — every page size × orientation × zoom
   combo the setup panel offers, driven against the real built app in
   real Chromium, over one rich markdown document (headings, tables of
   different shapes, an ASCII-art code block, lists, a blockquote, long
   prose) run through the app's own markdown importer.

   Reported bugs, in order:
   1. A small format (A6 especially) left table rows sliced clean through
      the page boundary below them instead of moving whole onto the next
      page — a table is one block as far as pagination is concerned, so a
      table taller than a page had no way to break cleanly.
   2. Every block pushed to a later page landed one leading-margin's worth
      below where its own page frame actually starts (see the "baseTop"
      comment in editor-page.jsx) — invisible for plain prose, but enough
      to slice through a table row landing right at that edge.
   3. A code block's monospace lines were allowed to wrap, which is fine
      for prose-like comments but destroys any content that depends on
      its columns lining up — a box-drawing diagram most of all.
   4. All of the above got worse, not better, changing the zoom slider:
      its CSS transition could still be mid-flight when pagination read
      live block geometry, sizing spacers off a transient, not-yet-landed
      size.

   This drives every format through every zoom level and checks, in real
   rendered pixels: nothing overflows the content column horizontally, no
   table row straddles two pages' worth of vertical space, and no <pre>
   block's lines wrapped (its natural, unwrapped width would only exceed
   its rendered width if something wrapped it). */
const path = require("path");

let chromium;
try {
  ({ chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright"));
} catch (e) {
  try { ({ chromium } = require("/opt/node22/lib/node_modules/playwright")); }
  catch (e2) {
    console.log("playwright not available — skipping pagination tests");
    process.exit(0);
  }
}

const root = path.join(__dirname, "..");
const url = "file://" + path.join(root, "index.html");

const results = [];
function check(name, cond, detail) {
  results.push({ name, ok: !!cond, detail: cond ? "" : (detail || "") });
}

const SIZES = ["a4", "a5", "b5", "a6", "letter", "legal"];
const ORIENTS = ["portrait", "landscape"];
const ZOOMS = [0.5, 0.75, 1, 1.25, 1.6];

/* A representative document, not a real one: every element type the
   editor paginates specially (headings that keep-with-next, a table too
   tall for a page, a table with long cells that wrap, a box-drawing code
   block, a blockquote, lists, long justified prose) in one place. */
function mdTable(rows, cols) {
  const header = "| " + Array.from({ length: cols }, (_, c) => "Колонка " + (c + 1)).join(" | ") + " |";
  const sep = "| " + Array.from({ length: cols }, () => "---").join(" | ") + " |";
  const body = [];
  for (let r = 0; r < rows; r++) {
    body.push("| " + Array.from({ length: cols }, (_, c) => "Значение довольно длинное " + r + "-" + c).join(" | ") + " |");
  }
  return [header, sep, ...body].join("\n");
}
const MD = `# Заголовок первого уровня

Вводный абзац с **жирным текстом**, *курсивом* и \`встроенным кодом\`, достаточно длинный, чтобы перенестись на несколько строк независимо от формата страницы и уровня масштаба, который сейчас выбран в панели настроек.

## Таблица, которая не помещается на одну страницу

${mdTable(22, 4)}

## Таблица с длинными переносящимися ячейками

${mdTable(6, 3)}

### Диаграмма в блоке кода

\`\`\`
╔══════════════════════════════════╗
║        ПРИМЕР ДИАГРАММЫ          ║
╠══════════════════════════════════╣
║  1. ПЕРВЫЙ ПУНКТ                 ║
║     Пояснение к первому пункту    ║
║                                    ║
║  2. ВТОРОЙ ПУНКТ                  ║
║     Пояснение ко второму пункту   ║
╚══════════════════════════════════╝
\`\`\`

> Цитата: длинная строка, которая должна переноситься по словам и не вылезать за пределы страницы независимо от формата и ориентации листа.

- Первый пункт списка
- Второй пункт списка с более длинным текстом, который должен переноситься на следующую строку
- Третий пункт

## Ещё один заголовок

${"Длинный абзац прозы, много раз повторённый, чтобы гарантированно растянуться на несколько страниц при любом разумном масштабе и формате. ".repeat(20)}

## Вставленный текст без пустых строк

${Array.from({ length: 60 }, (_, i) => "Строка номер " + i + " из текста, вставленного без пустых строк между абзацами — ровно то, что превращает весь этот блок в один гигантский <br>-разделённый параграф, который раньше просто прошивал границы страниц насквозь.").join("\n")}
`;

(async () => {
  let browser;
  try {
    const launch = {};
    if (process.env.CHROME_PATH) launch.executablePath = process.env.CHROME_PATH;
    browser = await chromium.launch(launch);
  } catch (e) {
    console.log("could not launch chromium — skipping pagination tests");
    process.exit(0);
  }

  const context = await browser.newContext({ viewport: { width: 1400, height: 1000 } });
  const page = await context.newPage();
  await page.goto(url);
  const chapId = await page.evaluate((md) => {
    window.SipruStore.completeOnboarding("Test", "light", "en");
    window.SipruStore.completeTour();
    const html = window.SipruFormats.mdToHTML(md);
    const pid = window.SipruStore.createProject("Format test");
    const cid = window.SipruStore.addChapter(pid, "Chapter 1");
    window.SipruStore.updateDoc(cid, { content: html });
    return cid;
  }, MD);
  await page.reload();
  await page.click(".card--project .card-inner");
  await page.waitForSelector(".chap");
  await page.click(".chap");
  await page.waitForSelector(".ed-area[contenteditable]");

  for (const size of SIZES) {
    for (const orient of ORIENTS) {
      for (const zoom of ZOOMS) {
        await page.evaluate((args) => {
          window.SipruStore.setPage(args.cid, { size: args.size, orient: args.orient, zoom: args.zoom });
        }, { cid: chapId, size, orient, zoom });
        await page.waitForTimeout(300);

        const info = await page.evaluate(() => {
          const area = document.querySelector(".ed-area");
          const bands = Array.from(document.querySelectorAll(".ed-page-margins")).map((el) => el.getBoundingClientRect());
          const rows = Array.from(document.querySelectorAll(".ed-area table tr")).filter((tr) => !tr.classList.contains("pg-spacer"));
          const rowRects = rows.map((tr) => tr.getBoundingClientRect());
          const straddling = rowRects.filter((r) => !bands.some((b) => r.top >= b.top - 2 && r.bottom <= b.bottom + 2)).length;
          /* The one paragraph built from many <br>-joined lines (no blank
             line between them, exactly what a plain-text paste with no
             empty lines between "paragraphs" produces). Checked per
             *logical* line — the run of text between two real <br>s,
             which is the unit the fix actually moves as one — using each
             line's overall bounding box rather than every individual
             wrapped sub-line's rect, since a line that itself wraps to
             several visual rows is expected to do that inside one page,
             not to additionally be split sub-line by sub-line. */
          let lineStraddling = 0, lineTotal = 0;
          const megaP = Array.from(document.querySelectorAll(".ed-area p")).find((p) => p.querySelectorAll(":scope > br").length > 10);
          if (megaP) {
            /* pg-spacer <br>s (the fix's own page-break markers) are not
               part of any line's real content — skip past them so a
               line's measured box starts at its actual first character,
               not at the blank spacer sitting in front of it. */
            const skipSpacers = (n) => {
              while (n && n.nodeType === 1 && n.classList.contains("pg-spacer")) n = n.nextSibling;
              return n;
            };
            const brs = Array.from(megaP.querySelectorAll(":scope > br")).filter((b) => !b.classList.contains("pg-spacer"));
            let start = skipSpacers(megaP.firstChild);
            brs.concat([null]).forEach((br) => {
              const range = document.createRange();
              range.setStartBefore(start);
              if (br) range.setEndBefore(br); else range.setEndAfter(megaP.lastChild);
              const rects = Array.from(range.getClientRects()).filter((r) => r.width >= 1 && r.height >= 1);
              if (rects.length) {
                const top = Math.min(...rects.map((r) => r.top));
                const bottom = Math.max(...rects.map((r) => r.bottom));
                lineTotal++;
                if (!bands.some((b) => top >= b.top - 3 && bottom <= b.bottom + 3)) lineStraddling++;
              }
              if (br) start = skipSpacers(br.nextSibling);
            });
          }
          const pres = Array.from(document.querySelectorAll(".ed-area pre"));
          /* A wrapped line shows up as the block's own rendered width
             capping its content — scrollWidth (the content's natural,
             unwrapped extent) staying within a hair of clientWidth means
             every line fit on one line, exactly as typed. A pre that's
             wider than its column and *not* wrapping instead scrolls
             (scrollWidth > clientWidth), which is the point of the fix
             and not itself a failure. */
          return {
            overflowsH: area.scrollWidth > area.clientWidth + 1,
            scrollWidth: area.scrollWidth, clientWidth: area.clientWidth,
            bandCount: bands.length, rowCount: rows.length, straddling,
            lineTotal, lineStraddling,
            preCount: pres.length,
          };
        });

        const label = size + "/" + orient + "/" + Math.round(zoom * 100) + "%";
        check("no horizontal overflow :: " + label, !info.overflowsH,
          "scrollWidth=" + info.scrollWidth + " clientWidth=" + info.clientWidth);
        check("no table row straddles a page boundary :: " + label, info.straddling === 0,
          info.straddling + " of " + info.rowCount + " rows straddle a page (bands=" + info.bandCount + ")");
        check("no line of the <br>-joined paragraph straddles a page boundary :: " + label, info.lineStraddling === 0,
          info.lineStraddling + " of " + info.lineTotal + " line rects straddle a page (bands=" + info.bandCount + ")");
        check("code block present and paginated :: " + label, info.preCount > 0, "preCount=" + info.preCount);
      }
    }
  }

  await context.close();
  await browser.close();

  const passed = results.filter((r) => r.ok).length;
  console.log(passed + "/" + results.length + " passed");
  const failed = results.filter((r) => !r.ok);
  if (failed.length) {
    console.error("\nFAILED:\n" + failed.map((f) => "  - " + f.name + (f.detail ? "\n    " + f.detail : "")).join("\n"));
    process.exit(1);
  }
})();
