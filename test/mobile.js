/* Phone layout tests — the Android app drawn edge-to-edge, in real Chromium
   with a fake of the Kotlin shell (window.SipruAndroidShell) reporting a
   40px status bar and a 24px gesture bar.

   Reported bug: on Android every header and toolbar sat on top of the clock
   and the gesture handle, because the WebView reports neither bar to CSS and
   fixed-height headers swallowed the padding that would have cleared them.
   These check, in rendered pixels, that nothing the user has to touch sits
   under a system bar, that the toolbar fits the screen, and that the keyboard
   lifts it. */
const path = require("path");

let chromium;
try {
  ({ chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright"));
} catch (e) {
  try { ({ chromium } = require("/opt/node22/lib/node_modules/playwright")); }
  catch (e2) {
    console.log("playwright not available — skipping phone layout tests");
    process.exit(0);
  }
}

const url = "file://" + path.join(__dirname, "..", "index.html");
const TOP = 40, BOTTOM = 24, W = 412, H = 915;

const results = [];
function check(name, cond, detail) {
  results.push({ name, ok: !!cond, detail: cond ? "" : (detail || "") });
}

(async () => {
  let browser;
  try {
    const launch = {};
    if (process.env.CHROME_PATH) launch.executablePath = process.env.CHROME_PATH;
    browser = await chromium.launch(launch);
  } catch (e) {
    console.log("could not launch chromium — skipping phone layout tests");
    process.exit(0);
  }
  const context = await browser.newContext({
    viewport: { width: W, height: H }, isMobile: true, hasTouch: true, deviceScaleFactor: 1,
    userAgent: "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36",
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.addInitScript((i) => {
    window.__haptics = [];
    window.SipruAndroidShell = {
      getInsets: () => JSON.stringify(i), haptic: (k) => window.__haptics.push(k), setSystemBars() {},
    };
  }, { top: TOP, right: 0, bottom: BOTTOM, left: 0, ime: 0 });
  await page.goto(url);
  await page.evaluate(() => {
    const S = window.SipruStore;
    S.completeOnboarding("Test", "light", "ru"); S.completeTour();
    const pid = S.createProject("Book");
    const c = S.addChapter(pid, "Chapter 1");
    S.updateDoc(c, { content: "<p>Some text.</p>" });
  });
  await page.reload();
  await page.waitForSelector(".card--project .card-inner");
  await page.waitForTimeout(500);

  /* ---- the library ---- */
  const dash = await page.evaluate(() => {
    const bar = document.querySelector(".bar").getBoundingClientRect();
    const btns = [...document.querySelectorAll(".bar button")].map((b) => b.getBoundingClientRect()).filter((r) => r.width > 0);
    const tab = document.querySelector(".tabbar").getBoundingClientRect();
    return { barTop: bar.top, minBtnTop: Math.min.apply(null, btns.map((r) => r.top)), tabBottom: tab.bottom };
  });
  check("phone :: library buttons start below the status bar", dash.minBtnTop >= TOP, "top=" + dash.minBtnTop);
  check("phone :: the tab bar's icons clear the gesture bar",
    await page.evaluate((b) => [...document.querySelectorAll(".tab")].every((t) => t.getBoundingClientRect().bottom <= innerHeight - b + 1), BOTTOM));

  /* ---- the editor ---- */
  await page.tap(".card--project .card-inner");
  await page.waitForSelector(".chap");
  await page.tap(".chap");
  await page.waitForSelector(".ed-area[contenteditable]");
  await page.waitForTimeout(500);
  const ed = await page.evaluate(() => {
    const r = (el) => el.getBoundingClientRect();
    const head = [...document.querySelectorAll(".ed-head button")].map(r).filter((x) => x.width > 0);
    const bar = document.querySelector(".ed-bar");
    const scroller = document.querySelector(".ed-bar-scroll");
    const tools = [...scroller.querySelectorAll(".tool, .ed-style-btn")].map(r);
    const end = [...document.querySelectorAll(".ed-bar-end .tool")].map(r);
    const vis = tools.filter((t) => t.right <= innerWidth && t.left >= 0);
    return {
      headTop: Math.min.apply(null, head.map((x) => x.top)),
      endBottom: Math.max.apply(null, end.map((x) => x.bottom)),
      endCount: end.length, endMinLeft: Math.min.apply(null, end.map((x) => x.left)),
      endMaxRight: Math.max.apply(null, end.map((x) => x.right)),
      barBottom: r(bar).bottom, visibleTools: vis.length,
      scrollerW: scroller.clientWidth, barW: bar.clientWidth,
      labels: [...document.querySelectorAll(".ed-bar-end .tool-lbl")].every((l) => getComputedStyle(l).display !== "none"),
    };
  });
  check("phone :: editor header buttons start below the status bar", ed.headTop >= TOP, "top=" + ed.headTop);
  check("phone :: the mode buttons clear the gesture bar", ed.endBottom <= H - BOTTOM + 1, "bottom=" + ed.endBottom);
  check("phone :: the four mode buttons are all on screen",
    ed.endCount === 4 && ed.endMinLeft >= 0 && ed.endMaxRight <= W, JSON.stringify([ed.endCount, ed.endMinLeft, ed.endMaxRight]));
  check("phone :: the mode buttons say what they are", ed.labels);
  check("phone :: the formatting row spans the whole screen", ed.scrollerW >= W - 2, "w=" + ed.scrollerW);
  check("phone :: at least bold, italic and underline are reachable without scrolling", ed.visibleTools >= 7, "visible=" + ed.visibleTools);

  /* ---- the keyboard ---- */
  await page.evaluate((t) => window.__sipruInsets(JSON.stringify({ top: t, right: 0, bottom: 0, left: 0, ime: 330 })), TOP);
  await page.waitForTimeout(300);
  const kb = await page.evaluate(() => {
    const bar = document.querySelector(".ed-bar").getBoundingClientRect();
    return { bottom: bar.bottom, endShown: getComputedStyle(document.querySelector(".ed-bar-end")).display !== "none" };
  });
  check("phone :: the toolbar rides on top of the keyboard", Math.abs(kb.bottom - (H - 330)) <= 2, "bottom=" + kb.bottom);
  check("phone :: while typing only the formatting row stays", kb.endShown === false);
  await page.evaluate((i) => window.__sipruInsets(JSON.stringify(i)), { top: TOP, right: 0, bottom: BOTTOM, left: 0, ime: 0 });

  /* ---- feedback follows the press ---- */
  const before = await page.evaluate(() => window.__haptics.length);
  await page.tap(".ed-bar-scroll .tool:not([disabled])");
  const after = await page.evaluate(() => window.__haptics.length);
  check("phone :: a tap reaches the native haptics", after > before, before + " → " + after);

  /* ---- the profile switches ---- */
  await page.evaluate(() => { const b = [...document.querySelectorAll("button")].find((x) => /Профиль/.test(x.textContent)); b && b.click(); });
  await page.goto(url);
  await page.waitForSelector(".tabbar");
  await page.tap(".tab:last-child");
  await page.waitForSelector(".prof-card");
  const rows = await page.evaluate(() => [...document.querySelectorAll(".prof-row-l")].map((e) => e.textContent));
  check("profile :: has sound and haptics switches on a phone", rows.indexOf("Звуки") >= 0 && rows.indexOf("Вибрация") >= 0, rows.join("|"));
  await page.evaluate(() => {
    const row = [...document.querySelectorAll(".prof-row")].find((r) => /Звуки/.test(r.textContent));
    [...row.querySelectorAll("button")].find((b) => /Выкл/.test(b.textContent)).click();
  });
  const user = await page.evaluate(() => window.SipruStore.get().user);
  check("profile :: sounds off is remembered", user.sound === false, JSON.stringify(user.sound));
  check("profile :: haptics stay on", user.haptics !== false);

  check("phone :: no page errors", errors.length === 0, errors.join(" | "));
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
