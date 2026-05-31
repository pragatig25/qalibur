import { callLLMJson } from "../llm.js";
import { store, type Defect } from "../store.js";

type DefectInput = Omit<Defect, "id" | "runId" | "createdAt">;

const SYSTEM = `You are Triage, a QE agent that classifies test failures and generates defect records.
Analyze pipeline results and classify findings into: flaky, regression, environment, genuine.
Rate severity as: low, medium, high, critical.
Provide actionable summaries and suggested fixes.`;

export async function triageAgent(runId: string): Promise<DefectInput[]> {
  const run = store.getRun(runId);
  if (!run) throw new Error(`Run ${runId} not found`);

  const failedGates = run.gateReviews.filter((r) => !r.passed);
  const errorLogs = run.log.filter((l) => l.event === "error");

  if (failedGates.length === 0 && errorLogs.length === 0) {
    return [];
  }

  const context = {
    failedGates: failedGates.map((g) => ({
      agent: g.agent,
      score: g.score,
      criteria: g.criteria,
    })),
    errors: errorLogs.map((l) => ({
      agent: l.agent,
      message: l.message,
    })),
    artifacts: run.artifacts.map((a) => ({
      type: a.type,
      filename: a.filename,
    })),
  };

  const userMessage = `Classify these QE pipeline findings into defect records:

${JSON.stringify(context, null, 2)}

Return a JSON array of defect records:
[
  {
    "testName": "<descriptive name>",
    "classification": "flaky" | "regression" | "environment" | "genuine",
    "severity": "low" | "medium" | "high" | "critical",
    "summary": "<what happened>",
    "suggestedFix": "<what to do about it>"
  }
]

Return an empty array [] if there are no actionable findings.`;

  return callLLMJson<DefectInput[]>(SYSTEM, userMessage);
}
