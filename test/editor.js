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

  await browser.close();

  const passed = results.filter((r) => r.ok).length;
  console.log(passed + "/" + results.length + " passed");
  const failed = results.filter((r) => !r.ok);
  if (failed.length) {
    console.error("\nFAILED:\n" + failed.map((f) => "  - " + f.name + (f.detail ? "\n    " + f.detail : "")).join("\n"));
    process.exit(1);
  }
})();
