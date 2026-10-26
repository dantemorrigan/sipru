/* Feedback tests — sound.js, haptics.js and native.js, run in a sandbox with
   a fake Web Audio and a fake Android shell. No browser is needed: what is
   under test is which sound and which haptic an action produces, that the
   profile switches really silence them, and that the Android insets reach the
   page as CSS variables. */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.join(__dirname, "..");
const read = (f) => fs.readFileSync(path.join(root, f), "utf8");

const results = [];
function check(name, cond, detail) {
  results.push({ name, ok: !!cond, detail: cond ? "" : (detail || "") });
}
function eq(name, actual, expected) {
  check(name, JSON.stringify(actual) === JSON.stringify(expected),
    "got " + JSON.stringify(actual) + ", expected " + JSON.stringify(expected));
}

/* ---- a Web Audio double that only counts what was started ---- */
function fakeAudio() {
  const log = { osc: 0, noise: 0, created: 0 };
  const param = () => ({
    value: 0,
    setValueAtTime() {}, exponentialRampToValueAtTime() {}, linearRampToValueAtTime() {},
  });
  const node = () => ({ connect() {}, disconnect() {}, gain: param(), frequency: param(), Q: param(),
    delayTime: param(), threshold: param(), knee: param(), ratio: param(), attack: param(), release: param() });
  class AC {
    constructor() { log.created++; this.currentTime = 0; this.sampleRate = 8000; this.state = "running"; this.destination = node(); }
    resume() {}
    createGain() { return node(); }
    createDelay() { return node(); }
    createBiquadFilter() { return node(); }
    createDynamicsCompressor() { return node(); }
    createBuffer(c, len) { return { getChannelData: () => new Float32Array(len) }; }
    createOscillator() { log.osc++; const n = node(); n.start = () => {}; n.stop = () => {}; return n; }
    createBufferSource() { log.noise++; const n = node(); n.start = () => {}; n.stop = () => {}; return n; }
  }
  return { AC, log };
}

function sandbox(opts) {
  const o = opts || {};
  const listeners = {};
  const store = { user: { sound: o.sound, haptics: o.haptics }, projects: [], notes: [] };
  const subs = [];
  const audio = fakeAudio();
  const style = {};
  const win = {
    AudioContext: audio.AC,
    SipruStore: { get: () => store, subscribe(fn) { subs.push(fn); } },
    matchMedia: () => ({ matches: o.coarse !== false }),
    addEventListener(ev, fn) { (listeners[ev] = listeners[ev] || []).push(fn); },
    dispatchEvent() {}, CustomEvent: function () {},
    innerHeight: o.innerHeight || 900,
    isSecureContext: true,
  };
  if (o.shell) win.SipruAndroidShell = o.shell;
  const doc = {
    hidden: false,
    addEventListener() {},
    documentElement: {
      style: { setProperty(k, v) { style[k] = v; } },
      classList: { add() {} },
      getAttribute: () => "light",
    },
  };
  const ctx = {
    window: win, document: doc, navigator: { vibrate: (p) => { ctx.__vib.push(p); return true; } },
    Date, console, Math, JSON, __vib: [], MutationObserver: function () { this.observe = () => {}; },
    requestAnimationFrame: (f) => f(), setTimeout, clearTimeout,
  };
  ctx.self = win;
  Object.assign(win, { document: doc, navigator: ctx.navigator, Date });
  vm.createContext(ctx);
  return { ctx, win, store, subs, audio, style, listeners, run: (f) => vm.runInContext(read(f), ctx, { filename: f }) };
}

