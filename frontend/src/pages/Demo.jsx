import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";

function loadFixture(name) {
  const base = import.meta.env.BASE_URL || "/";
  return fetch(`${base}fixtures/${name}`).then((r) => r.json());
}

const AGENT_ORDER = [
  "scout",
  "strategist",
  "scribe",
  "crafter",
  "architect",
  "gatekeeper",
  "deployer",
  "runner",
  "herald",
  "triage",
];

function fmtTime(ts) {
  return new Date(ts).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function Demo() {
  const [log, setLog] = useState([]);
  const [artifacts, setArtifacts] = useState([]);
  const [gates, setGates] = useState([]);
  const [activeArtifactId, setActiveArtifactId] = useState(null);
  const [phase, setPhase] = useState("idle"); // idle | playing | done
  const [speed, setSpeed] = useState(500);
  const [tick, setTick] = useState(0); // forces chip-state re-render
  const stopRef = useRef(() => {});
  const logEnd = useRef(null);

  useEffect(() => {
    Promise.all([loadFixture("artifacts.json"), loadFixture("gate-reviews.json")]).then(
      ([arts, g]) => {
        setArtifacts(arts);
        setGates(g);
        if (arts[0]) setActiveArtifactId(arts[0].id);
      }
    );
  }, []);

  useEffect(() => {
    const stream = logEnd.current?.parentElement;
    if (stream) stream.scrollTop = stream.scrollHeight;
  }, [log.length]);

  function start() {
    setLog([]);
    setPhase("playing");
    loadFixture("agent-log.json")
      .then((entries) => {
        let i = 0;
        const interval = setInterval(() => {
          if (i >= entries.length) {
            clearInterval(interval);
            setPhase("done");
            return;
          }
          const entry = entries[i];
          setLog((prev) => [...prev, entry]);
          setTick((t) => t + 1);
          i++;
        }, speed);
        stopRef.current = () => clearInterval(interval);
      });
  }

  function reset() {
    stopRef.current();
    setLog([]);
    setPhase("idle");
  }

  useEffect(() => () => stopRef.current(), []);

  // Compute agent state from log
  const agentState = useMemo(() => {
    const state = {};
    for (const a of AGENT_ORDER) state[a] = "pending";
    for (const e of log) {
      if (e.event === "start") state[e.agent] = "active";
      else if (e.event === "complete" || e.event === "gate_pass") state[e.agent] = "done";
      else if (e.event === "error" || e.event === "gate_fail") state[e.agent] = "fail";
    }
    return state;
  }, [log, tick]);

  const completedCount = Object.values(agentState).filter((s) => s === "done").length;
  const avgGateScore = gates.length
    ? (gates.reduce((s, g) => s + g.score, 0) / gates.length).toFixed(1)
    : "—";
  const activeArtifact = artifacts.find((a) => a.id === activeArtifactId) ?? artifacts[0];

  return (
    <div className="page wrap">
      <div className="page-head">
        <div className="titles">
          <p className="eyebrow">Demo run</p>
          <h2>Checkout flow &middot; acme-corp/web-checkout</h2>
          <p>
            A real pipeline against a fictional Stripe checkout repo. Five artefacts,
            three gate reviews, every gate &gt; 9.5 &mdash; replayed from fixture so
            you can watch the choreography without a backend.
          </p>
        </div>
        <div className="cta-row" style={{ marginTop: 0 }}>
          {phase === "idle" && (
            <button className="btn" onClick={start}>
              &#x25B6;&nbsp; Play pipeline
            </button>
          )}
          {phase === "playing" && (
            <button className="btn ghost" onClick={reset}>
              Reset
            </button>
          )}
          {phase === "done" && (
            <button className="btn" onClick={start}>
              Replay
            </button>
          )}
        </div>
      </div>

      <div className="studio">
        {/* LEFT — artifact viewer */}
        <div className="viewport">
          <div className="vp-chrome">
            <span className="dot" />
            <span className="dot" />
            <span className="dot" />
            <em>{activeArtifact?.filename ?? "no-artifact"}</em>
          </div>
          <div className="vp-body">
            {activeArtifact ? (
              <>
                <h4>
                  {activeArtifact.type
                    .split("-")
                    .map((w) => w[0].toUpperCase() + w.slice(1))
                    .join(" ")}
                </h4>
                <div className="file">
                  by <strong>{activeArtifact.agent}</strong> &middot;{" "}
                  {activeArtifact.filename}
                </div>
                <div className="tabs">
                  {artifacts.map((a) => (
                    <button
                      key={a.id}
                      onClick={() => setActiveArtifactId(a.id)}
                      className={`tab ${a.id === activeArtifactId ? "active" : ""}`}
                    >
                      {a.agent}
                    </button>
                  ))}
                </div>
                <pre className="vp-content">{activeArtifact.content}</pre>
              </>
            ) : (
              <p className="muted">Loading artifacts&hellip;</p>
            )}
          </div>
        </div>

        {/* RIGHT — pipeline + log */}
        <div className="panel">
          <h3>Pipeline</h3>
          <div className="panel-sub">
            {phase === "idle"
              ? "Click Play to walk the ten agents."
              : phase === "playing"
              ? `Running · ${completedCount}/10 complete`
              : "Run complete · all gates passed"}
          </div>
          <div className="timeline">
            {AGENT_ORDER.map((a) => (
              <div key={a} className={`chip ${agentState[a]}`}>
                <span className="ci">{a}</span>
                <span className="cs">
                  {agentState[a] === "done"
                    ? "✓"
                    : agentState[a] === "active"
                    ? "…"
                    : agentState[a] === "fail"
                    ? "×"
                    : "·"}
                </span>
              </div>
            ))}
          </div>

          <h3 style={{ marginTop: 22 }}>Agent log</h3>
          <div className="panel-sub">Streams as the pipeline runs.</div>
          <div className="log-stream">
            {log.length === 0 ? (
              <div style={{ color: "var(--muted)" }}>
                — no events yet, press Play above —
              </div>
            ) : (
              log.map((e, i) => (
                <div key={i} className="log-entry">
                  <span className="log-time">{fmtTime(e.timestamp)}</span>
                  <span className="log-agent">{e.agent}</span>
                  <span className={`log-msg log-event--${e.event}`}>{e.message}</span>
                </div>
              ))
            )}
            <div ref={logEnd} />
          </div>
        </div>
      </div>

      <div className="metrics">
        <div className="metric">
          <b>{artifacts.length}</b>
          <span>Artefacts</span>
        </div>
        <div className="metric">
          <b className="ok">{gates.length}/3</b>
          <span>Gate reviews passed</span>
        </div>
        <div className="metric">
          <b className="ok">{avgGateScore}</b>
          <span>Average gate score</span>
        </div>
        <div className="metric">
          <b>~$0.04</b>
          <span>Token cost (Sonnet + Haiku)</span>
        </div>
      </div>

      <section style={{ marginTop: 48 }}>
        <h2 className="section-title">Gate reviews</h2>
        <p className="section-sub">
          Three artefacts, three independent reviews. The gatekeeper is a separate
          model call &mdash; nothing self-grades.
        </p>
        {gates.map((g) => (
          <div key={g.id} className="gate">
            <div className="gate-head">
              <div>
                <div className="who">{g.agent} &middot; attempt {g.attempt}</div>
                <div className="panel-sub" style={{ margin: 0 }}>
                  artefact {g.artifactId}
                </div>
              </div>
              <div className={`gate-score ${g.passed ? "pass" : "fail"}`}>
                {g.score.toFixed(1)}
                <span style={{ color: "var(--muted)", fontSize: 14, marginLeft: 4 }}>
                  /10
                </span>
              </div>
            </div>
            <div className="criteria">
              {Object.entries(g.criteria).map(([k, v]) => (
                <div key={k} className="criterion">
                  <div className="cn">{k}</div>
                  <div className="cv">{v.score}</div>
                  <div className="cr">{v.reasoning}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </section>

      <section style={{ marginTop: 48 }}>
        <h2 className="section-title">Where it ends up</h2>
        <p className="section-sub">
          The deployer commits the artefacts, opens the PR, the runner fires CI,
          the herald renders an HTML report.
        </p>
        <div className="cta-row">
          <a
            className="btn ghost"
            href="https://github.com/acme-corp/web-checkout/pull/42"
            target="_blank"
            rel="noopener"
          >
            PR &#x2197;
          </a>
          <a
            className="btn ghost"
            href="https://github.com/acme-corp/web-checkout/actions/runs/12345"
            target="_blank"
            rel="noopener"
          >
            CI run &#x2197;
          </a>
          <Link className="btn" to="/live">
            Run it on your repo &rarr;
          </Link>
        </div>
      </section>
    </div>
  );
}
