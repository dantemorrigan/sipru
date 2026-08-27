/* ============================================================
   Sipru. — guided tour (first-run coach-marks)
   Spotlight + floating tooltip that walks the writer across
   the dashboard, a project and the editor. Drives navigation
   itself; blocks page interaction while active.
   ============================================================ */

/* ---- geometry helpers ---- */
const TOUR_PAD = 12;   // breathing room around the highlighted element
const TOUR_GAP = 18;   // distance from spotlight edge to the card

function tourMeasure(el) {
  const r = el.getBoundingClientRect();
  return { top: r.top, left: r.left, width: r.width, height: r.height };
}

/* Any scrollable ancestor works, not just the page's own .scroll-area —
   the editor toolbar scrolls internally too when the window is short. */
function tourScrollParent(el) {
  let n = el.parentElement;
  while (n && n !== document.body) {
    if (n.scrollHeight > n.clientHeight + 1) {
      const oy = getComputedStyle(n).overflowY;
      if (oy === "auto" || oy === "scroll") return n;
    }
    n = n.parentElement;
  }
  return null;
}

function tourEnsureVisible(el) {
  const sc = tourScrollParent(el);
  if (!sc) return;
  const er = el.getBoundingClientRect();
  const sr = sc.getBoundingClientRect();
  const pad = Math.min(96, sr.height / 4);
  let d = 0;
  if (er.top < sr.top + pad) d = er.top - (sr.top + pad);
  else if (er.bottom > sr.bottom - pad) d = er.bottom - (sr.bottom - pad);
  if (d) sc.scrollTop += d;
}

/* Four solid rectangles that tile the viewport minus the spotlight hole.
   Deliberately not a single huge box-shadow spread: some WebKit builds
   (notably the WKWebView used by the Tauri/macOS build) clip an oversized
   blurred/spread shadow layer, especially right after a window resize —
   plain rects have no such limit and are cheaper to paint besides. */
function tourBands(rect, pad) {
  const vw = window.innerWidth, vh = window.innerHeight;
  const top = Math.max(0, Math.min(vh, rect.top - pad));
  const bottom = Math.max(0, Math.min(vh, rect.top + rect.height + pad));
  const left = Math.max(0, Math.min(vw, rect.left - pad));
  const right = Math.max(0, Math.min(vw, rect.left + rect.width + pad));
  return [
    { top: 0, left: 0, width: vw, height: top },
    { top: bottom, left: 0, width: vw, height: Math.max(0, vh - bottom) },
    { top, left: 0, width: left, height: Math.max(0, bottom - top) },
    { top, left: right, width: Math.max(0, vw - right), height: Math.max(0, bottom - top) },
  ];
}

function tourComputePos(rect, cw, ch, prefer) {
  const vw = window.innerWidth, vh = window.innerHeight, m = 16;
  if (!rect) return { left: (vw - cw) / 2, top: (vh - ch) / 2, side: "center", caret: null };
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  const ext = {
    top: rect.top - TOUR_PAD, left: rect.left - TOUR_PAD,
    right: rect.left + rect.width + TOUR_PAD, bottom: rect.top + rect.height + TOUR_PAD,
  };
  const cand = {
    bottom: { left: cx - cw / 2, top: ext.bottom + TOUR_GAP, fit: ext.bottom + TOUR_GAP + ch <= vh - m },
    top:    { left: cx - cw / 2, top: ext.top - TOUR_GAP - ch, fit: ext.top - TOUR_GAP - ch >= m },
    right:  { left: ext.right + TOUR_GAP, top: cy - ch / 2, fit: ext.right + TOUR_GAP + cw <= vw - m },
    left:   { left: ext.left - TOUR_GAP - cw, top: cy - ch / 2, fit: ext.left - TOUR_GAP - cw >= m },
  };
  const order = [prefer, "bottom", "top", "right", "left"].filter(Boolean);
  const side = order.find((s) => cand[s] && cand[s].fit) || "bottom";
  let { left, top } = cand[side];
  left = Math.max(m, Math.min(left, vw - cw - m));
  top = Math.max(m, Math.min(top, vh - ch - m));
  const caret = {};
  if (side === "bottom" || side === "top") caret.left = Math.max(20, Math.min(cx - left, cw - 20));
  else caret.top = Math.max(20, Math.min(cy - top, ch - 20));
  return { left, top, side, caret };
}

