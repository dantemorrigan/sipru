/* Editor regression tests — driven against the real built app in real
   Chromium (contentEditable, keyboard shortcuts, touch events). These
   exist because roundtrip.html only exercises the markdown/HTML
   serializers: it never opens a live contentEditable, presses Ctrl+Z, or
   dispatches a touch event, so a whole class of bugs shipped to main
   invisibly — undo silently no-op'ing on custom inserts, and the mobile
   overflow menu eating every tap without running the tapped action. Each
   case below reproduces one of those bugs so it can't come back unnoticed.
*/
const path = require("path");

let chromium;
try {
  ({ chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright"));
} catch (e) {
  try { ({ chromium } = require("/opt/node22/lib/node_modules/playwright")); }
  catch (e2) {
    console.log("playwright not available — skipping editor tests");
    process.exit(0);
  }
}

const root = path.join(__dirname, "..");
const url = "file://" + path.join(root, "index.html");

const results = [];
function check(name, cond, detail) {
  results.push({ name, ok: !!cond, detail: cond ? "" : (detail || "") });
}

/* Fresh app, onboarded and dropped straight into a brand-new note's
   editor — every test gets an empty document and an untouched undo stack. */
async function openEditor(browser, contextOpts) {
  const context = await browser.newContext(contextOpts || {});
  const page = await context.newPage();
  await page.goto(url);
  await page.evaluate(() => {
    window.SipruStore.completeOnboarding("Test", "light", "en");
    window.SipruStore.completeTour();
    window.SipruStore.createNote("Test note");
  });
  await page.reload();
  await page.click(".card--note .card-inner");
  await page.waitForSelector(".ed-area[contenteditable]");
  await page.click(".ed-area");
  return { context, page };
}

const isMac = process.platform === "darwin";
const MOD = isMac ? "Meta" : "Control";
async function undo(page) { await page.keyboard.press(MOD + "+z"); }

/* A real clipboard paste of plain text, the way one arrives from another
   app — the editor reads text/plain and renders it as markdown. */
async function pasteText(page, text) {
  await page.evaluate((t) => {
    const area = document.querySelector(".ed-area");
    area.focus();
    const dt = new DataTransfer();
    dt.setData("text/plain", t);
    area.dispatchEvent(new ClipboardEvent("paste", { clipboardData: dt, bubbles: true, cancelable: true }));
  }, text);
  await page.waitForTimeout(250);
}
/* The block types of the document, ignoring the layout's own spacers. */
function topTags(page) {
  return page.$eval(".ed-area", (area) => Array.prototype.filter
    .call(area.children, (el) => !el.classList.contains("pg-spacer") && !el.classList.contains("fn-defs"))
    .map((el) => el.tagName));
}
async function selectAll(page) {
  await page.evaluate(() => {
    const area = document.querySelector(".ed-area");
    area.focus();
    const r = document.createRange();
    r.selectNodeContents(area);
    const s = getSelection(); s.removeAllRanges(); s.addRange(r);
  });
  await page.waitForTimeout(80);
}
/* Presses an entry of the style dropdown the way the toolbar does
   (mousedown, so the selection in the document is never dropped). */
async function setStyle(page, label) {
  await page.click(".ed-style-btn");
  await page.waitForSelector(".ed-style-menu");
  await page.locator(".ed-style-menu button", { hasText: label }).first().dispatchEvent("mousedown");
  await page.waitForTimeout(400);
}

async function openInsertMenu(page) {
  await page.click('.ed-insert > button[title="Insert"]');
  await page.waitForSelector(".ed-insert-menu");
}

(async () => {
  let browser;
  try {
    const launch = {};
    if (process.env.CHROME_PATH) launch.executablePath = process.env.CHROME_PATH;
    browser = await chromium.launch(launch);
  } catch (e) {
    console.log("could not launch chromium — skipping editor tests");
    process.exit(0);
  }

  /* ---- undo must remove a page break, not just disarm the button ---- */
  {
    const { context, page } = await openEditor(browser);
    await page.keyboard.type("Hello");
    await openInsertMenu(page);
    await page.click(".ed-insert-menu >> text=Page break");
    const before = await page.$$eval("hr.page-break", (els) => els.length);
    check("page break :: inserted", before === 1, "count=" + before);
    await undo(page);
    const after = await page.$$eval("hr.page-break", (els) => els.length);
    check("page break :: undo removes it", after === 0, "count=" + after);
    await context.close();
  }

  /* ---- same bug class: footnote insert must be undoable ---- */
  {
    const { context, page } = await openEditor(browser);
    await page.keyboard.type("Hello");
    await openInsertMenu(page);
    await page.click(".ed-insert-menu >> text=Footnote");
    const before = await page.$$eval("sup.fn", (els) => els.length);
    check("footnote :: inserted", before === 1, "count=" + before);
    /* Two native editing commands go into a footnote (insertText, then
       superscript — see insertFootnote's comment), so it takes two undos
       to fully remove; anything left after that is the bug. */
    await undo(page);
    await undo(page);
    const after = await page.$$eval("sup, sup.fn", (els) => els.length);
    check("footnote :: undo removes it", after === 0, "count=" + after);
    await context.close();
  }

  /* ---- deleting a page break with Backspace must be undoable too ---- */
  {
    const { context, page } = await openEditor(browser);
    await page.keyboard.type("Hello");
    await openInsertMenu(page);
    await page.click(".ed-insert-menu >> text=Page break");
    /* insertBlock leaves the caret at the start of the empty paragraph it
       creates right after the break — exactly where Backspace should reach
       back and eat the <hr> ahead of it. Re-clicking .ed-area here would
       just relocate the caret and miss the case entirely. */
    await page.keyboard.press("Backspace");
    const gone = await page.$$eval("hr.page-break", (els) => els.length);
    check("page break :: backspace removes it", gone === 0, "count=" + gone);
    await undo(page);
    const back = await page.$$eval("hr.page-break", (els) => els.length);
    check("page break :: undo restores the backspace-deleted break", back === 1, "count=" + back);
    await context.close();
  }

  /* ---- mobile: a tap on an overflow-menu item must run its action, not
     just close the menu. BarMenu portals to document.body, and the
     outside-press listener used to treat any touch inside it as "outside"
     — the exact bug reported on-device, reproduced here with a real
     touchscreen tap instead of a mouse click. ---- */
  {
    const { context, page } = await openEditor(browser, { hasTouch: true, isMobile: true, viewport: { width: 390, height: 844 } });
    await page.tap(".ed-insert > button[title=\"Insert\"]");
    await page.waitForSelector(".ed-insert-menu");
    const item = page.locator(".ed-insert-menu >> text=Footnote");
    await item.tap();
    const inserted = await page.$$eval("sup.fn", (els) => els.length);
    check("mobile tap :: overflow menu item runs its action", inserted === 1, "count=" + inserted);
    await context.close();
  }

  /* ---- the document schema holds under a paste ----

     Reported from the field: text copied out of a web page and dropped
     into a note whose one (empty) block had been switched to Heading 1
     came back as <h1><p>…</p><p>…</p></h1> — the whole pasted document
     swallowed by one heading. From there pagination had a single
     unbreakable block to lay out (text ran off the sheet), and no press
     of the style picker could take the heading off again, because there
     was no block structure left to convert. ---- */
  {
    const { context, page } = await openEditor(browser);
    await page.evaluate(() => {
      const area = document.querySelector(".ed-area");
      area.focus();
      document.execCommand("formatBlock", false, "h1");
    });
    await pasteText(page, "First paragraph.\n\nSecond paragraph.\n\nThird paragraph.");
    const tags = await topTags(page);
    check("paste :: multi-block paste lands as top-level blocks",
      tags.join(",") === "P,P,P", tags.join(","));
    const nested = await page.$$eval(".ed-area h1 p, .ed-area p p, .ed-area p h1", (els) => els.length);
    check("paste :: no block ends up nested inside another", nested === 0, "count=" + nested);
    await context.close();
  }

  /* Pasting into a heading that has text keeps the heading and puts the
     pasted blocks after it — the paste is not part of the title. */
  {
    const { context, page } = await openEditor(browser);
    await page.keyboard.type("Chapter one");
    await page.evaluate(() => {
      document.querySelector(".ed-area").focus();
      document.execCommand("formatBlock", false, "h1");
    });
    await pasteText(page, "First paragraph.\n\nSecond paragraph.");
    const tags = await topTags(page);
    check("paste :: into a heading with text keeps the heading",
      tags.join(",") === "H1,P,P", tags.join(","));
    await context.close();
  }

  /* A short paste mid-sentence still belongs to the sentence. */
  {
    const { context, page } = await openEditor(browser);
    await page.keyboard.type("start end");
    await page.evaluate(() => {
      const t = document.querySelector(".ed-area p").firstChild;
      const r = document.createRange();
      r.setStart(t, 6); r.collapse(true);
      const s = getSelection(); s.removeAllRanges(); s.addRange(r);
    });
    await pasteText(page, "middle ");
    const tags = await topTags(page);
    const text = await page.$eval(".ed-area", (el) => el.textContent);
    check("paste :: one line pastes inline, not as a new block",
      tags.join(",") === "P" && text.replace(/\s+/g, "") === "startmiddleend",
      tags.join(",") + " / " + text);
    await context.close();
  }

  /* ---- a block style applies to every block the selection touches ----

     execCommand("formatBlock") answers a multi-block selection by merging
     it into one element: press Heading 1 with a chapter selected and
     thirty paragraphs come back as a single heading holding line breaks,
     which is both wrong and unconvertible afterwards. ---- */
  {
    const { context, page } = await openEditor(browser);
    await pasteText(page, "One.\n\nTwo.\n\nThree.\n\nFour.");
    const before = await topTags(page);
    check("style :: paste produced four paragraphs", before.join(",") === "P,P,P,P", before.join(","));

    await selectAll(page);
    await setStyle(page, "Heading 1");
    const headed = await topTags(page);
    check("style :: heading applies to every selected block",
      headed.join(",") === "H1,H1,H1,H1", headed.join(","));

    await selectAll(page);
    await setStyle(page, "Body");
    const back = await topTags(page);
    const text = await page.$eval(".ed-area", (el) => el.textContent);
    check("style :: pressing body text takes the heading off again",
      back.join(",") === "P,P,P,P", back.join(","));
    check("style :: no text is lost converting there and back",
      text === "One.Two.Three.Four.", JSON.stringify(text));
    await context.close();
  }

  /* Epigraph and note are whole blocks of their own, and converting one
     back has to replace the block — not leave its shell standing with the
     new paragraph tucked inside it (which is what the browser's own
     insertHTML does when asked to replace a <figure>). */
  {
    const { context, page } = await openEditor(browser);
    await page.keyboard.type("A line worth quoting");
    await setStyle(page, "Epigraph");
    const asEpigraph = await topTags(page);
    check("style :: paragraph becomes an epigraph",
      asEpigraph.join(",") === "FIGURE", asEpigraph.join(","));
    await setStyle(page, "Body");
    const back = await topTags(page);
    const text = await page.$eval(".ed-area", (el) => el.textContent);
    check("style :: an epigraph converts back to a plain paragraph",
      back.join(",") === "P" && text === "A line worth quoting",
      back.join(",") + " / " + JSON.stringify(text));
    await context.close();
  }

  /* The style press is one edit, so one undo puts the blocks back. */
  {
    const { context, page } = await openEditor(browser);
    await pasteText(page, "One.\n\nTwo.");
    await selectAll(page);
    await setStyle(page, "Heading 1");
    await undo(page);
    const tags = await topTags(page);
    check("style :: undo restores the blocks the style replaced",
      tags.join(",") === "P,P", tags.join(","));
    await context.close();
  }

  await browser.close();

  const passed = results.filter((r) => r.ok).length;
  console.log(passed + "/" + results.length + " passed");
  const failed = results.filter((r) => !r.ok);
  if (failed.length) {
    console.error("\nFAILED:\n" + failed.map((f) => "  - " + f.name + (f.detail ? "\n    " + f.detail : "")).join("\n"));
    process.exit(1);
  }
})();
