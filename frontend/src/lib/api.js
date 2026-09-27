import axios from "axios";
import { API_BASE } from "./constants";
import {
  createClientId,
  getLocalReport,
  getLocalReports,
  markLocalChangesSynced,
  mergeServerReports,
  pendingLocalChanges,
  reportId,
  saveLocalApproval,
  saveLocalReport,
} from "./localReports";

const http = axios.create({ baseURL: API_BASE, timeout: 90000 });

const refreshFromDatabase = async () => {
  const [reportsResponse, approvedResponse] = await Promise.all([
    http.get("/api/generated"),
    http.get("/api/approved-ids"),
  ]);
  return mergeServerReports(reportsResponse.data, approvedResponse.data);
};

export const api = {
  localReports: getLocalReports,

  async generate(payload) {
    const clientId = payload.clientId || createClientId();
    const { data } = await http.post("/api/generate", { ...payload, clientId });
    return saveLocalReport(data.report, {
      pendingSync: !data.dbPersisted,
      status: "pending",
    });
  },

  saveDraft(report, draft) {
    if (!report || !draft) return null;
    return saveLocalReport(
      {
        ...report,
        templateData: { ...report.templateData, ...draft },
        generatedImpression: draft.impression || "",
        generatedRecommendations: draft.recommendations || "",
      },
      { pendingSync: true },
    );
  },

  async getReport(id) {
    const local = getLocalReport(id);
    if (local) return local;
    const { data } = await http.get(`/api/report/${id}`);
    return saveLocalReport(data, { pendingSync: false });
  },

  async approve(payload) {
    const originalReportId = String(
      payload.originalReportId || payload.clientId || "",
    );
    const approval = saveLocalApproval(
      {
        ...payload,
        clientId: originalReportId,
        originalReportId,
      },
      { pendingSync: true },
    );

    try {
      const { data } = await http.post("/api/approve", approval);
      markLocalChangesSynced([], [approval.clientId]);
      return { ...data, queued: false };
    } catch {
      return { approvedReportId: approval.clientId, queued: true };
    }
  },

  async synchronize() {
    const pending = pendingLocalChanges();
    if (pending.reports.length || pending.approvals.length) {
      const { data } = await http.post("/api/sync", pending);
      markLocalChangesSynced(data.reportIds, data.approvalIds);
    } else {
      const { data } = await http.get("/api/health");
      if (!data.database) throw new Error("Database unavailable");
    }

    const reports = await refreshFromDatabase();
    return { reports, database: true };
  },

  saveReportStatus(report, status) {
    return saveLocalReport(report, {
      pendingSync: report._syncPending,
      status,
    });
  },

  idFor(report) {
    return reportId(report);
  },
};
