import Icon from "./Icon";

const TITLES = {
  dashboard: ["Overview", "Dashboard"],
  new: ["Reporting", "New report"],
  history: ["Records", "Patient reports"],
  settings: ["Configuration", "Settings"],
};

export default function Topbar({ page, settings, onMenu, backendOk }) {
  const [section, title] = TITLES[page] || ["", ""];
  const today = new Date().toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <header className="topbar">
      <div className="row gap-12 min-w-0">
        <button type="button" className="icon-btn menu-btn" onClick={onMenu} aria-label="Open menu">
          <Icon name="menu" size={18} />
        </button>
        <div className="crumbs">
          <span className="crumb-muted">{settings.hospitalName || "RadiologyAI"}</span>
          <Icon name="chevronRight" size={13} className="crumb-sep" />
          <span className="crumb-muted hide-sm">{section}</span>
          <Icon name="chevronRight" size={13} className="crumb-sep hide-sm" />
          <span className="crumb-current">{title}</span>
        </div>
      </div>
      <div className="row gap-16">
        <span
          className={`conn conn-${backendOk === null ? "unknown" : backendOk ? "ok" : "local"}`}
          title={
            backendOk === null
              ? "Checking backend…"
              : backendOk
                ? "Database synchronized"
                : "Saved locally; waiting to synchronize"
          }
        >
          <span className="conn-dot" />
          <span className="hide-sm">
            {backendOk === null ? "Connecting" : backendOk ? "Synced" : "Saved locally"}
          </span>
        </span>
        <span className="topbar-date hide-sm">
          <Icon name="calendar" size={14} /> {today}
        </span>
      </div>
    </header>
  );
}
