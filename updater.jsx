/* ============================================================
   Sipru — background update check against writed.ru

   Deliberately not tauri-plugin-updater: it demands a minisign
   signature per artifact, installs only .app.tar.gz bundles — not
   the .dmg we ship — and has no Android support at all. This
   reuses the dialog + fs plugins the export flow already relies
   on instead, so no new dependency and no new permission is
   introduced.

   There is no separate update manifest to keep in sync (that was
   the previous design, and it drifted from reality more than
   once). Instead this reads the site's own downloads section —
   the same "Скачать" buttons a person clicks by hand — and treats
   whatever release its button links to as current. The site owner
   already keeps that link pointed at the latest GitHub release, so
   there is nothing extra to publish.
   ============================================================ */
const UPDATE_ENDPOINT = "https://writed.ru/";
const UPDATE_INTERVAL_MS = 6 * 60 * 60 * 1000;  /* at most once every 6 hours */
const UPDATE_SETTLE_MS = 4000;                  /* let the app paint first */
const UPDATE_TIMEOUT_MS = 10000;
const UPDATE_STATE_KEY = "sipru:update";

/* Kept out of SipruStore on purpose: this is throwaway client state, not
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

/* GitHub release download URLs always carry the tag, e.g.
   .../releases/download/v1.2.0/Sipru-1.2.0-Android.apk */
function versionFromUrl(url) {
  const m = /\/releases\/download\/v?([0-9]+(?:\.[0-9]+)*)\//.exec(url || "");
  return m ? m[1] : null;
}

function isNewerVersion(a, b) {
  const pa = String(a || "0").split(".").map(Number);
  const pb = String(b || "0").split(".").map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const x = pa[i] || 0, y = pb[i] || 0;
    if (x !== y) return x > y;
  }
  return false;
}

/* Finds the "Скачать" link for one platform in the downloads section
   of the fetched site markup — the exact same button a person uses. */
function findPlatformUrl(doc, platform) {
  const iconClass = platform === "android" ? "android-icon" : "macos-icon";
  const rows = doc.querySelectorAll(".download-row");
  for (const row of rows) {
    if (row.querySelector("." + iconClass)) {
      const link = row.querySelector("a.dl-btn[href]");
      return link ? link.getAttribute("href") : null;
    }
  }
  return null;
}

function UpdateBanner({ lang }) {
  const tl = T(lang || "en");
  const [info, setInfo] = useState(null);      /* {version, url} */
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
        .then((r) => { if (!r.ok) throw new Error("http " + r.status); return r.text(); })
        .then((html) => {
          const doc = new DOMParser().parseFromString(html, "text/html");
          const url = findPlatformUrl(doc, updatePlatform());
          const version = versionFromUrl(url);
          /* a version the user already dismissed stays dismissed */
          if (version && url && isNewerVersion(version, window.SIPRU_VERSION)
              && version !== updateState().dismissed && alive.current) {
            setInfo({ version, url });
          }
        })
        .catch(() => {
          /* offline, DNS failure, 404, unreachable host, unexpected markup —
             a background check has no business interrupting anyone, so this
             stays silent and simply retries after the next interval */
        })
        .finally(() => { clearTimeout(bail); saveUpdateState({ checkedAt: Date.now() }); });
    }, UPDATE_SETTLE_MS);

    return () => { clearTimeout(settle); ctrl.abort(); };
  }, []);

  function dismiss() {
    if (info) saveUpdateState({ dismissed: info.version });
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

      const name = info.url.slice(info.url.lastIndexOf("/") + 1) || "Sipru-update";
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
