import { Link } from "react-router-dom";

const AGENTS = [
  {
    role: "Scout",
    title: "Coverage gap analysis",
    desc: "Walks the repo, reads the source, and reports where tests are missing or thinnest. Returns a ranked list of risk areas, not a wall of complaints.",
  },
  {
    role: "Strategist",
    title: "Test strategy & EP tables",
    desc: "Turns the gap report into an explicit risk matrix and equivalence-partition tables, so every test that follows has a documented reason to exist.",
  },
  {
    role: "Gatekeeper",
    title: "Hard quality gate",
    desc: "Scores every other agent's output against weighted criteria. Anything below 8.0/10 is rejected and the upstream agent is re-prompted — up to three attempts.",
  },
  {
    role: "Scribe",
    title: "Gherkin feature files",
    desc: "Writes Given/When/Then scenarios that a non-engineer can read, tagged by priority and risk so reporting is automatic.",
  },
  {
    role: "Crafter",
    title: "Playwright test code",
    desc: "Translates each scenario into Playwright with role-based locators and explicit waits — the kind of code you'd actually merge.",
  },
  {
    role: "Architect",
    title: "Structural review",
    desc: "Checks the generated code against project conventions: locator quality, test isolation, page-object discipline. Catches what a model alone misses.",
  },
  {
    role: "Deployer",
    title: "Branch & PR",
    desc: "Creates a branch, commits the artifacts, opens a PR with a generated description — and labels it so the next reviewer knows it came from Qalibur.",
  },
  {
    role: "Runner",
    title: "CI trigger & wait",
    desc: "Dispatches the GitHub Actions workflow, polls until it finishes, and attaches the run URL back to the artefact bundle.",
  },
  {
    role: "Herald",
    title: "Execution report",
    desc: "Renders a self-contained HTML report — gate scores, artefacts, links to the PR and CI run. The one thing a human reviewer actually opens.",
  },
  {
    role: "Triage",
    title: "Failure classification",
    desc: "Classifies every failing test as flaky, regression, environment or genuine, with a suggested fix. Saves the on-call engineer the first 20 minutes.",
  },
];

export function Landing() {
  return (
    <>
      <section className="hero wrap">
        <p className="eyebrow">Qalibur &middot; agentic QE platform</p>
        <h1>
          Ten agents,<br />one merged PR.
        </h1>
        <p className="lede">
          Most "AI for testing" tools generate a few cases and stop. Qalibur owns the
          full lifecycle: <em>analyse the repo, design the strategy, write the tests,
          review them at a hard gate, open the PR, run CI, classify the failures</em>.
          Every handoff is gated; nothing reaches your branch unscored.
        </p>
        <div className="cta-row">
          <Link className="btn" to="/demo">
            Watch a demo run &#x2192;
          </Link>
          <Link className="btn ghost" to="/live">
            Run it on your repo
          </Link>
        </div>
        <dl className="value">
          <div>
            <dt>~2 hours &#x2192; ~3 min</dt>
            <dd>from feature description to a merge-ready test PR with CI green</dd>
          </div>
          <div>
            <dt>Score &#x2265; 8.0</dt>
            <dd>every artifact gated by an LLM critic before it touches your repo</dd>
          </div>
          <div>
            <dt>~$0.04 / run</dt>
            <dd>Sonnet + Haiku with prompt caching keep each pipeline effectively free</dd>
          </div>
        </dl>
      </section>

      <section id="agents" className="wrap band">
        <h2 className="section-title">The ten agents</h2>
        <p className="section-sub">
          Each agent owns one job, has one prompt, and writes one artefact. Gatekeeper
          stands between every pair &mdash; a non-deterministic model never decides
          alone whether code reaches your branch.
        </p>
        <div className="agent-grid">
          {AGENTS.map((a, i) => (
            <article key={a.role} className="agent-card">
              <span className="num">{String(i + 1).padStart(2, "0")}</span>
              <div>
                <div className="role">{a.role}</div>
                <h3>{a.title}</h3>
                <p>{a.desc}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section id="flow" className="wrap band">
        <h2 className="section-title">The pipeline</h2>
        <p className="section-sub">
          One run is one ordered traversal. Every edge has a gate; failing gates loop
          back, they don't pass through.
        </p>
        <div className="flow">
          <div className="node">
            <b>You</b>
            <span>repo URL + feature description</span>
          </div>
          <div className="arrow">&darr;</div>
          <div className="node softnode">
            <b>Scout &rarr; Strategist</b>
            <span>gap report &rarr; risk matrix &amp; EP tables</span>
          </div>
          <div className="arrow">&darr;</div>
          <div className="node loopnode">
            <b>Gatekeeper</b>
            <span>scores each artefact &middot; rejects below 8.0/10 &middot; up to 3 retries</span>
          </div>
          <div className="arrow">&darr;</div>
          <div className="node softnode">
            <b>Scribe &rarr; Crafter &rarr; Architect</b>
            <span>Gherkin &rarr; Playwright &rarr; structural review</span>
          </div>
          <div className="arrow">&darr;</div>
          <div className="node hardnode">
            <b>Deployer &rarr; Runner</b>
            <span>branch + PR &rarr; GitHub Actions &rarr; wait for green</span>
          </div>
          <div className="arrow">&darr;</div>
          <div className="node out">
            <b>Herald &rarr; Triage</b>
            <span>execution report + failure classification</span>
          </div>
        </div>
      </section>

      <section className="wrap band">
        <h2 className="section-title">See it run</h2>
        <p className="section-sub">
          The demo replays a real pipeline against a fictional checkout repo &mdash; no
          backend required. The live page runs the real agents against any GitHub repo
          you point it at.
        </p>
        <div className="cta-row">
          <Link className="btn" to="/demo">
            Watch the demo &rarr;
          </Link>
          <Link className="btn ghost" to="/live">
            Start a live run
          </Link>
        </div>
      </section>
    </>
  );
}
