import { useCallback, useMemo, useState } from "react";
import { api } from "../lib/api";
import {
  TEMPLATES,
  TEXT_SECTION_KEYS,
  IMPRESSION_INPUT_KEYS,
  emptyForm,
  usesReasonForExam,
} from "../lib/constants";

// Editable copy of a generated report. The text sections (including findings)
// start as whatever was submitted and can be changed before approval.
const draftFromReport = (doc) => {
  const d = {};
  TEXT_SECTION_KEYS.forEach((k) => {
    d[k] = doc.templateData?.[k] || "";
  });
  d.impression = doc.generatedImpression || "";
  d.recommendations = doc.generatedRecommendations || "";
  return d;
};

const formFromReport = (doc) => ({
  ...emptyForm(),
  ...Object.fromEntries(
    Object.entries(doc.templateData || {}).map(([k, v]) => [k, v || ""]),
  ),
  templateName: doc.templateName || "",
  radiologistImpression: doc.radiologistImpression || "",
});

/**
 * All state for the "New report" workflow lives here (lifted into App) so a
 * half-finished report survives switching between pages.
 */
export function useReportEditor({ onGenerated, onApproved, notify }) {
  const [form, setForm] = useState(emptyForm);
  const [attempted, setAttempted] = useState(false);
  const [report, setReport] = useState(null);
  const [draft, setDraft] = useState(null);
  const [busy, setBusy] = useState(null); // "generating" | "redrafting" | "approving" | null
  const [error, setError] = useState(null);
  const [approved, setApproved] = useState(false);
  const [reviewed, setReviewed] = useState(false);

  const needsReason = usesReasonForExam(form.templateName);

  const missing = useMemo(() => {
    const m = [];
    if (!form.templateName) m.push("Examination");
    if (!form.regNo.trim()) m.push("Reg No");
    if (!form.patientName.trim()) m.push("Patient name");
    if (!form.patientAge.trim()) m.push("Age");
    if (!form.patientSex) m.push("Sex");
    if (needsReason ? !form.reasonForExam.trim() : !form.clinicalFeature.trim())
      m.push(needsReason ? "Reason for exam" : "Clinical features");
    if (!form.findings.trim()) m.push("Findings");
    return m;
  }, [form, needsReason]);

  const original = useMemo(() => (report ? draftFromReport(report) : null), [report]);

  const editedKeys = useMemo(() => {
    if (!draft || !original) return [];
    return Object.keys(draft).filter((k) => draft[k] !== original[k]);
  }, [draft, original]);

  // True when findings/clinical text changed after the AI drafted the impression.
  const impressionStale = useMemo(() => {
    if (!draft || !report) return false;
    return IMPRESSION_INPUT_KEYS.some(
      (k) => (draft[k] || "") !== (report.templateData?.[k] || ""),
    );
  }, [draft, report]);

  const setField = useCallback((name, value) => {
    setForm((f) => ({ ...f, [name]: value }));
  }, []);

  const selectTemplate = useCallback((name) => {
    setForm((f) => ({
      ...f,
      templateName: name,
      technique: TEMPLATES[name]?.technique || "",
      clinicalFeature: "",
      reasonForExam: "",
      comparison: "",
      findings: "",
      radiologistImpression: "",
    }));
  }, []);

  const loadDoc = (doc, isApproved = false) => {
    setReport(doc);
    setDraft(draftFromReport(doc));
    setApproved(isApproved);
    setReviewed(false);
    setError(null);
  };

  const generate = async () => {
    setAttempted(true);
    if (missing.length) {
      notify(`Please complete: ${missing.join(", ")}`, "warning");
      return;
    }
    setBusy("generating");
    setError(null);
    try {
      const doc = await api.generate(form);
      loadDoc(doc);
      onGenerated?.(doc);
      notify("Draft report ready for review", "success");
    } catch {
      setError(
        "Could not generate the report. Make sure the backend is running on port 5002.",
      );
    } finally {
      setBusy(null);
    }
  };

  // Ask the AI again using a complete snapshot of the report as it reads now.
  const redraft = async () => {
    if (!report || !draft) return;
    setBusy("redrafting");
    setError(null);
    try {
      const payload = {
        clientId: report.clientId || report._id,
        templateName: report.templateName,
        ...report.templateData,
        ...draft,
        radiologistImpression: report.radiologistImpression,
      };
      const doc = await api.generate(payload);
      setReport(doc);
      setDraft((d) => ({
        ...d,
        impression: doc.generatedImpression || "",
        recommendations: doc.generatedRecommendations || "",
      }));
      setReviewed(false);
      onGenerated?.(doc);
      notify("Impression re-drafted from the updated findings", "success");
    } catch {
      setError("Re-draft failed. Check that the backend is running.");
    } finally {
      setBusy(null);
    }
  };

  const updateDraft = useCallback((key, value) => {
    const nextDraft = { ...draft, [key]: value };
    setDraft(nextDraft);
    api.saveDraft(report, nextDraft);
    setReviewed(false); // any edit needs a fresh review confirmation
  }, [draft, report]);

  const revert = useCallback(
    (key) => {
      if (!original) return;
      const nextDraft = { ...draft, [key]: original[key] };
      setDraft(nextDraft);
      api.saveDraft(report, nextDraft);
      setReviewed(false);
    },
    [draft, original, report],
  );

  const approve = async () => {
    if (!report || !draft || !reviewed) return;
    setBusy("approving");
    setError(null);
    try {
      await api.approve({
        originalReportId: report.clientId || report._id,
        templateName: report.templateName,
        ...report.templateData,
        technique: draft.technique,
        clinicalFeature: draft.clinicalFeature,
        reasonForExam: draft.reasonForExam,
        comparison: draft.comparison,
        findings: draft.findings,
        radiologistImpression: report.radiologistImpression,
        finalImpression: draft.impression,
        finalRecommendations: draft.recommendations,
      });
      setApproved(true);
      onApproved?.(report);
      notify("Report approved and saved", "success");
    } catch {
      setError("Approval failed. Please try again.");
      notify("Approval failed", "warning");
    } finally {
      setBusy(null);
    }
  };

  const reset = useCallback(() => {
    setForm(emptyForm());
    setReport(null);
    setDraft(null);
    setApproved(false);
    setReviewed(false);
    setError(null);
    setAttempted(false);
  }, []);

  const openExisting = useCallback((doc, isApproved) => {
    setForm(formFromReport(doc));
    setAttempted(false);
    loadDoc(doc, isApproved);
  }, []);

  // The report data as it currently reads (with edits applied).
  const currentData = useMemo(() => {
    if (!report) return null;
    return { ...report.templateData, ...(draft || {}) };
  }, [report, draft]);

  return {
    form,
    setField,
    selectTemplate,
    missing,
    attempted,
    needsReason,
    report,
    draft,
    original,
    currentData,
    editedKeys,
    impressionStale,
    busy,
    error,
    approved,
    reviewed,
    setReviewed,
    generate,
    redraft,
    updateDraft,
    revert,
    approve,
    reset,
    openExisting,
    hasOpenDraft: Boolean(report && !approved),
  };
}
