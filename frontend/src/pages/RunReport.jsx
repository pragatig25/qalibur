import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "../lib/api.js";

export function RunReport() {
  const { id } = useParams();
  const [html, setHtml] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getRun(id).then((run) => {
      const report = run.artifacts?.find((a) => a.type === "report");
      if (report) {
        setHtml(report.content);
      }
      setLoading(false);
    });
  }, [id]);

  if (loading) {
    return <div style={{ color: "var(--text-muted)" }}>Loading report...</div>;
  }

  if (!html) {
    return (
      <div>
        <div className="page-header">
          <h1>Report</h1>
          <Link to={`/run/${id}`} className="btn btn--ghost">
            Back to run
          </Link>
        </div>
        <div style={{ color: "var(--text-muted)" }}>No report generated for this run</div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <h1>Execution Report</h1>
        <Link to={`/run/${id}`} className="btn btn--ghost">
          Back to run
        </Link>
      </div>
      <div
        className="card"
        style={{ padding: 0, overflow: "hidden" }}
      >
        <iframe
          srcDoc={html}
          style={{ width: "100%", height: "80vh", border: "none" }}
          title="Execution Report"
        />
      </div>
    </div>
  );
}
