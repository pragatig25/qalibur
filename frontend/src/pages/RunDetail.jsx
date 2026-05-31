import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "../lib/api.js";
import { AgentLog } from "../components/AgentLog.jsx";
import { GateReview } from "../components/GateReview.jsx";
import { ArtifactViewer } from "../components/ArtifactViewer.jsx";

export function RunDetail() {
  const { id } = useParams();
  const [run, setRun] = useState(null);
  const [logEntries, setLogEntries] = useState([]);
  const [tab, setTab] = useState("log");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api
      .getRun(id)
      .then((data) => {
        setRun(data);
        setLogEntries(data?.log || []);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [id]);

  useEffect(() => {
    if (!id) return;
    const unsub = api.subscribeToLog(id, (entry) => {
      setLogEntries((prev) => [...prev, entry]);
    });
    return unsub;
  }, [id]);

  async function handleApprove() {
    await api.approveRun(id);
    const updated = await api.getRun(id);
    setRun(updated);
  }

  async function handleReject() {
    const note = prompt("Rejection reason:");
    if (note === null) return;
    await api.rejectRun(id, note);
    const updated = await api.getRun(id);
    setRun(updated);
  }

  if (loading) {
    return (
      <div className="page wrap">
        <div className="empty">
          <p>Loading run…</p>
        </div>
      </div>
    );
  }

  if (error || !run) {
    return (
      <div className="page wrap">
        <div className="empty">
          <p>Couldn't load run: {error || "not found"}</p>
          <Link to="/runs" className="btn">
            Back to runs
          </Link>
        </div>
      </div>
    );
  }

  const tabs = [
    { key: "log", label: "Agent log" },
    { key: "artifacts", label: `Artefacts (${run.artifacts?.length || 0})` },
    { key: "gates", label: `Gate reviews (${run.gateReviews?.length || 0})` },
    { key: "defects", label: `Defects (${run.defects?.length || 0})` },
  ];

  return (
    <div className="page wrap">
      <div className="page-head">
        <div className="titles">
          <p className="eyebrow">
            Run · <span className="mono">{run.id.slice(0, 8)}</span>
          </p>
          <h2>{run.featureDescription?.slice(0, 80) || "Untitled run"}</h2>
          <p>
            {run.repoUrl && (
              <>
                <span className="mono">{run.repoUrl.replace("https://github.com/", "")}</span> ·{" "}
              </>
            )}
            {new Date(run.createdAt).toLocaleString()}
          </p>
        </div>
        <div className="cta-row" style={{ marginTop: 0 }}>
          <span className={`badge badge--${run.status} dot`}>
            {run.status.replace("_", " ")}
          </span>
          {run.status === "gate_blocked" && (
            <>
              <button className="btn sm" onClick={handleApprove}>
                Approve
              </button>
              <button className="btn ghost sm" onClick={handleReject}>
                Reject
              </button>
            </>
          )}
          {run.artifacts?.some((a) => a.type === "report") && (
            <Link to={`/run/${id}/report`} className="btn ghost sm">
              Report
            </Link>
          )}
          {run.prUrl && (
            <a
              className="btn ghost sm"
              href={run.prUrl}
              target="_blank"
              rel="noopener"
            >
              PR ↗
            </a>
          )}
          {run.actionsRunUrl && (
            <a
              className="btn ghost sm"
              href={run.actionsRunUrl}
              target="_blank"
              rel="noopener"
            >
              CI ↗
            </a>
          )}
        </div>
      </div>

      <div className="tabs" style={{ marginBottom: 18 }}>
        {tabs.map((t) => (
          <button
            key={t.key}
            className={`tab ${tab === t.key ? "active" : ""}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "log" && <AgentLog entries={logEntries} />}
      {tab === "artifacts" && <ArtifactViewer artifacts={run.artifacts || []} />}
      {tab === "gates" &&
        ((run.gateReviews || []).length === 0 ? (
          <div className="empty">
            <p>No gate reviews yet.</p>
          </div>
        ) : (
          run.gateReviews.map((review) => <GateReview key={review.id} review={review} />)
        ))}
      {tab === "defects" &&
        ((run.defects || []).length === 0 ? (
          <div className="empty">
            <p>No defects classified yet.</p>
          </div>
        ) : (
          run.defects.map((d) => (
            <div className="gate" key={d.id}>
              <div className="gate-head">
                <div>
                  <div className="who">{d.testName}</div>
                  <div className="panel-sub" style={{ margin: 0 }}>
                    {d.severity} · {d.classification}
                  </div>
                </div>
              </div>
              <p style={{ color: "var(--muted)", fontSize: 14.5, marginBottom: 8 }}>
                {d.summary}
              </p>
              <p style={{ fontSize: 13.5 }}>
                <strong>Suggested fix:</strong> {d.suggestedFix}
              </p>
            </div>
          ))
        ))}
    </div>
  );
}
