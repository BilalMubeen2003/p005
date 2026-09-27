import { formatDate } from "../lib/report";

// A report laid out like the printed document: letterhead, patient block,
// exam title, then the sections passed as children.
export default function ReportPaper({ templateName, data, settings, children, live = false }) {
  const row = (label, value) => (
    <div className="paper-row">
      <dt>{label}</dt>
      <dd className={value ? "" : "is-empty"}>{value || "—"}</dd>
    </div>
  );

  return (
    <article className={`paper${live ? " is-live" : ""}`}>
      <header className="paper-letterhead">
        <div>
          <div className={`paper-hospital${settings.hospitalName ? "" : " is-empty"}`}>
            {settings.hospitalName || "Hospital name (set in Settings)"}
          </div>
          {settings.department && <div className="paper-dept">{settings.department}</div>}
        </div>
        <div className="paper-doc-type">Radiology report</div>
      </header>

      <dl className="paper-patient">
        {row("Reg. No", data.regNo)}
        {row("Age", data.patientAge)}
        {row("Patient name", data.patientName)}
        {row("Sex", data.patientSex)}
        {row("Performed", data.performedDate && formatDate(data.performedDate))}
        {row("Report date", data.reportDate && formatDate(data.reportDate))}
        {row("Referred by", data.referredBy)}
      </dl>

      <h2 className={`paper-title${templateName ? "" : " is-empty"}`}>
        {templateName ? templateName.toUpperCase() : "SELECT AN EXAMINATION"}
      </h2>

      <div className="paper-sections">{children}</div>

      <footer className="paper-sign">
        <div className="paper-sign-line" />
        <div className="paper-sign-name">{settings.physician || "Reporting physician"}</div>
        {settings.credentials && <div className="paper-sign-cred">{settings.credentials}</div>}
      </footer>
    </article>
  );
}

// Read-only section used for the live preview and the history drawer.
export function PaperSection({ label, value, placeholder = "—", tag }) {
  return (
    <section className="psec is-static">
      <div className="psec-head">
        <h3 className="psec-label">{label}</h3>
        {tag && <span className="chip">{tag}</span>}
      </div>
      <div className={`psec-body${value ? "" : " is-empty"}`}>{value || placeholder}</div>
    </section>
  );
}