/* ---------------- sound.js ---------------- */
{
  const sb = sandbox();
  sb.run("sound.js");
  const S = sb.win.SipruSound;
  check("sound :: exposes its voices", S && S.names.length >= 15, S && S.names.length);
  let allOk = true;
  S.names.forEach((n) => {
    sb.ctx.Date = { now: (() => { let t = 0; return () => (t += 1000); })() };
    if (!S.play(n)) allOk = false;
  });
  check("sound :: every voice plays without throwing", allOk);
  check("sound :: voices make real tones", sb.audio.log.osc > 20, sb.audio.log.osc);
  check("sound :: one audio context is shared", sb.audio.log.created === 1, sb.audio.log.created);
  eq("sound :: an unknown name is ignored", S.play("nope"), false);

  const quiet = sandbox();
  quiet.run("sound.js");
  quiet.ctx.document.hidden = true;
  eq("sound :: nothing plays while the page is hidden", quiet.win.SipruSound.play("tap"), false);
}
{
  const sb = sandbox();
  sb.run("sound.js");
  let t = 5000;
  sb.ctx.Date = { now: () => t };
  const first = sb.win.SipruSound.play("tap");
  t += 10;
  const second = sb.win.SipruSound.play("tap");
  check("sound :: the same sound twice inside a frame is one", first === true && second === false, first + "/" + second);
}

/* ---------------- native.js ---------------- */
{
  const calls = [];
  const sb = sandbox({
    shell: {
      getInsets: () => JSON.stringify({ top: 40, right: 0, bottom: 24, left: 0, ime: 0 }),
      haptic: (k) => calls.push(k), setSystemBars: (l) => calls.push("bars:" + l),
    },
  });
  sb.run("native.js");
  const N = sb.win.SipruNative;
  eq("native :: insets become CSS variables", [sb.style["--sat"], sb.style["--sab"]], ["40px", "24px"]);
  check("native :: reports itself available", N.available === true);
  check("native :: system bars follow the theme", calls.indexOf("bars:true") >= 0, calls.join());
  N.haptic("success");
  check("native :: haptics reach the shell", calls.indexOf("success") >= 0, calls.join());

  /* keyboard: the page lifts its bars only for what the viewport did not already give up */
  sb.win.__sipruInsets(JSON.stringify({ top: 40, right: 0, bottom: 0, left: 0, ime: 300 }));
  eq("native :: a keyboard that did not resize the page is its full height", N.keyboardOffset(), 300);
  sb.win.innerHeight = 600;
  eq("native :: a keyboard the page already shrank for needs no offset", N.keyboardOffset(), 0);
  sb.win.__sipruInsets(JSON.stringify({ top: 40, right: 0, bottom: 24, left: 0, ime: 0 }));
  eq("native :: no keyboard, no offset", N.keyboardOffset(), 0);
}
{
  const sb = sandbox();
  sb.run("native.js");
  check("native :: inert outside the Android app", sb.win.SipruNative.available === false);
  eq("native :: and sets nothing", Object.keys(sb.style), []);
}

