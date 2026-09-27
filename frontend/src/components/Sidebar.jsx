import Icon from "./Icon";
import { initials } from "../lib/report";

const NAV = [
  { id: "dashboard", label: "Dashboard", icon: "dashboard" },
  { id: "new", label: "New report", icon: "filePlus" },
  { id: "history", label: "Patient reports", icon: "history" },
  { id: "settings", label: "Settings", icon: "settings" },
];

export default function Sidebar({ page, onNavigate, pendingCount, hasOpenDraft, settings, open, onClose }) {
  return (
    <>
      <div className={`sidebar-backdrop${open ? " is-open" : ""}`} onClick={onClose} />
      <aside className={`sidebar${open ? " is-open" : ""}`}>
        <div className="brand">
          <div className="brand-mark">
            <Icon name="logo" size={18} strokeWidth={1.8} />
          </div>
          <div>
            <div className="brand-name">RadiologyAI</div>
            <div className="brand-sub">Reporting workstation</div>
          </div>
        </div>

        <nav className="nav" aria-label="Main">
          <div className="nav-caption">Workspace</div>
          {NAV.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`nav-item${page === item.id ? " is-active" : ""}`}
              onClick={() => onNavigate(item.id)}
              aria-current={page === item.id ? "page" : undefined}
            >
              <Icon name={item.icon} size={17} />
              <span>{item.label}</span>
              {item.id === "history" && pendingCount > 0 && (
                <span className="nav-count" title="Pending review">{pendingCount}</span>
              )}
              {item.id === "new" && hasOpenDraft && (
                <span className="nav-dot" title="Draft in progress" />
              )}
            </button>
          ))}
        </nav>

        <div className="sidebar-foot">
          <div className="avatar">{initials(settings.physician)}</div>
          <div className="min-w-0">
            <div className="sidebar-user">{settings.physician || "Radiologist"}</div>
            <div className="sidebar-user-sub">{settings.credentials || "Reporting physician"}</div>
          </div>
        </div>
      </aside>
    </>
  );
}
