/* Page-format regression tests — every page size × orientation combo the
   setup panel offers, driven against the real built app in real Chromium.

   Reported bug: switching to a small format (A6 in particular) left table
   rows and long text sliced clean through by the page boundary below them
   instead of moving whole onto the next page, and in the worst cases text
   ran wider than the page's own content column. This drives every format
   through the same content (a table too tall for one page, a table with
   long unbreakable-looking words, and a long run of prose) and checks two
   things geometrically, in real rendered pixels: nothing overflows the
   content column horizontally, and no table row straddles two pages'
   worth of vertical space. */
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

function tableRows(n, cols) {
  const rows = [];
  for (let i = 0; i < n; i++) {
    let tds = "";
    for (let c = 0; c < cols; c++) tds += "<td>Показатель довольно длинное слово " + i + "-" + c + "</td>";
    rows.push("<tr>" + tds + "</tr>");
  }
  return rows.join("");
}
const CONTENT =
  "<p>Вступительный текст перед таблицей, чтобы часть первой страницы уже была занята прозой.</p>" +
  "<table><thead><tr><th>Показатель</th><th>Латверия</th><th>Средняя Европа</th><th>Разница</th></tr></thead>" +
  "<tbody>" + tableRows(24, 4) + "</tbody></table>" +
  "<p>" + "Очень длинный абзац, который должен переноситься по словам и не должен вылезать за пределы страницы независимо от формата и ориентации листа. ".repeat(12) + "</p>";

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
  const chapId = await page.evaluate((html) => {
    window.SipruStore.completeOnboarding("Test", "light", "en");
    window.SipruStore.completeTour();
    const pid = window.SipruStore.createProject("Format test");
    const cid = window.SipruStore.addChapter(pid, "Chapter 1");
    window.SipruStore.updateDoc(cid, { content: html });
    return cid;
  }, CONTENT);
  await page.reload();
  await page.click(".card--project .card-inner");
  await page.waitForSelector(".chap");
  await page.click(".chap");
  await page.waitForSelector(".ed-area[contenteditable]");

  for (const size of SIZES) {
    for (const orient of ORIENTS) {
      await page.evaluate((args) => {
        window.SipruStore.setPage(args.cid, { size: args.size, orient: args.orient, zoom: 1 });
      }, { cid: chapId, size, orient });
      await page.waitForTimeout(350);

      const info = await page.evaluate(() => {
        const area = document.querySelector(".ed-area");
        const bands = Array.from(document.querySelectorAll(".ed-page-margins")).map((el) => el.getBoundingClientRect());
        const rows = Array.from(document.querySelectorAll(".ed-area table tr")).filter((tr) => !tr.classList.contains("pg-spacer"));
        const rowRects = rows.map((tr) => tr.getBoundingClientRect());
        const straddling = rowRects.filter((r) => !bands.some((b) => r.top >= b.top - 1 && r.bottom <= b.bottom + 1)).length;
        return {
          overflowsH: area.scrollWidth > area.clientWidth + 1,
          scrollWidth: area.scrollWidth, clientWidth: area.clientWidth,
          bandCount: bands.length, rowCount: rows.length, straddling,
        };
      });

      const label = size + "/" + orient;
      check("no horizontal overflow :: " + label, !info.overflowsH,
        "scrollWidth=" + info.scrollWidth + " clientWidth=" + info.clientWidth);
      check("no table row straddles a page boundary :: " + label, info.straddling === 0,
        info.straddling + " of " + info.rowCount + " rows straddle a page (bands=" + info.bandCount + ")");
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
