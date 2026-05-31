import { callLLM } from "../llm.js";
import { store } from "../store.js";

const SYSTEM = `You are Herald, a QE agent that generates HTML execution and coverage reports.
Given a pipeline run's artifacts and gate reviews, produce a clean, readable HTML report.
Include: summary stats, gate scores, artifact previews, and recommendations.
Use inline CSS for a professional look. No external dependencies.`;

export async function heraldAgent(runId: string): Promise<string> {
  const run = store.getRun(runId);
  if (!run) throw new Error(`Run ${runId} not found`);

  const summary = {
    runId,
    repoUrl: run.repoUrl,
    feature: run.featureDescription,
    status: run.status,
    artifactCount: run.artifacts.length,
    gateReviews: run.gateReviews.map((r) => ({
      agent: r.agent,
      score: r.score,
      passed: r.passed,
      attempt: r.attempt,
    })),
    logEntries: run.log.length,
    artifacts: run.artifacts.map((a) => ({
      type: a.type,
      filename: a.filename,
      preview: a.content.substring(0, 500),
    })),
  };

  const userMessage = `Generate an HTML execution report for this QE pipeline run:

${JSON.stringify(summary, null, 2)}

Create a complete, self-contained HTML document with:
- Header with run ID and status badge
- Summary statistics (artifacts generated, gate scores, etc.)
- Gate review results table with scores and pass/fail
- Artifact previews in collapsible sections
- Timeline of agent activity
- Professional styling with inline CSS (use a clean, modern look)
- No external CSS/JS dependencies`;

  return callLLM(SYSTEM, userMessage, { maxTokens: 8192 });
}
