import { callLLMJson } from "../llm.js";
import { store, type AgentName } from "../store.js";

interface GateCriteria {
  score: number;
  reasoning: string;
}

interface GateReviewResult {
  artifactId: string;
  agent: AgentName;
  score: number;
  criteria: Record<string, GateCriteria>;
  passed: boolean;
  attempt: number;
}

const THRESHOLD = 9.5;

const SYSTEM = `You are Gatekeeper, a strict quality gate reviewer for QE artifacts.
Score each artifact against quality criteria on a scale of 0-10.
Be rigorous — only pass artifacts that meet production-quality standards.
The pass threshold is ${THRESHOLD}/10.

Scoring criteria:
- Completeness: Does it cover all required areas?
- Correctness: Is the content technically accurate?
- Structure: Is it well-organized and follows conventions?
- Actionability: Can a developer act on it directly?
- Clarity: Is it clear and unambiguous?`;

export async function gatekeeperAgent(
  runId: string,
  artifactId: string,
  attempt: number
): Promise<GateReviewResult> {
  const run = store.getRun(runId);
  if (!run) throw new Error(`Run ${runId} not found`);

  const artifact = run.artifacts.find((a) => a.id === artifactId);
  if (!artifact) throw new Error(`Artifact ${artifactId} not found`);

  const previousReviews = run.gateReviews
    .filter((r) => r.artifactId === artifactId)
    .map((r) => `Attempt ${r.attempt}: Score ${r.score} — ${JSON.stringify(r.criteria)}`)
    .join("\n");

  const userMessage = `Review this ${artifact.type} artifact for quality:

Artifact type: ${artifact.type}
Filename: ${artifact.filename}
Agent: ${artifact.agent}
Attempt: ${attempt}

Content:
${artifact.content.substring(0, 6000)}

${previousReviews ? `Previous review feedback:\n${previousReviews}\n` : ""}

Score each criterion (completeness, correctness, structure, actionability, clarity) from 0-10.
Return JSON:
{
  "score": <overall weighted average>,
  "criteria": {
    "completeness": { "score": <n>, "reasoning": "<why>" },
    "correctness": { "score": <n>, "reasoning": "<why>" },
    "structure": { "score": <n>, "reasoning": "<why>" },
    "actionability": { "score": <n>, "reasoning": "<why>" },
    "clarity": { "score": <n>, "reasoning": "<why>" }
  },
  "passed": <true if score >= ${THRESHOLD}>
}`;

  const result = await callLLMJson<{
    score: number;
    criteria: Record<string, GateCriteria>;
    passed: boolean;
  }>(SYSTEM, userMessage);

  return {
    artifactId,
    agent: artifact.agent,
    score: result.score,
    criteria: result.criteria,
    passed: result.score >= THRESHOLD,
    attempt,
  };
}
