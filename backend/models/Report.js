const mongoose = require("mongoose");

const ReportSchema = new mongoose.Schema({
  clientId: { type: String, unique: true, sparse: true, index: true },
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
  generatedImpression: String,
  generatedRecommendations: String,
  missingFields: String,
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Report", ReportSchema);
