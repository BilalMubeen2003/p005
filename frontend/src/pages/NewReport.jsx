import { useState } from "react";
import Icon from "../components/Icon";
import AutoTextarea from "../components/AutoTextarea";
import ReportPaper from "../components/ReportPaper";
import EditableSection from "../components/EditableSection";
import StatusBadge from "../components/StatusBadge";
import { TEMPLATES, usesReasonForExam } from "../lib/constants";
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

function ComposeView({ editor }) {
  const { form, setField, selectTemplate, attempted, needsReason, error, stage } = editor;
  const on = (e) => setField(e.target.name, e.target.value);
  const err = (value) => (attempted && !String(value).trim() ? "Required" : null);
  const steps = [
    { id: "details", label: "Case details" },
    { id: "chat", label: "Clinical findings" },
    { id: "review", label: "Draft & review" },
  ];
  const current = stage === "chat" ? 1 : 0;

  return (
    <div className="page report-flow">
      <div className="page-head">
        <div>
          <div className="eyebrow">AI-assisted reporting</div>
          <h1 className="page-title">Create a new report</h1>
          <p className="page-sub">Start with the facts. Your clinical co-pilot will help make the findings complete before drafting.</p>
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
        {steps.map((s, i) => <li key={s.id} className={`step${i < current ? " is-done" : ""}${i === current ? " is-current" : ""}`}>
          <button type="button" disabled={i >= current} onClick={() => i === 0 && editor.backToDetails()}>
            <span className="step-dot">{i < current ? <Icon name="check" size={12} strokeWidth={3} /> : i + 1}</span>
            <span className="step-label">{s.label}</span>
          </button>
        </li>)}
      </ol>

      {stage === "details" ? (
        <div className="flow-grid">
          <div>
          <section className="card">
            <div className="card-head">
              <div>
                <h2 className="card-title">Examination</h2>
                <p className="card-sub">Choose the study you are reporting.</p>
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

          <section className="card">
            <div className="card-head">
              <div>
                <h2 className="card-title">Patient information</h2>
                <p className="card-sub">Enter factual patient and referral details.</p>
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

          <section className="card">
            <div className="card-head">
              <div>
                <h2 className="card-title">Clinical context</h2>
                <p className="card-sub">Add the indication here. You will describe imaging findings in the next step.</p>
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

              </>
            )}
          </section>
          <div className="flow-actions">
            <span className="muted small">Clinical findings are collected in the next step.</span>
            <button type="button" className="btn btn-primary btn-lg" onClick={editor.startClarification}>
              Continue to findings <Icon name="arrowRight" size={15} />
            </button>
          </div>
          {error && (
            <div className="notice notice-danger mt-12">
              <Icon name="alert" size={16} /> {error}
            </div>
          )}
          </div>
          <aside className="case-summary card card-tight">
            <div className="case-summary-icon"><Icon name={TEMPLATES[form.templateName]?.region || "file"} size={22} /></div>
            <h2 className="card-title">Case snapshot</h2>
            <dl className="kv">
              <div><dt>Examination</dt><dd>{form.templateName || "Not selected"}</dd></div>
              <div><dt>Patient</dt><dd>{form.patientName || "Not entered"}</dd></div>
              <div><dt>Reg. no.</dt><dd>{form.regNo || "—"}</dd></div>
              <div><dt>Clinical context</dt><dd>{form.reasonForExam || form.clinicalFeature || "—"}</dd></div>
            </dl>
            <p className="case-summary-note"><Icon name="lock" size={13} /> Patient details stay separate from the AI findings interview.</p>
          </aside>
        </div>
      ) : (
        <ClarificationView editor={editor} />
      )}
    </div>
  );
}

function ClarificationView({ editor }) {
  const [input, setInput] = useState("");
  const sending = editor.busy === "clarifying";
  const generating = editor.busy === "generating";
  const submit = (e) => {
    e.preventDefault();
    if (!input.trim() || sending) return;
    editor.sendFinding(input);
    setInput("");
  };

  return <div className="clinical-workspace">
    <section className="chat-card">
      <header className="chat-head">
        <div className="ai-avatar"><Icon name="sparkle" size={18} /></div>
        <div><h2>Clinical co-pilot</h2><p>{editor.form.templateName} · focused findings review</p></div>
        <span className={`chat-state ${editor.clarificationComplete ? "is-complete" : ""}`}>
          <span /> {editor.clarificationComplete ? "Complete" : "Reviewing"}
        </span>
      </header>
      <div className="chat-context"><Icon name="info" size={14} /> Describe what you see. The assistant asks only for missing or unclear reportable details.</div>
      <div className="chat-thread" aria-live="polite">
        {editor.messages.map((message, index) => <div key={index} className={`message ${message.role === "user" ? "message-user" : "message-ai"}`}>
          {message.role === "assistant" && <div className="message-mark"><Icon name="sparkle" size={13} /></div>}
          <div className="message-bubble">{message.content}</div>
        </div>)}
        {sending && <div className="message message-ai"><div className="message-mark"><Icon name="sparkle" size={13} /></div><div className="message-bubble typing"><i /><i /><i /></div></div>}
      </div>
      <form className="chat-compose" onSubmit={submit}>
        <AutoTextarea value={input} onChange={(e) => setInput(e.target.value)} minRows={2} placeholder="Type your findings or answer the question…" disabled={sending || editor.clarificationComplete} />
        <button className="btn btn-primary" disabled={!input.trim() || sending || editor.clarificationComplete} aria-label="Send response"><Icon name="arrowRight" size={16} /></button>
      </form>
    </section>
    <aside className="findings-panel">
      <div className="card card-tight">
        <div className="eyebrow">Working summary</div>
        <h2 className="card-title mt-6">Captured findings</h2>
        <p className={`findings-copy ${editor.findingsSummary ? "" : "is-empty"}`}>{editor.findingsSummary || "Your consolidated findings will appear here as the conversation progresses."}</p>
      </div>
      {editor.error && <div className="notice notice-danger"><Icon name="alert" size={16} /> {editor.error}</div>}
      <div className="flow-actions flow-actions-stack">
        <button type="button" className="btn btn-ghost" onClick={editor.backToDetails}>Back to case details</button>
        <button type="button" className="btn btn-primary btn-lg" onClick={editor.generateFromChat} disabled={!editor.clarificationComplete || generating}>
          {generating ? <><span className="spinner" /> Drafting report…</> : <>Continue to draft <Icon name="arrowRight" size={15} /></>}
        </button>
        {!editor.clarificationComplete && <p>Continue until the assistant has no further questions.</p>}
      </div>
    </aside>
  </div>;
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

  const reject = () => {
    const patient = report.templateData?.patientName || "this patient";
    if (
      window.confirm(
        `Reject and permanently delete the pending report for ${patient}? This cannot be undone.`,
      )
    ) {
      editor.reject();
    }
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
                <button
                  type="button"
                  className="btn btn-danger-ghost btn-block mt-8"
                  onClick={reject}
                  disabled={Boolean(busy)}
                >
                  {busy === "rejecting" ? <><span className="spinner spinner-danger" /> Deleting…</> : <><Icon name="trash" size={15} /> Reject &amp; delete</>}
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
