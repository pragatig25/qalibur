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

  useEffect(() => {
    api.getRun(id).then((data) => {
      setRun(data);
      setLogEntries(data.log || []);
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
    return <div style={{ color: "var(--text-muted)" }}>Loading run...</div>;
  }

  if (!run) {
    return <div style={{ color: "var(--red)" }}>Run not found</div>;
  }

  const tabs = [
    { key: "log", label: "Agent Log" },
    { key: "artifacts", label: `Artifacts (${run.artifacts?.length || 0})` },
    { key: "gates", label: `Gate Reviews (${run.gateReviews?.length || 0})` },
    { key: "defects", label: `Defects (${run.defects?.length || 0})` },
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 style={{ marginBottom: 4 }}>
            {run.featureDescription?.slice(0, 60) || "Run"}
          </h1>
          <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
            {run.id} &middot; {new Date(run.createdAt).toLocaleString()}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span className={`badge badge--${run.status}`}>{run.status}</span>
          {run.status === "gate_blocked" && (
            <>
              <button className="btn btn--primary" onClick={handleApprove}>
                Approve
              </button>
              <button className="btn btn--danger" onClick={handleReject}>
                Reject
              </button>
            </>
          )}
          {run.artifacts?.some((a) => a.type === "report") && (
            <Link to={`/run/${id}/report`} className="btn btn--ghost">
              View Report
            </Link>
          )}
        </div>
      </div>

      {run.prUrl && (
        <div className="card" style={{ marginBottom: 16, display: "flex", gap: 16 }}>
          <span style={{ color: "var(--text-muted)", fontSize: 13 }}>PR:</span>
          <a href={run.prUrl} target="_blank" rel="noopener noreferrer">
            {run.prUrl}
          </a>
        </div>
      )}

      <div className="artifact-tabs" style={{ marginBottom: 20 }}>
        {tabs.map((t) => (
          <button
            key={t.key}
            className={`artifact-tab ${tab === t.key ? "active" : ""}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "log" && <AgentLog entries={logEntries} />}

      {tab === "artifacts" && <ArtifactViewer artifacts={run.artifacts || []} />}

      {tab === "gates" && (
        <div>
          {(run.gateReviews || []).length === 0 ? (
            <div style={{ color: "var(--text-muted)" }}>No gate reviews yet</div>
          ) : (
            run.gateReviews.map((review) => (
              <GateReview key={review.id} review={review} />
            ))
          )}
        </div>
      )}

      {tab === "defects" && (
        <div>
          {(run.defects || []).length === 0 ? (
            <div style={{ color: "var(--text-muted)" }}>No defects found</div>
          ) : (
            run.defects.map((defect) => (
              <div className="card" key={defect.id} style={{ marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                  <strong>{defect.testName}</strong>
                  <div style={{ display: "flex", gap: 8 }}>
                    <span className={`badge badge--${defect.severity === "critical" || defect.severity === "high" ? "failed" : "pending"}`}>
                      {defect.severity}
                    </span>
                    <span className="badge badge--running">{defect.classification}</span>
                  </div>
                </div>
                <p style={{ fontSize: 14, color: "var(--text-muted)", marginBottom: 8 }}>
                  {defect.summary}
                </p>
                <p style={{ fontSize: 13 }}>
                  <strong>Suggested fix:</strong> {defect.suggestedFix}
                </p>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
