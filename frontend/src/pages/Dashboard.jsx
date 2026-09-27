import Icon from "../components/Icon";
import StatusBadge from "../components/StatusBadge";
import { TEMPLATES } from "../lib/constants";
import { formatDateTime, initials } from "../lib/report";

const greeting = () => {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
};

const isToday = (d) => {
  const n = new Date();
  return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth() && d.getDate() === n.getDate();
};

export default function Dashboard({ history, historyState, settings, editor, onStartTemplate, onNavigate, onOpenItem }) {
  const approved = history.filter((r) => r.status === "approved").length;
  const pending = history.length - approved;
  const today = history.filter((r) => isToday(r.createdAt)).length;
  const recent = history.slice(0, 6);

  const counts = {};
  history.forEach((r) => {
    counts[r.template] = (counts[r.template] || 0) + 1;
  });

  const stats = [
    { label: "Total reports", value: history.length, icon: "file" },
    { label: "Reported today", value: today, icon: "calendar" },
    { label: "Pending review", value: pending, icon: "clock", tone: pending ? "warn" : "" },
    { label: "Approved", value: approved, icon: "checkCircle" },
  ];

  const loading = historyState === "loading";

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title">
            {greeting()}, {settings.physician || "Doctor"}
          </h1>
          <p className="page-sub">
            Draft, review and approve radiology reports. The AI suggests an impression — you sign off on the final wording.
          </p>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => onNavigate("new")}>
          <Icon name="filePlus" size={16} /> New report
        </button>
      </div>

      {editor.hasOpenDraft && (
        <div className="resume-card">
          <div className="resume-icon"><Icon name="pencil" size={16} /></div>
          <div className="min-w-0 grow">
            <div className="resume-title">
              Draft in progress — {editor.report.templateData?.patientName || "Unnamed patient"}
            </div>
            <div className="muted small">
              {editor.report.templateName} · waiting for your review and approval
            </div>
          </div>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => onNavigate("new")}>
            Continue <Icon name="arrowRight" size={14} />
          </button>
        </div>
      )}

      <div className="stat-grid">
        {stats.map((s) => (
          <div key={s.label} className={`stat${s.tone ? ` stat-${s.tone}` : ""}`}>
            <div className="stat-icon"><Icon name={s.icon} size={17} /></div>
            <div>
              <div className="stat-value">{loading ? "–" : s.value}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="dash-grid">
        <section className="card">
          <div className="card-head">
            <div>
              <h2 className="card-title">Start a report</h2>
              <p className="card-sub">Pick an examination to open a pre-filled template.</p>
            </div>
          </div>
          <div className="tpl-grid tpl-grid-compact">
            {Object.entries(TEMPLATES).map(([name, t]) => (
              <button key={name} type="button" className="tpl" onClick={() => onStartTemplate(name)}>
                <span className="tpl-icon"><Icon name={t.region} size={20} strokeWidth={1.6} /></span>
                <span className="tpl-text">
                  <span className="tpl-name">{name}</span>
                  <span className="tpl-meta">
                    {t.type}
                    {counts[name] ? ` · used ${counts[name]}×` : ""}
                  </span>
                </span>
                <Icon name="chevronRight" size={16} className="tpl-arrow" />
              </button>
            ))}
          </div>
        </section>

        <section className="card">
          <div className="card-head">
            <div>
              <h2 className="card-title">Recent reports</h2>
              <p className="card-sub">Latest activity across all patients.</p>
            </div>
            <button type="button" className="btn-text btn-text-primary" onClick={() => onNavigate("history")}>
              View all <Icon name="arrowRight" size={13} />
            </button>
          </div>

          {loading ? (
            <div className="skeleton-stack">
              {[0, 1, 2, 3].map((i) => <div key={i} className="skeleton" style={{ height: 44 }} />)}
            </div>
          ) : recent.length === 0 ? (
            <div className="empty">
              <div className="empty-icon"><Icon name="file" size={22} /></div>
              {historyState === "error" ? "Couldn't reach the backend to load reports." : "No reports yet. Start one from a template."}
            </div>
          ) : (
            <ul className="recent-list">
              {recent.map((r) => (
                <li key={r.id}>
                  <button type="button" className="recent-item" onClick={() => onOpenItem(r)}>
                    <span className="avatar avatar-sm">{initials(r.name)}</span>
                    <span className="min-w-0 grow">
                      <span className="recent-name">{r.name || "Unknown patient"}</span>
                      <span className="recent-meta">{r.template} · {formatDateTime(r.createdAt)}</span>
                    </span>
                    <StatusBadge status={r.status} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
