/* ============================================================
   Writed. — custom cursor
   ============================================================ */
const FINE_POINTER = (() => {
  try { return window.matchMedia("(hover: hover) and (pointer: fine)").matches; }
  catch (e) { return true; }
})();

function CustomCursor() {
  return FINE_POINTER ? <CustomCursorFine /> : null;
}

function CustomCursorFine() {
  const dotRef  = useRef(null);
  const ringRef = useRef(null);
  const pos = useRef({ x: -100, y: -100 });
  const ring = useRef({ x: -100, y: -100 });
  const raf  = useRef(null);

  useEffect(() => {
    const dot  = dotRef.current;
    const ringEl = ringRef.current;
    if (!dot || !ringEl) return;

    function lerp(a, b, t) { return a + (b - a) * t; }

    function tick() {
      ring.current.x = lerp(ring.current.x, pos.current.x, 0.12);
      ring.current.y = lerp(ring.current.y, pos.current.y, 0.12);
      dot.style.transform  = `translate(calc(${pos.current.x}px - 50%), calc(${pos.current.y}px - 50%))`;
      ringEl.style.transform = `translate(calc(${ring.current.x}px - 50%), calc(${ring.current.y}px - 50%))`;
      raf.current = requestAnimationFrame(tick);
    }
    raf.current = requestAnimationFrame(tick);

    function onMove(e) { pos.current.x = e.clientX; pos.current.y = e.clientY; }

    function onOver(e) {
      const t = e.target.closest('button, a, [role="button"], label, .icon-btn, .btn');
      /* closest, not matches: inside the editor the event target is the
         <p>/<h1> under the pointer, not the contenteditable itself */
      const isText = !!e.target.closest('input[type="text"], input[type="email"], input:not([type]), textarea, [contenteditable=""], [contenteditable="true"]');
      document.body.classList.toggle('cursor-hover', !!t && !isText);
      document.body.classList.toggle('cursor-text', isText);
    }

    function onDown() { document.body.classList.add('cursor-click'); }
    function onUp()   { document.body.classList.remove('cursor-click'); }

    window.addEventListener('mousemove', onMove, { passive: true });
    window.addEventListener('mouseover', onOver, { passive: true });
    window.addEventListener('mousedown', onDown, { passive: true });
    window.addEventListener('mouseup',   onUp,   { passive: true });

    return () => {
      cancelAnimationFrame(raf.current);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseover', onOver);
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('mouseup',   onUp);
    };
  }, []);

  return (
    <>
      <div ref={dotRef}  className="cursor-dot" />
      <div ref={ringRef} className="cursor-ring" />
    </>
  );
}

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
    return (
      <>
        <CustomCursor />
        <SplashScreen onDone={() => setSplashDone(true)} />
      </>
    );
  }

  if (!s.onboarded || route.name === "onboarding") {
    return <>{toastNode}<CustomCursor /><Onboarding onDone={(name, theme, lang) => { store.completeOnboarding(name, theme, lang); setRoute({ name: "dashboard" }); }} /></>;
  }

  let screen;
  if (route.name === "dashboard") screen = <Dashboard store={store} user={user} nav={nav} onTheme={setTheme} onSearch={() => setSearchOpen(true)} onToast={toast} />;
  else if (route.name === "project") screen = <ProjectView store={store} user={user} nav={nav} onTheme={setTheme} projectId={route.id} onSearch={() => setSearchOpen(true)} onToast={toast} />;
  else if (route.name === "doc") screen = <Editor key={route.id} store={store} user={user} nav={nav} onTheme={setTheme} docId={route.id} apiRef={editorApi} onToast={toast} />;
  else if (route.name === "profile") screen = <Profile store={store} user={user} nav={nav} onTheme={setTheme} onToast={toast} />;

  return (
    <>
      <CustomCursor />
      {screen}
      {searchOpen && (
        <SearchModal store={store} lang={user.lang} projectId={searchScope}
          onPick={onSearchPick} onClose={() => setSearchOpen(false)} />
      )}
      {exportFor && <ExportModal store={store} projectId={exportFor.pid} initialFormat={exportFor.fmt}
        onClose={() => setExportFor(null)} onToast={toast} />}
      {s.onboarded && !s.tourDone && route.name !== "profile" && (
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
