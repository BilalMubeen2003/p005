import { useMemo, useState } from "react";
import Icon from "../components/Icon";
import StatusBadge from "../components/StatusBadge";
import { TEMPLATES } from "../lib/constants";
import { formatDate, initials } from "../lib/report";

const FILTERS = [
  { id: "all", label: "All" },
  { id: "pending", label: "Pending" },
  { id: "approved", label: "Approved" },
];

export default function History({ history, historyState, onRefresh, onOpenItem }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [exam, setExam] = useState("all");
  const [sort, setSort] = useState("newest");

  const counts = useMemo(
    () => ({
      all: history.length,
      approved: history.filter((r) => r.status === "approved").length,
      pending: history.filter((r) => r.status !== "approved").length,
    }),
    [history],
  );

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = history.filter((r) => {
      if (status !== "all" && r.status !== status) return false;
      if (exam !== "all" && r.template !== exam) return false;
      if (!q) return true;
      return [r.name, r.regNo, r.template].some((v) => (v || "").toLowerCase().includes(q));
    });
    const sorted = [...list];
    if (sort === "newest") sorted.sort((a, b) => b.createdAt - a.createdAt);
    if (sort === "oldest") sorted.sort((a, b) => a.createdAt - b.createdAt);
    if (sort === "name") sorted.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    return sorted;
  }, [history, query, status, exam, sort]);

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title">Patient reports</h1>
          <p className="page-sub">Search every report, check its status, and open pending ones for review.</p>
        </div>
        <button type="button" className="btn btn-ghost" onClick={onRefresh} disabled={historyState === "loading"}>
          <Icon name="refresh" size={14} /> Refresh
        </button>
      </div>

      <section className="card card-flush">
        <div className="toolbar">
          <div className="search">
            <Icon name="search" size={16} />
            <input
              className="input"
              placeholder="Search patient name, Reg No or exam…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {query && (
              <button type="button" className="search-clear" onClick={() => setQuery("")} aria-label="Clear search">
                <Icon name="x" size={14} />
              </button>
            )}
          </div>
          <div className="segmented segmented-sm" role="tablist">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                role="tab"
                aria-selected={status === f.id}
                className={status === f.id ? "is-active" : ""}
                onClick={() => setStatus(f.id)}
              >
                {f.label} <span className="seg-count">{counts[f.id]}</span>
              </button>
            ))}
          </div>
          <select className="input select" value={exam} onChange={(e) => setExam(e.target.value)} aria-label="Examination">
            <option value="all">All examinations</option>
            {Object.keys(TEMPLATES).map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <select className="input select" value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort">
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="name">Patient A–Z</option>
          </select>
        </div>

        <div className="table" role="table">
          <div className="tr th" role="row">
            <span role="columnheader">Patient</span>
            <span role="columnheader">Reg No</span>
            <span role="columnheader">Examination</span>
            <span role="columnheader">Date</span>
            <span role="columnheader">Status</span>
            <span />
          </div>

          {historyState === "loading" &&
            [0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="tr"><div className="skeleton" style={{ gridColumn: "1 / -1", height: 22 }} /></div>
            ))}

          {historyState !== "loading" && rows.length === 0 && (
            <div className="empty">
              <div className="empty-icon"><Icon name={historyState === "error" ? "alert" : "search"} size={22} /></div>
              {historyState === "error"
                ? "Couldn't load reports. Is the backend running on port 5002?"
                : history.length === 0
                  ? "No reports generated yet."
                  : "No reports match these filters."}
            </div>
          )}

          {historyState !== "loading" &&
            rows.map((r) => (
              <button key={r.id} type="button" className="tr tr-link" role="row" onClick={() => onOpenItem(r)}>
                <span className="td-patient" role="cell">
                  <span className="avatar avatar-sm">{initials(r.name)}</span>
                  <span className="min-w-0">
                    <span className="td-name">{r.name || "Unknown patient"}</span>
                    <span className="td-sub">{[r.age, r.sex].filter(Boolean).join(" · ")}</span>
                  </span>
                </span>
                <span className="mono td-muted" role="cell"><span className="td-k">Reg No</span>{r.regNo || "—"}</span>
                <span role="cell"><span className="td-k">Exam</span>{r.template || "—"}</span>
                <span className="td-muted" role="cell"><span className="td-k">Date</span>{formatDate(r.createdAt)}</span>
                <span role="cell"><StatusBadge status={r.status} /></span>
                <span className="td-arrow"><Icon name="chevronRight" size={16} /></span>
              </button>
            ))}
        </div>

        {historyState !== "loading" && rows.length > 0 && (
          <div className="table-foot">
            Showing {rows.length} of {history.length} reports
          </div>
        )}
      </section>
    </div>
  );
}
