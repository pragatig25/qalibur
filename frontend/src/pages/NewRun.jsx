import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api.js";

export function NewRun() {
  const navigate = useNavigate();
  const [repoUrl, setRepoUrl] = useState("");
  const [featureDescription, setFeatureDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const run = await api.createRun(repoUrl, featureDescription);
      navigate(`/run/${run.id}`);
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1>New Run</h1>
      </div>

      <div className="card" style={{ maxWidth: 640 }}>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Repository URL</label>
            <input
              type="url"
              placeholder="https://github.com/owner/repo"
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>Feature Description</label>
            <textarea
              placeholder="Describe the feature or area you want to generate tests for..."
              value={featureDescription}
              onChange={(e) => setFeatureDescription(e.target.value)}
              required
            />
          </div>

          {error && (
            <div style={{ color: "var(--red)", marginBottom: 16, fontSize: 14 }}>
              {error}
            </div>
          )}

          <button type="submit" className="btn btn--primary" disabled={submitting}>
            {submitting ? "Starting..." : "Start Pipeline"}
          </button>
        </form>
      </div>
    </div>
  );
}
