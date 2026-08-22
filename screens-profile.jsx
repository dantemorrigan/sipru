/* ============================================================
   Sipru. — Profile
   ============================================================ */
function Profile({ store, user, nav, onTheme, onToast }) {
  const lang = user.lang || "en";
  const tl = T(lang);
  const stats = store.stats();
  const [name, setName] = useState(user.name);
  const [confirmReset, setConfirmReset] = useState(false);
  const fileRef = useRef(null);
  const avatarRef = useRef(null);

  /* Vault state is owned by vault.js, not React — subscribe so the path
     and sync status stay live while a save is in flight. */
  const V = window.SipruVault;
  const vaultOn = !!(V && V.available());
  const [vs, setVs] = useState(() => (V ? V.status() : null));
  useEffect(() => (V ? V.subscribe(setVs) : undefined), [V]);

  async function chooseVault() {
    try {
      const dir = await V.pick();
      if (!dir) return;
      const res = await V.open(dir, { adopt: true });
      if (!res || !res.ok) { onToast(tl("vault_unreadable")); return; }
      onToast(tl(res.restored ? "vault_restored" : "vault_opened"));
      if (res.restored) nav.dashboard();
    } catch (e) { onToast(String((e && e.message) || e)); }
  }
  async function vaultBackup() {
    try { if (await V.backupToFile()) onToast(tl("vault_backup_ok")); }
    catch (e) { onToast(String((e && e.message) || e)); }
  }
  async function vaultRestore() {
    try {
      if (await V.restoreFromFile()) { onToast(tl("vault_restore_ok")); nav.dashboard(); }
      else onToast(tl("vault_restore_fail"));
    } catch (e) { onToast(tl("vault_restore_fail")); }
  }

  function onAvatarChange(e) {
    const f = e.target.files[0];
    if (!f) return;
    const img = new Image();
    const url = URL.createObjectURL(f);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const maxSize = 400;
      const scale = Math.min(maxSize / img.width, maxSize / img.height, 1);
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
      store.setUser({ avatar: canvas.toDataURL("image/jpeg", 0.88) });
      onToast(tl("toast_avatar"));
    };
    img.src = url;
    e.target.value = "";
  }

  function saveName() { const v = name.trim() || tl("default_author"); store.setUser({ name: v }); onToast(tl("toast_name")); }
  function exportBackup() {
    downloadBlob("sipru-backup-" + new Date().toISOString().slice(0,10) + ".json", "application/json", store.exportAll());
    onToast(tl("toast_backup_dl"));
  }
  function onImport(e) {
    const f = e.target.files[0]; if (!f) return;
    const r = new FileReader();
    r.onload = () => { if (store.importAll(r.result)) { onToast(tl("toast_restore_ok")); nav.dashboard(); } else onToast(tl("toast_restore_err")); };
    r.readAsText(f); e.target.value = "";
  }
  function reset() {
    store.reset(); onToast(tl("toast_reset")); nav.dashboard();
  }

  const locale = lang === "ru" ? "ru-RU" : "en-US";
  const STAT = [
    [stats.words.toLocaleString(locale), tl("stat_words_written")],
    [stats.projects, pluralT(stats.projects, lang, "proj_one", "proj_few", "proj_many")],
    [stats.chapters, pluralT(stats.chapters, lang, "chap_one", "chap_few", "chap_many")],
    [stats.notes,    pluralT(stats.notes,    lang, "note_one", "note_few", "note_many")],
  ];

  return (
    <div className="app-shell screen-enter">
      <TopBar user={user} store={store} nav={nav} onTheme={onTheme} />
      <div className="scroll-area">
        <div className="wrap wrap--narrow">
          <button className="backlink mono" onClick={() => nav.dashboard()}><Icon name="back" size={14} /> {tl("prof_back")}</button>

          <section className="prof-hero">
            <button className="prof-ava-wrap" onClick={() => avatarRef.current.click()} title={tl("prof_upload_photo")}>
              {user.avatar
                ? <img src={user.avatar} alt={tl("prof_avatar_alt")} className="prof-ava-img" />
                : <span className="prof-ava mono">{(user.name || tl("default_author")).trim().charAt(0).toUpperCase()}</span>
              }
              <span className="prof-ava-overlay"><Icon name="upload" size={20} /></span>
              <input ref={avatarRef} type="file" accept="image/*" style={{display:"none"}} onChange={onAvatarChange} />
            </button>
            <div>
              <div className="eyebrow">{tl("prof_eyebrow")}</div>
              <h1 className="prof-name">{user.name || tl("default_author")}</h1>
              <div className="prof-since mono">{tl("prof_since")} {new Date(user.createdAt).toLocaleDateString(locale, {month:"long",year:"numeric"})}</div>
            </div>
          </section>

          <div className="prof-stats">
            {STAT.map(([n,l],i) => (
              <div className="prof-stat fade-up" key={i} style={{animationDelay:i*70+"ms"}}>
                <div className="prof-stat-n mono">{n}</div>
                <div className="prof-stat-l mono">{l}</div>
              </div>
            ))}
          </div>

          <div className="section-head"><span className="eyebrow">{tl("prof_section_settings")}</span><span className="rule-thin section-rule" /></div>

          <div className="prof-set">
            <span className="prof-set-l">{tl("prof_lbl_name")}</span>
            <div className="prof-set-c prof-name-edit">
              <input value={name} onChange={(e)=>setName(e.target.value)} onBlur={saveName}
                onKeyDown={(e)=>e.key==="Enter"&&e.target.blur()} maxLength={40} className="prof-input" />
            </div>
          </div>

          <div className="prof-set">
            <span className="prof-set-l">{tl("prof_lbl_lang")}</span>
            <div className="prof-set-c">
              <div className="seg seg--sm">
                <button className={"seg-btn"+(lang==="en"?" on":"")} onClick={()=>store.setUser({lang:"en"})}>🇬🇧 English</button>
                <button className={"seg-btn"+(lang==="ru"?" on":"")} onClick={()=>store.setUser({lang:"ru"})}>🇷🇺 Русский</button>
              </div>
            </div>
          </div>

          <div className="prof-set">
            <span className="prof-set-l">{tl("prof_lbl_theme")}</span>
            <div className="prof-set-c">
              <div className="seg seg--sm">
                <button className={"seg-btn"+(user.theme==="light"?" on":"")} onClick={()=>onTheme("light")}><Icon name="sun" size={14}/> {tl("prof_theme_light")}</button>
                <button className={"seg-btn"+(user.theme==="dark"?" on":"")} onClick={()=>onTheme("dark")}><Icon name="moon" size={14}/> {tl("prof_theme_dark")}</button>
              </div>
            </div>
          </div>

          {!/android|iphone|ipad/i.test(navigator.userAgent || "") && (
          <div className="prof-set">
            <span className="prof-set-l">{tl("prof_lbl_tour")}</span>
            <div className="prof-set-c">
              <button className="btn btn--ghost" onClick={() => { store.replayTour(); nav.dashboard(); }}>
                <Icon name="eye" size={16}/> {tl("prof_tour_btn")}
              </button>
            </div>
          </div>
          )}

          <div className="section-head"><span className="eyebrow">{tl("vault_title")}</span><span className="rule-thin section-rule" /></div>
          {vaultOn ? (
            <>
              <div className="prof-set">
                <span className="prof-set-l">{tl("vault_folder")}</span>
                <div className="prof-set-c">
                  <div className={"vault-path mono" + (vs && vs.path ? " on" : "")}>
                    {(vs && vs.path) || tl("vault_none")}
                  </div>
                  <span className={"vault-dot" + (vs && vs.error ? " err" : vs && vs.ok ? " ok" : "")} />
                  <span className="vault-state mono">
                    {tl(vs && vs.error ? "vault_status_err" : vs && vs.ok ? "vault_status_ok" : "vault_status_off")}
                  </span>
                  {vs && vs.error && <div className="vault-err mono">{vs.error}</div>}
                </div>
              </div>
              <div className="prof-data">
                <button className="btn btn--ghost" onClick={chooseVault}>
                  <Icon name="folder" size={16}/> {tl(vs && vs.path ? "vault_change" : "vault_open")}
                </button>
                {V.canReveal() && (
                  <button className="btn btn--ghost" onClick={async () => {
                    const path = V.locate("vault");
                    if (!path) return onToast(tl("vault_none"));
                    if (!(await V.reveal(path))) onToast(tl("vault_reveal_fail"));
                  }}><Icon name="folder" size={16}/> {tl("vault_reveal")}</button>
                )}
                <button className="btn btn--ghost" onClick={vaultBackup}><Icon name="download" size={16}/> {tl("vault_backup")}</button>
                <button className="btn btn--ghost" onClick={vaultRestore}><Icon name="upload" size={16}/> {tl("vault_restore")}</button>
              </div>
            </>
          ) : (
            <p className="prof-note mono">{tl("vault_web_note")}</p>
          )}

          <div className="section-head"><span className="eyebrow">{tl("prof_section_data")}</span><span className="rule-thin section-rule" /></div>
          <p className="prof-note mono">{tl("prof_data_note")}</p>
          <div className="prof-data">
            <button className="btn btn--ghost" onClick={exportBackup}><Icon name="download" size={16}/> {tl("prof_export_backup")}</button>
            <button className="btn btn--ghost" onClick={()=>fileRef.current.click()}><Icon name="upload" size={16}/> {tl("prof_import_backup")}</button>
            <input ref={fileRef} type="file" accept="application/json,.json" style={{display:"none"}} onChange={onImport} />
            <button className="btn btn--danger" onClick={() => setConfirmReset(true)}><Icon name="reset" size={16}/> {tl("prof_reset_btn")}</button>
          </div>
          <div style={{height:60}} />
        </div>
      </div>
      {confirmReset && (
        <ConfirmDelete
          title={tl("what_all")}
          what=""
          onConfirm={() => { setConfirmReset(false); reset(); }}
          onCancel={() => setConfirmReset(false)}
          lang={lang}
        />
      )}
    </div>
  );
}
window.Profile = Profile;
