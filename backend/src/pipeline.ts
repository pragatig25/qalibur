import { store, type AgentName } from "./store.js";
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

function log(runId: string, agent: AgentName, event: "start" | "progress" | "complete" | "error", message: string, data?: unknown) {
  store.addLog(runId, { agent, event, message, data });
}

async function gateArtifact(runId: string, artifactId: string, targetAgent: AgentName): Promise<boolean> {
  const maxAttempts = 3;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    log(runId, "gatekeeper", "start", `Reviewing ${targetAgent} output (attempt ${attempt}/${maxAttempts})`);
    const review = await gatekeeperAgent(runId, artifactId, attempt);
    store.addGateReview(runId, review);

    if (review.passed) {
      log(runId, "gatekeeper", "complete", `Passed with score ${review.score}/10`);
      store.addLog(runId, { agent: "gatekeeper", event: "gate_pass", message: `Score: ${review.score}` });
      return true;
    }

    log(runId, "gatekeeper", "progress", `Score ${review.score}/10 — below threshold`);
    store.addLog(runId, { agent: "gatekeeper", event: "gate_fail", message: `Score: ${review.score}` });

    if (attempt < maxAttempts) {
      store.addLog(runId, { agent: "gatekeeper", event: "retry", message: `Retrying ${targetAgent}` });
    }
  }

  log(runId, "gatekeeper", "error", `Failed after ${maxAttempts} attempts — flagging for human review`);
  store.updateRun(runId, { status: "gate_blocked", currentAgent: "gatekeeper" });
  return false;
}

export async function runPipeline(runId: string): Promise<void> {
  const run = store.getRun(runId);
  if (!run) throw new Error(`Run ${runId} not found`);

  store.updateRun(runId, { status: "running" });

  // Scout
  store.updateRun(runId, { currentAgent: "scout" });
  log(runId, "scout", "start", "Analyzing repository structure");
  const scoutResult = await scoutAgent(runId);
  const scoutArtifact = store.addArtifact(runId, {
    agent: "scout",
    type: "coverage-gap",
    filename: "coverage-gap.json",
    content: JSON.stringify(scoutResult, null, 2),
  });
  log(runId, "scout", "complete", "Repository analysis complete");

  // Strategist
  store.updateRun(runId, { currentAgent: "strategist" });
  log(runId, "strategist", "start", "Generating test strategy");
  const strategyResult = await strategistAgent(runId, scoutResult);
  const strategyArtifact = store.addArtifact(runId, {
    agent: "strategist",
    type: "test-strategy",
    filename: "test-strategy.md",
    content: strategyResult,
  });
  log(runId, "strategist", "complete", "Test strategy generated");

  // Gate the strategy
  const strategyPassed = await gateArtifact(runId, strategyArtifact.id, "strategist");
  if (!strategyPassed) return;

  // Scribe
  store.updateRun(runId, { currentAgent: "scribe" });
  log(runId, "scribe", "start", "Writing Gherkin feature files");
  const gherkinResult = await scribeAgent(runId, strategyResult);
  const gherkinArtifact = store.addArtifact(runId, {
    agent: "scribe",
    type: "feature-file",
    filename: "tests.feature",
    content: gherkinResult,
  });
  log(runId, "scribe", "complete", "Gherkin feature files written");

  // Gate the Gherkin
  const gherkinPassed = await gateArtifact(runId, gherkinArtifact.id, "scribe");
  if (!gherkinPassed) return;

  // Crafter
  store.updateRun(runId, { currentAgent: "crafter" });
  log(runId, "crafter", "start", "Generating Playwright test scripts");
  const playwrightResult = await crafterAgent(runId, gherkinResult);
  const playwrightArtifact = store.addArtifact(runId, {
    agent: "crafter",
    type: "playwright-script",
    filename: "tests.spec.ts",
    content: playwrightResult,
  });
  log(runId, "crafter", "complete", "Playwright scripts generated");

  // Architect + Gatekeeper review in parallel
  store.updateRun(runId, { currentAgent: "architect" });
  log(runId, "architect", "start", "Reviewing Playwright scripts for structure");

  const [archReview, crafterGatePassed] = await Promise.all([
    architectAgent(runId, playwrightResult),
    gateArtifact(runId, playwrightArtifact.id, "crafter"),
  ]);

  store.addArtifact(runId, {
    agent: "architect",
    type: "arch-review",
    filename: "arch-review.json",
    content: JSON.stringify(archReview, null, 2),
  });
  log(runId, "architect", "complete", `Architecture review: ${archReview.verdict}`);

  if (!crafterGatePassed) return;

  // Deployer
  store.updateRun(runId, { currentAgent: "deployer" });
  log(runId, "deployer", "start", "Committing artifacts and opening PR");
  const deployResult = await deployerAgent(runId);
  if (deployResult.prUrl) {
    store.updateRun(runId, { prUrl: deployResult.prUrl });
  }
  log(runId, "deployer", "complete", deployResult.prUrl ? `PR opened: ${deployResult.prUrl}` : "Artifacts committed");

  // Runner
  store.updateRun(runId, { currentAgent: "runner" });
  log(runId, "runner", "start", "Triggering GitHub Actions workflow");
  const runResult = await runnerAgent(runId);
  if (runResult.actionsRunUrl) {
    store.updateRun(runId, { actionsRunUrl: runResult.actionsRunUrl });
  }
  log(runId, "runner", "complete", runResult.actionsRunUrl ? `Actions run: ${runResult.actionsRunUrl}` : "Workflow triggered");

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

  // Triage (if there are failures to analyze)
  store.updateRun(runId, { currentAgent: "triage" });
  log(runId, "triage", "start", "Classifying test results");
  const triageResults = await triageAgent(runId);
  for (const defect of triageResults) {
    store.addDefect(runId, defect);
  }
  log(runId, "triage", "complete", `Classified ${triageResults.length} findings`);

  store.updateRun(runId, { status: "completed", currentAgent: null });
}
