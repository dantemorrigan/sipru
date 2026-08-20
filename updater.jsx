/* ============================================================
   Writed. — background update check against writed.ru

   Deliberately not tauri-plugin-updater: that one compares semver
   (it has no concept of a build number), demands a minisign
   signature per artifact, installs only .app.tar.gz bundles — not
   the .dmg we ship — and has no Android support at all. This talks
   to the documented endpoint instead and reuses the dialog + fs
   plugins the export flow already relies on, so no new dependency
   and no new permission is introduced.
   ============================================================ */
const UPDATE_ENDPOINT = "https://writed.ru/update/latest.json";
const UPDATE_INTERVAL_MS = 6 * 60 * 60 * 1000;  /* at most once every 6 hours */
const UPDATE_SETTLE_MS = 4000;                  /* let the app paint first */
const UPDATE_TIMEOUT_MS = 10000;
const UPDATE_STATE_KEY = "writed:update";

/* Kept out of WritedStore on purpose: this is throwaway client state, not
   user data, and it must never end up in a backup or an export. */
function updateState() {
  try { return JSON.parse(localStorage.getItem(UPDATE_STATE_KEY)) || {}; }
  catch (e) { return {}; }
}
function saveUpdateState(patch) {
  try {
    localStorage.setItem(UPDATE_STATE_KEY, JSON.stringify({ ...updateState(), ...patch }));
  } catch (e) {}
}

const isAndroid = () => /android/i.test(navigator.userAgent || "");
const updatePlatform = () => (isAndroid() ? "android" : "macos");
const nativeFS = () => {
  const t = window.__TAURI__;
  return t && t.dialog && t.fs ? t : null;
};

function UpdateBanner({ lang }) {
  const tl = T(lang || "en");
  const [info, setInfo] = useState(null);      /* {build, version, notes, url} */
  const [phase, setPhase] = useState("idle");  /* idle | loading | done | error */
  const [pct, setPct] = useState(0);
  const alive = useRef(true);
  useEffect(() => () => { alive.current = false; }, []);

  useEffect(() => {
    const st = updateState();
    if (st.checkedAt && Date.now() - st.checkedAt < UPDATE_INTERVAL_MS) return;

    const ctrl = new AbortController();
    const settle = setTimeout(() => {
      const bail = setTimeout(() => ctrl.abort(), UPDATE_TIMEOUT_MS);
      fetch(UPDATE_ENDPOINT, { cache: "no-store", signal: ctrl.signal })
        .then((r) => { if (!r.ok) throw new Error("http " + r.status); return r.json(); })
        .then((data) => {
          const build = Number(data && data.build) || 0;
          const plat = (data && data.platforms || {})[updatePlatform()];
          /* a build the user already dismissed stays dismissed */
          if (build > (window.WRITED_BUILD || 0) && build !== updateState().dismissed
              && plat && plat.url && alive.current) {
            setInfo({ build, version: data.version, notes: data.releaseNotes, url: plat.url });
          }
        })
        .catch(() => {
          /* offline, DNS failure, 404, unreachable host, malformed JSON — a
             background check has no business interrupting anyone, so this
             stays silent and simply retries after the next interval */
        })
        .finally(() => { clearTimeout(bail); saveUpdateState({ checkedAt: Date.now() }); });
    }, UPDATE_SETTLE_MS);

    return () => { clearTimeout(settle); ctrl.abort(); };
  }, []);

  function dismiss() {
    if (info) saveUpdateState({ dismissed: info.build });
    setInfo(null);
  }

  async function download() {
    const tauri = nativeFS();
    /* Plain web build: the browser's own downloader is the right tool. */
    if (!tauri) { window.open(info.url, "_blank", "noopener"); return; }

    setPhase("loading"); setPct(0);
    try {
      const res = await fetch(info.url);
      if (!res.ok) throw new Error("http " + res.status);
      const total = Number(res.headers.get("content-length")) || 0;
      const reader = res.body && res.body.getReader ? res.body.getReader() : null;

      let bytes;
      if (reader) {
        const chunks = [];
        let got = 0;
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          chunks.push(value);
          got += value.length;
          if (total && alive.current) setPct(Math.min(99, Math.round((got / total) * 100)));
        }
        bytes = new Uint8Array(got);
        let at = 0;
        for (const c of chunks) { bytes.set(c, at); at += c.length; }
      } else {
        bytes = new Uint8Array(await res.arrayBuffer());
      }

      const name = info.url.slice(info.url.lastIndexOf("/") + 1) || "Writed-update";
      const ext = name.includes(".") ? name.slice(name.lastIndexOf(".") + 1) : "";
      const path = await tauri.dialog.save({
        defaultPath: name,
        filters: ext ? [{ name: ext.toUpperCase(), extensions: [ext] }] : undefined,
      });
      if (!path) { if (alive.current) setPhase("idle"); return; }   /* user cancelled */
      await tauri.fs.writeFile(path, bytes);
      if (alive.current) { setPct(100); setPhase("done"); }
    } catch (e) {
      if (alive.current) setPhase("error");
    }
  }

  if (!info) return null;

  return (
    <div className="upd" role="status">
      <div className="upd-main">
        <div className="upd-title">
          <span className="upd-spark" aria-hidden="true">✨</span>
          {phase === "done" ? tl("upd_done")
            : phase === "error" ? tl("upd_err")
            : tl("upd_available")}
        </div>
        {phase === "idle" && info.notes && <div className="upd-notes mono">{info.notes}</div>}
        {phase === "done" && <div className="upd-notes mono">{tl(isAndroid() ? "upd_open_apk" : "upd_open_dmg")}</div>}
        {phase === "loading" && (
          <div className="upd-bar" aria-label={tl("upd_downloading")}>
            <span style={{ width: pct + "%" }} />
          </div>
        )}
      </div>
      <div className="upd-actions">
        {phase === "idle" && (
          <button className="upd-go" onClick={download}>{tl("upd_btn")}</button>
        )}
        {phase === "loading" && <span className="upd-pct mono">{pct}%</span>}
        {phase === "error" && (
          <button className="upd-go" onClick={download}>{tl("upd_retry")}</button>
        )}
        <button className="upd-x" onClick={dismiss} title={tl("upd_dismiss")}>
          <Icon name="close" size={15} />
        </button>
      </div>
    </div>
  );
}
