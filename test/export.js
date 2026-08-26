/* Export title-page regression tests, driven against the real built app in
   real Chromium.

   Reported bug: with a synopsis set on the project, the book title on the
   export preview's title page was cut off. StaticSheet scaled the *page
   box* down to whatever width the preview panel had, but never scaled the
   text inside it — so on a narrow panel the box shrank while the title,
   kicker and synopsis stayed full size. The block is vertically centred
   inside a container with overflow:hidden, so the extra line or two a
   synopsis adds pushed it past the clip and sliced the title.

   This drives the title page over a range of viewport widths (the panel
   width, and therefore the scale factor, follows the window) and page
   formats, with a long title and a full-length synopsis, and checks in
   real rendered pixels that nothing on the title page is clipped: every
   line of it stays inside the sheet body that clips it. */
const path = require("path");

let chromium;
try {
  ({ chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright"));
} catch (e) {
  try { ({ chromium } = require("/opt/node22/lib/node_modules/playwright")); }
  catch (e2) {
    console.log("playwright not available — skipping export tests");
    process.exit(0);
  }
}

const root = path.join(__dirname, "..");
const url = "file://" + path.join(root, "index.html");

const results = [];
function check(name, cond, detail) {
  results.push({ name, ok: !!cond, detail: cond ? "" : (detail || "") });
}

/* Deliberately at the limits the store allows: the longest title and the
   longest synopsis a writer can actually save are exactly the case that
   broke. */
const LONG_TITLE = "Хроника долгого и очень подробного путешествия к северным морям";
const LONG_SYNOPSIS =
  "История одного путешествия через северные земли, рассказанная человеком, " +
  "который сам не был уверен, чем оно закончится, и записывал всё по памяти " +
  "много лет спустя, уже в совсем другом городе и другой жизни";

const VIEWPORTS = [
  { width: 1400, height: 1000 },
  { width: 1100, height: 900 },
  { width: 900, height: 800 },
  { width: 760, height: 800 },
];
const SIZES = ["a4", "a5", "a6", "letter"];

(async () => {
  let browser;
  try {
    const launch = {};
    if (process.env.CHROME_PATH) launch.executablePath = process.env.CHROME_PATH;
    browser = await chromium.launch(launch);
  } catch (e) {
    console.log("could not launch chromium — skipping export tests");
    process.exit(0);
  }

  for (const viewport of VIEWPORTS) {
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();
    await page.goto(url);
    const ids = await page.evaluate((args) => {
      window.SipruStore.completeOnboarding("Test", "light", "ru");
      window.SipruStore.completeTour();
      const pid = window.SipruStore.createProject(args.title);
      window.SipruStore.updateProject(pid, { synopsis: args.synopsis });
      const cid = window.SipruStore.addChapter(pid, "Первая глава");
      window.SipruStore.updateDoc(cid, { content: "<p>Текст главы.</p>" });
      return { pid, cid };
    }, { title: LONG_TITLE, synopsis: LONG_SYNOPSIS });
    await page.reload();

    /* The store is the gate the synopsis actually passes through, so check
       there that neither limit quietly ate the text this test relies on. */
    const stored = await page.evaluate((pid) => {
      const p = window.SipruStore.get().projects.find((x) => x.id === pid);
      return { title: p.title, synopsis: p.synopsis };
    }, ids.pid);
    check("long title survives the store :: " + viewport.width,
      stored.title === LONG_TITLE, "stored as " + JSON.stringify(stored.title));
    check("long synopsis survives the store :: " + viewport.width,
      stored.synopsis === LONG_SYNOPSIS, "stored as " + JSON.stringify(stored.synopsis));

    await page.click(".card--project .card-inner");
    await page.waitForSelector(".btn--assemble");
    await page.click(".btn--assemble");
    await page.waitForSelector(".exp-title-page");

    for (const size of SIZES) {
      await page.evaluate((args) => {
        window.SipruStore.setPage(args.cid, { size: args.size, orient: "portrait" });
      }, { cid: ids.cid, size });
      await page.waitForTimeout(250);

      const info = await page.evaluate(() => {
        const tp = document.querySelector(".exp-title-page");
        if (!tp) return null;
        /* .exp-sheet-body is the element with overflow:hidden — whatever
           leaves its box is what the writer sees cut off. */
        const body = tp.closest(".exp-sheet-body");
        const b = body.getBoundingClientRect();
        const t = tp.getBoundingClientRect();

        /* Per line rather than per block: a block can report a box that
           fits while its own text has already overflowed the clip. */
        const clipped = [];
        [".b-kicker", "h1", ".b-syn"].forEach((sel) => {
          const el = tp.querySelector(sel);
          if (!el) return;
          const range = document.createRange();
          range.selectNodeContents(el);
          Array.from(range.getClientRects()).forEach((r) => {
            if (r.width < 1 || r.height < 1) return;
            if (r.top < b.top - 1 || r.bottom > b.bottom + 1 ||
                r.left < b.left - 1 || r.right > b.right + 1) {
              clipped.push(sel + " @ " + Math.round(r.top) + ".." + Math.round(r.bottom));
            }
          });
        });

        return {
          clipped,
          titleText: (tp.querySelector("h1") || {}).textContent || "",
          synText: (tp.querySelector(".b-syn") || {}).textContent || "",
          hasSyn: !!tp.querySelector(".b-syn"),
          blockOverflows: t.height > b.height + 1,
          bodyH: Math.round(b.height), blockH: Math.round(t.height),
          /* the sheet body is the clip; content taller than it is lost */
          scrollOverflow: body.scrollHeight > body.clientHeight + 1,
        };
      });

      const label = size + " @ " + viewport.width + "x" + viewport.height;
      check("title page renders with a synopsis :: " + label, info && info.hasSyn,
        "no .b-syn on the title page");
      check("title page fits its clipping box :: " + label, info && !info.blockOverflows,
        info && ("block " + info.blockH + "px in a " + info.bodyH + "px sheet body"));
      check("nothing on the title page is clipped :: " + label, info && !info.clipped.length,
        info && ("clipped: " + info.clipped.join(", ")));
      check("title page does not overflow its sheet :: " + label, info && !info.scrollOverflow,
        "sheet body scrollHeight exceeds clientHeight");
      check("the whole title is present :: " + label,
        info && info.titleText === LONG_TITLE,
        info && ("rendered " + JSON.stringify(info.titleText)));
      check("the whole synopsis is present :: " + label,
        info && info.synText === LONG_SYNOPSIS,
        info && ("rendered " + JSON.stringify(info.synText)));
    }

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
