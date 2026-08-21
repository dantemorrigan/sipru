/* ============================================================
   Writed. (Tauri) — stages the exact production runtime into
   src-tauri/dist/, so the desktop bundle embeds only the files
   the app actually loads (not node_modules, .git, source .jsx,
   or the Rust project itself). Regenerated on every build; the
   web app's own files and build step are untouched.
   ============================================================ */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const OUT = path.join(__dirname, "dist");

const FILES = ["index.html", "styles.css", "ui.css", "tour.css", "favicon.svg", "paper.svg"];
const FILE_DIRS = ["vendor", "build"];
/* store.js / i18n.js / formats.js load as classic <script> tags, same as vendor/build */
const ROOT_SCRIPTS = ["store.js", "i18n.js", "formats.js", "haptics.js", "vault.js"];

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

function copyFile(rel) {
  const dest = path.join(OUT, rel);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(path.join(ROOT, rel), dest);
}
function copyDir(rel) {
  for (const name of fs.readdirSync(path.join(ROOT, rel))) copyFile(path.join(rel, name));
}

[...FILES, ...ROOT_SCRIPTS].forEach(copyFile);
FILE_DIRS.forEach(copyDir);

console.log("staged " + (FILES.length + ROOT_SCRIPTS.length) + " files + " + FILE_DIRS.length + " dirs → src-tauri/dist/");
