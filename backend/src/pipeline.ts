import { store, type AgentName, type Artifact } from "./store.js";
import { scoutAgent } from "./agents/scout.js";
import { strategistAgent } from "./agents/strategist.js";
import { scribeAgent } from "./agents/scribe.js";
import { crafterAgent } from "./agents/crafter.js";
import { gatekeeperAgent } from "./agents/gatekeeper.js";
import { architectAgent } from "./agents/architect.js";
import { deployerAgent } from "./agents/deployer.js";
import { runnerAgent } from "./agents/runner.js";
import { heraldAgent } from "./agents/herald.js";
import { triageAgent } from "./agents/triage.js";

const GATE_THRESHOLD = Number(process.env.GATE_THRESHOLD ?? 8.0);
const MAX_GATE_ATTEMPTS = Number(process.env.MAX_GATE_ATTEMPTS ?? 3);

function log(
  runId: string,
  agent: AgentName,
  event: "start" | "progress" | "complete" | "error",
  message: string,
  data?: unknown
) {
  store.addLog(runId, { agent, event, message, data });
}

/**
 * Run one pipeline stage:
 *   1. Generate an artifact (first attempt has no feedback)
 *   2. Score it with the gatekeeper
 *   3. If below threshold, REGENERATE with the gatekeeper's feedback
 *      (this is what makes "retry" meaningful — the old version just
 *      re-scored the same artifact and got the same score)
 *   4. After MAX_GATE_ATTEMPTS, mark gate_blocked and await human approval
 *
 * Returns the latest output. `passed` indicates whether the stage cleared
 * the gate (true on auto-pass OR human approval) or was rejected.
 */
async function runGatedStage<T>(
  runId: string,
  agentName: AgentName,
  artifactMeta: { type: string; filename: string },
  generate: (feedback: string | null) => Promise<T>,
  serialize: (out: T) => string = (out) => (typeof out === "string" ? out : JSON.stringify(out, null, 2))
): Promise<{ output: T; artifact: Artifact; passed: boolean }> {
  let output: T | null = null;
  let artifact: Artifact | null = null;
  let lastFeedback: string | null = null;

  for (let attempt = 1; attempt <= MAX_GATE_ATTEMPTS; attempt++) {
    store.updateRun(runId, { currentAgent: agentName });
    if (attempt === 1) {
      log(runId, agentName, "start", `Starting (${artifactMeta.type})`);
    } else {
      log(
        runId,
        agentName,
        "start",
        `Regenerating with gatekeeper feedback (attempt ${attempt}/${MAX_GATE_ATTEMPTS})`
      );
    }

    output = await generate(lastFeedback);
    artifact = store.addArtifact(runId, {
      agent: agentName,
      type: artifactMeta.type,
      filename: artifactMeta.filename,
      content: serialize(output),
    });
    log(runId, agentName, "complete", `Produced ${artifactMeta.filename}`);

    log(
      runId,
      "gatekeeper",
      "start",
      `Reviewing ${agentName} output (attempt ${attempt}/${MAX_GATE_ATTEMPTS})`
    );
    const review = await gatekeeperAgent(runId, artifact.id, attempt);
    store.addGateReview(runId, review);

    if (review.score >= GATE_THRESHOLD) {
      log(runId, "gatekeeper", "complete", `Passed with score ${review.score}/10`);
      store.addLog(runId, {
        agent: "gatekeeper",
        event: "gate_pass",
        message: `Score: ${review.score}`,
      });
      return { output, artifact, passed: true };
    }

    log(
      runId,
      "gatekeeper",
      "progress",
      `Score ${review.score}/10 — below ${GATE_THRESHOLD} threshold`
    );
    store.addLog(runId, {
      agent: "gatekeeper",
      event: "gate_fail",
      message: `Score: ${review.score}`,
    });

    // Build feedback for the next regeneration attempt.
    lastFeedback = formatFeedback(review.criteria);

    if (attempt < MAX_GATE_ATTEMPTS) {
      store.addLog(runId, {
        agent: "gatekeeper",
        event: "retry",
        message: `Sending feedback to ${agentName}`,
      });
    }
  }

  // Exhausted retries — wait for a human decision.
  log(
    runId,
    "gatekeeper",
    "error",
    `Failed after ${MAX_GATE_ATTEMPTS} attempts — awaiting human review`
  );
  store.updateRun(runId, { status: "gate_blocked", currentAgent: "gatekeeper" });

  const decision = await store.awaitApproval(runId);

  if (decision === "approved") {
    log(runId, "gatekeeper", "complete", "Human approved — continuing pipeline");
    store.addLog(runId, {
      agent: "gatekeeper",
      event: "gate_pass",
      message: "Human override",
    });
    store.updateRun(runId, { status: "running" });
    return { output: output!, artifact: artifact!, passed: true };
  }

  log(runId, "gatekeeper", "error", "Human rejected — failing run");
  store.updateRun(runId, { status: "failed" });
  return { output: output!, artifact: artifact!, passed: false };
}

