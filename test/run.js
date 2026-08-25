/* Runs test/roundtrip.html in Chromium and reports the result.
   Playwright is not a project dependency — this uses whatever global
   install is on the machine, and skips (exit 0) when there is none, so
   `npm test` never fails for want of a browser. */
const { spawnSync } = require("child_process");
const path = require("path");

let chromium;
try {
  ({ chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright"));
} catch (e) {
  try { ({ chromium } = require("/opt/node22/lib/node_modules/playwright")); }
  catch (e2) {
    console.log("playwright not available — skipping browser round-trip tests");
    process.exit(0);
  }
}

const root = path.join(__dirname, "..");
spawnSync(process.execPath, [path.join(root, "build.js")], { stdio: "inherit" });

(async () => {
  const launch = {};
  if (process.env.CHROME_PATH) launch.executablePath = process.env.CHROME_PATH;
  let browser;
  try { browser = await chromium.launch(launch); }
  catch (e) {
    console.log("could not launch chromium — skipping browser round-trip tests");
    process.exit(0);
  }
  const page = await browser.newPage();
  const errs = [];
  page.on("pageerror", (e) => errs.push(String(e.message)));
  await page.goto("file://" + path.join(__dirname, "roundtrip.html"));
  await page.waitForFunction(() => window.__RESULTS__, null, { timeout: 15000 });
  const r = await page.evaluate(() => window.__RESULTS__);
  await browser.close();

  if (errs.length) {
    console.error("page errors:\n  " + errs.join("\n  "));
    process.exit(1);
  }
  console.log(r.passed + "/" + r.total + " passed");
  if (r.failed) {
    console.error("\nFAILED:\n" + r.failures.map((f) => "  - " + f).join("\n"));
    process.exit(1);
  }

  /* editor.js drives the real app UI (contentEditable, undo, touch) — a
     class of bug the markdown round-trip above can never see. */
  const editor = spawnSync(process.execPath, [path.join(__dirname, "editor.js")], { stdio: "inherit" });
  if (editor.status) process.exit(editor.status);

  /* pagination.js drives every page size × orientation combo and checks
     the rendered geometry directly — the class of bug neither of the
     above can see, since it is invisible to both the serializer and a
     single fixed page size. */
  const pagination = spawnSync(process.execPath, [path.join(__dirname, "pagination.js")], { stdio: "inherit" });
  if (pagination.status) process.exit(pagination.status);
})();
