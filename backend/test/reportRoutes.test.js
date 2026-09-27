const assert = require("node:assert/strict");
const test = require("node:test");
const { _test } = require("../routes/reportRoutes");

test("reportFields accepts a locally stored nested report for idempotent sync", () => {
  const result = _test.reportFields({
    clientId: "local-report-1",
    templateName: "Chest X-Ray",
    templateData: {
      patientName: "Patient",
      findings: "No focal air-space opacity.",
    },
    generatedImpression: "No acute cardiopulmonary abnormality.",
    createdAt: "2026-09-27T10:00:00.000Z",
  });

  assert.equal(result.clientId, "local-report-1");
  assert.equal(result.templateData.patientName, "Patient");
  assert.equal(result.templateData.findings, "No focal air-space opacity.");
  assert.equal(
    result.generatedImpression,
    "No acute cardiopulmonary abnormality.",
  );
});

test("approvalFields uses the report client ID as its stable upsert key", () => {
  const result = _test.approvalFields({
    originalReportId: "local-report-1",
    templateName: "Chest X-Ray",
    findings: "Clear lungs.",
    finalImpression: "No acute cardiopulmonary abnormality.",
  });

  assert.equal(result.clientId, "local-report-1");
  assert.equal(result.originalReportId, "local-report-1");
  assert.equal(result.templateData.findings, "Clear lungs.");
});
