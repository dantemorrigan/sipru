/* ============================================================
   Writed. — custom cursor
   ============================================================ */
const FINE_POINTER = (() => {
  try { return window.matchMedia("(hover: hover) and (pointer: fine)").matches; }
  catch (e) { return true; }
})();

/* ============================================================
   Writed. — splash screen
   ============================================================ */
function SplashScreen({ onDone }) {
  const [phase, setPhase] = useState('in');
  const tl = T((WritedStore.get().user || {}).lang || "en");

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('out'), 900);
    const t2 = setTimeout(() => onDone(), 1500);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  return (
    <div className={`splash splash--${phase}`}>
      <div className="splash-mark">
        <span className="brand alive" style={{ fontSize: 52 }}>
          Writed<span className="dot" />
        </span>
        <div className="splash-line" />
        <span className="splash-sub">{tl("app_splash_sub")}</span>
      </div>
    </div>
  );
}

/* ============================================================
   Writed. — app shell + routing
   ============================================================ */
function App() {
  const store = useStore();
  const s = store.get();
  const user = s.user;
  const [splashDone, setSplashDone] = useState(false);
  const [route, setRoute] = useState(() => s.onboarded ? { name: "dashboard" } : { name: "onboarding" });
  const [exportFor, setExportFor] = useState(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [toastNode, toast] = useToast();
  const editorApi = useRef(null);

  // apply theme
  useEffect(() => { document.documentElement.setAttribute("data-theme", user.theme || "light"); }, [user.theme]);

  const setTheme = (t) => store.setUser({ theme: t });

  const nav = useMemo(() => ({
    dashboard: () => setRoute({ name: "dashboard" }),
    project: (id) => setRoute({ name: "project", id }),
    doc: (id) => setRoute({ name: "doc", id }),
    profile: () => setRoute({ name: "profile" }),
    createProject: () => { const lang = store.get().user.lang || "en"; const tl = T(lang); const id = store.createProject(tl("default_project_title")); setRoute({ name: "project", id }); toast(tl("toast_project_created")); },
    createNote: () => { const lang = store.get().user.lang || "en"; const tl = T(lang); const id = store.createNote(tl("default_note_title")); setRoute({ name: "doc", id }); },
    export: (pid, fmt) => setExportFor({ pid, fmt }),
  }), [store]);

  // global shortcuts: ⌘/Ctrl+S saves the open document, ⌘/Ctrl+K opens search
  useEffect(() => {
    function onKey(e) {
      const mod = e.metaKey || e.ctrlKey;
      const k = (e.key || "").toLowerCase();
      if (mod && k === "s") { e.preventDefault(); if (editorApi.current) editorApi.current.run("save"); }
      else if (mod && k === "k") { e.preventDefault(); setSearchOpen((o) => !o); }
      else if (e.key === "Escape" && exportFor) setExportFor(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [exportFor]);

  // search scope: the project you are in, otherwise everything
  const searchScope = route.name === "project" ? route.id
    : route.name === "doc" ? (() => { const f = store.findDoc(route.id); return f && f.project ? f.project.id : null; })()
    : null;

  function onSearchPick(r) {
    setSearchOpen(false);
    if (r.kind === "synopsis") nav.project(r.projectId);
    else nav.doc(r.id);
  }

  if (!splashDone) {
    return <SplashScreen onDone={() => setSplashDone(true)} />;
  }

  if (!s.onboarded || route.name === "onboarding") {
    return <>{toastNode}<Onboarding onDone={(name, theme, lang) => { store.completeOnboarding(name, theme, lang); setRoute({ name: "dashboard" }); }} /></>;
  }

  let screen;
  if (route.name === "dashboard") screen = <Dashboard store={store} user={user} nav={nav} onTheme={setTheme} onSearch={() => setSearchOpen(true)} onToast={toast} />;
  else if (route.name === "project") screen = <ProjectView store={store} user={user} nav={nav} onTheme={setTheme} projectId={route.id} onSearch={() => setSearchOpen(true)} onToast={toast} />;
  else if (route.name === "doc") screen = <Editor key={route.id} store={store} user={user} nav={nav} onTheme={setTheme} docId={route.id} apiRef={editorApi} onToast={toast} />;
  else if (route.name === "profile") screen = <Profile store={store} user={user} nav={nav} onTheme={setTheme} onToast={toast} />;

  return (
    <>
      {screen}
      {searchOpen && (
        <SearchModal store={store} lang={user.lang} projectId={searchScope}
          onPick={onSearchPick} onClose={() => setSearchOpen(false)} />
      )}
      {exportFor && <ExportModal store={store} projectId={exportFor.pid} initialFormat={exportFor.fmt}
        onClose={() => setExportFor(null)} onToast={toast} />}
      {/* The guided tour's tooltips anchor to fixed pixel positions next to
          toolbar buttons — across phone screen sizes and densities they
          drift off their targets far more often than they land, so the
          tour is desktop-only. Mobile goes straight from onboarding
          (name, theme, vault folder) into a clean, empty app. */}
      {s.onboarded && !s.tourDone && route.name !== "profile" && !/android|iphone|ipad/i.test(navigator.userAgent || "") && (
        <Tour store={store} nav={nav} onFinish={() => store.completeTour()} />
      )}
      {/* checks in the background well after first paint; renders nothing
          until writed.ru actually reports a higher build number */}
      {s.tourDone && <UpdateBanner lang={user.lang} />}
      {toastNode}
    </>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
