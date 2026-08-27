/* ============================================================
   Sipru. — app frame

   Every screen renders inside the same three-part chrome:

     · a 72pt icon rail, always visible, that switches sections
     · a 280pt contextual sidebar whose contents each screen supplies
     · the working column — a 60pt top bar plus a scrolling body

   On phones the rail and the sidebar both fold away: the rail
   becomes a bottom tab bar and the sidebar becomes a drawer that
   slides in over the working column.
   ============================================================ */

/* Which rail icon lights up for the screen currently on screen.
   `doc` and `project` both live under the library, so they share a
   section — the rail is about where you are, not how you got there. */
function sectionOf(route) {
  if (!route) return "library";
  if (route.name === "profile") return "settings";
  if (route.name === "export") return "export";
  if (route.name === "dashboard") {
    if (route.filter === "notes") return "notes";
    if (route.filter === "projects") return "library";
    return "home";
  }
  return "library";
}

/* ---- the icon rail ---- */
function NavRail({ user, nav, section, onSearch, onTheme, lang }) {
  const tl = T(lang || "en");
  const items = [
    { key: "home",    icon: "home",   label: tl("rail_home"),    go: () => nav.dashboard() },
    { key: "search",  icon: "search", label: tl("rail_search"),  go: onSearch },
    { key: "library", icon: "bookOpen", label: tl("rail_library"), go: () => nav.dashboard("projects") },
    { key: "notes",   icon: "note",   label: tl("rail_notes"),   go: () => nav.dashboard("notes") },
  ];
  return (
    <nav className="rail" aria-label={tl("rail_nav")}>
      <button className="rail-mark" onClick={() => nav.dashboard()} title="Sipru">
        <span>S</span><i />
      </button>

      <div className="rail-items">
        {items.map((it) => (
          <button key={it.key} title={it.label} aria-label={it.label}
            className={"rail-btn" + (section === it.key ? " on" : "")}
            onClick={it.go}>
            <Icon name={it.icon} size={20} />
          </button>
        ))}
      </div>

      <div className="rail-foot">
        <button className="rail-btn" title={tl("theme_toggle")} aria-label={tl("theme_toggle")}
          onClick={() => onTheme(user.theme === "dark" ? "light" : "dark")}>
          <Icon name={user.theme === "dark" ? "moon" : "sun"} size={20} />
        </button>
        <button className={"rail-btn" + (section === "settings" ? " on" : "")}
          title={tl("topbar_profile")} aria-label={tl("topbar_profile")}
          onClick={() => nav.profile()}>
          <Icon name="sliders" size={20} />
        </button>
        <button className="rail-ava" onClick={() => nav.profile()} title={user.name || tl("default_author")}>
          {user.avatar
            ? <img src={user.avatar} alt="" />
            : (user.name || tl("default_author")).trim().charAt(0).toUpperCase()}
        </button>
      </div>
    </nav>
  );
}

/* ---- the bottom tab bar (phones) ---- */
function MobileTabs({ nav, section, onSearch, lang }) {
  const tl = T(lang || "en");
  const tabs = [
    { key: "home",     icon: "home",   label: tl("rail_home"),     go: () => nav.dashboard() },
    { key: "library",  icon: "bookOpen", label: tl("rail_library"),  go: () => nav.dashboard("projects") },
    { key: "search",   icon: "search", label: tl("rail_search"),   go: onSearch },
    { key: "settings", icon: "user",   label: tl("rail_profile"),  go: () => nav.profile() },
  ];
  return (
    <nav className="tabbar" aria-label={tl("rail_nav")}>
      {tabs.map((t) => (
        <button key={t.key} className={"tab" + (section === t.key ? " on" : "")} onClick={t.go}>
          <Icon name={t.icon} size={21} />
          <span>{t.label}</span>
        </button>
      ))}
    </nav>
  );
}

/* ---- the contextual sidebar ---- */
function Sidebar({ title, back, action, children, foot, open, onClose }) {
  return (
    <>
      <div className={"side-scrim" + (open ? " on" : "")} onClick={onClose} />
      <aside className={"side" + (open ? " open" : "")}>
        <div className="side-head">
          {back && (
            <button className="side-back" onClick={back.onClick} title={back.label}>
              <Icon name="back" size={17} />
            </button>
          )}
          <h2 className="side-title">{title}</h2>
          {action}
          <button className="side-close" onClick={onClose} aria-label="Close">
            <Icon name="close" size={17} />
          </button>
        </div>
        {/* on a phone the sidebar is a drawer: choosing anything in it is
            the end of the interaction, so the drawer gets out of the way */}
        <div className="side-body" onClick={(e) => {
          if (open && e.target.closest("button")) onClose();
        }}>{children}</div>
        {foot && <div className="side-foot">{foot}</div>}
      </aside>
    </>
  );
}

/* ---- the frame itself ----
   `crumbs` is an array of strings (or nodes); the last one reads as the
   current place and the ones before it as the trail that leads there. */
function AppFrame({ user, nav, route, onSearch, onTheme, sidebar, crumbs, actions,
                   children, bodyClass, chromeless }) {
  const [drawer, setDrawer] = useState(false);
  const section = sectionOf(route);
  const lang = user.lang || "en";

  // a route change closes the drawer — otherwise tapping a chapter on a
  // phone leaves the sidebar sitting over the text you just opened
  useEffect(() => { setDrawer(false); }, [route && route.name, route && route.id]);

  if (chromeless) return <div className="frame frame--bare">{children}</div>;

  return (
    <div className="frame">
      <NavRail user={user} nav={nav} section={section} lang={lang}
        onSearch={onSearch} onTheme={onTheme} />

      {sidebar && React.cloneElement(sidebar, { open: drawer, onClose: () => setDrawer(false) })}

      <div className={"col" + (sidebar ? "" : " col--wide")}>
        <header className="bar">
          {sidebar && (
            <button className="bar-burger" onClick={() => setDrawer(true)} aria-label="Menu">
              <Icon name="panel" size={18} />
            </button>
          )}
          <div className="crumbs">
            {(crumbs || []).map((c, i, a) => (
              <React.Fragment key={i}>
                {i > 0 && <span className="crumb-sep">/</span>}
                <span className={"crumb" + (i === a.length - 1 ? " crumb--now" : "")}>{c}</span>
              </React.Fragment>
            ))}
          </div>
          <div className="bar-actions">{actions}</div>
        </header>
        <div className={"col-body scroll-area" + (bodyClass ? " " + bodyClass : "")}>
          {children}
        </div>
      </div>

      <MobileTabs nav={nav} section={section} onSearch={onSearch} lang={lang} />
    </div>
  );
}
