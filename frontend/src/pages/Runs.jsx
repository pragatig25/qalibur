import { useEffect, useState } from "react";
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

export function Runs() {
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api
      .listRuns()
      .then((data) => {
        setRuns(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  const completed = runs.filter((r) => r.status === "completed").length;
  const running = runs.filter((r) => r.status === "running" || r.status === "pending").length;
  const failed = runs.filter((r) => r.status === "failed").length;
  const blocked = runs.filter((r) => r.status === "gate_blocked").length;

  return (
    <div className="page wrap">
      <div className="page-head">
        <div className="titles">
          <p className="eyebrow">Run history</p>
          <h2>Runs</h2>
          <p>
            Every pipeline that has executed against this backend. In demo mode this
            list comes from the fixture; in live mode it's whatever the backend has
            in memory.
          </p>
        </div>
        <div className="cta-row" style={{ marginTop: 0 }}>
          <Link to="/live" className="btn">
            New run →
          </Link>
        </div>
      </div>

      <div className="metrics" style={{ marginTop: 0, marginBottom: 28 }}>
        <div className="metric">
          <b>{runs.length}</b>
          <span>Total runs</span>
        </div>
        <div className="metric">
          <b className="ok">{completed}</b>
          <span>Completed</span>
        </div>
        <div className="metric">
          <b className="warn">{running + blocked}</b>
          <span>Active / blocked</span>
        </div>
        <div className="metric">
          <b className="bad">{failed}</b>
          <span>Failed</span>
        </div>
      </div>

      {error ? (
        <div className="empty">
          <p>Couldn't load runs: {error}</p>
          <Link to="/demo" className="btn">
            Try the demo instead
          </Link>
        </div>
      ) : loading ? (
        <div className="empty">
          <p>Loading runs…</p>
        </div>
      ) : runs.length === 0 ? (
        <div className="empty">
          <p>No runs yet.</p>
          <Link to="/live" className="btn">
            Start your first run
          </Link>
        </div>
      ) : (
        <div className="run-list">
          {runs.map((run) => (
            <Link to={`/run/${run.id}`} key={run.id} className="run-item">
              <div>
                <div className="run-item-title">
                  {run.featureDescription?.slice(0, 90) || "Untitled run"}
                </div>
                <div className="run-item-meta">
                  <span className="mono">{run.id.slice(0, 8)}</span>
                  <span>{timeAgo(run.createdAt)}</span>
                  <span>
                    {run.artifacts?.length || 0} artefact
                    {(run.artifacts?.length || 0) !== 1 ? "s" : ""}
                  </span>
                  {run.repoUrl && (
                    <span>{run.repoUrl.replace("https://github.com/", "")}</span>
                  )}
                </div>
              </div>
              <span className={`badge badge--${run.status} dot`}>{run.status.replace("_", " ")}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
