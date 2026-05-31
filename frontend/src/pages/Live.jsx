import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { api } from "../lib/api.js";

const SAMPLES = [
  {
    repo: "https://github.com/your-org/web-checkout",
    feature: "Stripe checkout — happy path + decline + cart boundary cases",
  },
  {
    repo: "https://github.com/your-org/rate-limiter",
    feature: "Token-bucket rate limiter — Redis fallback + burst handling",
  },
];

export function Live() {
  const navigate = useNavigate();
  const [repoUrl, setRepoUrl] = useState("");
  const [featureDescription, setFeatureDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setStatus({ tone: "run", msg: "Creating run…" });
    try {
      const run = await api.createRun(repoUrl, featureDescription);
      setStatus({ tone: "ok", msg: `Run ${run.id.slice(0, 8)} created — opening pipeline view` });
      setTimeout(() => navigate(`/run/${run.id}`), 600);
    } catch (err) {
      setStatus({
        tone: "err",
        msg:
          err.message === "Failed to fetch"
            ? "Backend not reachable — start it with `npm run dev` from the repo root."
            : err.message,
      });
      setSubmitting(false);
    }
  }

  function applySample(s) {
    setRepoUrl(s.repo);
    setFeatureDescription(s.feature);
  }

  return (
    <div className="page wrap">
      <div className="page-head">
        <div className="titles">
          <p className="eyebrow">Live run</p>
          <h2>Run Qalibur on a real repo</h2>
          <p>
            Point it at a GitHub repo and describe a feature. The ten agents run
            against the live Anthropic API; you'll be redirected to a streaming
            pipeline view as soon as the run is created.
          </p>
        </div>
      </div>

      <div className="split-grid">
        <div className="live">
          <h3>Submit a run</h3>
          <p>
            The backend needs <code>ANTHROPIC_API_KEY</code> in its environment.
            For real PR creation, add <code>GITHUB_TOKEN</code> + <code>GITHUB_OWNER</code>;
            without them the deployer and runner skip the GitHub steps and the rest
            of the pipeline runs unaffected.
          </p>

          <form onSubmit={handleSubmit} className="form-grid">
            <label className="field">
              <span>Repository URL</span>
              <input
                className="input"
                type="url"
                placeholder="https://github.com/owner/repo"
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                required
              />
            </label>

            <label className="field">
              <span>Feature description</span>
              <textarea
                className="input"
                placeholder="One or two sentences. The strategist works best when you say what to test, not how."
                value={featureDescription}
                onChange={(e) => setFeatureDescription(e.target.value)}
                required
              />
            </label>

            <div className="cta-row" style={{ marginTop: 4 }}>
              <button type="submit" className="btn" disabled={submitting}>
                {submitting ? "Starting…" : "Start pipeline →"}
              </button>
              <Link to="/demo" className="btn ghost">
                Watch the demo first
              </Link>
            </div>

            {status && (
              <div className={`status-line ${status.tone}`}>{status.msg}</div>
            )}
          </form>
        </div>

        <div className="panel">
          <h3>Sample prompts</h3>
          <p className="panel-sub">
            Tap to populate the form &mdash; replace the org with your own.
          </p>
          {SAMPLES.map((s, i) => (
            <button
              key={i}
              type="button"
              className="run-item"
              style={{ width: "100%", textAlign: "left", marginBottom: 10 }}
              onClick={() => applySample(s)}
            >
              <div>
                <div className="run-item-title">{s.feature}</div>
                <div className="run-item-meta">
                  <span className="mono">{s.repo.replace("https://github.com/", "")}</span>
                </div>
              </div>
              <span className="badge badge--pending">try</span>
            </button>
          ))}

          <h3 style={{ marginTop: 20 }}>What happens next</h3>
          <p className="panel-sub" style={{ marginBottom: 0 }}>
            You'll be taken to the run page where the agent log streams over SSE.
            Every gate review and artefact appears as it's produced.
          </p>
        </div>
      </div>
    </div>
  );
}
