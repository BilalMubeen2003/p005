const assert = require("node:assert/strict");
const test = require("node:test");
const {
  buildReportSchema,
  generateImpression,
} = require("../services/geminiService");

const report = {
  templateName: "CT Brain Plain",
  regNo: " 04120 ",
  patientName: " Example Patient ",
  patientAge: "45 Years",
  patientSex: "Female",
  performedDate: "2026-09-27",
  reportDate: "2026-09-27",
  referredBy: "Dr. Example",
  technique: "Non-contrast CT brain.",
  clinicalFeature: "Headache",
  comparison: "None",
  findings: "No acute intracranial hemorrhage or mass effect.",
  impression: "Previous draft",
  recommendations: "User-authored recommendation",
};

test("buildReportSchema includes and normalizes the complete report state", () => {
  const schema = buildReportSchema(report);

  assert.equal(schema.schemaVersion, "1.0");
  assert.equal(schema.examination.name, "CT Brain Plain");
  assert.equal(schema.patient.registrationNumber, "04120");
  assert.equal(schema.referral.clinicalFeature, "Headache");
  assert.equal(schema.report.findings, report.findings);
  assert.equal(schema.report.currentDraftImpression, "Previous draft");
  assert.equal(
    schema.report.currentRecommendations,
    "User-authored recommendation",
  );
});

test("generateImpression sends the report schema and reads structured output", async () => {
  let request;
  const fetchImpl = async (url, options) => {
    request = { url, options, body: JSON.parse(options.body) };
    return {
      ok: true,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    impression: "No acute intracranial abnormality.",
                    recommendations: "No additional imaging is required.",
                  }),
                },
              ],
            },
          },
        ],
      }),
    };
  };

  const result = await generateImpression(report, {
    apiKey: "test-key",
    fetchImpl,
  });

  assert.match(request.url, /gemini-2\.5-flash:generateContent$/);
  assert.equal(request.options.headers["x-goog-api-key"], "test-key");
  assert.equal(
    request.body.generationConfig.responseMimeType,
    "application/json",
  );
  assert.equal(request.body.generationConfig.responseSchema.type, "OBJECT");
  assert.deepEqual(request.body.generationConfig.responseSchema.required, [
    "impression",
    "recommendations",
  ]);
  const sent = JSON.parse(request.body.contents[0].parts[0].text);
  assert.equal(sent.reportSchema.report.findings, report.findings);
  assert.equal(result.impression, "No acute intracranial abnormality.");
  assert.equal(result.recommendations, "No additional imaging is required.");
});

test("generateImpression accepts an empty recommendation when none is warranted", async () => {
  const result = await generateImpression(report, {
    apiKey: "test-key",
    fetchImpl: async () => ({
      ok: true,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    impression: "No acute intracranial abnormality.",
                    recommendations: "",
                  }),
                },
              ],
            },
          },
        ],
      }),
    }),
  });

  assert.equal(result.recommendations, "");
});

test("generateImpression rejects a report without findings before calling Gemini", async () => {
  await assert.rejects(
    generateImpression(
      { ...report, findings: "  " },
      {
        apiKey: "test-key",
        fetchImpl: async () => {
          throw new Error("should not be called");
        },
      },
    ),
    { code: "INVALID_REPORT" },
  );
});
