import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api.js";

function timeAgo(ts) {
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function Dashboard() {
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.listRuns().then((data) => {
      setRuns(data);
      setLoading(false);
    });
  }, []);

  const completed = runs.filter((r) => r.status === "completed").length;
  const running = runs.filter((r) => r.status === "running").length;
  const failed = runs.filter((r) => r.status === "failed").length;

  return (
    <div>
      <div className="page-header">
        <h1>Dashboard</h1>
        <Link to="/run/new" className="btn btn--primary">
          + New Run
        </Link>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{runs.length}</div>
          <div className="stat-label">Total Runs</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: "var(--green)" }}>{completed}</div>
          <div className="stat-label">Completed</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: "var(--blue)" }}>{running}</div>
          <div className="stat-label">Running</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: "var(--red)" }}>{failed}</div>
          <div className="stat-label">Failed</div>
        </div>
      </div>

      {loading ? (
        <div style={{ color: "var(--text-muted)" }}>Loading runs...</div>
      ) : runs.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: 40 }}>
          <p style={{ color: "var(--text-muted)", marginBottom: 16 }}>No runs yet</p>
          <Link to="/run/new" className="btn btn--primary">
            Start your first run
          </Link>
        </div>
      ) : (
        <div className="run-list">
          {runs.map((run) => (
            <Link
              to={`/run/${run.id}`}
              key={run.id}
              className="run-item"
              style={{ textDecoration: "none", color: "inherit" }}
            >
              <div className="run-item-left">
                <div className="run-item-title">
                  {run.featureDescription?.slice(0, 80) || "Untitled run"}
                </div>
                <div className="run-item-meta">
                  <span>{run.id.slice(0, 8)}</span>
                  <span>{timeAgo(run.createdAt)}</span>
                  <span>
                    {run.artifacts?.length || 0} artifact
                    {(run.artifacts?.length || 0) !== 1 ? "s" : ""}
                  </span>
                </div>
              </div>
              <span className={`badge badge--${run.status}`}>{run.status}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
