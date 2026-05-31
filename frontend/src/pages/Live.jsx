import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { api } from "../lib/api.js";

const SAMPLES = [
  {
    repo: "https://github.com/pragatig25/qalibur",
    feature:
      "Generate Playwright tests for the run-creation form on /live — happy path, missing-field validation, and backend-down error state.",
  },
  {
    repo: "https://github.com/your-org/web-checkout",
    feature: "Stripe checkout — happy path + decline + cart boundary cases.",
  },
];

// modes: "demo" (deployed Pages build) | "no-backend" (local, backend down) | "ready" (local, backend up)
function useEnvState() {
  const [state, setState] = useState({ mode: "checking", reason: null });

  useEffect(() => {
    if (api.isDemo()) {
      setState({ mode: "demo", reason: "demo-build" });
      return;
    }
    let cancelled = false;
    api.health().then((h) => {
      if (cancelled) return;
      setState(
        h.reachable
          ? { mode: "ready", reason: null }
          : { mode: "no-backend", reason: h.reason }
      );
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}

function CodeBlock({ children }) {
  return <pre className="codeblock">{children}</pre>;
}

function SetupSteps() {
  return (
    <ol className="steps">
      <li>
        <h4>1 · Clone &amp; install</h4>
        <CodeBlock>{`git clone https://github.com/pragatig25/qalibur.git
cd qalibur
npm run install:all`}</CodeBlock>
      </li>
      <li>
        <h4>2 · Add your API keys</h4>
        <p>
          Copy the template, then fill in your{" "}
          <a
            href="https://console.anthropic.com/settings/keys"
            target="_blank"
            rel="noopener"
          >
            Anthropic API key
          </a>
          .
        </p>
        <CodeBlock>{`cp .env.example .env
# edit .env:
#   ANTHROPIC_API_KEY=sk-ant-api03-...
#   ALLOWED_USERS=<your-github-handle>
#   GITHUB_TOKEN=github_pat_...   # optional, only needed for PR creation
#   GITHUB_OWNER=<your-github-handle>`}</CodeBlock>
        <p className="callout">
          <strong>Tip:</strong> <code>GITHUB_TOKEN</code> is optional. Without it,
          all ten agents still run — only the Deployer (opens a PR) and Runner
          (dispatches CI) gracefully skip.
        </p>
      </li>
      <li>
        <h4>3 · Start both services</h4>
        <CodeBlock>{`npm run dev
# → backend listening on :4000
# → frontend on http://localhost:3001/qalibur/`}</CodeBlock>
      </li>
      <li>
        <h4>4 · Open this page locally and submit</h4>
        <p>
          Visit <code>http://localhost:3001/qalibur/#/live</code>, paste a repo URL
          and a feature description, click <strong>Start pipeline →</strong>. The
          agent log streams over SSE; ~2-3 min, ~$0.04 in Anthropic spend.
        </p>
      </li>
    </ol>
  );
}

function ModeBanner({ mode, reason }) {
  if (mode === "demo") {
    return (
      <div className="banner banner--warn">
        <div className="banner-icon">●</div>
        <div>
          <strong>You're on the deployed demo.</strong> Live mode requires the
          backend, which can't run on GitHub Pages. Follow the steps below to run
          it locally —{" "}
          <Link to="/demo">or watch the demo replay</Link> to see what a real run
          looks like.
        </div>
      </div>
    );
  }
  if (mode === "no-backend") {
    return (
      <div className="banner banner--err">
        <div className="banner-icon">●</div>
        <div>
          <strong>Backend not reachable</strong> (
          <code>localhost:4000</code> → <code>{reason}</code>). The frontend is
          running but the API server isn't. Run <code>npm run dev</code> from the
          repo root, or follow the steps below if this is your first time.
        </div>
      </div>
    );
  }
  if (mode === "ready") {
    return (
      <div className="banner banner--ok">
        <div className="banner-icon">●</div>
        <div>
          <strong>Backend connected.</strong> You're running locally on{" "}
          <code>localhost:4000</code> — submit the form below to start a pipeline.
        </div>
      </div>
    );
  }
  return (
    <div className="banner banner--neutral">
      <div className="banner-icon">○</div>
      <div>Checking backend…</div>
    </div>
  );
}

export function Live() {
  const navigate = useNavigate();
  const env = useEnvState();
  const [repoUrl, setRepoUrl] = useState("");
  const [featureDescription, setFeatureDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState(null);

  const formDisabled = env.mode !== "ready";

  async function handleSubmit(e) {
    e.preventDefault();
    if (formDisabled) return;
    setSubmitting(true);
    setStatus({ tone: "run", msg: "Creating run…" });
    try {
      const run = await api.createRun(repoUrl, featureDescription);
      setStatus({
        tone: "ok",
        msg: `Run ${run.id.slice(0, 8)} created — opening pipeline view`,
      });
      setTimeout(() => navigate(`/run/${run.id}`), 600);
    } catch (err) {
      const msg = String(err.message || err);
      setStatus({
        tone: "err",
        msg:
          msg === "Failed to fetch"
            ? "Backend stopped responding. Restart it with `npm run dev`."
            : msg.includes("not authorised")
            ? "401 — your GitHub handle isn't in ALLOWED_USERS. Edit .env and restart the backend."
            : msg,
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
          <p className="eyebrow">Live run · local only</p>
          <h2>Run Qalibur on a real repo</h2>
          <p>
            Live mode runs the ten agents against the real Anthropic API and your
            GitHub account. Because that needs a server with secrets, it can't run
            on GitHub Pages — you clone the repo and start it locally.
          </p>
        </div>
      </div>

      <ModeBanner mode={env.mode} reason={env.reason} />

      <div className="split-grid" style={{ marginTop: 24 }}>
        <div className={`live ${formDisabled ? "live--disabled" : ""}`}>
          <h3>Submit a run</h3>
          <p>
            Point Qalibur at a GitHub repo you own and describe the feature you
            want tested. The form is enabled only when the local backend is
            reachable.
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
                disabled={formDisabled}
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
                disabled={formDisabled}
              />
            </label>

            <div className="cta-row" style={{ marginTop: 4 }}>
              <button
                type="submit"
                className="btn"
                disabled={submitting || formDisabled}
                title={
                  formDisabled
                    ? "Start the local backend first — see the setup steps below"
                    : ""
                }
              >
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
            Tap to populate the form (use your own repo — these are starting
            points).
          </p>
          {SAMPLES.map((s, i) => (
            <button
              key={i}
              type="button"
              className="run-item"
              style={{ width: "100%", textAlign: "left", marginBottom: 10 }}
              onClick={() => applySample(s)}
              disabled={formDisabled}
            >
              <div>
                <div className="run-item-title">{s.feature}</div>
                <div className="run-item-meta">
                  <span className="mono">
                    {s.repo.replace("https://github.com/", "")}
                  </span>
                </div>
              </div>
              <span className="badge badge--pending">try</span>
            </button>
          ))}

          <h3 style={{ marginTop: 20 }}>What happens next</h3>
          <p className="panel-sub" style={{ marginBottom: 0 }}>
            You'll be taken to the run page where the agent log streams over SSE.
            Five artefacts (coverage-gap, strategy, feature, spec, report) and
            three gate reviews appear as the pipeline progresses.
          </p>
        </div>
      </div>

      <section style={{ marginTop: 56 }}>
        <h2 className="section-title">How to run live mode</h2>
        <p className="section-sub">
          One-time setup. Once installed, day-to-day is just{" "}
          <code>npm run dev</code> from the repo root.
        </p>
        <SetupSteps />
      </section>

      <section className="band" style={{ marginTop: 48, padding: "40px 0 0" }}>
        <h2 className="section-title">Troubleshooting</h2>
        <p className="section-sub">
          The most common gotchas, copy-pasteable fixes.
        </p>
        <div className="agent-grid">
          <article className="agent-card">
            <span className="num">!</span>
            <div>
              <div className="role">401 not authorised</div>
              <h3>Your handle isn't in ALLOWED_USERS</h3>
              <p>
                Edit <code>.env</code>: set{" "}
                <code>ALLOWED_USERS=&lt;your-github-handle&gt;</code> (no commas
                needed for one user). Restart the backend.
              </p>
            </div>
          </article>
          <article className="agent-card">
            <span className="num">!</span>
            <div>
              <div className="role">Backend won't start</div>
              <h3>Port 4000 already in use</h3>
              <p>
                Something else is on :4000. Find and kill it:{" "}
                <code>ss -tlnp | grep :4000</code> →{" "}
                <code>kill -9 &lt;pid&gt;</code>. Or set{" "}
                <code>PORT=4001</code> in <code>.env</code>.
              </p>
            </div>
          </article>
          <article className="agent-card">
            <span className="num">!</span>
            <div>
              <div className="role">Pipeline fails at scout</div>
              <h3>ANTHROPIC_API_KEY missing or wrong</h3>
              <p>
                Verify the key at{" "}
                <a
                  href="https://console.anthropic.com/settings/keys"
                  target="_blank"
                  rel="noopener"
                >
                  console.anthropic.com
                </a>
                . Look for <code>401</code> from <code>api.anthropic.com</code> in
                the backend terminal.
              </p>
            </div>
          </article>
          <article className="agent-card">
            <span className="num">!</span>
            <div>
              <div className="role">No PR created</div>
              <h3>GITHUB_TOKEN missing or wrong scopes</h3>
              <p>
                Use a{" "}
                <a
                  href="https://github.com/settings/tokens?type=beta"
                  target="_blank"
                  rel="noopener"
                >
                  fine-grained PAT
                </a>{" "}
                with <strong>Contents: read &amp; write</strong> +{" "}
                <strong>Pull requests: read &amp; write</strong> on the target
                repo. The Deployer logs the exact error in the agent log.
              </p>
            </div>
          </article>
        </div>
      </section>
    </div>
  );
}
