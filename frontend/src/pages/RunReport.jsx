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
      if (report) setHtml(report.content);
      setLoading(false);
    });
  }, [id]);

  if (loading) {
    return (
      <div className="page wrap">
        <div className="empty">
          <p>Loading report…</p>
        </div>
      </div>
    );
  }

  if (!html) {
    return (
      <div className="page wrap">
        <div className="page-head">
          <div className="titles">
            <h2>Report</h2>
            <p>No report has been generated for this run yet.</p>
          </div>
          <Link to={`/run/${id}`} className="btn ghost">
            ← Back to run
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="page wrap">
      <div className="page-head">
        <div className="titles">
          <p className="eyebrow">Execution report</p>
          <h2>Run {id.slice(0, 8)}</h2>
        </div>
        <Link to={`/run/${id}`} className="btn ghost">
          ← Back to run
        </Link>
      </div>
      <div className="viewport" style={{ padding: 0 }}>
        <div className="vp-chrome">
          <span className="dot" />
          <span className="dot" />
          <span className="dot" />
          <em>report.html · sandboxed</em>
        </div>
        <iframe
          srcDoc={html}
          sandbox="allow-same-origin"
          style={{ width: "100%", height: "78vh", border: "none", background: "#fff" }}
          title="Execution Report"
        />
      </div>
    </div>
  );
}
