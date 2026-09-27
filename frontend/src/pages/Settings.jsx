import { useState } from "react";
import Icon from "../components/Icon";
import ReportPaper, { PaperSection } from "../components/ReportPaper";
import { API_BASE, DEFAULT_SETTINGS } from "../lib/constants";

export default function Settings({ settings, onSave, notify, backendOk, onCheckBackend }) {
  const [form, setForm] = useState(settings);
  const dirty = JSON.stringify(form) !== JSON.stringify(settings);
  const on = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const save = () => {
    onSave(form);
    notify("Settings saved", "success");
  };

  return (
    <div className="page page-wide">
      <div className="page-head">
        <div>
          <h1 className="page-title">Settings</h1>
          <p className="page-sub">Letterhead and signature details used on every printed report. Saved in this browser.</p>
        </div>
      </div>

      <div className="settings-grid">
        <div>
          <section className="card">
            <div className="card-head">
              <div>
                <h2 className="card-title">Hospital letterhead</h2>
                <p className="card-sub">Shown at the top of the report.</p>
              </div>
            </div>
            <div className="field">
              <div className="field-label"><label htmlFor="s-h">Hospital name</label></div>
              <input id="s-h" className="input" name="hospitalName" value={form.hospitalName} onChange={on} placeholder="e.g. City General Hospital" />
            </div>
            <div className="field">
              <div className="field-label"><label htmlFor="s-d">Department</label></div>
              <input id="s-d" className="input" name="department" value={form.department} onChange={on} placeholder="e.g. Department of Radiology" />
            </div>
          </section>

          <section className="card">
            <div className="card-head">
              <div>
                <h2 className="card-title">Reporting physician</h2>
                <p className="card-sub">Printed in the signature block.</p>
              </div>
            </div>
            <div className="grid-2">
              <div className="field">
                <div className="field-label"><label htmlFor="s-p">Name</label></div>
                <input id="s-p" className="input" name="physician" value={form.physician} onChange={on} placeholder="e.g. Dr. John Doe" />
              </div>
              <div className="field">
                <div className="field-label"><label htmlFor="s-c">Credentials</label></div>
                <input id="s-c" className="input" name="credentials" value={form.credentials} onChange={on} placeholder="e.g. FCPS, Interventional Radiologist" />
              </div>
            </div>
            <div className="row gap-8 mt-8">
              <button type="button" className="btn btn-primary" onClick={save} disabled={!dirty}>
                <Icon name="check" size={15} /> Save changes
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => setForm(DEFAULT_SETTINGS)}>
                Reset to defaults
              </button>
            </div>
          </section>

          <section className="card">
            <div className="card-head">
              <div>
                <h2 className="card-title">System</h2>
                <p className="card-sub">Local storage and background database synchronization.</p>
              </div>
            </div>
            <dl className="kv">
              <div><dt>API endpoint</dt><dd className="mono">{API_BASE}</dd></div>
              <div>
                <dt>Backend</dt>
                <dd>
                  <span className={`conn conn-${backendOk === null ? "unknown" : backendOk ? "ok" : "local"}`}>
                    <span className="conn-dot" />
                    {backendOk === null ? "Checking…" : backendOk ? "Database synced" : "Saving locally"}
                  </span>
                </dd>
              </div>
              <div><dt>Storage</dt><dd>Local-first · background sync</dd></div>
              <div><dt>AI model</dt><dd className="mono">gemini-2.5-flash · Google</dd></div>
            </dl>
            <button type="button" className="btn btn-ghost mt-12" onClick={onCheckBackend}>
              <Icon name="server" size={14} /> Test connection
            </button>
          </section>
        </div>

        <div className="settings-preview">
          <div className="preview-label">Letterhead preview</div>
          <ReportPaper
            templateName="CT Brain Plain"
            data={{ regNo: "04120", patientName: "Sample Patient", patientAge: "45 Years", patientSex: "Male" }}
            settings={form}
          >
            <PaperSection label="Findings" value="Report content appears here." />
          </ReportPaper>
        </div>
      </div>
    </div>
  );
}
