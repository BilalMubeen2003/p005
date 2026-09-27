const STORAGE_KEY = "radiologyAI.localReports.v1";

const emptyStore = () => ({ reports: {}, approvals: {} });

const readStore = () => {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return {
      reports: value?.reports && typeof value.reports === "object" ? value.reports : {},
      approvals: value?.approvals && typeof value.approvals === "object" ? value.approvals : {},
    };
  } catch {
    return emptyStore();
  }
};

const writeStore = (store) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
};

export const createClientId = () =>
  globalThis.crypto?.randomUUID?.() ||
  `local-${Date.now()}-${Math.random().toString(16).slice(2)}`;

export const reportId = (report) => String(report?.clientId || report?._id || "");

export const saveLocalReport = (
  report,
  { pendingSync = true, status } = {},
) => {
  const store = readStore();
  const id = reportId(report) || createClientId();
  const previous = store.reports[id] || {};
  const saved = {
    ...previous,
    ...report,
    clientId: id,
    _id: report?._id || previous._id || id,
    createdAt: report?.createdAt || previous.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    _status: status || previous._status || "pending",
    _syncPending: pendingSync,
  };
  store.reports[id] = saved;
  writeStore(store);
  return saved;
};

export const getLocalReport = (id) => {
  const store = readStore();
  const direct = store.reports[String(id)];
  if (direct) return direct;
  return Object.values(store.reports).find(
    (report) => String(report._id) === String(id),
  );
};

export const getLocalReports = () =>
  Object.values(readStore().reports).sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
  );

export const saveLocalApproval = (approval, { pendingSync = true } = {}) => {
  const store = readStore();
  const id = String(
    approval.clientId || approval.originalReportId || createClientId(),
  );
  store.approvals[id] = {
    ...(store.approvals[id] || {}),
    ...approval,
    clientId: id,
    approvedAt: approval.approvedAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    _syncPending: pendingSync,
  };
  if (store.reports[id]) {
    store.reports[id] = {
      ...store.reports[id],
      _status: "approved",
      _syncPending: store.reports[id]._syncPending,
    };
  }
  writeStore(store);
  return store.approvals[id];
};

export const pendingLocalChanges = () => {
  const store = readStore();
  return {
    reports: Object.values(store.reports).filter((report) => report._syncPending),
    approvals: Object.values(store.approvals).filter(
      (approval) => approval._syncPending,
    ),
  };
};

export const markLocalChangesSynced = (reportIds = [], approvalIds = []) => {
  const store = readStore();
  reportIds.forEach((id) => {
    if (store.reports[id]) store.reports[id]._syncPending = false;
  });
  approvalIds.forEach((id) => {
    if (store.approvals[id]) store.approvals[id]._syncPending = false;
  });
  writeStore(store);
};

export const mergeServerReports = (reports, approvedIds) => {
  const store = readStore();
  const approved = new Set(approvedIds.map(String));

  reports.forEach((serverReport) => {
    const id = reportId(serverReport);
    if (!id) return;
    const local = store.reports[id];
    if (local?._syncPending) return;
    store.reports[id] = {
      ...local,
      ...serverReport,
      clientId: id,
      _status:
        approved.has(id) || approved.has(String(serverReport._id))
          ? "approved"
          : local?._status || "pending",
      _syncPending: false,
    };
  });

  writeStore(store);
  return getLocalReports();
};
