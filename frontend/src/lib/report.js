// Helpers for turning report data into history rows, text, and printable HTML.

export const toHistoryItem = (doc, status) => ({
  id: doc.clientId || doc._id,
  name: doc.templateData?.patientName || "",
  regNo: doc.templateData?.regNo || "",
  age: doc.templateData?.patientAge || "",
  sex: doc.templateData?.patientSex || "",
  template: doc.templateName || "",
  createdAt: doc.createdAt ? new Date(doc.createdAt) : new Date(),
  status,
});

export const formatDate = (value, opts) => {
  if (!value) return "";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...opts,
  });
};

export const formatDateTime = (value) => {
  if (!value) return "";
  const d = value instanceof Date ? value : new Date(value);
  return d.toLocaleString(undefined, {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const initials = (name = "") =>
  name
    .replace(/^dr\.?\s+/i, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join("") || "?";

// The AI returns missing fields as "-> item" lines.
export const parseMissingFields = (text = "") =>
  text
    .split(/\n+/)
    .map((l) => l.replace(/^\s*(->|-|•|\*|\d+[.)])\s*/, "").trim())
    .filter((l) => l && !/^none\.?$/i.test(l));

export const escapeHtml = (value = "") =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const nl2br = (value) => escapeHtml(value).replace(/\n/g, "<br/>");

export const buildPlainText = ({ templateName, data, impression, recommendations }) => {
  const lines = [
    templateName || "",
    `Reg No: ${data.regNo || "—"}`,
    `Patient: ${data.patientName || "—"} (${data.patientAge || "—"}, ${data.patientSex || "—"})`,
    `Referred by: ${data.referredBy || "—"}`,
    "",
    "TECHNIQUE:",
    data.technique || "—",
  ];
  if (data.clinicalFeature) lines.push("", "CLINICAL FEATURE:", data.clinicalFeature);
  if (data.reasonForExam) lines.push("", "REASON FOR EXAM:", data.reasonForExam);
  if (data.comparison) lines.push("", "COMPARISON:", data.comparison);
  lines.push("", "FINDINGS:", data.findings || "—", "", "IMPRESSION:", impression || "—");
  if (recommendations) lines.push("", "RECOMMENDATIONS:", recommendations);
  return lines.join("\n");
};

export const printReport = ({ templateName, data, impression, recommendations, settings }) => {
  const e = escapeHtml;
  const letterhead =
    settings.hospitalName || settings.department
      ? `<div class="letterhead">
           ${settings.hospitalName ? `<div class="hospital">${e(settings.hospitalName)}</div>` : ""}
           ${settings.department ? `<div class="dept">${e(settings.department)}</div>` : ""}
         </div>`
      : "";

  const html = `
    <html>
    <head>
      <title>Radiology Report — ${e(data.patientName || "")}</title>
      <style>
        body { font-family: 'Times New Roman', serif; font-size: 13px; margin: 40px; color: #000; line-height: 1.6; }
        .letterhead { text-align: center; border-bottom: 1px solid #000; padding-bottom: 8px; margin-bottom: 14px; }
        .hospital { font-size: 17px; font-weight: bold; letter-spacing: 0.5px; }
        .dept { font-size: 12px; }
        .header-table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
        .header-table td { padding: 3px 0; font-size: 13px; }
        .title { text-align: center; font-size: 15px; font-weight: bold; text-decoration: underline; margin: 16px 0 12px; letter-spacing: 1px; }
        .section-title { font-weight: bold; margin-top: 14px; margin-bottom: 4px; text-decoration: underline; }
        .section-inline { font-weight: bold; }
        .content { text-align: justify; }
        .footer { margin-top: 40px; }
        .doctor-name { font-weight: bold; font-size: 14px; }
      </style>
    </head>
    <body>
      ${letterhead}
      <table class="header-table">
        <tr><td><b>Reg. No:</b> ${e(data.regNo || "—")}</td><td><b>Patient Age:</b> ${e(data.patientAge || "—")}</td></tr>
        <tr><td><b>Patient Name:</b> ${e(data.patientName || "—")}</td><td><b>Sex:</b> ${e(data.patientSex || "—")}</td></tr>
        <tr><td><b>Performed Date:</b> ${e(data.performedDate || "—")}</td><td><b>Report Date:</b> ${e(data.reportDate || "—")}</td></tr>
        <tr><td><b>Patient Ref. By:</b> ${e(data.referredBy || "—")}</td><td></td></tr>
      </table>
      <div class="title">${e((templateName || "").toUpperCase())}</div>
      <div class="section-title">TECHNIQUE:</div>
      <div class="content">${nl2br(data.technique || "—")}</div>
      ${data.clinicalFeature ? `<div style="margin-top:12px;"><span class="section-inline">CLINICAL FEATURE:</span> ${nl2br(data.clinicalFeature)}</div>` : ""}
      ${data.reasonForExam ? `<div style="margin-top:12px;"><span class="section-inline">REASON FOR EXAM:</span> ${nl2br(data.reasonForExam)}</div>` : ""}
      ${data.comparison ? `<div style="margin-top:12px;"><span class="section-inline">COMPARISON:</span> ${nl2br(data.comparison)}</div>` : ""}
      <div class="section-title">FINDINGS:</div>
      <div class="content">${nl2br(data.findings || "—")}</div>
      <div class="section-title">IMPRESSION:</div>
      <div class="content">${nl2br(impression || "—")}</div>
      ${recommendations ? `<div class="section-title">RECOMMENDATIONS:</div><div class="content">${nl2br(recommendations)}</div>` : ""}
      <div class="footer">
        <div class="doctor-name">${e((settings.physician || "").toUpperCase())}</div>
        <div>${e(settings.credentials || "")}</div>
        <div style="margin-top:6px; font-size:12px; color:#555;">Ref. By: ${e(data.referredBy || "—")}</div>
      </div>
    </body>
    </html>
  `;
  const w = window.open("", "_blank");
  if (!w) return false;
  w.document.write(html);
  w.document.close();
  w.focus();
  w.print();
  return true;
};