/* ---- step definitions ---- */
function buildTourSteps(nav, store) {
  const s = store.get();
  const lang = (s.user && s.user.lang) || "en";
  const tl = T(lang);
  const proj = s.projects && s.projects[0];
  const chap = proj && proj.chapters && proj.chapters[0];
  const steps = [];

  steps.push({
    kind: "intro",
    eyebrow: tl("tour_intro_eyebrow"),
    title: tl("tour_intro_title"),
    body: tl("tour_intro_body"),
    cta: tl("tour_intro_cta"),
  });

  steps.push({
    screen: "dashboard", goto: () => nav.dashboard(),
    selector: ".stats-strip", prefer: "bottom",
    eyebrow: tl("tour_dash_eyebrow"), title: tl("tour_dash_title"),
    body: tl("tour_dash_body"),
  });
  steps.push({
    screen: "dashboard", selector: ".bar-actions", prefer: "bottom",
    eyebrow: tl("tour_create_eyebrow"), title: tl("tour_create_title"),
    body: tl("tour_create_body"),
  });
  steps.push({
    screen: "dashboard", selector: ".dash-filter", prefer: "bottom",
    eyebrow: tl("tour_filter_eyebrow"), title: tl("tour_filter_title"),
    body: tl("tour_filter_body"),
  });
  if (proj) {
    /* Only pushed when a project actually exists — on a brand-new vault
       there is no .card--project in the grid yet, and pointing the
       spotlight at a selector that matches nothing left it stuck on
       whatever the previous step had highlighted. */
    steps.push({
      screen: "dashboard", selector: ".card-grid .card--project", prefer: "right",
      eyebrow: tl("tour_card_eyebrow"), title: tl("tour_card_title"),
      body: tl("tour_card_body"),
    });
    steps.push({
      screen: "project", goto: () => nav.project(proj.id),
      selector: ".proj-title", prefer: "bottom",
      eyebrow: tl("tour_proj_eyebrow"), title: tl("tour_proj_title"),
      body: tl("tour_proj_body"),
    });
    steps.push({
      screen: "project", selector: ".proj-side", prefer: "left",
      eyebrow: tl("tour_goal_eyebrow"), title: tl("tour_goal_title"),
      body: tl("tour_goal_body"),
    });
    steps.push({
      screen: "project", selector: '[data-tour="add-chapter"]', prefer: "bottom",
      eyebrow: tl("tour_chap_eyebrow"), title: tl("tour_chap_title"),
      body: tl("tour_chap_body"),
    });
    steps.push({
      screen: "project", selector: '[data-tour="assemble-book"]', prefer: "bottom",
      eyebrow: tl("tour_export_eyebrow"), title: tl("tour_export_title"),
      body: tl("tour_export_body"),
    });
  }

  if (chap) {
    steps.push({
      screen: "doc", goto: () => nav.doc(chap.id),
      selector: ".ed-bar", prefer: "bottom",
      eyebrow: tl("tour_tools_eyebrow"), title: tl("tour_tools_title"),
      body: tl("tour_tools_body"),
    });
    steps.push({
      screen: "doc", selector: ".modeswitch", prefer: "bottom",
      eyebrow: tl("tour_modes_eyebrow"), title: tl("tour_modes_title"),
      body: tl("tour_modes_body"),
    });
    steps.push({
      screen: "doc", selector: ".ed-bar-end", prefer: "bottom",
      eyebrow: tl("tour_focus_eyebrow"), title: tl("tour_focus_title"),
      body: tl("tour_focus_body"),
    });
    steps.push({
      screen: "doc", selector: ".ed-foot", prefer: "top",
      eyebrow: tl("tour_count_eyebrow"), title: tl("tour_count_title"),
      body: tl("tour_count_body"),
    });
  }

  steps.push({
    kind: "outro", goto: () => nav.dashboard(),
    eyebrow: tl("tour_outro_eyebrow"), title: tl("tour_outro_title"),
    body: tl("tour_outro_body"),
    cta: tl("tour_outro_cta"),
  });

  return steps;
}

