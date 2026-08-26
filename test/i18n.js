/* Translation table checks. No DOM, no browser — i18n.js is a plain IIFE.

   Two failure modes here are completely silent at runtime, which is why
   they need a test rather than a code review:

   1. A key present in `ru` but missing from `en` falls back to the Russian
      string (see t() in i18n.js), so an English user is shown Russian and
      nothing anywhere reports a problem.
   2. A key referenced from the UI that exists in neither table renders as
      its own raw name — "toast_storage_full" in place of a sentence.

   So: the two tables must hold exactly the same keys, and every key the
   source actually asks for must be in them. */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.join(__dirname, "..");

const results = [];
function check(name, cond, detail) {
  results.push({ name, ok: !!cond, detail: cond ? "" : (detail || "") });
}

/* ---- load the real tables ---- */
const sandbox = { window: {}, console };
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(root, "i18n.js"), "utf8"), sandbox, { filename: "i18n.js" });

/* STRINGS itself is private to the IIFE, so the tables are read back the
   way the app reads them: through the public translator. A key is "in" a
   language when that language returns something other than the Russian
   fallback — which is exactly the condition that matters. */
const t = sandbox.window.t;
check("i18n exposes its translator", typeof t === "function");

/* The key list comes from the file, not from a guess about what's in it. */
const src = fs.readFileSync(path.join(root, "i18n.js"), "utf8");
const ruBlock = src.slice(src.indexOf("ru: {"), src.indexOf("en: {"));
/* bounded at the close of STRINGS — past it sit ordinary option objects
   ({ day: "numeric", month: "short" }) that are not translations */
const enStart = src.indexOf("en: {");
const enBlock = src.slice(enStart, src.indexOf("\n  };", enStart));
/* Keys are matched wherever they sit, not per line: the table packs
   related short ones together ("word_one: …, word_few: …, word_many: …"
   all on one line), and a per-line regex silently sees only the first of
   each such group — which would quietly excuse exactly the keys it was
   meant to check. */
function keysOf(block) {
  const out = new Set();
  const re = /([a-zA-Z_][a-zA-Z0-9_]*)\s*:\s*"/g;
  let m;
  while ((m = re.exec(block))) out.add(m[1]);
  return out;
}
const ru = keysOf(ruBlock);
const en = keysOf(enBlock);

check("the ru table is non-trivial", ru.size > 300, "found " + ru.size + " keys");
check("the en table is non-trivial", en.size > 300, "found " + en.size + " keys");

const missingEn = Array.from(ru).filter((k) => !en.has(k)).sort();
const missingRu = Array.from(en).filter((k) => !ru.has(k)).sort();
check("every ru key has an en translation", missingEn.length === 0,
  "missing from en (an English user would be shown Russian): " + missingEn.join(", "));
check("every en key has a ru translation", missingRu.length === 0,
  "missing from ru: " + missingRu.join(", "));

/* ---- no blank strings ---- */
{
  const blanks = [];
  Array.from(ru).forEach((k) => {
    if (t(k, "ru") === "") blanks.push("ru:" + k);
    if (t(k, "en") === "") blanks.push("en:" + k);
  });
  check("no translation is an empty string", blanks.length === 0, blanks.join(", "));
}

/* ---- every key the UI asks for exists ---- */
{
  const files = fs.readdirSync(root)
    .filter((f) => (/\.(jsx|js)$/).test(f) && f !== "i18n.js" && f !== "build.js");
  const referenced = new Map();   /* key -> where it was seen */

  /* Matches the argument list of a translator call up to the end of the
     line, then pulls the string literals out of it — so a key inside a
     ternary (tl(cond ? "a" : "b")) is picked up as well as a plain one.
     Anything not shaped like a key (punctuation, a separator, a URL) is
     filtered out rather than reported as missing. */
  const CALL = /\b(?:tl|pluralT|t)\(([^\n]*)/g;
  const KEY = /^[a-z][a-z0-9_]*$/;

  files.forEach((f) => {
    const text = fs.readFileSync(path.join(root, f), "utf8");
    text.split("\n").forEach((line, i) => {
      let m;
      CALL.lastIndex = 0;
      while ((m = CALL.exec(line))) {
        const lits = m[1].match(/"([^"\\]*)"/g) || [];
        lits.forEach((lit) => {
          const k = lit.slice(1, -1);
          if (KEY.test(k) && !referenced.has(k)) referenced.set(k, f + ":" + (i + 1));
        });
      }
    });
  });

  check("the scan found the UI's keys", referenced.size > 100, "found " + referenced.size);

  /* A referenced name that is not a key is usually a literal that happened
     to look like one ("page", "left"), so only names absent from *both*
     tables and shaped like a real key are reported — the raw-name-on-screen
     case. Anything present in ru but not en is already caught above. */
  const unknown = Array.from(referenced.keys())
    .filter((k) => !ru.has(k) && !en.has(k))
    .filter((k) => k.indexOf("_") > 0)   /* real keys are snake_case */
    /* a trailing _ is a prefix being concatenated with a variable
       (tl("ol_status_" + status)), not a key in its own right */
    .filter((k) => k[k.length - 1] !== "_")
    .sort();
  check("every translated key referenced by the UI exists",
    unknown.length === 0,
    unknown.map((k) => k + " (" + referenced.get(k) + ")").join(", "));
}

const passed = results.filter((r) => r.ok).length;
console.log(passed + "/" + results.length + " passed");
const failed = results.filter((r) => !r.ok);
if (failed.length) {
  console.error("\nFAILED:\n" + failed.map((f) => "  - " + f.name + (f.detail ? "\n    " + f.detail : "")).join("\n"));
  process.exit(1);
}
