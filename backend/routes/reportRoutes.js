const crypto = require("node:crypto");
const express = require("express");
const mongoose = require("mongoose");
const Report = require("../models/Report");
const ApprovedReport = require("../models/ApprovedReport");
const { generateImpression } = require("../services/geminiService");

const router = express.Router();

const databaseConnected = () => mongoose.connection.readyState === 1;
const text = (value) => (typeof value === "string" ? value : "");

const reportFields = (data = {}) => {
  const source = data.templateData || data;
  const now = new Date();
  return {
    clientId: text(data.clientId) || crypto.randomUUID(),
    templateName: text(data.templateName),
    templateData: {
      regNo: text(source.regNo),
      patientName: text(source.patientName),
      patientAge: text(source.patientAge),
      patientSex: text(source.patientSex),
      performedDate: text(source.performedDate),
      reportDate: text(source.reportDate),
      referredBy: text(source.referredBy),
      technique: text(source.technique),
      clinicalFeature: text(source.clinicalFeature),
      reasonForExam: text(source.reasonForExam),
      comparison: text(source.comparison),
      findings: text(source.findings),
    },
    radiologistImpression: text(data.radiologistImpression),
    generatedImpression: text(data.generatedImpression),
    generatedRecommendations: text(data.generatedRecommendations),
    missingFields: text(data.missingFields),
    createdAt: data.createdAt ? new Date(data.createdAt) : now,
    updatedAt: data.updatedAt ? new Date(data.updatedAt) : now,
  };
};

const approvalFields = (data = {}) => {
  const source = data.templateData || data;
  const originalReportId = text(data.originalReportId);
  return {
    clientId: text(data.clientId) || originalReportId || crypto.randomUUID(),
    originalReportId,
    templateName: text(data.templateName),
    templateData: {
      regNo: text(source.regNo),
      patientName: text(source.patientName),
      patientAge: text(source.patientAge),
      patientSex: text(source.patientSex),
      performedDate: text(source.performedDate),
      reportDate: text(source.reportDate),
      referredBy: text(source.referredBy),
      technique: text(source.technique),
      clinicalFeature: text(source.clinicalFeature),
      reasonForExam: text(source.reasonForExam),
      comparison: text(source.comparison),
      findings: text(source.findings),
    },
    radiologistImpression: text(data.radiologistImpression),
    finalImpression: text(data.finalImpression),
    finalRecommendations: text(data.finalRecommendations),
    approvedAt: data.approvedAt ? new Date(data.approvedAt) : new Date(),
    updatedAt: data.updatedAt ? new Date(data.updatedAt) : new Date(),
  };
};

const upsertReport = (data) => {
  const report = reportFields(data);
  const identity = mongoose.isValidObjectId(report.clientId)
    ? { $or: [{ clientId: report.clientId }, { _id: report.clientId }] }
    : { clientId: report.clientId };
  return Report.findOneAndUpdate(
    identity,
    { $set: report },
    { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true },
  );
};

const upsertApproval = (data) => {
  const approval = approvalFields(data);
  return ApprovedReport.findOneAndUpdate(
    {
      $or: [
        { clientId: approval.clientId },
        { originalReportId: approval.originalReportId },
      ],
    },
    { $set: approval },
    { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true },
  );
};

router.get("/health", (_req, res) => {
  res.json({ api: true, database: databaseConnected() });
});

// Generation is independent of MongoDB. The browser stores this response and
// queues it for background sync when dbPersisted is false.
router.post("/generate", async (req, res) => {
  try {
    const data = req.body || {};
    const { impression, recommendations } = await generateImpression(data);
    const unsavedReport = reportFields({
      ...data,
      generatedImpression: impression,
      generatedRecommendations: recommendations,
      missingFields: "",
    });

    if (!databaseConnected()) {
      return res.json({
        report: { ...unsavedReport, _id: unsavedReport.clientId },
        dbPersisted: false,
      });
    }

    const report = await upsertReport(unsavedReport);
    res.json({ report, dbPersisted: true });
  } catch (error) {
    console.error("Error generating report:", error);
    if (error.code === "INVALID_REPORT") {
      return res.status(400).json({ error: error.message });
    }
    if (error.code === "GEMINI_NOT_CONFIGURED") {
      return res.status(503).json({ error: "Gemini is not configured" });
    }
    res.status(502).json({ error: "Failed to generate impression" });
  }
});

router.get("/report/:id", async (req, res) => {
  if (!databaseConnected()) {
    return res.status(503).json({ error: "Database temporarily unavailable" });
  }
  try {
    const query = [{ clientId: req.params.id }];
    if (mongoose.isValidObjectId(req.params.id)) query.push({ _id: req.params.id });
    const report = await Report.findOne({ $or: query });
    if (!report) return res.status(404).json({ error: "Report not found" });
    res.json(report);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch report" });
  }
});

router.get("/generated", async (_req, res) => {
  if (!databaseConnected()) {
    return res.status(503).json({ error: "Database temporarily unavailable" });
  }
  try {
    const reports = await Report.find().sort({ createdAt: -1 });
    res.json(reports);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch reports" });
  }
});

router.get("/approved-ids", async (_req, res) => {
  if (!databaseConnected()) {
    return res.status(503).json({ error: "Database temporarily unavailable" });
  }
  try {
    const approvedReports = await ApprovedReport.find({}, "originalReportId");
    res.json(approvedReports.map((report) => report.originalReportId));
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch approved IDs" });
  }
});

router.post("/approve", async (req, res) => {
  if (!databaseConnected()) {
    return res.status(503).json({ error: "Approval queued until database reconnects" });
  }
  try {
    const approvedReport = await upsertApproval(req.body || {});
    res.json({ approvedReportId: approvedReport._id, dbPersisted: true });
  } catch (error) {
    console.error("Error approving report:", error);
    res.status(500).json({ error: "Failed to approve report" });
  }
});

// Idempotent bulk upserts prevent duplicate records after repeated retries.
router.post("/sync", async (req, res) => {
  if (!databaseConnected()) {
    return res.status(503).json({ error: "Database temporarily unavailable" });
  }

  const reports = Array.isArray(req.body?.reports) ? req.body.reports.slice(0, 500) : [];
  const approvals = Array.isArray(req.body?.approvals) ? req.body.approvals.slice(0, 500) : [];

  try {
    const [savedReports, savedApprovals] = await Promise.all([
      Promise.all(reports.map(upsertReport)),
      Promise.all(approvals.map(upsertApproval)),
    ]);
    res.json({
      reportIds: savedReports.map((report) => report.clientId),
      approvalIds: savedApprovals.map((approval) => approval.clientId),
      database: true,
    });
  } catch (error) {
    console.error("Background sync failed:", error);
    res.status(500).json({ error: "Failed to sync local changes" });
  }
});

module.exports = router;
module.exports._test = { reportFields, approvalFields };
