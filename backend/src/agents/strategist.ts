import { callLLM } from "../llm.js";
import { store } from "../store.js";

const SYSTEM = `You are Strategist, a QE agent that produces risk-based test strategies.
Given a coverage gap analysis, create a comprehensive test strategy document in Markdown.
Include equivalence partition (EP) tables for each major area, risk ratings, and priority order.
The output should be a complete test strategy document.`;

export async function strategistAgent(runId: string, scoutResult: unknown): Promise<string> {
  const run = store.getRun(runId);
  if (!run) throw new Error(`Run ${runId} not found`);

  const userMessage = `Create a risk-based test strategy for:

Repository: ${run.repoUrl}
Feature: ${run.featureDescription}

Coverage gap analysis:
${JSON.stringify(scoutResult, null, 2)}

Generate a complete test strategy in Markdown with:
1. Executive summary
2. Risk assessment matrix
3. Equivalence partition tables for each major area
4. Test priority order (critical → high → medium → low)
5. Recommended test types per area (unit, integration, e2e, visual)
6. Entry/exit criteria`;

  return callLLM(SYSTEM, userMessage, { maxTokens: 8192 });
}