function formatFeedback(criteria: Record<string, { score: number; reasoning: string }>): string {
  const lines = Object.entries(criteria)
    .sort(([, a], [, b]) => a.score - b.score)
    .map(([name, { score, reasoning }]) => `- ${name} (${score}/10): ${reasoning}`);
  return [
    "The previous attempt scored below the quality threshold.",
    "Address each criterion below, focusing on the lowest scores first:",
    ...lines,
  ].join("\n");
}

export async function runPipeline(runId: string): Promise<void> {
  const run = store.getRun(runId);
  if (!run) throw new Error(`Run ${runId} not found`);

  store.updateRun(runId, { status: "running" });

  // Scout (no gate — it just observes)
  store.updateRun(runId, { currentAgent: "scout" });
  log(runId, "scout", "start", "Analyzing repository structure");
  const scoutResult = await scoutAgent(runId);
  store.addArtifact(runId, {
    agent: "scout",
    type: "coverage-gap",
    filename: "coverage-gap.json",
    content: JSON.stringify(scoutResult, null, 2),
  });
  log(runId, "scout", "complete", "Repository analysis complete");

  // Strategist (gated, retries with feedback)
  const strategistStage = await runGatedStage<string>(
    runId,
    "strategist",
    { type: "test-strategy", filename: "test-strategy.md" },
    (feedback) => strategistAgent(runId, scoutResult, feedback)
  );
  if (!strategistStage.passed) return;
  const strategyResult = strategistStage.output;

  // Scribe (gated, retries with feedback)
  const scribeStage = await runGatedStage<string>(
    runId,
    "scribe",
    { type: "feature-file", filename: "tests.feature" },
    (feedback) => scribeAgent(runId, strategyResult, feedback)
  );
  if (!scribeStage.passed) return;
  const gherkinResult = scribeStage.output;

  // Crafter (gated, retries with feedback)
  const crafterStage = await runGatedStage<string>(
    runId,
    "crafter",
    { type: "playwright-script", filename: "tests.spec.ts" },
    (feedback) => crafterAgent(runId, gherkinResult, feedback)
  );
  if (!crafterStage.passed) return;
  const playwrightResult = crafterStage.output;

  // Architect — advisory review (does not gate)
  store.updateRun(runId, { currentAgent: "architect" });
  log(runId, "architect", "start", "Reviewing Playwright scripts for structure");
  const archReview = await architectAgent(runId, playwrightResult);
  store.addArtifact(runId, {
    agent: "architect",
    type: "arch-review",
    filename: "arch-review.json",
    content: JSON.stringify(archReview, null, 2),
  });
  log(runId, "architect", "complete", `Architecture review: ${archReview.verdict}`);

  // Deployer
  store.updateRun(runId, { currentAgent: "deployer" });
  log(runId, "deployer", "start", "Committing artifacts and opening PR");
  const deployResult = await deployerAgent(runId);
  if (deployResult.prUrl) {
    store.updateRun(runId, { prUrl: deployResult.prUrl });
  }
  log(
    runId,
    "deployer",
    "complete",
    deployResult.prUrl ? `PR opened: ${deployResult.prUrl}` : "Artifacts committed"
  );

  // Runner
  store.updateRun(runId, { currentAgent: "runner" });
  log(runId, "runner", "start", "Triggering GitHub Actions workflow");
  const runResult = await runnerAgent(runId);
  if (runResult.actionsRunUrl) {
    store.updateRun(runId, { actionsRunUrl: runResult.actionsRunUrl });
  }
  log(
    runId,
    "runner",
    "complete",
    runResult.actionsRunUrl ? `Actions run: ${runResult.actionsRunUrl}` : "Workflow triggered"
  );

  // Herald
  store.updateRun(runId, { currentAgent: "herald" });
  log(runId, "herald", "start", "Generating execution report");
  const reportHtml = await heraldAgent(runId);
  store.addArtifact(runId, {
    agent: "herald",
    type: "report",
    filename: "report.html",
    content: reportHtml,
  });
  log(runId, "herald", "complete", "Execution report generated");

  // Triage
  store.updateRun(runId, { currentAgent: "triage" });
  log(runId, "triage", "start", "Classifying test results");
  const triageResults = await triageAgent(runId);
  for (const defect of triageResults) {
    store.addDefect(runId, defect);
  }
  log(runId, "triage", "complete", `Classified ${triageResults.length} findings`);

  store.updateRun(runId, { status: "completed", currentAgent: null });
}