/* ---------------- haptics.js: what each action produces ---------------- */
function fx(opts) {
  const sb = sandbox(opts);
  const played = [];
  sb.run("sound.js");
  sb.win.SipruSound.play = (n) => { played.push("s:" + n); return true; };
  sb.run("native.js");
  sb.win.I18N_KEYS = ["toast_backup_err", "exp_toast_docx_real", "snap_deleted", "toast_project_created",
    "snap_saved", "toast_storage_full", "vault_none", "btn_save", "toast_name"];
  const dict = { ru: {}, en: {} };
  sb.win.I18N_KEYS.forEach((k) => { dict.ru[k] = "ru:" + k; dict.en[k] = "en:" + k; });
  sb.win.T = (lang) => (k) => dict[lang][k];
  sb.run("haptics.js");
  return { sb, played };
}
{
  const calls = [];
  const { sb, played } = fx({ shell: { getInsets: () => "{}", haptic: (k) => calls.push(k), setSystemBars() {} } });
  const F = sb.win.SipruFx;
  sb.ctx.Date = { now: (() => { let t = 0; return () => (t += 1000); })() };

  F.play("success");
  eq("fx :: success is a confirm haptic and the success chord", [calls[0], played[0]], ["success", "s:success"]);
  F.play("remove");
  eq("fx :: removal is a heavy haptic and the thud", [calls[1], played[1]], ["danger", "s:remove"]);
  F.play("on");
  eq("fx :: switching on rises", [calls[2], played[2]], ["on", "s:on"]);
  F.play("off");
  eq("fx :: switching off falls", [calls[3], played[3]], ["off", "s:off"]);
  F.play("focusIn");
  eq("fx :: entering focus has its own feel", [calls[4], played[4]], ["start", "s:focusIn"]);

  check("fx :: knows the Android app can vibrate", F.hapticsAvailable() === true);

  /* toasts mean what their key means */
  const n = (key) => { played.length = 0; F.notify("en:" + key); return played.join(); };
  eq("fx :: a failure toast sounds like an error", n("toast_backup_err"), "s:error");
  eq("fx :: a full disk sounds like an error", n("toast_storage_full"), "s:error");
  eq("fx :: an export toast sounds like an export", n("exp_toast_docx_real"), "s:exported");
  eq("fx :: a deletion toast sounds like a removal", n("snap_deleted"), "s:remove");
  eq("fx :: a new project sounds like a creation", n("toast_project_created"), "s:create");
  eq("fx :: a saved snapshot sounds like a save", n("snap_saved"), "s:save");
  played.length = 0; F.notify("ru:toast_backup_err");
  eq("fx :: the Russian text means the same", played.join(), "s:error");
  played.length = 0; F.notify("some message nobody mapped");
  eq("fx :: an unknown message gets the neutral chime", played.join(), "s:save");
}
{
  /* the profile switches */
  const calls = [];
  const { sb, played } = fx({ sound: false, shell: { getInsets: () => "{}", haptic: (k) => calls.push(k), setSystemBars() {} } });
  sb.ctx.Date = { now: (() => { let t = 0; return () => (t += 1000); })() };
  sb.win.SipruFx.play("success");
  eq("fx :: sounds off keeps the haptic", [calls.length, played.length], [1, 0]);
}
{
  const calls = [];
  const { sb, played } = fx({ haptics: false, shell: { getInsets: () => "{}", haptic: (k) => calls.push(k), setSystemBars() {} } });
  sb.ctx.Date = { now: (() => { let t = 0; return () => (t += 1000); })() };
  sb.win.SipruFx.play("success");
  eq("fx :: haptics off keeps the sound", [calls.length, played.length], [0, 1]);
}
{
  /* a phone without the Android shell falls back to the web vibration API */
  const { sb } = fx({});
  sb.ctx.Date = { now: (() => { let t = 0; return () => (t += 1000); })() };
  sb.win.SipruFx.play("tap");
  check("fx :: a touch browser vibrates through navigator.vibrate", sb.ctx.__vib.length === 1, sb.ctx.__vib.length);
}
{
  /* a mouse never vibrates */
  const { sb } = fx({ coarse: false });
  sb.ctx.Date = { now: (() => { let t = 0; return () => (t += 1000); })() };
  sb.win.SipruFx.play("tap");
  check("fx :: a mouse gets no vibration", sb.ctx.__vib.length === 0, sb.ctx.__vib.length);
  check("fx :: and the profile hides the haptics switch", sb.win.SipruFx.hapticsAvailable() === false);
}

{
  /* creation is heard once, whichever of the five places made it */
  const { sb, played } = fx({});
  sb.ctx.Date = { now: (() => { let t = 0; return () => (t += 1000); })() };
  const change = () => sb.subs.forEach((f) => f());
  sb.store.notes.push({});
  change();
  eq("fx :: one more note is a creation", played.join(), "s:create");
  played.length = 0;
  sb.store.projects.push({ chapters: [{}] }, { chapters: [] });
  change();
  eq("fx :: an import of several at once stays quiet", played.length, 0);
  played.length = 0;
  sb.store.projects[0].chapters.push({});
  change();
  eq("fx :: one more chapter is a creation", played.join(), "s:create");
  played.length = 0;
  change();
  eq("fx :: an edit that adds nothing is silent", played.length, 0);
}

const passed = results.filter((r) => r.ok).length;
console.log(passed + "/" + results.length + " passed");
const failed = results.filter((r) => !r.ok);
if (failed.length) {
  console.error("\nFAILED:\n" + failed.map((f) => "  - " + f.name + (f.detail ? "\n    " + f.detail : "")).join("\n"));
  process.exit(1);
}
