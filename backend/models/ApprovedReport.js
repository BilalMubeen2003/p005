const mongoose = require("mongoose");

const ApprovedReportSchema = new mongoose.Schema({
  clientId: { type: String, unique: true, sparse: true, index: true },
  originalReportId: String,
  templateName: String,
  templateData: {
    regNo: String,
    patientName: String,
    patientAge: String,
    patientSex: String,
    performedDate: String,
    reportDate: String,
    referredBy: String,
    technique: String,
    clinicalFeature: String,
    reasonForExam: String,
    comparison: String,
    findings: String,
  },
  radiologistImpression: String,
  finalImpression: String,
  finalRecommendations: String,
  approvedAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("ApprovedReport", ApprovedReportSchema);
