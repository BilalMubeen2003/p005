// Shared constants for the reporting workflow.

export const API_BASE =
  import.meta.env.VITE_API_BASE || "http://localhost:5002";

// region drives the icon shown on template tiles.
// normalFindings is a starting point the radiologist can insert and then edit.
export const TEMPLATES = {
  "CT Brain Plain": {
    type: "CT Brain",
    region: "brain",
    technique:
      "5 mm cuts for posterior fossa and 10 mm cuts are taken for rest of brain. No IV contrast is given.",
    fields: ["clinicalFeature", "findings"],
    normalFindings:
      "Brain parenchyma shows normal attenuation with preserved grey-white matter differentiation. No intra-axial or extra-axial collection is seen. Ventricles and sulci are normal for age. No midline shift. Posterior fossa structures are unremarkable. Visualized bony calvarium is intact.",
  },
  "CT Brain With Contrast": {
    type: "CT Brain",
    region: "brain",
    technique:
      "5 mm cuts for posterior fossa and 10 mm cuts are taken for rest of brain. IV contrast is given.",
    fields: ["clinicalFeature", "findings"],
    normalFindings:
      "Brain parenchyma shows normal attenuation with preserved grey-white matter differentiation. No abnormal parenchymal or meningeal enhancement is seen. No intra-axial or extra-axial collection. Ventricles and sulci are normal for age. No midline shift. Posterior fossa structures are unremarkable.",
  },
  "CT Abdomen Female": {
    type: "CT Abdomen",
    region: "abdomen",
    technique:
      "5 mm contiguous slices are taken from dome of diaphragm to pubic symphysis. No IV contrast is given.",
    fields: ["reasonForExam", "comparison", "findings"],
    normalFindings:
      "Liver is normal in size and attenuation with no focal lesion. Intrahepatic biliary radicles are not dilated. Gallbladder, pancreas and spleen are unremarkable. Both kidneys are normal in size and position with no calculus or hydronephrosis. Urinary bladder is unremarkable. Uterus and adnexa appear unremarkable. No free fluid or lymphadenopathy. Visualized bowel loops are unremarkable.",
  },
  "CT Abdomen Male": {
    type: "CT Abdomen",
    region: "abdomen",
    technique:
      "5 mm contiguous slices are taken from dome of diaphragm to pubic symphysis. No IV contrast is given.",
    fields: ["reasonForExam", "comparison", "findings"],
    normalFindings:
      "Liver is normal in size and attenuation with no focal lesion. Intrahepatic biliary radicles are not dilated. Gallbladder, pancreas and spleen are unremarkable. Both kidneys are normal in size and position with no calculus or hydronephrosis. Urinary bladder is unremarkable. Prostate is normal in size. No free fluid or lymphadenopathy. Visualized bowel loops are unremarkable.",
  },
  "Chest X-Ray": {
    type: "Chest",
    region: "chest",
    technique: "PA view chest X-Ray taken.",
    fields: ["clinicalFeature", "findings"],
    normalFindings:
      "Trachea is central. Both lung fields are clear. Cardiothoracic ratio is within normal limits. Both costophrenic angles are clear. Domes of diaphragm are normal in position and contour. Visualized bony thorax is unremarkable.",
  },
  "Chest CT Scan": {
    type: "Chest CT",
    region: "chest",
    technique:
      "5 mm contiguous slices taken from lung apices to bases. No IV contrast is given.",
    fields: ["clinicalFeature", "findings"],
    normalFindings:
      "Both lung fields are clear with no focal consolidation, nodule or mass. No pleural effusion or pneumothorax. Mediastinal structures are central with no mediastinal or hilar lymphadenopathy. Heart size is normal. Tracheobronchial tree is patent. Visualized bones are unremarkable.",
  },
};

export const usesReasonForExam = (templateName) =>
  Boolean(TEMPLATES[templateName]?.fields.includes("reasonForExam"));

const todayISO = () => {
  const d = new Date();
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 10);
};

export const emptyForm = () => ({
  templateName: "",
  regNo: "",
  patientName: "",
  patientAge: "",
  patientSex: "",
  performedDate: todayISO(),
  reportDate: todayISO(),
  referredBy: "",
  technique: "",
  clinicalFeature: "",
  reasonForExam: "",
  comparison: "",
  findings: "",
  radiologistImpression: "",
});

// Text sections of a report that the radiologist can edit after generation.
export const TEXT_SECTION_KEYS = [
  "technique",
  "clinicalFeature",
  "reasonForExam",
  "comparison",
  "findings",
];

// Sections the AI impression is based on; editing them makes the impression stale.
export const IMPRESSION_INPUT_KEYS = [
  "technique",
  "clinicalFeature",
  "reasonForExam",
  "comparison",
  "findings",
];

export const STEPS = [
  { id: "template", label: "Examination" },
  { id: "patient", label: "Patient" },
  { id: "clinical", label: "Clinical" },
  { id: "review", label: "Review" },
];

export const DEFAULT_SETTINGS = {
  hospitalName: "",
  department: "Department of Radiology",
  physician: "Dr. John Doe",
  credentials: "FCPS, Interventional Radiologist",
};
