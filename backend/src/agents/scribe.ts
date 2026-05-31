import { callLLM } from "../llm.js";
import { store } from "../store.js";

const SYSTEM = `You are Scribe, a QE agent that writes BDD Gherkin feature files.
Given a test strategy, produce well-structured Gherkin .feature file content.
Each scenario should map to a specific risk area from the strategy.
Use proper Given/When/Then format with tags for priority and risk level.`;

export async function scribeAgent(runId: string, strategy: string): Promise<string> {
  const run = store.getRun(runId);
  if (!run) throw new Error(`Run ${runId} not found`);

  const userMessage = `Write BDD Gherkin feature files based on this test strategy:

Feature: ${run.featureDescription}

Test Strategy:
${strategy}

Generate complete Gherkin .feature file(s) content with:
- Feature-level description
- @priority-critical, @priority-high, @priority-medium, @priority-low tags
- @risk-high, @risk-medium, @risk-low tags
- Scenario Outline with Examples tables where appropriate
- Background sections for common setup
- Clear, testable Given/When/Then steps`;

  return callLLM(SYSTEM, userMessage, { maxTokens: 8192 });
}
