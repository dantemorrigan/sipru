/* ============================================================
   Writed. — build step
   Transpiles the .jsx sources to plain browser JS in build/.
   No bundling: every file stays a separate classic <script>, so
   the runtime semantics are identical to the sources.
   ============================================================ */
const fs = require("fs");
const path = require("path");
const esbuild = require("esbuild");

const SRC = ["components.jsx", "screens-onboarding.jsx", "screens-dashboard.jsx",
  "screens-editor.jsx", "screens-export.jsx", "screens-profile.jsx", "tour.jsx",
  "updater.jsx", "app.jsx"];
const OUT = path.join(__dirname, "build");
const check = process.argv.includes("--check");

fs.mkdirSync(OUT, { recursive: true });

let stale = [];

/* version.js is generated rather than committed, so package.json stays the
   single source of truth — the running app and the update check can never
   disagree about which build this is. Bump "build" there to ship an update. */
{
  const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, "package.json"), "utf8"));
  const code = "window.WRITED_VERSION=" + JSON.stringify(pkg.version) +
    ";window.WRITED_BUILD=" + (Number(pkg.build) || 0) + ";\n";
  const dest = path.join(OUT, "version.js");
  const prev = fs.existsSync(dest) ? fs.readFileSync(dest, "utf8") : null;
  if (prev !== code) {
    stale.push("version.js");
    if (!check) fs.writeFileSync(dest, code);
  }
}
for (const file of SRC) {
  const code = fs.readFileSync(path.join(__dirname, file), "utf8");
  const res = esbuild.transformSync(code, {
    loader: "jsx",
    jsx: "transform",              // classic runtime — React is a global UMD
    jsxFactory: "React.createElement",
    jsxFragment: "React.Fragment",
    target: ["es2019"],
    minify: true,
    sourcefile: file,
  });
  const dest = path.join(OUT, file.replace(/\.jsx$/, ".js"));
  const prev = fs.existsSync(dest) ? fs.readFileSync(dest, "utf8") : null;
  if (prev !== res.code) {
    stale.push(file);
    if (!check) fs.writeFileSync(dest, res.code);
  }
}

if (check && stale.length) {
  console.error("build/ is out of date for: " + stale.join(", ") + "\nRun: npm run build");
  process.exit(1);
}
console.log(check ? "build/ is up to date" : "built " + SRC.length + " files → build/");
