import { useMemo } from "react";
import Icon from "../components/Icon";
import AutoTextarea from "../components/AutoTextarea";
import ReportPaper, { PaperSection } from "../components/ReportPaper";
import EditableSection from "../components/EditableSection";
import StatusBadge from "../components/StatusBadge";
import { STEPS, TEMPLATES, usesReasonForExam } from "../lib/constants";
import {
  buildPlainText,
  formatDateTime,
  parseMissingFields,
  printReport,
} from "../lib/report";

export default function NewReport({ editor, settings, notify }) {
  return editor.report ? (
    <ReviewView editor={editor} settings={settings} notify={notify} />
  ) : (
    <ComposeView editor={editor} settings={settings} notify={notify} />
  );
}

/* ───────────────────────── Compose (inputs + live preview) ───────────────────────── */

function Field({ label, required, error, aside, children, className = "" }) {
  return (
    <div className={`field ${className}${error ? " has-error" : ""}`}>
      <div className="field-label">
        <label>
          {label}
          {required && <span className="req">*</span>}
        </label>
        {aside}
      </div>
      {children}
      {error && <div className="field-error">{error}</div>}
    </div>
  );
}

function ComposeView({ editor, settings }) {
  const { form, setField, selectTemplate, missing, attempted, needsReason, busy, error } = editor;
  const tpl = TEMPLATES[form.templateName];

  const err = (value, msg = "Required") => (attempted && !String(value).trim() ? msg : null);
  const on = (e) => setField(e.target.name, e.target.value);

  const stepDone = useMemo(
    () => ({
      template: Boolean(form.templateName),
      patient: Boolean(form.regNo && form.patientName && form.patientAge && form.patientSex),
      clinical: Boolean((needsReason ? form.reasonForExam : form.clinicalFeature) && form.findings),
      review: false,
    }),
    [form, needsReason],
  );

  const scrollTo = (id) => {
    document.getElementById(`sec-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const insertNormal = () => {
    if (!tpl) return;
    if (form.findings.trim() && !window.confirm("Replace the current findings with the normal template?")) return;
    setField("findings", tpl.normalFindings);
  };

  const words = form.findings.trim() ? form.findings.trim().split(/\s+/).length : 0;
  const generating = busy === "generating";

  const onKeyDown = (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      if (!generating) editor.generate();
    }
  };

  return (
    <div className="page page-wide" onKeyDown={onKeyDown}>
      <div className="page-head">
        <div>
          <h1 className="page-title">New radiology report</h1>
          <p className="page-sub">
            Enter the examination, patient details and your findings. The assistant drafts an impression you can edit before approving.
          </p>
        </div>
        {(form.templateName || form.patientName) && (
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => window.confirm("Clear everything on this form?") && editor.reset()}
          >
            <Icon name="refresh" size={14} /> Clear form
          </button>
        )}
      </div>

      <ol className="stepper">
        {STEPS.map((s, i) => {
          const done = stepDone[s.id];
          const current = !done && (i === 0 || stepDone[STEPS[i - 1].id]);
          return (
            <li key={s.id} className={`step${done ? " is-done" : ""}${current ? " is-current" : ""}`}>
              <button type="button" onClick={() => s.id !== "review" && scrollTo(s.id)} disabled={s.id === "review"}>
                <span className="step-dot">{done ? <Icon name="check" size={12} strokeWidth={3} /> : i + 1}</span>
                <span className="step-label">{s.label}</span>
              </button>
            </li>
          );
        })}
      </ol>

      <div className="compose">
        <div className="compose-form">
          {/* 1. Examination */}
          <section className="card" id="sec-template">
            <div className="card-head">
              <div>
                <h2 className="card-title"><span className="card-num">1</span> Examination</h2>
                <p className="card-sub">Choose the study type. Technique is filled in for you.</p>
              </div>
            </div>
            <div className="tpl-grid" role="radiogroup" aria-label="Examination template">
              {Object.entries(TEMPLATES).map(([name, t]) => {
                const active = form.templateName === name;
                return (
                  <button
                    key={name}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    className={`tpl tpl-select${active ? " is-active" : ""}`}
                    onClick={() => !active && selectTemplate(name)}
                  >
                    <span className="tpl-icon">
                      <Icon name={t.region} size={20} strokeWidth={1.6} />
                      <span className="tpl-check"><Icon name="check" size={10} strokeWidth={3.2} /></span>
                    </span>
                    <span className="tpl-text">
                      <span className="tpl-name">{name}</span>
                      <span className="tpl-meta">{t.type}</span>
                    </span>
                  </button>
                );
              })}
            </div>
            {attempted && !form.templateName && <div className="field-error mt-8">Select an examination</div>}

            {form.templateName && (
              <Field
                label="Technique"
                className="mt-16"
                aside={<span className="chip">Auto-filled · editable</span>}
              >
                <AutoTextarea name="technique" minRows={2} value={form.technique} onChange={on} />
              </Field>
            )}
          </section>

          {/* 2. Patient */}
          <section className="card" id="sec-patient">
            <div className="card-head">
              <div>
                <h2 className="card-title"><span className="card-num">2</span> Patient information</h2>
                <p className="card-sub">Demographics and referral details.</p>
              </div>
            </div>
            <div className="grid-3">
              <Field label="Reg No" required error={err(form.regNo)}>
                <input className="input mono" name="regNo" value={form.regNo} onChange={on} placeholder="e.g. 04120" />
              </Field>
              <Field label="Age" required error={err(form.patientAge)}>
                <input className="input" name="patientAge" value={form.patientAge} onChange={on} placeholder="e.g. 45 Years" />
              </Field>
              <Field label="Sex" required error={err(form.patientSex)}>
                <div className="segmented" role="radiogroup" aria-label="Sex">
                  {["Male", "Female"].map((s) => (
                    <button
                      key={s}
                      type="button"
                      role="radio"
                      aria-checked={form.patientSex === s}
                      className={form.patientSex === s ? "is-active" : ""}
                      onClick={() => setField("patientSex", s)}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </Field>
            </div>
            <Field label="Patient name" required error={err(form.patientName)}>
              <input className="input" name="patientName" value={form.patientName} onChange={on} placeholder="Full name" />
            </Field>
            <div className="grid-3">
              <Field label="Performed date">
                <input className="input" type="date" name="performedDate" value={form.performedDate} onChange={on} />
              </Field>
              <Field label="Report date">
                <input className="input" type="date" name="reportDate" value={form.reportDate} onChange={on} />
              </Field>
              <Field label="Referred by">
                <input className="input" name="referredBy" value={form.referredBy} onChange={on} placeholder="Dr. name" />
              </Field>
            </div>
          </section>

          {/* 3. Clinical */}
          <section className="card" id="sec-clinical">
            <div className="card-head">
              <div>
                <h2 className="card-title"><span className="card-num">3</span> Clinical details &amp; findings</h2>
                <p className="card-sub">What you observed. You can still edit the findings after the draft is generated.</p>
              </div>
            </div>

            {!form.templateName ? (
              <div className="empty empty-inline">
                <Icon name="info" size={16} /> Select an examination first.
              </div>
            ) : (
              <>
                {needsReason ? (
                  <>
                    <Field label="Reason for exam" required error={err(form.reasonForExam)}>
                      <AutoTextarea
                        name="reasonForExam"
                        minRows={2}
                        value={form.reasonForExam}
                        onChange={on}
                        placeholder="e.g. Hematuria, suspicion of renal calculus"
                      />
                    </Field>
                    <Field label="Comparison">
                      <input
                        className="input"
                        name="comparison"
                        value={form.comparison}
                        onChange={on}
                        placeholder="e.g. None / Previous scan dated…"
                      />
                    </Field>
                  </>
                ) : (
                  <Field label="Clinical features" required error={err(form.clinicalFeature)}>
                    <AutoTextarea
                      name="clinicalFeature"
                      minRows={2}
                      value={form.clinicalFeature}
                      onChange={on}
                      placeholder="e.g. Headache, fever, chest pain…"
                    />
                  </Field>
                )}

                <Field
                  label="Findings"
                  required
                  error={err(form.findings)}
                  aside={
                    <button type="button" className="btn-text btn-text-primary" onClick={insertNormal}>
                      <Icon name="file" size={13} /> Insert normal template
                    </button>
                  }
                >
                  <AutoTextarea
                    name="findings"
                    minRows={6}
                    value={form.findings}
                    onChange={on}
                    placeholder="Describe your observations in detail…"
                  />
                  <div className="field-foot">
                    <span>{words} words · {form.findings.length} characters</span>
                    <span className="hide-sm">Ctrl + Enter to generate</span>
                  </div>
                </Field>
              </>
            )}
          </section>

          <div className="generate-bar">
            <div className="generate-status">
              {missing.length === 0 ? (
                <span className="text-ok"><Icon name="checkCircle" size={15} /> Ready to generate</span>
              ) : (
                <span className="muted">
                  <b>{missing.length}</b> required {missing.length === 1 ? "field" : "fields"} left
                  <span className="hide-sm">: {missing.join(", ")}</span>
                </span>
              )}
            </div>
            <button type="button" className="btn btn-primary btn-lg" onClick={editor.generate} disabled={generating}>
              {generating ? (
                <><span className="spinner" /> Drafting report…</>
              ) : (
                <><Icon name="sparkle" size={15} /> Generate draft</>
              )}
            </button>
          </div>

          {error && (
            <div className="notice notice-danger mt-12">
              <Icon name="alert" size={16} /> {error}
            </div>
          )}
        </div>

        <div className="compose-preview">
          <div className="preview-label">
            <span className="live-dot" /> Live preview
          </div>
          <ReportPaper templateName={form.templateName} data={form} settings={settings} live>
            <PaperSection label="Technique" value={form.technique} />
            {needsReason ? (
              <>
                <PaperSection label="Reason for exam" value={form.reasonForExam} />
                {form.comparison && <PaperSection label="Comparison" value={form.comparison} />}
              </>
            ) : (
              <PaperSection label="Clinical features" value={form.clinicalFeature} />
            )}
            <PaperSection label="Findings" value={form.findings} placeholder="Your findings will appear here." />
            <PaperSection
              label="Impression"
              tag="AI"
              value={generating ? "Drafting…" : ""}
              placeholder="Drafted by the assistant after you click Generate."
            />
          </ReportPaper>
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────── Review (editable report) ───────────────────────── */

function ReviewView({ editor, settings, notify }) {
  const {
    report,
    draft,
    original,
    currentData,
    editedKeys,
    impressionStale,
    approved,
    reviewed,
    setReviewed,
    busy,
    error,
  } = editor;

  const locked = approved;
  const needsReason = usesReasonForExam(report.templateName);
  const missingList = parseMissingFields(report.missingFields);

  const sec = (key, label, extra = {}) => (
    <EditableSection
      key={key}
      label={label}
      value={draft[key]}
      original={original[key]}
      onSave={(v) => editor.updateDraft(key, v)}
      onRevert={() => editor.revert(key)}
      locked={locked}
      {...extra}
    />
  );

  const printable = {
    templateName: report.templateName,
    data: currentData,
    impression: draft.impression,
    recommendations: draft.recommendations,
    settings,
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(buildPlainText(printable));
      notify("Report copied to clipboard", "success");
    } catch {
      notify("Couldn't copy — select and copy manually", "warning");
    }
  };

  const print = () => {
    if (!printReport(printable)) notify("Allow pop-ups to print the report", "warning");
  };

  const startNew = () => {
    if (!approved && !window.confirm("This report hasn't been approved yet. Start a new one anyway?")) return;
    editor.reset();
  };

  return (
    <div className="page page-wide">
      <div className="page-head">
        <div className="min-w-0">
          <div className="row gap-8 wrap mb-6">
            <StatusBadge status={approved ? "approved" : "pending"} />
            <span className="muted small">{report.templateName}</span>
          </div>
          <h1 className="page-title">{report.templateData?.patientName || "Unnamed patient"}</h1>
          <p className="page-sub">
            {locked
              ? "This report is approved and locked."
              : "Click any section of the report to edit it — including the findings. Approve when it reads correctly."}
          </p>
        </div>
        <div className="row gap-8 wrap">
          <button type="button" className="btn btn-ghost" onClick={copy}><Icon name="copy" size={14} /> Copy</button>
          <button type="button" className="btn btn-ghost" onClick={print}><Icon name="printer" size={14} /> Print</button>
          <button type="button" className="btn btn-ghost" onClick={startNew}><Icon name="filePlus" size={14} /> New report</button>
        </div>
      </div>

      <div className="review">
        <div className="review-doc">
          <ReportPaper templateName={report.templateName} data={currentData} settings={settings}>
            {sec("technique", "Technique")}
            {needsReason ? (
              <>
                {sec("reasonForExam", "Reason for exam")}
                {sec("comparison", "Comparison", { placeholder: "None" })}
              </>
            ) : (
              sec("clinicalFeature", "Clinical features")
            )}
            {sec("findings", "Findings", {
              emphasis: true,
              hint: "Editing findings? Re-draft the impression afterwards if needed · Ctrl + Enter to save",
            })}
            {impressionStale && !locked && (
              <div className="notice notice-warn inline-notice">
                <Icon name="alert" size={16} />
                <div className="grow">
                  <b>Findings changed after the impression was drafted.</b> Re-draft it, or edit the impression yourself.
                </div>
                <button type="button" className="btn btn-ghost btn-sm" onClick={editor.redraft} disabled={Boolean(busy)}>
                  {busy === "redrafting" ? <><span className="spinner spinner-dark" /> Re-drafting…</> : <><Icon name="sparkle" size={13} /> Re-draft</>}
                </button>
              </div>
            )}
            {sec("impression", "Impression", { tag: "AI draft" })}
            {sec("recommendations", "Recommendations", { tag: "AI draft", placeholder: "No recommendations" })}
          </ReportPaper>
        </div>

        <aside className="review-side">
          <section className="card card-tight">
            <h2 className="card-title">Report status</h2>
            <dl className="kv">
              <div><dt>Status</dt><dd>{approved ? "Approved" : "Awaiting approval"}</dd></div>
              <div><dt>Drafted</dt><dd>{formatDateTime(report.createdAt)}</dd></div>
              <div><dt>Reg. No</dt><dd className="mono">{report.templateData?.regNo || "—"}</dd></div>
              <div>
                <dt>Your edits</dt>
                <dd>{editedKeys.length ? `${editedKeys.length} section${editedKeys.length > 1 ? "s" : ""}` : "None"}</dd>
              </div>
            </dl>
          </section>

          {missingList.length > 0 && (
            <section className="card card-tight">
              <h2 className="card-title row gap-6"><Icon name="info" size={15} /> AI noted missing details</h2>
              <ul className="missing-list">
                {missingList.map((m, i) => <li key={i}>{m}</li>)}
              </ul>
              {!locked && (
                <p className="muted small mt-8">Add these to the findings if relevant, then re-draft the impression.</p>
              )}
            </section>
          )}

          <section className="card card-tight">
            <h2 className="card-title">Sign-off</h2>
            {!approved ? (
              <>
                <label className={`confirm${reviewed ? " is-checked" : ""}`}>
                  <input type="checkbox" checked={reviewed} onChange={(e) => setReviewed(e.target.checked)} />
                  <span>I have reviewed the findings, impression and recommendations and confirm they are accurate.</span>
                </label>
                <button
                  type="button"
                  className="btn btn-primary btn-block btn-lg"
                  onClick={editor.approve}
                  disabled={!reviewed || Boolean(busy)}
                >
                  {busy === "approving" ? <><span className="spinner" /> Saving…</> : <><Icon name="lock" size={15} /> Approve &amp; save</>}
                </button>
                {impressionStale && (
                  <p className="muted small mt-8">Tip: the impression was drafted before your findings edits.</p>
                )}
              </>
            ) : (
              <div className="approved-box">
                <Icon name="checkCircle" size={22} />
                <div>
                  <div className="approved-title">Approved and saved</div>
                  <div className="muted small">Signed by {settings.physician || "the reporting physician"}</div>
                </div>
              </div>
            )}
          </section>

          {error && (
            <div className="notice notice-danger">
              <Icon name="alert" size={16} /> {error}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