/* ---- the tour overlay ---- */
function Tour({ store, nav, onFinish }) {
  const lang = (store.get().user && store.get().user.lang) || "en";
  const tl = T(lang);
  const steps = useMemo(() => buildTourSteps(nav, store), []);
  const [i, setI] = useState(0);
  const [rect, setRect] = useState(null);
  const [pos, setPos] = useState(null);
  const cardRef = useRef(null);
  const step = steps[i];
  const last = i === steps.length - 1;

  const next = useCallback(() => { if (last) onFinish(); else setI((n) => n + 1); }, [last, onFinish]);
  const back = useCallback(() => setI((n) => Math.max(0, n - 1)), []);

  // resolve target element (navigate, scroll, measure) when the step changes
  useEffect(() => {
    let cancelled = false;
    let raf = 0;
    const timers = [];
    if (step.goto) step.goto();

    function settle(el) {
      tourEnsureVisible(el);
      raf = requestAnimationFrame(() => {
        if (cancelled) return;
        setRect(tourMeasure(el));
        timers.push(setTimeout(() => !cancelled && setRect(tourMeasure(el)), 260));
      });
    }
    // a target that isn't laid out yet (display:none, mid-transition, not
    // yet scrolled into a still-animating container) must never be treated
    // as "found" — that's how a stale/zero rect ends up spotlighting
    // whatever happens to occupy those coordinates.
    function isShown(el) {
      return el.getClientRects().length > 0;
    }
    let tries = 0;
    function attempt() {
      if (cancelled) return;
      if (!step.selector) { setRect(null); return; }
      const el = document.querySelector(step.selector);
      if (el && isShown(el)) settle(el);
      else if (tries++ < 80) timers.push(setTimeout(attempt, 50));
      else setRect(null);
    }
    timers.push(setTimeout(attempt, step.goto ? 280 : 40));
    return () => { cancelled = true; cancelAnimationFrame(raf); timers.forEach(clearTimeout); };
  }, [i]);

  // keep the spotlight glued to the element through resize, scroll (window
  // or any scrollable ancestor — capture:true sees both) and window/Tauri
  // live-resize. Coalesced to one remeasure per frame: never more than one
  // getBoundingClientRect + setState per paint, regardless of event rate.
  useEffect(() => {
    let raf = 0;
    function reflow() {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        if (!step.selector) return;
        const el = document.querySelector(step.selector);
        if (el && el.getClientRects().length > 0) setRect(tourMeasure(el));
      });
    }
    window.addEventListener("resize", reflow);
    window.addEventListener("scroll", reflow, true);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", reflow);
      window.removeEventListener("scroll", reflow, true);
    };
  }, [i]);

  // place the card once it (and the target) are measured
  React.useLayoutEffect(() => {
    if (!cardRef.current) return;
    const cw = cardRef.current.offsetWidth;
    const ch = cardRef.current.offsetHeight;
    setPos(tourComputePos(rect, cw, ch, step.prefer));
  }, [rect, i]);

  // keyboard: → / Enter advance, ← back, Esc skip — captured so the editor ignores them
  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); onFinish(); }
      else if (e.key === "ArrowRight" || e.key === "Enter") { e.preventDefault(); e.stopPropagation(); next(); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); e.stopPropagation(); back(); }
    }
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [next, back, onFinish]);

  const centered = !step.selector;
  const showSpot = rect && !centered;
  const ready = pos != null;

  return (
    <div className="tour-root" aria-live="polite">
      <div className="tour-catch" />
      {showSpot ? (
        <>
          {tourBands(rect, TOUR_PAD).map((b, n) => <div className="tour-band" key={n} style={b} />)}
          <div className="tour-ring" style={{
            top: rect.top - TOUR_PAD, left: rect.left - TOUR_PAD,
            width: rect.width + TOUR_PAD * 2, height: rect.height + TOUR_PAD * 2,
          }} />
        </>
      ) : (
        <div className="tour-veil" />
      )}

      <div ref={cardRef} key={i}
        className={"tour-card tour-card--" + (pos ? pos.side : "center") + (ready ? " is-ready" : "")}
        style={pos ? { left: pos.left, top: pos.top } : { left: -9999, top: -9999 }}>
        {pos && pos.caret && (
          <span className="tour-caret"
            style={pos.caret.left != null ? { left: pos.caret.left } : { top: pos.caret.top }} />
        )}

        <div className="tour-head">
          <span className="tour-eyebrow">
            <span className="tour-eyebrow-dot" />{step.eyebrow}
          </span>
          <span className="tour-count mono">{String(i + 1).padStart(2, "0")} / {String(steps.length).padStart(2, "0")}</span>
        </div>

        <h3 className="tour-title">{step.title}</h3>
        <p className="tour-body">{step.body}</p>

        <div className="tour-pips" aria-hidden="true">
          {steps.map((_, n) => (
            <span key={n} className={"tour-pip" + (n === i ? " on" : "") + (n < i ? " done" : "")} />
          ))}
        </div>

        <div className="tour-foot">
          <button className="tour-skip mono" onClick={onFinish}>
            {last ? "" : tl("tour_skip")}
          </button>
          <div className="tour-nav">
            {i > 0 && !last && (
              <button className="btn btn--ghost tour-btn" onClick={back}>
                <Icon name="back" size={15} /> {tl("tour_back")}
              </button>
            )}
            <button className={"btn tour-btn " + (last ? "btn--accent" : "btn--solid")} onClick={next}>
              {step.cta || tl("tour_next")} <Icon name="forward" size={15} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

window.Tour = Tour;
