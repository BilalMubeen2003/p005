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
export function useReportEditor({ onGenerated, onApproved, onRejected, notify }) {
  const [form, setForm] = useState(emptyForm);
  const [attempted, setAttempted] = useState(false);
  const [report, setReport] = useState(null);
  const [draft, setDraft] = useState(null);
  const [busy, setBusy] = useState(null); // "generating" | "redrafting" | "approving" | null
  const [error, setError] = useState(null);
  const [approved, setApproved] = useState(false);
  const [reviewed, setReviewed] = useState(false);
  const [stage, setStage] = useState("details");
  const [messages, setMessages] = useState([]);
  const [clarificationComplete, setClarificationComplete] = useState(false);
  const [findingsSummary, setFindingsSummary] = useState("");

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

  const detailsMissing = useMemo(() => missing.filter((item) => item !== "Findings"), [missing]);

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
    setMessages([]);
    setClarificationComplete(false);
    setFindingsSummary("");
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
    } catch (requestError) {
      setError(
        requestError.response?.data?.error ||
          "Could not generate the report. Please check your connection and try again.",
      );
    } finally {
      setBusy(null);
    }
  };

  const startClarification = () => {
    setAttempted(true);
    if (detailsMissing.length) {
      notify(`Please complete: ${detailsMissing.join(", ")}`, "warning");
      return;
    }
    setStage("chat");
    setError(null);
    if (!messages.length) {
      setMessages([{ role: "assistant", content: `Describe the ${form.templateName} findings in your own words. Include measurements, location and laterality where relevant.` }]);
    }
  };

  const sendFinding = async (content) => {
    const value = String(content || "").trim();
    if (!value || busy) return;
    const nextMessages = [...messages, { role: "user", content: value }];
    setMessages(nextMessages);
    setBusy("clarifying");
    setError(null);
    try {
      const result = await api.clarify({ ...form, messages: nextMessages });
      setFindingsSummary(result.findingsSummary || value);
      setClarificationComplete(Boolean(result.complete));
      setMessages((current) => [
        ...current,
        { role: "assistant", content: result.complete ? "I have enough detail to draft the report. Review the captured findings, then continue." : result.question },
      ]);
    } catch (requestError) {
      setError(requestError.response?.data?.error || "The clinical assistant could not respond. Please try again.");
    } finally {
      setBusy(null);
    }
  };

  const generateFromChat = async () => {
    if (!clarificationComplete || !findingsSummary) return;
    setForm((current) => ({ ...current, findings: findingsSummary }));
    setBusy("generating");
    setError(null);
    try {
      const doc = await api.generate({ ...form, findings: findingsSummary });
      loadDoc(doc);
      setStage("review");
      onGenerated?.(doc);
      notify("Impression and recommendations are ready", "success");
    } catch (requestError) {
      setError(requestError.response?.data?.error || "Could not generate the report. Please try again.");
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
    } catch (requestError) {
      setError(
        requestError.response?.data?.error ||
          "Could not re-draft the report. Please check your connection and try again.",
      );
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

  const reject = async () => {
    if (!report || approved) return;
    setBusy("rejecting");
    setError(null);
    try {
      const rejected = report;
      await api.deleteReport(rejected);
      reset();
      onRejected?.(rejected);
      notify("Report rejected and deleted", "success");
    } catch {
      setError("Could not delete this report. Please try again.");
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
    setStage("details");
    setMessages([]);
    setClarificationComplete(false);
    setFindingsSummary("");
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
    detailsMissing,
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
    stage,
    messages,
    clarificationComplete,
    findingsSummary,
    startClarification,
    sendFinding,
    generateFromChat,
    backToDetails: () => setStage("details"),
    redraft,
    updateDraft,
    revert,
    approve,
    reject,
    reset,
    openExisting,
    hasOpenDraft: Boolean(report && !approved),
  };
}
