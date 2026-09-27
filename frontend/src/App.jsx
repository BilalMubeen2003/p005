import { useCallback, useEffect, useMemo, useState } from "react";
import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";
import Toast from "./components/Toast";
import ReportDrawer from "./components/ReportDrawer";
import Dashboard from "./pages/Dashboard";
import NewReport from "./pages/NewReport";
import History from "./pages/History";
import Settings from "./pages/Settings";
import { api } from "./lib/api";
import { toHistoryItem } from "./lib/report";
import { useSettings } from "./hooks/useSettings";
import { useReportEditor } from "./hooks/useReportEditor";

export default function App() {
  const [page, setPage] = useState("dashboard");
  const [menuOpen, setMenuOpen] = useState(false);
  const [history, setHistory] = useState([]);
  const [historyState, setHistoryState] = useState("loading");
  const [backendOk, setBackendOk] = useState(null);
  const [drawerItem, setDrawerItem] = useState(null);
  const [toast, setToast] = useState(null);
  const [settings, saveSettings] = useSettings();

  const notify = useCallback((message, tone = "default") => {
    setToast({ message, tone, id: Date.now() });
  }, []);
  const closeToast = useCallback(() => setToast(null), []);

  const applyLocalHistory = useCallback((reports = api.localReports()) => {
    setHistory(
      reports.map((report) =>
        toHistoryItem(report, report._status === "approved" ? "approved" : "pending"),
      ),
    );
    setHistoryState("ready");
  }, []);

  const loadHistory = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setHistoryState("loading");
    applyLocalHistory();
    try {
      const { reports } = await api.synchronize();
      applyLocalHistory(reports);
      setBackendOk(true);
    } catch {
      if (!silent) console.info("Using local reports until database sync is available");
      applyLocalHistory();
      setBackendOk(false);
    }
  }, [applyLocalHistory]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  useEffect(() => {
    const sync = () => loadHistory({ silent: true });
    const interval = window.setInterval(sync, 15000);
    window.addEventListener("online", sync);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("online", sync);
    };
  }, [loadHistory]);

  const upsertHistory = useCallback((item) => {
    setHistory((prev) => [item, ...prev.filter((r) => r.id !== item.id)]);
  }, []);

  const editor = useReportEditor({
    notify,
    onGenerated: (doc) => {
      upsertHistory(toHistoryItem(doc, "pending"));
      loadHistory({ silent: true });
    },
    onApproved: (doc) => {
      upsertHistory(toHistoryItem(doc, "approved"));
      loadHistory({ silent: true });
    },
  });

  const navigate = useCallback((id) => {
    setPage(id);
    setMenuOpen(false);
    window.scrollTo({ top: 0 });
  }, []);

  const startWithTemplate = (name) => {
    if (editor.hasOpenDraft && !window.confirm("You have a draft that hasn't been approved. Discard it and start a new report?")) {
      return;
    }
    editor.reset();
    editor.selectTemplate(name);
    navigate("new");
  };

  const openInEditor = (doc, status) => {
    if (
      editor.hasOpenDraft &&
      api.idFor(editor.report) !== api.idFor(doc) &&
      !window.confirm("You have another draft open. Replace it with this report?")
    ) {
      return;
    }
    editor.openExisting(doc, status === "approved");
    setDrawerItem(null);
    navigate("new");
  };

  const pendingCount = useMemo(() => history.filter((r) => r.status !== "approved").length, [history]);

  return (
    <div className="app">
      <Sidebar
        page={page}
        onNavigate={navigate}
        pendingCount={pendingCount}
        hasOpenDraft={editor.hasOpenDraft}
        settings={settings}
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
      />

      <div className="main">
        <Topbar page={page} settings={settings} onMenu={() => setMenuOpen(true)} backendOk={backendOk} />

        <main className="content">
          {page === "dashboard" && (
            <Dashboard
              history={history}
              historyState={historyState}
              settings={settings}
              editor={editor}
              onStartTemplate={startWithTemplate}
              onNavigate={navigate}
              onOpenItem={setDrawerItem}
            />
          )}
          {page === "new" && <NewReport editor={editor} settings={settings} notify={notify} />}
          {page === "history" && (
            <History
              history={history}
              historyState={historyState}
              onRefresh={loadHistory}
              onOpenItem={setDrawerItem}
            />
          )}
          {page === "settings" && (
            <Settings
              settings={settings}
              onSave={saveSettings}
              notify={notify}
              backendOk={backendOk}
              onCheckBackend={loadHistory}
            />
          )}

          <footer className="app-foot">
            RadiologyAI · AI-assisted drafts must be reviewed and approved by a qualified radiologist.
          </footer>
        </main>
      </div>

      <ReportDrawer item={drawerItem} onClose={() => setDrawerItem(null)} onOpenInEditor={openInEditor} />
      <Toast toast={toast} onClose={closeToast} />
    </div>
  );
}
