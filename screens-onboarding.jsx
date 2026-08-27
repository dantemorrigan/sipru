/* ============================================================
   Sipru. — onboarding (first run)
   ============================================================ */
function Onboarding({ onDone }) {
  const [step, setStep] = useState(-1);   /* -1 = language pick */
  const [lang, setLang] = useState(() => navigator.language && navigator.language.startsWith("ru") ? "ru" : "en");
  const [name, setName] = useState("");
  const [theme, setTheme] = useState("light");
  const [leaving, setLeaving] = useState(false);
  const nameRef = useRef(null);
  const tl = T(lang);

  /* The vault step only exists where there is a real filesystem to write
     to; on the web the app stays on localStorage and the flow is 4 steps.
     Desktop and Android both get a real system folder picker here, so this
     step is the same step on both. */
  const vaultStep = !!(window.SipruVault && window.SipruVault.available());
  const canPick = vaultStep && window.SipruVault.canPickFolder();
  const [vault, setVault] = useState(null);
  const [vaultBusy, setVaultBusy] = useState(false);
  const [vaultErr, setVaultErr] = useState(null);

  async function chooseVault() {
    setVaultErr(null); setVaultBusy(true);
    try {
      const dir = await window.SipruVault.pick();
      if (dir) setVault(dir);
    } catch (e) { setVaultErr(String((e && e.message) || e)); }
    setVaultBusy(false);
  }

  useEffect(() => { document.documentElement.setAttribute("data-theme", theme); }, [theme]);
  useEffect(() => { if (step === 1) setTimeout(() => nameRef.current && nameRef.current.focus(), 500); }, [step]);

  const go = (n) => setStep(n);
  async function finish() {
    /* Open the vault before leaving onboarding, so the first save already
       lands on disk — there is no window where the work exists only in
       localStorage. `adopt` picks up a vault left by a previous install.
       A folder that can't be opened stops the flow here rather than dropping
       the writer into an app whose storage silently doesn't work. */
    if (vaultStep) {
      setVaultErr(null); setVaultBusy(true);
      let res = null, err = null;
      try { res = await window.SipruVault.open(vault, { adopt: true }); }
      catch (e) { err = String((e && e.message) || e); }
      setVaultBusy(false);
      if (!res || !res.ok) { setVaultErr(err || tl("vault_unreadable")); return; }
    }
    setLeaving(true);
    try { if (navigator.storage && navigator.storage.persist) await navigator.storage.persist(); } catch (e) {}
    setTimeout(() => onDone(name.trim() || tl("default_author"), theme, lang), 760);
  }

  const dotScale = 1 + Math.min(name.trim().length, 16) * 0.08;
  /* Both are hard requirements, not nudges: the name is what the app calls
     the writer everywhere after this, and without a vault folder their work
     would live only in localStorage — the exact loss this app now avoids. */
  const hasName = name.trim().length > 0;
  const lastStep = vaultStep ? 3 : 2;
  const stepIdx = step + 1;
  const pips = vaultStep ? [-1, 0, 1, 2, 3] : [-1, 0, 1, 2];

  return (
    <div className={"onb" + (leaving ? " onb--leave" : "")}>
      <div className="onb-left">
      <div className="onb-grid" aria-hidden="true">
        {Array.from({ length: 5 }).map((_, i) => <span key={i} style={{ left: (12.5 + i * 18.75) + "%" }} />)}
      </div>

      <div className="onb-top">
        <div className="onb-brand">
          <span className="onb-brand-mark">S<i /></span>
          <span className="onb-brand-w">Sipru</span>
        </div>
        <div className="onb-steps mono">
          {pips.map((i) => <span key={i} className={"onb-pip" + (i <= step ? " on" : "")} />)}
          <span style={{ marginLeft: 12, color: "var(--ink-faint)" }}>
            {String(stepIdx + 1).padStart(2, "0")} / {String(pips.length).padStart(2, "0")}
          </span>
        </div>
      </div>

      {/* STEP -1 — language */}
      {step === -1 && (
        <div className="onb-stage screen-enter" key="lang">
          <div className="eyebrow onb-kicker">{lang === "ru" ? "Шаг 1 · Язык" : "Step 1 · Language"}</div>
          <h2 className="onb-q">
            {lang === "ru" ? "Выберите язык" : "Choose your language"}
          </h2>
          <p className="onb-lede">{lang === "ru"
            ? "Интерфейс, экспорт и подсказки. Поменять можно в любой момент в профиле."
            : "Interface, export and hints. You can change it any time in your profile."}</p>
          <div className="onb-langs">
            {[["en", "English", "EN", <FlagGB key="gb" />], ["ru", "Русский", "RU", <FlagRU key="ru" />]].map(([k, name, code, flag]) => (
              <button key={k} className={"onb-lang-btn" + (lang === k ? " on" : "")} onClick={() => setLang(k)}>
                <span className="onb-lang-flag">{flag}</span>
                <span className="onb-lang-txt">
                  <span className="onb-lang-name">{name}</span>
                  <span className="onb-lang-code mono">{code}</span>
                </span>
                {lang === k && <Icon name="check" size={17} className="onb-lang-tick" />}
              </button>
            ))}
          </div>
          <p className="onb-hint mono">{lang === "ru" ? "Язык можно сменить в настройках" : "You can change this in settings"}</p>
          <button className="btn btn--solid onb-cta" onClick={() => go(0)}>
            {lang === "ru" ? "Продолжить" : "Continue"} <Icon name="forward" size={16} />
          </button>
        </div>
      )}

      {/* STEP 0 — welcome */}
      {step === 0 && (
        <div className="onb-stage screen-enter" key="s0">
          <div className="eyebrow onb-kicker">{tl("onb_kicker_0")}</div>
          <h1 className="onb-hero">
            {tl("onb_hero_0_1")}<br />{tl("onb_hero_0_2")}<br />{tl("onb_hero_0_3")}<span className="onb-dot" />
          </h1>
          <p className="onb-lede">{tl("onb_lede_0")}</p>
          <button className="btn btn--solid onb-cta" onClick={() => go(1)}>
            {tl("onb_cta_0")} <Icon name="forward" size={16} />
          </button>
        </div>
      )}

      {/* STEP 1 — name */}
      {step === 1 && (
        <div className="onb-stage screen-enter" key="s1">
          <div className="eyebrow onb-kicker">{tl("onb_kicker_1")}</div>
          <h2 className="onb-q">{tl("onb_q_1").split("\n").map((l, i) => <span key={i}>{l}<br /></span>)}</h2>
          <div className="onb-namewrap">
            <input ref={nameRef} className="onb-name" value={name} spellCheck={false}
              placeholder={tl("onb_name_placeholder")} maxLength={40}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && hasName && go(2)} />
            <span className="onb-name-dot" style={{ transform: `scale(${dotScale})` }} />
          </div>
          <p className="onb-hint mono">{tl("onb_hint_1")}</p>
          <div className="onb-actions">
            <button className="btn btn--ghost" onClick={() => go(0)}><Icon name="back" size={15} /> {tl("onb_back")}</button>
            <button className="btn btn--solid" onClick={() => go(2)} disabled={!hasName}>{tl("onb_next")} <Icon name="forward" size={15} /></button>
          </div>
        </div>
      )}

      {/* STEP 2 — theme */}
      {step === 2 && (
        <div className="onb-stage screen-enter" key="s2">
          <div className="eyebrow onb-kicker">{tl("onb_kicker_2")}</div>
          <h2 className="onb-q">{tl("onb_q_2").split("\n").map((l, i) => <span key={i}>{l}<br /></span>)}</h2>
          <div className="onb-themes">
            <button className={"onb-theme" + (theme === "light" ? " on" : "")} onClick={() => setTheme("light")}>
              <div className="onb-theme-pic onb-theme-pic--light">
                <span className="l l1" /><span className="l l2" /><span className="l l3" />
              </div>
              <div className="onb-theme-meta"><span>{tl("onb_theme_light")}</span><Icon name={theme === "light" ? "check" : "sun"} size={16} /></div>
            </button>
            <button className={"onb-theme" + (theme === "dark" ? " on" : "")} onClick={() => setTheme("dark")}>
              <div className="onb-theme-pic onb-theme-pic--dark">
                <span className="l l1" /><span className="l l2" /><span className="l l3" />
              </div>
              <div className="onb-theme-meta"><span>{tl("onb_theme_dark")}</span><Icon name={theme === "dark" ? "check" : "moon"} size={16} /></div>
            </button>
          </div>
          <p className="onb-hint mono">{tl("onb_hint_2")}</p>
          <div className="onb-actions">
            <button className="btn btn--ghost" onClick={() => go(1)}><Icon name="back" size={15} /> {tl("onb_back")}</button>
            <button className="btn btn--accent onb-finish" onClick={() => (vaultStep ? go(3) : finish())}>
              {vaultStep ? tl("onb_next") : tl("onb_finish")} <Icon name="forward" size={15} />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3 — vault: where the work actually lives */}
      {step === 3 && (
        <div className="onb-stage screen-enter" key="s3">
          <div className="eyebrow onb-kicker">{tl("onb_kicker_3")}</div>
          <h2 className="onb-q">{tl("onb_q_3").split("\n").map((l, i) => <span key={i}>{l}<br /></span>)}</h2>

          <div className="onb-vault">
            {canPick && (
              <button className="onb-vault-pick" onClick={chooseVault} disabled={vaultBusy}>
                <Icon name="folder" size={20} />
                <span className="onb-vault-pick-t">
                  {vault ? tl("vault_change") : tl("vault_choose")}
                </span>
              </button>
            )}
            <div className={"onb-vault-path mono" + (vault ? " on" : "")}>
              {vault || tl("vault_none")}
            </div>
            {vaultErr && <div className="onb-vault-err mono">{vaultErr}</div>}
          </div>

          <p className="onb-hint mono">{tl("onb_hint_3")}</p>
          <div className="onb-actions">
            <button className="btn btn--ghost" onClick={() => go(2)}><Icon name="back" size={15} /> {tl("onb_back")}</button>
            <button className="btn btn--accent onb-finish" onClick={finish} disabled={!vault || vaultBusy}>
              {tl("onb_finish")} <Icon name="forward" size={15} />
            </button>
          </div>
        </div>
      )}

      <div className="onb-foot mono">{tl("onb_foot_promise")}</div>
      </div>

      {/* the preview is decoration with a job: it shows, before a single
          word is typed, what the writing surface will look like */}
      <aside className="onb-preview" aria-hidden="true">
        <div className="onb-paper">
          <div className="onb-paper-eyebrow mono">{tl("onb_paper_eyebrow")}</div>
          <div className="onb-paper-title">{tl("onb_paper_title")}</div>
          <div className="onb-paper-lines">
            {[96, 92, 78, 94, 70, 90, 86, 93, 62].map((w, i) => <span key={i} style={{ width: w + "%" }} />)}
          </div>
          <div className="onb-paper-lines">
            {[88, 74, 91, 64].map((w, i) => <span key={i} style={{ width: w + "%" }} />)}
          </div>
          <div className="onb-paper-num mono">1</div>
        </div>
      </aside>
    </div>
  );
}

window.Onboarding = Onboarding;
