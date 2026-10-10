import { useEffect, useState } from "react";
import Icon from "./Icon";
import StatusBadge from "./StatusBadge";
import { api } from "../lib/api";
import { formatDate, formatDateTime } from "../lib/report";

// Slide-over panel showing a saved report from history.
export default function ReportDrawer({ item, onClose, onOpenInEditor }) {
  const [doc, setDoc] = useState(null);
  const [state, setState] = useState("idle");

  useEffect(() => {
    if (!item) return undefined;
    let cancelled = false;
    setDoc(null);
    setState("loading");
    api
      .getReport(item.id)
      .then((d) => {
        if (!cancelled) {
          setDoc(d);
          setState("ready");
        }
      })
      .catch(() => !cancelled && setState("error"));
    return () => {
      cancelled = true;
    };
  }, [item]);

  useEffect(() => {
    if (!item) return undefined;
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [item, onClose]);

  const open = Boolean(item);
  const t = doc?.templateData || {};

  const block = (label, value) =>
    value ? (
      <div className="drawer-block">
        <div className="drawer-label">{label}</div>
        <div className="drawer-text">{value}</div>
      </div>
    ) : null;

  return (
    <>
      <div className={`drawer-backdrop${open ? " is-open" : ""}`} onClick={onClose} />
      <aside className={`drawer${open ? " is-open" : ""}`} aria-hidden={!open}>
        {item && (
          <>
            <div className="drawer-head">
              <div className="min-w-0">
                <div className="eyebrow">{item.template}</div>
                <h2 className="drawer-title">{item.name || "Unknown patient"}</h2>
                <div className="row gap-8 wrap mt-6">
                  <StatusBadge status={item.status} />
                  <span className="muted small">Created {formatDateTime(item.createdAt)}</span>
                </div>
              </div>
              <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">
                <Icon name="x" size={18} />
              </button>
            </div>

            <div className="drawer-body">
              {state === "loading" && (
                <div className="skeleton-stack">
                  <div className="skeleton" style={{ width: "60%" }} />
                  <div className="skeleton" />
                  <div className="skeleton" style={{ width: "85%" }} />
                  <div className="skeleton" style={{ height: 80 }} />
                </div>
              )}
              {state === "error" && (
                <div className="notice notice-danger">
                  <Icon name="alert" size={16} /> Could not load this report.
                </div>
              )}
              {state === "ready" && doc && (
                <>
                  <dl className="kv-grid">
                    <div><dt>Reg. No</dt><dd className="mono">{t.regNo || "—"}</dd></div>
                    <div><dt>Age / Sex</dt><dd>{[t.patientAge, t.patientSex].filter(Boolean).join(" · ") || "—"}</dd></div>
                    <div><dt>Performed</dt><dd>{formatDate(t.performedDate) || "—"}</dd></div>
                    <div><dt>Report date</dt><dd>{formatDate(t.reportDate) || "—"}</dd></div>
                    <div className="span-2"><dt>Referred by</dt><dd>{t.referredBy || "—"}</dd></div>
                  </dl>

                  {block("Technique", t.technique)}
                  {block("Clinical features", t.clinicalFeature)}
                  {block("Reason for exam", t.reasonForExam)}
                  {block("Comparison", t.comparison)}
                  {block("Findings", t.findings)}

                  <div className="drawer-ai">
                    <div className="drawer-label">
                      <Icon name="sparkle" size={13} /> AI draft impression
                    </div>
                    <div className="drawer-text">{doc.generatedImpression || "—"}</div>
                    {doc.generatedRecommendations && (
                      <>
                        <div className="drawer-label mt-12">Recommendations</div>
                        <div className="drawer-text">{doc.generatedRecommendations}</div>
                      </>
                    )}
                  </div>

                  {item.status === "approved" && (
                    <p className="muted small mt-12">
                      This shows the original AI draft. The approved wording (with any edits) is stored in the approved reports collection.
                    </p>
                  )}
                </>
              )}
            </div>

            <div className="drawer-foot">
              <button type="button" className="btn btn-ghost" onClick={onClose}>
                Close
              </button>
              {item.status !== "approved" && (
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={!doc}
                  onClick={() => onOpenInEditor(doc, item.status)}
                >
                  <Icon name="pencil" size={14} /> Review &amp; approve
                </button>
              )}
            </div>
          </>
        )}
      </aside>
    </>
  );
}
